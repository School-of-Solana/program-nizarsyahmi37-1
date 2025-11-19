import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

// Configure the client to use the local cluster
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.HoBDao;

async function initializeDao() {
  try {
    console.log("🚀 Initializing DAO...");
    
    // Get the authority (wallet)
    const authority = provider.wallet.publicKey;
    console.log("Authority:", authority.toString());
    
    // For this example, we'll use a well-known token mint
    // In production, you would create your own token mint or use an existing one
    console.log("🪙 Using a test token mint for DAO...");
    
    // Using USDC mint as an example (you can replace this with any existing token mint)
    // USDC mint on devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
    const tokenMint = new PublicKey("6WzqsjwbK3sWJnh1qnHv23tu96bNXoeqHeA9xuemTMzw");
    console.log("Token Mint:", tokenMint.toString());
    console.log("ℹ️  Note: In production, create your own token mint or use the DAO's governance token");
    
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
    
    // Initialize the DAO with 60% quorum
    const tx = await program.methods
      .initializeDao(60) // 60% quorum
      .accounts({
        daoState: daoStatePda,
        authority: authority,
        tokenMint: tokenMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ DAO initialized successfully!");
    console.log("Transaction signature:", tx);
    
    // Fetch and display the initialized DAO state
    const daoState = await program.account.daoState.fetch(daoStatePda);
    console.log("📊 DAO State:");
    console.log("  - Proposal Count:", daoState.proposalCount.toString());
    console.log("  - Token Mint:", daoState.tokenMint.toString());
    console.log("  - Quorum Percentage:", daoState.quorumPercentage.toString() + "%");
    console.log("  - Total Voters:", daoState.totalVoters.toString());
    console.log("  - DAO State Address:", daoStatePda.toString());
    console.log("  - Token Mint Address:", tokenMint.toString());
    
  } catch (error) {
    console.error("❌ Error initializing DAO:", error);
    throw error;
  }
}

// Run the initialization
initializeDao()
  .then(() => {
    console.log("🎉 DAO initialization completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to initialize DAO:", error);
    process.exit(1);
  });
