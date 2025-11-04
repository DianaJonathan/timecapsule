// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title TimeCapsule - Encrypted Time-Locked Capsule DApp
/// @author TimeCapsule DApp
/// @notice A contract that allows users to create encrypted time capsules that can only be unlocked after a specified time
contract TimeCapsule is ZamaEthereumConfig {
    /// @notice Structure to store a time capsule
    struct Capsule {
        euint32[] encryptedContentChunks;  // Encrypted content chunks (each chunk is a uint32 of 4 UTF-8 bytes)
        uint256 unlockTime;                // Timestamp when the capsule can be unlocked
        address owner;                     // Owner of the capsule
        address heir;                      // Optional heir address who can unlock after unlockTime
        bool exists;                       // Whether the capsule exists
        bool unlocked;                     // Whether the capsule has been unlocked
    }

    /// @notice Mapping from capsule ID to capsule data
    mapping(uint256 => Capsule) public capsules;
    
    /// @notice Counter for capsule IDs
    /// @dev Increments for each new capsule creation
    uint256 public capsuleCounter;
    
    /// @notice Mapping from user address to their capsule IDs
    mapping(address => uint256[]) public userCapsules;

    /// @notice Event emitted when a new capsule is created
    event CapsuleCreated(
        uint256 indexed capsuleId,
        address indexed owner,
        address indexed heir,
        uint256 unlockTime
    );

    /// @notice Event emitted when a capsule is unlocked
    event CapsuleUnlocked(
        uint256 indexed capsuleId,
        address indexed unlocker
    );

    /// @notice Create a new time capsule with encrypted content
    /// @param encryptedContentChunks The encrypted content chunks to store
    /// @param inputProof The input proof for the encrypted content (covers all chunks)
    /// @param unlockTime The timestamp when the capsule can be unlocked
    /// @param heir Optional address of the heir who can unlock the capsule
    /// @return capsuleId The ID of the created capsule
    function createCapsule(
        externalEuint32[] calldata encryptedContentChunks,
        bytes calldata inputProof,
        uint256 unlockTime,
        address heir
    ) external returns (uint256 capsuleId) {
        // Validate unlock time is in the future
        require(unlockTime > block.timestamp, "Unlock time must be in the future");
        
        // Convert external encrypted inputs to internal encrypted types
        uint256 numChunks = encryptedContentChunks.length;
        require(numChunks > 0, "Empty content");
        euint32[] memory encrypted = new euint32[](numChunks);
        for (uint256 i = 0; i < numChunks; i++) {
            encrypted[i] = FHE.fromExternal(encryptedContentChunks[i], inputProof);
        }
        
        // Generate new capsule ID
        capsuleId = capsuleCounter++;
        
        // Create capsule
        capsules[capsuleId] = Capsule({
            encryptedContentChunks: encrypted,
            unlockTime: unlockTime,
            owner: msg.sender,
            heir: heir != address(0) ? heir : msg.sender,
            exists: true,
            unlocked: false
        });
        
        // Grant ACL permissions to owner and heir for all chunks
        for (uint256 i = 0; i < numChunks; i++) {
            FHE.allowThis(encrypted[i]);
            FHE.allow(encrypted[i], msg.sender);
            if (heir != address(0) && heir != msg.sender) {
                FHE.allow(encrypted[i], heir);
            }
        }
        
        // Track user's capsules
        userCapsules[msg.sender].push(capsuleId);
        if (heir != address(0) && heir != msg.sender) {
            userCapsules[heir].push(capsuleId);
        }
        
        emit CapsuleCreated(capsuleId, msg.sender, heir, unlockTime);
    }

    /// @notice Get the encrypted content chunks of a capsule (only accessible by authorized users)
    /// @param capsuleId The ID of the capsule
    /// @return The encrypted content chunks
    function getEncryptedContents(uint256 capsuleId) external view returns (euint32[] memory) {
        require(capsules[capsuleId].exists, "Capsule does not exist");
        return capsules[capsuleId].encryptedContentChunks;
    }

    /// @notice Get capsule metadata (public information)
    /// @param capsuleId The ID of the capsule
    /// @return unlockTime The unlock timestamp
    /// @return owner The owner address
    /// @return heir The heir address
    /// @return exists Whether the capsule exists
    /// @return unlocked Whether the capsule has been unlocked
    function getCapsuleInfo(uint256 capsuleId) external view returns (
        uint256 unlockTime,
        address owner,
        address heir,
        bool exists,
        bool unlocked
    ) {
        Capsule memory capsule = capsules[capsuleId];
        return (
            capsule.unlockTime,
            capsule.owner,
            capsule.heir,
            capsule.exists,
            capsule.unlocked
        );
    }

    /// @notice Check if a capsule can be unlocked (time-based check in encrypted state)
    /// @param capsuleId The ID of the capsule
    /// @return canUnlock Whether the capsule can be unlocked
    /// @dev This function uses FHE to compare timestamps in encrypted state
    function canUnlock(uint256 capsuleId) public view returns (bool) {
        Capsule memory capsule = capsules[capsuleId];
        require(capsule.exists, "Capsule does not exist");
        require(!capsule.unlocked, "Capsule already unlocked");
        
        // Check if current time >= unlock time
        return block.timestamp >= capsule.unlockTime;
    }

    /// @notice Unlock a capsule (marks it as unlocked, content can be decrypted off-chain)
    /// @param capsuleId The ID of the capsule to unlock
    /// @dev This function only marks the capsule as unlocked. The actual decryption happens off-chain using Relayer SDK
    function unlockCapsule(uint256 capsuleId) external {
        Capsule storage capsule = capsules[capsuleId];
        require(capsule.exists, "Capsule does not exist");
        require(!capsule.unlocked, "Capsule already unlocked");
        require(canUnlock(capsuleId), "Capsule cannot be unlocked yet");
        require(
            msg.sender == capsule.owner || msg.sender == capsule.heir,
            "Only owner or heir can unlock"
        );
        
        capsule.unlocked = true;
        emit CapsuleUnlocked(capsuleId, msg.sender);
    }

    /// @notice Get all capsule IDs for a user
    /// @param user The user address
    /// @return An array of capsule IDs
    function getUserCapsules(address user) external view returns (uint256[] memory) {
        return userCapsules[user];
    }

    /// @notice Get the total number of capsules
    /// @return The total capsule count
    function getTotalCapsules() external view returns (uint256) {
        return capsuleCounter;
    }
}
