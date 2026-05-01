// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AuctionMarket is ReentrancyGuard {
    address public nftContract;

    /*
    =====================================
    SAVE ALL AUCTION TOKEN IDS
    =====================================
    */
    uint256[] public auctionTokenIds;

    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 minPrice;
        uint256 startTime; // Hẹn giờ bắt đầu
        uint256 endTime;   // Hẹn giờ kết thúc
        address highestBidder;
        uint256 highestBid;
        bool active;
    }

    /*
    tokenId => Auction
    */
    mapping(uint256 => Auction) public auctions;

    /*
    =====================================
    EVENTS (SỰ KIỆN LƯU LỊCH SỬ ĐẤU GIÁ)
    =====================================
    */
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 timestamp);
    event AuctionCanceled(uint256 indexed tokenId, address indexed seller); // 💡 Sự kiện hủy đấu giá

    constructor(address _nftContract) {
        nftContract = _nftContract;
    }

    /*
    =====================================
    START AUCTION
    =====================================
    */
    function startAuction(
        uint256 _tokenId,
        uint256 _minPrice,
        uint256 _startTime,
        uint256 _endTime
    ) external {
        require(_minPrice > 0, "Gia toi thieu phai > 0");
        require(!auctions[_tokenId].active, "NFT dang dau gia");
        require(_endTime > _startTime, "Thoi gian ket thuc phai sau thoi gian bat dau");

        /*
        Transfer NFT vao contract
        */
        IERC721(nftContract).transferFrom(
            msg.sender,
            address(this),
            _tokenId
        );

        /*
        Create auction
        */
        auctions[_tokenId] = Auction({
            tokenId: _tokenId,
            seller: msg.sender,
            minPrice: _minPrice,
            startTime: _startTime,
            endTime: _endTime,
            highestBidder: address(0),
            highestBid: 0,
            active: true
        });

        /*
        Save tokenId de frontend fetch duoc
        */
        auctionTokenIds.push(_tokenId);
    }

    /*
    =====================================
    PLACE BID
    =====================================
    */
    function placeBid(uint256 _tokenId)
        external
        payable
        nonReentrant
    {
        Auction storage auction = auctions[_tokenId];

        require(
            auction.active,
            "Auction khong ton tai"
        );

        require(
            block.timestamp >= auction.startTime,
            "Cuoc dau gia chua bat dau!"
        );

        require(
            block.timestamp < auction.endTime,
            "Dau gia da ket thuc"
        );

        require(
            msg.sender != auction.seller,
            "Khong the tu bid NFT cua minh"
        );

        require(
            msg.value > auction.minPrice &&
            msg.value > auction.highestBid,
            "Gia bid qua thap"
        );

        /*
        Refund nguoi bid truoc
        */
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(
                auction.highestBid
            );
        }

        /*
        Update highest bid
        */
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        /*
        PHÁT SỰ KIỆN ĐỂ FRONTEND LƯU LỊCH SỬ
        */
        emit BidPlaced(_tokenId, msg.sender, msg.value, block.timestamp);
    }

    /*
    =====================================
    CANCEL AUCTION (MỚI BỔ SUNG)
    =====================================
    */
    function cancelAuction(uint256 _tokenId) external nonReentrant {
        Auction storage auction = auctions[_tokenId];

        require(auction.active, "Phien dau gia khong active");
        require(auction.seller == msg.sender, "Ban khong phai nguoi tao dau gia");
        require(auction.highestBidder == address(0), "Da co nguoi dat gia, khong the huy");

        // Đánh dấu ngừng đấu giá
        auction.active = false;

        // Trả NFT về cho người bán
        IERC721(nftContract).transferFrom(address(this), msg.sender, _tokenId);

        emit AuctionCanceled(_tokenId, msg.sender);
    }

    /*
    =====================================
    COMPLETE AUCTION
    =====================================
    */
    function completeAuction(uint256 _tokenId)
        external
        nonReentrant
    {
        Auction storage auction = auctions[_tokenId];

        require(
            auction.active,
            "Auction khong active"
        );

        require(
            block.timestamp >= auction.endTime,
            "Chua den luc ket thuc"
        );

        auction.active = false;

        /*
        Co nguoi thang dau gia
        */
        if (auction.highestBidder != address(0)) {
            payable(auction.seller).transfer(
                auction.highestBid
            );

            IERC721(nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                _tokenId
            );
        }
        /*
        Khong ai bid -> tra lai seller
        */
        else {
            IERC721(nftContract).transferFrom(
                address(this),
                auction.seller,
                _tokenId
            );
        }
    }

    /*
    =====================================
    GET ALL AUCTION TOKEN IDS
    =====================================
    */
    function getAllAuctionTokenIds()
        public
        view
        returns (uint256[] memory)
    {
        return auctionTokenIds;
    }
}