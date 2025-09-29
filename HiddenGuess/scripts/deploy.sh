#!/bin/bash

# HiddenGuess Deployment Script
set -e

NETWORK=${1:-localhost}
CONTRACT_ADDRESS_FILE="packages/frontend/src/contracts/addresses.json"

echo "🚀 Deploying HiddenGuess to $NETWORK..."

# Check if we're deploying to a FHEVM network
if [ "$NETWORK" = "sepolia" ]; then
    echo "🔐 Deploying to FHEVM Sepolia network"
    echo "⚠️  Make sure you have:"
    echo "   - SEPOLIA_RPC_URL set in .env"
    echo "   - PRIVATE_KEY set in .env"
    echo "   - FHEVM_SEPOLIA_RPC_URL set in .env"
    echo ""
elif [ "$NETWORK" = "localhost" ]; then
    echo "🏠 Deploying to local FHEVM node"
    echo "⚠️  Make sure you have a local FHEVM node running"
    echo ""
fi

# Deploy contracts
echo "📦 Deploying contracts..."
cd packages/contracts

if [ "$NETWORK" = "localhost" ]; then
    echo "Starting local Hardhat node..."
    npx hardhat node --verbose &
    HARDHAT_PID=$!
    
    # Wait for node to start
    sleep 5
    
    echo "Deploying to localhost..."
    npx hardhat run scripts/deploy.ts --network localhost
    
    # Get contract address from deployment output
    CONTRACT_ADDRESS=$(npx hardhat run scripts/deploy.ts --network localhost 2>&1 | grep "HiddenGuess deployed to:" | cut -d' ' -f4)
    echo "Contract deployed at: $CONTRACT_ADDRESS"
    
    # Kill hardhat node
    kill $HARDHAT_PID
else
    echo "Deploying to $NETWORK..."
    npx hardhat run scripts/deploy.ts --network $NETWORK
    
    # Get contract address from deployment output
    CONTRACT_ADDRESS=$(npx hardhat run scripts/deploy.ts --network $NETWORK 2>&1 | grep "HiddenGuess deployed to:" | cut -d' ' -f4)
    echo "Contract deployed at: $CONTRACT_ADDRESS"
fi

cd ../..

# Update frontend contract addresses
echo "📝 Updating frontend contract addresses..."
mkdir -p packages/frontend/src/contracts

cat > $CONTRACT_ADDRESS_FILE << EOF
{
  "HiddenGuess": {
    "$NETWORK": "$CONTRACT_ADDRESS"
  },
  "network": "$NETWORK",
  "isFhevmNetwork": $([ "$NETWORK" = "sepolia" ] && echo "true" || echo "false"),
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Deployment complete!"
echo "Contract address: $CONTRACT_ADDRESS"
echo "Network: $NETWORK"
echo "FHEVM Network: $([ "$NETWORK" = "sepolia" ] && echo "Yes" || echo "No")"
echo ""
echo "🎮 You can now start the frontend:"
echo "cd packages/frontend && npm run dev"
echo ""
echo "📋 Next steps:"
if [ "$NETWORK" = "sepolia" ]; then
    echo "   - Frontend will use real relayer-sdk for FHEVM operations"
    echo "   - Make sure MetaMask is connected to Sepolia network"
    echo "   - You'll need Sepolia ETH for gas fees"
else
    echo "   - Frontend will use mock FHEVM for local development"
    echo "   - Make sure MetaMask is connected to localhost:8545"
    echo "   - You can use any test ETH from Hardhat"
fi
