const { ethers } = require('hardhat');

async function main() {
  console.log('Testing basic FHEVM functionality...');
  
  try {
    // 检查FHEVM插件是否可用
    console.log('hre.fhevm available:', typeof hre.fhevm !== 'undefined');
    
    if (typeof hre.fhevm !== 'undefined') {
      console.log('FHEVM methods available:', Object.keys(hre.fhevm));
    }
    
    // 获取合约地址
    const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    const contract = await ethers.getContractAt('HiddenGuess', contractAddress);
    
    console.log('✅ Contract connected successfully');
    
    // 测试基本的合约调用（不使用FHEVM功能）
    const nextRoomId = await contract.nextRoomId();
    console.log('✅ Basic contract call successful, nextRoomId:', nextRoomId.toString());
    
    // 尝试使用Mock FHEVM功能
    console.log('Testing Mock FHEVM functionality...');
    
    const [deployer] = await ethers.getSigners();
    
    // 创建mock加密数据
    const mockTargetEuint32 = ethers.hexlify(ethers.randomBytes(32));
    const mockTargetProof = ethers.hexlify(ethers.randomBytes(64));
    
    console.log('Mock data created:');
    console.log('targetEuint32:', mockTargetEuint32);
    console.log('targetProof:', mockTargetProof.substring(0, 20) + '...');
    
    // 尝试创建房间
    console.log('Attempting to create room...');
    
    const tx = await contract.createRoom(
      1,    // minRange
      100,  // maxRange
      10,   // maxPlayers
      3600, // duration
      ethers.parseEther('0.01'), // entryFee
      mockTargetEuint32, // targetEuint32
      mockTargetProof,   // targetProof
      { value: ethers.parseEther('0.01') }
    );
    
    console.log('✅ Room creation transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed');
    
    // 检查事件
    const roomCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'RoomCreated';
      } catch {
        return false;
      }
    });
    
    if (roomCreatedEvent) {
      const parsed = contract.interface.parseLog(roomCreatedEvent);
      console.log('✅ Room created with ID:', parsed?.args.roomId.toString());
    }
    
    // 检查nextRoomId是否增加
    const newNextRoomId = await contract.nextRoomId();
    console.log('✅ New nextRoomId:', newNextRoomId.toString());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

main().catch(console.error);
