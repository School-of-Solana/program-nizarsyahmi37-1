import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CardStats({
	title = "Title",
	description = "Description",
	icon = null
} : {
	title?: ReactNode
	description?: ReactNode
	icon?: ReactNode
}) {
	return (
		<Card className={`gap-0`}>
			<CardHeader className={`flex gap-2 align-middle items-center`}>
				{icon}
				<CardTitle className={`text-2xl font-bold`}>
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>
					{description}
				</CardDescription>
			</CardContent>
		</Card>
	)
}
