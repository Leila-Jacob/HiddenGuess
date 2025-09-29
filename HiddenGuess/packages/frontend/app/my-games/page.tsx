'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Header, RoomCard } from '@/components';
import { Room } from '@/types';
import { useWallet } from '@/hooks';
import { createContract, parseContractRoomData, convertToRoom } from '@/lib/contract';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, Clock } from 'lucide-react';

export default function MyGamesPage() {
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [participatedRooms, setParticipatedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { account, isConnected, provider } = useWallet();

  useEffect(() => {
    if (isConnected && provider) {
      loadMyGames();
    }
  }, [isConnected, provider, account]);

  const loadMyGames = async () => {
    try {
      setLoading(true);
      
      if (!provider || !account) {
        setMyRooms([]);
        setParticipatedRooms([]);
        return;
      }

      // 创建BrowserProvider和合约实例
      const browserProvider = new ethers.BrowserProvider(provider);
      const contract = createContract(browserProvider);
      
      // 调试信息（已注释，问题已解决）
      // console.log('🔍 Frontend Debug Info:');
      // console.log('- Contract address:', contract.target);
      // console.log('- Account:', account);
      
      // 获取下一个房间ID
      const nextRoomId = await contract.nextRoomId();
      console.log('Next room ID:', nextRoomId.toString());
      
      const createdRooms: Room[] = [];
      const participatedRooms: Room[] = [];
      
      // 遍历所有房间ID
        for (let i = 1; i < Number(nextRoomId); i++) {
          try {
            const rawRoomData = await contract.getRoom(i);
            
            // 使用规范的工具函数解析数据
            const contractRoomData = parseContractRoomData(rawRoomData);
            if (contractRoomData) {
              const room = convertToRoom(contractRoomData);

              // 检查是否是我创建的房间
              if (contractRoomData.creator.toLowerCase() === account.toLowerCase()) {
                createdRooms.push(room);
              } else {
                // 检查是否参与了这个房间
                try {
                  const playerData = await contract.getPlayer(i, account);
                  if (playerData && playerData.hasSubmitted) {
                    participatedRooms.push(room);
                  }
                } catch (error) {
                  // 玩家不在这个房间中
                }
              }
            }
          } catch (error: unknown) {
            // 房间不存在或已删除，跳过
            if (error instanceof Error) {
              console.log(`Room ${i} not found:`, error.message);
            } else {
              console.log(`Room ${i} not found`);
            }
          }
        }
      
      setMyRooms(createdRooms);
      setParticipatedRooms(participatedRooms);
      console.log('My created rooms:', createdRooms);
      console.log('My participated rooms:', participatedRooms);
    } catch (error) {
      console.error('Failed to load my games:', error);
      setMyRooms([]);
      setParticipatedRooms([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">请先连接钱包</h2>
            <p className="text-gray-600 mb-4">
              连接钱包后可以查看你创建和参与的游戏
            </p>
            <Link href="/" className="btn-primary">
              返回首页
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">我的游戏</h1>
          <p className="text-gray-600">查看你创建和参与的游戏房间</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 我创建的房间 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">我创建的房间</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {myRooms.length}
                </span>
              </div>
              
              {myRooms.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-2">🏗️</div>
                  <p className="text-gray-600">你还没有创建任何房间</p>
                  <Link href="/" className="btn-primary mt-4">
                    创建第一个房间
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myRooms.map((room) => (
                    <div key={room.id} className="relative">
                      <RoomCard room={room} />
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        创建者
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 我参与的房间 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">我参与的房间</h2>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  {participatedRooms.length}
                </span>
              </div>
              
              {participatedRooms.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-2">🎮</div>
                  <p className="text-gray-600">你还没有参与任何游戏</p>
                  <Link href="/" className="btn-primary mt-4">
                    查看所有房间
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {participatedRooms.map((room) => (
                    <div key={room.id} className="relative">
                      <RoomCard room={room} />
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        参与者
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
