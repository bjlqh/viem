declare global {
  interface Window {
    ethereum?: any;
  }
}

import React, { useEffect, useState } from "react";
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  custom, 
  parseUnits,
  encodePacked,
  keccak256,
  toHex,
  toBytes,
  hexToSignature,
  signatureToHex
} from "viem";
import { anvil } from "viem/chains";
import MyTokenAbi from "./abi/MyToken.abi.json";
import TokenBankAbi from "./abi/TokenBank.abi.json";
import Permit2Abi from "./abi/Permit2.abi.json";
import TransferHistory from './src/components/TransferHistory';

// 更新为最新部署的合约地址
const myTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const tokenBankAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const permit2Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const publicClient = createPublicClient({
  chain: anvil,
  transport: http("http://127.0.0.1:8545"),
});

// EIP-712 域分隔符
const DOMAIN_SEPARATOR = {
  name: 'Permit2',
  version: '1',
  chainId: '31337', // 改为字符串
  verifyingContract: permit2Address as `0x${string}`,
};

// PermitSingle 类型
const PERMIT_SINGLE_TYPE = [
  { name: 'details', type: 'PermitDetails' },
  { name: 'spender', type: 'address' },
  { name: 'sigDeadline', type: 'uint256' },
] as const;

const PERMIT_DETAILS_TYPE = [
  { name: 'token', type: 'address' },
  { name: 'amount', type: 'uint160' },
  { name: 'expiration', type: 'uint48' },
  { name: 'nonce', type: 'uint48' },
] as const;

