require('dotenv').config();
const { createWalletClient, http, parseEther, formatEther, createPublicClient, parseUnits, encodeFunctionData } = require('viem');
const { privateKeyToAccount } = require("viem/accounts");
const { sepolia } = require("viem/chains");
const prompts = require("prompts");
const ERC20_ABI = [
    // 只包含 balanceOf, transfer, decimals
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
    { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "type": "function" },
    { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" }
];
const rpcUrl = process.env.SEPOLIA_RPC_URL;
const erc20Address = process.env.SEPOLIA_ERC20_ADDRESS;

async function main() {

    const { action } = await prompts({
        type: 'select',
        name: 'action',
        message: '请选择操作',
        choices: [
            { title: '生成新钱包', value: 'generate' },
            { title: '查询余额', value: 'balance' },
            { title: '转账', value: 'transfer' },
        ]
    });

    if (action === 'generate') {
        const { randomBytes } = require("crypto");
        const privateKey = '0x' + randomBytes(32).toString('hex');
        const account = privateKeyToAccount(privateKey);
        console.log('钱包地址:', account.address);
        console.log('私钥:', privateKey);
        return;
    }

    //创建客户端
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl),
    });

    if (action === 'balance') {
        const { address } = await prompts({
            type: 'text',
            name: 'address',
            message: '请输入钱包地址',
        });


        //查询ERC20代币余额
        const decimals = await publicClient.readContract({
            address: erc20Address,
            abi: ERC20_ABI,
            functionName: 'decimals'
        });

        const balance = await publicClient.readContract({
            address: erc20Address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
        });
        console.log('ERC20代币余额:', Number(balance) / 10 ** decimals);
        return;
    }

    if (action === 'transfer') {
        const { privateKey } = await prompts({
            type: 'text',
            name: 'privateKey',
            message: '请输入发送方私钥',
        });
        const account = privateKeyToAccount(privateKey);

        const { to, amount } = await prompts([
            {
                type: 'text',
                name: 'to',
                message: '请输入接收地址',
            }, {
                type: 'text',
                name: 'amount',
                message: '请输入转账金额',
            }
        ]);

        const decimals = await publicClient.readContract({
            address: erc20Address,
            abi: ERC20_ABI,
            functionName: 'decimals'
        });

        const value = parseUnits(amount, decimals);

        // 构建 EIP-1559 交易
        /* const { request } = await publicClient.simulateContract({
            address: erc20Address,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, value],
            account: account.address
        }); */
        //viem 2.33版本publicClient.simulateContract生成的request对象里面没有data数据。只能手动编码

        const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, value],
        });

        const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
        const gas = await publicClient.estimateGas({
            to: erc20Address,
            data,
            account: account.address,
        });
        const fee = await publicClient.estimateFeesPerGas();

        const tx = {
            to: erc20Address,
            data,
            gas,
            maxFeePerGas: fee.maxFeePerGas,
            maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
            chainId: sepolia.id,
            nonce,
            value: 0n,
        };

        const signedTx = await account.signTransaction(tx);
        const txHash = await publicClient.sendRawTransaction({ serializedTransaction: signedTx });
        console.log('交易已发送，txHash:', txHash);
        return;
    }
}
main();
