'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { FhevmInstance } from '@/types';

declare global {
  interface Window {
    relayerSDK?: {
      initSDK: (options?: any) => Promise<boolean>;
      createInstance: (config: any) => Promise<FhevmInstance>;
      SepoliaConfig: any;
      __initialized__?: boolean;
    };
  }
}

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

// Mock FHEVM instance for local development
const createMockFhevmInstance = (): FhevmInstance => {
  return {
    createEncryptedInput: (contractAddress: string, userAddress: string) => {
      let storedValue = 0; // Store the value that will be encrypted
      
      return {
        add32: (value: number) => {
          console.log(`[Mock] Adding value ${value} to encrypted input`);
          storedValue = value; // Store the actual value
        },
        encrypt: async () => {
          console.log(`[Mock] Encrypting input for contract ${contractAddress}, user ${userAddress}`);
          console.log(`[Mock] Encrypting value: ${storedValue}`);
          
          // Return mock encrypted data in exact same format as real FHEVM
          // Create mock handle (32 bytes) with realistic pattern
          const mockHandleBytes = new Uint8Array(32);
          // Fill with a realistic pattern similar to real FHEVM
          for (let i = 0; i < 28; i++) {
            mockHandleBytes[i] = (i * 7 + 42) % 256;
          }
          // Set the last 4 bytes to represent the value (little endian) - same as real FHEVM
          const value = storedValue; // Use the actual stored value
          mockHandleBytes[28] = value & 0xFF;        // LSB
          mockHandleBytes[29] = (value >> 8) & 0xFF; 
          mockHandleBytes[30] = (value >> 16) & 0xFF; 
          mockHandleBytes[31] = (value >> 24) & 0xFF; // MSB
          
          // Create mock proof (100 bytes) with realistic pattern
          const mockProof = new Uint8Array(100);
          // Start with a pattern similar to real FHEVM
          mockProof[0] = 1; // Version or type indicator
          mockProof[1] = 1; // Another indicator
          
          // Copy handle bytes to proof (similar to real FHEVM)
          for (let i = 0; i < 32; i++) {
            mockProof[2 + i] = mockHandleBytes[i];
          }
          
          // Fill remaining bytes with a pattern
          for (let i = 34; i < 100; i++) {
            mockProof[i] = (i * 3 + 123) % 256;
          }
          
          return {
            handles: [mockHandleBytes],
            inputProof: mockProof,
          };
        },
      };
    },
    decrypt: async (encryptedBytes: Uint8Array) => {
      // Mock decrypt: read last 4 bytes as little-endian uint32
      if (encryptedBytes.length >= 32) {
        const value =
          encryptedBytes[28] |
          (encryptedBytes[29] << 8) |
          (encryptedBytes[30] << 16) |
          (encryptedBytes[31] << 24);
        return value >>> 0;
      }
      return 0;
    },
    userDecrypt: async (handles, privateKey, publicKey, signature, contractAddresses, userAddress, startTimestamp, durationDays) => {
      console.log(`[Mock] Decrypting handles:`, handles);
      // Return mock decrypted values
      const result: Record<string, number> = {};
      handles.forEach((handle) => {
        result[handle.handle] = Math.floor(Math.random() * 100) + 1; // Random number 1-100
      });
      return result;
    },
    generateKeypair: () => ({
      publicKey: `mock_public_key_${Date.now()}`,
      privateKey: `mock_private_key_${Date.now()}`,
    }),
    createEIP712: (publicKey, contractAddresses, startTimestamp, durationDays) => ({
      domain: {
        chainId: 31337,
        name: 'MockFHEVM',
        verifyingContract: '0x0000000000000000000000000000000000000000',
        version: '1',
      },
      types: {
        UserDecryptRequestVerification: [
          { name: 'publicKey', type: 'string' },
          { name: 'contractAddresses', type: 'address[]' },
          { name: 'startTimestamp', type: 'uint256' },
          { name: 'durationDays', type: 'uint256' },
        ],
      },
      message: {
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays,
      },
      primaryType: 'UserDecryptRequestVerification',
    }),
  };
};

