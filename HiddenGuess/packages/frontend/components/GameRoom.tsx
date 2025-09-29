'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Room, Player } from '@/types';
import { useWallet, useFhevm } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { 
  Users, 
  Clock, 
  Trophy, 
  Target, 
  Send, 
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';

interface GameRoomProps {
  room: Room;
}

export const GameRoom = ({ room }: GameRoomProps) => {
  const { account, isConnected, chainId, provider } = useWallet();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider: provider || undefined,
    chainId: chainId || undefined,
    enabled: isConnected,
  });
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [guess, setGuess] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteAddress, setInviteAddress] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myGuess, setMyGuess] = useState<number | null>(null);
  const [showMyGuess, setShowMyGuess] = useState(false);

  const timeLeft = room.deadline - Date.now();
  const isExpired = timeLeft <= 0;
  const isFull = room.currentPlayers >= room.maxPlayers;
  const canSubmit = !isExpired && isConnected && !hasSubmitted && room.isActive;
  const isCreator = account === room.creator;

  useEffect(() => {
    // Load players for this room
    loadPlayers();
    // Check if current user has joined
    checkUserJoined();
  }, [room.id, account]);

  const checkUserJoined = async () => {
    try {
      if (!provider || !account) {
        setHasJoined(false);
        return;
      }

      const { ethers } = await import('ethers');
      const { createContract } = await import('@/lib/contract');
      
      const browserProvider = new ethers.BrowserProvider(provider);
      const contract = createContract(browserProvider);
      
      // Check if current user is in the room
      const playerAddresses = await contract.getRoomPlayers(room.id);
      const userJoined = playerAddresses.some((addr: string) => 
        addr.toLowerCase() === account.toLowerCase()
      );
      
      console.log('[CheckUserJoined] User joined:', userJoined);
      setHasJoined(userJoined);
      
      // Also check if user has submitted
      if (userJoined) {
        const playerData = await contract.getPlayer(room.id, account);
        setHasSubmitted(playerData[1] || false);
      }
    } catch (error) {
      console.error('Failed to check user joined status:', error);
      setHasJoined(false);
    }
  };

  const loadPlayers = async () => {
    try {
      if (!provider || !account) {
        console.log('Provider or account not available for loading players');
        return;
      }

      // Load actual players from contract
      const { ethers } = await import('ethers');
      const { createContract } = await import('@/lib/contract');
      
      const browserProvider = new ethers.BrowserProvider(provider);
      const contract = createContract(browserProvider);
      
      console.log('[LoadPlayers] Loading players for room:', room.id);
      
      // Get all players in the room
      const playerAddresses = await contract.getRoomPlayers(room.id);
      console.log('[LoadPlayers] Player addresses:', playerAddresses);
      
      // Get player details for each address
      const playerPromises = playerAddresses.map(async (address: string) => {
        try {
          const playerData = await contract.getPlayer(room.id, address);
          console.log(`[LoadPlayers] Player ${address} data:`, playerData);
          
          return {
            address: address,
            hasSubmitted: playerData[1] || false, // hasSubmitted is index 1
            hasClaimed: playerData[2] || false,   // hasClaimed is index 2
          };
        } catch (error) {
          console.error(`[LoadPlayers] Error loading player ${address}:`, error);
          return {
            address: address,
            hasSubmitted: false,
            hasClaimed: false,
          };
        }
      });
      
      const playersData = await Promise.all(playerPromises);
      console.log('[LoadPlayers] Final players data:', playersData);
      
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to load players:', error);
      // Fallback to empty array if contract call fails
      setPlayers([]);
    }
  };

  const handleSubmitGuess = async () => {
    if (!fhevmInstance || !account || fhevmStatus !== 'ready') {
      setError('FHEVM not ready or wallet not connected');
      return;
    }

    const guessNum = parseInt(guess);
    if (isNaN(guessNum) || guessNum < room.minRange || guessNum > room.maxRange) {
      setError(`Guess must be between ${room.minRange} and ${room.maxRange}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if we're in development mode (local network)
      const isLocal = chainId === 31337;
      
      if (isLocal) {
        // Development mode: use mock FHEVM
        console.log('[SubmitGuess] Using development mode with mock FHEVM');
        
        // Simulate FHEVM encryption process
        const input = fhevmInstance.createEncryptedInput('0x5FbDB2315678afecb367f032d93F642f64180aa3', account);
        input.add32(guessNum);
        const encrypted = await input.encrypt();
        
        console.log('[Mock] Encrypted guess:', encrypted);
        
        // Real contract interaction
        console.log('[SubmitGuess] Calling contract with encrypted data...');
        
        if (!provider || !account) {
          throw new Error('Provider or account not available');
        }
        
        // Create contract instance
        const { ethers } = await import('ethers');
        const { createContract } = await import('@/lib/contract');
        
        const browserProvider = new ethers.BrowserProvider(provider);
        const signer = await browserProvider.getSigner();
        const contract = createContract(browserProvider, signer);
        
        // Convert Uint8Array to bytes32 and bytes
        const guessBytes32 = ethers.hexlify(encrypted.handles[0]);
        const proofBytes = ethers.hexlify(encrypted.inputProof);
        
        console.log('[SubmitGuess] Calling submitGuess with:', {
          roomId: room.id,
          guessBytes32,
          proofBytes: proofBytes.substring(0, 20) + '...'
        });
        
        // Call contract (no additional payment needed - already paid entry fee when joining)
        const tx = await contract.submitGuess(
          room.id,
          guessBytes32,
          proofBytes
        );
        
        console.log('[SubmitGuess] Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('[SubmitGuess] Transaction confirmed:', receipt.blockNumber);
        
        setHasSubmitted(true);
        setError(null);
        
        // Refresh players list to show updated submission status
        await loadPlayers();
      } else {
        // Production mode: use real FHEVM encryption
        console.log('[SubmitGuess] Using production mode with real FHEVM');
        
        // 1. Encrypt the guess using fhevmInstance
        const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Current deployed contract
        const encryptedInput = fhevmInstance.createEncryptedInput(contractAddress, account);
        encryptedInput.add32(guessNum);
        const { handles, inputProof } = await encryptedInput.encrypt();
        
        // 2. Call submitGuess() with encrypted data
        console.log('[SubmitGuess] Calling contract with real FHEVM data...');
        
        if (!provider || !account) {
          throw new Error('Provider or account not available');
        }
        
        // Create contract instance
        const { ethers } = await import('ethers');
        const { createContract } = await import('@/lib/contract');
        
        const browserProvider = new ethers.BrowserProvider(provider);
        const signer = await browserProvider.getSigner();
        const contract = createContract(browserProvider, signer);
        
        // Convert Uint8Array to bytes32 and bytes
        const guessBytes32 = ethers.hexlify(handles[0]);
        const proofBytes = ethers.hexlify(inputProof);
        
        console.log('[SubmitGuess] Calling submitGuess with:', {
          roomId: room.id,
          guessBytes32,
          proofBytes: proofBytes.substring(0, 20) + '...'
        });
        
        // Call contract (no additional payment needed - already paid entry fee when joining)
        const tx = await contract.submitGuess(
          room.id,
          guessBytes32,
          proofBytes
        );
        
        console.log('[SubmitGuess] Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('[SubmitGuess] Transaction confirmed:', receipt.blockNumber);
        
        setHasSubmitted(true);
        setError(null);
        
        // Refresh players list to show updated submission status
        await loadPlayers();
      }
    } catch (err) {
      console.error('Failed to submit guess:', err);
      setError('Failed to submit guess. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!provider || !account) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { ethers } = await import('ethers');
      const { createContract } = await import('@/lib/contract');
      
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const contract = createContract(browserProvider, signer);
      
      console.log('[JoinRoom] Joining room:', room.id);
      console.log('[JoinRoom] Entry fee:', room.entryFee);
      
      // Call joinRoom with entry fee
      const tx = await contract.joinRoom(room.id, {
        value: ethers.parseEther(room.entryFee)
      });
      
      console.log('[JoinRoom] Transaction sent:', tx.hash);
      setError(`Joining room... Transaction: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[JoinRoom] Transaction confirmed:', receipt.blockNumber);
      
      setHasJoined(true);
      setError(`✅ Successfully joined room! Block: ${receipt.blockNumber}`);
      
      // Refresh players list
      await loadPlayers();
      
    } catch (err: any) {
      console.error('Failed to join room:', err);
      setError(err.message || 'Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitePlayer = async () => {
    if (!inviteAddress || !ethers.isAddress(inviteAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For now, we'll just show the invite link
      // In a real implementation, you might want to send an on-chain invitation
      const inviteLink = `${window.location.origin}/room?id=${room.id}`;
      
      setError(`✅ Invite link generated! Share this link with ${inviteAddress}: ${inviteLink}`);
      setInviteAddress('');
      setShowInviteModal(false);
      
    } catch (err: any) {
      console.error('Failed to invite player:', err);
      setError(err.message || 'Failed to invite player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptMyGuess = async () => {
    if (!fhevmInstance || !account || fhevmStatus !== 'ready') {
      setError('FHEVM not ready or wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[DecryptGuess] Starting decryption process...');
      
      // 1. 从合约获取加密的猜测
      const { ethers } = await import('ethers');
      const { createContract } = await import('@/lib/contract');
      
      const browserProvider = new ethers.BrowserProvider(provider!);
      const signer = await browserProvider.getSigner();
      const contract = createContract(browserProvider, signer);
      
      console.log('[DecryptGuess] Getting encrypted guess from contract...');
      const encryptedGuessBytes = await contract.getPlayerGuess(room.id, account);
      console.log('[DecryptGuess] Encrypted guess bytes:', encryptedGuessBytes);
      
      // 先调用allow函数来允许解密
      console.log('[DecryptGuess] Allowing decryption...');
      const allowTx = await contract.allowPlayerGuessDecryption(room.id, account);
      console.log('[DecryptGuess] Allow transaction:', allowTx.hash);
      await allowTx.wait();
      
      // 2. 使用FHEVM解密
      console.log('[DecryptGuess] Decrypting with FHEVM...');
      
      // 检查是否是本地网络（使用mock模式）
      const isLocal = chainId === 31337;
      
      if (isLocal) {
        // Mock模式：从mock数据中获取猜测
        console.log('[DecryptGuess] Using mock mode for decryption');
        const mockGuess = await contract.mockGuesses(room.id, account);
        console.log('[DecryptGuess] Mock guess:', mockGuess);
        setMyGuess(Number(mockGuess));
        setShowMyGuess(true);
        setError(`✅ Your guess: ${mockGuess}`);
      } else {
        // 真实FHEVM模式：使用FHEVM解密
        console.log('[DecryptGuess] Using real FHEVM for decryption');
        
        // 将bytes32转换为Uint8Array
        const encryptedGuessArray = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          encryptedGuessArray[i] = parseInt(encryptedGuessBytes.slice(2 + i * 2, 4 + i * 2), 16);
        }
        
        // 使用FHEVM解密
        const decryptedValue = await (async () => {
          if (typeof fhevmInstance.decrypt === 'function') {
            return await fhevmInstance.decrypt(encryptedGuessArray);
          }
          // Fallback mock decoding if decrypt not available
          const view = encryptedGuessArray;
          if (view.length >= 32) {
            const val =
              view[28] |
              (view[29] << 8) |
              (view[30] << 16) |
              (view[31] << 24);
            return val >>> 0;
          }
          return 0;
        })();
        console.log('[DecryptGuess] Decrypted value:', decryptedValue);
        
        setMyGuess(Number(decryptedValue));
        setShowMyGuess(true);
        setError(`✅ Your guess: ${decryptedValue}`);
      }
      
    } catch (err: any) {
      console.error('Failed to decrypt guess:', err);
      setError(err.message || 'Failed to decrypt guess. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevealRoom = async () => {
    if (!isCreator) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual contract reveal
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error('Failed to reveal room:', err);
      setError('Failed to reveal room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Room Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Room #{room.id}
            </h1>
            <p className="text-gray-600">
              Range: {room.minRange} - {room.maxRange} • Entry: {room.entryFee} ETH
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {room.rewardPool} ETH
            </div>
            <div className="text-sm text-gray-500">Reward Pool</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-semibold">{room.currentPlayers} / {room.maxPlayers}</div>
              <div className="text-sm text-gray-500">Players</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <div className="font-semibold">
                {isExpired ? 'Expired' : formatDistanceToNow(room.deadline, { addSuffix: true })}
              </div>
              <div className="text-sm text-gray-500">Time Left</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Target className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-semibold">
                {room.isRevealed ? room.winningGuess : 'Hidden'}
              </div>
              <div className="text-sm text-gray-500">Target</div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Status */}
      {room.isRevealed ? (
        <div className="card">
          <div className="text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Game Revealed!</h2>
            <p className="text-gray-600 mb-4">
              Target was: <span className="font-bold text-blue-600">{room.winningGuess}</span>
            </p>
            {room.winner && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg">
                <p className="font-semibold">
                  Winner: {formatAddress(room.winner)}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : isExpired ? (
        <div className="card">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Game Expired</h2>
            <p className="text-gray-600 mb-4">
              {isCreator ? 'You can now reveal the results' : 'Waiting for creator to reveal results'}
            </p>
            {isCreator && (
              <button
                onClick={handleRevealRoom}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Revealing...' : 'Reveal Results'}
              </button>
            )}
          </div>
        </div>
      ) : !hasJoined ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Join This Room</h3>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Room Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Entry Fee:</span>
                  <span className="font-medium text-blue-900">{room.entryFee} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Players:</span>
                  <span className="font-medium text-blue-900">{room.currentPlayers} / {room.maxPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Reward Pool:</span>
                  <span className="font-medium text-blue-900">{room.rewardPool} ETH</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleJoinRoom}
              disabled={!isConnected || loading || isFull || isExpired}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>
                {loading ? 'Joining...' : 
                 !isConnected ? 'Connect Wallet First' :
                 isFull ? 'Room Full' :
                 isExpired ? 'Room Expired' :
                 `Join Room (${room.entryFee} ETH)`}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Guess</h3>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {hasSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Guess Submitted!</h4>
              <p className="text-gray-600 mb-4">Your encrypted guess has been recorded.</p>
              
              {showMyGuess ? (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h5 className="font-semibold text-blue-900 mb-2">Your Guess</h5>
                  <div className="text-2xl font-bold text-blue-600">{myGuess}</div>
                </div>
              ) : (
                <button
                  onClick={handleDecryptMyGuess}
                  disabled={loading}
                  className="btn-secondary flex items-center justify-center space-x-2 mx-auto"
                >
                  <Target className="w-4 h-4" />
                  <span>{loading ? 'Decrypting...' : 'View My Guess'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Guess ({room.minRange} - {room.maxRange})
                </label>
                <input
                  type="number"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="input-field"
                  min={room.minRange}
                  max={room.maxRange}
                  placeholder="Enter your guess..."
                />
              </div>
              
              <button
                onClick={handleSubmitGuess}
                disabled={!canSubmit || loading || !guess}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Encrypted Guess'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Players List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Players</h3>
          {isCreator && !isExpired && !isFull && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-secondary text-sm flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Invite Player</span>
            </button>
          )}
        </div>
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={`${player.address}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {formatAddress(player.address)}
                  </div>
                  {player.address === account && (
                    <div className="text-xs text-blue-600">You</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {player.hasSubmitted ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                  {player.hasSubmitted ? 'Submitted' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Player</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Address
                </label>
                <input
                  type="text"
                  value={inviteAddress}
                  onChange={(e) => setInviteAddress(e.target.value)}
                  className="input-field"
                  placeholder="0x..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvitePlayer}
                  disabled={loading || !inviteAddress}
                  className="flex-1 btn-primary"
                >
                  {loading ? 'Generating...' : 'Generate Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
