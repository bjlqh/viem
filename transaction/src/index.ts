import express from 'express';
import cors from 'cors';
import { createPublicClient, http, getAddress } from 'viem';
import { anvil } from 'viem/chains';
import { initDatabase } from './config/database';
import { TransferService } from './services/TransferService';
import { ERC20Indexer } from './indexer';

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 创建 Viem 客户端
const publicClient = createPublicClient({
  chain: anvil,
  transport: http("http://127.0.0.1:8545"),
});

// 初始化服务
const transferService = new TransferService();
const indexer = new ERC20Indexer(publicClient, transferService);

// API 路由
app.get('/api/transfers/:address', async (req, res) => {
  try {
    const address = getAddress(req.params.address);
    const limit = Number(req.query.limit) || 100;
    const validLimit = Math.max(1, Math.min(1000, limit));
    
    console.log('API 参数:', { address, limit: validLimit }); // 调试用
    
    const transfers = await transferService.getTransfersByAddress(address, validLimit);
    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('API 错误:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/transfers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const transfers = await transferService.getAllTransfers(limit);
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/transfers/token/:tokenAddress', async (req, res) => {
  try {
    const tokenAddress = getAddress(req.params.tokenAddress);
    const limit = parseInt(req.query.limit as string) || 100;
    const transfers = await transferService.getTransfersByToken(tokenAddress, limit);
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await transferService.getTransferStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index', async (req, res) => {
  try {
    const { fromBlock, toBlock } = req.body;
    const result = await indexer.indexTransfers(BigInt(fromBlock), BigInt(toBlock));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/latest', async (req, res) => {
  try {
    const latestBlock = await indexer.getLatestBlockNumber();
    const fromBlock = latestBlock - 1000n; // 索引最近1000个区块
    const result = await indexer.indexTransfers(fromBlock, latestBlock);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 添加测试端点
app.get('/api/test', async (req, res) => {
  try {
    const result = await transferService.testConnection();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/test-transfers', async (req, res) => {
  try {
    const result = await transferService.getTransfersSimple();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 添加定时索引功能
let lastIndexedBlock = 0n;

async function startScheduledIndexing() {
  try {
    // 获取当前最新区块
    const latestBlock = await indexer.getLatestBlockNumber();
    
    // 如果是第一次运行，从最新区块开始
    if (lastIndexedBlock === 0n) {
      lastIndexedBlock = latestBlock;
      console.log(`初始化索引器，当前区块: ${latestBlock}`);
      return;
    }
    
    // 如果新区块数量超过阈值，开始索引
    if (latestBlock > lastIndexedBlock) {
      const fromBlock = lastIndexedBlock + 1n;
      console.log(`开始索引新区块 ${fromBlock} 到 ${latestBlock}`);
      
      await indexer.indexTransfers(fromBlock, latestBlock);
      lastIndexedBlock = latestBlock;
      
      console.log(`索引完成，已索引到区块 ${latestBlock}`);
    }
  } catch (error) {
    console.error('定时索引失败:', error);
  }
}

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    
    app.listen(port, () => {
      console.log(`ERC20 索引服务运行在端口 ${port}`);
      
      // 启动定时索引，每10秒检查一次新区块
      setInterval(startScheduledIndexing, 10000);
      console.log('定时索引器已启动，每10秒检查一次新区块');
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

async function startIndexing() {
  try {
    // 获取最新区块
    const latestBlock = await indexer.getLatestBlockNumber();
    const fromBlock = latestBlock > 1000n ? latestBlock - 1000n : 0n; // 确保不小于 0
    
    console.log(`开始索引区块 ${fromBlock} 到 ${latestBlock}`);
    await indexer.indexTransfers(fromBlock, latestBlock);
    console.log('索引完成');
  } catch (error) {
    console.error('索引失败:', error);
    // 不要因为索引失败而退出程序
  }
}

startServer();