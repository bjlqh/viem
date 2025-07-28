import { pool } from '../config/database.js';

export interface TransferRecord {
  id: number;
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  createdAt?: Date;
}

export class TransferService {
  // 添加测试方法
  async testConnection(): Promise<any> {
    try {
      const [rows] = await pool.execute('SELECT 1 as test');
      return rows;
    } catch (error) {
      console.error('数据库连接测试失败:', error);
      throw error;
    }
  }

  async getTransfersSimple(): Promise<any> {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM transfers');
      return rows;
    } catch (error) {
      console.error('简单查询失败:', error);
      throw error;
    }
  }

  async insertTransfer(transfer: Omit<TransferRecord, 'id' | 'createdAt'>): Promise<void> {
    const insertSQL = `
      INSERT IGNORE INTO transfers 
      (token_address, from_address, to_address, amount, block_number, transaction_hash, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await pool.execute(insertSQL, [
        transfer.tokenAddress,
        transfer.fromAddress,
        transfer.toAddress,
        transfer.amount,
        transfer.blockNumber,
        transfer.transactionHash,
        transfer.timestamp
      ]);
    } catch (error) {
      console.error('插入转账记录失败:', error);
      throw error;
    }
  }

  async getTransfersByAddress(address: string, limit: number = 100): Promise<TransferRecord[]> {
    const validLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
    
    const querySQL = `
      SELECT 
        id,
        token_address as tokenAddress,
        from_address as fromAddress,
        to_address as toAddress,
        amount,
        block_number as blockNumber,
        transaction_hash as transactionHash,
        timestamp,
        created_at as createdAt
      FROM transfers 
      WHERE from_address = ? OR to_address = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      // 使用 query 而不是 execute
      const [rows] = await pool.query(querySQL, [address, address, validLimit]);
      return rows as TransferRecord[];
    } catch (error) {
      console.error('查询转账记录失败:', error);
      throw error;
    }
  }

  async getAllTransfers(limit: number = 100): Promise<TransferRecord[]> {
    const querySQL = `
      SELECT 
        id,
        token_address as tokenAddress,
        from_address as fromAddress,
        to_address as toAddress,
        amount,
        block_number as blockNumber,
        transaction_hash as transactionHash,
        timestamp,
        created_at as createdAt
      FROM transfers 
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      const [rows] = await pool.execute(querySQL, [limit]);
      return rows as TransferRecord[];
    } catch (error) {
      console.error('查询所有转账记录失败:', error);
      throw error;
    }
  }

  async getTransferStats(): Promise<{ totalTransfers: number; lastIndexedBlock: number }> {
    const statsSQL = `
      SELECT 
        COUNT(*) as totalTransfers,
        MAX(block_number) as lastIndexedBlock
      FROM transfers
    `;

    try {
      const [rows] = await pool.execute(statsSQL);
      const result = (rows as any)[0];
      return {
        totalTransfers: result.totalTransfers || 0,
        lastIndexedBlock: result.lastIndexedBlock || 0
      };
    } catch (error) {
      console.error('查询统计信息失败:', error);
      throw error;
    }
  }

  async getTransfersByToken(tokenAddress: string, limit: number = 100): Promise<TransferRecord[]> {
    const querySQL = `
      SELECT 
        id,
        token_address as tokenAddress,
        from_address as fromAddress,
        to_address as toAddress,
        amount,
        block_number as blockNumber,
        transaction_hash as transactionHash,
        timestamp,
        created_at as createdAt
      FROM transfers 
      WHERE token_address = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      const [rows] = await pool.execute(querySQL, [tokenAddress, limit]);
      return rows as TransferRecord[];
    } catch (error) {
      console.error('查询代币转账记录失败:', error);
      throw error;
    }
  }

  // 添加一个简单的测试方法
  async testQuery(): Promise<any> {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM transfers');
      return rows;
    } catch (error) {
      console.error('测试查询失败:', error);
      throw error;
    }
  }
}