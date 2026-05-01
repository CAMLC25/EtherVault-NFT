// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    // 1. Trong OZ V4, Ownable không nhận tham số trong constructor
    constructor() ERC721("EtherVault Art", "EVX") Ownable() {}

    function mintNFT(string memory _tokenURI) public returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, _tokenURI);
        
        return newItemId;
    }

    function getCurrentId() public view returns (uint256) {
        return _tokenIds;
    }

    // ===================================================================
    // CÁC HÀM OVERRIDE BẮT BUỘC DÀNH CHO OPENZEPPELIN V4.X
    // ===================================================================

    /**
     * @dev Hook chạy trước khi chuyển token (đây là hàm bản V4 yêu cầu)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    /**
     * @dev Ghi đè hàm hủy token để giải quyết xung đột giữa ERC721 và URIStorage
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Trả về link metadata
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Kiểm tra chuẩn interface hỗ trợ
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}