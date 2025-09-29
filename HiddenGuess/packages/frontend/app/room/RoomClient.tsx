"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameRoom } from '@/components';
import { Room } from '@/types';

export default function RoomClient() {
  const search = useSearchParams();
  const id = search.get('id');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const { ethers } = await import('ethers');
        const { createContract } = await import('@/lib/contract');
        if (!id) throw new Error('Missing room id');
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const contract = createContract(provider);
          const data = await contract.getRoom(parseInt(id));
          const r: Room = {
            id: Number(data[0]) || 0,
            creator: data[1] || '0x0000000000000000000000000000000000000000',
            minRange: Number(data[2]) || 0,
            maxRange: Number(data[3]) || 0,
            maxPlayers: Number(data[4]) || 0,
            currentPlayers: Number(data[5]) || 0,
            deadline: (Number(data[6]) || 0) * 1000,
            entryFee: data[7] ? (await import('ethers')).ethers.formatEther(data[7]) : '0',
            rewardPool: data[8] ? (await import('ethers')).ethers.formatEther(data[8]) : '0',
            isActive: data[9] || false,
            isRevealed: data[10] || false,
            winner: data[11] === '0x0000000000000000000000000000000000000000' ? null : data[11],
            winningGuess: 0,
          };
          setRoom(r);
        } else {
          throw new Error('Ethereum provider not available');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load room');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading room...</div>;
  if (error || !room) return <div className="p-8 text-center">Room Not Found</div>;
  return <GameRoom room={room} />;
}


