import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Configure the client to use the local cluster
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.HoBDao;

interface ProposalFilters {
  state?: 'Pending' | 'Passed' | 'Rejected';
  creator?: string;
  minVotes?: number;
  maxVotes?: number;
}

async function getProposalDetails(filters: ProposalFilters = {}) {
  try {
    console.log("🔍 Fetching detailed proposal information...");
    
    // Get the authority (wallet)
    const authority = provider.wallet.publicKey;
    console.log("Authority:", authority.toString());
    
    // Derive the DAO state PDA
    const [daoStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao")],
      program.programId
    );
    
    // Fetch DAO state
    const daoState = await program.account.daoState.fetch(daoStatePda);
    console.log("📊 DAO Configuration:");
    console.log("  - Quorum Percentage:", daoState.quorumPercentage.toString() + "%");
    console.log("  - Total Voters:", daoState.totalVoters.toString());
    console.log("  - Token Mint:", daoState.tokenMint.toString());
    
    // Get all proposal accounts
    const proposalAccounts = await program.account.proposal.all();
    
    if (proposalAccounts.length === 0) {
      console.log("📝 No proposals found.");
      return;
    }
    
    // Apply filters
    let filteredProposals = proposalAccounts;
    
    if (filters.state) {
      filteredProposals = filteredProposals.filter(p => p.account.state === filters.state);
    }
    
    if (filters.creator) {
      filteredProposals = filteredProposals.filter(p => p.account.creator.toString() === filters.creator);
    }
    
    if (filters.minVotes !== undefined) {
      filteredProposals = filteredProposals.filter(p => p.account.voteCount.toNumber() >= filters.minVotes!);
    }
    
    if (filters.maxVotes !== undefined) {
      filteredProposals = filteredProposals.filter(p => p.account.voteCount.toNumber() <= filters.maxVotes!);
    }
    
    console.log(`\n📋 Found ${filteredProposals.length} proposal(s) matching filters:`);
    console.log("=" .repeat(100));
    
    // Sort proposals by proposal_id
    filteredProposals.sort((a, b) => a.account.proposalId.toNumber() - b.account.proposalId.toNumber());
    
    filteredProposals.forEach((proposalAccount, index) => {
      const proposal = proposalAccount.account;
      const proposalId = proposal.proposalId.toNumber();
      const state = proposal.state;
      const voteCount = proposal.voteCount.toNumber();
      const creator = proposal.creator.toString();
      const title = proposal.title;
      const description = proposal.description;
      
      // Calculate vote percentage and quorum status
      const totalVoters = daoState.totalVoters.toNumber();
      const quorumPercentage = daoState.quorumPercentage.toNumber();
      const votePercentage = totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0;
      const needsVotes = Math.ceil((totalVoters * quorumPercentage) / 100) - voteCount;
      const canStillPass = voteCount + (totalVoters - voteCount) >= Math.ceil((totalVoters * quorumPercentage) / 100);
      
      console.log(`\n📄 Proposal #${proposalId}`);
      console.log(`   Title: ${title}`);
      console.log(`   Description: ${description}`);
      console.log(`   State: ${state}`);
      console.log(`   Votes: ${voteCount}/${totalVoters} (${votePercentage.toFixed(1)}%)`);
      console.log(`   Creator: ${creator}`);
      console.log(`   Address: ${proposalAccount.publicKey.toString()}`);
      
      // Detailed status
      if (state === "Passed") {
        console.log(`   ✅ Status: PASSED (reached ${quorumPercentage}% quorum)`);
      } else if (state === "Rejected") {
        console.log(`   ❌ Status: REJECTED (didn't reach quorum)`);
      } else {
        console.log(`   ⏳ Status: PENDING`);
        console.log(`   📊 Progress: ${votePercentage.toFixed(1)}% of ${quorumPercentage}% needed`);
        if (needsVotes > 0) {
          console.log(`   🗳️  Needs: ${needsVotes} more vote(s) to pass`);
        }
        if (!canStillPass && totalVoters > 0) {
          console.log(`   ⚠️  Warning: Cannot reach quorum with remaining voters`);
        }
      }
      
      // Voting progress bar
      if (state === "Pending" && totalVoters > 0) {
        const progressBarLength = 20;
        const filledLength = Math.round((votePercentage / quorumPercentage) * progressBarLength);
        const progressBar = "█".repeat(Math.min(filledLength, progressBarLength)) + 
                           "░".repeat(progressBarLength - Math.min(filledLength, progressBarLength));
        console.log(`   📊 Progress: [${progressBar}] ${votePercentage.toFixed(1)}%/${quorumPercentage}%`);
      }
    });
    
    console.log("\n" + "=" .repeat(100));
    console.log(`📊 Summary: ${filteredProposals.length} proposals shown`);
    
    // Count by state
    const stateCounts = filteredProposals.reduce((acc, proposal) => {
      const state = proposal.account.state;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("📈 By State:");
    Object.entries(stateCounts).forEach(([state, count]) => {
      console.log(`   ${state}: ${count}`);
    });
    
    // Show filter info
    if (Object.keys(filters).length > 0) {
      console.log("\n🔍 Applied Filters:");
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`   ${key}: ${value}`);
        }
      });
    }
    
  } catch (error) {
    console.error("❌ Error fetching proposal details:", error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const filters: ProposalFilters = {};

// Simple argument parsing
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  
  switch (key) {
    case '--state':
      if (['Pending', 'Passed', 'Rejected'].includes(value)) {
        filters.state = value as 'Pending' | 'Passed' | 'Rejected';
      }
      break;
    case '--creator':
      filters.creator = value;
      break;
    case '--min-votes':
      filters.minVotes = parseInt(value);
      break;
    case '--max-votes':
      filters.maxVotes = parseInt(value);
      break;
  }
}

// Run the script
getProposalDetails(filters)
  .then(() => {
    console.log("🎉 Proposal details fetching completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to fetch proposal details:", error);
    process.exit(1);
  });
