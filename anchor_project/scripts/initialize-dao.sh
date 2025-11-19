#!/bin/bash

# Script to initialize the HoB DAO
# This script sets up the environment and runs the TypeScript initialization script

set -e  # Exit on any error

echo "🔧 Setting up environment for DAO initialization..."

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: Anchor.toml"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Check if the program is built
if [ ! -f "target/idl/hob_dao.json" ]; then
    echo "🔨 Building the program..."
    anchor build
fi

# Check if Solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if we have a wallet configured
if ! solana address &> /dev/null; then
    echo "❌ Error: No Solana wallet configured."
    echo "   Please run: solana-keygen new"
    echo "   Or set your wallet path in ~/.config/solana/id.json"
    exit 1
fi

# Display current configuration
echo "📋 Current configuration:"
echo "   Wallet address: $(solana address)"
echo "   Cluster: $(solana config get | grep 'RPC URL' | awk '{print $3}')"
echo "   Program ID: $(grep 'hob_dao =' Anchor.toml | head -1 | cut -d'"' -f2)"

# Ask for confirmation
read -p "🤔 Do you want to proceed with DAO initialization? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 0
fi

# Run the TypeScript initialization script
echo "🚀 Running DAO initialization..."
npx ts-node scripts/initialize-dao.ts

echo "✅ Script completed!"
