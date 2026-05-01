# 🎨 EtherVault - Decentralized NFT Marketplace & Auction Platform

EtherVault là một nền tảng thương mại điện tử phi tập trung (dApp) dành riêng cho Tài sản số (NFT). Dự án kết hợp kiến trúc On-chain (Hợp đồng thông minh) và Off-chain (Bot tự động) để mang lại trải nghiệm đấu giá và mua bán NFT liền mạch, minh bạch trên nền tảng Ethereum/Ganache.

## 🌟 Tính năng nổi bật
* **Kiến trúc phân quyền Contract:** Tách biệt logic xử lý thành các hợp đồng `NFT.sol`, `Marketplace.sol`, `Auction.sol` và `Bank.sol` giúp hệ thống dễ dàng nâng cấp và bảo trì.
* **Thị trường cố định (Marketplace):** Mua, bán, và hủy niêm yết NFT với mức giá cố định.
* **Đấu giá tự động (Automated Auction):** Đấu giá thời gian thực với logic tự động hoàn tiền (Refund) cho người thua. Đặc biệt, hệ thống tích hợp **Off-chain Bot** tự động xác nhận và chốt thầu khi hết thời gian mà không cần người dùng thao tác.
* **Hồ sơ nghệ sĩ (Artist Profile):** Truy xuất và hiển thị toàn bộ vòng đời, lịch sử giao dịch và dòng tiền (Item Activity) của NFT cực kỳ chi tiết.
* **Hệ thống Mock Data:** Tích hợp script tạo dữ liệu mẫu cục bộ, giúp quá trình kiểm thử (testing) diễn ra nhanh chóng mà không phụ thuộc vào IPFS API.

## 🛠️ Công nghệ & Kiến trúc
* **Smart Contract:** Solidity, Hardhat, OpenZeppelin.
* **Frontend:** ReactJS, Vite, Tailwind CSS, Ethers.js.
* **Off-chain Automation:** Node.js (Ethers.js provider script).
* **Local Blockchain:** Ganache.

---

## 🚀 Hướng dẫn Cài đặt & Triển khai cục bộ (Local Development)

Làm theo các bước dưới đây để chạy dự án trên máy tính cá nhân.

### Yêu cầu hệ thống:
* Node.js (phiên bản 16.x hoặc 18.x)
* MetaMask Extension cài đặt trên trình duyệt
* Ganache (Phần mềm Local Blockchain)

### Bước 1: Khởi tạo dự án
\`\`\`bash
git clone https://github.com/TenCuaBan/EtherVault-NFT.git
cd EtherVault-NFT
npm install
\`\`\`

### Bước 2: Thiết lập mạng Ganache & Biến môi trường
1. Mở **Ganache**, tạo workspace mới ở port `7545` (hoặc `8545` tùy cấu hình của bạn).
2. Mở **MetaMask**, thêm mạng `Ganache Local` (RPC: http://127.0.0.1:7545, Chain ID: 1337).
3. Import Private Key từ Ganache vào MetaMask.
4. Tạo file `.env` ở thư mục gốc (nếu có sử dụng biến môi trường cho Pinata/Private Key).

### Bước 3: Triển khai Smart Contract
Mở Terminal 1 và chạy lệnh deploy:
\`\`\`bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
\`\`\`

### Bước 4: Khởi tạo dữ liệu mẫu (Seeding Data)
Chạy script tự động đúc và niêm yết NFT mẫu để có dữ liệu test ngay lập tức mà không cần tốn giới hạn API của IPFS:
\`\`\`bash
node autoNFT.cjs
\`\`\`

### Bước 5: Khởi động Bot Tự động (Off-chain Worker)
Mở Terminal 2 và chạy Bot để hệ thống tự động lắng nghe và chốt các phiên đấu giá đã hết giờ:
\`\`\`bash
node autoBot.cjs
\`\`\`
*(Hãy để Terminal này chạy ngầm trong suốt quá trình test web).*

### Bước 6: Chạy giao diện Web (Frontend)
Mở Terminal 3 và khởi động React Vite:
\`\`\`bash
npm run dev
\`\`\`
Truy cập vào `http://localhost:5173` để trải nghiệm hệ thống!