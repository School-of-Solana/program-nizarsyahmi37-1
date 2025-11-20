import type { Metadata } from "next"
import { ReactNode } from "react"
import { ThemeProvider } from "@/components/modules/theme/provider"
import { GoogleTagManager } from "@next/third-parties/google"
import { Toaster } from "@/components/ui/sonner"
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics"

import ContextProvider from "@/context"
import Layout from "@/components/modules/general/layout"

import "./globals.css"

export const metadata: Metadata = {
	title: "House of Bytez: Governance",
	description: "Decentralized decision making for the community"
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<GoogleAnalytics />
			</head>
			<body>
				<GoogleTagManager
					gtmId={process.env.GOOGLE_TAG_MANAGER_ID as string}
				/>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<ContextProvider>
						<Layout>
							{children}
							<Toaster />
						</Layout>
					</ContextProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
