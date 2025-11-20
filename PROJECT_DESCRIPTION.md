# Project Description — Hob DAO (Anchor + Next.js frontend)

**Deployed Frontend URL:** http://localhost:3000 (development) — replace with your production URL when deployed

**Solana Program ID:** CX6oBVoDv3dFWsSmEJbaWAaNzdhyjbBDdCCue8vDmQSo (devnet)

## Project Overview

### Description
Hob DAO is a simple on-chain governance example built with Anchor (Rust) and a Next.js frontend. The program stores DAO configuration (quorum, total voters, token mint) in a `DaoState` account and allows members to create proposals and vote using DAO tokens. The frontend reads raw account data and provides an interface to view proposals, see voting progress, and submit yes/no votes using a connected wallet.

The repo contains two main parts:
- `anchor_project/` — Anchor program (Rust) with migrations and scripts to build, test, and deploy.
- `frontend/` — Next.js + React UI that loads the program IDL, reads account state, and calls program RPCs via Anchor and the connected wallet.

### Key Features

- Initialize a DAO with parameters (quorum percentage, total voters, token mint).
- Create proposals with title and description (stored in PDA accounts derived from the DAO state).
- Vote on proposals (Yes/No) using DAO tokens; voter state is recorded per-proposal.
- Read DAO configuration, proposal listings, and per-proposal vote progress in the UI.
- Frontend supports environment override of program id (NEXT_PUBLIC_PROGRAM_ID) so you can point it at different deployments.

### How to Use the dApp

1. Start the frontend locally and connect a wallet (the app uses Reown AppKit adapter by default).
2. If the DAO is not initialized, run the `initialize-dao` script in `anchor_project/scripts/` or use the Anchor client to call `initialize_dao`.
3. Create proposals via the UI or by calling the `create_proposal` instruction.
4. Wallet-holders with DAO tokens can vote on proposals using the UI's Yes/No buttons.

## Program Architecture

The on-chain program is implemented in Anchor (see `anchor_project/programs/hob-dao/src/lib.rs`). It uses PDAs for deterministic storage of DAO state, proposals, and voter records. The UI decodes raw account data using TypeScript layouts under `frontend/types/` and the IDL under `frontend/idl/hob_dao.json`.

### PDA Usage

Key PDAs used by the program (seeds shown):
- `dao` — the DAO state PDA (seed: `"dao"`). Stores DAO configuration such as `quorum_percentage`, `total_voters`, and `token_mint`.
- `proposal` — proposal PDA derived from seeds `["proposal", dao_state_pda, proposal_index_u64]`. Each proposal has its own account storing title, description, vote counts, creator, and timestamps.
- `voter` — voter PDA derived from seeds `["voter", proposal_pda, voter_pubkey]`. Tracks whether a wallet has voted on a specific proposal and their vote type.

These PDAs enable deterministic lookup of DAO state, proposals by index, and voter records for access control and vote tracking.

### Program Instructions

The program exposes several Anchor instructions (as seen in the IDL and program source):
- `initialize_dao(quorum_percentage: u8, total_voters: u64)` — create and initialize the DAO state PDA.
- `create_proposal(title: string, description: string)` — create a new proposal PDA and initialize proposal data.
- `vote_on_proposal(vote_type)` — cast a vote on a proposal; updates vote counts and creates/updates voter PDA.
- `freeze_token_account` / `unfreeze_token_account` — utility instructions related to token accounts (if used in your flow).

Refer to `frontend/idl/hob_dao.json` for the full IDL and exact account/arg layouts.

### Account Structure (high level)

- `DaoState` — stores DAO-wide configuration: quorum percentage (u8), total_voters (u64), token_mint (Pubkey), proposal_count (u64), etc.
- `Proposal` — stores proposal id/index (u64), title (string), description (string), yes_votes/no_votes (u64), state (enum), creator (Pubkey), created_at (i64), and other metadata.
- `VoterState` — per-proposal voter record; tracks has_voted (bool) and vote_type (enum: Yes/No).

## Testing

### Test Coverage
The Anchor test suite (located in `anchor_project/tests/`) exercises program behavior: initializing the DAO, creating proposals, voting, and edge cases (duplicate initialization, unauthorized actions).

**Happy Path Tests:**
- Initialize DAO successfully.
- Create a proposal and read it back.
- Cast votes and validate vote counts and quorum calculations.

**Unhappy Path Tests:**
- Attempt to initialize a DAO that already exists.
- Unauthorized attempts to modify DAO state or vote from non-owner wallets.

### Running Tests
Run tests from the `anchor_project` directory:
```bash
cd anchor_project
npm install   # ensure TypeScript deps for tests are installed
anchor test
```

## Running & Deploying

Anchor program (devnet)
- Build:
```bash
cd anchor_project
anchor build
```
- Deploy to devnet (ensure `ANCHOR_PROVIDER_URL` / `ANCHOR_WALLET` are set or configured in `anchor_project/Anchor.toml`):
```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=/path/to/your/wallet.json
anchor deploy --provider.cluster devnet
```

Frontend
- Run locally:
```bash
cd frontend
npm install
export NEXT_PUBLIC_PROGRAM_ID=CX6oBVoDv3dFWsSmEJbaWAaNzdhyjbBDdCCue8vDmQSo
npm run dev
# open http://localhost:3000
```
- For production, build and deploy the Next.js app to your hosting provider and set `NEXT_PUBLIC_PROGRAM_ID` in the host's environment.

## Notes & Migration

- The repository contains an IDL in `frontend/idl/hob_dao.json` whose `address` currently points to `CX6oBVo...` (the deployed devnet program). Anchor's `Anchor.toml` maps a program id (`CX6oBVo...`) for localnet/devnet entries — if you redeploy the program you may want to update the `Anchor.toml` and `frontend/idl/hob_dao.json` to keep them in sync.
- The deployed program is upgradeable; the `ProgramData` account and `Authority` control upgrades. Ensure you deploy with the correct upgrade authority if you plan to upgrade an existing on-chain program.

## Additional Notes for Evaluators

This project demonstrates a small governance flow (create proposals, vote using token holdings) implemented in Anchor with a React/Next.js frontend. The UI decodes Anchor account layouts directly and constructs PDAs using the same seeds as the on-chain program to query state.

If you want me to update the `frontend/idl/hob_dao.json` address to a different deployed program or to update `Anchor.toml` to the current deployed id, tell me which program id to write and I can prepare the change (no runtime deployment will be performed without your approval).