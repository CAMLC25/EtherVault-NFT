# 🎨 EtherVault  
### Decentralized NFT Marketplace & Auction Platform

**EtherVault** là một nền tảng thương mại điện tử phi tập trung (dApp) dành cho **NFT (Non-Fungible Tokens)**, cung cấp trải nghiệm mua bán và đấu giá tài sản số minh bạch, tự động và không cần trung gian.

---

## 🌟 Tính năng nổi bật

### 🧩 Kiến trúc Smart Contract
- `NFT.sol` – quản lý NFT  
- `Marketplace.sol` – mua bán  
- `Auction.sol` – đấu giá  
- `Bank.sol` – thanh toán  

➡️ Modular, dễ nâng cấp

---

### 🛒 Marketplace
- Niêm yết NFT  
- Mua trực tiếp  
- Hủy niêm yết  

---

### ⏱️ Đấu giá tự động
- Đấu giá theo thời gian  
- Auto refund người thua  
- Auto finalize khi hết giờ  

🔥 Không cần user thao tác

---

### 🤖 Off-chain Bot
- Lắng nghe blockchain  
- Tự động xử lý đấu giá  

---

### 👨‍🎨 Artist Profile
- Lịch sử giao dịch  
- Activity chi tiết  

---

### 🧪 Mock Data
- Tạo dữ liệu test nhanh  
- Không cần IPFS  

---

## 🛠️ Công nghệ

- Solidity, Hardhat, OpenZeppelin  
- ReactJS, Vite, Tailwind  
- Ethers.js  
- Node.js  
- Ganache  

---

## 🏗️ Kiến trúc

```
User
 ↓
React + Ethers.js
 ↓
Smart Contracts
 ↓
Blockchain (Ganache)
 ↑
Bot (Node.js)
```

---

## 🚀 Setup

### Yêu cầu
- Node.js (v16 hoặc v18)  
- MetaMask  
- Ganache  

---

### Clone

```bash
git clone https://github.com/CAMLC25/EtherVault-NFT.git
cd EtherVault-NFT
npm install
```

---

### Setup Ganache

- RPC: http://127.0.0.1:7545  
- Chain ID: 1337  
- Import private key  

---

### Deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

---

### Seed data

```bash
node autoBot.cjs
```

---

### Run Bot

```bash
node autoBot.cjs
```

⚠️ Phải chạy liên tục

---

### Run Frontend

```bash
npm run dev
```

👉 http://localhost:5173

---

## 🔐 .env

```env
PRIVATE_KEY="your_private_key"
VITE_RPC_URL="http://127.0.0.1:7545"

VITE_PINATA_API_KEY="your_key"
VITE_PINATA_SECRET_API_KEY="your_secret"
```

---

## 📁 Structure

```
contracts/
 ├ NFT.sol
 ├ Marketplace.sol
 ├ Auction.sol
 └ Bank.sol

scripts/
 └ deploy.js

src/
 ├ components/
 ├ context/
 ├ pages/
 ├ services/
 └ constants.js

autoBot.cjs
hardhat.config.js
package.json
```

---

## 💡 Highlights

- Modular Contracts  
- Auto Auction (Bot)  
- Easy Demo  
- Web3 Portfolio Ready  

---

## 🚧 Future

- Deploy Testnet  
- Royalty  
- Lazy Mint  
- IPFS thật  
- Realtime UI  

---

## 👨‍💻 Author

**Cam**