"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var viem_1 = require("viem");
var chains_1 = require("viem/chains");
var sepoliaUrl = "https://eth-sepolia.g.alchemy.com/v2/sUw2f_qi4BEhxg0RwpyX-";
var mainnetUrl = "https://eth-mainnet.g.alchemy.com/v2/sUw2f_qi4BEhxg0RwpyX-";
//创建一个链接到sepolia的client
var sepoliaClient = (0, viem_1.createPublicClient)({
    chain: chains_1.sepolia,
    transport: (0, viem_1.http)(sepoliaUrl),
});
var mainnetClient = (0, viem_1.createPublicClient)({
    chain: chains_1.mainnet,
    transport: (0, viem_1.http)(mainnetUrl),
});
function getBlockNumber() {
    return __awaiter(this, void 0, void 0, function () {
        var sepoliaBlockNumber, mainnetBlockNumber;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sepoliaClient.getBlockNumber()];
                case 1:
                    sepoliaBlockNumber = _a.sent();
                    return [4 /*yield*/, mainnetClient.getBlockNumber()];
                case 2:
                    mainnetBlockNumber = _a.sent();
                    console.log("sepolia block number: ".concat(sepoliaBlockNumber));
                    console.log("mainnet block number: ".concat(mainnetBlockNumber));
                    return [2 /*return*/];
            }
        });
    });
}
getBlockNumber();
var erc20Abi = [
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
];
var user = "0x94e36d6D669b44701982838F54365936d9404217";
var contractAddress = "0x1C9Ac2dccF73381b3a08b571412da65E5dA99C5a";
//获取user用户的合约余额
function getERC20Balance() {
    return __awaiter(this, void 0, void 0, function () {
        var balance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sepoliaClient.readContract({
                        address: contractAddress,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [user],
                    })];
                case 1:
                    balance = _a.sent();
                    console.log("mytoken balance of ".concat(user, ": ").concat(balance));
                    return [2 /*return*/];
            }
        });
    });
}
getERC20Balance();
var account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
var privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
var localUrl = "http://127.0.0.1:8545";
var account1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
var walletClient = (0, viem_1.createWalletClient)({
    account: account,
    chain: chains_1.foundry,
    transport: (0, viem_1.http)(localUrl),
}).extend(viem_1.publicActions);
function sendTransaction() {
    return __awaiter(this, void 0, void 0, function () {
        var walletAddress, tx, balance1, balance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, walletClient.getAddresses()];
                case 1:
                    walletAddress = _a.sent();
                    console.log("wallet address: ".concat(walletAddress));
                    return [4 /*yield*/, walletClient.sendTransaction({
                            account: account,
                            to: account1,
                            value: (0, viem_1.parseEther)("1"),
                        })];
                case 2:
                    tx = _a.sent();
                    console.log("tx hash: ".concat(tx));
                    return [4 /*yield*/, walletClient.getBalance({ address: account1 })];
                case 3:
                    balance1 = _a.sent();
                    console.log("account1 balance: ".concat((0, viem_1.formatEther)(balance1)));
                    return [4 /*yield*/, walletClient.getBalance({ address: account })];
                case 4:
                    balance = _a.sent();
                    console.log("account balance: ".concat((0, viem_1.formatEther)(balance)));
                    return [2 /*return*/];
            }
        });
    });
}
sendTransaction();