export default function TokenBankApp() {
  const [account, setAccount] = useState<`0x${string}` | undefined>(undefined);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [bankBalance, setBankBalance] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");
  const [permit2Nonce, setPermit2Nonce] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);

  // 连接钱包
  async function connectWallet() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] as `0x${string}`);
    } else {
      alert("请安装 MetaMask");
    }
  }

  // 查询余额
  async function fetchBalances() {
    if (!account) return;
    
    try {
      // 查询 Token 余额
      const tokenBal = await publicClient.readContract({
        address: myTokenAddress as `0x${string}`,
        abi: MyTokenAbi,
        functionName: "balanceOf",
        args: [account],
      }) as bigint;
      setTokenBalance(tokenBal.toString());

      // 查询 Bank 存款
      const bankBal = await publicClient.readContract({
        address: tokenBankAddress as `0x${string}`,
        abi: TokenBankAbi,
        functionName: "balances",
        args: [account],
      }) as bigint;
      setBankBalance(bankBal.toString());

      // 查询 Permit2 nonce
      const nonce = await publicClient.readContract({
        address: tokenBankAddress as `0x${string}`,
        abi: TokenBankAbi,
        functionName: "getPermit2Nonce",
        args: [account],
      }) as bigint;
      setPermit2Nonce(nonce.toString());
    } catch (error) {
      console.error("查询余额失败:", error);
    }
  }

  // 普通存款
  async function deposit() {
    if (!account || !amount) return;
    setIsLoading(true);
    
    try {
      const walletClient = createWalletClient({
        chain: anvil,
        transport: custom(window.ethereum),
        account,
      });

      // 1. 先 approve
      await walletClient.writeContract({
        address: myTokenAddress as `0x${string}`,
        abi: MyTokenAbi,
        functionName: "approve",
        args: [tokenBankAddress, parseEther(amount)],
        account,
      });

      // 2. 调用 deposit
      await walletClient.writeContract({
        address: tokenBankAddress as `0x${string}`,
        abi: TokenBankAbi,
        functionName: "deposit",
        args: [parseEther(amount)],
        account,
      });

      await fetchBalances();
    } catch (error) {
      console.error("存款失败:", error);
      alert("存款失败: " + error);
    } finally {
      setIsLoading(false);
    }
  }

  // Permit2 签名存款
  async function depositWithPermit2() {
    if (!account || !amount) return;
    setIsLoading(true);
    
    try {
      const walletClient = createWalletClient({
        chain: anvil,
        transport: custom(window.ethereum),
        account,
      });

      const amountWei = parseEther(amount);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = BigInt(permit2Nonce);

      console.log("调试信息:", {
        account,
        amountWei: amountWei.toString(),
        deadline: deadline.toString(),
        nonce: nonce.toString(),
        permit2Address,
        tokenBankAddress
      });

      // 1. 先授权 Permit2 使用代币
      console.log("步骤1: 授权 Permit2");
      await walletClient.writeContract({
        address: myTokenAddress as `0x${string}`,
        abi: MyTokenAbi,
        functionName: "approve",
        args: [permit2Address, amountWei],
        account,
      });

      // 2. 创建 PermitSingle 数据
      const permitSingle = {
        details: {
          token: myTokenAddress,
          amount: amountWei.toString(),
          expiration: deadline.toString(),
          nonce: nonce.toString(),
        },
        spender: tokenBankAddress,
        sigDeadline: deadline.toString(),
      };

      console.log("步骤2: 创建签名数据", permitSingle);

      // 3. 创建 EIP-712 签名数据
      const signatureData = {
        domain: DOMAIN_SEPARATOR,
        types: {
          PermitSingle: PERMIT_SINGLE_TYPE,
          PermitDetails: PERMIT_DETAILS_TYPE,
        },
        primaryType: 'PermitSingle',
        message: permitSingle,
      };

      console.log("步骤3: EIP-712 数据", signatureData);

      // 4. 请求用户签名
      console.log("步骤4: 请求签名");
      const signature = await walletClient.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(signatureData)],
      });

      console.log("步骤5: 获得签名", signature);

      // 5. 解析签名
      const { v, r, s } = hexToSignature(signature);
      console.log("步骤6: 解析签名", { v, r: r.toString(), s: s.toString() });

      // 6. 调用 depositWithPermit2
      console.log("步骤7: 调用合约");
      await walletClient.writeContract({
        address: tokenBankAddress as `0x${string}`,
        abi: TokenBankAbi,
        functionName: "depositWithPermit2",
        args: [account, amountWei, deadline, v, r, s],
        account,
      });

      await fetchBalances();
      alert("Permit2 签名存款成功！");
    } catch (error) {
      console.error("Permit2 存款失败:", error);
      alert("Permit2 存款失败: " + error);
    } finally {
      setIsLoading(false);
    }
  }

  // 取款
  async function withdraw() {
    if (!account || !amount) return;
    setIsLoading(true);
    
    try {
      const walletClient = createWalletClient({
        chain: anvil,
        transport: custom(window.ethereum),
        account,
      });

      await walletClient.writeContract({
        address: tokenBankAddress as `0x${string}`,
        abi: TokenBankAbi,
        functionName: "withdraw",
        args: [parseEther(amount)],
        account,
      });

      await fetchBalances();
    } catch (error) {
      console.error("取款失败:", error);
      alert("取款失败: " + error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (account) fetchBalances();
  }, [account]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h2>TokenBank Permit2 Demo</h2>
      
      <button 
        onClick={connectWallet}
        style={{ 
          padding: "12px 24px", 
          fontSize: "16px", 
          marginBottom: "20px",
          backgroundColor: account ? "#4CAF50" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {account ? "已连接" : "连接钱包"}
      </button>
      
      {account && (
        <div style={{ marginBottom: "20px" }}>
          <div><strong>当前地址:</strong> {account}</div>
          <div><strong>Token 余额:</strong> {tokenBalance}</div>
          <div><strong>Bank 存款:</strong> {bankBalance}</div>
          <div><strong>Permit2 Nonce:</strong> {permit2Nonce}</div>
        </div>
      )}
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* 左侧：操作面板 */}
        <div>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="输入金额"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "12px", 
                fontSize: "16px",
                marginBottom: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
            
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button 
                onClick={deposit} 
                disabled={isLoading}
                style={{ 
                  padding: "12px 24px", 
                  fontSize: "16px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "处理中..." : "普通存款"}
              </button>
              
              <button 
                onClick={depositWithPermit2}
                disabled={isLoading}
                style={{ 
                  padding: "12px 24px", 
                  fontSize: "16px",
                  backgroundColor: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "处理中..." : "Permit2 签名存款"}
              </button>
              
              <button 
                onClick={withdraw}
                disabled={isLoading}
                style={{ 
                  padding: "12px 24px", 
                  fontSize: "16px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "处理中..." : "取款"}
              </button>
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: "#f5f5f5", 
            padding: "16px", 
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            <h4>使用说明:</h4>
            <ul>
              <li><strong>普通存款:</strong> 需要先授权，然后存款（两步交易）</li>
              <li><strong>Permit2 签名存款:</strong> 通过签名授权，一步完成存款（推荐）</li>
              <li><strong>取款:</strong> 从银行取出已存入的代币</li>
            </ul>
          </div>
        </div>
        
        {/* 右侧：转账记录 */}
        <div>
          {account && <TransferHistory userAddress={account} />}
        </div>
      </div>
    </div>
  );
}