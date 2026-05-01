import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { 
  ArrowLeft, Clock, ShieldCheck, Trophy, FileText, Tag, ShoppingCart, 
  FileCode, User, Wallet, Hash, Layers, Link as LinkIcon, 
  AlertCircle, CheckCircle2, X, Activity, Sparkles, ArrowRightLeft, ArchiveX, ArrowDownLeft
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { NFT_ADDRESS, AUCTION_ADDRESS, MARKETPLACE_ADDRESS } from "../constants"; 

export default function AuctionDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { account, nft, auction, market } = useWeb3();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, ended: false });
  const [bidHistory, setBidHistory] = useState([]); 
  const [nftActivity, setNftActivity] = useState([]);

  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });
  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const generateGradient = (addr) => {
    if (!addr) return "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)";
    const c1 = `#${addr.slice(2, 8)}`;
    const c2 = `#${addr.slice(-6)}`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const fetchDetail = async () => {
    try {
      if (!auction || !nft || !id) return;
      setLoading(true);

      const [auctionData, tokenURI, bidLogs, transferLogs] = await Promise.all([
        auction.auctions(id),
        nft.tokenURI(id),
        auction.queryFilter(auction.filters.BidPlaced(ethers.BigNumber.from(id))),
        nft.queryFilter(nft.filters.Transfer(null, null, Number(id))) 
      ]);

      const response = await fetch(tokenURI);
      const metadata = await response.json();

      const currentStartTime = Number(auctionData.startTime) * 1000;
      const history = bidLogs
        .map(log => ({
          bidder: log.args.bidder,
          amount: ethers.utils.formatEther(log.args.amount),
          timestamp: Number(log.args.timestamp) * 1000
        }))
        .filter(bid => bid.timestamp >= currentStartTime)
        .reverse(); 
      setBidHistory(history);

      const actData = await Promise.all(transferLogs.map(async (log) => {
        const from = log.args.from;
        const to = log.args.to;
        const [block, tx] = await Promise.all([log.getBlock(), log.getTransaction()]);
        
        let type = "Chuyển giao";
        let txPrice = "-";

        if (from === ethers.constants.AddressZero) {
            type = "Đã đúc (Mint)";
        } else if (market && to === market.address) {
            type = "Niêm yết";
        } else if (auction && to === auction.address) {
            type = "Mở đấu giá";
        } else if (market && from === market.address) {
            if (!tx || tx.value.isZero()) {
                type = "Hủy niêm yết";
            } else {
                type = "Đã mua";
                txPrice = ethers.utils.formatEther(tx.value);
            }
        } else if (auction && from === auction.address) {
            try {
                const pastBids = await auction.queryFilter(auction.filters.BidPlaced(ethers.BigNumber.from(id)), 0, log.blockNumber);
                if (pastBids.length > 0) {
                    type = "Thắng thầu";
                    txPrice = ethers.utils.formatEther(pastBids[pastBids.length - 1].args.amount);
                } else {
                    type = "Hủy / Kết thúc (Ế)";
                }
            } catch (err) {
                type = "Kết thúc đấu giá";
            }
        } else {
            if (account && to.toLowerCase() === account.toLowerCase()) {
                type = "Đã nhận (Gift/Transfer)";
            }
        }

        return { hash: log.transactionHash, type, from, to, price: txPrice, timestamp: block ? block.timestamp * 1000 : Date.now() };
      }));
      setNftActivity(actData.reverse());

      let trueCreator = account;
      if (transferLogs.length > 0) trueCreator = transferLogs[0].args.to;
      else if (metadata.creator) trueCreator = metadata.creator;

      setData({
        id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category || "image",
        thumbnail: metadata.thumbnail || metadata.image || "https://picsum.photos/400",
        assetUrl: metadata.asset || metadata.image, 
        collection: metadata.collection || "EtherVault Genesis",
        creator: trueCreator,
        seller: auctionData.seller,
        minPrice: ethers.utils.formatEther(auctionData.minPrice),
        highestBid: ethers.utils.formatEther(auctionData.highestBid),
        highestBidder: auctionData.highestBidder,
        endTime: Number(auctionData.endTime),
        active: auctionData.active,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id, auction, nft, market, account]);

  useEffect(() => {
    if (!data?.endTime) return;
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const distance = data.endTime - now;
      if (distance <= 0) return { d: 0, h: 0, m: 0, s: 0, ended: true };
      return {
        d: Math.floor(distance / (3600 * 24)), h: Math.floor((distance % (3600 * 24)) / 3600),
        m: Math.floor((distance % 3600) / 60), s: Math.floor(distance % 60), ended: false
      };
    };
    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      const updatedTime = calculateTime();
      setTimeLeft(updatedTime);
      if (updatedTime.ended) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const handleBid = async () => {
    try {
      if (!account) return showDialog("error", "Chưa kết nối ví", "Vui lòng kết nối ví MetaMask để tham gia đấu giá!");
      const currentPrice = data.highestBid === "0.0" ? data.minPrice : data.highestBid;
      if (parseFloat(bidAmount) <= parseFloat(currentPrice)) return showDialog("error", "Lỗi đặt giá", `Vui lòng đặt giá cao hơn ${currentPrice} ETH!`);
      
      setProcessing(true);
      showDialog("info", "Đang xử lý...", "Vui lòng xác nhận giao dịch đặt thầu trên MetaMask.");
      
      const tx = await auction.placeBid(id, { value: ethers.utils.parseEther(bidAmount) });
      await tx.wait();
      
      showDialog("success", "Đặt thầu thành công!", `Bạn đã đặt thầu ${bidAmount} ETH. Chúc bạn may mắn!`);
      setBidAmount(""); 
      fetchDetail(); 
    } catch (error) {
      console.error(error);
      showDialog("error", "Giao dịch thất bại", "Giao dịch bị từ chối hoặc số dư của bạn không đủ.");
    } finally { 
      setProcessing(false); 
    }
  };

  const handleCancelAuction = async () => {
    try {
      setProcessing(true);
      showDialog("info", "Đang xử lý...", "Vui lòng xác nhận yêu cầu Hủy phiên đấu giá trên MetaMask.");
      
      const tx = await auction.cancelAuction(id);
      await tx.wait();
      
      showDialog("success", "Đã hủy đấu giá!", "Phiên đấu giá đã dừng, NFT đã được rút về ví của bạn.");
      setTimeout(() => navigate("/profile"), 2000);
    } catch (error) {
      console.error(error);
      showDialog("error", "Thao tác thất bại", "Giao dịch bị từ chối hoặc đã có người đặt thầu.");
    } finally {
      setProcessing(false);
    }
  };

  const getEventStyle = (type) => {
    switch(type) {
      case "Đã đúc (Mint)": return { color: "text-yellow-500", icon: <Sparkles size={16}/> };
      case "Niêm yết": return { color: "text-blue-600", icon: <Tag size={16}/> };
      case "Mở đấu giá": return { color: "text-blue-600", icon: <Tag size={16}/> };
      case "Đã mua": return { color: "text-green-600", icon: <ShoppingCart size={16}/> };
      case "Thắng thầu": return { color: "text-green-600", icon: <Trophy size={16}/> };
      case "Hủy niêm yết": return { color: "text-orange-500", icon: <ArchiveX size={16}/> };
      case "Hủy / Kết thúc (Ế)": return { color: "text-orange-500", icon: <ArchiveX size={16}/> };
      case "Đã nhận (Gift/Transfer)": return { color: "text-teal-600", icon: <ArrowDownLeft size={16}/> };
      default: return { color: "text-gray-900", icon: <ArrowRightLeft size={16}/> };
    }
  };

  const renderAsset = () => {
    const category = (data.category || "image").toLowerCase();
    switch (category) {
      case "video": return <video src={data.assetUrl} controls autoPlay muted loop className="w-full h-full object-contain rounded-[2rem]" />;
      case "audio": return (
        <div className="flex flex-col items-center justify-center w-full h-full p-12">
          <img src={data.thumbnail} alt="cover" className="w-48 h-48 rounded-full shadow-2xl animate-[spin_4s_linear_infinite] mb-8 object-cover" />
          <audio src={data.assetUrl} controls className="w-full max-w-md" />
        </div>
      );
      case "document": return (
        <div className="flex flex-col items-center justify-center w-full h-full p-12 text-center">
          <img src={data.thumbnail} alt="doc" className="w-48 h-64 object-cover rounded-xl shadow-xl mb-6" />
          <a href={data.assetUrl} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-8 py-4 rounded-xl flex items-center gap-3 font-bold"><FileText size={20} /> Đọc Tài Liệu Gốc</a>
        </div>
      );
      default: return <img src={data.assetUrl} alt={data.name} className="w-full h-full object-contain max-h-[700px] rounded-[2rem]" />;
    }
  };

  if (loading || !data) return <div className="text-center py-32 font-bold text-gray-400 flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>Đang tải cấu hình đấu giá...</div>;
  const currentPrice = data.highestBid === "0.0" ? data.minPrice : data.highestBid;

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-12 animate-in fade-in duration-500 py-10 relative">
      
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">
            {dialog.type !== 'info' && (
              <button onClick={() => setDialog({ ...dialog, isOpen: false })} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            )}
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner ${ dialog.type === 'error' ? 'bg-red-50 text-red-500' : dialog.type === 'info' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500' }`}>
              {dialog.type === 'error' ? <AlertCircle size={40} /> : dialog.type === 'info' ? <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 size={40} />}
            </div>
            <h3 className="text-2xl font-black text-center text-gray-900 mb-2">{dialog.title}</h3>
            <p className="text-center text-gray-500 font-medium mb-8 leading-relaxed">{dialog.message}</p>
            {dialog.type !== 'info' && (
              <button onClick={() => setDialog({ ...dialog, isOpen: false })} className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${ dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20' }`}>
                Đã hiểu
              </button>
            )}
          </div>
        </div>
      )}

      <button onClick={() => navigate("/auction")} className="flex items-center gap-2 font-bold text-gray-500 hover:text-black mb-8 transition-colors"><ArrowLeft size={20} /> Quay lại sàn</button>

      <div className="grid lg:grid-cols-12 gap-12 items-start mb-12">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#1A1B22] rounded-[3rem] overflow-hidden relative shadow-2xl flex items-center justify-center aspect-square border border-white/5">
            {renderAsset()}
            <div className="absolute top-6 left-6 flex gap-2">
              <span className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-sm">
                {!timeLeft.ended && data.active && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                {/* 💡 CẬP NHẬT TAG BÊN TRÊN ẢNH */}
                {!data.active ? (data.highestBid !== "0.0" ? "ĐÃ BÁN THÀNH CÔNG" : "ĐÃ HỦY/RÚT VỀ") : timeLeft.ended ? "ĐÃ CHỐT THẦU" : "ĐANG LIVE"}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Tag size={20}/> Mô tả tác phẩm</h3>
            <p className="text-gray-600 leading-relaxed italic">"{data.description || "Chưa có mô tả."}"</p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-8 py-5 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileCode size={18} className="text-blue-600"/> Details
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              <DetailRow icon={<User size={16}/>} label="Creator" value={shortenAddress(data.creator)} isLink onClick={() => navigate(`/profile/${data.creator}`)} />
              <DetailRow icon={<Wallet size={16}/>} label="Owner" value={shortenAddress(data.seller)} isLink onClick={() => navigate(`/profile/${data.seller}`)} />
              <DetailRow icon={<Hash size={16}/>} label="Token ID" value={data.id} />
              <DetailRow icon={<Layers size={16}/>} label="Token Standard" value="ERC-721" />
              <DetailRow icon={<LinkIcon size={16}/>} label="Chain" value="Ganache Local" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-widest">{data.collection}</p>
              <h1 className="text-4xl font-black text-gray-900 mb-6">{data.name}</h1>
              <div className="flex items-center gap-3 group/author cursor-pointer" onClick={() => navigate(`/profile/${data.seller}`)}>
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-inner" style={{ background: generateGradient(data.seller) }}></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Niêm yết bởi</p>
                  <p className="font-bold text-sm font-mono text-blue-600 group-hover/author:text-blue-800 transition-colors hover:underline">{shortenAddress(data.seller)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1B22] rounded-[3rem] p-10 text-white shadow-2xl">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{!data.active ? "Giá cuối cùng" : timeLeft.ended ? "Giá chốt thầu" : "Giá hiện tại"}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black ${!data.active || timeLeft.ended ? "text-green-400" : "text-white"}`}>{currentPrice}</span><span className="text-xl text-gray-400 font-bold">ETH</span>
                </div>
              </div>
              {data.active && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-end gap-1"><Clock size={12}/> {timeLeft.ended ? "Đã kết thúc" : "Kết thúc trong"}</p>
                  {!timeLeft.ended && (
                    <div className="flex gap-4 text-2xl font-black">
                      <div className="flex flex-col items-center"><span>{String(timeLeft.h).padStart(2, '0')}</span><span className="text-[8px] text-gray-500 font-normal">GIỜ</span></div><span className="text-gray-600">:</span>
                      <div className="flex flex-col items-center"><span>{String(timeLeft.m).padStart(2, '0')}</span><span className="text-[8px] text-gray-500 font-normal">PHÚT</span></div><span className="text-gray-600">:</span>
                      <div className="flex flex-col items-center"><span>{String(timeLeft.s).padStart(2, '0')}</span><span className="text-[8px] text-gray-500 font-normal">GIÂY</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 💡 CẬP NHẬT GIAO DIỆN KHI !data.active */}
            {!data.active ? (
              (() => {
                if (data.highestBid !== "0.0") {
                  return (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      Phiên đấu giá đã kết thúc thành công.
                    </div>
                  );
                } else {
                  // Lấy sự kiện cuối cùng để kiểm tra thời điểm đóng
                  const lastEvent = nftActivity.length > 0 ? nftActivity[0] : null;
                  const closedTime = lastEvent ? lastEvent.timestamp : Date.now();
                  const endTimeMs = data.endTime * 1000;

                  // So sánh thời điểm đóng với thời điểm hết hạn
                  if (closedTime >= endTimeMs) {
                    return (
                      <div className="bg-[#2A2B35] border border-gray-700 text-gray-400 p-5 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2">
                        <ArchiveX size={20} />
                        Phiên đấu giá đã kết thúc mà không có người mua.
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-[#2A2B35] border border-gray-700 text-gray-400 p-5 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2">
                        <ArchiveX size={20} />
                        Chủ sở hữu đã tự hủy phiên đấu giá này.
                      </div>
                    );
                  }
                }
              })()
            ) : timeLeft.ended ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
                <ShieldCheck size={40} className="mx-auto text-green-500 mb-3" />
                <h4 className="text-green-500 font-black text-lg mb-1 uppercase tracking-widest">Đấu Giá Hoàn Tất</h4>
                {data.highestBid !== "0.0" ? (
                  <p className="text-gray-400 text-sm mt-2">
                    Tác phẩm đã thuộc về ví <br/>
                    <span onClick={() => navigate(`/profile/${data.highestBidder}`)} className="text-white font-bold inline-flex items-center gap-1 mt-1 font-mono hover:text-blue-400 cursor-pointer hover:underline"><Trophy size={14} className="text-yellow-500"/> {shortenAddress(data.highestBidder)}</span>
                  </p>
                ) : <p className="text-gray-400 text-sm mt-2">Không có ai tham gia trả giá.</p>}
              </div>
            ) : data.seller.toLowerCase() === account?.toLowerCase() ? (
              data.highestBid === "0.0" ? (
                <button 
                  onClick={handleCancelAuction}
                  disabled={processing}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 flex justify-center items-center gap-2"
                >
                  {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><ArchiveX size={20}/> HỦY PHIÊN ĐẤU GIÁ & RÚT VỀ</>}
                </button>
              ) : (
                <div className="bg-orange-500/20 border border-orange-500/20 text-orange-400 p-5 rounded-2xl text-center font-bold text-sm leading-relaxed">
                   Đã có người đặt giá. Bạn không thể hủy phiên đấu giá này để đảm bảo tính minh bạch.
                </div>
              )
            ) : (
              <div className="bg-[#2A2B35] rounded-3xl p-4 border border-gray-700">
                <div className="flex gap-2">
                  <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder={`Lớn hơn ${currentPrice} ETH`} className="w-full bg-[#1A1B22] border border-gray-600 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-colors" />
                  <button onClick={handleBid} disabled={processing} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 rounded-2xl flex items-center gap-2 transition-transform active:scale-95">
                    {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><ShoppingCart size={18}/> ĐẶT GIÁ</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="font-black text-xl mb-6 flex justify-between items-center text-gray-900">
              Lịch sử Đấu giá 
              <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest">{bidHistory.length} lượt</span>
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {bidHistory.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-10">Chưa có ai tham gia trả giá.</p> : bidHistory.map((bid, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full shadow-inner border border-gray-200" style={{ background: generateGradient(bid.bidder) }}></div>
                    <div>
                      <p onClick={() => navigate(`/profile/${bid.bidder}`)} className="font-bold text-sm font-mono text-blue-600 hover:text-blue-800 cursor-pointer hover:underline flex items-center gap-2">
                        {shortenAddress(bid.bidder)} {index === 0 && <span className="text-[8px] bg-yellow-400 text-black px-2 py-0.5 rounded shadow-sm font-black no-underline">CAO NHẤT</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(bid.timestamp).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <p className="font-black text-lg text-gray-900">{bid.amount} <span className="text-sm text-gray-400">ETH</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG LỊCH SỬ GIAO DỊCH (ITEM ACTIVITY) */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex items-center gap-3">
          <Activity size={28} className="text-orange-500" />
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">Lịch sử giao dịch (Item Activity)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-widest text-gray-400">
                <th className="p-8 font-black">Sự kiện</th>
                <th className="p-8 font-black">Giá</th>
                <th className="p-8 font-black">Từ (From)</th>
                <th className="p-8 font-black">Đến (To)</th>
                <th className="p-8 font-black text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {nftActivity.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Chưa có hoạt động nào.</td></tr>
              ) : (
                nftActivity.map((log, index) => {
                  const style = getEventStyle(log.type);
                  return (
                    <tr key={index} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                      <td className="p-8">
                        <div className={`flex items-center gap-3 font-bold text-sm ${style.color}`}>
                          {style.icon} {log.type}
                        </div>
                      </td>
                      
                      <td className="p-8 font-mono text-sm font-black text-gray-900">
                        {log.price !== "-" ? `${log.price} ETH` : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="p-8 font-mono text-sm">
                        {log.from === ethers.constants.AddressZero ? (
                          <span className="text-gray-400 font-bold text-xs bg-gray-100 px-3 py-1.5 rounded-lg">NullAddress</span>
                        ) : log.from.toLowerCase() === account?.toLowerCase() ? (
                          <span className="bg-gray-900 text-white font-bold px-2 py-1 rounded text-[10px]">BẠN</span>
                        ) : (
                          <div onClick={() => navigate(`/profile/${log.from}`)} className="flex items-center gap-2 cursor-pointer group w-fit">
                            <span className="text-blue-600 hover:underline">{shortenAddress(log.from)}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-8 font-mono text-sm">
                        {log.to === ethers.constants.AddressZero ? (
                          <span className="text-gray-400">-</span>
                        ) : log.to.toLowerCase() === account?.toLowerCase() ? (
                          <span className="bg-gray-900 text-white font-bold px-2 py-1 rounded text-[10px]">BẠN</span>
                        ) : (
                          <div onClick={() => navigate(`/profile/${log.to}`)} className="flex items-center gap-2 cursor-pointer group w-fit">
                            <span className="text-blue-600 hover:underline">{shortenAddress(log.to)}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-8 text-right text-sm text-gray-500 font-medium">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

const DetailRow = ({ icon, label, value, isLink, onClick }) => (
  <div className="flex items-center justify-between px-8 py-5 hover:bg-orange-50/30 transition-colors">
    <div className="flex items-center gap-3 text-gray-500 font-medium">{icon} <span className="text-sm">{label}</span></div>
    <div onClick={onClick} className={`text-sm font-bold font-mono ${isLink ? "text-blue-600 cursor-pointer hover:underline" : "text-gray-900"}`}>{value}</div>
  </div>
);