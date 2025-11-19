# DAO Initialization Scripts

This directory contains scripts to initialize the HoB DAO program with token gating functionality.

## Available Scripts

### 1. Shell Script (Recommended)
```bash
./scripts/initialize-dao.sh
```
- Comprehensive setup and validation
- Interactive confirmation
- Handles dependencies and environment checks

### 2. NPM Scripts
```bash
# JavaScript version
yarn init-dao

# TypeScript version (uses existing token)
yarn init-dao:ts

# TypeScript version (creates new token)
yarn init-dao:token

# Shell script via npm
yarn init-dao:shell

# Get all proposals
yarn get-proposals

# Get detailed proposal information with filters
yarn get-proposal-details
```

### 3. Direct Execution
```bash
# JavaScript
node scripts/initialize-dao.js

# TypeScript (existing token)
npx ts-node scripts/initialize-dao.ts

# TypeScript (new token)
npx ts-node scripts/initialize-dao-with-token.ts

# Get all proposals
npx ts-node scripts/get-proposals.ts

# Get detailed proposal information
npx ts-node scripts/get-proposal-details.ts
```

## Prerequisites

1. **Solana CLI installed**: `sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"`
2. **Wallet configured**: `solana-keygen new` or set `~/.config/solana/id.json`
3. **Dependencies installed**: `yarn install`
4. **Program built**: `anchor build`

## What the Script Does

### Basic Initialization (`initialize-dao.ts`)
1. Derives the DAO state PDA using the "dao" seed
2. Uses a pre-existing token mint (USDC on devnet)
3. Checks if DAO is already initialized
4. Calls the `initialize_dao` instruction with token mint
5. Displays the transaction signature and DAO state

### Token Creation Initialization (`initialize-dao-with-token.ts`)
1. Creates a new token mint keypair
2. Derives the DAO state PDA using the "dao" seed
3. Checks if DAO is already initialized
4. Calls the `initialize_dao` instruction with the new token mint
5. Displays the transaction signature, DAO state, and mint keypair
6. **Important**: Saves the mint private key for future use

## Token Gating Features

The DAO now includes full token gating:
- **Creating Proposals**: Users must hold at least 1 token of the correct mint
- **Voting on Proposals**: Users must hold at least 1 token of the correct mint
- **Token Validation**: Both functions verify the provided token matches the DAO's stored token mint

## Quorum System

The DAO implements a percentage-based quorum system:
- **60% Quorum**: Proposals require 60% of eligible voters to pass
- **Auto-Resolution**: Proposals automatically resolve to "Passed" or "Rejected" based on votes
- **Proposal States**: 
  - `Pending`: Proposal is open for voting
  - `Passed`: Proposal reached quorum and passed
  - `Rejected`: Proposal failed to reach quorum or was rejected
- **No Execution**: Proposals store text and state only - no automatic execution

## Proposal Management Scripts

### Get All Proposals (`get-proposals.ts`)
```bash
npm run get-proposals
```
- Lists all proposals with basic information
- Shows vote counts and percentages
- Displays proposal states and creators
- Provides summary statistics

### Get Detailed Proposal Information (`get-proposal-details.ts`)
```bash
# Get all proposals with detailed info
npm run get-proposal-details

# Filter by state
npm run get-proposal-details -- --state Pending
npm run get-proposal-details -- --state Passed
npm run get-proposal-details -- --state Rejected

# Filter by creator
npm run get-proposal-details -- --creator <PUBLIC_KEY>

# Filter by vote count
npm run get-proposal-details -- --min-votes 5
npm run get-proposal-details -- --max-votes 10

# Combine filters
npm run get-proposal-details -- --state Pending --min-votes 2
```

**Features:**
- **Progress Bars**: Visual representation of voting progress
- **Quorum Analysis**: Shows how many votes needed to pass
- **Advanced Filtering**: Filter by state, creator, vote count
- **Detailed Statistics**: Comprehensive proposal analysis
- **Status Indicators**: Clear visual status for each proposal

## Environment

The scripts use the Anchor provider environment, which reads:
- `ANCHOR_PROVIDER_URL` - Solana RPC URL
- `ANCHOR_WALLET` - Path to wallet keypair file

Default: Local cluster with `~/.config/solana/id.json`
