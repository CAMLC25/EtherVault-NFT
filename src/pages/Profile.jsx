import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { 
  Wallet, Tag, Gavel, Image as ImageIcon, Activity, 
  ArrowRightLeft, Sparkles, ShoppingCart, UserX, Copy, 
  Check, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2, X, ArchiveX, Trophy
} from 'lucide-react';
import { NFT_ADDRESS, MARKETPLACE_ADDRESS, AUCTION_ADDRESS, BANK_ADDRESS } from '../constants';

export default function Profile() {
  const { account, nft, market, auction, bank } = useWeb3();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collected'); 
  // 💡 CẬP NHẬT 1: Thêm mảng 'created' vào State
  const [userNFTs, setUserNFTs] = useState({ collected: [], listed: [], auctioning: [], created: [], activity: [] });
  const [profileBalance, setProfileBalance] = useState("0.000");

  const [displayLimit, setDisplayLimit] = useState(10);
  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });
  const [copiedId, setCopiedId] = useState(null);

  const profileAddress = id || account;
  const isMyProfile = account && profileAddress?.toLowerCase() === account?.toLowerCase();
  
  const getProfileIdentity = () => {
    if (!profileAddress) return { label: "Chưa kết nối", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" };
    
    const addr = profileAddress.toLowerCase();
    if (account && addr === account.toLowerCase()) 
        return { label: "Hồ sơ của bạn", color: "bg-green-100 text-green-700", dot: "bg-green-500" };
    if (addr === NFT_ADDRESS.toLowerCase()) 
        return { label: "Hợp đồng NFT (Core)", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
    if (addr === MARKETPLACE_ADDRESS.toLowerCase()) 
        return { label: "Hợp đồng Marketplace", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" };
    if (addr === AUCTION_ADDRESS.toLowerCase()) 
        return { label: "Hợp đồng Đấu giá", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" };
    if (addr === BANK_ADDRESS.toLowerCase()) 
        return { label: "Hợp đồng Ngân hàng", color: "bg-teal-100 text-teal-700", dot: "bg-teal-500" };
    
    return { label: "Hồ sơ người dùng", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
  };

  const identity = getProfileIdentity();
  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id); 
    setTimeout(() => setCopiedId(null), 3000); 
  };

  const generateGradient = (address) => {
    if (!address) return "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)";
    const c1 = `#${address.slice(2, 8)}`; const c2 = `#${address.slice(8, 14)}`; const c3 = `#${address.slice(-6)}`;
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  };

  useEffect(() => { setDisplayLimit(10); }, [activeTab]);

  const fetchUserData = async () => {
    if (!profileAddress || !nft || !market || !auction) return;
    setLoading(true);
    try {
      if (nft.provider) {
        const bal = await nft.provider.getBalance(profileAddress);
        setProfileBalance(ethers.utils.formatEther(bal));
      }
      
      const filterTo = nft.filters.Transfer(null, profileAddress);
      const filterFrom = nft.filters.Transfer(profileAddress, null);
      const [logsTo, logsFrom] = await Promise.all([nft.queryFilter(filterTo), nft.queryFilter(filterFrom)]);
      const receivedIds = [...new Set(logsTo.map(log => log.args.tokenId.toNumber()))];
      
      const ownedPromises = receivedIds.map(async (tokenId) => {
        try {
          const owner = await nft.ownerOf(tokenId);
          if (owner.toLowerCase() === profileAddress.toLowerCase()) {
            const uri = await nft.tokenURI(tokenId);
            const meta = await (await fetch(uri)).json();
            return { id: tokenId, name: meta.name, img: meta.thumbnail || meta.image || meta.asset, category: meta.category || "General", type: 'owned' };
          }
        } catch (e) { return null; } return null;
      });

      // 💡 CẬP NHẬT 2: Logic lấy dữ liệu "Đã tạo" (từ AddressZero)
      const mintLogs = logsTo.filter(log => log.args.from === ethers.constants.AddressZero);
      const mintedIds = [...new Set(mintLogs.map(log => log.args.tokenId.toNumber()))];
      const createdPromises = mintedIds.map(async (tokenId) => {
        try {
          const uri = await nft.tokenURI(tokenId);
          const meta = await (await fetch(uri)).json();
          return { id: tokenId, name: meta.name, img: meta.thumbnail || meta.image || meta.asset, category: meta.category || "General", type: 'created' };
        } catch (e) { return null; }
      });

      const listedIds = await market.getAllListedTokenIds();
      const listedPromises = listedIds.map(async (idBN) => {
        const tokenId = idBN.toNumber();
        const listing = await market.listings(tokenId);
        if (listing.active && listing.seller.toLowerCase() === profileAddress.toLowerCase()) {
          const uri = await nft.tokenURI(tokenId);
          const meta = await (await fetch(uri)).json();
          return { id: tokenId, name: meta.name, img: meta.thumbnail || meta.image || meta.asset, category: meta.category || "General", price: ethers.utils.formatEther(listing.price), type: 'fixed' };
        } return null;
      });

      const auctionIds = await auction.getAllAuctionTokenIds();
      const auctionPromises = auctionIds.map(async (idBN) => {
        const tokenId = idBN.toNumber();
        const auc = await auction.auctions(tokenId);
        if (auc.active && auc.seller.toLowerCase() === profileAddress.toLowerCase()) {
          const uri = await nft.tokenURI(tokenId);
          const meta = await (await fetch(uri)).json();
          const currentPrice = auc.highestBid.toString() === "0" ? auc.minPrice : auc.highestBid;
          return { id: tokenId, name: meta.name, img: meta.thumbnail || meta.image || meta.asset, category: meta.category || "General", price: ethers.utils.formatEther(currentPrice), type: 'auction' };
        } return null;
      });

      const sentToMarketLogs = logsFrom.filter(log => (market && log.args.to === market.address) || (auction && log.args.to === auction.address));
      const marketTokenIds = [...new Set(sentToMarketLogs.map(l => l.args.tokenId.toNumber()))];
      const historyPromises = marketTokenIds.map(id => nft.queryFilter(nft.filters.Transfer(null, null, id)));
      const historyArrays = await Promise.all(historyPromises);

      const saleLogs = [];
      historyArrays.forEach(history => {
          history.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
          for (let i = 0; i < history.length - 1; i++) {
              const log = history[i];
              if (log.args.from.toLowerCase() === profileAddress.toLowerCase() && ((market && log.args.to === market.address) || (auction && log.args.to === auction.address))) {
                  const nextLog = history[i+1];
                  if (nextLog && nextLog.args.from === log.args.to) { saleLogs.push(nextLog); }
              }
          }
      });

      const combinedLogs = [...logsTo, ...logsFrom, ...saleLogs];
      const uniqueLogs = combinedLogs.filter((v, i, a) => a.findIndex(t => (t.transactionHash === v.transactionHash && t.logIndex === v.logIndex)) === i);
      const allNftLogs = uniqueLogs.sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 50);

      const nftActivityPromises = allNftLogs.map(async (log) => {
        const fromAddr = log.args.from; const toAddr = log.args.to; const tokenId = log.args.tokenId.toNumber();
        const [block, tx, uri] = await Promise.all([ log.getBlock(), log.getTransaction(), nft.tokenURI(tokenId).catch(() => null) ]);
        let img = "https://picsum.photos/100"; let name = `NFT #${tokenId}`; let category = "image";
        if (uri) { try { const meta = await (await fetch(uri)).json(); img = meta.thumbnail || meta.image || meta.asset; name = meta.name; category = meta.category || "image"; } catch(e) {} }
        
        let eventType = "Chuyển giao";
        let txPrice = "-";

        if (fromAddr === ethers.constants.AddressZero) {
            eventType = "Đã đúc (Mint)";
        } else if (market && toAddr === market.address) {
            eventType = "Niêm yết"; 
        } else if (auction && toAddr === auction.address) {
            eventType = "Mở đấu giá"; 
        } else if (market && fromAddr === market.address) {
            if (toAddr.toLowerCase() === profileAddress.toLowerCase()) {
                if (!tx || tx.value.isZero()) eventType = "Hủy niêm yết";
                else { eventType = "Đã mua"; txPrice = ethers.utils.formatEther(tx.value); }
            } else {
                eventType = "Bán thành công";
                txPrice = tx && tx.value && tx.value.gt(0) ? ethers.utils.formatEther(tx.value) : "-";
            }
        } else if (auction && fromAddr === auction.address) {
            if (toAddr.toLowerCase() === profileAddress.toLowerCase()) {
                try {
                    const bids = await auction.queryFilter(auction.filters.BidPlaced(ethers.BigNumber.from(tokenId)), 0, log.blockNumber);
                    if (bids.length > 0) {
                        eventType = "Thắng thầu";
                        txPrice = ethers.utils.formatEther(bids[bids.length - 1].args.amount);
                    } else eventType = "Kết thúc (Ế)";
                } catch(e) { eventType = "Kết thúc (Ế)"; }
            } else {
                eventType = "Đấu giá thành công";
                try {
                    const bids = await auction.queryFilter(auction.filters.BidPlaced(ethers.BigNumber.from(tokenId)), 0, log.blockNumber);
                    if (bids.length > 0) txPrice = ethers.utils.formatEther(bids[bids.length - 1].args.amount);
                } catch(e) {}
            }
        } else if (fromAddr.toLowerCase() === profileAddress.toLowerCase()) {
            eventType = "Chuyển đi"; 
        } else if (toAddr.toLowerCase() === profileAddress.toLowerCase()) {
            eventType = "Đã nhận";
        }

        return { id: log.transactionHash, type: eventType, item: { id: tokenId, name, img, category }, price: txPrice, from: fromAddr, to: toAddr, timestamp: block ? block.timestamp : Math.floor(Date.now() / 1000) };
      });

      let bankActivityPromises = [];
      if (bank) {
        const filterBankTo = bank.filters.TransferETH(null, profileAddress);
        const filterBankFrom = bank.filters.TransferETH(profileAddress, null);
        const [bankLogsTo, bankLogsFrom] = await Promise.all([ bank.queryFilter(filterBankTo), bank.queryFilter(filterBankFrom) ]);
        const allBankLogs = [...bankLogsTo, ...bankLogsFrom].filter((v, i, a) => a.findIndex(t => (t.transactionHash === v.transactionHash)) === i).sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 50);
        
        bankActivityPromises = allBankLogs.map(async (log) => {
          const fromAddr = log.args.from; const toAddr = log.args.to; const amount = log.args.amount;
          const [block] = await Promise.all([log.getBlock()]);
          let eventType = fromAddr.toLowerCase() === profileAddress.toLowerCase() ? "Chuyển ETH" : "Nhận ETH";
          
          return { 
            id: log.transactionHash, type: eventType, 
            item: { id: "ETH", name: "Ethereum", img: "https://cryptologos.cc/logos/ethereum-eth-logo.png", category: "Currency" }, 
            price: ethers.utils.formatEther(amount), from: fromAddr, to: toAddr, timestamp: block ? block.timestamp : Math.floor(Date.now() / 1000) 
          };
        });
      }

      // 💡 CẬP NHẬT 3: Gom Promise.all cho 'rawCreated'
      const [rawCollected, rawListed, rawAuctioning, rawCreated, nftActivities, bankActivities] = await Promise.all([
        Promise.all(ownedPromises), Promise.all(listedPromises), Promise.all(auctionPromises), Promise.all(createdPromises), Promise.all(nftActivityPromises), Promise.all(bankActivityPromises)
      ]);
      const allActivities = [...nftActivities, ...bankActivities].sort((a, b) => b.timestamp - a.timestamp);
      const cleanData = (arr) => arr.filter(item => item !== null).filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i).reverse();
      
      // 💡 CẬP NHẬT 4: Gán dữ liệu 'created' vào State
      setUserNFTs({ 
        collected: cleanData(rawCollected), 
        listed: cleanData(rawListed), 
        auctioning: cleanData(rawAuctioning), 
        created: cleanData(rawCreated), 
        activity: allActivities 
      });
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchUserData(); }, [profileAddress, nft, market, auction, bank]);

  const currentDisplayData = userNFTs[activeTab];
  const displayedItems = currentDisplayData ? currentDisplayData.slice(0, displayLimit) : [];
  const hasMore = currentDisplayData ? currentDisplayData.length > displayLimit : false;

  const getEventStyle = (type) => {
    switch(type) {
      case "Đã đúc (Mint)": return { color: "text-yellow-500", icon: <Sparkles size={16}/>, sign: "" };
      case "Đã mua": return { color: "text-red-500", icon: <ShoppingCart size={16}/>, sign: "-" };
      case "Thắng thầu": return { color: "text-red-500", icon: <Gavel size={16}/>, sign: "-" };
      case "Bán thành công": return { color: "text-green-600", icon: <CheckCircle2 size={16}/>, sign: "+" };
      case "Đấu giá thành công": return { color: "text-green-600", icon: <Trophy size={16}/>, sign: "+" };
      case "Hủy niêm yết": return { color: "text-orange-500", icon: <ArchiveX size={16}/>, sign: "" };
      case "Kết thúc (Ế)": return { color: "text-orange-500", icon: <ArchiveX size={16}/>, sign: "" };
      case "Chuyển đi": return { color: "text-orange-500", icon: <ArrowUpRight size={16}/>, sign: "" };
      case "Đã nhận": return { color: "text-teal-500", icon: <ArrowDownLeft size={16}/>, sign: "" };
      case "Nhận ETH": return { color: "text-blue-600", icon: <ArrowDownLeft size={16}/>, sign: "+" };
      case "Chuyển ETH": return { color: "text-red-500", icon: <ArrowUpRight size={16}/>, sign: "-" };
      case "Niêm yết": return { color: "text-blue-500", icon: <Tag size={16}/>, sign: "" };
      case "Mở đấu giá": return { color: "text-purple-500", icon: <Tag size={16}/>, sign: "" };
      default: return { color: "text-gray-500", icon: <ArrowRightLeft size={16}/>, sign: "" };
    }
  };

  const handleActivityClick = (tokenId) => {
    if (tokenId === "ETH") return; 
    if (userNFTs.listed.find(i => i.id === tokenId)) return navigate(`/explore/${tokenId}`);
    if (userNFTs.auctioning.find(i => i.id === tokenId)) return navigate(`/auction/${tokenId}`);
    if (isMyProfile && userNFTs.collected.find(i => i.id === tokenId)) return navigate(`/owned/${tokenId}`);
    navigate(`/explore/${tokenId}`);
  };

  if (!profileAddress) return <div className="text-center py-32"><Wallet size={48} className="mx-auto text-gray-300 mb-4" /><h2 className="text-2xl font-bold">Vui lòng kết nối ví</h2></div>;

  return (
    <div className="max-w-[1440px] mx-auto p-6 lg:p-12 animate-in fade-in duration-500 relative">
      
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setDialog({ ...dialog, isOpen: false })} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner ${dialog.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {dialog.type === 'error' ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
            </div>
            <h3 className="text-2xl font-black text-center text-gray-900 mb-2">{dialog.title}</h3>
            <p className="text-center text-gray-500 font-medium mb-8 leading-relaxed">{dialog.message}</p>
            <button onClick={() => setDialog({ ...dialog, isOpen: false })} className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'}`}>Đã hiểu</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden mb-12">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10 relative z-10">
          <div className="w-40 h-40 rounded-full border-[6px] border-white overflow-hidden shadow-2xl shrink-0 bg-gray-100">
             <div className="w-full h-full" style={{ background: generateGradient(profileAddress) }}></div>
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
              <h1 onClick={() => handleCopy(profileAddress, "mainWallet")} className="text-4xl lg:text-5xl font-black tracking-tighter text-gray-900 font-mono cursor-pointer hover:text-blue-600 transition-colors flex items-center justify-center md:justify-start gap-3 group" title="Copy Address">
                {shortenAddress(profileAddress)}
                {copiedId === "mainWallet" ? <Check size={28} className="text-green-500"/> : <Copy size={24} className="text-gray-300 group-hover:text-blue-500"/>}
              </h1>
              <span className={`${identity.color} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit mx-auto md:mx-0 shadow-sm`}>
                <span className={`w-2 h-2 rounded-full ${identity.dot} animate-pulse`}></span>
                {identity.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-200 font-mono text-sm text-gray-600">
                <Wallet size={16} className="text-gray-400" />
                <span className="select-all">{profileAddress}</span>
              </div>
              {isMyProfile && (
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-900 to-[#1A1B22] px-6 py-2.5 rounded-2xl border border-gray-800 shadow-lg text-white font-mono text-sm group animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-center w-5 h-5 bg-blue-500/20 rounded-full group-hover:bg-blue-500/40 transition-colors"><svg width="10" height="16" viewBox="0 0 320 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" fill="#60A5FA"/></svg></div>
                  <span className="font-bold tracking-wide">{parseFloat(profileBalance).toFixed(3)} ETH</span>
                  <div className="relative flex items-center justify-center w-2.5 h-2.5 ml-1">
                    <span className="absolute inline-flex w-full h-full bg-green-400 opacity-50 rounded-full animate-ping"></span>
                    <span className="relative inline-flex w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 💡 CẬP NHẬT 5: Thêm nút Tab "Đã tạo" trên thanh điều hướng */}
      <div className="flex flex-wrap gap-6 mb-10 border-b border-gray-100 pb-px">
        <button onClick={() => setActiveTab('collected')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'collected' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}><ImageIcon size={18}/> Đang sở hữu ({userNFTs.collected.length})</button>
        
        <button onClick={() => setActiveTab('created')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'created' ? "text-pink-500 border-b-2 border-pink-500" : "text-gray-400 hover:text-gray-600"}`}><Sparkles size={18}/> Đã tạo ({userNFTs.created.length})</button>
        
        <button onClick={() => setActiveTab('listed')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'listed' ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-400 hover:text-gray-600"}`}><Tag size={18}/> Đang niêm yết ({userNFTs.listed.length})</button>
        <button onClick={() => setActiveTab('auctioning')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'auctioning' ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-400 hover:text-gray-600"}`}><Gavel size={18}/> Đang đấu giá ({userNFTs.auctioning.length})</button>
        <button onClick={() => setActiveTab('activity')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'activity' ? "text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:text-gray-600"}`}><Activity size={18}/> Hoạt động</button>
      </div>

      {/* NỘI DUNG */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="font-bold text-gray-500 uppercase">Đang đồng bộ...</p></div>
      ) : activeTab === 'activity' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-widest text-gray-500"><th className="p-6 font-bold">Sự kiện</th><th className="p-6 font-bold">Vật phẩm</th><th className="p-6 font-bold">Dòng tiền</th><th className="p-6 font-bold">Từ</th><th className="p-6 font-bold">Đến</th><th className="p-6 font-bold text-right">Thời gian</th></tr></thead>
                <tbody>
                  {displayedItems.length === 0 ? (<tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">Chưa có hoạt động nào.</td></tr>) : (
                    displayedItems.map((log, index) => {
                      const style = getEventStyle(log.type);
                      return (
                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="p-6">
                            <div className={`flex items-center gap-2 font-bold ${style.color}`}>
                              {style.icon} {log.type}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className={`flex items-center gap-4 group w-fit ${log.item.id === "ETH" ? "" : "cursor-pointer"}`} onClick={() => handleActivityClick(log.item.id)}>
                              <div className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white flex items-center justify-center border border-gray-100 p-1">
                                 <img src={log.item.img} className={`w-full h-full ${log.item.id === "ETH" ? "object-contain" : "object-cover rounded-lg"}`} alt="thumb" />
                              </div>
                              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{log.item.name}</span>
                            </div>
                          </td>
                          <td className="p-6 font-mono text-sm font-black">
                            {log.price !== "-" ? (
                              <span className={`px-3 py-1.5 rounded-lg ${style.sign === '+' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                                {style.sign}{log.price} ETH
                              </span>
                            ) : (
                              <span className="text-gray-400 font-bold">-</span>
                            )}
                          </td>
                          <td className="p-6 font-mono text-xs">
                            {log.from === ethers.constants.AddressZero ? ( 
                              <span className="text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">HỆ THỐNG</span> 
                            ) : log.from.toLowerCase() === profileAddress.toLowerCase() ? (
                              <span className="bg-gray-900 text-white font-bold px-2 py-1 rounded">BẠN</span>
                            ) : (
                              <div onClick={() => navigate(`/profile/${log.from}`)} className="flex items-center gap-2 cursor-pointer group w-fit">
                                <span className="text-blue-600 hover:underline">{shortenAddress(log.from)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-6 font-mono text-xs">
                            {log.to === ethers.constants.AddressZero ? ( 
                              <span className="text-gray-400">-</span> 
                            ) : log.to.toLowerCase() === profileAddress.toLowerCase() ? (
                              <span className="bg-gray-900 text-white font-bold px-2 py-1 rounded">BẠN</span>
                            ) : (
                              <div onClick={() => navigate(`/profile/${log.to}`)} className="flex items-center gap-2 cursor-pointer group w-fit">
                                <span className="text-blue-600 hover:underline">{shortenAddress(log.to)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-6 text-right text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {hasMore && (<div className="text-center pt-4 pb-12"><button onClick={() => setDisplayLimit(prev => prev + 10)} className="bg-white border-2 border-gray-200 text-gray-600 hover:border-blue-600 font-bold py-3 px-8 rounded-full transition-all shadow-sm active:scale-95">Xem thêm lịch sử ▾</button></div>)}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayedItems.length === 0 ? (<div className="col-span-full text-center py-32 bg-white rounded-[3rem] border border-gray-100 border-dashed w-full"><UserX size={48} className="mx-auto text-gray-300 mb-4" /><h2 className="text-2xl font-bold">Ví này trống</h2></div>) : (
              displayedItems.map((item) => (
                // 💡 CẬP NHẬT 6: Logic onClick xử lý cho item.type === 'created'
                <div key={item.id} onClick={() => navigate(item.type === 'created' ? `/explore/${item.id}` : item.type === 'fixed' ? `/explore/${item.id}` : item.type === 'auction' ? `/auction/${item.id}` : isMyProfile ? `/owned/${item.id}` : `/explore/${item.id}`)} className="group bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col cursor-pointer">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden"><img src={item.img} className="w-full h-full object-cover group-hover:scale-110 duration-1000" alt={item.name} /><div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-gray-900 shadow-sm">{item.category}</div></div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-black text-gray-900 truncate mb-4 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                    <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-end">
                      {/* 💡 CẬP NHẬT 7: Giao diện hiển thị Status cho "Đã tạo" */}
                      {item.type === 'owned' ? (
                        isMyProfile ? <span className="text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl uppercase tracking-wider w-full text-center hover:bg-blue-700">Niêm yết / Đấu giá</span> : <span className="text-xs font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl uppercase tracking-wider w-full text-center">Tài sản cá nhân</span>
                      ) : item.type === 'created' ? (
                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-xl uppercase tracking-wider w-full text-center hover:bg-gray-200">Tác phẩm gốc</span>
                      ) : (
                        <div><p className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${item.type === 'auction' ? 'text-orange-500' : 'text-purple-600'}`}>{item.type === 'auction' ? "Đang đấu giá" : "Đang niêm yết"}</p><p className="text-xl font-black text-gray-900 italic">{item.price} ETH</p></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {hasMore && (<div className="text-center pt-4 pb-12"><button onClick={() => setDisplayLimit(prev => prev + 10)} className="bg-white border-2 border-gray-200 text-gray-600 hover:border-blue-600 font-bold py-3 px-8 rounded-full shadow-sm active:scale-95">Xem thêm tác phẩm ▾</button></div>)}
        </div>
      )}
    </div>
  );
}