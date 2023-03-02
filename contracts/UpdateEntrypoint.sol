// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

/// @dev Test contract to check delegate calls with EIP4337 and safe 

contract UpdateEntryPoint  {
    address public entryPoint;

    function updateEntryPoint(address _entryPoint) public {
        entryPoint = _entryPoint;
    }
}
