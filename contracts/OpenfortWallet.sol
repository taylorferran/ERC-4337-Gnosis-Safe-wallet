// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

error EntryPointInvalid();
error InvalidNonce();

/// @title Openfort EIP-4337 compatible multisig wallet 
/// @dev https://eips.ethereum.org/EIPS/eip-4337

contract OpenfortWallet is GnosisSafe {
    using ECDSA for bytes32;

    //EIP4337 entrypoint
    address public entryPoint;

    uint256 immutable VALIDATION_FAILED = 1;

    struct SafeTransaction {
        address to;
        uint256 value;
        bytes data;
        Enum.Operation operation;
    }

    /// @dev Setup function sets initial storage of contract.
    /// @param _owners List of Safe owners.
    /// @param _threshold Number of required confirmations for a Safe transaction.
    /// @param to Contract address for optional delegate call.
    /// @param data Data payload for optional delegate call.
    /// @param fallbackHandler Handler for fallback calls to this contract
    /// @param paymentToken Token that should be used for the payment (0 is ETH)
    /// @param payment Value that should be paid
    /// @param paymentReceiver Address that should receive the payment (or 0 if tx.origin)
    /// @param _entryPoint Address for the trusted EIP4337 entrypoint
    function setupWalletAndEntryPoint(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver,
        address _entryPoint
    ) public {
        entryPoint = _entryPoint;
        
        execute(address(this), 0, 
            abi.encodeCall(GnosisSafe.setup, (
                _owners, _threshold,
                to, data,
                fallbackHandler,paymentToken, 
                payment, paymentReceiver 
            )),
            Enum.Operation.DelegateCall, type(uint256).max
        );
        ++nonce;
    }

    /// @dev Verify the users signature and nonce with the user operation
    /// @param userOp User operation passed in by the entry point
    /// @param userOpHash Hash of the user operation
    /// @param missingAccountFunds Amount to pay entryPoint for transaction execution
    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) 
    external returns(uint256 validation) { 

        if(userOp.initCode.length == 0){
            requireFromEntryPoint();
            bytes32 messageHash = userOpHash.toEthSignedMessageHash();

            try this.checkNSignatures(messageHash, bytes(abi.encode(userOp)), 
                userOp.signature, threshold){
                if(++nonce != userOp.nonce)
                    revert InvalidNonce();
            } catch {
                validation = VALIDATION_FAILED;              
            }

            if(missingAccountFunds > 0) {
                (bool success,) = payable(entryPoint).call{value : missingAccountFunds, gas : type(uint256).max}("");
                require(success);
            }
        }
    }

    /// @dev Entry point calls this to make our account execute transactions after verification
    function executeUserOperationAsEntryPoint (
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    )
    external {
        requireFromEntryPoint();
        execute(to, value, data, operation, type(uint256).max);
    }

    /// @dev Same as above except for batching 
    /// Might not need this function
    function executeMultipleUserOperationsAsEntryPoint (
        SafeTransaction[] calldata userOperationBatch)
    external {
        requireFromEntryPoint();
        for(uint i = 0; i < userOperationBatch.length;) {
            execute(userOperationBatch[i].to, userOperationBatch[i].value, 
                userOperationBatch[i].data, userOperationBatch[i].operation, type(uint256).max);
            unchecked {
                ++i;
            }
        }
    }

    /// @dev Basic delegate call, subject to change
    /// Also maybe can be removed ?
    function executeDelegateCallFromEntryPoint (
        address _contract,
        string calldata _func,
        uint256 _funcParameter
    ) external {
        requireFromEntryPoint();
        (bool success,) = _contract.delegatecall(
            abi.encodeWithSignature(_func, _funcParameter)
        );
        require(success);
    }

    /// @dev Update trusted entry point
    function updateEntryPoint(address _entryPoint) 
    external {
        entryPoint = _entryPoint;
    }

    // Require the function call went through EntryPoint or owner
    function requireFromEntryPoint() internal view {
        if(msg.sender != entryPoint)
            revert EntryPointInvalid();
    }
}
