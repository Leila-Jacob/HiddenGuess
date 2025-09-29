#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -euo pipefail # Exit on error, undefined vars, and pipe errors

HARDHAT_NODE_PORT=8545
HARDHAT_NODE_HOST=127.0.0.1
HARDHAT_NODE_URL="http://${HARDHAT_NODE_HOST}:${HARDHAT_NODE_PORT}"
TIMEOUT_SECONDS=60 # Max time to wait for Hardhat Node to start
CHECK_INTERVAL_SECONDS=1 # How often to poll the node

cd "${SCRIPT_DIR}/.."

echo "--- Starting FHEVM Hardhat Node in background ---"
# Start Hardhat Node in the background, redirecting output to a log file
npx hardhat node &> hardhat-node.log &
HARDHAT_PID_ROOT=$! # Get the PID of the background process

echo "FHEVM Hardhat Node started with PID: $HARDHAT_PID_ROOT. Waiting for it to be ready..."

# --- Wait for Hardhat Node to be ready ---
ATTEMPTS=0
while [ $ATTEMPTS -lt $TIMEOUT_SECONDS ]; do
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' "$HARDHAT_NODE_URL" > /dev/null 2>&1; then
        echo "FHEVM Hardhat Node is ready!"
        break
    fi
    echo "Waiting for FHEVM Hardhat Node... (Attempt $((ATTEMPTS+1))/$TIMEOUT_SECONDS)"
    sleep "$CHECK_INTERVAL_SECONDS"
    ATTEMPTS=$((ATTEMPTS+1))
done

HARDHAT_PID=$(lsof -i :${HARDHAT_NODE_PORT} -t)

if [ $ATTEMPTS -eq $TIMEOUT_SECONDS ]; then
    echo "Error: FHEVM Hardhat Node did not start within $TIMEOUT_SECONDS seconds."
    kill "$HARDHAT_PID_ROOT" # Kill the process if it didn't start
    kill "$HARDHAT_PID" || true
    exit 1
fi

echo "--- FHEVM Hardhat Node is running ---"
echo "Node URL: $HARDHAT_NODE_URL"
echo "Chain ID: 31337"
echo "PID: $HARDHAT_PID_ROOT"
echo ""
echo "To stop the node, run: kill $HARDHAT_PID_ROOT"
echo "Or use Ctrl+C to stop this script"
echo ""

# Keep the script running
wait "$HARDHAT_PID_ROOT"
