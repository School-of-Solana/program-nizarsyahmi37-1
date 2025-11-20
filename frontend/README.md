Frontend — Hob Governance (Next.js)

This folder contains the Next.js frontend for the Hob DAO example. It reads the program IDL, displays proposals, and lets connected wallets vote via the Anchor program on Solana.

Contents (high level)
- app/, components/ — Next.js pages and React components.
- config/ — adapter and project configuration (config/index.ts).
- idl/ — bundled IDL: frontend/idl/hob_dao.json.
- lib/, hooks/, context/ — helpers and React context.
- types/ — TypeScript layouts used to decode program account data.
- next.config.ts, tsconfig.json, package.json — build and dependency config.
- .env.example — example environment variables.

How the frontend selects the program to use
1) NEXT_PUBLIC_PROGRAM_ID environment variable (if set).
2) the address field inside frontend/idl/hob_dao.json.

This allows you to point the UI at any deployed program without editing code. Key UI files that use the program id: components/modules/view/home/index.tsx and components/modules/button/vote.tsx.

Quick start (local)
1) Install deps: cd frontend && npm install (or yarn install).
2) Optionally copy .env.example to .env.local and set NEXT_PUBLIC_PROGRAM_ID to the program id you want to use.
3) Start dev server: npm run dev (open http://localhost:3000).

IDL and program address
- The app ships with frontend/idl/hob_dao.json. Its address field is the default program id the UI will use if NEXT_PUBLIC_PROGRAM_ID is not set. To change program target: set NEXT_PUBLIC_PROGRAM_ID or update the idl file.

Key files to inspect
- config/index.ts — Reown AppKit and network configuration.
- components/modules/view/home/index.tsx — main DAO listing and account decoding.
- components/modules/button/vote.tsx — voting flow that builds an Anchor Program at runtime.

Troubleshooting
- If you see DAO state not found: ensure the program id is deployed on the chosen cluster and the DAO was initialized.
- Ensure your wallet is connected and has SOL (for devnet use solana airdrop).
- Install dev-type packages (like @types/node) if the editor complains about process or Buffer.

Deploying the frontend
- Build: npm run build && npm start, or deploy to Vercel or Netlify and set NEXT_PUBLIC_PROGRAM_ID in environment settings.

Security note
- Do not commit private key files. The frontend only needs public env variables like NEXT_PUBLIC_PROGRAM_ID.

This README documents only files inside the frontend directory as requested.