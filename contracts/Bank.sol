// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bank {
    // 💡 1. Tạo cái "Loa phát thanh" để lưu lịch sử
    // Chữ 'indexed' giúp ethers.js trên Web dễ dàng lọc (filter) giao dịch theo ví
    event TransferETH(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    // 💡 2. Hàm chuyển tiền (nhận ETH vào và chuyển đi ngay lập tức)
    function transferETH(address _to) external payable {
        // Kiểm tra điều kiện cơ bản
        require(msg.value > 0, "So tien gui phai lon hon 0");
        require(_to != address(0), "Khong the gui den dia chi 0");
        require(_to != msg.sender, "Khong the tu gui cho chinh minh");

        // Thực hiện lệnh chuyển ETH cho người nhận (dùng hàm call là chuẩn bảo mật nhất hiện nay)
        (bool success, ) = _to.call{value: msg.value}("");
        require(success, "Giao dich chuyen ETH that bai!");

        // Phát loa thông báo lưu vào Blockchain để ReactJS bắt được
        emit TransferETH(msg.sender, _to, msg.value, block.timestamp);
    }
}