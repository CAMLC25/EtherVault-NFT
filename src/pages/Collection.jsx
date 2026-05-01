import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { 
  Layers, Search, Filter, Image as ImageIcon,
  CheckCircle2, Hexagon, Activity, Users, ShoppingBag, X
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { NFT_ADDRESS } from "../constants";

export default function Collection() {
  const navigate = useNavigate();
  const { nft, market } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, listed: 0, owners: 0, floorPrice: "---" });
  
  // State cho bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Art", "Music", "Video", "Domain", "Virtual World"];

  const fetchCollection = async () => {
    if (!nft || !market) return;
    setLoading(true);
    
    try {
      // 1. Lấy tổng số lượng NFT đang tồn tại từ Smart Contract
      const totalSupplyBN = await nft.totalSupply();
      const total = totalSupplyBN.toNumber();

      if (total === 0) {
        setNfts([]);
        setStats({ total: 0, listed: 0, owners: 0, floorPrice: "---" });
        setLoading(false);
        return;
      }

      // 2. Tạo danh sách các tác vụ tải dữ liệu song song (Performance Optimization)
      const fetchPromises = [];
      for (let i = 0; i < total; i++) {
        fetchPromises.push((async () => {
          try {
            // Lấy Token ID thực tế tại vị trí index i
            const tokenIdBN = await nft.tokenByIndex(i);
            const tokenId = tokenIdBN.toNumber();

            // Lấy thông tin Metadata và Trạng thái sở hữu/niêm yết
            const [owner, tokenURI, listing] = await Promise.all([
              nft.ownerOf(tokenId),
              nft.tokenURI(tokenId),
              market.listings(tokenId)
            ]);

            const response = await fetch(tokenURI);
            const metadata = await response.json();

            return {
              id: tokenId,
              name: metadata.name || `NFT #${tokenId}`,
              img: metadata.thumbnail || metadata.image || metadata.asset,
              category: metadata.category || "Art",
              owner: owner,
              price: listing.active ? ethers.utils.formatEther(listing.price) : null,
              active: listing.active
            };
          } catch (err) {
            console.error(`Lỗi tải NFT index ${i}:`, err);
            return null;
          }
        })());
      }

      const results = await Promise.all(fetchPromises);
      const validNfts = results.filter(item => item !== null);

      // 3. Tính toán thống kê từ dữ liệu đã tải
      const uniqueOwners = new Set(validNfts.map(n => n.owner.toLowerCase()));
      const listedItems = validNfts.filter(n => n.active);
      const prices = listedItems.map(n => parseFloat(n.price));
      const floor = prices.length > 0 ? Math.min(...prices).toFixed(3) : "---";

      setNfts(validNfts.reverse());
      setStats({
        total: validNfts.length,
        listed: listedItems.length,
        owners: uniqueOwners.size,
        floorPrice: floor
      });

    } catch (error) {
      console.error("Lỗi tổng thể bộ sưu tập:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollection(); }, [nft, market]);

  // 💡 Logic lọc NFT mượt mà không cần load lại trang
  const filteredNfts = useMemo(() => {
    return nfts.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.id.toString() === searchQuery;
      const matchCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [nfts, searchQuery, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20 animate-in fade-in duration-500">
      
      {/* BANNER & HEADER */}
      <div className="h-[280px] w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 -mt-20 relative z-10">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 mb-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-32 h-32 rounded-3xl bg-gray-900 flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
               <Hexagon size={50} className="text-blue-500 fill-blue-500/10" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-3xl font-black text-gray-900">EtherVault Genesis</h1>
                <CheckCircle2 size={20} className="text-blue-500 fill-blue-500/10" />
              </div>
              <p className="text-gray-500 text-sm max-w-2xl font-medium mb-6">
                Khám phá kho lưu trữ tài sản số nguyên bản. Mọi tác phẩm đều được xác thực bởi hợp đồng thông minh lõi của mạng lưới.
              </p>
              
              {/* STATS BAR */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 border-t pt-6">
                <StatItem label="Tổng số" value={stats.total} />
                <StatItem label="Đang bán" value={stats.listed} />
                <StatItem label="Chủ ví" value={stats.owners} />
                <StatItem label="Giá sàn" value={`${stats.floorPrice} ETH`} highlight />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc mã ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                  selectedCategory === cat 
                  ? "bg-gray-900 text-white border-gray-900" 
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* NFT GRID */}
        {loading ? (
          <div className="py-40 text-center flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Đang đồng bộ Sổ Cái...</p>
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="bg-white rounded-[3rem] py-32 text-center border border-gray-100 shadow-inner">
            <ImageIcon size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 italic">Không tìm thấy kết quả phù hợp</h3>
            {(searchQuery || selectedCategory !== "All") && (
              <button onClick={() => {setSearchQuery(""); setSelectedCategory("All")}} className="mt-4 text-blue-600 font-bold hover:underline">Xóa bộ lọc</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredNfts.map((item) => (
              <NFTCard key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Sub-component cho Stat Item
const StatItem = ({ label, value, highlight }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</span>
    <span className={`text-xl font-black ${highlight ? "text-blue-600" : "text-gray-900"}`}>{value}</span>
  </div>
);

// Sub-component cho NFT Card
const NFTCard = ({ item, navigate }) => (
  <div 
    onClick={() => navigate(`/explore/${item.id}`)}
    className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer"
  >
    <div className="aspect-square relative overflow-hidden bg-gray-100">
      <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase border border-white/10 shadow-lg">
        #{item.id}
      </div>
      {item.active && (
        <div className="absolute bottom-4 right-4 bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase shadow-lg animate-pulse">
          On Sale
        </div>
      )}
    </div>
    <div className="p-6">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{item.category}</p>
      <h3 className="text-lg font-black text-gray-900 truncate mb-4 group-hover:text-blue-600 transition-colors">{item.name}</h3>
      <div className="flex justify-between items-end pt-4 border-t border-gray-50">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Giá niêm yết</p>
          <p className="text-lg font-black text-gray-900">{item.active ? `${item.price} ETH` : "---"}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
          <ShoppingBag size={16} />
        </div>
      </div>
    </div>
  </div>
);