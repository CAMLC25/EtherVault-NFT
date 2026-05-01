import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 💡 Mới
import { ethers } from "ethers";
import { Gavel, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function Auction() {
  const { nft, auction } = useWeb3();
  const navigate = useNavigate(); // 💡 Mới
  
  const [auctionsList, setAuctionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 💡 NÂNG CẤP: Lấy Tab hiện tại từ Session Storage (Mặc định là 'active')
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("auctionTab") || "active";
  });

  // 💡 HÀM ĐỔI TAB: Vừa đổi giao diện, vừa lưu vào bộ nhớ trình duyệt
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("auctionTab", tab);
  };

  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const generateGradient = (addr) => {
    const c1 = `#${addr.slice(2, 8)}`;
    const c2 = `#${addr.slice(-6)}`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const fetchAuctions = async () => {
    try {
      if (!auction || !nft) return;
      setLoading(true);

      const tokenIds = await auction.getAllAuctionTokenIds();
      
      // 🚀 TỐI ƯU: Chạy song song tất cả các phiên đấu giá
      const fetchedItems = await Promise.all(tokenIds.map(async (idBN) => {
        const tokenId = idBN.toNumber();
        try {
          const [auctionData, tokenURI] = await Promise.all([
            auction.auctions(tokenId),
            nft.tokenURI(tokenId)
          ]);

          const metadata = await (await fetch(tokenURI)).json();

          return {
            id: tokenId,
            name: metadata.name || `NFT #${tokenId}`,
            image: metadata.thumbnail || metadata.image,
            category: metadata.category || "General",
            seller: auctionData.seller,
            minPrice: ethers.utils.formatEther(auctionData.minPrice),
            highestBid: ethers.utils.formatEther(auctionData.highestBid),
            active: auctionData.active,
          };
        } catch (e) { return null; }
      }));

      const finalItems = fetchedItems
        .filter(i => i !== null)
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      setAuctionsList(finalItems.reverse());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAuctions(); }, [auction, nft]);

  const displayAuctions = auctionsList.filter(item => 
    activeTab === "active" ? item.active === true : item.active === false
  );

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-12 animate-in fade-in duration-500 py-10">
      <header className="mb-10">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-gray-900 mb-4 flex items-center gap-4">
          Sàn Đấu Giá <Gavel className="text-purple-600" size={48} />
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl font-medium">Tranh giành những tác phẩm độc bản tại EtherVault.</p>
      </header>

      <div className="flex gap-4 mb-10 border-b border-gray-200 pb-px">
        {/* 💡 Sử dụng handleTabChange thay vì setActiveTab */}
        <button onClick={() => handleTabChange("active")} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === "active" ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-400 hover:text-gray-600"}`}>
          Đang diễn ra ({auctionsList.filter(a => a.active).length})
        </button>
        <button onClick={() => handleTabChange("completed")} className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === "completed" ? "text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:text-gray-600"}`}>
          Đã kết thúc ({auctionsList.filter(a => !a.active).length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="font-bold text-gray-500 uppercase">Đang đồng bộ...</p></div>
      ) : displayAuctions.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold">Không có dữ liệu</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {displayAuctions.map((item) => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/auction/${item.id}`)} // 💡 Dùng đường dẫn chuẩn
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-gray-900 shadow-sm">{item.category}</div>
                {!item.active && <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={12} /> Đã chốt</div>}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-900 truncate">{item.name}</h3>
                
                <div 
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.seller}`); }}
                  className="flex items-center gap-2 mt-1 mb-4 group/author w-fit"
                >
                  <div className="w-5 h-5 rounded-full" style={{ background: generateGradient(item.seller) }}></div>
                  <p className="text-xs text-gray-400 font-bold group-hover/author:text-purple-600 transition-colors">@{shortenAddress(item.seller)}</p>
                </div>
                
                <div className="mt-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{item.active ? "Giá hiện tại" : "Giá chốt thầu"}</p>
                  <p className={`text-xl font-black italic ${item.active ? "text-purple-600" : "text-green-600"}`}>
                    {item.highestBid === "0.0" ? item.minPrice : item.highestBid} ETH
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}