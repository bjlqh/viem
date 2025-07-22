合约部署好了以后，开始部署前端项目  
到目录：dapp/viem/tokenbank/
运行：npm run dev
访问浏览器：http://localhost:5173/

查询nft的ownerOf
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "listings(uint256)" 1 --rpc-url http://127.0.0.1:8545