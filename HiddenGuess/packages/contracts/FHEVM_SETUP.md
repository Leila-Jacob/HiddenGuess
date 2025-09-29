# FHEVM Hardhat 节点设置指南

## 概述
这个项目使用FHEVM（Fully Homomorphic Encryption Virtual Machine）来实现同态加密的智能合约。FHEVM允许在不解密数据的情况下对加密数据进行计算。

## 前置要求
- Node.js 18+
- npm 或 yarn

## 安装依赖
```bash
npm install
```

## 启动FHEVM Hardhat节点

### 方法1：使用脚本（推荐）
```bash
npm run start:fhevm
```

这个脚本会：
1. 启动FHEVM Hardhat节点在后台运行
2. 等待节点准备就绪
3. 显示节点信息

### 方法2：手动启动
```bash
npx hardhat node
```

## 部署合约
在另一个终端窗口中，运行：
```bash
npm run deploy:fhevm
```

## 停止节点
如果使用脚本启动，按 `Ctrl+C` 停止脚本，或者：
```bash
# 找到并杀死进程
lsof -i :8545
kill <PID>
```

## 网络配置
- **URL**: http://localhost:8545
- **Chain ID**: 31337
- **网络名称**: localhost

## 合约特性
- 使用 `euint32` 类型存储加密数据
- 支持同态加密运算（加法、减法、比较等）
- 只有授权用户才能解密特定数据
- 在不解密的情况下比较加密数据

## 前端集成
前端使用Mock FHEVM实例进行本地开发，这样可以：
- 模拟加密/解密操作
- 在本地环境中正常工作
- 避免复杂的FHEVM SDK配置

## 故障排除

### 节点启动失败
1. 检查端口8545是否被占用
2. 确保所有依赖已正确安装
3. 检查hardhat.config.ts配置

### 合约部署失败
1. 确保FHEVM Hardhat节点正在运行
2. 检查合约代码中的FHEVM语法
3. 确保导入了正确的FHEVM库

### 前端连接问题
1. 确保MetaMask连接到localhost:8545
2. 检查前端Mock FHEVM配置
3. 确保合约已正确部署

## 开发流程
1. 启动FHEVM Hardhat节点
2. 部署合约
3. 启动前端应用
4. 在MetaMask中连接到localhost:8545
5. 测试同态加密功能

## 注意事项
- FHEVM操作比普通EVM操作更消耗计算资源
- 加密数据的比较和运算需要特殊处理
- 只有被授权的用户才能解密数据
- 在生产环境中需要使用Zama的FHEVM网络
