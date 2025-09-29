#!/bin/bash

# HiddenGuess Setup Script
set -e

echo "🎮 Setting up HiddenGuess project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install contract dependencies
echo "📦 Installing contract dependencies..."
cd packages/contracts
npm install
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd packages/frontend
npm install
cd ../..

echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Copy packages/contracts/env.example to packages/contracts/.env"
echo "2. Configure your environment variables in .env"
echo "3. Start local development:"
echo "   - Contracts: npm run dev:contracts"
echo "   - Frontend: npm run dev:frontend"
echo ""
echo "📚 For more information, see README.md"



