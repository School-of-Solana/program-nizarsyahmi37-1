"use client"

import type { Provider } from "@reown/appkit-adapter-solana/react"

import { toast } from "sonner"
import { useState, useMemo } from "react"
import { Search, Grid3X3, List, Filter, Plus, RefreshCw } from "lucide-react"
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor"
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react"
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react"
import { PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProposalItem } from "@/types/proposal"

import idl from "@/idl/hob_dao.json"
import ViewHomeListingGrid from "./grid"
import ViewHomeListingList from "./list"
import ViewHomeListingPagination from "./pagination"

type ViewMode = "list" | "grid"
type VotingFilter = "all" | "voted" | "not-voted"
type StatusFilter = "all" | "passed" | "pending" | "rejected" | "expired"

const ITEMS_PER_PAGE = 8

// Program ID (from your IDL)
const PROGRAM_ID = new PublicKey(idl.address)

// Derive the DAO state PDA from seed "dao"
const [DAO_STATE_PDA] = PublicKey.findProgramAddressSync(
	[Buffer.from("dao")],
	PROGRAM_ID
)

export default function ViewHomeListing({
	proposalData,
	tokenMint,
	tokenAccount,
	refreshing,
	refreshProposals
} : {
	proposalData: ProposalItem[]
	tokenMint: PublicKey | null
	tokenAccount: PublicKey | null
	refreshing: boolean
	refreshProposals: () => Promise<void>
}) {
	const { connection } = useAppKitConnection()
	const { address, isConnected } = useAppKitAccount()
	const { walletProvider } = useAppKitProvider<Provider>("solana")

	const [viewMode, setViewMode] = useState<ViewMode>("list")
	const [votingFilter, setVotingFilter] = useState<VotingFilter>("all")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [currentPage, setCurrentPage] = useState(1)
	const [searchTerm, setSearchTerm] = useState("")
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [loading, setLoading] = useState(false)

	// Filter and search logic
	const filteredData = useMemo(() => {
		let filtered = proposalData

		// Apply voting filter
		if (votingFilter === "voted") {
			filtered = filtered.filter(item => item.voted)
		} else if (votingFilter === "not-voted") {
			filtered = filtered.filter(item => !item.voted)
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter(item => item.status.toLowerCase() === statusFilter)
		}

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(item =>
				item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.creator.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		return filtered
	}, [votingFilter, statusFilter, searchTerm, proposalData])

	// Pagination logic
	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
	const endIndex = startIndex + ITEMS_PER_PAGE
	const paginatedData = filteredData.slice(startIndex, endIndex)

	const handleCreateProposal = async () => {
		if (!isConnected) {
			toast("Wallet not found", {
				description: `Please connect your wallet first`
			})
			return
		}

		try {
			setLoading(true)

			const walletPublicKey = new PublicKey(address as string)

			if (!connection) {
				toast("Connection not available", {
					description: "Solana connection is not established."
				})
				setLoading(false)
				return
			}

			if (!tokenMint) {
				toast("Token mint not available", {
					description: "Please check the token mint address."
				})
				setLoading(false)
				return
			}

			if (!tokenAccount) {
				toast("User token account not available", {
					description: "Please create token account first."
				})
				setLoading(false)
				return
			}

			if (!walletProvider) {
				toast("Wallet provider not available", {
					description: "Please ensure your wallet is connected properly."
				})
				setLoading(false)
				return
			}

			// Debug: Log wallet provider properties
			// console.log("Wallet provider:", walletProvider)
			// console.log("Wallet provider keys:", Object.keys(walletProvider))
			// console.log("Public key:", walletProvider.publicKey)
			// console.log("Sign transaction:", typeof walletProvider.signTransaction)
			// console.log("Sign all transactions:", typeof walletProvider.signAllTransactions)

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

			// setup provider with the custom wallet adapter
			const provider = new AnchorProvider(connection, walletAdapter, {
				preflightCommitment: "processed",
			})
			const program = new Program(idl as Idl, provider)

			// Get current DAO state to determine proposal count
			const daoStateAccount = await connection.getAccountInfo(DAO_STATE_PDA)
			if (!daoStateAccount) {
				toast("DAO state not found", {
					description: "DAO may not be initialized"
				})
				setLoading(false)
				return
			}

			// Decode the proposal count from DAO state
			const daoStateData = daoStateAccount.data.subarray(8) // Skip discriminator
			const proposalCount = daoStateData.readBigUInt64LE(0) // First field is proposal_count

			// console.log("Current proposal count:", proposalCount.toString())

			// Generate the proposal PDA properly - encode proposal count as u64 little-endian
			const proposalCountBuffer = Buffer.alloc(8)
			proposalCountBuffer.writeBigUInt64LE(proposalCount, 0)

			const [proposalPDA] = PublicKey.findProgramAddressSync(
				[
					Buffer.from("proposal"),
					DAO_STATE_PDA.toBuffer(),
					proposalCountBuffer
				],
				new PublicKey(idl.address)
			)

			// console.log("Generated proposal PDA:", proposalPDA.toBase58())
			toast("Loading...", {
				description: "Please wait for approval popup."
			})
		
			// call the create_proposal instruction
			const txSig = await program.methods
				.createProposal(title, description)
				.accounts({
					daoState: DAO_STATE_PDA,
					proposal: proposalPDA,
					mint: tokenMint,
					creatorTokenAccount: tokenAccount,
					creator: walletPublicKey,
					authority: walletPublicKey,
					systemProgram: SystemProgram.programId,
					tokenProgram: TOKEN_PROGRAM_ID
				})
				.rpc()

			toast("Proposal created", {
				description: `Proposal submitted: ${txSig}`,
				action: {
					label: "Refresh Proposals",
					onClick: () => refreshProposals()
				}
			})
		} catch (err) {
			toast("Failed to create proposal", {
				description: err instanceof Error ? err.message : String(err)
			})
		} finally {
			setLoading(false)
		}
	}

	// Reset to first page when filters change
	useMemo(() => {
		setCurrentPage(1)
	}, [])

	return (
		<div className="p-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">
					All Proposals
				</h1>
				<p className="text-muted-foreground mt-2">
					Review and vote on community proposals
				</p>
			</div>

			<div className="flex flex-col lg:flex-row gap-4 mb-6">
				<div className="flex-1 max-w-sm">
					<div className="relative">
						<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search items..."
							className="pl-10"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>
				
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<Select value={votingFilter} onValueChange={(value: VotingFilter) => setVotingFilter(value)}>
						<SelectTrigger className="w-full sm:w-[130px] cursor-pointer">
							<Filter className="h-4 w-4 mr-2" />
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Voting</SelectItem>
							<SelectItem value="voted">Voted</SelectItem>
							<SelectItem value="not-voted">Not Voted</SelectItem>
						</SelectContent>
					</Select>

					<Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
						<SelectTrigger className="w-full sm:w-[120px] cursor-pointer">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="passed">Passed</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="rejected">Rejected</SelectItem>
							<SelectItem value="expired">Expired</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex items-center border rounded-md w-full sm:w-auto">
						<Button
							variant={viewMode === "list" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("list")}
							className="rounded-r-none flex-1 sm:flex-none cursor-pointer"
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === "grid" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("grid")}
							className="rounded-l-none flex-1 sm:flex-none cursor-pointer"
						>
							<Grid3X3 className="h-4 w-4" />
						</Button>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-[auto_1fr] gap-2">
						<Dialog>
							<form>
								<DialogTrigger asChild>
									<Button className="w-full sm:w-auto cursor-pointer">
										<Plus className="h-4 w-4" />
										<span className="hidden sm:inline">Add Proposal</span>
										<span className="sm:hidden">Add</span>
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-[425px]">
									<DialogHeader>
										<DialogTitle>
											Add Proposal
										</DialogTitle>
										<DialogDescription>
											Create a new proposal for community to vote on.
										</DialogDescription>
									</DialogHeader>
									<div className="grid gap-4">
										<div className="grid gap-3">
											<Label htmlFor="title">
												Title
											</Label>
											<Input id="title" name="title" defaultValue="" placeholder="Enter proposal title" onChange={(e) => setTitle(e.target.value)} />
										</div>
										<div className="grid gap-3">
											<Label htmlFor="description">
												Description
											</Label>
											<Textarea id="description" name="description" defaultValue="" placeholder="Explain what the proposal about" onChange={(e) => setDescription(e.target.value)} />
										</div>
									</div>
									<DialogFooter>
										<DialogClose asChild>
											<Button variant="outline" className="cursor-pointer">
												Cancel
											</Button>
										</DialogClose>
										<DialogClose asChild>
											<Button type="submit" disabled={loading} className="cursor-pointer" onClick={handleCreateProposal}>
												{loading ? `Loading...` : `Submit`}
											</Button>
										</DialogClose>
									</DialogFooter>
								</DialogContent>
							</form>
						</Dialog>
						<Button className="w-full sm:w-auto cursor-pointer" onClick={refreshProposals} disabled={refreshing}>
							<RefreshCw className={`h-4 w-4 ${refreshing && `animate-spin`}`} />
							<span className="hidden sm:inline">Refresh Proposal</span>
							<span className="sm:hidden">Refresh</span>
						</Button>
					</div>
				</div>
			</div>

			<div className="transition-all duration-200 ease-in-out">
				{paginatedData.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-muted-foreground mb-2">
							No items found
						</div>
						<p className="text-sm text-muted-foreground">
							Try adjusting your search or filter criteria
						</p>
					</div>
				) : (
					<>
						{viewMode === "grid" ? (
							<ViewHomeListingGrid paginatedData={paginatedData} refreshProposals={refreshProposals} />
						) : (
							<ViewHomeListingList paginatedData={paginatedData} refreshProposals={refreshProposals} />
						)}
						<ViewHomeListingPagination
							currentPage={currentPage}
							setCurrentPage={setCurrentPage}
							totalPages={totalPages}
							filteredData={filteredData}
							startIndex={startIndex}
							endIndex={endIndex}
						/>
					</>
				)}
			</div>
		</div>
	)
}
