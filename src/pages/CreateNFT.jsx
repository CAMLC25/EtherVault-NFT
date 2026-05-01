import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import {
  Upload, Image as ImageIcon, FileText, Music, Video,
  Tag, Gavel, Info, AlertCircle, CheckCircle2, X
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { uploadImageToIPFS, uploadMetadataToIPFS } from "../services/pinataService";

export default function CreateNFT() {
  const { account, nft, market, auction } = useWeb3();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "", description: "", category: "image",
    saleType: "fixed", price: "", royalty: "0",
    collection: "", tags: "", explicit: false,
    startTime: "", endTime: "", thumbnail: null, assetFile: null,
  });

  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState("");

  // 💡 STATE CHO CUSTOM DIALOG
  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });
  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });

  const categories = [
    { value: "image", label: "NFT Hình ảnh", icon: <ImageIcon size={18} /> },
    { value: "video", label: "NFT Video", icon: <Video size={18} /> },
    { value: "audio", label: "NFT Âm thanh", icon: <Music size={18} /> },
    { value: "document", label: "NFT Tài liệu", icon: <FileText size={18} /> },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, thumbnail: file }));
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleAssetFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, assetFile: file }));
  };

  const handleMint = async () => {
    try {
      if (!account) return showDialog("error", "Chưa kết nối ví", "Vui lòng kết nối ví MetaMask để đúc NFT!");
      if (!nft) return showDialog("error", "Lỗi hệ thống", "Hợp đồng Smart Contract chưa sẵn sàng!");

      const { name, description, category, saleType, price, royalty, thumbnail, assetFile, startTime, endTime } = formData;
      if (!name || !description || !price || !thumbnail || !assetFile) {
        return showDialog("error", "Thiếu thông tin", "Vui lòng điền đủ: Tên, Mô tả, Giá, Ảnh bìa và File tài sản!");
      }

      let startTimestamp = 0;
      let endTimestamp = 0;

      if (saleType === "auction") {
        if (!endTime) return showDialog("error", "Lỗi thời gian", "Vui lòng chọn thời gian kết thúc đấu giá!");
        const now = Date.now();
        const startMs = startTime ? new Date(startTime).getTime() : now;
        const endMs = new Date(endTime).getTime();

        if (startTime && startMs < now - 60000) return showDialog("error", "Lỗi thời gian", "Thời gian bắt đầu không được ở trong quá khứ!");
        if (endMs <= startMs) return showDialog("error", "Lỗi thời gian", "Thời gian kết thúc phải diễn ra sau thời gian bắt đầu!");

        startTimestamp = Math.floor(startMs / 1000);
        endTimestamp = Math.floor(endMs / 1000);
      }

      setLoading(true);
      
      // 💡 BƯỚC 1
      setStatusStep("1/4: Đang tải tài sản lên IPFS...");
      showDialog("info", "Đang xử lý...", "1/4: Đang mã hóa và tải tài sản lên mạng lưới IPFS...");
      const thumbnailURI = await uploadImageToIPFS(thumbnail);
      const assetURI = await uploadImageToIPFS(assetFile);

      // 💡 BƯỚC 2
      setStatusStep("2/4: Đang tạo Metadata...");
      showDialog("info", "Đang xử lý...", "2/4: Đang đóng gói Metadata và đưa lên IPFS...");
      const metadata = {
        name, description, category, saleType, price, royalty,
        thumbnail: thumbnailURI, asset: assetURI, creator: account,
        attributes: [ { trait_type: "Danh mục", value: category }, { trait_type: "Loại hình", value: saleType === "fixed" ? "Giá cố định" : "Đấu giá" } ],
      };
      const tokenURI = await uploadMetadataToIPFS(metadata);

      // 💡 BƯỚC 3
      setStatusStep("3/4: Đang đúc NFT trên Blockchain...");
      showDialog("info", "Đang xử lý...", "3/4: Vui lòng xác nhận giao dịch Đúc (Mint) trên MetaMask...");
      const mintTx = await nft.mintNFT(tokenURI);
      await mintTx.wait();
      const tokenId = await nft.getCurrentId();

      // 💡 BƯỚC 4
      setStatusStep("4/4: Đang niêm yết lên sàn...");
      showDialog("info", "Đang xử lý...", "4/4: Vui lòng xác nhận Cấp quyền & Niêm yết trên MetaMask...");
      const targetContract = saleType === "fixed" ? market.address : auction.address;
      const approveTx = await nft.approve(targetContract, tokenId);
      await approveTx.wait();

      if (saleType === "fixed") {
        const tx = await market.listNFT(tokenId, ethers.utils.parseEther(price));
        await tx.wait();
      } else {
        const tx = await auction.startAuction(tokenId, ethers.utils.parseEther(price), startTimestamp, endTimestamp);
        await tx.wait();
      }

      showDialog("success", "Thành công rực rỡ!", "NFT của bạn đã được đúc và niêm yết an toàn trên hệ thống.");
      setTimeout(() => navigate(saleType === "fixed" ? "/explore" : "/auction"), 2500); // 💡 Chuyển hướng sau khi xong

    } catch (error) {
      console.error(error);
      showDialog("error", "Giao dịch thất bại", "Có lỗi xảy ra hoặc bạn đã từ chối ký giao dịch trên MetaMask.");
    } finally {
      setLoading(false);
      setStatusStep("");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-6 py-12 relative">
      
      {/* 💡 CUSTOM DIALOG POPUP */}
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

      <section className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tạo & Niêm yết NFT</h1>
          <p className="text-gray-500">Khởi tạo tài sản kỹ thuật số độc bản và đưa lên sàn giao dịch EtherVault.</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* CỘT TRÁI: UPLOAD TÀI SẢN */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold mb-4 text-gray-700">Ảnh Bìa (Xem trước)</label>
              <label className="group relative border-2 border-dashed border-gray-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden bg-gray-50">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="mx-auto mb-2 text-gray-400 group-hover:text-blue-500" size={32} />
                    <span className="text-xs text-gray-400">PNG, JPG, WEBP (Max 10MB)</span>
                  </div>
                )}
                <input type="file" hidden accept="image/*" onChange={handleThumbnailChange} />
              </label>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold mb-3 text-gray-700">File Tài Sản Gốc</label>
              <input type="file" onChange={handleAssetFileChange} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              <p className="mt-2 text-[10px] text-gray-400 italic">* File này sẽ được lưu trữ bảo mật trên mạng lưới IPFS.</p>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN & PHƯƠNG THỨC BÁN */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Tên tác phẩm</label>
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="Ví dụ: Cryptopunk #9999" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Danh mục</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition">
                    {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Mô tả</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Cung cấp thông tin chi tiết về tác phẩm của bạn..." className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 resize-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              <hr className="border-gray-50" />

              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Loại hình niêm yết</label>
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => setFormData((prev) => ({ ...prev, saleType: "fixed" }))} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${formData.saleType === "fixed" ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                    <Tag size={18} className={formData.saleType === "fixed" ? "text-blue-600" : "text-gray-400"} />
                    <span className={`font-bold text-sm ${formData.saleType === "fixed" ? "text-blue-600" : "text-gray-600"}`}>Giá cố định</span>
                  </div>
                  <div onClick={() => setFormData((prev) => ({ ...prev, saleType: "auction" }))} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${formData.saleType === "auction" ? "border-purple-600 bg-purple-50" : "border-gray-100 hover:border-gray-200"}`}>
                    <Gavel size={18} className={formData.saleType === "auction" ? "text-purple-600" : "text-gray-400"} />
                    <span className={`font-bold text-sm ${formData.saleType === "auction" ? "text-purple-600" : "text-gray-600"}`}>Mở đấu giá</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl animate-in fade-in duration-300">
                {formData.saleType === "fixed" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-blue-700"><Info size={16} /><span className="text-xs font-bold uppercase tracking-wider">Giá Niêm Yết</span></div>
                    <div className="relative">
                      <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition pl-14 font-medium" />
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-900">ETH</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 text-purple-700"><Gavel size={16} /><span className="text-xs font-bold uppercase tracking-wider">Thông số phiên đấu giá</span></div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Giá khởi điểm</label>
                      <div className="relative">
                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.5" className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-purple-500 transition pl-14 font-medium" />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-900">ETH</span>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Bắt đầu <span className="text-[10px] font-normal normal-case">(Bỏ trống nếu bắt đầu ngay)</span></label>
                        <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Kết thúc <span className="text-red-500">*</span></label>
                        <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition font-medium" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2"><label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Phí bản quyền (%)</label><input type="number" name="royalty" value={formData.royalty} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3" placeholder="0" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Bộ sưu tập</label><input name="collection" value={formData.collection} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3" placeholder="Tên bộ sưu tập..." /></div>
              </div> */}

              <button onClick={handleMint} disabled={loading} className={`w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${loading ? "bg-gray-400" : formData.saleType === "fixed" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}>
                {loading ? "Đang xử lý giao dịch..." : "Đúc & Niêm Yết Ngay"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}