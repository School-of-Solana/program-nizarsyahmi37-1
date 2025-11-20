"use client"

import type { Provider } from "@reown/appkit-adapter-solana/react"

import { toast } from "sonner"
import { useState } from "react"
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor"
import { PublicKey, Transaction, VersionedTransaction, SystemProgram } from "@solana/web3.js"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react"
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react"
import { DaoStateLayout, VoteType } from "@/types/proposal"
import { Button } from "@/components/ui/button"

import idl from "@/idl/hob_dao.json"

// Program ID (prefer environment variable NEXT_PUBLIC_PROGRAM_ID, otherwise from your IDL)
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || idl.address)

// Derive the DAO state PDA from seed "dao"
const [DAO_STATE_PDA] = PublicKey.findProgramAddressSync(
	[Buffer.from("dao")],
	PROGRAM_ID
)

export default function YesNoVoteButtons({
	proposalPda,
	hasVoted,
	userVoteType,
	proposalStatus,
	refreshProposals
}: {
	proposalPda: PublicKey
	hasVoted: boolean
	userVoteType: VoteType | null
	proposalStatus?: "Passed" | "Rejected" | "Pending" | "Expired"
	refreshProposals: () => Promise<void>
}) {
	const { connection } = useAppKitConnection()
	const { address, isConnected } = useAppKitAccount()
	const { walletProvider } = useAppKitProvider<Provider>("solana")

	const [loading, setLoading] = useState<VoteType | null>(null)

	async function handleVote(voteType: VoteType) {
		if (!isConnected) {
			toast("Wallet not found", {
				description: `Please connect your wallet first`
			})
			return
		}

		if (proposalStatus === "Expired") {
			toast("Cannot vote on expired proposal", {
				description: "This proposal has expired. Voting is no longer allowed."
			})
			return
		}

		if (proposalStatus === "Passed" || proposalStatus === "Rejected") {
			toast("Cannot vote on this proposal", {
				description: `This proposal is ${proposalStatus.toLowerCase()}. Only pending proposals can be voted on.`
			})
			return
		}

		try {
			setLoading(voteType)

			const walletPublicKey = new PublicKey(address as string)

			if (!connection) {
				toast("Connection not available", {
					description: "Solana connection is not established."
				})
				setLoading(null)
				return
			}

			if (!walletProvider) {
				toast("Wallet provider not available", {
					description: "Please ensure your wallet is connected properly."
				})
				setLoading(null)
				return
			}

			// Create a minimal wallet adapter that Anchor can work with
			const walletAdapter = {
				publicKey: walletProvider.publicKey as PublicKey,
				signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
					if (walletProvider.signTransaction) {
						return await walletProvider.signTransaction(tx) as T
					}
					throw new Error("signTransaction not available")
				},
				signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
					if (walletProvider.signAllTransactions) {
						return await walletProvider.signAllTransactions(txs) as T[]
					}
					throw new Error("signAllTransactions not available")
				}
			}
			const provider = new AnchorProvider(connection, walletAdapter, {
				preflightCommitment: "processed",
			})
			const program = new Program(idl as Idl, provider)

			const [voterStatePda] = PublicKey.findProgramAddressSync(
				[
				Buffer.from("voter"),
					new PublicKey(proposalPda).toBuffer(),
					walletPublicKey.toBuffer(),
				],
				PROGRAM_ID
			)

			// ---- fetch daoState to get token mint
			const accountInfo = await connection.getAccountInfo(DAO_STATE_PDA)
			
			if (!accountInfo) {
				toast("DAO state account not found", {
					description: "Please ensure the program is initialized."
				})
				return
			}
				
			const data = Buffer.from(accountInfo.data.subarray(8))
			const daoState = DaoStateLayout.decode(data)
			
			const mint = daoState.token_mint

			const voterTokenAccount = await getAssociatedTokenAddress(
				mint,
				walletPublicKey
			)

			toast("Loading...", {
				description: "Please wait for approval popup."
			})

			// Convert VoteType to the format expected by the program
			const voteTypeArg = voteType === "Yes" ? { yes: {} } : { no: {} }

			const tx = await program.methods
				.voteOnProposal(voteTypeArg)
				.accounts({
					proposal: new PublicKey(proposalPda),
					daoState: DAO_STATE_PDA,
					voterState: voterStatePda,
					mint,
					voterTokenAccount,
					authority: walletPublicKey,
					systemProgram: SystemProgram.programId,
					tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
				})
				.rpc()

			toast("Vote submitted", {
				description: `Voted ${voteType} on proposal: ${tx}`,
				action: {
					label: "Refresh Proposals",
					onClick: () => refreshProposals()
				}
			})
		} catch (err) {
			toast("Failed to vote", {
				description: err instanceof Error ? err.message : String(err)
			})
		} finally {
			setLoading(null)
		}
	}

	// Show disabled buttons for expired, passed, or rejected proposals
	if (proposalStatus === "Expired" || proposalStatus === "Passed" || proposalStatus === "Rejected") {
		const statusMessage = proposalStatus === "Expired" ? "Expired" : proposalStatus
		return (
			<div className="flex gap-2 w-full sm:w-auto">
				<Button
					variant="outline"
					className="flex-1 sm:flex-none cursor-default opacity-50"
					disabled
				>
					{statusMessage}
				</Button>
			</div>
		)
	}

	if (hasVoted) {
		return (
			<div className="flex gap-2 w-full sm:w-auto">
				<Button
					variant={userVoteType === "Yes" ? "default" : "outline"}
					className="flex-1 sm:flex-none cursor-default"
					disabled
				>
					Yes {userVoteType === "Yes" ? "✓" : ""}
				</Button>
				<Button
					variant={userVoteType === "No" ? "default" : "outline"}
					className="flex-1 sm:flex-none cursor-default"
					disabled
				>
					No {userVoteType === "No" ? "✓" : ""}
				</Button>
			</div>
		)
	}

	return (
		<div className="flex gap-2 w-full sm:w-auto">
			<Button
				variant="outline"
				className="flex-1 sm:flex-none cursor-pointer text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
				onClick={() => handleVote("Yes")}
				disabled={loading !== null}
			>
				{loading === "Yes" ? "Voting..." : "Yes"}
			</Button>
			<Button
				variant="outline"
				className="flex-1 sm:flex-none cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
				onClick={() => handleVote("No")}
				disabled={loading !== null}
			>
				{loading === "No" ? "Voting..." : "No"}
			</Button>
		</div>
	)
}
