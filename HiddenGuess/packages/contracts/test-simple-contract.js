const { ethers } = require('hardhat');

async function main() {
  console.log('Testing simple contract functionality...');
  
  try {
    // 获取合约地址
    const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    const contract = await ethers.getContractAt('HiddenGuess', contractAddress);
    
    console.log('✅ Contract connected successfully');
    
    // 测试基本的合约调用
    const nextRoomId = await contract.nextRoomId();
    console.log('✅ Basic contract call successful, nextRoomId:', nextRoomId.toString());
    
    // 测试getRoom函数（应该返回默认值）
    try {
      const room = await contract.getRoom(0);
      console.log('✅ getRoom(0) successful:', room);
    } catch (error) {
      console.log('⚠️  getRoom(0) failed:', error.message);
    }
    
    // 测试getRoomPlayers函数
    try {
      const players = await contract.getRoomPlayers(0);
      console.log('✅ getRoomPlayers(0) successful:', players);
    } catch (error) {
      console.log('⚠️  getRoomPlayers(0) failed:', error.message);
    }
    
    console.log('✅ Basic contract functionality test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
