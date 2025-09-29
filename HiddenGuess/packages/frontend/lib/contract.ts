import { ethers } from 'ethers';
import { Room } from '@/types';

// 合约ABI - 从编译后的artifacts中提取
export const HIDDEN_GUESS_ABI = [
  "function createRoom(uint32 minRange, uint32 maxRange, uint32 maxPlayers, uint256 duration, uint256 entryFee, bytes32 targetEuint32, bytes calldata targetProof) external payable",
  "function joinRoom(uint256 roomId) external payable",
  "function submitGuess(uint256 roomId, bytes32 guessEuint32, bytes calldata guessProof) external",
  "function revealRoom(uint256 roomId) external",
  "function claimReward(uint256 roomId) external",
  "function getRoom(uint256 roomId) external view returns (uint256, address, uint32, uint32, uint32, uint32, uint256, uint256, uint256, bool, bool, address)",
  "function getRoomPlayers(uint256 roomId) external view returns (address[])",
  "function getPlayer(uint256 roomId, address player) external view returns (address, bool, bool)",
  "function getPlayerGuess(uint256 roomId, address player) external view returns (bytes32)",
  "function allowPlayerGuessDecryption(uint256 roomId, address player) external returns (bytes32)",
  "function getTarget(uint256 roomId) external view returns (bytes)",
  "function getWinningGuess(uint256 roomId) external view returns (bytes)",
  "function nextRoomId() external view returns (uint256)",
  "function mockMode() external view returns (bool)",
  "function mockTargets(uint256) external view returns (uint32)",
  "function mockGuesses(uint256, address) external view returns (uint32)",
  "event RoomCreated(uint256 indexed roomId, address indexed creator, uint32 minRange, uint32 maxRange, uint32 maxPlayers, uint256 deadline, uint256 entryFee)",
  "event PlayerJoined(uint256 indexed roomId, address indexed player)",
  "event GuessSubmitted(uint256 indexed roomId, address indexed player)",
  "event RoomRevealed(uint256 indexed roomId, address indexed winner, uint32 winningGuess, uint32 target)",
  "event RewardClaimed(uint256 indexed roomId, address indexed winner, uint256 amount)",
  "event DebugInfo(string message, uint32 minRange, uint32 maxRange, uint32 maxPlayers, uint256 duration, uint256 entryFee, uint256 msgValue)"
];

// 合约地址 - 使用最新部署的地址
export const HIDDEN_GUESS_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

// 合约返回数据的类型定义
export interface ContractRoomData {
  roomId: bigint;
  creator: string;
  minRange: number;
  maxRange: number;
  maxPlayers: number;
  currentPlayers: number;
  deadline: bigint;
  entryFee: bigint;
  rewardPool: bigint;
  isActive: boolean;
  isRevealed: boolean;
  winner: string;
}

// 合约返回数据的索引映射
export const ROOM_DATA_INDEXES = {
  ROOM_ID: 0,
  CREATOR: 1,
  MIN_RANGE: 2,
  MAX_RANGE: 3,
  MAX_PLAYERS: 4,
  CURRENT_PLAYERS: 5,
  DEADLINE: 6,
  ENTRY_FEE: 7,
  REWARD_POOL: 8,
  IS_ACTIVE: 9,
  IS_REVEALED: 10,
  WINNER: 11,
} as const;

// 创建合约实例
export const createContract = (provider: ethers.Provider, signer?: ethers.Signer) => {
  const contractProvider = signer || provider;
  return new ethers.Contract(HIDDEN_GUESS_ADDRESS, HIDDEN_GUESS_ABI, contractProvider);
};

// 合约事件过滤器
export const createEventFilters = (contract: ethers.Contract) => ({
  roomCreated: contract.filters.RoomCreated(),
  playerJoined: contract.filters.PlayerJoined(),
  guessSubmitted: contract.filters.GuessSubmitted(),
  roomRevealed: contract.filters.RoomRevealed(),
  rewardClaimed: contract.filters.RewardClaimed(),
});

// 工具函数：将合约返回的原始数据转换为规范格式
export const parseContractRoomData = (rawData: any[]): ContractRoomData | null => {
  try {
    if (!rawData || rawData.length < 12) {
      return null;
    }

    const creator = rawData[ROOM_DATA_INDEXES.CREATOR];
    
    // 检查房间是否有效（creator不为零地址）
    if (!creator || creator === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      roomId: rawData[ROOM_DATA_INDEXES.ROOM_ID] || 0n,
      creator: creator,
      minRange: Number(rawData[ROOM_DATA_INDEXES.MIN_RANGE]) || 0,
      maxRange: Number(rawData[ROOM_DATA_INDEXES.MAX_RANGE]) || 0,
      maxPlayers: Number(rawData[ROOM_DATA_INDEXES.MAX_PLAYERS]) || 0,
      currentPlayers: Number(rawData[ROOM_DATA_INDEXES.CURRENT_PLAYERS]) || 0,
      deadline: rawData[ROOM_DATA_INDEXES.DEADLINE] || 0n,
      entryFee: rawData[ROOM_DATA_INDEXES.ENTRY_FEE] || 0n,
      rewardPool: rawData[ROOM_DATA_INDEXES.REWARD_POOL] || 0n,
      isActive: Boolean(rawData[ROOM_DATA_INDEXES.IS_ACTIVE]),
      isRevealed: Boolean(rawData[ROOM_DATA_INDEXES.IS_REVEALED]),
      winner: rawData[ROOM_DATA_INDEXES.WINNER] || '0x0000000000000000000000000000000000000000',
    };
  } catch (error) {
    console.error('Error parsing contract room data:', error);
    return null;
  }
};

// 工具函数：将合约数据转换为前端Room类型
export const convertToRoom = (contractData: ContractRoomData): Room => {
  return {
    id: Number(contractData.roomId),
    creator: contractData.creator,
    minRange: contractData.minRange,
    maxRange: contractData.maxRange,
    maxPlayers: contractData.maxPlayers,
    currentPlayers: contractData.currentPlayers,
    deadline: Number(contractData.deadline) * 1000, // 转换为毫秒
    entryFee: ethers.formatEther(contractData.entryFee),
    rewardPool: ethers.formatEther(contractData.rewardPool),
    isActive: contractData.isActive,
    isRevealed: contractData.isRevealed,
    winner: contractData.winner === '0x0000000000000000000000000000000000000000' ? null : contractData.winner,
    winningGuess: 0, // FHEVM中winningGuess是加密的，无法直接获取
  };
};
