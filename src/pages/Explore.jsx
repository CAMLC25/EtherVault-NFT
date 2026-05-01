import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 💡 Chuẩn Router
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";
import { Search, Filter, AlertCircle, ShoppingBag, ChevronDown, Check } from "lucide-react";

export default function Explore() {
  const { market, nft } = useWeb3();
  const navigate = useNavigate();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);

  // CÁC STATE PHỤC VỤ TÌM KIẾM VÀ LỌC
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest"); // 'latest' | 'price_asc' | 'price_desc'
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Danh sách các danh mục
  const categories = [
    { id: "All", label: "Tất cả" },
    { id: "image", label: "Ảnh" },
    { id: "video", label: "Video" },
    { id: "document", label: "Tài liệu" },
    { id: "audio", label: "Nhạc" }
  ];

  // HÀM HELPER: Rút gọn ví & Tạo màu loang
  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const generateGradient = (addr) => {
    const c1 = `#${addr.slice(2, 8)}`;
    const c2 = `#${addr.slice(-6)}`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const fetchNFTs = async () => {
    try {
      if (!market || !nft) return;
      setLoading(true);

      const tokenIds = await market.getAllListedTokenIds();
      
      // 🚀 TỐI ƯU: Chạy song song tất cả các NFT cùng lúc
      const items = await Promise.all(tokenIds.map(async (idBN) => {
        const tokenId = idBN.toNumber();
        const listing = await market.listings(tokenId);

        if (!listing.active) return null;

        try {
          const tokenURI = await nft.tokenURI(tokenId);
          const response = await fetch(tokenURI);
          const metadata = await response.json();

          return {
            id: tokenId,
            name: metadata.name || `NFT #${tokenId}`,
            img: metadata.thumbnail || metadata.image || metadata.asset,
            category: metadata.category || "image", 
            price: ethers.utils.formatEther(listing.price),
            seller: listing.seller,
          };
        } catch (e) { return null; }
      }));

      // Lọc bỏ các NFT rỗng và chống trùng lặp
      const finalItems = items
        .filter(i => i !== null)
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      setNfts(finalItems.reverse()); // Mới nhất xếp trên
    } catch (error) {
      console.error("Lỗi nạp NFT:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNFTs(); }, [market, nft]);

  // LOGIC LỌC DỮ LIỆU TỔNG HỢP (Real-time)
  const displayedNfts = nfts.filter(item => {
    // 1. Lọc theo Category
    const matchCategory = activeCategory === "All" || item.category.toLowerCase() === activeCategory.toLowerCase();
    
    // 2. Lọc theo Tên (Search)
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    // 3. Sắp xếp theo Giá
    if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
    return 0; // 'latest' giữ nguyên thứ tự ban đầu
  });

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-in fade-in duration-500 relative">
      
      {/* HEADER & TÌM KIẾM */}
      <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-gray-900 flex items-center gap-4">
            Khám phá <ShoppingBag className="text-blue-600" size={48} />
          </h1>
          <p className="text-gray-500 text-lg max-w-xl font-medium">Duyệt qua các tác phẩm độc bản trên hệ sinh thái EtherVault.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* SEARCH BOX */}
          <div className="relative group flex-1 xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm NFT theo tên..." 
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 focus:border-blue-600 rounded-2xl outline-none shadow-sm font-medium transition-all" 
            />
          </div>

          {/* FILTER BUTTON & DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`flex items-center gap-3 bg-white border ${showSortMenu ? 'border-blue-600' : 'border-gray-100'} px-6 py-4 rounded-2xl hover:bg-gray-50 shadow-sm transition-all h-full font-bold text-gray-700`}
            >
              <Filter size={18}/> Lọc giá <ChevronDown size={16} className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`}/>
            </button>

            {/* Sort Menu Dropdown */}
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)}></div>
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden py-2 animate-in slide-in-from-top-2">
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Sắp xếp theo</div>
                  <button onClick={() => { setSortBy('latest'); setShowSortMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between font-bold text-sm transition-colors">
                    Mới nhất {sortBy === 'latest' && <Check size={16} className="text-blue-600"/>}
                  </button>
                  <button onClick={() => { setSortBy('price_asc'); setShowSortMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between font-bold text-sm transition-colors">
                    Giá: Thấp đến Cao {sortBy === 'price_asc' && <Check size={16} className="text-blue-600"/>}
                  </button>
                  <button onClick={() => { setSortBy('price_desc'); setShowSortMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between font-bold text-sm transition-colors">
                    Giá: Cao xuống Thấp {sortBy === 'price_desc' && <Check size={16} className="text-blue-600"/>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* TABS DANH MỤC */}
      <div className="flex overflow-x-auto gap-4 mb-10 pb-2 custom-scrollbar border-b border-gray-100">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
              activeCategory === category.id 
                ? "bg-gray-900 text-white shadow-md" 
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-50">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-gray-500 uppercase text-sm tracking-widest">Đang đồng bộ...</p>
        </div>
      ) : displayedNfts.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm border-dashed">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Không tìm thấy NFT nào</h2>
          <p className="text-gray-500 mt-2">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayedNfts.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/explore/${item.id}`)}
              className="group bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square bg-gray-50 overflow-hidden p-2">
                
                {/* 💡 ĐÃ SỬA: Ép dùng thẻ <img> cho mọi loại thumbnail để luôn hiển thị chuẩn */}
                <div className="w-full h-full rounded-[2rem] overflow-hidden">
                  <img 
                    src={item.img} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                    alt={item.name} 
                  />
                </div>
                
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-gray-900 shadow-sm">
                  {item.category}
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-blue-600 truncate transition-colors">{item.name}</h3>
                
                <div 
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.seller}`); }}
                  className="flex items-center gap-2 mb-6 group/author w-fit"
                >
                  <div className="w-5 h-5 rounded-full shadow-inner" style={{ background: generateGradient(item.seller) }}></div>
                  <p className="text-xs text-gray-400 font-bold group-hover/author:text-blue-600 transition-colors">@{shortenAddress(item.seller)}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Giá niêm yết</p>
                  <p className="text-2xl font-black text-gray-900 italic group-hover:text-blue-600 transition-colors">{item.price} <span className="text-sm font-bold text-gray-400 not-italic">ETH</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}