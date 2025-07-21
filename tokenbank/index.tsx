declare global {
    interface Window {
      ethereum?: any;
    }
  }

import React, { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, http, parseEther, custom, parseUnits } from "viem";
import { anvil } from "viem/chains";
import MyTokenAbi from "./abi/MyToken.abi.json";
import TokenBankAbi from "./abi/TokenBank.abi.json";

// 替换为你实际部署的合约地址
const myTokenAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
const tokenBankAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";

const publicClient = createPublicClient({
  chain: anvil,
  transport: http("http://127.0.0.1:8545"),
});

export default function TokenBankApp() {
  const [account, setAccount] = useState<`0x${string}` | undefined>(undefined);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [bankBalance, setBankBalance] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");

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
    // 查询 Token 余额
    const tokenBal = await publicClient.readContract({
      address: myTokenAddress,
      abi: MyTokenAbi,
      functionName: "balanceOf",
      args: [account],
    }) as bigint;
    setTokenBalance(tokenBal.toString());

    // 查询 Bank 存款
    const bankBal = await publicClient.readContract({
      address: tokenBankAddress,
      abi: TokenBankAbi,
      functionName: "balances",
      args: [account],
    }) as bigint;
    setBankBalance(bankBal.toString());
  }

  // 存款
  async function deposit() {
    //const amountWei = parseUnits(amount, 18);
    if (!account || !amount) return;
    const walletClient = createWalletClient({
      chain: anvil,
      transport: custom(window.ethereum),
      account,
    });

    // 1. 先 approve
    await walletClient.writeContract({
      address: myTokenAddress,
      abi: MyTokenAbi,
      functionName: "approve",
      args: [tokenBankAddress, parseEther(amount)],
      account,
    });

    // 2. 调用 deposit
    await walletClient.writeContract({
      address: tokenBankAddress,
      abi: TokenBankAbi,
      functionName: "deposit",
      args: [parseEther(amount)],
      account,
    });

    fetchBalances();
  }

  // 取款
  async function withdraw() {
    if (!account || !amount) return;
    const walletClient = createWalletClient({
      chain: anvil,
      transport: custom(window.ethereum),
      account,
    });

    await walletClient.writeContract({
      address: tokenBankAddress,
      abi: TokenBankAbi,
      functionName: "withdraw",
      args: [parseEther(amount)],
      account,
    });

    fetchBalances();
  }

  useEffect(() => {
    if (account) fetchBalances();
  }, [account]);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 24 }}>
      <h2>TokenBank Demo</h2>
      <button onClick={connectWallet}>{account ? "已连接" : "连接钱包"}</button>
      <div>当前地址: {account}</div>
      <div>Token 余额: {tokenBalance}</div>
      <div>Bank 存款: {bankBalance}</div>
      <input
        type="text"
        placeholder="输入金额"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        style={{ width: "100%", margin: "12px 0" }}
      />
      <button onClick={deposit} style={{ marginRight: 8 }}>存款</button>
      <button onClick={withdraw}>取款</button>
    </div>
  );
}