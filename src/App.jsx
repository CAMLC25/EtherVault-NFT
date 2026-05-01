import React from "react";
// 💡 Thêm thư viện Router
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Auction from "./pages/Auction";
import Profile from "./pages/Profile";
import CreateNFT from "./pages/CreateNFT";
import AuctionDetail from "./pages/AuctionDetail";
import ExploreDetail from "./pages/ExploreDetail";
import OwnedDetail from "./pages/OwnedDetail";
import Transfer from "./pages/Transfer";
import Collection from "./pages/Collection";

export default function App() {
  return (
    <Web3Provider>
      {/* 💡 Bao bọc toàn bộ App bằng Router */}
      <Router>
        <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
          {/* Navbar giờ không cần nhận Props nữa, nó sẽ tự đọc URL */}
          <Navbar />
          
          <div className="flex-1 pt-24 pb-20">
            {/* 💡 Khai báo các đường dẫn URL tại đây */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/explore/:id" element={<ExploreDetail />} />
              <Route path="/auction" element={<Auction />} />
              <Route path="/auction/:id" element={<AuctionDetail />} />
              <Route path="/create" element={<CreateNFT />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/profile/:id?" element={<Profile />} />
              <Route path="/owned/:id" element={<OwnedDetail />} />
              <Route path="/collection" element={<Collection />} />
              
              {/* Nếu gõ bậy bạ, vứt về trang chủ */}
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
          
          <footer className="border-t border-gray-200 py-8 px-12 bg-white text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            © 2026 ETHERVAULT. BẢO LƯU MỌI QUYỀN.
          </footer>
        </div>
      </Router>
    </Web3Provider>
  );
}