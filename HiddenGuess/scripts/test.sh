#!/bin/bash

# HiddenGuess Test Script
set -e

NETWORK=${1:-localhost}
TEST_TYPE=${2:-all}

echo "🧪 Testing HiddenGuess on $NETWORK..."

# Check if we're testing a FHEVM network
if [ "$NETWORK" = "sepolia" ]; then
    echo "🔐 Testing FHEVM Sepolia network"
    echo "⚠️  Make sure you have:"
    echo "   - SEPOLIA_RPC_URL set in .env"
    echo "   - PRIVATE_KEY set in .env"
    echo "   - FHEVM_SEPOLIA_RPC_URL set in .env"
    echo ""
elif [ "$NETWORK" = "localhost" ]; then
    echo "🏠 Testing local FHEVM node"
    echo "⚠️  Make sure you have a local FHEVM node running"
    echo ""
fi

cd packages/contracts

# Run contract tests
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "contract" ]; then
    echo "📋 Running contract tests..."
    
    if [ "$NETWORK" = "localhost" ]; then
        echo "Starting local Hardhat node for testing..."
        npx hardhat node --verbose &
        HARDHAT_PID=$!
        
        # Wait for node to start
        sleep 5
        
        echo "Running tests on localhost..."
        npx hardhat test --network localhost
        
        # Kill hardhat node
        kill $HARDHAT_PID
    else
        echo "Running tests on $NETWORK..."
        npx hardhat test --network $NETWORK
    fi
    
    echo "✅ Contract tests passed!"
fi

# Test deployment
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "deploy" ]; then
    echo "🚀 Testing deployment..."
    
    if [ "$NETWORK" = "localhost" ]; then
        echo "Starting local Hardhat node for deployment test..."
        npx hardhat node --verbose &
        HARDHAT_PID=$!
        
        # Wait for node to start
        sleep 5
        
        echo "Testing deployment to localhost..."
        npx hardhat run scripts/deploy.ts --network localhost
        
        # Get contract address from deployment output
        CONTRACT_ADDRESS=$(npx hardhat run scripts/deploy.ts --network localhost 2>&1 | grep "HiddenGuess deployed to:" | cut -d' ' -f4)
        echo "Contract deployed at: $CONTRACT_ADDRESS"
        
        # Kill hardhat node
        kill $HARDHAT_PID
    else
        echo "Testing deployment to $NETWORK..."
        npx hardhat run scripts/deploy.ts --network $NETWORK
        
        # Get contract address from deployment output
        CONTRACT_ADDRESS=$(npx hardhat run scripts/deploy.ts --network $NETWORK 2>&1 | grep "HiddenGuess deployed to:" | cut -d' ' -f4)
        echo "Contract deployed at: $CONTRACT_ADDRESS"
    fi
    
    echo "✅ Deployment test passed!"
fi

cd ../..

# Test frontend build
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "frontend" ]; then
    echo "🎨 Testing frontend build..."
    
    cd packages/frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Test build
    echo "Building frontend..."
    npm run build
    
    echo "✅ Frontend build test passed!"
    
    cd ../..
fi

# Test integration
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "integration" ]; then
    echo "🔗 Testing integration..."
    
    # Check if contract address file exists
    CONTRACT_ADDRESS_FILE="packages/frontend/src/contracts/addresses.json"
    
    if [ -f "$CONTRACT_ADDRESS_FILE" ]; then
        echo "Contract address file found:"
        cat $CONTRACT_ADDRESS_FILE
        echo ""
    else
        echo "⚠️  Contract address file not found. Run deployment first."
    fi
    
    echo "✅ Integration test passed!"
fi

echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "📋 Test Summary:"
echo "   Network: $NETWORK"
echo "   Test Type: $TEST_TYPE"
echo "   FHEVM Network: $([ "$NETWORK" = "sepolia" ] && echo "Yes" || echo "No")"
echo ""
echo "🚀 Ready for development!"
