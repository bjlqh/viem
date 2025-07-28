import { PublicClient, parseAbiItem, getAddress } from 'viem';
import { TransferService, TransferRecord } from './services/TransferService.js';

// ERC20 Transfer 事件 ABI
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export class ERC20Indexer {
  constructor(
    private publicClient: PublicClient,
    private transferService: TransferService
  ) {}

  async indexTransfers(fromBlock: bigint, toBlock: bigint): Promise<{ indexed: number, newTransfers: number }> {
    console.log(`开始索引区块 ${fromBlock} 到 ${toBlock}`);
    
    let newTransfers = 0;
    const batchSize = 1000n;
    
    for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock += batchSize) {
      const endBlock = currentBlock + batchSize > toBlock ? toBlock : currentBlock + batchSize;
      
      try {
        const logs = await this.publicClient.getLogs({
          event: TRANSFER_EVENT,
          fromBlock: currentBlock,
          toBlock: endBlock,
        });

        console.log(`区块 ${currentBlock} 到 ${endBlock} 找到 ${logs.length} 个转账事件`);

        for (const log of logs) {
          try {
            const transfer: Omit<TransferRecord, 'id' | 'createdAt'> = {
              tokenAddress: getAddress(log.address),
              fromAddress: getAddress(log.args.from!),
              toAddress: getAddress(log.args.to!),
              amount: log.args.value!.toString(),
              blockNumber: Number(log.blockNumber),
              transactionHash: log.transactionHash,
              timestamp: Math.floor(Date.now() / 1000), // 简化处理，实际应该从区块获取
            };

            await this.transferService.insertTransfer(transfer);
            newTransfers++;
          } catch (error) {
            console.error('处理转账记录失败:', error);
          }
        }

      } catch (error) {
        console.error(`索引区块 ${currentBlock} 到 ${endBlock} 失败:`, error);
      }
    }

    console.log(`索引完成，新增 ${newTransfers} 个转账记录`);
    return { indexed: Number(toBlock - fromBlock + 1n), newTransfers };
  }

  async getLatestBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }
}