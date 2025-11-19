import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Configure the client to use the local cluster
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.HoBDao;

async function getProposals() {
  try {
    console.log("🔍 Fetching all proposals...");
    
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
    
    // Fetch DAO state to get proposal count
    const daoState = await program.account.daoState.fetch(daoStatePda);
    console.log("📊 DAO State:");
    console.log("  - Proposal Count:", daoState.proposalCount.toString());
    console.log("  - Quorum Percentage:", daoState.quorumPercentage.toString() + "%");
    console.log("  - Total Voters:", daoState.totalVoters.toString());
    console.log("  - Token Mint:", daoState.tokenMint.toString());
    
    if (daoState.proposalCount.toNumber() === 0) {
      console.log("📝 No proposals found.");
      return;
    }
    
    console.log("\n📋 Fetching all proposals...");
    
    // Get all proposal accounts
    const proposalAccounts = await program.account.proposal.all();
    
    if (proposalAccounts.length === 0) {
      console.log("📝 No proposal accounts found.");
      return;
    }
    
    console.log(`\n📋 Found ${proposalAccounts.length} proposal(s):`);
    console.log("=" .repeat(80));
    
    // Sort proposals by proposal_id
    proposalAccounts.sort((a, b) => a.account.proposalId.toNumber() - b.account.proposalId.toNumber());
    
    proposalAccounts.forEach((proposalAccount, index) => {
      const proposal = proposalAccount.account;
      const proposalId = proposal.proposalId.toNumber();
      const state = proposal.state;
      const voteCount = proposal.voteCount.toNumber();
      const creator = proposal.creator.toString();
      const title = proposal.title;
      const description = proposal.description;
      
      // Calculate vote percentage
      const votePercentage = daoState.totalVoters.toNumber() > 0 
        ? ((voteCount / daoState.totalVoters.toNumber()) * 100).toFixed(1)
        : "0.0";
      
      console.log(`\n📄 Proposal #${proposalId}`);
      console.log(`   Title: ${title}`);
      console.log(`   Description: ${description}`);
      console.log(`   State: ${state}`);
      console.log(`   Votes: ${voteCount}/${daoState.totalVoters.toString()} (${votePercentage}%)`);
      console.log(`   Creator: ${creator}`);
      console.log(`   Address: ${proposalAccount.publicKey.toString()}`);
      
      // Status indicator
      if (state === "Passed") {
        console.log(`   ✅ Status: PASSED (reached ${daoState.quorumPercentage}% quorum)`);
      } else if (state === "Rejected") {
        console.log(`   ❌ Status: REJECTED (didn't reach quorum)`);
      } else {
        console.log(`   ⏳ Status: PENDING (needs ${daoState.quorumPercentage}% quorum)`);
      }
    });
    
    console.log("\n" + "=" .repeat(80));
    console.log(`📊 Summary: ${proposalAccounts.length} total proposals`);
    
    // Count by state
    const stateCounts = proposalAccounts.reduce((acc, proposal) => {
      const state = proposal.account.state;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("📈 By State:");
    Object.entries(stateCounts).forEach(([state, count]) => {
      console.log(`   ${state}: ${count}`);
    });
    
  } catch (error) {
    console.error("❌ Error fetching proposals:", error);
    throw error;
  }
}

// Run the script
getProposals()
  .then(() => {
    console.log("🎉 Proposal fetching completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to fetch proposals:", error);
    process.exit(1);
  });
