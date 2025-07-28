
# 使用 Viem 索引链上ERC20 转账数据并展示
## 项目结构
dapp/viem/transaction/
├── src/
│   ├── config/
│   │   └── database.ts          # 数据库配置和连接池
│   ├── services/
│   │   └── TransferService.ts   # 转账记录的业务逻辑
│   ├── indexer.ts               # 区块链索引逻辑
│   └── index.ts                 # 主服务文件
├── package.json
├── tsconfig.json
└── .env

dapp/viem/tokenbank/
├── src/
│   ├── components/
│   │   └── TransferHistory.tsx  # 转账记录展示组件
│   ├── App.tsx
│   └── main.tsx
├── index.tsx                    # 主应用文件
├── package.json
└── tsconfig.json