'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.Eip1193Provider | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum as ethers.Eip1193Provider;
      setProvider(ethereum);

      // Check if already connected
      ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setIsConnected(true);
            setAccount(accounts[0]);
          }
        })
        .catch(console.error);

      // Get chain ID
      ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          setChainId(parseInt(chainId, 16));
        })
        .catch(console.error);

      // Listen for provider events if supported
      const ethereumWithEvents = ethereum as unknown as { on?: (event: string, handler: (...args: any[]) => void) => void };
      if (typeof ethereumWithEvents.on === 'function') {
        ethereumWithEvents.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setIsConnected(true);
            setAccount(accounts[0]);
          } else {
            setIsConnected(false);
            setAccount(null);
          }
        });

        ethereumWithEvents.on('chainChanged', (chainId: string) => {
          setChainId(parseInt(chainId, 16));
        });
      }
    }
  }, []);

  const connect = async () => {
    if (!provider) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setIsConnected(true);
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAccount(null);
  };

  return {
    isConnected,
    account,
    chainId,
    provider,
    connect,
    disconnect,
  };
};
