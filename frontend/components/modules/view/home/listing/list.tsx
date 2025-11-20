import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProposalItem } from "@/types/proposal"
import { Copy, ExternalLink } from "lucide-react"
import { truncateAddress, formatTimeRemaining } from "@/lib/utils"

import YesNoVoteButtons from "@/components/modules/button/vote"

export default function ViewHomeListingList({
	paginatedData,
	refreshProposals
} : {
	paginatedData: ProposalItem[]
	refreshProposals: () => Promise<void>
}) {
	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "passed": return "bg-green-100 text-green-800"
			case "pending": return "bg-yellow-100 text-yellow-800"
			case "rejected": return "bg-gray-100 text-gray-800"
			case "expired": return "bg-red-100 text-red-800"
			default: return "bg-gray-100 text-gray-800"
		}
	}
		
	const handleCopy = (item: string) => {
		navigator.clipboard.writeText(item)
		toast("Address copied to clipboard", {
			description: item
		})
	}
	
	return (
		<div className="border rounded-lg overflow-hidden">
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Creator</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Voting</TableHead>
							<TableHead>Yes Votes</TableHead>
							<TableHead>No Votes</TableHead>
							<TableHead>Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData.map((item) => (
							<TableRow key={item.id} className="hover:bg-muted/50">
								<TableCell>
									<div className="min-w-[25vw] w-full max-w-[500px]">
										<div className="font-medium">{item.title}</div>
										<div className="text-sm text-muted-foreground text-wrap">
											{item.description}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<p className="flex items-center gap-2 text-sm text-muted-foreground">
										{truncateAddress(item.creator, 4, 38)}
										<Copy size={15} onClick={() => handleCopy(item.creator)} className="cursor-pointer hover:text-primary" />
										<a href={`https://solscan.io/account/${item.creator}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
											<ExternalLink size={15} />
										</a>
									</p>
								</TableCell>
								<TableCell>
									<Badge className={getStatusColor(item.status)} variant="secondary">
										{item.status}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={item.voted ? "default" : "secondary"}>
										{item.voted ? `Voted ${item.userVoteType}` : "Not Voted"}
									</Badge>
								</TableCell>
								<TableCell className="text-green-600 font-medium">{item.yesVotes}</TableCell>
								<TableCell className="text-red-600 font-medium">{item.noVotes}</TableCell>
								<TableCell>
									<YesNoVoteButtons
										proposalPda={item.pda}
										hasVoted={item.voted}
										userVoteType={item.userVoteType}
										refreshProposals={refreshProposals}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="md:hidden">
				{paginatedData.map((item) => (
					<div key={item.id} className="p-4 border-b last:border-b-0 hover:bg-muted/50">
						<div className="flex items-start justify-between mb-2">
							<h3 className="font-medium text-base">
								{item.title}
							</h3>
						</div>
						<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
							{item.description}
						</p>
						{(item.status === "Pending" || item.status === "Expired") && (
							<p className="text-xs text-muted-foreground mb-2">
								{formatTimeRemaining(item.createdAt)}
							</p>
						)}
						<div className="flex items-center gap-2 mb-2">
							<Badge className={getStatusColor(item.status)} variant="secondary">
								{item.status}
							</Badge>
							<Badge variant={item.voted ? "default" : "secondary"}>
								{item.voted ? `Voted ${item.userVoteType}` : "Not Voted"}
							</Badge>
						</div>
						<div className="grid grid-cols-[1fr_auto] gap-2">
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<p className="flex items-center gap-2 text-sm text-muted-foreground">
									{truncateAddress(item.creator, 4, 38)}
									<Copy size={15} onClick={() => handleCopy(item.creator)} className="cursor-pointer hover:text-primary" />
									<a href={`https://solscan.io/account/${item.creator}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
										<ExternalLink size={15} />
									</a>
								</p>
								<div className="flex items-center gap-3">
									<span className="text-green-600">{item.yesVotes} Yes</span>
									<span className="text-red-600">{item.noVotes} No</span>
								</div>
							</div>
							<YesNoVoteButtons
								proposalPda={item.pda}
								hasVoted={item.voted}
								userVoteType={item.userVoteType}
								proposalStatus={item.status}
								refreshProposals={refreshProposals}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}