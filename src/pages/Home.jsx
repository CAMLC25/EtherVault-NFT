import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { AlertCircle, CheckCircle2, X } from 'lucide-react'; // 💡 Import Icon cho Dialog

export default function Home() {
  const navigate = useNavigate();
  const { account } = useWeb3(); // 💡 Lấy thông tin ví từ Context
  
  // 💡 STATE CHO CUSTOM DIALOG
  const [dialog, setDialog] = useState({ isOpen: false, type: "success", title: "", message: "" });
  const showDialog = (type, title, message) => setDialog({ isOpen: true, type, title, message });

  // 💡 LOGIC KIỂM TRA TRƯỚC KHI TẠO NFT
  const handleCreateClick = () => {
    if (!account) {
      showDialog("error", "Chưa kết nối ví", "Vui lòng kết nối ví MetaMask ở góc trên bên phải để bắt đầu tạo NFT!");
    } else {
      navigate('/create');
    }
  };

  const generateCatIcon = () => (
    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#fcd34d] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden rounded-xl">
      <img 
        src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent" 
        alt="avatar" 
        className="w-full h-full object-cover scale-125" 
      />
    </div>
  );

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-12 animate-in fade-in duration-700 min-h-[85vh] flex items-center relative">
      
      {/* 💡 CUSTOM DIALOG POPUP */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setDialog({ ...dialog, isOpen: false })} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner ${dialog.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {dialog.type === 'error' ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
            </div>
            
            <h3 className="text-2xl font-black text-center text-gray-900 mb-2">{dialog.title}</h3>
            <p className="text-center text-gray-500 font-medium mb-8 leading-relaxed">{dialog.message}</p>
            
            <button
              onClick={() => setDialog({ ...dialog, isOpen: false })}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
              }`}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      <section className="w-full py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-24 items-center">
        
        {/* === CỘT TRÁI: NỘI DUNG === */}
        <div className="space-y-8">
          <h1 className="text-6xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tighter text-gray-900">
            Khám phá, sưu tập và bán sản phẩm <span className="text-blue-600 italic">NFT</span>
            <span className="inline-block align-middle ml-4 mb-3">
              {generateCatIcon()}
            </span>
          </h1>
          
          <p className="text-xl text-gray-500 max-w-lg font-medium leading-relaxed">
            Tham gia vào tương lai của nghệ thuật số. Sở hữu những tác phẩm độc bản được bảo mật tuyệt đối trên nền tảng EtherVault.
          </p>
          
          <div className="flex gap-4 pt-2">
            <button 
              onClick={() => navigate('/explore')} 
              className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
            >
              Khám phá ngay
            </button>
            <button 
              onClick={handleCreateClick} // 💡 GỌI HÀM KIỂM TRA VÍ
              className="bg-white border-2 border-gray-200 text-gray-900 px-10 py-5 rounded-[2rem] font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Tạo NFT
            </button>
          </div>
        </div>

        {/* === CỘT PHẢI: MASONRY GRID LIÊN KẾT (SHARED VIBE) === */}
        <div className="relative w-full h-[550px] lg:h-[700px] grid grid-cols-2 gap-4 lg:gap-8">
          
          {/* 💡 SỢI DÂY LIÊN KẾT: Lớp Glow khổng lồ lan tỏa sau cả 3 ảnh */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>
          <div className="absolute top-1/4 left-1/4 w-[60%] h-[60%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

          {/* Nhóm Trái */}
          <div className="flex flex-col gap-4 lg:gap-8">
            {/* Ảnh 1: Hình khối Blue-Neon */}
            <div className="h-[45%] rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden bg-gray-900 relative group">
              <img 
                src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[30%] group-hover:grayscale-0" 
                alt="Digital Art 1" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-60"></div>
            </div>
            
            {/* Ảnh 2: Hình khối Purple-Neon */}
            <div className="h-[55%] rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden bg-gray-900 relative group">
              <img 
                src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=800&auto=format&fit=crop" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[30%] group-hover:grayscale-0" 
                alt="Digital Art 2" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-60"></div>
            </div>
          </div>

          {/* Nhóm Phải: Ảnh dài tiêu điểm */}
          <div className="pt-16 lg:pt-24">
            <div className="h-full rounded-[3rem] border border-white/30 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden bg-gray-900 relative group">
              <img 
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[20%] group-hover:grayscale-0" 
                alt="Focus Art" 
              />
              {/* Lớp phủ liên kết màu sắc giữa 3 ảnh */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500"></div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}