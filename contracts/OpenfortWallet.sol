// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

error EntryPointInvalid();
error InvalidNonce();
error NotOwner();
error ContractHasInitCode();
error SignatureFailed();
error DelegateCallFailed();
error BatchTransactionsFailed();

/// @title Openfort EIP-4337 compatible AA wallet 
/// @dev https://eips.ethereum.org/EIPS/eip-4337

contract OpenfortWallet is GnosisSafe {
    using ECDSA for bytes32;

    /// @notice EIP4337 entrypoint
    address public entryPoint;
    /// @notice UserOperation failure code
    uint256 immutable VALIDATION_FAILED = 1;

    /// @dev Used to batch up transactions easier
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
    function setupWithEntrypoint(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver,
        address _entryPoint
    ) external {
        entryPoint = _entryPoint;
        this.setup(
            _owners, _threshold,
            to, data,
            fallbackHandler,paymentToken, 
            payment, paymentReceiver);
        ++nonce;
    }

    /// @dev Verify the users signature and nonce with the user operation
    /// @param userOp User operation passed in by the entry point
    /// @param userOpHash Hash of the user operation
    /// @param missingAccountFunds Amount to pay entryPoint for transaction execution
    /// May be 0, if there is enough deposited or if user has a paymaster
    /// @return sigTimeRange If signature is invalid return 1, based off of EIP spec
    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) 
    external returns(uint256 sigTimeRange) { 
        requireFromEntryPoint();
        if(userOp.initCode.length == 0){
            bytes32 messageHash = userOpHash.toEthSignedMessageHash();

            try this.checkNSignatures(messageHash, bytes(abi.encode(userOp)), 
                userOp.signature, threshold){
                if(++nonce != userOp.nonce)
                    revert InvalidNonce();
            } catch {
                sigTimeRange = VALIDATION_FAILED;
            }

            if(missingAccountFunds > 0 && sigTimeRange == 0) {
                (bool success,) = payable(entryPoint).call{value : missingAccountFunds, gas : type(uint256).max}("");
                require(success);
            }
        } else {
            revert ContractHasInitCode();
        }
    }

    /// @dev Entry point calls this to make our account execute transactions after verification
    /// @param to Destination address of txn
    /// @param value ether value included in txn
    /// @param data Encoded function txn will try and run 
    /// @param operation call or delegateCall
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

    /// @dev Same as above except for batching purposes
    /// @dev Numerous transactions will be bundled up and signed at the same time then validated above
    /// @dev once validated, the entrypoint can call this function to run them all atomically
    function executeMultipleUserOperationsAsEntryPoint (
        SafeTransaction[] calldata transactionBatch)
    external {
        requireFromEntryPoint();
        for(uint i = 0; i < transactionBatch.length;) {
            if(!execute(transactionBatch[i].to, transactionBatch[i].value, 
                transactionBatch[i].data, transactionBatch[i].operation, type(uint256).max))
                revert BatchTransactionsFailed();
            unchecked {
                ++i;
            }
        }
    }

    /// @dev Basic delegate call, subject to change
    /// @dev Also maybe can be removed as we can delegate call through execute(), needs confirmed
    function executeDelegateCallFromEntryPoint (
        address _contract,
        string calldata _func,
        string calldata _funcParameter
    ) external {
        requireFromEntryPoint();
        (bool success,) = _contract.delegatecall(
            abi.encodeWithSignature(_func, _funcParameter)
        );
        if(!success)
            revert DelegateCallFailed();
    }

    /// @dev Update trusted entry point
    function updateEntryPoint(address _entryPoint) 
    external {
        if(!isOwner(msg.sender))
            revert NotOwner();
        entryPoint = _entryPoint;
    }

    /// @dev Require the function call went through EntryPoint or owner
    function requireFromEntryPoint() internal view {
        if(msg.sender != entryPoint)
            revert EntryPointInvalid();
    }
}
