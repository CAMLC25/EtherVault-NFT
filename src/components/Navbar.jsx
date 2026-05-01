import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { Wallet, LogOut, User, Plus, ChevronDown, Menu, X, Send } from "lucide-react";

export default function Navbar() {
  // 💡 Đã lấy thêm hàm disconnectWallet từ context
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateGradient = (address) => {
    if (!address) return "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)";
    const c1 = `#${address.slice(2, 8)}`; const c2 = `#${address.slice(8, 14)}`; const c3 = `#${address.slice(-6)}`;
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  };

  const navLinks = [
    { id: "/explore", label: "Khám phá" },
    { id: "/auction", label: "Đấu giá" },
    // { id: "/collection", label: "Bộ sưu tập" }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-[76px] bg-white/90 backdrop-blur-xl border-b border-gray-100 z-50 flex items-center transition-all duration-300">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          
          {/* CỘT TRÁI: LOGO & LINKS */}
          <div className="flex items-center gap-8 shrink-0">
            <div onClick={() => handleNavigation("/")} className="text-2xl font-black tracking-tighter cursor-pointer flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-300">
                <span className="text-white text-sm -rotate-12 group-hover:rotate-0 transition-transform duration-300">E</span>
              </div>
              <span className="hidden sm:block">EtherVault</span>
            </div>
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavigation(link.id)}
                  className={`font-bold text-sm transition-all ${location.pathname.includes(link.id) ? "text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* CỘT PHẢI: TẠO NFT & TÀI KHOẢN */}
          <div className="flex items-center justify-end gap-3 shrink-0">
            {account && (
              <button onClick={() => handleNavigation("/create")} className="hidden md:flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-900 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm">
                <Plus size={18} /> Tạo NFT
              </button>
            )}
            
            {!account ? (
              <button onClick={connectWallet} className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold text-sm transition-all items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95">
                <Wallet size={16} /> KẾT NỐI
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 p-1.5 pr-3 sm:pr-4 bg-white border border-gray-200 hover:border-gray-300 rounded-full transition-all group shadow-sm active:scale-95">
                  <div className="w-8 h-8 rounded-full shadow-inner border border-black/5" style={{ background: generateGradient(account) }}></div>
                  <span className="hidden sm:block font-mono text-sm font-bold text-gray-700">{account.slice(0, 4)}...{account.slice(-4)}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden py-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                    <div className="px-5 py-3 border-b border-gray-50 mb-2 bg-gray-50/50">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Ví đã kết nối</p>
                      <p className="font-mono text-sm font-bold text-gray-900 truncate">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ""}</p>
                    </div>
                    
                    <button onClick={() => handleNavigation("/profile")} className="w-full px-5 py-3 flex items-center gap-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={18} className="text-gray-400" /> Hồ sơ của tôi
                    </button>
                    
                    <button onClick={() => handleNavigation("/transfer")} className="w-full px-5 py-3 flex items-center gap-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      <Send size={18} className="text-blue-500" /> Chuyển tiền
                    </button>
                    
                    <div className="h-px bg-gray-100 my-2 mx-4"></div>
                    {/* 💡 SỬ DỤNG disconnectWallet THAY VÌ reload() */}
                    <button onClick={() => { disconnectWallet(); setIsDropdownOpen(false); }} className="w-full px-5 py-3 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut size={18} /> Ngắt kết nối ví
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">E</span>
              </div>
              EtherVault
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 text-gray-600 rounded-full">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {!account && (
              <button onClick={() => { connectWallet(); setIsMobileMenuOpen(false); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2">
                <Wallet size={20} /> KẾT NỐI VÍ
              </button>
            )}
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Menu Chính</p>
              <button onClick={() => handleNavigation("/explore")} className="w-full text-left text-2xl font-black text-gray-900 py-2">Khám phá</button>
              <button onClick={() => handleNavigation("/auction")} className="w-full text-left text-2xl font-black text-gray-900 py-2">Đấu giá</button>
              <button onClick={() => handleNavigation("/transfer")} className="w-full text-left text-2xl font-black text-gray-900 py-2">Chuyển tiền</button>
              {account && (
                <>
                  <button onClick={() => handleNavigation("/create")} className="w-full text-left text-2xl font-black text-blue-600 py-2 flex items-center gap-2">
                    Tạo NFT mới <Plus size={24} />
                  </button>
                  {/* 💡 Bổ sung nút Ngắt kết nối cho Mobile Menu */}
                  <button onClick={() => { disconnectWallet(); setIsMobileMenuOpen(false); }} className="w-full text-left text-2xl font-black text-red-500 py-2 flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    Ngắt kết nối <LogOut size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}