// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";

interface GnosisSafe {
    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, Enum.Operation operation)
        external
        returns (bool success);
}

/// @title Test module which lets a designated user give 10 "coins" per day for 0.1eth

contract TestModule {

    address public sender;
    address public safeWallet;
    uint256 public price = 0.1 ether;
    uint256 public period = 1 days;
    uint256 public coins;
    uint256 public coinsPerTxn = 10;

    // map receiver to the timestamp at which they last paid
    mapping(address => uint256) lastPayments;

    constructor(address _sender, address _safeWallet) {
        sender = _sender;
        safeWallet = _safeWallet;
    }

    function triggerPayment() public {
        
        require(sender == msg.sender);
        coins += coinsPerTxn;

        // revert if the payment period has not elapsed
        uint256 lastPayment = lastPayments[safeWallet];
        if (block.timestamp < lastPayment + period) {
            revert("Payment period has not elapsed");
        }

        // pay the subscription fee
        GnosisSafe safe = GnosisSafe(safeWallet);
        bool success = safe.execTransactionFromModule(
            address(this),
            price,
            abi.encodePacked(bytes4(keccak256("transferETH()"))),
            Enum.Operation.Call
        );

        if (!success) {
            revert("Payment failed");
        }

        lastPayments[safeWallet] = block.timestamp;
    }

    function getCoins() public view returns (uint256) {
        return coins;
    }

    function transferETH() payable public {
        (bool sent, ) = sender.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
    }

}