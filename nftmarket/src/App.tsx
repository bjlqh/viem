import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import nftAbi from '../abi/MyERC721.abi.json';
import tokenAbi from '../abi/MyToken.abi.json';
import marketAbi from '../abi/NFTMarket.abi.json';

const NFT_ADDRESS = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TOKEN_ADDRESS = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
const MARKET_ADDRESS = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

function App() {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState('');
  const [price, setPrice] = useState('');
  const [nftaddress, setNFTAddress] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [queryTokenId, setQueryTokenId] = useState('');
  const [queryOwner, setQueryOwner] = useState('');

  // 查询 NFTMarket 上所有 listings
  useEffect(() => {
    async function fetchListings() {
      const results = [];
      const ethers = (window as any).ethers;
      // 1. 查询 listedTokenIds 的长度
      let length = 0;
      try {
        const iface = new ethers.utils.Interface(marketAbi);
        const data = iface.encodeFunctionData('getListedTokenIdsLength');
        const res = await (window as any).ethereum.request({
          method: 'eth_call',
          params: [{
            to: MARKET_ADDRESS,
            data,
          }, 'latest']
        });
        length = parseInt(res, 16);
      } catch (e) {
        console.log('查询 listedTokenIdsLength 异常:', e);
        setListings([]);
        return;
      }
      // 2. 查询所有 listedTokenIds(i)
      for (let i = 0; i < length; i++) {
        try {
          // 查询 tokenId
          const iface = new ethers.utils.Interface(marketAbi);
          const data = iface.encodeFunctionData('listedTokenIds', [i]);
          const res = await (window as any).ethereum.request({
            method: 'eth_call',
            params: [{
              to: MARKET_ADDRESS,
              data,
            }, 'latest']
          });
          const tokenId = parseInt(res, 16);
          // 查询 listings(tokenId)
          const data2 = iface.encodeFunctionData('listings', [tokenId]);
          const res2 = await (window as any).ethereum.request({
            method: 'eth_call',
            params: [{
              to: MARKET_ADDRESS,
              data: data2,
            }, 'latest']
          });
          if (res2 && res2 !== '0x') {
            const seller = '0x' + res2.slice(26, 66);
            const price = parseInt(res2.slice(66, 130), 16);
            results.push({ tokenId, seller, price });
          }
        } catch (e) {
          console.log('查询 listedTokenIds 或 listings 异常:', e);
          continue;
        }
      }
      setListings(results);
    }
    fetchListings();
  }, [refresh]);

  // 铸造 NFT
  const handleMint = async () => {
    if (!tokenUrl) return alert('请输入 tokenUrl');
    if (!nftaddress) return alert('请输入 nftaddress');
    if (!address) return alert('请先连接钱包');
    const ethers = (window as any).ethers;
    if (!ethers) {
      alert('请确保 window.ethers 可用，或用 wagmi/viem 实现');
      return;
    }
    console.log(`铸造时:address是${address}`);
    const iface = new ethers.utils.Interface(nftAbi);
    const data = iface.encodeFunctionData('mint', [address, tokenUrl]);
    const tx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: nftaddress,
        data,
      }]
    });
    await waitForTx(tx);
    alert('铸造成功');
    setRefresh(r => r + 1);
  };

  // 上架 NFT
  const handleList = async () => {
    if (!tokenId || !price) return alert('请输入 tokenId 和 price');
    if (!address) return alert('请先连接钱包');
    const ethers = (window as any).ethers;
    if (!ethers) {
      alert('请确保 window.ethers 可用，或用 wagmi/viem 实现');
      return;
    }
    // 1. 校验 ownerOf
    const iface = new ethers.utils.Interface(nftAbi);
    const data = iface.encodeFunctionData('ownerOf', [tokenId]);
    const owner = await (window as any).ethereum.request({
      method: 'eth_call',
      params: [{
        to: NFT_ADDRESS,
        data,
      }, 'latest']
    });
    if (owner.toLowerCase().slice(-40) !== address.toLowerCase().slice(-40)) {
      console.log(`该nft的owner是${owner}`);
      console.log(`你的钱包地址是${address}`);
      alert('你不是该 NFT 的 owner，不能上架');
      return;
    }
    // 2. 先 approve NFT 给 Market
    const ifaceNFT = new ethers.utils.Interface(nftAbi);
    const approveData = ifaceNFT.encodeFunctionData('approve', [MARKET_ADDRESS, tokenId]);
    const approveTx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: NFT_ADDRESS,
        data: approveData,
      }]
    });
    await waitForTx(approveTx);
    // 3. 调用 list
    const ifaceMarket = new ethers.utils.Interface(marketAbi);
    const listData = ifaceMarket.encodeFunctionData('list', [tokenId, price]);
    const listTx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: MARKET_ADDRESS,
        data: listData,
      }]
    });
    await waitForTx(listTx);
    alert('上架成功');
    setRefresh(r => r + 1);
  };

  // 购买 NFT
  const handleBuy = async (tokenId: number, price: number) => {
    const ethers = (window as any).ethers;
    if (!ethers) {
      alert('请确保 window.ethers 可用，或用 wagmi/viem 实现');
      return;
    }
    // 1. 先 approve Token 给 Market
    const ifaceToken = new ethers.utils.Interface(tokenAbi);
    const approveData = ifaceToken.encodeFunctionData('approve', [MARKET_ADDRESS, price]);
    const approveTx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: TOKEN_ADDRESS,
        data: approveData,
      }]
    });
    await waitForTx(approveTx);
    // 2. 调用 buyNFT
    const ifaceMarket = new ethers.utils.Interface(marketAbi);
    const buyData = ifaceMarket.encodeFunctionData('buyNFT', [tokenId, price]);
    const buyTx = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: MARKET_ADDRESS,
        data: buyData,
      }]
    });
    await waitForTx(buyTx);
    alert('购买成功');
    setRefresh(r => r + 1);
  };

  // 查询 ownerOf 功能
  const handleQueryOwner = async () => {
    if (!queryTokenId) return alert('请输入 tokenId');
    const ethers = (window as any).ethers;
    if (!ethers) {
      alert('请确保 window.ethers 可用，或用 wagmi/viem 实现');
      return;
    }
    const iface = new ethers.utils.Interface(nftAbi);
    const data = iface.encodeFunctionData('ownerOf', [queryTokenId]);
    try {
      const owner = await (window as any).ethereum.request({
        method: 'eth_call',
        params: [{
          to: nftaddress || NFT_ADDRESS,
          data,
        }, 'latest']
      });
      // owner 是 32 字节 hex 字符串，取后 40 位
      setQueryOwner('0x' + owner.slice(-40));
    } catch (e) {
      setQueryOwner('查询失败，tokenId 可能不存在');
    }
  };

  // 等待交易上链
  async function waitForTx(tx: string) {
    while (true) {
      const receipt = await (window as any).ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [tx]
      });
      if (receipt && receipt.status === '0x1') break;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>NFTMarket Demo</h1>
      <ConnectButton />
      {isConnected && (
        <>
          <h2>铸造 NFT</h2>
          <input
            placeholder="nftaddress"
            value={nftaddress}
            onChange={e => setNFTAddress(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <input placeholder="tokenUrl" value={tokenUrl} onChange={e => setTokenUrl(e.target.value)} style={{ marginRight: 8 }} />
          <button onClick={handleMint}>铸造</button>

          <h2>上架 NFT</h2>
          <input
            placeholder="tokenId"
            value={tokenId}
            onChange={e => setTokenId(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <input
            placeholder="price"
            value={price}
            onChange={e => setPrice(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={handleList}>上架</button>

          <h2>查询 NFT owner</h2>
          <input
            placeholder="tokenId"
            value={queryTokenId}
            onChange={e => setQueryTokenId(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={handleQueryOwner}>查询 owner</button>
          {queryOwner && <div>owner: {queryOwner}</div>}
        </>
      )}
      <h2>市场 NFT 列表</h2>
      <div>已上架 NFT 数量：{listings.length}</div>
      <table border={1} cellPadding={8} style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>tokenId</th>
            <th>卖家</th>
            <th>价格</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {listings.map(item => (
            <tr key={item.tokenId}>
              <td>{item.tokenId}</td>
              <td>{item.seller}</td>
              <td>{item.price}</td>
              <td>
                {isConnected && item.seller.toLowerCase() !== address?.toLowerCase() && (
                  <button onClick={() => handleBuy(item.tokenId, item.price)}>购买</button>
                )}
                {isConnected && item.seller.toLowerCase() === address?.toLowerCase() && (
                  <span>自己上架</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>切换钱包账号后可用新账号购买 NFT。</p>
    </div>
  );
}

export default App;