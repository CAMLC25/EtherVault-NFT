require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // Lấy URL từ .env, nếu không có thì mặc định dùng localhost
      url: process.env.GANACHE_URL || "http://127.0.0.1:7545",
      chainId: 1337,
      // Lấy Private Key từ .env (Kiểm tra nếu có thì mới đưa vào mảng)
      accounts: process.env.GANACHE_PRIVATE_KEY ? [process.env.GANACHE_PRIVATE_KEY] : []
    }
  }
};