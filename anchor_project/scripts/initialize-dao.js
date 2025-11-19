const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

async function initializeDao() {
  try {
    console.log("🚀 Initializing DAO...");
    
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    // Load the program
    const program = anchor.workspace.HoBDao;
    
    // Get the authority (wallet)
    const authority = provider.wallet.publicKey;
    console.log("Authority:", authority.toString());
    
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
      return;
    } catch (error) {
      console.log("✅ DAO not initialized yet, proceeding...");
    }
    
    // Initialize the DAO
    const tx = await program.methods
      .initializeDao()
      .accounts({
        daoState: daoStatePda,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ DAO initialized successfully!");
    console.log("Transaction signature:", tx);
    
    // Fetch and display the initialized DAO state
    const daoState = await program.account.daoState.fetch(daoStatePda);
    console.log("📊 DAO State:");
    console.log("  - Proposal Count:", daoState.proposalCount.toString());
    console.log("  - DAO State Address:", daoStatePda.toString());
    
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
