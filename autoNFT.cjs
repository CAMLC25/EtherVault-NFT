const { ethers } = require("ethers");

// ==========================================
// 1. CẤU HÌNH KẾT NỐI & SMART CONTRACT
// ==========================================
const RPC_URL = "http://127.0.0.1:7545"; 
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// 3 ĐỊA CHỈ CONTRACT CỦA BẠN:
const NFT_ADDRESS = "0xB06522E87a14C0E446868E81E4Db536801D93042";
const MARKET_ADDRESS = "0xa335908b79BA0b101f74877AA386e0Ac5B81D03e";
const AUCTION_ADDRESS = "0xe911336485F23F71424D0afb08B30E14E1fc6429";

// Private Keys của bạn
const PRIVATE_KEYS = [
  "0x7807fbcba8861cc8f8debd117406a36e5208fdbee62c094d445cc2c0cfb66b38"
];

// 💡 ĐÃ SỬA: Đổi "mint" thành "mintNFT" chuẩn theo file .sol của bạn
const NFT_ABI = [
  "function mintNFT(string memory tokenURI) public returns (uint256)",
  "function approve(address to, uint256 tokenId) public",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const MARKET_ABI = [
  "function listNFT(uint256 tokenId, uint256 price) public"
];

const AUCTION_ABI = [
  "function startAuction(uint256 tokenId, uint256 minPrice, uint256 startTime, uint256 endTime) public"
];

// ==========================================
// 2. KHO DỮ LIỆU MẪU (MOCK DATA)
// ==========================================
const MOCK_NFTS = [
  { name: "Hổ vằn siêu ngầu", desc: "Ảnh hổ vằn cực chất", category: "image", url: "https://picsum.photos/seed/tiger/600", price: "1.5" },
  { name: "Chill Music lofi", desc: "Nhạc lofi không lời", category: "audio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", thumbnail: "https://picsum.photos/seed/music/600", price: "0.8" },
  { name: "Video hoạt hình", desc: "Đoạn video ngắn", category: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", price: "2.5" },
  { name: "Sách Trắng Web3", desc: "Tài liệu kỹ thuật", category: "document", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", thumbnail: "https://picsum.photos/seed/doc/600", price: "0.5" },
  { name: "Khỉ buồn bã", desc: "Bored Ape nhái", category: "image", url: "https://picsum.photos/seed/ape/600", price: "10.0" }
];

const createTokenURI = (nft) => {
  const json = JSON.stringify({
    name: nft.name,
    description: nft.desc,
    category: nft.category,
    image: nft.url, 
    asset: nft.url, 
    thumbnail: nft.thumbnail || nft.url
  });
  return "data:application/json;base64," + Buffer.from(json).toString("base64");
};

// ==========================================
// 3. KỊCH BẢN CHẠY BOT
// ==========================================
async function runBot() {
  console.log("🤖 Khởi động Bot bơm NFT siêu tốc...");
  
  const txConfig = { gasLimit: 3000000 };

  for (let i = 0; i < MOCK_NFTS.length; i++) {
    const nftData = MOCK_NFTS[i];
    const pk = PRIVATE_KEYS[i % PRIVATE_KEYS.length]; 
    const wallet = new ethers.Wallet(pk, provider);
    
    const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, wallet);
    const marketContract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, wallet);
    const auctionContract = new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI, wallet);

    console.log(`\n⏳ Đang xử lý [${i+1}/${MOCK_NFTS.length}]: ${nftData.name} - Ví: ${wallet.address.slice(0,6)}...`);

    try {
      // 1. MINT NFT
      const tokenURI = createTokenURI(nftData);
      
      // 💡 ĐÃ SỬA: Gọi đúng hàm "mintNFT"
      const txMint = await nftContract.mintNFT(tokenURI, txConfig);
      const receipt = await txMint.wait();
      
      const event = receipt.events?.find(e => e.event === "Transfer");
      const tokenId = event.args.tokenId.toNumber();
      console.log(` ✅ Đúc thành công! TokenID: ${tokenId}`);

      // Chẵn thì Bán giá cố định, Lẻ thì Đấu giá
      if (i % 2 === 0) {
        // 2a. BÁN GIÁ CỐ ĐỊNH
        console.log(" ⏳ Đang cấp quyền cho Marketplace...");
        await (await nftContract.approve(MARKET_ADDRESS, tokenId, txConfig)).wait();
        
        console.log(" ⏳ Đang niêm yết lên sàn...");
        await (await marketContract.listNFT(tokenId, ethers.utils.parseEther(nftData.price), txConfig)).wait();
        console.log(` 🚀 Đã niêm yết [Giá cố định] với giá ${nftData.price} ETH`);
      } else {
        // 2b. ĐẤU GIÁ
        console.log(" ⏳ Đang cấp quyền cho Sàn Đấu Giá...");
        await (await nftContract.approve(AUCTION_ADDRESS, tokenId, txConfig)).wait();
        
        console.log(" ⏳ Đang mở phiên đấu giá...");
        const startTime = Math.floor(Date.now() / 1000);
        const endTime = startTime + 86400; // Đấu giá trong 24 giờ
        await (await auctionContract.startAuction(tokenId, ethers.utils.parseEther(nftData.price), startTime, endTime, txConfig)).wait(); 
        console.log(` 🚀 Đã mở [Đấu giá] giá khởi điểm ${nftData.price} ETH (Thời gian: 24h)`);
      }

    } catch (err) {
      console.error(` ❌ LỖI HỢP ĐỒNG tại NFT "${nftData.name}":`);
      if(err.message.includes("revert")) {
         console.error("   👉 Nguyên nhân: Contract từ chối giao dịch.");
      } else {
         console.error("   👉 Chi tiết:", err.message.substring(0, 150) + "...");
      }
    }
  }
  
  console.log("\n🎉 BOT ĐÃ HOÀN THÀNH NHIỆM VỤ! HÃY VÀO WEB F5 ĐỂ XEM THÀNH QUẢ!");
}

runBot();