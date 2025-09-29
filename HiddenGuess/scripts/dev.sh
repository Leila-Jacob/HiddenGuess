#!/bin/bash

# HiddenGuess Development Script
set -e

NETWORK=${1:-localhost}
MODE=${2:-full}

echo "🚀 Starting HiddenGuess development environment..."

# Check if we're running on a FHEVM network
if [ "$NETWORK" = "sepolia" ]; then
    echo "🔐 Starting development on FHEVM Sepolia network"
    echo "⚠️  Make sure you have:"
    echo "   - SEPOLIA_RPC_URL set in .env"
    echo "   - PRIVATE_KEY set in .env"
    echo "   - FHEVM_SEPOLIA_RPC_URL set in .env"
    echo ""
elif [ "$NETWORK" = "localhost" ]; then
    echo "🏠 Starting development on local FHEVM node"
    echo "⚠️  Make sure you have a local FHEVM node running"
    echo ""
fi

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up background processes..."
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start local Hardhat node if needed
if [ "$NETWORK" = "localhost" ] && [ "$MODE" = "full" ]; then
    echo "🏗️  Starting local Hardhat node..."
    cd packages/contracts
    npx hardhat node --verbose &
    HARDHAT_PID=$!
    cd ../..
    
    # Wait for node to start
    echo "⏳ Waiting for Hardhat node to start..."
    sleep 5
    
    echo "📦 Deploying contracts to localhost..."
    cd packages/contracts
    npx hardhat run scripts/deploy.ts --network localhost
    cd ../..
    
    echo "✅ Local Hardhat node started and contracts deployed!"
fi

# Start frontend development server
if [ "$MODE" = "full" ] || [ "$MODE" = "frontend" ]; then
    echo "🎨 Starting frontend development server..."
    cd packages/frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    
    # Start development server
    npm run dev &
    FRONTEND_PID=$!
    cd ../..
    
    echo "✅ Frontend development server started!"
    echo "🌐 Frontend available at: http://localhost:3000"
fi

# Display development information
echo ""
echo "🎮 Development Environment Ready!"
echo ""
echo "📋 Environment Info:"
echo "   Network: $NETWORK"
echo "   Mode: $MODE"
echo "   FHEVM Network: $([ "$NETWORK" = "sepolia" ] && echo "Yes" || echo "No")"
echo ""

if [ "$NETWORK" = "sepolia" ]; then
    echo "🔐 FHEVM Sepolia Development:"
    echo "   - Frontend will use real relayer-sdk for FHEVM operations"
    echo "   - Make sure MetaMask is connected to Sepolia network"
    echo "   - You'll need Sepolia ETH for gas fees"
    echo "   - Contract uses real FHEVM homomorphic encryption"
else
    echo "🏠 Local FHEVM Development:"
    echo "   - Frontend will use mock FHEVM for local development"
    echo "   - Make sure MetaMask is connected to localhost:8545"
    echo "   - You can use any test ETH from Hardhat"
    echo "   - Contract uses real FHEVM homomorphic encryption"
fi

echo ""
echo "🛠️  Available Commands:"
echo "   - Press Ctrl+C to stop all services"
echo "   - Frontend: http://localhost:3000"
if [ "$NETWORK" = "localhost" ]; then
    echo "   - Hardhat Node: http://localhost:8545"
fi
echo ""

# Wait for user to stop
echo "⏳ Development environment running... Press Ctrl+C to stop"
wait
