"use client"

import { Loader2 } from "lucide-react"
import { useClientMounted } from "@/hooks/useClientMount"
import { Button } from "@/components/ui/button"

import ButtonConnect from "../button/connect"
import { ButtonMode } from "../button/mode"

export default function Header() {
	const mounted = useClientMounted()

	return (
		<header className={`grid grid-cols-[1fr_auto] gap-2 items-center align-middle p-4`}>
			<div className={`flex items-center justify-start align-middle`}>
				<h1 className={`flex items-center justify-start align-middle gap-1 font-bold text-lg`}>
					<span className={`block md:hidden`}>
						HoB
					</span><span className={`hidden md:block`}>
						House of Bytez
					</span> Governance
				</h1>
			</div>
			<div className={`flex gap-2 items-center justify-center align-middle`}>
				<ButtonMode />
				{!mounted ? (
					<Button
						disabled
						className={`cursor-progress flex items-center justify-center align-middle gap-2 my-auto`}
					>
						<Loader2 className="w-4 h-4 animate-spin" />
						<span className={`hidden md:block`}>
							Loading...
						</span>
					</Button>
				) : (
					<ButtonConnect />
				)}
			</div>
		</header>
	)
}