export const useFhevm = (parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} => {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(provider);
  const _chainIdRef = useRef<number | undefined>(chainId);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains);

  const refresh = useCallback(() => {
    // Provider or chainId has changed. Abort immediately
    if (_abortControllerRef.current) {
      _providerRef.current = undefined;
      _chainIdRef.current = undefined;
      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    _providerRef.current = provider;
    _chainIdRef.current = chainId;

    // Nullify instance immediately
    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");

    if (provider !== undefined) {
      // Force call main useEffect
      _setProviderChanged((prev) => prev + 1);
    }
  }, [provider, chainId]);

  // Merge in main useEffect
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  const isLocalNetwork = useCallback(async () => {
    if (!(window as any).ethereum) return false;
    
    try {
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const chainIdNumber = parseInt(chainId, 16);
      
      // Check if it's local Hardhat network (chainId: 31337)
      return chainIdNumber === 31337;
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      return false;
    }
  }, []);

  const loadSDK = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Check if SDK is already loaded
    if (window.relayerSDK) {
      return window.relayerSDK;
    }

    // Load SDK from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs';
      script.async = true;
      
      script.onload = () => {
        if (window.relayerSDK) {
          resolve(window.relayerSDK);
        } else {
          reject(new Error('Failed to load FHEVM SDK'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load FHEVM SDK'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const createFhevmInstance = useCallback(async (parameters: {
    provider: ethers.Eip1193Provider | string;
    mockChains?: Record<number, string>;
    signal: AbortSignal;
    onStatusChange?: (status: string) => void;
  }): Promise<FhevmInstance> => {
    const { signal, onStatusChange, provider: providerOrUrl, mockChains } = parameters;

    const throwIfAborted = () => {
      if (signal.aborted) throw new Error('FHEVM operation was cancelled');
    };

    const notify = (status: string) => {
      if (onStatusChange) onStatusChange(status);
    };

    // Check if we're on local network
    const isLocal = await isLocalNetwork();
    
    if (isLocal) {
      console.log('[FHEVM] Using Mock mode for local development');
      notify('creating');
      
      // Use Mock instance for local development
      const mockInstance = createMockFhevmInstance();
      throwIfAborted();
      return mockInstance;
    }

    console.log('[FHEVM] Using real relayer-sdk for production');
    notify('sdk-loading');

    // Load real SDK for production networks
    const sdk = await loadSDK() as any;
    throwIfAborted();
    notify('sdk-loaded');

    // Initialize SDK
    if (!sdk.__initialized__) {
      notify('sdk-initializing');
      await sdk.initSDK();
      throwIfAborted();
      notify('sdk-initialized');
    }

    // Create instance
    notify('creating');
    const config = {
      ...sdk.SepoliaConfig,
      network: providerOrUrl,
    };

    const fhevmInstance = await sdk.createInstance(config);
    throwIfAborted();

    return fhevmInstance;
  }, [isLocalNetwork, loadSDK]);

  // Main useEffect
  useEffect(() => {
    if (_isRunning === false) {
      console.log("cancelled");
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      _setInstance(undefined);
      _setError(undefined);
      _setStatus("idle");
      return;
    }

    if (_isRunning === true) {
      if (_providerRef.current === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      // Keep old instance
      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = _providerRef.current;
      const thisRpcUrlsByChainId = _mockChainsRef.current;

      createFhevmInstance({
        signal: thisSignal,
        provider: thisProvider,
        mockChains: thisRpcUrlsByChainId,
        onStatusChange: (s) => console.log(`[useFhevm] createFhevmInstance status changed: ${s}`),
      })
        .then((i) => {
          console.log(`[useFhevm] createFhevmInstance created!`);
          if (thisSignal.aborted) return;

          _setInstance(i);
          _setError(undefined);
          _setStatus("ready");
        })
        .catch((e) => {
          console.log(`Error Was thrown !!! error... ` + e.name);
          if (thisSignal.aborted) return;

          _setInstance(undefined);
          _setError(e);
          _setStatus("error");
        });
    }
  }, [_isRunning, _providerChanged, createFhevmInstance]);

  return { instance, refresh, error, status };
};
