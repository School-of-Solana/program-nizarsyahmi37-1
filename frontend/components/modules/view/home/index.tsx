"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useState } from "react"
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react"
import { useAppKitAccount } from "@reown/appkit/react"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { DaoStateLayout, ProposalItem, ProposalLayout, VoterStateLayout, VoteType, getProposalStatus } from "@/types/proposal"

import idl from "@/idl/hob_dao.json"
import CardStats from "../../card/stats"
import ViewHomeListing from "./listing/index"



// Program ID (prefer environment variable NEXT_PUBLIC_PROGRAM_ID, otherwise from your IDL)
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || idl.address)

// Derive the DAO state PDA from seed "dao"
const [DAO_STATE_PDA] = PublicKey.findProgramAddressSync(
	[Buffer.from("dao")],
	PROGRAM_ID
)

export default function ViewHome() {
	const { connection } = useAppKitConnection()
	const { address, isConnected } = useAppKitAccount()
	
	const [userTokenAccount, setUserTokenAccount] = useState<PublicKey>(PublicKey.default)
	const [totalProposals, setTotalProposals] = useState<string>("0")
	const [daoTokenMint, setDaoTokenMint] = useState<PublicKey>(PublicKey.default)
	const [totalVoters, setTotalVoters] = useState<string>("0")
	const [quorumPercentage, setQuorumPercentage] = useState<string>("0")
	const [proposals, setProposals] = useState<ProposalItem[]>([])
	const [refreshing, setRefreshing] = useState<boolean>(false)

	const stats = [
		{
			title: totalProposals,
			description: `Total Proposals`
		},
		{
			title: totalVoters,
			description: `Total Voters`
		},
		{
			title: quorumPercentage,
			description: `Quorum Percentage`
		},
		{
			title: `100%`,
			description: `Decentralized Votes`
		}
	]

	const getProposals = useCallback(async () => {
		setRefreshing(true)
		if (connection && PROGRAM_ID) {
			try {
				const daoAcc = await connection.getAccountInfo(DAO_STATE_PDA)

				if (!daoAcc) {
					toast("DAO state not found", {
						description: "Program may not be initialized"
					})
					return
				}
			
				const daoData = daoAcc.data.subarray(8)
				const daoState = DaoStateLayout.decode(daoData)
			
				const results: ProposalItem[] = []
			
				for (let i = 0; i < Number(daoState.proposal_count); i++) {
					// Create u64 buffer for proposal index
					const proposalIndexBuffer = Buffer.alloc(8)
					proposalIndexBuffer.writeBigUInt64LE(BigInt(i), 0)

					const [PROPOSAL_PDA] = PublicKey.findProgramAddressSync(
						[
							Buffer.from("proposal"),
							DAO_STATE_PDA.toBuffer(),
							proposalIndexBuffer
						],
						PROGRAM_ID
					)

					const acc = await connection.getAccountInfo(PROPOSAL_PDA)
							
					if (!acc) continue

					const data = acc.data.subarray(8)
					const proposal = ProposalLayout.decode(data)

					let hasVoted = false
					let userVoteType: VoteType | null = null

					// check voter PDA
					if (isConnected && address) {
						const userPubkey = new PublicKey(address)

						const [VOTER_PDA] = PublicKey.findProgramAddressSync(
							[Buffer.from("voter"), PROPOSAL_PDA.toBuffer(), userPubkey.toBuffer()],
							PROGRAM_ID
						)

						const voterAcc = await connection.getAccountInfo(VOTER_PDA)

						if (voterAcc) {
							const voterData = VoterStateLayout.decode(voterAcc.data.subarray(8))
							hasVoted = voterData.has_voted
							if (hasVoted) {
								// Convert vote_type number to VoteType: 0 = Yes, 1 = No
								userVoteType = voterData.vote_type === 0 ? "Yes" : "No"
							}
						}
					}

					const yesVotes = Number(proposal.yes_votes)
					const noVotes = Number(proposal.no_votes)
					const totalVotes = yesVotes + noVotes
					const createdAt = Number(proposal.created_at)

					results.push({
						id: proposal.proposal_id.toString(),
						pda: PROPOSAL_PDA,
						title: proposal.title,
						description: proposal.description,
						status: getProposalStatus(proposal.state, createdAt),
						voted: hasVoted,
						userVoteType,
						yesVotes,
						noVotes,
						totalVotes,
						creator: proposal.creator.toBase58(),
						createdAt
					})
				}
			
				setProposals(results)
			} catch (error) {
				toast("Failed to fetch proposals", {
					description: error instanceof Error ? error.message : String(error),
				})
			}
		}
		setRefreshing(false)
	}, [connection, PROGRAM_ID, isConnected, address])

	useEffect(() => {
		const fetchDaoState = async () => {
			if (connection) {
				try {
					const accountInfo = await connection.getAccountInfo(DAO_STATE_PDA)

					if (!accountInfo) {
						toast("DAO state account not found", {
							description: "Please ensure the program is initialized."
						})
						return
					}
	
					const data = Buffer.from(accountInfo.data.subarray(8))
					const daoState = DaoStateLayout.decode(data)

					setTotalProposals(daoState.proposal_count.toString())
					setTotalVoters(daoState.total_voters.toString())
					setQuorumPercentage(daoState.quorum_percentage.toString())
					setDaoTokenMint(daoState.token_mint)
				} catch (error) {
					toast("Failed to fetch DAO state", {
						description: error instanceof Error ? error.message : String(error)
					})
				}
			}
		}

		if (connection) {
			fetchDaoState()
		}
	}, [connection])

	useEffect(() => {
		const fetchInfo = async () => {
			if (connection && isConnected && daoTokenMint && daoTokenMint !== PublicKey.default) {
				const walletPublicKey = new PublicKey(address as string)

				try {
					const tokenAccount = await getAssociatedTokenAddress(
						daoTokenMint,        
						walletPublicKey
					)

					setUserTokenAccount(tokenAccount)

					const accountInfo = await connection.getAccountInfo(tokenAccount)

					if (!accountInfo) {
						toast("No DAO tokens found in your wallet", {
							description: "You need DAO tokens to participate in voting."
						})
						return
					}

					const tokenAmount = accountInfo.data.readBigUInt64LE(64) // Amount is at offset 64
					if (tokenAmount === BigInt(0)) {
						toast("No DAO tokens found in your wallet", {
							description: "You need DAO tokens to participate in voting."
						})
						return
					}
				} catch (error) {
					toast("Failed to fetch information", {
						description: error instanceof Error ? error.message : String(error)
					})
				}
			}
		}

		if (connection && isConnected && daoTokenMint && daoTokenMint !== PublicKey.default) {
			fetchInfo()
		}
	}, [connection, isConnected, daoTokenMint, address])

	useEffect(() => {
		if (connection && PROGRAM_ID) {
			getProposals()
		}
	}, [connection, isConnected, PROGRAM_ID, address, getProposals])

	return (
		<section className={`grid gap-4 p-4`}>
			<div className={`grid gap-4 grid-cols-2 lg:grid-cols-4`}>
				{stats.map((item, index) => (
					<CardStats
						key={index}
						title={item.title}
						description={item.description}
					/>
				))}
			</div>
			<ViewHomeListing
				proposalData={proposals}
				tokenMint={daoTokenMint}
				tokenAccount={userTokenAccount}
				refreshing={refreshing}
				refreshProposals={getProposals}
			/>
		</section>
	)
}
