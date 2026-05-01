import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { 
  ArrowLeft, Share2, ShoppingCart, FileText, Check, Copy, Activity, 
  AlignLeft, Sparkles, Tag, ArrowRightLeft, AlertCircle, CheckCircle2, X,
  FileCode, User, Wallet, Hash, Layers, Link as LinkIcon, ArchiveX, Trophy, ArrowDownLeft
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { NFT_ADDRESS, MARKETPLACE_ADDRESS, AUCTION_ADDRESS } from "../constants";

export default function ExploreDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { account, nft, market, auction } = useWeb3(); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [nftActivity, setNftActivity] = useState([]);
  const [copiedAddress, setCopiedAddress] = useState("");
  
  // 💡 STATE MỚI: Theo dõi chính xác trạng thái bán / hủy
  const [nftStatus, setNftStatus] = useState("active");

  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });
  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });

  const shortenAddress = (address) => {
    if (!address || address === ethers.constants.AddressZero) return "Hệ thống";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const generateGradient = (addr) => {
    if (!addr || addr === ethers.constants.AddressZero) return "#e5e7eb";
    const c1 = `#${addr.slice(2, 8)}`;
    const c2 = `#${addr.slice(-6)}`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const handleCopy = (text) => {
    if(!text || text === ethers.constants.AddressZero) return;
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(""), 2000); 
  };

  const fetchDetail = async () => {
    try {
      if (!market || !nft || !id) return;
      setLoading(true);

      const [listing, tokenURI, logs, actualOwner] = await Promise.all([
        market.listings(id),
        nft.tokenURI(id),
        nft.queryFilter(nft.filters.Transfer(null, null, ethers.BigNumber.from(id))),
        nft.ownerOf(id).catch(() => ethers.constants.AddressZero)
      ]);

      const response = await fetch(tokenURI);
      const metadata = await response.json();

      let trueCreator = account;
      const mintLog = logs.find(log => log.args.from === ethers.constants.AddressZero);
      if (mintLog) trueCreator = mintLog.args.to;
      else if (metadata.creator) trueCreator = metadata.creator;

      try {
        const activityPromises = logs.map(async (log) => {
          const from = log.args.from;
          const to = log.args.to;
          const [block, tx] = await Promise.all([log.getBlock(), log.getTransaction()]);

          let eventType = "Chuyển giao";
          let txPrice = "-";

          if (from === ethers.constants.AddressZero) {
              eventType = "Đã đúc (Mint)";
          } else if (market && to === market.address) {
              eventType = "Niêm yết";
          } else if (auction && to === auction.address) {
              eventType = "Mở đấu giá";
          } else if (market && from === market.address) {
              if (!tx || tx.value.isZero()) {
                  eventType = "Hủy niêm yết";
              } else {
                  eventType = "Đã mua";
                  txPrice = ethers.utils.formatEther(tx.value);
              }
          } else if (auction && from === auction.address) {
              try {
                  const pastBids = await auction.queryFilter(auction.filters.BidPlaced(ethers.BigNumber.from(id)), 0, log.blockNumber);
                  if (pastBids.length > 0) {
                      eventType = "Thắng thầu";
                      txPrice = ethers.utils.formatEther(pastBids[pastBids.length - 1].args.amount);
                  } else {
                      eventType = "Hủy / Kết thúc (Ế)";
                  }
              } catch (err) {
                  eventType = "Kết thúc đấu giá";
              }
          } else {
              if (account && to.toLowerCase() === account.toLowerCase()) {
                  eventType = "Đã nhận (Gift/Transfer)";
              }
          }

          return {
            hash: log.transactionHash,
            type: eventType,
            price: txPrice,
            from, to,
            timestamp: block ? block.timestamp * 1000 : Date.now()
          };
        });

        const actData = await Promise.all(activityPromises);
        const reversedActData = actData.reverse();
        setNftActivity(reversedActData); 

        // 💡 LOGIC MỚI: Xác định chính xác tác phẩm đã bị BÁN hay HỦY
        let status = "active";
        if (!listing.active) {
            // Tìm sự kiện chợ gần nhất trong lịch sử
            const lastEvent = reversedActData.find(log => 
                log.type === "Đã mua" || 
                log.type === "Hủy niêm yết" ||
                log.type === "Thắng thầu" ||
                log.type === "Hủy / Kết thúc (Ế)"
            );
            
            if (lastEvent && (lastEvent.type === "Đã mua" || lastEvent.type === "Thắng thầu")) {
                status = "sold";
            } else {
                status = "delisted";
            }
        }
        setNftStatus(status);

      } catch (eventErr) {
        console.error("Lỗi lấy lịch sử NFT:", eventErr);
      }

      const currentSeller = (listing.active && listing.seller !== ethers.constants.AddressZero) 
                            ? listing.seller : actualOwner;

      setData({
        id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category || "image",
        thumbnail: metadata.thumbnail || metadata.image || "https://picsum.photos/400",
        assetUrl: metadata.asset || metadata.image,
        collection: metadata.collection || "EtherVault Fixed",
        creator: trueCreator, 
        seller: currentSeller, 
        price: ethers.utils.formatEther(listing.price),
        active: listing.active,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line
  }, [id, market, nft, auction, account]);

  const handleBuy = async () => {
    try {
      if (!account) return showDialog("error", "Chưa kết nối ví", "Vui lòng kết nối ví MetaMask để mua NFT!");
      
      setProcessing(true);
      showDialog("info", "Đang xử lý...", "Vui lòng xác nhận giao dịch mua trên MetaMask.");
      
      const tx = await market.buyNFT(id, {
        value: ethers.utils.parseEther(data.price)
      });
      await tx.wait();
      
      showDialog("success", "Mua NFT thành công!", "Tác phẩm đã được chuyển về ví của bạn.");
      setTimeout(() => navigate("/profile"), 2000); 
    } catch (error) {
      console.error(error);
      showDialog("error", "Giao dịch thất bại", "Lỗi mạng, người dùng từ chối hoặc số dư không đủ.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelListing = async () => {
    try {
      setProcessing(true);
      showDialog("info", "Đang xử lý...", "Vui lòng xác nhận yêu cầu Hủy niêm yết trên MetaMask.");
      
      const tx = await market.cancelListing(id);
      await tx.wait();
      
      showDialog("success", "Đã hủy niêm yết!", "NFT đã được rút về ví cá nhân của bạn.");
      setTimeout(() => navigate("/profile"), 2000); 
    } catch (error) {
      console.error(error);
      showDialog("error", "Thao tác thất bại", "Có lỗi xảy ra hoặc bạn đã từ chối giao dịch.");
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

  if (loading || !data) return <div className="text-center py-32 flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="font-bold text-gray-400 tracking-widest uppercase text-sm">Đang tải tài sản số...</p></div>;

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
            
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner ${
              dialog.type === 'error' ? 'bg-red-50 text-red-500' : 
              dialog.type === 'info' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
            }`}>
              {dialog.type === 'error' ? <AlertCircle size={40} /> : 
               dialog.type === 'info' ? <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : 
               <CheckCircle2 size={40} />}
            </div>
            
            <h3 className="text-2xl font-black text-center text-gray-900 mb-2">{dialog.title}</h3>
            <p className="text-center text-gray-500 font-medium mb-8 leading-relaxed">{dialog.message}</p>
            
            {dialog.type !== 'info' && (
              <button
                onClick={() => setDialog({ ...dialog, isOpen: false })}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                  dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                }`}
              >
                Đã hiểu
              </button>
            )}
          </div>
        </div>
      )}

      <button onClick={() => navigate("/explore")} className="flex items-center gap-2 font-bold text-gray-500 hover:text-black mb-8 transition-colors">
        <ArrowLeft size={20} /> Quay lại chợ mua bán
      </button>

      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-6 space-y-8 sticky top-28">
          <div className="bg-[#1A1B22] rounded-[2rem] overflow-hidden relative shadow-2xl flex items-center justify-center min-h-[500px]">
            {renderAsset()}
            <div className="absolute top-6 left-6 flex gap-2">
              <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase border border-white/10">
                {data.category}
              </span>
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    {data.active ? "Niêm yết bởi" : "Chủ sở hữu hiện tại"}
                  </p>
                  <p className="font-bold text-sm font-mono text-blue-600 group-hover/author:text-blue-800 transition-colors hover:underline">
                    {shortenAddress(data.seller)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(window.location.href)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                {copiedAddress === window.location.href ? <Check size={16} className="text-green-500" /> : <Share2 size={16} className="text-gray-600" />}
              </button>
            </div>
          </div>

          {/* BOX ĐIỀU KHIỂN LOGIC MUA / HỦY / BÁN / RÚT */}
          <div className="bg-[#1A1B22] rounded-[2rem] p-8 text-white shadow-2xl">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Giá niêm yết</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black text-blue-400">{data.price === "0.0" ? "---" : data.price}</span>
              <span className="text-xl text-gray-400 font-bold">ETH</span>
            </div>

            {data.seller.toLowerCase() === account?.toLowerCase() ? (
              data.active ? (
                // Nếu là chủ sở hữu và đang bán -> Hiện nút HỦY
                <button 
                  onClick={handleCancelListing}
                  disabled={processing}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 flex justify-center items-center gap-2"
                >
                  {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><ArchiveX size={20}/> HỦY NIÊM YẾT & RÚT VỀ</>}
                </button>
              ) : (
                // Nếu là chủ sở hữu nhưng đã rút về
                <div className="bg-[#2A2B35] text-gray-400 p-5 rounded-2xl text-center font-bold text-sm border border-gray-700">
                  Vật phẩm này đang nằm trong ví của bạn.
                </div>
              )
            ) : data.active ? (
              // Nếu là người khác và đang bán -> Hiện nút MUA
              <button 
                onClick={handleBuy}
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex justify-center items-center gap-2"
              >
                {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><ShoppingCart size={20} /> MUA NGAY</>}
              </button>
            ) : nftStatus === "sold" ? (
              // 💡 GIAO DIỆN MỚI 1: Khi tác phẩm ĐÃ BÁN THÀNH CÔNG
              <div className="bg-green-500/10 text-green-400 p-5 rounded-2xl text-center font-bold text-sm border border-green-500/20 flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Tác phẩm này đã được bán thành công.
              </div>
            ) : (
              // 💡 GIAO DIỆN MỚI 2: Khi tác phẩm ĐÃ BỊ HỦY BỞI NGƯỜI BÁN
              <div className="bg-[#2A2B35] text-gray-400 p-5 rounded-2xl text-center font-bold text-sm border border-gray-700 flex items-center justify-center gap-2">
                <ArchiveX size={20} />
                Chủ sở hữu đã hủy niêm yết tác phẩm này.
              </div>
            )}
          </div>

          <div className="pt-6">
            <div className="flex gap-6 border-b border-gray-100 mb-6">
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`pb-3 font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <AlignLeft size={16} /> Tổng quan
              </button>
              <button 
                onClick={() => setActiveTab('activity')} 
                className={`pb-3 font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'activity' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Activity size={16} /> Hoạt động
              </button>
            </div>

            {activeTab === 'overview' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-4">Mô tả tác phẩm</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{data.description || "Không có mô tả chi tiết."}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-8 py-5 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <FileCode size={18} className="text-blue-600"/> Details
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {/* Contract Address đã được ẩn theo yêu cầu */}
                    {/* <DetailRow icon={<FileCode size={16}/>} label="Contract Address" value={shortenAddress(NFT_ADDRESS)} isLink onClick={() => navigate(`/profile/${NFT_ADDRESS}`)} /> */}
                    <DetailRow icon={<User size={16}/>} label="Creator" value={shortenAddress(data.creator)} isLink onClick={() => navigate(`/profile/${data.creator}`)} />
                    <DetailRow icon={<Wallet size={16}/>} label="Owner" value={shortenAddress(data.seller)} isLink onClick={() => navigate(`/profile/${data.seller}`)} />
                    <DetailRow icon={<Hash size={16}/>} label="Token ID" value={data.id} />
                    <DetailRow icon={<Layers size={16}/>} label="Token Standard" value="ERC-721" />
                    <DetailRow icon={<LinkIcon size={16}/>} label="Chain" value="Ganache Local" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 sticky top-0 backdrop-blur-md">
                        <th className="p-6 font-bold">Sự kiện</th>
                        <th className="p-6 font-bold">Giá</th> 
                        <th className="p-6 font-bold">Từ</th>
                        <th className="p-6 font-bold">Đến</th>
                        <th className="p-6 font-bold text-right">Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nftActivity.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic text-sm">Chưa có hoạt động nào.</td></tr>
                      ) : (
                        nftActivity.map((log, index) => {
                          const style = getEventStyle(log.type);
                          return (
                            <tr key={index} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                              <td className="p-6">
                                <div className={`flex items-center gap-2 font-bold text-sm ${style.color}`}>
                                  {style.icon} {log.type}
                                </div>
                              </td>
                              
                              <td className="p-6 font-mono text-sm font-black text-gray-900">
                                {log.price !== "-" ? `${log.price} ETH` : <span className="text-gray-300">-</span>}
                              </td>

                              <td className="p-6 font-mono text-sm">
                                {log.from === ethers.constants.AddressZero ? (
                                  <span className="text-gray-400 font-bold text-[10px] bg-gray-100 px-2 py-1 rounded">HỆ THỐNG</span>
                                ) : log.from.toLowerCase() === account?.toLowerCase() ? (
                                  <span className="bg-gray-900 text-white font-bold px-2 py-1 rounded text-[10px]">BẠN</span>
                                ) : (
                                  <div onClick={() => navigate(`/profile/${log.from}`)} className="flex items-center gap-2 cursor-pointer group w-fit">
                                    <span className="text-blue-600 hover:underline">{shortenAddress(log.from)}</span>
                                  </div>
                                )}
                              </td>

                              <td className="p-6 font-mono text-sm">
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

                              <td className="p-6 text-right text-[11px] text-gray-500 font-medium">
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
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

const DetailRow = ({ icon, label, value, isLink, onClick }) => (
  <div className="flex items-center justify-between px-8 py-5 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3 text-gray-500 font-medium">{icon} <span className="text-sm">{label}</span></div>
    <div onClick={onClick} className={`text-sm font-bold font-mono ${isLink ? "text-blue-600 cursor-pointer hover:underline" : "text-gray-900"}`}>{value}</div>
  </div>
);