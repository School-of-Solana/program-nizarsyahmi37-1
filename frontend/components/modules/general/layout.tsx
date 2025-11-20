import { ReactNode } from "react"

import Header from "./header"

export default async function Layout({
	children,
}: Readonly<{
	children: ReactNode
}>) {
	return (
		<div>
			<Header />
			{children}
		</div>
	)
}
