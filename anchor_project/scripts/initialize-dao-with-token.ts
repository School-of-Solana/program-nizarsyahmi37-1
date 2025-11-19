import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

// Configure the client to use the local cluster
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.HoBDao;

async function initializeDaoWithToken() {
  try {
    console.log("🚀 Initializing DAO with custom token...");
    
    // Get the authority (wallet)
    const authority = provider.wallet.publicKey;
    console.log("Authority:", authority.toString());
    
    // Create a new token mint using Anchor's token program
    console.log("🪙 Creating new token mint for DAO...");
    
    // Generate a new keypair for the mint
    const mintKeypair = Keypair.generate();
    console.log("Mint Keypair:", mintKeypair.publicKey.toString());
    
    // Derive the DAO state PDA
    const [daoStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao")],
      program.programId
    );
    
    console.log("DAO State PDA:", daoStatePda.toString());
    console.log("Program ID:", program.programId.toString());
    
    // Check if DAO state already exists
    try {
      const existingDaoState = await program.account.daoState.fetch(daoStatePda);
      console.log("⚠️  DAO already initialized!");
      console.log("Current proposal count:", existingDaoState.proposalCount.toString());
      console.log("Token mint:", existingDaoState.tokenMint.toString());
      return;
    } catch (error) {
      console.log("✅ DAO not initialized yet, proceeding...");
    }
    
    // Initialize the DAO with the new token mint and 60% quorum
    const tx = await program.methods
      .initializeDao(60) // 60% quorum
      .accounts({
        daoState: daoStatePda,
        authority: authority,
        tokenMint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKeypair]) // Sign with the mint keypair
      .rpc();
    
    console.log("✅ DAO initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("Token Mint:", mintKeypair.publicKey.toString());
    
    // Fetch and display the initialized DAO state
    const daoState = await program.account.daoState.fetch(daoStatePda);
    console.log("📊 DAO State:");
    console.log("  - Proposal Count:", daoState.proposalCount.toString());
    console.log("  - Token Mint:", daoState.tokenMint.toString());
    console.log("  - Quorum Percentage:", daoState.quorumPercentage.toString() + "%");
    console.log("  - Total Voters:", daoState.totalVoters.toString());
    console.log("  - DAO State Address:", daoStatePda.toString());
    
    console.log("\n🔑 Important: Save your mint keypair for future use!");
    console.log("Mint Private Key:", Buffer.from(mintKeypair.secretKey).toString('base64'));
    
  } catch (error) {
    console.error("❌ Error initializing DAO:", error);
    throw error;
  }
}

// Run the initialization
initializeDaoWithToken()
  .then(() => {
    console.log("🎉 DAO initialization completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to initialize DAO:", error);
    process.exit(1);
  });
