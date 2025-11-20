

"use client"

import { Wallet } from "lucide-react"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { Button } from "@/components/ui/button"

export default function ButtonConnect() {
	const { open } = useAppKit()
	const { isConnected } = useAppKitAccount()
	
	return (
		<Button
			className={`cursor-pointer flex items-center justify-center align-middle gap-2 my-auto`}
			onClick={() => open()}
		>
			<Wallet className="w-4 h-4" />
			<span className={`hidden md:block`}>
				{isConnected ? (
					`Open Wallet`
				) : (
					`Connect Wallet`
				)}
			</span>
		</Button>
	)
}
