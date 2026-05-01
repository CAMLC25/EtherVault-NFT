const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu triển khai hợp đồng lên Ganache...");

  // 1. Deploy NFT
  const NFT = await hre.ethers.getContractFactory("MyNFT");
  const nft = await NFT.deploy();
  await nft.deployed();
  console.log("✅ NFT Contract:", nft.address);

  // 2. Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("FixedPriceMarket");
  const marketplace = await Marketplace.deploy(nft.address);
  await marketplace.deployed();
  console.log("✅ Marketplace:", marketplace.address);

  // 3. Deploy Auction
  const Auction = await hre.ethers.getContractFactory("AuctionMarket");
  const auction = await Auction.deploy(nft.address);
  await auction.deployed();
  console.log("✅ Auction:", auction.address);

  // 💡 4. Deploy Bank (BỔ SUNG)
  const Bank = await hre.ethers.getContractFactory("Bank");
  const bank = await Bank.deploy();
  await bank.deployed();
  console.log("✅ Bank:", bank.address);

  // --- TỰ ĐỘNG XUẤT ĐỊA CHỈ ---
  const addresses = {
    nft: nft.address,
    marketplace: marketplace.address,
    auction: auction.address,
    bank: bank.address // 💡 Đã thêm địa chỉ Bank vào đây
  };

  const dir = "./src/constants";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    `${dir}/contractAddress.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log("🎉 Đã lưu toàn bộ địa chỉ vào src/constants/contractAddress.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});