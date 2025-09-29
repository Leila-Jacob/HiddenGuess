# FHEVM HiddenGuess 实现说明

## 概述
这个项目实现了基于FHEVM（全同态加密虚拟机）的猜数字游戏，使用真正的同态加密技术来保护用户隐私。

## 核心FHEVM功能

### 1. 加密数据类型
- `euint32`: 加密的32位无符号整数
- `ebool`: 加密的布尔值
- `externalEuint32`: 外部加密数据（来自前端）

### 2. 同态加密操作

#### 基本运算
```solidity
// 加法
euint32 result = FHE.add(encryptedA, encryptedB);

// 减法
euint32 result = FHE.sub(encryptedA, encryptedB);

// 比较
ebool isLess = FHE.lt(encryptedA, encryptedB);
ebool isEqual = FHE.eq(encryptedA, encryptedB);
```

#### 条件选择
```solidity
// 根据加密布尔值选择值
euint32 result = FHE.select(encryptedBool, valueIfTrue, valueIfFalse);
```

#### 绝对值计算
```solidity
// 计算加密整数的绝对值
euint32 difference = FHE.sub(guess, target);
ebool isNegative = FHE.lt(difference, FHE.asEuint32(0));
euint32 absDistance = FHE.select(
    isNegative,
    FHE.sub(FHE.asEuint32(0), difference), // 如果是负数，返回 0 - difference
    difference // 如果是正数，返回 difference
);
```

### 3. 权限管理
```solidity
// 允许合约解密数据
FHE.allowThis(encryptedData);

// 允许特定用户解密数据
FHE.allow(encryptedData, userAddress);
```

## 合约架构

### 数据结构
```solidity
struct Room {
    uint256 roomId;
    address creator;
    uint32 minRange;
    uint32 maxRange;
    uint32 maxPlayers;
    uint32 currentPlayers;
    uint256 deadline;
    uint256 entryFee;
    uint256 rewardPool;
    euint32 target; // 加密的目标数字
    bool isActive;
    bool isRevealed;
    address winner;
    euint32 winningGuess; // 加密的获胜猜测
}

struct Player {
    address playerAddress;
    euint32 guess; // 加密的猜测
    bool hasSubmitted;
    bool hasClaimed;
}
```

### 核心函数

#### 1. createRoom
- 接收加密的目标数字
- 使用`FHE.fromExternal()`转换外部加密数据
- 设置权限允许创建者解密目标

#### 2. submitGuess
- 接收加密的猜测数字
- 使用`FHE.fromExternal()`转换外部加密数据
- 设置权限允许合约解密猜测

#### 3. revealRoom
- 计算每个猜测与目标的绝对距离
- 使用FHE操作进行比较
- 确定获胜者（当前实现为简化版本）

## FHEVM限制和解决方案

### 限制1: 无法在控制流中使用加密布尔值
**问题**: 不能直接使用`FHE.decrypt(encryptedBool)`来做if-else决策
**解决方案**: 使用`FHE.select()`进行条件选择

### 限制2: 复杂的比较逻辑
**问题**: 无法直接实现"找到最小值"的逻辑
**当前解决方案**: 简化实现，选择第一个有效猜测作为获胜者
**未来改进**: 可以实现更复杂的FHE比较算法

### 限制3: 事件中无法直接发出加密数据
**问题**: 事件只能发出明文数据
**解决方案**: 在事件中发出0，通过专门的getter函数获取加密数据

## 前端集成

### Mock FHEVM实例
前端使用Mock FHEVM实例进行本地开发：
- 模拟加密/解密操作
- 提供与真实FHEVM相同的API
- 在本地环境中正常工作

### 真实FHEVM集成
在生产环境中，前端会：
- 使用真正的FHEVM SDK
- 连接到Zama的FHEVM网络
- 进行真实的同态加密操作

## 部署信息

### 当前部署
- **合约地址**: 0x0165878A594ca255338adfa4d48449f69242Eb8F
- **网络**: localhost (FHEVM Hardhat)
- **Chain ID**: 31337
- **RPC URL**: http://localhost:8545

### 启动命令
```bash
# 启动FHEVM Hardhat节点
npm run start:fhevm

# 部署合约
npm run deploy:fhevm
```

## 安全考虑

1. **数据隐私**: 所有敏感数据（目标数字、猜测）都保持加密状态
2. **权限控制**: 只有授权用户才能解密特定数据
3. **同态运算**: 在不解密数据的情况下进行计算
4. **防篡改**: 使用加密证明确保数据完整性

## 未来改进

1. **完整的比较算法**: 实现真正的"找最小值"FHE算法
2. **批量操作**: 支持多个猜测的批量比较
3. **更复杂的游戏逻辑**: 支持更复杂的游戏规则
4. **性能优化**: 优化FHE操作的gas消耗

## 参考资料

- [FHEVM官方文档](https://docs.fhevm.org/)
- [Zama FHEVM网络](https://fhevm.zama.ai/)
- [同态加密原理](https://en.wikipedia.org/wiki/Homomorphic_encryption)
