// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FixedPriceMarket is ReentrancyGuard, Ownable {
    uint256 public feePercent = 2; // Phí sàn 2%
    address public nftContract;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    /*
    =========================
    DỮ LIỆU SÀN GIAO DỊCH
    =========================
    */
    mapping(uint256 => Listing) public listings;
    uint256[] public listedTokenIds;

    /*
    =========================
    SỰ KIỆN (EVENTS) - Rất quan trọng cho lịch sử Activity
    =========================
    */
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event ListingCanceled(uint256 indexed tokenId, address indexed seller);

    // Lưu ý: Ownable chuẩn 5.0 cần truyền msg.sender vào constructor
    constructor(address _nftContract) Ownable() {
        nftContract = _nftContract;
    }

    /*
    =========================
    NIÊM YẾT NFT (LIST)
    =========================
    */
    function listNFT(uint256 _tokenId, uint256 _price) external nonReentrant {
        require(_price > 0, "Gia phai lon hon 0");

        // Chuyển NFT từ ví người bán vào hợp đồng sàn (Ký gửi)
        IERC721(nftContract).transferFrom(msg.sender, address(this), _tokenId);

        listings[_tokenId] = Listing({
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            active: true
        });

        listedTokenIds.push(_tokenId);

        emit NFTListed(_tokenId, msg.sender, _price);
    }

    /*
    =========================
    HỦY NIÊM YẾT (CANCEL) - MỚI BỔ SUNG
    =========================
    */
    function cancelListing(uint256 _tokenId) external nonReentrant {
        Listing storage listing = listings[_tokenId];

        require(listing.active, "NFT nay khong trong trang thai ban");
        require(listing.seller == msg.sender, "Ban khong phai chu so huu");

        // Đánh dấu ngừng bán
        listing.active = false;

        // Trả NFT từ sàn về lại ví người bán
        IERC721(nftContract).transferFrom(address(this), msg.sender, _tokenId);

        emit ListingCanceled(_tokenId, msg.sender);
    }

    /*
    =========================
    MUA NFT (BUY)
    =========================
    */
    function buyNFT(uint256 _tokenId) external payable nonReentrant {
        Listing storage listing = listings[_tokenId];

        require(listing.active, "NFT khong dang ban");
        require(msg.sender != listing.seller, "Khong the tu mua NFT cua minh");
        require(msg.value >= listing.price, "Khong du tien");

        uint256 price = listing.price;
        uint256 fee = (price * feePercent) / 100;
        uint256 sellerAmount = price - fee;

        // Chốt trạng thái trước khi chuyển tiền (Bảo mật)
        listing.active = false;

        // Chuyển tiền cho người bán và chủ sàn
        payable(listing.seller).transfer(sellerAmount);
        payable(owner()).transfer(fee);

        // Chuyển NFT từ sàn cho người mua
        IERC721(nftContract).transferFrom(address(this), msg.sender, _tokenId);

        // Trả lại tiền thừa nếu người dùng gửi dư
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTSold(_tokenId, listing.seller, msg.sender, price);
    }

    /*
    =========================
    VIEW FUNCTIONS
    =========================
    */
    function getAllListedTokenIds() public view returns (uint256[] memory) {
        return listedTokenIds;
    }

    function getTotalListings() public view returns (uint256) {
        return listedTokenIds.length;
    }

    // Cho phép chủ sàn thay đổi mức phí nếu cần
    function updateFeePercent(uint256 _newFee) external onlyOwner {
        require(_newFee <= 10, "Phi qua cao"); // Giới hạn tối đa 10%
        feePercent = _newFee;
    }
}
