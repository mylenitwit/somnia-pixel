// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PixelCanvas {
    uint256 public constant CANVAS_SIZE = 1024;
    uint256 public constant PRICE_PER_PIXEL = 0.01 ether; // 1 STT (native token)
    
    // Pixel struct to store color and owner
    struct Pixel {
        address owner;
        uint24 color; // RGB color represented as uint24
    }
    
    // 2D array to store all pixels
    mapping(uint256 => mapping(uint256 => Pixel)) public canvas;
    
    // Event emitted when a pixel is colored
    event PixelColored(uint256 x, uint256 y, uint24 color, address owner);
    
    // Function to color a pixel
    function colorPixel(uint256 x, uint256 y, uint24 color) external payable {
        // Check if coordinates are within canvas bounds
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Coordinates out of bounds");
        
        // Check if enough payment is sent
        require(msg.value >= PRICE_PER_PIXEL, "Insufficient payment");
        
        // Update the pixel
        canvas[x][y] = Pixel(msg.sender, color);
        
        // Emit event
        emit PixelColored(x, y, color, msg.sender);
    }
    
    // Function to get a pixel's information
    function getPixel(uint256 x, uint256 y) external view returns (address owner, uint24 color) {
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Coordinates out of bounds");
        Pixel memory pixel = canvas[x][y];
        return (pixel.owner, pixel.color);
    }
    
    // Function to withdraw funds (for contract owner)
    function withdraw() external {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Simple owner implementation
    address private _owner;
    
    constructor() {
        _owner = msg.sender;
    }
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not the owner");
        _;
    }
} 