'use client';

import { useWallet } from '@/hooks';
import { Wallet, Trophy, Settings, Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export const Header = () => {
  const { isConnected, account, connect, disconnect } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Trophy className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gradient">
                HiddenGuess
              </h1>
            </Link>
            
            {/* 导航菜单 */}
            <nav className="hidden md:flex items-center space-x-6 ml-8">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                所有房间
              </Link>
              {isConnected && (
                <Link 
                  href="/my-games" 
                  className="text-gray-600 hover:text-blue-600 transition-colors flex items-center space-x-1"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>我的游戏</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {formatAddress(account!)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="btn-primary flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
