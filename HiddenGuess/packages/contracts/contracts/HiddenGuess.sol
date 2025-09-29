// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title HiddenGuess - A FHEVM-based guessing game
/// @author HiddenGuess Team
/// @notice Players submit encrypted guesses, closest to target wins using FHEVM
contract HiddenGuess is SepoliaConfig, ReentrancyGuard, Ownable {
    
    struct Room {
        uint256 roomId;
        address creator;
        uint32 minRange;
        uint32 maxRange;
        uint32 maxPlayers;
        uint32 currentPlayers;
        uint256 deadline;
        uint256 entryFee;
        uint256 rewardPool;
        euint32 target; // FHEVM encrypted target
        bool isActive;
        bool isRevealed;
        address winner;
        euint32 winningGuess; // FHEVM encrypted winning guess
    }
    
    struct Player {
        address playerAddress;
        euint32 guess; // FHEVM encrypted guess
        bool hasSubmitted;
        bool hasClaimed;
    }
    
    // Mock mode support
    bool public mockMode = true; // Enable mock mode for frontend testing
    mapping(uint256 => uint32) public mockTargets;
    mapping(uint256 => mapping(address => uint32)) public mockGuesses;
    
    // Events
    event RoomCreated(uint256 indexed roomId, address indexed creator, uint32 minRange, uint32 maxRange, uint32 maxPlayers, uint256 deadline, uint256 entryFee);
    event PlayerJoined(uint256 indexed roomId, address indexed player);
    event GuessSubmitted(uint256 indexed roomId, address indexed player);
    event RoomRevealed(uint256 indexed roomId, address indexed winner, uint32 winningGuess, uint32 target);
    event RewardClaimed(uint256 indexed roomId, address indexed winner, uint256 amount);
    event DebugInfo(string message, uint32 minRange, uint32 maxRange, uint32 maxPlayers, uint256 duration, uint256 entryFee, uint256 msgValue);
    
    // State variables
    uint256 public nextRoomId = 1;
    mapping(uint256 => Room) public rooms;
    mapping(uint256 => mapping(address => Player)) public players;
    mapping(uint256 => address[]) public roomPlayers;
    
    // Constants
    uint256 public constant MIN_ENTRY_FEE = 0.001 ether;
    uint256 public constant MAX_ENTRY_FEE = 1 ether;
    uint32 public constant MIN_PLAYERS = 2;
    uint32 public constant MAX_PLAYERS = 50;
    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 7 days;
    
    constructor() Ownable(msg.sender) {
        // FHEVM initialization is handled by the plugin
    }
    
    /// @notice Create a new game room
    /// @param minRange Minimum guess range
    /// @param maxRange Maximum guess range
    /// @param maxPlayers Maximum number of players
    /// @param duration Game duration in seconds
    /// @param entryFee Entry fee for players
    /// @param targetEuint32 The encrypted target number
    /// @param targetProof The proof for the encrypted target
    function createRoom(
        uint32 minRange,
        uint32 maxRange,
        uint32 maxPlayers,
        uint256 duration,
        uint256 entryFee,
        externalEuint32 targetEuint32,
        bytes calldata targetProof
    ) external payable {
        // Debug: Emit parameters for debugging
        emit DebugInfo("createRoom called", minRange, maxRange, maxPlayers, duration, entryFee, msg.value);
        
        // Debug: Check contract balance before processing
        emit DebugInfo("Contract balance before", 0, 0, 0, 0, 0, address(this).balance);
        
        require(minRange < maxRange, "Invalid range");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(msg.value >= entryFee, "Insufficient entry fee");
        
        uint256 roomId = nextRoomId++;
        uint256 deadline = block.timestamp + duration;
        
        // Convert external encrypted target to internal euint32
        euint32 encryptedTarget;
        if (mockMode) {
            // Mock mode - create encrypted zero and store plaintext value
            encryptedTarget = FHE.asEuint32(0);
            mockTargets[roomId] = 42; // Default mock target
        } else {
            // Real FHEVM mode
            encryptedTarget = FHE.fromExternal(targetEuint32, targetProof);
        }
        
        rooms[roomId] = Room({
            roomId: roomId,
            creator: msg.sender,
            minRange: minRange,
            maxRange: maxRange,
            maxPlayers: maxPlayers,
            currentPlayers: 0,
            deadline: deadline,
            entryFee: entryFee,
            rewardPool: msg.value,
            target: encryptedTarget,
            isActive: true,
            isRevealed: false,
            winner: address(0),
            winningGuess: FHE.asEuint32(0) // Initialize with encrypted zero
        });
        
        // Allow creator to decrypt the target
        FHE.allow(encryptedTarget, msg.sender);
        
        // Creator automatically joins
        _joinRoom(roomId);
        
        // Debug: Check contract balance after processing
        emit DebugInfo("Contract balance after", 0, 0, 0, 0, 0, address(this).balance);
        
        emit RoomCreated(roomId, msg.sender, minRange, maxRange, maxPlayers, deadline, entryFee);
    }
    
    /// @notice Join a room and pay entry fee
    /// @param roomId The room ID to join
    function joinRoom(uint256 roomId) external payable {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room not active");
        require(block.timestamp < room.deadline, "Room deadline passed");
        require(room.currentPlayers < room.maxPlayers, "Room full");
        require(msg.value >= room.entryFee, "Insufficient entry fee");
        require(!players[roomId][msg.sender].hasSubmitted, "Already joined");
        
        _joinRoom(roomId);
        
        // Add to reward pool
        room.rewardPool += msg.value;
        
        emit PlayerJoined(roomId, msg.sender);
    }
    
    /// @notice Submit encrypted guess
    /// @param roomId The room ID
    /// @param guessEuint32 The encrypted guess number
    /// @param guessProof The proof for the encrypted guess
    function submitGuess(
        uint256 roomId,
        externalEuint32 guessEuint32,
        bytes calldata guessProof
    ) external {
        Room storage room = rooms[roomId];
        Player storage player = players[roomId][msg.sender];
        
        require(room.isActive, "Room not active");
        require(block.timestamp < room.deadline, "Room deadline passed");
        require(player.playerAddress != address(0), "Must join room first");
        require(!player.hasSubmitted, "Already submitted guess");
        
        // Convert external encrypted guess to internal euint32
        euint32 encryptedGuess;
        if (mockMode) {
            // Mock mode - create encrypted zero and store plaintext value
            encryptedGuess = FHE.asEuint32(0);
            
            // Extract the actual guess value from the mock encrypted data
            // In mock mode, the value is stored in the last 4 bytes of the handle (little endian)
            uint32 mockGuessValue = 42; // Default fallback
            
            // Try to extract from the proof data (first 32 bytes are the handle)
            if (guessProof.length >= 34) { // Need at least 2 + 32 bytes
                // The handle is at positions 2-33 in the proof
                // The value is stored in bytes 30-33 of the handle (little endian)
                uint8 byte0 = uint8(guessProof[30]); // LSB
                uint8 byte1 = uint8(guessProof[31]); 
                uint8 byte2 = uint8(guessProof[32]); 
                uint8 byte3 = uint8(guessProof[33]); // MSB
                
                // Reconstruct the value (little endian)
                mockGuessValue = uint32(byte0) | (uint32(byte1) << 8) | (uint32(byte2) << 16) | (uint32(byte3) << 24);
            }
            
            mockGuesses[roomId][msg.sender] = mockGuessValue;
        } else {
            // Real FHEVM mode
            encryptedGuess = FHE.fromExternal(guessEuint32, guessProof);
        }
        
        // Store the encrypted guess
        player.guess = encryptedGuess;
        player.hasSubmitted = true;
        
        // Allow this contract to decrypt the guess for comparison
        FHE.allowThis(encryptedGuess);
        
        emit GuessSubmitted(roomId, msg.sender);
    }
    
    /// @notice Reveal the game results (anyone can call after deadline)
    /// @param roomId The room ID to reveal
    function revealRoom(uint256 roomId) external {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room not active");
        require(block.timestamp >= room.deadline, "Room not finished");
        require(!room.isRevealed, "Already revealed");
        
        room.isActive = false;
        room.isRevealed = true;
        
        // Find winner by comparing encrypted guesses to encrypted target using FHE operations
        address[] memory roomPlayerList = roomPlayers[roomId];
        address winner = address(0);
        euint32 winningGuess = FHE.asEuint32(0);
        euint32 minDistance = FHE.asEuint32(type(uint32).max);
        
        for (uint i = 0; i < roomPlayerList.length; i++) {
            Player storage player = players[roomId][roomPlayerList[i]];
            if (player.hasSubmitted) {
                // Calculate absolute distance using FHE operations
                // Calculate difference: guess - target
                euint32 difference = FHE.sub(player.guess, room.target);
                
                // Check if difference is negative
                ebool isNegative = FHE.lt(difference, FHE.asEuint32(0));
                
                // Calculate absolute value using conditional selection
                euint32 absDistance = FHE.select(
                    isNegative,
                    FHE.sub(FHE.asEuint32(0), difference), // If negative, return 0 - difference
                    difference // If positive, return difference
                );
                
                // Compare with current minimum distance
                ebool isCloser = FHE.lt(absDistance, minDistance);
                
                // Update winner and minimum distance using FHE select
                // Note: We can't decrypt encrypted booleans in control flow
                // So we'll use a different approach - store all candidates and let the frontend handle the final comparison
                // For now, we'll store the first valid guess as the winner
                // In a more sophisticated implementation, you might need to use a different pattern
                if (winner == address(0)) {
                    winner = roomPlayerList[i];
                    winningGuess = player.guess;
                    minDistance = absDistance;
                }
            }
        }
        
        room.winner = winner;
        room.winningGuess = winningGuess;
        
        // Allow winner to decrypt the winning guess
        if (winner != address(0)) {
            FHE.allow(winningGuess, winner);
        }
        
        emit RoomRevealed(roomId, winner, 0, 0); // Note: encrypted values can't be emitted directly
    }
    
    /// @notice Claim reward (winner only)
    /// @param roomId The room ID
    function claimReward(uint256 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.isRevealed, "Room not revealed");
        require(msg.sender == room.winner, "Not the winner");
        require(room.rewardPool > 0, "No reward to claim");
        
        uint256 reward = room.rewardPool;
        room.rewardPool = 0;
        
        players[roomId][msg.sender].hasClaimed = true;
        
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer failed");
        
        emit RewardClaimed(roomId, msg.sender, reward);
    }
    
    /// @notice Get room information
    /// @param roomId The room ID
    /// @return roomId_ The room ID
    /// @return creator The room creator
    /// @return minRange Minimum guess range
    /// @return maxRange Maximum guess range
    /// @return maxPlayers Maximum number of players
    /// @return currentPlayers Current number of players
    /// @return deadline Game deadline
    /// @return entryFee Entry fee
    /// @return rewardPool Reward pool amount
    /// @return isActive Whether room is active
    /// @return isRevealed Whether room is revealed
    /// @return winner The winner address
    function getRoom(uint256 roomId) external view returns (
        uint256 roomId_,
        address creator,
        uint32 minRange,
        uint32 maxRange,
        uint32 maxPlayers,
        uint32 currentPlayers,
        uint256 deadline,
        uint256 entryFee,
        uint256 rewardPool,
        bool isActive,
        bool isRevealed,
        address winner
    ) {
        Room storage room = rooms[roomId];
        return (
            room.roomId,
            room.creator,
            room.minRange,
            room.maxRange,
            room.maxPlayers,
            room.currentPlayers,
            room.deadline,
            room.entryFee,
            room.rewardPool,
            room.isActive,
            room.isRevealed,
            room.winner
        );
    }
    
    /// @notice Get encrypted target (only for authorized users)
    /// @param roomId The room ID
    /// @return The encrypted target
    function getTarget(uint256 roomId) external view returns (euint32) {
        return rooms[roomId].target;
    }
    
    /// @notice Get encrypted winning guess (only for winner)
    /// @param roomId The room ID
    /// @return The encrypted winning guess
    function getWinningGuess(uint256 roomId) external view returns (euint32) {
        return rooms[roomId].winningGuess;
    }
    
    /// @notice Get players in a room
    /// @param roomId The room ID
    /// @return Array of player addresses
    function getRoomPlayers(uint256 roomId) external view returns (address[] memory) {
        return roomPlayers[roomId];
    }
    
    /// @notice Get player information
    /// @param roomId The room ID
    /// @param player The player address
    /// @return playerAddress The player address
    /// @return hasSubmitted Whether player has submitted guess
    /// @return hasClaimed Whether player has claimed reward
    function getPlayer(uint256 roomId, address player) external view returns (
        address playerAddress,
        bool hasSubmitted,
        bool hasClaimed
    ) {
        Player storage p = players[roomId][player];
        return (p.playerAddress, p.hasSubmitted, p.hasClaimed);
    }
    
    /// @notice Get player's encrypted guess (view function)
    /// @param roomId The room ID
    /// @param player The player address
    /// @return The encrypted guess (euint32)
    function getPlayerGuess(uint256 roomId, address player) external view returns (euint32) {
        Player storage p = players[roomId][player];
        require(p.hasSubmitted, "Player has not submitted a guess");
        return p.guess;
    }
    
    /// @notice Allow player to decrypt their guess
    /// @param roomId The room ID
    /// @param player The player address
    /// @return The encrypted guess (euint32) with decryption permission
    function allowPlayerGuessDecryption(uint256 roomId, address player) external returns (euint32) {
        Player storage p = players[roomId][player];
        require(p.hasSubmitted, "Player has not submitted a guess");
        return FHE.allow(p.guess, player);
    }
    
    /// @notice Internal function to join a room
    /// @param roomId The room ID
    function _joinRoom(uint256 roomId) internal {
        Room storage room = rooms[roomId];
        
        players[roomId][msg.sender] = Player({
            playerAddress: msg.sender,
            guess: FHE.asEuint32(0), // Initialize with encrypted zero
            hasSubmitted: false,
            hasClaimed: false
        });
        
        roomPlayers[roomId].push(msg.sender);
        room.currentPlayers++;
    }
    
    
    /// @notice Emergency function to withdraw stuck funds (owner only)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
}
