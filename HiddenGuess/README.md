# HiddenGuess

A FHEVM-based on-chain guessing game where players submit encrypted guesses and the closest to the target wins.

## 🎯 Features

- **🔐 FHEVM Integration**: Uses real homomorphic encryption for privacy
- **📜 Smart Contracts**: Solidity contracts with FHE operations
- **🎨 Frontend**: React/Next.js with Web3 integration
- **🧪 Mock Mode**: Local development with mock FHEVM
- **🚀 Production Mode**: Real FHEVM with relayer-sdk

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- For production: Sepolia ETH

### 1. Install Dependencies
```bash
npm install
```

### 2. Local Development (Mock Mode)
```bash
# Start local development environment
./scripts/dev.sh localhost

# Or manually:
cd packages/contracts
npx hardhat node
# In another terminal:
npx hardhat deploy --network localhost
cd ../frontend
npm run dev
```

### 3. Production (Real FHEVM)
```bash
# Deploy to Sepolia FHEVM
./scripts/deploy.sh sepolia

# Start frontend
cd packages/frontend
npm run dev
```

## 🏗️ Architecture

### Contract Layer
- **HiddenGuess.sol**: Main game contract with FHEVM operations
- **FHE Operations**: `FHE.fromExternal()`, `FHE.add()`, `FHE.sub()`, `FHE.lt()`
- **Privacy**: All guesses and targets are encrypted on-chain

### Frontend Layer
- **Mock Mode**: Uses mock FHEVM for local development
- **Production Mode**: Uses real relayer-sdk for FHEVM operations
- **Smart Switching**: Automatically detects network and switches modes

### FHEVM Integration
- **Local**: Mock FHEVM for development
- **Sepolia**: Real FHEVM with Zama's relayer service
- **Encryption**: Frontend encrypts inputs before sending to contract
- **Decryption**: Contract can decrypt and compare encrypted values

## 🧪 Development Modes

### Local Development (Mock Mode)
```bash
./scripts/dev.sh localhost
```
- ✅ Frontend uses mock FHEVM for quick development
- ✅ Contract uses real FHEVM homomorphic encryption
- ✅ Perfect for UI/UX development and testing
- ✅ No need for real FHEVM node

### Production (Real FHEVM)
```bash
./scripts/deploy.sh sepolia
```
- ✅ Frontend uses real relayer-sdk
- ✅ Contract uses real FHEVM homomorphic encryption
- ✅ Deploy to Sepolia FHEVM network
- ✅ Real privacy-preserving operations

## 📋 Scripts

### Development
```bash
# Start full development environment
./scripts/dev.sh localhost

# Start only frontend
./scripts/dev.sh localhost frontend
```

### Deployment
```bash
# Deploy to localhost
./scripts/deploy.sh localhost

# Deploy to Sepolia
./scripts/deploy.sh sepolia
```

### Testing
```bash
# Test everything
./scripts/test.sh localhost

# Test specific components
./scripts/test.sh localhost contract
./scripts/test.sh localhost frontend
./scripts/test.sh localhost integration
```

## 🔧 Configuration

### Environment Variables
Create `.env` in `packages/contracts/`:
```bash
# For Sepolia deployment
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
FHEVM_SEPOLIA_RPC_URL=https://sepolia.fhevm.zama.ai
```

### MetaMask Configuration
- **Local**: Add localhost:8545 network
- **Sepolia**: Use standard Sepolia network

## 🎮 How to Play

1. **Create Room**: Set range, max players, duration, and target number
2. **Join Room**: Pay entry fee and join the game
3. **Submit Guess**: Submit your encrypted guess within the range
4. **Wait for Reveal**: Game automatically reveals after deadline
5. **Claim Reward**: Winner automatically gets the reward pool

## 🔐 Privacy Features

- **Encrypted Storage**: All guesses and targets are encrypted on-chain
- **Homomorphic Operations**: Contract can compare encrypted values
- **Zero-Knowledge**: No one can see your guess until reveal
- **Fair Play**: All operations are verifiable on-chain

## 🛠️ Technical Details

### FHEVM Operations
```solidity
// Convert external encrypted input to internal euint32
euint32 target = FHE.fromExternal(encryptedTarget, targetProof);

// Allow contract to decrypt later
FHE.allowThis(target);

// Homomorphic arithmetic
euint32 difference = FHE.sub(guess, target);
ebool isLess = FHE.lt(distance1, distance2);
```

### Frontend Integration
```typescript
// Mock mode (local development)
const mockInstance = createMockFhevmInstance();

// Production mode (real FHEVM)
const sdk = await loadSDK();
const instance = await sdk.createInstance(config);

// Encrypt input
const encryptedInput = instance.createEncryptedInput(contractAddress, userAddress);
encryptedInput.add32(value);
const { handles, inputProof } = await encryptedInput.encrypt();
```

## 📚 Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Relayer SDK](https://github.com/zama-ai/relayer-sdk)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details