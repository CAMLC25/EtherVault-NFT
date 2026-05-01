import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { 
  ArrowLeft, Tag, Gavel, ShieldCheck, Info, CheckCircle2, Zap, 
  Gift, FileCode, User, Wallet, Hash, Layers, Link as LinkIcon, 
  AlertCircle, X, Activity, Sparkles, ShoppingCart, ArrowRightLeft, ArchiveX, Trophy, ArrowDownLeft
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { NFT_ADDRESS, MARKETPLACE_ADDRESS, AUCTION_ADDRESS } from "../constants";

export default function OwnedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, nft, market, auction } = useWeb3();

  const [data, setData] = useState(null);
  const [nftActivity, setNftActivity] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fixed"); 
  
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const [giftAddress, setGiftAddress] = useState("");
  const [isGifting, setIsGifting] = useState(false);

  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });

  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });
  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  
  const generateGradient = (address) => {
    if (!address) return "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)";
    const c1 = `#${address.slice(2, 8)}`; const c2 = `#${address.slice(8, 14)}`; const c3 = `#${address.slice(-6)}`;
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  };

  const fetchNFTData = async () => {
    try {
      if (!nft || !id) return;
      setLoading(true);

      const currentOwner = await nft.ownerOf(id);
      const tokenURI = await nft.tokenURI(id);
      const metadata = await (await fetch(tokenURI)).json();

      const filter = nft.filters.Transfer(null, null, Number(id));
      const logs = await nft.queryFilter(filter);
      
      let trueCreator = account; 
      if (logs.length > 0) {
        trueCreator = logs[0].args.to; 
      } else if (metadata.creator) {
        trueCreator = metadata.creator; 
      }

      // 💡 ÁP DỤNG ĐẶC TẢ LOGIC MỚI: Vòng đời của NFT (Góc nhìn Tài sản)
      const activityPromises = logs.map(async (log) => {
        const from = log.args.from;
        const to = log.args.to;
        const [block, tx] = await Promise.all([log.getBlock(), log.getTransaction()]);

        let eventType = "Chuyển giao";
        let txPrice = "-";

        if (from === ethers.constants.AddressZero) {
            eventType = "Đã đúc (Mint)";
        } else if (to === MARKETPLACE_ADDRESS) {
            eventType = "Niêm yết";
        } else if (to === AUCTION_ADDRESS) {
            eventType = "Mở đấu giá";
        } else if (from === MARKETPLACE_ADDRESS) {
            if (!tx || tx.value.isZero()) {
                eventType = "Hủy niêm yết";
            } else {
                eventType = "Đã mua";
                txPrice = ethers.utils.formatEther(tx.value);
            }
        } else if (from === AUCTION_ADDRESS) {
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
            // Đây là nhánh Chuyển tay giữa các ví bình thường
            // Cập nhật tên sự kiện cho hay hơn (như trong UI Demo)
            if (to.toLowerCase() === account.toLowerCase()) {
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

      const resolvedActivities = await Promise.all(activityPromises);
      setNftActivity(resolvedActivities.reverse()); 

      setData({
        id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category || "image",
        thumbnail: metadata.thumbnail || metadata.image,
        assetUrl: metadata.asset || metadata.image,
        collection: metadata.collection || "EtherVault Private",
        creator: trueCreator,
        owner: currentOwner
      });

    } catch (error) {
      console.error(error);
      showDialog("error", "Lỗi dữ liệu", "Không thể tải thông tin NFT này.");
    } finally {
      setLoading(false);
    }
  };

  const checkApprovalStatus = async () => {
    try {
      if (!nft || !id) return;
      const targetContract = activeTab === "fixed" ? MARKETPLACE_ADDRESS : AUCTION_ADDRESS;
      const approvedAddr = await nft.getApproved(id);
      setIsApproved(approvedAddr.toLowerCase() === targetContract.toLowerCase());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchNFTData(); }, [id, nft, account]);
  useEffect(() => { checkApprovalStatus(); }, [activeTab, id, nft]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      const targetContract = activeTab === "fixed" ? MARKETPLACE_ADDRESS : AUCTION_ADDRESS;
      const tx = await nft.approve(targetContract, id);
      showDialog("info", "Đang xử lý...", "Vui lòng chờ mạng Blockchain xác nhận.");
      await tx.wait();
      setIsApproved(true);
      setDialog({ ...dialog, isOpen: false }); 
    } catch (error) { showDialog("error", "Cấp quyền thất bại", "Bạn đã từ chối giao dịch."); } 
    finally { setProcessing(false); }
  };

  const handleListFixed = async () => {
    if (!price || parseFloat(price) <= 0) return showDialog("error", "Lỗi nhập liệu", "Giá phải lớn hơn 0");
    try {
      setProcessing(true);
      const tx = await market.listNFT(id, ethers.utils.parseEther(price));
      showDialog("info", "Đang xử lý...", "Đang đưa NFT của bạn lên sàn chợ.");
      await tx.wait();
      showDialog("success", "Thành công!", "NFT đã được niêm yết bán.");
      setTimeout(() => navigate(`/explore/${id}`), 2000);
    } catch (error) { showDialog("error", "Lỗi niêm yết", "Không thể đăng bán."); } 
    finally { setProcessing(false); }
  };

  const handleStartAuction = async () => {
    if (!minPrice || parseFloat(minPrice) <= 0) return showDialog("error", "Lỗi nhập liệu", "Giá khởi điểm > 0.");
    if (!endDate) return showDialog("error", "Lỗi nhập liệu", "Chọn thời gian kết thúc.");
    const now = Math.floor(Date.now() / 1000);
    const startTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : now;
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    if (startTimestamp < now - 60) return showDialog("error", "Lỗi", "Bắt đầu không được trong quá khứ.");
    if (endTimestamp <= startTimestamp) return showDialog("error", "Lỗi", "Kết thúc phải sau Bắt đầu.");

    try {
      setProcessing(true);
      const tx = await auction.startAuction(id, ethers.utils.parseEther(minPrice), startTimestamp, endTimestamp);
      showDialog("info", "Đang xử lý...", "Đang tạo phiên đấu giá trên Blockchain.");
      await tx.wait();
      showDialog("success", "Thành công!", "Phiên đấu giá đã được tạo.");
      setTimeout(() => navigate(`/auction/${id}`), 2000);
    } catch (error) { showDialog("error", "Lỗi", "Không thể tạo phiên đấu giá."); } 
    finally { setProcessing(false); }
  };

  const handleGiftNFT = async () => {
    if (!giftAddress) return showDialog("error", "Lỗi", "Nhập ví người nhận!");
    if (giftAddress.toLowerCase() === account.toLowerCase()) return showDialog("error", "Lỗi", "Không tự tặng mình.");
    try {
      setIsGifting(true);
      const tx = await nft.transferFrom(account, giftAddress, id);
      showDialog("info", "Đang xử lý...", "Đang chuyển nhượng trên Blockchain.");
      await tx.wait();
      showDialog("success", "Đã tặng!", `NFT đã chuyển sang ví ${shortenAddress(giftAddress)}.`);
      setTimeout(() => navigate("/profile"), 2000);
    } catch (error) { showDialog("error", "Lỗi", "Giao dịch bị từ chối."); } 
    finally { setIsGifting(false); }
  };

  // 💡 ÁP DỤNG ĐẶC TẢ GIAO DIỆN (Cập nhật Icon & Màu sắc cho Bảng Detail)
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
      default: return { color: "text-gray-900", icon: <ArrowRightLeft size={16}/> }; // Chuyển giao
    }
  };

  const renderAsset = () => {
    if (!data) return null;
    switch (data.category.toLowerCase()) {
      case "video": return <video src={data.assetUrl} controls className="w-full h-full object-contain rounded-[2rem]" />;
      case "audio": return (
        <div className="flex flex-col items-center p-10 w-full">
          <img src={data.thumbnail} className="w-48 h-48 rounded-full animate-[spin_8s_linear_infinite] mb-6 shadow-2xl object-cover" alt="disc" />
          <audio src={data.assetUrl} controls className="w-full max-w-[250px]" />
        </div>
      );
      case "document": return (
        <div className="text-center p-10 flex flex-col items-center justify-center w-full h-full">
          <div className="w-40 h-56 bg-white rounded-2xl shadow-xl p-2 mb-6 rotate-3">
            <img src={data.thumbnail} alt="doc" className="w-full h-full object-cover rounded-xl" />
          </div>
          <p className="font-black text-gray-400 uppercase text-[10px] tracking-widest bg-black/40 px-4 py-2 rounded-full">Bản thảo kỹ thuật số</p>
        </div>
      );
      default: return <img src={data.assetUrl} className="w-full h-full object-contain rounded-[2rem]" alt="nft" />;
    }
  };

  if (loading || !data) return <div className="text-center py-40 font-black text-gray-400 animate-pulse uppercase tracking-widest text-xs">Đang tải cấu hình tài sản...</div>;

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-in fade-in duration-500 relative">
      
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

      <Link to="/profile" className="flex items-center gap-2 font-bold text-gray-500 hover:text-black mb-8 transition-colors">
        <ArrowLeft size={20} /> Quay lại Hồ sơ của bạn
      </Link>

      <div className="grid lg:grid-cols-12 gap-12 items-start mb-12">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#1A1B22] rounded-[3rem] p-4 shadow-2xl aspect-square flex items-center justify-center overflow-hidden border border-white/5 relative">
            {renderAsset()}
            <div className="absolute top-8 left-8 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg">
              <Zap size={12}/> TÀI SẢN CỦA BẠN
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2">{data.collection}</p>
            <h2 className="text-3xl font-black mb-4 text-gray-900 leading-tight">{data.name}</h2>
            <p className="text-gray-500 leading-relaxed text-sm">"{data.description || "Chủ sở hữu chưa cung cấp mô tả cho vật phẩm này."}"</p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-8 py-5 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileCode size={18} className="text-blue-600"/> Details
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {/* <DetailRow icon={<FileCode size={16}/>} label="Contract Address" value={shortenAddress(NFT_ADDRESS)} isLink onClick={() => navigate(`/profile/${NFT_ADDRESS}`)} /> */}
              <DetailRow icon={<User size={16}/>} label="Creator" value={shortenAddress(data.creator)} isLink onClick={() => navigate(`/profile/${data.creator}`)} />
              <DetailRow icon={<Wallet size={16}/>} label="Owner" value={shortenAddress(data.owner)} isLink onClick={() => navigate(`/profile/${data.owner}`)} />
              <DetailRow icon={<Hash size={16}/>} label="Token ID" value={data.id} />
              <DetailRow icon={<Layers size={16}/>} label="Token Standard" value="ERC-721" />
              <DetailRow icon={<LinkIcon size={16}/>} label="Chain" value="Ganache Local" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-8">
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button onClick={() => setActiveTab("fixed")} className={`flex-1 py-6 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "fixed" ? "bg-blue-600 text-white shadow-inner" : "text-gray-400 hover:bg-gray-50"}`}>
                <Tag size={18} /> BÁN GIÁ CỐ ĐỊNH
              </button>
              <button onClick={() => setActiveTab("auction")} className={`flex-1 py-6 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "auction" ? "bg-orange-500 text-white shadow-inner" : "text-gray-400 hover:bg-gray-50"}`}>
                <Gavel size={18} /> ĐẤU GIÁ
              </button>
            </div>
            <div className="p-10 space-y-8">
              {activeTab === "fixed" ? (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">GIÁ BÁN (ETH)</label>
                    <div className="relative">
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.1" className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 rounded-2xl px-6 py-5 outline-none text-2xl font-bold transition-all" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-300">ETH</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-left-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">GIÁ KHỞI ĐIỂM (ETH)</label>
                    <div className="relative">
                      <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0.1" className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-5 outline-none text-2xl font-bold transition-all" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-300">ETH</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">BẮT ĐẦU <span className="normal-case tracking-normal font-medium text-gray-300">(Trống: Ngay)</span></label>
                      <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-4 py-4 outline-none text-sm font-bold transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">KẾT THÚC <span className="text-red-500">*</span></label>
                      <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-4 py-4 outline-none text-sm font-bold transition-all" />
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100">
                {!isApproved ? (
                  <button onClick={handleApprove} disabled={processing} className="w-full bg-gray-900 text-white font-black py-6 rounded-2xl shadow-xl hover:bg-black active:scale-95 transition-all flex justify-center items-center gap-3">
                    {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><ShieldCheck size={20}/> BƯỚC 1: CẤP QUYỀN SÀN</>}
                  </button>
                ) : (
                  <button onClick={activeTab === "fixed" ? handleListFixed : handleStartAuction} disabled={processing} className={`w-full text-white font-black py-6 rounded-2xl shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 ${activeTab === "fixed" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"}`}>
                    {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><CheckCircle2 size={20}/> BƯỚC 2: XÁC NHẬN RA MẮT</>}
                  </button>
                )}
                <p className="text-center text-[10px] text-gray-400 font-bold mt-6 uppercase tracking-widest">Xác nhận giao dịch trên ví MetaMask để hoàn tất</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black flex items-center gap-3 text-gray-900 mb-3">
              <Gift className="text-teal-600" size={28}/> Tặng NFT này
            </h3>
            <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
              Bạn có thể chuyển quyền sở hữu tác phẩm này trực tiếp cho ví khác mà không cần thông qua sàn. Thao tác này chỉ tốn phí Gas.
            </p>
            <div className="space-y-4">
              <input type="text" placeholder="Nhập địa chỉ ví người nhận (0x...)" value={giftAddress} onChange={(e) => setGiftAddress(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-teal-500 rounded-2xl px-6 py-5 outline-none font-mono text-sm transition-all" />
              <button onClick={handleGiftNFT} disabled={isGifting || !giftAddress} className="w-full bg-teal-600 text-white py-5 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                {isGifting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Gửi Tặng Ngay"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 💡 BẢNG LỊCH SỬ GIAO DỊCH VỚI LOGIC VÀ MÀU SẮC MỚI */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 mt-12">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex items-center gap-3">
          <Activity size={28} className="text-teal-600" />
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
                    <tr key={index} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors">
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
  <div className="flex items-center justify-between px-8 py-5 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3 text-gray-500 font-medium">{icon} <span className="text-sm">{label}</span></div>
    <div onClick={onClick} className={`text-sm font-bold font-mono ${isLink ? "text-blue-600 cursor-pointer hover:underline" : "text-gray-900"}`}>{value}</div>
  </div>
);