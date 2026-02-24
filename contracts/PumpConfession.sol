// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PumpConfession
 * @notice Stores crypto confessions on-chain forever. Deployed on Base.
 * @dev Only the owner (app wallet) can post confessions to prevent spam.
 *      Users confess via the web app, server posts on-chain on their behalf.
 */
contract PumpConfession {
    struct Confession {
        address sinner;         // wallet that confessed
        string confessionText;  // the confession itself
        string sinCategory;     // Greed, FOMO, Wrath, Sloth, Pride, Lust, Cope
        string sinLevel;        // Venial, Mortal, Cardinal, Unforgivable
        string aiResponse;      // Father Degen's judgment
        uint256 timestamp;
    }

    address public owner;
    Confession[] public confessions;
    uint256 public totalConfessions;

    // Events
    event ConfessionPosted(
        uint256 indexed id,
        address indexed sinner,
        string sinCategory,
        string sinLevel,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Post a confession on-chain (called by app wallet)
     */
    function confess(
        address _sinner,
        string calldata _confessionText,
        string calldata _sinCategory,
        string calldata _sinLevel,
        string calldata _aiResponse
    ) external onlyOwner returns (uint256) {
        uint256 id = confessions.length;
        
        confessions.push(Confession({
            sinner: _sinner,
            confessionText: _confessionText,
            sinCategory: _sinCategory,
            sinLevel: _sinLevel,
            aiResponse: _aiResponse,
            timestamp: block.timestamp
        }));

        totalConfessions = confessions.length;

        emit ConfessionPosted(id, _sinner, _sinCategory, _sinLevel, block.timestamp);

        return id;
    }

    /**
     * @notice Get a confession by ID
     */
    function getConfession(uint256 _id) external view returns (Confession memory) {
        require(_id < confessions.length, "Invalid ID");
        return confessions[_id];
    }

    /**
     * @notice Transfer ownership (in case you need to rotate app wallet)
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}
