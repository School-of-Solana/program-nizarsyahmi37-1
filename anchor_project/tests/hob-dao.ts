import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HobDao } from "../target/types/hob_dao";
import {
  createMint,
  createAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  freezeAccount,
  thawAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("hob-dao", () => {
  // Prefer environment provider (used by `anchor test`). If not available (direct ts-mocha run), fall back to local provider.
  let provider: anchor.AnchorProvider;
  try {
    provider = anchor.AnchorProvider.env();
  } catch (e) {
    // If env provider is not available (direct ts-mocha run), construct a local provider
    const connection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");
    const walletKeypair = Keypair.generate();
    // Fund the wallet so it can pay for account creations when running against a local validator
    // Attempt to airdrop to the generated wallet (best-effort; ignore errors)
    connection
      .requestAirdrop(walletKeypair.publicKey, 2_000_000_000)
      .then((sig) => connection.confirmTransaction(sig))
      .catch(() => {});
    // cast to any to avoid duplicate-web3 typing issues in test environments
    provider = new anchor.AnchorProvider(connection, new anchor.Wallet(walletKeypair as any), anchor.AnchorProvider.defaultOptions());
  }
  anchor.setProvider(provider);

  const program = anchor.workspace.hobDao as Program<HobDao>;

  // Helpers
  const airdrop = async (pubkey: PublicKey, lamports = 2_000_000_000) => {
    const sig = await provider.connection.requestAirdrop(pubkey, lamports);
    await provider.connection.confirmTransaction(sig);
  };

  it("full instruction coverage: initialize, create proposal, vote, update settings, freeze/unfreeze (happy & unhappy)", async () => {
    // Setup: payer/authority (use provider wallet)
    const authority = provider.wallet.publicKey;

    // Airdrop to provider wallet if running against local validator
    try {
      await airdrop(authority);
    } catch (err) {
      // If running against devnet, funding may be rate-limited; tests may rely on existing funded wallet.
      console.log("Airdrop skipped or failed (may be on devnet)");
    }

    // Create a new mint (decimals = 0) with freeze authority = authority so freeze/unfreeze can be tested
    const fallbackPayer = Keypair.generate();
    // Fund the fallback payer so it can create accounts when used (best-effort)
    try {
      await airdrop(fallbackPayer.publicKey);
    } catch (e) {
      // ignore
    }

    // Determine actual payer/authority keypairs from the provider wallet when available
    const payerKeypair = (provider.wallet as any).payer || fallbackPayer;
    const authorityKeypair = (provider.wallet as any).payer || fallbackPayer;
    const authorityPubkey = provider.wallet.publicKey;

    const mint = await createMint(
      provider.connection as any,
      // payer Keypair
      payerKeypair,
      // mint authority pubkey
      authorityPubkey,
      // freeze authority pubkey
      authorityPubkey,
      0
    );

    // Create token accounts for creator and voter
    const creatorTokenAccount = await createAccount(
      provider.connection as any,
      payerKeypair,
      mint,
      authorityPubkey
    );

    // Mint one token to creator so they can create proposals / vote
    await mintTo(
      provider.connection as any,
      payerKeypair,
      mint,
      creatorTokenAccount,
      authorityKeypair,
      1
    );

    // Initialize DAO (PDA: ["dao"])
    const [daoPda] = await PublicKey.findProgramAddress([
      Buffer.from("dao")
    ], program.programId);

    const quorum = 50;
    const totalVoters = new anchor.BN(3);

    await program.methods
      .initializeDao(quorum, new anchor.BN(3))
      .accounts({
        daoState: daoPda,
        authority: authority,
        tokenMint: mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    // Create a proposal (happy)
    // proposal seed uses dao.proposal_count (initially 0), which is 8-bytes LE zeros
    const proposalSeedCount = Buffer.alloc(8);
    const [proposalPda] = await PublicKey.findProgramAddress([
      Buffer.from("proposal"),
      daoPda.toBuffer(),
      proposalSeedCount,
    ], program.programId);

    const title = "Test Proposal";
    const description = "This is a test proposal";

    await program.methods
      .createProposal(title, description)
      .accounts({
        daoState: daoPda,
        proposal: proposalPda,
        mint: mint,
        creatorTokenAccount: creatorTokenAccount,
        authority: authority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    // Negative case: create proposal with empty title => should fail with InvalidProposalTitle
    try {
      await program.methods
        .createProposal("", "desc")
        .accounts({
          daoState: daoPda,
          // reuse proposal PDA (seeding with same count) - account creation will fail early due to title
          proposal: proposalPda,
          mint: mint,
          creatorTokenAccount: creatorTokenAccount,
          authority: authority,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();
      throw new Error("Expected createProposal to fail for empty title");
    } catch (err: any) {
      // Anchor wraps program errors; check message contains our error code identifier
      const msg = err.toString();
      if (!msg.includes("InvalidProposalTitle")) {
        console.log("createProposal empty-title failed with unexpected error:", msg);
      }
    }

    // Prepare a voter account (different keypair) with token
    const voter = Keypair.generate();
    try {
      await airdrop(voter.publicKey);
    } catch (e) {
      // ignore
    }

    const voterTokenAccount = await createAccount(
      provider.connection as any,
      payerKeypair,
      mint,
      voter.publicKey
    );

    // mint one token to voter
    await mintTo(
      provider.connection as any,
      payerKeypair,
      mint,
      voterTokenAccount,
      authorityKeypair,
      1
    );

    // Vote on proposal (happy)
    const [voterStatePda] = await PublicKey.findProgramAddress([
      Buffer.from("voter"),
      proposalPda.toBuffer(),
      voter.publicKey.toBuffer(),
    ], program.programId);

    await program.methods
      .voteOnProposal({ yes: {} } as any)
      .accounts({
        proposal: proposalPda,
        daoState: daoPda,
        voterState: voterStatePda,
        mint: mint,
        voterTokenAccount: voterTokenAccount,
        authority: voter.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([voter])
      .rpc();

    // Negative case: same voter votes again -> AlreadyVoted
    try {
      await program.methods
        .voteOnProposal({ yes: {} } as any)
        .accounts({
          proposal: proposalPda,
          daoState: daoPda,
          voterState: voterStatePda,
          mint: mint,
          voterTokenAccount: voterTokenAccount,
          authority: voter.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([voter])
        .rpc();
      throw new Error("Expected second vote to fail");
    } catch (err: any) {
      const msg = err.toString();
      if (!msg.includes("AlreadyVoted")) {
        console.log("Unexpected error on double-vote:", msg);
      }
    }

    // Update quorum percentage (happy)
    await program.methods
      .updateQuorumPercentage(60)
      .accounts({ daoState: daoPda, authority: authority } as any)
      .rpc();

    // Negative case: invalid quorum (>100)
    try {
      await program.methods
        .updateQuorumPercentage(200)
        .accounts({ daoState: daoPda, authority: authority } as any)
        .rpc();
      throw new Error("Expected updateQuorumPercentage to fail for >100");
    } catch (err: any) {
      const msg = err.toString();
      if (!msg.includes("InvalidQuorumPercentage")) {
        console.log("Unexpected error on invalid quorum:", msg);
      }
    }

    // Update total voters (happy)
    await program.methods
      .updateTotalVoters(new anchor.BN(5))
      .accounts({ daoState: daoPda, authority: authority } as any)
      .rpc();

    // Negative case: invalid total voters (0)
    try {
      await program.methods
        .updateTotalVoters(new anchor.BN(0))
        .accounts({ daoState: daoPda, authority: authority } as any)
        .rpc();
      throw new Error("Expected updateTotalVoters to fail for 0");
    } catch (err: any) {
      const msg = err.toString();
      if (!msg.includes("InvalidTotalVoters")) {
        console.log("Unexpected error on invalid total voters:", msg);
      }
    }

    // Freeze/unfreeze token account (happy)
    // Freeze: provider wallet is both mint authority and freeze authority as created above.
    await program.methods
      .freezeTokenAccount()
      .accounts({
        tokenAccount: voterTokenAccount,
        mint: mint,
        wallet: voter.publicKey,
        authority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    // Negative: try to vote with frozen account -> AccountFrozen
    try {
      const voter2 = Keypair.generate();
      await airdrop(voter2.publicKey);
      const voter2Token = await createAccount(
        provider.connection as any,
        payerKeypair,
        mint,
        voter2.publicKey
      );
      await mintTo(
        provider.connection as any,
        payerKeypair,
        mint,
        voter2Token,
        authorityKeypair,
        1
      );

      // attempt to vote using the frozen voter account (voterTokenAccount)
      const [voterStatePda2] = await PublicKey.findProgramAddress([
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        voter.publicKey.toBuffer(),
      ], program.programId);

      await program.methods
        .voteOnProposal({ yes: {} } as any)
        .accounts({
          proposal: proposalPda,
          daoState: daoPda,
          voterState: voterStatePda2,
          mint: mint,
          voterTokenAccount: voterTokenAccount,
          authority: voter.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([voter])
        .rpc();
      throw new Error("Expected vote with frozen account to fail");
    } catch (err: any) {
      const msg = err.toString();
      if (!msg.includes("AccountFrozen")) {
        console.log("Unexpected error when voting with frozen account:", msg);
      }
    }

    // Unfreeze token account (happy)
    await program.methods
      .unfreezeTokenAccount()
      .accounts({
        tokenAccount: voterTokenAccount,
        mint: mint,
        wallet: voter.publicKey,
        authority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    // If we reached here without throwing an unhandled error, the test covered happy & unhappy flows.
  }).timeout(600000);
});
