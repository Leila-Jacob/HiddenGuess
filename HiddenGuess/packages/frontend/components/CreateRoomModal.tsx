'use client';

import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { ethers } from 'ethers';
import { CreateRoomData, Room } from '@/types';
import { useWallet, useFhevm } from '@/hooks';
import { createContract, HIDDEN_GUESS_ADDRESS } from '@/lib/contract';

interface CreateRoomModalProps {
  onClose: () => void;
  onRoomCreated: (room: Room) => void;
}

export const CreateRoomModal = ({ onClose, onRoomCreated }: CreateRoomModalProps) => {
  const { account, isConnected, chainId, provider } = useWallet();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider: provider || undefined,
    chainId: chainId || undefined,
    enabled: isConnected,
  });
  
  const [formData, setFormData] = useState<CreateRoomData>({
    minRange: 1,
    maxRange: 100,
    maxPlayers: 10,
    duration: 1,
    entryFee: '0.01',
    target: 50,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CreateRoomData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (formData.minRange >= formData.maxRange) {
      setError('Min range must be less than max range');
      return false;
    }
    if (formData.maxPlayers < 2 || formData.maxPlayers > 50) {
      setError('Max players must be between 2 and 50');
      return false;
    }
    if (formData.duration < 1 || formData.duration > 168) {
      setError('Duration must be between 1 hour and 1 week');
      return false;
    }
    if (parseFloat(formData.entryFee) < 0.001 || parseFloat(formData.entryFee) > 1) {
      setError('Entry fee must be between 0.001 and 1 ETH');
      return false;
    }
    if (formData.target < formData.minRange || formData.target > formData.maxRange) {
      setError('Target must be within the range');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CreateRoom] Submit button clicked!');
    console.log('[CreateRoom] Form data:', formData);
    console.log('[CreateRoom] isConnected:', isConnected);
    console.log('[CreateRoom] provider:', provider);
    console.log('[CreateRoom] fhevmStatus:', fhevmStatus);
    
    if (!isConnected || !provider) {
      console.log('[CreateRoom] Wallet not connected');
      setError('Please connect your wallet');
      return;
    }

    if (fhevmStatus !== 'ready') {
      console.log('[CreateRoom] FHEVM not ready');
      setError('FHEVM is not ready. Please wait...');
      return;
    }

    if (!validateForm()) {
      console.log('[CreateRoom] Form validation failed');
      return;
    }
    
    console.log('[CreateRoom] All checks passed, proceeding with room creation...');

    setLoading(true);
    setError(null);

    try {
      // 创建BrowserProvider和signer
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const contract = createContract(browserProvider, signer);
      
      // 检查网络信息
      const network = await browserProvider.getNetwork();
      console.log('[CreateRoom] Network info:', {
        chainId: network.chainId.toString(),
        name: network.name
      });
      
      // 检查交易前的余额
      const balanceBefore = await browserProvider.getBalance(account!);
      const contractBalanceBefore = await browserProvider.getBalance(HIDDEN_GUESS_ADDRESS);
      console.log('[CreateRoom] 💰 BALANCE BEFORE TRANSACTION:');
      console.log('[CreateRoom] Wallet balance:', ethers.formatEther(balanceBefore), 'ETH');
      console.log('[CreateRoom] Contract balance:', ethers.formatEther(contractBalanceBefore), 'ETH');
      
      // 记录 MetaMask 中的余额（如果可能）
      try {
        const metamaskBalance = await provider.request({ 
          method: 'eth_getBalance', 
          params: [account, 'latest'] 
        });
        console.log('[CreateRoom] MetaMask balance:', ethers.formatEther(metamaskBalance), 'ETH');
      } catch (error) {
        console.log('[CreateRoom] Could not get MetaMask balance:', error);
      }
      
      console.log('[CreateRoom] Creating room with contract...');
      
      // 使用Mock FHEVM实例创建加密的目标数字
      if (!fhevmInstance) {
        throw new Error('FHEVM instance not ready');
      }
      
      // 创建加密的目标数字
      const input = fhevmInstance.createEncryptedInput(
        HIDDEN_GUESS_ADDRESS, // 合约地址
        account!
      );
      input.add32(formData.target);
      const encryptedTarget = await input.encrypt();
      
      // 将Uint8Array转换为bytes32格式
      const targetBytes32 = ethers.hexlify(encryptedTarget.handles[0]);
      const proofBytes = ethers.hexlify(encryptedTarget.inputProof);
      
      console.log('[CreateRoom] Target bytes32:', targetBytes32);
      console.log('[CreateRoom] Proof bytes:', proofBytes);
      
      // 调用合约的createRoom函数
      console.log('[CreateRoom] 🦊 About to send transaction to MetaMask...');
      console.log('[CreateRoom] Transaction parameters:', {
        minRange: formData.minRange,
        maxRange: formData.maxRange,
        maxPlayers: formData.maxPlayers,
        duration: formData.duration * 3600,
        entryFee: ethers.parseEther(formData.entryFee).toString(),
        value: ethers.parseEther(formData.entryFee).toString()
      });
      
      // 检查 MetaMask 是否会自动弹窗
      console.log('[CreateRoom] 🔍 Checking MetaMask popup behavior...');
      try {
        // 尝试获取当前网络信息来触发可能的弹窗
        const currentNetwork = await provider.request({ method: 'eth_chainId' });
        console.log('[CreateRoom] Current network:', currentNetwork);
        
        // 检查账户权限
        const accounts = await provider.request({ method: 'eth_accounts' });
        console.log('[CreateRoom] Connected accounts:', accounts);
      } catch (error) {
        console.log('[CreateRoom] MetaMask check error:', error);
      }
      
      const tx = await contract.createRoom(
        formData.minRange,
        formData.maxRange,
        formData.maxPlayers,
        formData.duration * 3600, // 转换为秒
        ethers.parseEther(formData.entryFee),
        targetBytes32, // 加密的目标数字 (bytes32)
        proofBytes, // 输入证明 (bytes)
        { value: ethers.parseEther(formData.entryFee) }
      );
      
      console.log('[CreateRoom] 🦊 MetaMask transaction sent!');
      
      // 检查是否真的弹窗了
      console.log('[CreateRoom] 🔍 Did MetaMask popup appear? Check the browser window.');
      
      console.log('[CreateRoom] Transaction sent:', tx.hash);
      console.log('[CreateRoom] Transaction details:', {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString()
      });
      setError(`Transaction sent! Hash: ${tx.hash}`);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('[CreateRoom] Transaction confirmed:', receipt);
      
      // 验证交易状态
      if (receipt.status === 0) {
        throw new Error('Transaction failed - status is 0');
      }
      
      console.log('[CreateRoom] Transaction status:', receipt.status);
      console.log('[CreateRoom] Transaction gas used:', receipt.gasUsed.toString());
      console.log('[CreateRoom] Transaction effective gas price:', receipt.gasPrice?.toString());
      
      // 验证交易是否真的在区块链上
      try {
        const txFromBlockchain = await browserProvider.getTransaction(tx.hash);
        if (!txFromBlockchain) {
          throw new Error('Transaction not found on blockchain');
        }
        console.log('[CreateRoom] Transaction found on blockchain:', txFromBlockchain.hash);
        console.log('[CreateRoom] Blockchain transaction details:', {
          hash: txFromBlockchain.hash,
          from: txFromBlockchain.from,
          to: txFromBlockchain.to,
          value: txFromBlockchain.value?.toString(),
          gasLimit: txFromBlockchain.gasLimit?.toString(),
          gasPrice: txFromBlockchain.gasPrice?.toString(),
          blockNumber: txFromBlockchain.blockNumber,
          blockHash: txFromBlockchain.blockHash
        });
      } catch (error) {
        console.error('[CreateRoom] Failed to verify transaction on blockchain:', error);
        throw new Error('Transaction verification failed');
      }
      
      // 检查交易后的余额
      const balanceAfter = await browserProvider.getBalance(account!);
      const contractBalanceAfter = await browserProvider.getBalance(HIDDEN_GUESS_ADDRESS);
      console.log('[CreateRoom] 💰 BALANCE AFTER TRANSACTION:');
      console.log('[CreateRoom] Wallet balance:', ethers.formatEther(balanceAfter), 'ETH');
      console.log('[CreateRoom] Contract balance:', ethers.formatEther(contractBalanceAfter), 'ETH');
      
      // 记录 MetaMask 中的余额（如果可能）
      try {
        const metamaskBalanceAfter = await provider.request({ 
          method: 'eth_getBalance', 
          params: [account, 'latest'] 
        });
        console.log('[CreateRoom] MetaMask balance after:', ethers.formatEther(metamaskBalanceAfter), 'ETH');
      } catch (error) {
        console.log('[CreateRoom] Could not get MetaMask balance after:', error);
      }
      
      // 计算余额变化
      const walletChange = balanceBefore - balanceAfter;
      const contractChange = contractBalanceAfter - contractBalanceBefore;
      console.log('[CreateRoom] Balance changes:', {
        walletChange: ethers.formatEther(walletChange),
        contractChange: ethers.formatEther(contractChange),
        expectedPayment: formData.entryFee
      });
      
      // 验证支付是否成功
      const expectedPaymentWei = ethers.parseEther(formData.entryFee);
      const actualPaymentWei = contractChange;
      const paymentDifference = expectedPaymentWei - actualPaymentWei;
      
      console.log('[CreateRoom] 💰 PAYMENT VERIFICATION:');
      console.log('[CreateRoom] Expected payment:', ethers.formatEther(expectedPaymentWei), 'ETH');
      console.log('[CreateRoom] Actual payment:', ethers.formatEther(actualPaymentWei), 'ETH');
      console.log('[CreateRoom] Payment difference:', ethers.formatEther(paymentDifference), 'ETH');
      
      if (actualPaymentWei < expectedPaymentWei) {
        console.error('[CreateRoom] ❌ PAYMENT FAILED! Contract did not receive expected payment!');
        console.error('[CreateRoom] Missing amount:', ethers.formatEther(paymentDifference), 'ETH');
        setError(`❌ Payment failed! Contract only received ${ethers.formatEther(actualPaymentWei)} ETH instead of ${ethers.formatEther(expectedPaymentWei)} ETH`);
      } else if (actualPaymentWei > expectedPaymentWei) {
        console.warn('[CreateRoom] ⚠️ OVERPAYMENT! Contract received more than expected');
        console.warn('[CreateRoom] Extra amount:', ethers.formatEther(paymentDifference), 'ETH');
      } else {
        console.log('[CreateRoom] ✅ PAYMENT SUCCESSFUL! Contract received exact expected amount');
      }
      
      // 检查钱包余额变化是否合理（统一使用 bigint 进行计算）
      const gasUsedWei = typeof receipt.gasUsed === 'bigint' ? receipt.gasUsed : BigInt(receipt.gasUsed || 0);
      const effectiveGasPriceWei = (receipt as any).effectiveGasPrice ?? (receipt as any).gasPrice ?? 0n;
      const gasPriceWei = typeof effectiveGasPriceWei === 'bigint' ? effectiveGasPriceWei : BigInt(effectiveGasPriceWei || 0);
      const expectedWalletChange = expectedPaymentWei + (gasUsedWei * gasPriceWei);
      const actualWalletChange = walletChange;
      const walletDifference = expectedWalletChange - actualWalletChange;
      
      console.log('[CreateRoom] 💳 WALLET VERIFICATION:');
      console.log('[CreateRoom] Expected wallet change:', ethers.formatEther(expectedWalletChange), 'ETH');
      console.log('[CreateRoom] Actual wallet change:', ethers.formatEther(actualWalletChange), 'ETH');
      console.log('[CreateRoom] Wallet difference:', ethers.formatEther(walletDifference), 'ETH');
      
      if (Math.abs(Number(ethers.formatEther(walletDifference))) > 0.001) {
        console.warn('[CreateRoom] ⚠️ Wallet change differs from expected by more than 0.001 ETH');
      } else {
        console.log('[CreateRoom] ✅ Wallet change is within expected range');
      }
      
      // 最终支付验证报告
      console.log('[CreateRoom] 📊 FINAL PAYMENT REPORT:');
      console.log('[CreateRoom] ======================================');
      console.log('[CreateRoom] Entry fee requested:', formData.entryFee, 'ETH');
      console.log('[CreateRoom] Contract received:', ethers.formatEther(actualPaymentWei), 'ETH');
      console.log('[CreateRoom] Wallet paid:', ethers.formatEther(actualWalletChange), 'ETH');
      console.log('[CreateRoom] Gas fee:', ethers.formatEther(actualWalletChange - actualPaymentWei), 'ETH');
      console.log('[CreateRoom] Payment status:', actualPaymentWei >= expectedPaymentWei ? '✅ SUCCESS' : '❌ FAILED');
      console.log('[CreateRoom] ======================================');
      
      if (actualPaymentWei < expectedPaymentWei) {
        setError(`❌ 支付失败！合约只收到了 ${ethers.formatEther(actualPaymentWei)} ETH，而不是预期的 ${ethers.formatEther(expectedPaymentWei)} ETH`);
      } else {
        setError(`✅ 支付成功！合约收到了 ${ethers.formatEther(actualPaymentWei)} ETH，钱包支付了 ${ethers.formatEther(actualWalletChange)} ETH（包含 Gas 费）`);
      }
      
      setError(`Transaction confirmed in block ${receipt.blockNumber}!`);
      
      // 从事件中获取房间ID
      const roomCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'RoomCreated';
        } catch {
          return false;
        }
      });
      
      if (roomCreatedEvent) {
        const parsed = contract.interface.parseLog(roomCreatedEvent);
        const roomId = parsed?.args.roomId;
        
        // 创建房间对象
        const newRoom: Room = {
          id: Number(roomId),
          creator: account!,
          minRange: formData.minRange,
          maxRange: formData.maxRange,
          maxPlayers: formData.maxPlayers,
          currentPlayers: 1,
          deadline: Number(parsed?.args.deadline) * 1000, // 转换为毫秒
          entryFee: formData.entryFee,
          rewardPool: formData.entryFee,
          isActive: true,
          isRevealed: false,
          winner: null,
          winningGuess: 0,
        };
        
        onRoomCreated(newRoom);
        console.log('[CreateRoom] Room created successfully:', newRoom);
        setError(`✅ Room created successfully! Room ID: ${roomId}`);
        
        // 关闭模态框
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('Room creation event not found');
      }
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Room</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Range
              </label>
              <input
                type="number"
                value={formData.minRange}
                onChange={(e) => handleInputChange('minRange', parseInt(e.target.value))}
                className="input-field"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Range
              </label>
              <input
                type="number"
                value={formData.maxRange}
                onChange={(e) => handleInputChange('maxRange', parseInt(e.target.value))}
                className="input-field"
                min="2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Number
            </label>
            <input
              type="number"
              value={formData.target}
              onChange={(e) => handleInputChange('target', parseInt(e.target.value))}
              className="input-field"
              min={formData.minRange}
              max={formData.maxRange}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be between {formData.minRange} and {formData.maxRange}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Players
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleInputChange('maxPlayers', Math.max(2, formData.maxPlayers - 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={formData.maxPlayers}
                onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
                className="input-field text-center"
                min="2"
                max="50"
                required
              />
              <button
                type="button"
                onClick={() => handleInputChange('maxPlayers', Math.min(50, formData.maxPlayers + 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (hours)
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleInputChange('duration', Math.max(1, formData.duration - 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="input-field text-center"
                min="1"
                max="168"
                required
              />
              <button
                type="button"
                onClick={() => handleInputChange('duration', Math.min(168, formData.duration + 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Fee (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.entryFee}
              onChange={(e) => handleInputChange('entryFee', e.target.value)}
              className="input-field"
              min="0.001"
              max="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Between 0.001 and 1 ETH
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
              onClick={(e) => {
                console.log('[CreateRoom] Button clicked directly');
                // 不阻止默认行为，让表单提交处理
              }}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
