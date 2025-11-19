Hob DAO — Anchor Program

This folder contains the Anchor-based Solana program and TypeScript tooling for the Hob DAO example.

The README below documents how to build, test, and interact with the program from inside the `anchor_project` directory.

## Contents

- `Anchor.toml` — Anchor project configuration.
- `Cargo.toml` and `programs/hob-dao/` — Rust program source for the on-chain program.
- `migrations/` — Anchor migrations (deployment scripts) used by `anchor deploy`.
- `scripts/` — TypeScript helper scripts to query or interact with the program (e.g. `get-proposals.ts`).
- `tests/` — integration tests (Mocha/TypeScript) that run against a local validator.
- `target/` — build artifacts and generated IDL (`target/idl/`).
- `types/` — generated TypeScript types for the program (if generated).
- `package.json`, `tsconfig.json` — Node/TS config for scripts and tests.

## Quick overview

This project uses Anchor (Rust + TypeScript) to develop a Solana on-chain program. Typical workflow:

1. Build the Rust program to produce IDL (Anchor: `anchor build`).
2. Deploy to a validator or cluster (Anchor: `anchor deploy`).
3. Use the IDL + `@project-serum/anchor` in TypeScript scripts or tests to interact with the program.

## Prerequisites

- Rust and Cargo (stable toolchain)
- Solana CLI (recommended version pinned to Anchor's compatibility)
- Anchor CLI (installed via `cargo install --locked anchor-cli --version <version>` or via your preferred method)
- Node.js (LTS) and npm / yarn
- `ts-node` / TypeScript for running scripts and tests

Install typical tools (example):

```bash
# macOS example (adjust versions as needed)
brew install rustup-init # if you don't have rust
rustup default stable
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --locked anchor-cli
npm install # or yarn
```

Note: This repo may require specific versions of Solana/Anchor — check `Anchor.toml` and CI config if present.

## Project layout (inside `anchor_project`)

- `Anchor.toml` — Anchor manifests and cluster configuration.
- `programs/hob-dao/` — Rust crate containing the on-chain program source (`src/lib.rs`).
- `migrations/` — scripts used by Anchor to deploy or migrate state.
- `scripts/` — TypeScript scripts for common interactions (see `scripts/README.md` if present).
- `tests/` — integration tests that launch a local validator and exercise the program.
- `target/idl/` — generated IDL JSON files after `anchor build`.

## Build

From inside `anchor_project`:

```bash
anchor build
```

This will compile the Rust program(s) and write IDL(s) to `target/idl/`. If the build fails, first ensure your Rust toolchain matches the project requirements.

## Run tests

Anchor tests typically launch a local validator and run the test suite (Mocha / TypeScript):

```bash
anchor test
```

Tests will compile code and run the files in `tests/`.

If you prefer to run tests directly with `npm`/`yarn` scripts (check `package.json`), you can run:

```bash
npm run test
# or
yarn test
```

## Local deployment (development)

1. Start a local validator (optional — `anchor test` does this automatically). To run a standalone validator:

```bash
solana-test-validator --reset
```

2. Build and deploy the program to localnet:

```bash
anchor build
anchor deploy --provider.cluster Localnet
```

Notes:
- Anchor writes the program keypair to `target/deploy/` (e.g. `hob_dao-keypair.json`). Keep this file safe for local development.
- To deploy to a cluster other than localnet, configure `Anchor.toml` or pass environment/flags as appropriate.

## Scripts (TypeScript)

This project includes convenience scripts in `scripts/` for reading proposals, initializing the DAO, etc. Example scripts you may find:

- `get-proposals.ts` — query proposals
- `get-proposal-details.ts` — query a single proposal's details
- `initialize-dao.ts` / `initialize-dao.js` — bootstrap DAO accounts

Run a script with `ts-node` or using `npm run` if scripts are defined in `package.json`:

```bash
npx ts-node scripts/get-proposals.ts
```

If scripts rely on environment variables (RPC URL, keypair), set them in your shell. Common env vars:

- `ANCHOR_PROVIDER_URL` — RPC endpoint (e.g. `http://localhost:8899`)
- `ANCHOR_WALLET` — path to keypair file to use as payer

Example:

```bash
export ANCHOR_PROVIDER_URL=http://localhost:8899
export ANCHOR_WALLET=~/.config/solana/id.json
npx ts-node scripts/get-proposals.ts
```

## IDL and TypeScript types

After `anchor build`, IDL files are written to `target/idl/` (for example `target/idl/hob_dao.json`).

To use the IDL from TypeScript tests or scripts, Anchor's `@project-serum/anchor` library loads the IDL and provides a typesafe client. Some projects also generate static TypeScript types (check `types/` for generated files). If a generation step exists in `package.json` (e.g., `npm run gen:types`), run it after `anchor build`.

## Migrations

Use `anchor deploy` and the `migrations/` scripts for deterministic migrations. Migration scripts are executed in order when running Anchor's deploy command and may rely on `ANCHOR_WALLET` and the local validator state.

## Common troubleshooting

- If `anchor build` fails with Rust errors, ensure your Rust toolchain and dependencies are installed and up-to-date.
- If tests hang, ensure no other validator is using the same ports or that `solana-test-validator` was reset.
- If TypeScript scripts error due to missing packages, run `npm install` inside `anchor_project`.

## Useful commands (summary)

```bash
# build the program + generate IDL
anchor build

# run test suite (launches local validator)
anchor test

# deploy to configured cluster (Anchor.toml)
anchor deploy

# run a script
npx ts-node scripts/get-proposals.ts
```

## Where to go next

- Read `programs/hob-dao/src/lib.rs` to understand the on-chain accounts and instructions.
- Inspect `target/idl/hob_dao.json` after `anchor build` to see the program's IDL.
- Check `tests/` for example client usage and guidance on how to write additional tests.

---

If you want, I can also:

- add npm scripts to `package.json` for common tasks (build, test, deploy, run-scripts),
- or add a short `scripts/README.md` describing each TypeScript script and example usage.

For now, this README is scoped only to the `anchor_project` directory as requested.
