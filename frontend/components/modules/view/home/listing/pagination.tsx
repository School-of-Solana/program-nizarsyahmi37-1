"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProposalItem } from "@/types/proposal"

export default function ViewHomeListingPagination({
	totalPages,
	currentPage,
	setCurrentPage,
	startIndex,
	endIndex,
	filteredData
} : {
	totalPages: number
	currentPage: number
	setCurrentPage: (page: number) => void
	startIndex: number
	endIndex: number
	filteredData: ProposalItem[]
}) {
	if (totalPages <= 1) return null

	const getPageNumbers = () => {
		const pages = []
		const maxVisiblePages = 5
			
		if (totalPages <= maxVisiblePages) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i)
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) {
					pages.push(i)
				}
				pages.push("...")
				pages.push(totalPages)
			} else if (currentPage >= totalPages - 2) {
				pages.push(1)
				pages.push("...")
				for (let i = totalPages - 3; i <= totalPages; i++) {
					pages.push(i)
				}
			} else {
				pages.push(1)
				pages.push("...")
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i)
				}
				pages.push("...")
				pages.push(totalPages)
			}
		}
		
		return pages
	}

	return (
		<div className="flex items-center justify-between mt-6">
			<div className="text-sm text-muted-foreground">
				Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} items
			</div>
			
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentPage(currentPage - 1)}
					disabled={currentPage === 1}
				>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Previous
				</Button>
				
				<div className="hidden sm:flex items-center gap-1">
					{getPageNumbers().map((page, index) => (
						<div key={index}>
							{page === "..." ? (
								<span className="px-3 py-1 text-muted-foreground">...</span>
							) : (
								<Button
									variant={currentPage === page ? "default" : "outline"}
									size="sm"
									onClick={() => setCurrentPage(page as number)}
									className="w-10 h-8"
								>
									{page}
								</Button>
							)}
						</div>
					))}
				</div>
					
				<div className="sm:hidden text-sm text-muted-foreground">
					Page {currentPage} of {totalPages}
				</div>
					
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentPage(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	)
}