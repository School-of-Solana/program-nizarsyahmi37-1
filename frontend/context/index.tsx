"use client"

import { solanaWeb3JsAdapter, projectId, networks } from "../config"
import { createAppKit } from "@reown/appkit/react"
import { type ReactNode } from "react"

// Set up metadata
const metadata = {
	name: "House of Bytez: Governance",
	description: "Decentralized decision making for the community",
	url: "https://governance.houseofbytez.com", // origin must match your domain & subdomain
	icons: [
		"https://governance.houseofbytez.com/favicon.ico"
	]
}

// Create the modal
export const modal = createAppKit({
	adapters: [
		solanaWeb3JsAdapter
	],
	projectId,
	networks,
	metadata,
	themeMode: "light",
	features: {
		analytics: true // Optional - defaults to your Cloud configuration
	},
	themeVariables: {
		"--w3m-accent": "#000000",
	}
})

function ContextProvider({
	children
}: {
	children: ReactNode
}) {
	return (
		<div>
			{children}
		</div>
	)
}

export default ContextProvider
