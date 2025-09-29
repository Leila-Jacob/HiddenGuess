'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { GameRoom, CreateRoomModal, Header, RoomCard } from '@/components';
import { useFhevm, useWallet } from '@/hooks';
import { Room } from '@/types';
import { createContract, parseContractRoomData, convertToRoom } from '@/lib/contract';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { isConnected, connect, chainId, provider } = useWallet();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider: provider || undefined,
    chainId: chainId || undefined,
    enabled: isConnected,
  });

  useEffect(() => {
    loadRooms();
  }, [provider]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      if (!provider) {
        setRooms([
          {
            id: 1,
            creator: '0x1234...5678',
            minRange: 1,
            maxRange: 100,
            maxPlayers: 10,
            currentPlayers: 3,
            deadline: Date.now() + 3600000,
            entryFee: '0.01',
            rewardPool: '0.05',
            isActive: true,
            isRevealed: false,
            winner: null,
            winningGuess: 0,
          },
        ]);
        return;
      }

      const browserProvider = new ethers.BrowserProvider(provider);
      const contract = createContract(browserProvider);
      
      const nextRoomId = await contract.nextRoomId();
      console.log('Next room ID:', nextRoomId.toString());
      
      const roomsList: Room[] = [];
      
        for (let i = 1; i < Number(nextRoomId); i++) {
          try {
            const rawRoomData = await contract.getRoom(i);
            
            // 使用规范的工具函数解析数据
            const contractRoomData = parseContractRoomData(rawRoomData);
            if (contractRoomData) {
              const room = convertToRoom(contractRoomData);
              roomsList.push(room);
            }
          } catch (error) {
            console.log(`Room ${i} not found or inactive`);
          }
        }
      
      setRooms(roomsList);
      console.log('Loaded rooms from contract:', roomsList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    if (!isConnected) {
      connect();
      return;
    }
    setShowCreateModal(true);
  };

  const handleRoomCreated = (newRoom: Room) => {
    setRooms(prev => [newRoom, ...prev]);
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* SPA hash routing fallback for GitHub Pages */}
        <script
          dangerouslySetInnerHTML={{__html: `
            (function(){
              try {
                var prefix = (window.__NEXT_DATA__ && window.__NEXT_DATA__.assetPrefix) || '';
                if (location.pathname.endsWith('/room/') && location.hash.length > 1) {
                  var id = location.hash.slice(1);
                  location.href = prefix + '/room/?id=' + encodeURIComponent(id);
                }
              } catch (e) {}
            })();
          `}}
        />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            HiddenGuess
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Submit encrypted guesses and win rewards! 🎯
          </p>
          
          <button
            onClick={handleCreateRoom}
            className="btn-primary text-lg px-8 py-4 shadow-glow"
          >
            {isConnected ? 'Create New Room' : 'Connect Wallet to Play'}
          </button>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              Wallet: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <div className={`w-3 h-3 rounded-full ${
              fhevmStatus === 'ready' ? 'bg-green-500' : 
              fhevmStatus === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">
              FHEVM: {fhevmStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : rooms.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No active rooms
              </h3>
              <p className="text-gray-500">
                Be the first to create a room and start playing!
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={handleRoomCreated}
        />
      )}
    </div>
  );
}
