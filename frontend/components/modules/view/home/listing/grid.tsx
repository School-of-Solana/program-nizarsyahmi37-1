import { toast } from "sonner"
import { Copy, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ProposalItem } from "@/types/proposal"
import { truncateAddress, formatTimeRemaining } from "@/lib/utils"
import YesNoVoteButtons from "@/components/modules/button/vote"

export default function ViewHomeListingGrid({
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
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
			{paginatedData.map((item) => (
				<Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<Badge className={getStatusColor(item.status)} variant="secondary">
								{item.status}
							</Badge>
						</div>
						<CardTitle className="text-lg">{item.title}</CardTitle>
						<CardDescription className="line-clamp-2">
							{item.description}
						</CardDescription>
						{(item.status === "Pending" || item.status === "Expired") && (
							<p className="text-xs text-muted-foreground mt-2">
								{formatTimeRemaining(item.createdAt)}
							</p>
						)}
					</CardHeader>
					<CardContent className="pb-3">
						<Label>Proposed by:</Label>
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							{truncateAddress(item.creator, 4, 38)}
							<Copy size={15} onClick={() => handleCopy(item.creator)} className="cursor-pointer hover:text-primary" />
							<a href={`https://solscan.io/account/${item.creator}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
								<ExternalLink size={15} />
							</a>
						</p>
					</CardContent>
					<CardFooter className="pt-3 border-t">
						<div className="grid gap-3 w-full">
							<div className="flex items-center justify-between w-full">
								<div className="flex items-center gap-2">
									<Badge variant={item.voted ? "default" : "secondary"}>
										{item.voted ? `Voted ${item.userVoteType}` : "Not Voted"}
									</Badge>
								</div>
								<div className="flex items-center gap-3 text-sm">
									<span className="text-green-600 font-medium">{item.yesVotes} Yes</span>
									<span className="text-red-600 font-medium">{item.noVotes} No</span>
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
					</CardFooter>
				</Card>
			))}
		</div>		
	)
}