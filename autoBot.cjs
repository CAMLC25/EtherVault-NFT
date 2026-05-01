require("dotenv").config(); // Tự động load dữ liệu từ file .env
const { ethers } = require("ethers");

// ==========================================
// 1. ĐỌC CONFIG TỪ FILE .ENV (Bảo mật & Không lỗi Hardhat)
// ==========================================
const RPC_URL = process.env.GANACHE_URL; 
const ADMIN_PRIVATE_KEY = process.env.GANACHE_PRIVATE_KEY; 

if (!ADMIN_PRIVATE_KEY) {
  console.error("❌ Lỗi: Không tìm thấy GANACHE_PRIVATE_KEY trong file .env");
  process.exit(1);
}

// ==========================================
// 2. TỰ ĐỘNG ĐỌC ĐỊA CHỈ CONTRACT
// ==========================================
const addresses = require("./src/constants/contractAddress.json");
const AUCTION_ADDRESS = addresses.auction;

// ==========================================
// 3. TỰ ĐỘNG LẤY ABI TỪ ARTIFACTS
// ==========================================
const auctionArtifact = require("./artifacts/contracts/Auction.sol/AuctionMarket.json");
const AUCTION_ABI = auctionArtifact.abi;

// ==========================================
// KHỞI TẠO KẾT NỐI
// ==========================================
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
const auctionContract = new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI, adminWallet);

async function runBot() {
  console.log("==================================================");
  console.log("🤖 [ETHERVAULT BOT] Đang khởi động hệ thống...");
  console.log(`📡 RPC Node: ${RPC_URL}`);
  console.log(`🏦 Ví Admin:  ${adminWallet.address}`);
  console.log(`📜 Contract:  ${AUCTION_ADDRESS}`);
  console.log("==================================================\n");

  // Vòng lặp quét liên tục mỗi 5 giây
  setInterval(async () => {
    try {
      const tokenIds = await auctionContract.getAllAuctionTokenIds();
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < tokenIds.length; i++) {
        const id = tokenIds[i].toNumber();
        const auction = await auctionContract.auctions(id);

        // LOGIC TỰ ĐỘNG: Active == true VÀ Giờ hiện tại >= Giờ kết thúc
        if (auction.active && now >= auction.endTime) {
          console.log(`⏳ NFT #${id} đã hết giờ đấu giá! Đang kích hoạt lệnh đóng phiên...`);
          
          const tx = await auctionContract.completeAuction(id, { gasLimit: 500000 });
          await tx.wait(); // Chờ giao dịch được block xác nhận
          
          console.log(`✅ [THÀNH CÔNG] Đã chốt đơn NFT #${id}! Lịch sử và tiền đã được cập nhật.\n`);
        }
      }
    } catch (error) {
      console.log("❌ Lỗi mạng hoặc quét dữ liệu:", error.reason || error.message);
    }
  }, 5000);
}

runBot();