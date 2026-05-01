import React, { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js';
import { NFT_ADDRESS, NFT_ABI, MARKETPLACE_ADDRESS, MARKETPLACE_ABI, AUCTION_ADDRESS, AUCTION_ABI, BANK_ADDRESS, BANK_ABI } from '../constants';

const Web3Context = createContext();

const GANACHE_RPC = "http://127.0.0.1:7545";

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [contracts, setContracts] = useState({ nft: null, market: null, auction: null, bank: null });

  const initContracts = (signerOrProvider) => {
    setContracts({
      nft: new ethers.Contract(NFT_ADDRESS, NFT_ABI, signerOrProvider),
      market: new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signerOrProvider),
      auction: new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI, signerOrProvider),
      bank: new ethers.Contract(BANK_ADDRESS, BANK_ABI, signerOrProvider)
    });
  };

  const updateAccountInfo = async (walletAddress) => {
    setAccount(walletAddress);
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const bal = await provider.getBalance(walletAddress);
      setBalance(ethers.utils.formatEther(bal));

      const signer = provider.getSigner();
      initContracts(signer); 
    }
  };

  // 💡 1. NÚT KẾT NỐI VÍ
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        // Xóa dấu vết đăng xuất khi người dùng chủ động kết nối lại
        localStorage.removeItem("isDisconnected"); 
        await updateAccountInfo(accounts[0]);
      } catch (err) { 
        console.error("Người dùng từ chối kết nối!"); 
      }
    } else {
      alert("Vui lòng cài đặt MetaMask!");
    }
  };

  // 💡 2. HÀM MỚI: NGẮT KẾT NỐI
  const disconnectWallet = () => {
    // Đánh dấu vào trình duyệt là người dùng đã chủ động thoát
    localStorage.setItem("isDisconnected", "true");
    setAccount("");
    setBalance("");
    
    // Đưa hợp đồng về chế độ khách (Read-only)
    const readOnlyProvider = new ethers.providers.JsonRpcProvider(GANACHE_RPC);
    initContracts(readOnlyProvider);
  };

  // 💡 3. TỰ ĐỘNG KIỂM TRA VÍ NGẦM
  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return;
    
    // Nếu người dùng đã chủ động bấm nút "Đăng xuất" trước đó thì bỏ qua, KHÔNG auto-connect nữa
    if (localStorage.getItem("isDisconnected") === "true") return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await updateAccountInfo(accounts[0]);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra kết nối ví:", error);
    }
  };

  useEffect(() => {
    const readOnlyProvider = new ethers.providers.JsonRpcProvider(GANACHE_RPC);
    initContracts(readOnlyProvider);
    checkIfWalletIsConnected();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          localStorage.removeItem("isDisconnected"); // Xóa block nếu họ đổi ví trên MetaMask
          updateAccountInfo(accounts[0]);
        } else {
          disconnectWallet(); // Người dùng khóa ví trên MetaMask
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    // 💡 NHỚ XUẤT HÀM disconnectWallet RA NGOÀI NHÉ
    <Web3Context.Provider value={{ account, balance, connectWallet, disconnectWallet, ...contracts }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);