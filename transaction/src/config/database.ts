import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'web3_transactions',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建不指定数据库的连接池（用于初始化）
const initPool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 创建指定数据库的连接池（用于正常操作）
export const pool = mysql.createPool(dbConfig);

export async function initDatabase() {
  try {
    const connection = await initPool.getConnection();
    
    // 创建数据库（如果不存在）
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    connection.release();
    
    // 使用指定数据库的连接池创建表
    const dbConnection = await pool.getConnection();
    
    // 创建转账记录表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS transfers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
        token_address VARCHAR(42) NOT NULL COMMENT '代币地址',
        from_address VARCHAR(42) NOT NULL COMMENT '转出地址',
        to_address VARCHAR(42) NOT NULL COMMENT '转入地址',
        amount DECIMAL(65,0) NOT NULL COMMENT '转账金额(单位wei)',
        block_number BIGINT NOT NULL COMMENT '区块高度(区块号)',
        transaction_hash VARCHAR(66) NOT NULL UNIQUE COMMENT '交易哈希',
        timestamp BIGINT NOT NULL COMMENT '交易时间戳',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_from_address (from_address) COMMENT '转出地址索引',
        INDEX idx_to_address (to_address) COMMENT '转入地址索引',
        INDEX idx_token_address (token_address) COMMENT '代币地址索引',
        INDEX idx_block_number (block_number) COMMENT '区块高度索引',
        INDEX idx_timestamp (timestamp) COMMENT '交易时间戳索引'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代币转账记录表';
    `;
    
    await dbConnection.execute(createTableSQL);
    dbConnection.release();
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}