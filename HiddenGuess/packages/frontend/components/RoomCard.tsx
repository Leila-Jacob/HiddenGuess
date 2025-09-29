'use client';

import { Room } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Users, Clock, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RoomCardProps {
  room: Room;
}

export const RoomCard = ({ room }: RoomCardProps) => {
  const timeLeft = room.deadline - Date.now();
  const isExpired = timeLeft <= 0;
  const isFull = room.currentPlayers >= room.maxPlayers;
  const canJoin = !isExpired && !isFull && room.isActive && !room.isRevealed;

  const getStatusColor = () => {
    if (room.isRevealed) return 'bg-green-100 text-green-800';
    if (isExpired) return 'bg-red-100 text-red-800';
    if (isFull) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (room.isRevealed) return '已结束';
    if (isExpired) return '已过期';
    if (isFull) return '已满员';
    return '进行中';
  };

  return (
    <div className="card hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Room #{room.id}
          </h3>
          <p className="text-sm text-gray-600">
            Range: {room.minRange} - {room.maxRange}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Players</span>
          </div>
          <span className="font-medium">
            {room.currentPlayers} / {room.maxPlayers}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Time Left</span>
          </div>
          <span className="font-medium">
            {isExpired ? 'Expired' : formatDistanceToNow(room.deadline, { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Reward Pool</span>
          </div>
          <span className="font-medium text-green-600">
            {room.rewardPool} ETH
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Entry Fee</span>
          <span className="font-medium">
            {room.entryFee} ETH
          </span>
        </div>
      </div>

      <div className="flex space-x-3">
        <Link
          href={`/room?id=${room.id}`}
          className="flex-1 btn-primary text-center flex items-center justify-center space-x-2 group-hover:shadow-lg transition-all duration-200"
        >
          <span>{room.isRevealed ? 'View Results' : 'View Room'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {room.winner && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
          <div className="flex items-center space-x-2 text-white">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">
              Winner: {room.winner.slice(0, 6)}...{room.winner.slice(-4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
