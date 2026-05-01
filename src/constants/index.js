// 1. Tự động lấy địa chỉ từ file JSON sinh ra khi deploy
import addresses from './contractAddress.json';

// 2. Lấy ABI từ thư mục artifacts (Sau khi bạn chạy npx hardhat compile)
import nftArtifact from '../../artifacts/contracts/NFT.sol/MyNFT.json';
import marketArtifact from '../../artifacts/contracts/Marketplace.sol/FixedPriceMarket.json';
import auctionArtifact from '../../artifacts/contracts/Auction.sol/AuctionMarket.json';
import bankArtifact from '../../artifacts/contracts/Bank.sol/Bank.json';

export const NFT_ADDRESS = addresses.nft;
export const MARKETPLACE_ADDRESS = addresses.marketplace;
export const AUCTION_ADDRESS = addresses.auction;
export const BANK_ADDRESS = addresses.bank;

export const NFT_ABI = nftArtifact.abi;
export const MARKETPLACE_ABI = marketArtifact.abi;
export const AUCTION_ABI = auctionArtifact.abi;
export const BANK_ABI = bankArtifact.abi;