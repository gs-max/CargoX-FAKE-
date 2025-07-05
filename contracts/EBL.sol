// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

struct BillOfLadingData {
    string shipper;
    string consignee;
    string portOfloading;
    string portOfDischarge;
    string vesselName;
    string cargoDescription;
}

contract EBL is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, Ownable {
    constructor(address initialOwner) ERC721("EBL", "ebl") Ownable(initialOwner) 
    {}

    uint256 private s_tokenCounter;
    mapping (uint256 => BillOfLadingData) private s_blData;
    event BillOfLoadingIssued(uint256 indexed tokenId, address indexed owner, BillOfLadingData data);

    address private s_operator;
    /*function safeMint(address to, uint256 tokenId, string memory uri)
        public
        onlyOwner
    {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }*/

    function issueBillOfLoading(address _owner, BillOfLadingData calldata _data) public onlyOperator{
        s_tokenCounter++;
        uint256 tokenId = s_tokenCounter;
        _safeMint(_owner, tokenId);
        s_blData[tokenId] = _data;
        
        emit BillOfLoadingIssued(tokenId, _owner, _data);
    }    // The following functions are overrides required by Solidity.

    function mint(address newOwner, uint256 tokenId) public {
        _safeMint(newOwner, tokenId);
    }
    
    modifier onlyOperator() {
        require(msg.sender == s_operator || msg.sender == owner(), "Not operator");
        _;
    }

    function setOperator(address _operator) public onlyOwner{
        s_operator = _operator;
    }
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function burnFrom(uint256 _tokenId) public onlyOperator{
        _burn(_tokenId);
    }

    function getBillOfLoadingData(uint256 _tokenId) public view returns(BillOfLadingData memory){
        return s_blData[_tokenId];
    }
}
