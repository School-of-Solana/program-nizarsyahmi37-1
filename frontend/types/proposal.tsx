import * as borsh from "@coral-xyz/borsh"

import { PublicKey } from "@solana/web3.js"

export type VoteType = "Yes" | "No"

export interface ProposalItem {
	id: string
	pda: PublicKey
	title: string
	description: string
	status: "Passed" | "Rejected" | "Pending" | "Expired"
	voted: boolean
	userVoteType: "Yes" | "No" | null
	yesVotes: number
	noVotes: number
	totalVotes: number
	creator: string
	createdAt: number // Unix timestamp in seconds
}

export const DaoStateLayout = borsh.struct([
	borsh.u64("proposal_count"),
	borsh.publicKey("token_mint"),
	borsh.u8("quorum_percentage"),
	borsh.u64("total_voters")
])

export const ProposalLayout = borsh.struct([
	borsh.u64("proposal_id"),
	borsh.str("title"),
	borsh.str("description"),
	borsh.u64("yes_votes"),
	borsh.u64("no_votes"),
	borsh.u8("state"), // 0 = Pending, 1 = Passed, 2 = Rejected
	borsh.publicKey("creator"),
	borsh.publicKey("dao_state"),
	borsh.i64("created_at") // Unix timestamp in seconds
])

export const VoterStateLayout = borsh.struct([
	borsh.bool("has_voted"),
	borsh.u8("vote_type") // 0 = Yes, 1 = No
])

// Utility function to check if a proposal is expired (24 hours after creation)
export function isProposalExpired(createdAt: number): boolean {
	const now = Math.floor(Date.now() / 1000) // Current time in seconds
	const twentyFourHours = 24 * 60 * 60 // 24 hours in seconds
	return (now - createdAt) > twentyFourHours
}

// Utility function to determine the effective status of a proposal
export function getProposalStatus(
	state: number,
	createdAt: number
): "Passed" | "Rejected" | "Pending" | "Expired" {
	// If proposal is already passed or rejected, return that status
	if (state === 1) return "Passed"
	if (state === 2) return "Rejected"

	// If proposal is pending, check if it's expired
	if (state === 0) {
		return isProposalExpired(createdAt) ? "Expired" : "Pending"
	}

	return "Pending" // fallback
}
