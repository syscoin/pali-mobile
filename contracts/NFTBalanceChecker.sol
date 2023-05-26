// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title A simple contract for balance checking and ownership
/// @notice This contract allows to check balances and ownership of tokens
/// @dev This contract was decompiled and translated from bytecode
contract NFTBalanceChecker {
    
    /// @notice Check if an address is a contract
    /// @param token The address to check
    /// @return true if the address is a contract, false otherwise
    function isContract(address token) public view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(token)
        }
        return (size > 0);
    }

    /// @notice Get the owners of tokens
    /// @param users The addresses of the users
    /// @param tokens The addresses of the tokens
    /// @param ids The ids of the tokens
    /// @return The addresses of the owners
    function owners(address[] memory users, address[] memory tokens, uint256[] memory ids) public view returns (address[] memory) {
        require(users.length == tokens.length && tokens.length == ids.length, "Input arrays must have the same length");
        address[] memory result = new address[](users.length);
        for (uint i = 0; i < users.length; i++) {
            result[i] = IERC721(tokens[i]).ownerOf(ids[i]);
        }
        return result;
    }

    /// @notice Fallback function
    /// @dev This function will revert any incoming transaction
    receive() external payable {
        revert("NFTBalanceChecker does not accept payments");
    }

    /// @notice Get the balances of tokens
    /// @param users The addresses of the users
    /// @param tokens The addresses of the tokens
    /// @param ids The ids of the tokens
    /// @return The balances of the tokens
    function balances(address[] memory users, address[] memory tokens, uint256[] memory ids) public view returns (uint256[] memory) {
        require(users.length == tokens.length && tokens.length == ids.length, "Input arrays must have the same length");
        uint256[] memory result = new uint256[](users.length);
        for (uint i = 0; i < users.length; i++) {
            result[i] = IERC721(tokens[i]).balanceOf(users[i]);
        }
        return result;
    }
}
