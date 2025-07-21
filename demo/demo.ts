import {
    http,
    createPublicClient,
    createWalletClient,
    publicActions,
    parseEther,
    formatEther,
} from "viem";

import { sepolia, mainnet, foundry } from "viem/chains";

const sepoliaUrl = "https://eth-sepolia.g.alchemy.com/v2/sUw2f_qi4BEhxg0RwpyX-";
const mainnetUrl = "https://eth-mainnet.g.alchemy.com/v2/sUw2f_qi4BEhxg0RwpyX-";

//创建一个链接到sepolia的client
const sepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaUrl),
});

const mainnetClient = createPublicClient({
    chain: mainnet,
    transport: http(mainnetUrl),
});


async function getBlockNumber() {
    const sepoliaBlockNumber = await sepoliaClient.getBlockNumber();
    const mainnetBlockNumber = await mainnetClient.getBlockNumber();
    console.log(`sepolia block number: ${sepoliaBlockNumber}`);
    console.log(`mainnet block number: ${mainnetBlockNumber}`);
}

getBlockNumber();

const erc20Abi = [
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]

const user = "0x94e36d6D669b44701982838F54365936d9404217";
const contractAddress = "0x1C9Ac2dccF73381b3a08b571412da65E5dA99C5a";

//获取user用户的合约余额
async function getERC20Balance() {
    const balance = await sepoliaClient.readContract({
        address: contractAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [user],
    });
    console.log(`mytoken balance of ${user}: ${balance}`);
}

getERC20Balance();


const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const localUrl = "http://127.0.0.1:8545";
const account1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(localUrl),
}).extend(publicActions);

async function sendTransaction() {
    
    const walletAddress = await walletClient.getAddresses();
    console.log(`wallet address: ${walletAddress}`);
    
    //发送eth给另一个账户
    const tx = await walletClient.sendTransaction({
        account,
        to: account1,
        value: parseEther("1"),
    });

    console.log(`tx hash: ${tx}`);

    //查询account1的余额
    const balance1 = await walletClient.getBalance({address: account1});
    console.log(`account1 balance: ${formatEther(balance1)}`);

    //查询account的余额
    const balance = await walletClient.getBalance({address: account});
    console.log(`account balance: ${formatEther(balance)}`);
}

sendTransaction();
