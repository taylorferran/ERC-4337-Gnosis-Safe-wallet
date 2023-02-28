// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;


import "./OpenfortWallet.sol";

contract OpenfortWalletFactory {
    OpenfortWallet public immutable accountImplementation;

    constructor() {
        accountImplementation = new OpenfortWallet();
    }

}