Testing the Anchor program and TypeScript tests

This repository contains an Anchor program (`programs/which-dao`) and TypeScript tests under `tests/which-dao.ts` that exercise every instruction (happy + unhappy flows).

Prerequisites
- Rust + cargo
- Anchor CLI (matching version in Anchor.toml)
- Solana CLI (for local validator and key management)
- Node.js and yarn

Quick steps (local validator)

1. Install JS deps

```bash
yarn install
```

2. Build the Anchor program (generates IDL at `target/idl`)

```bash
anchor build
```

3. Create or point a wallet (example creates a temporary keypair)

```bash
solana-keygen new -o /tmp/anchor_test_keypair.json --no-passphrase
```

4. Run tests against a local validator (recommended)

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=/tmp/anchor_test_keypair.json \
anchor test --provider.cluster localnet
```

Notes
- `Anchor.toml` contains `provider.cluster = "devnet"` and a `wallet` path; adjust `ANCHOR_WALLET` or edit `Anchor.toml` if you need a different wallet for local testing.
- If running tests against Devnet, ensure the program is deployed on Devnet and `Anchor.toml` `programs.devnet` contains the deployed program ID, then set `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` appropriately.

CI
- If you'd like, I can add a GitHub Actions workflow that installs Anchor and runs `anchor build` + `anchor test` in CI; this typically requires setting up a self-hosted runner or a container with the Solana toolchain.
