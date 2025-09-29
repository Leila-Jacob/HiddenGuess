export interface Room {
  id: number;
  creator: string;
  minRange: number;
  maxRange: number;
  maxPlayers: number;
  currentPlayers: number;
  deadline: number;
  entryFee: string;
  rewardPool: string;
  isActive: boolean;
  isRevealed: boolean;
  winner: string | null;
  winningGuess: number;
}

export interface Player {
  address: string;
  hasSubmitted: boolean;
  hasClaimed: boolean;
}

export interface CreateRoomData {
  minRange: number;
  maxRange: number;
  maxPlayers: number;
  duration: number; // in hours
  entryFee: string;
  target: number;
}

export interface GameState {
  isConnected: boolean;
  isFhevmReady: boolean;
  currentRoom: Room | null;
  playerGuess: number | null;
  hasSubmitted: boolean;
}

export interface FhevmInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => {
    add32: (value: number) => void;
    encrypt: () => Promise<{
      handles: Uint8Array[];
      inputProof: Uint8Array;
    }>;
  };
  decrypt?: (encryptedBytes: Uint8Array) => Promise<number>;
  userDecrypt: (
    handles: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ) => Promise<Record<string, number>>;
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ) => any;
}



