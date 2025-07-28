import React, { useEffect, useState } from 'react';

interface TransferRecord {
  id: number;
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  createdAt?: string;
}

interface TransferHistoryProps {
  userAddress: string;
}

export default function TransferHistory({ userAddress }: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    if (!userAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/transfers/${userAddress}?limit=50`);
      const result = await response.json();
      
      if (result.success) {
        setTransfers(result.data);
      } else {
        setError(result.error || '获取转账记录失败');
      }
    } catch (err) {
      setError('网络错误，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [userAddress]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string) => {
    // 假设代币有18位小数
    const value = BigInt(amount);
    return (Number(value) / 1e18).toFixed(4);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const getTransferType = (fromAddress: string, toAddress: string, userAddress: string) => {
    if (fromAddress.toLowerCase() === userAddress.toLowerCase()) {
      return { type: '转出', color: 'text-red-500' };
    } else if (toAddress.toLowerCase() === userAddress.toLowerCase()) {
      return { type: '转入', color: 'text-green-500' };
    }
    return { type: '其他', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">转账记录</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">转账记录</h3>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchTransfers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">转账记录</h3>
        <button 
          onClick={fetchTransfers}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          刷新
        </button>
      </div>
      
      {transfers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无转账记录
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transfers.map((transfer) => {
            const { type, color } = getTransferType(transfer.fromAddress, transfer.toAddress, userAddress);
            
            return (
              <div key={transfer.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-medium ${color}`}>
                    {type} {formatAmount(transfer.amount)} MTK
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(transfer.timestamp)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">从:</span> {formatAddress(transfer.fromAddress)}
                  </div>
                  <div>
                    <span className="font-medium">到:</span> {formatAddress(transfer.toAddress)}
                  </div>
                  <div>
                    <span className="font-medium">区块:</span> {transfer.blockNumber}
                  </div>
                  <div>
                    <span className="font-medium">交易:</span> 
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline ml-1"
                    >
                      {formatAddress(transfer.transactionHash)}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}