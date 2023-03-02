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

    // debug to be removed
    uint256 public test;
    address x;
    address y;

    function getTest() public view returns (uint256) {
        return test;
    }

    function getX() public view returns (address) {
        return x;
    }

    function getY() public view returns (address) {
        return y;
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
        
        /*
        execute(address(this), 0, 
            abi.encodeCall(GnosisSafe.setup, (
                _owners, _threshold,
                to, data,
                fallbackHandler,paymentToken, 
                payment, paymentReceiver 
            )),
            Enum.Operation.DelegateCall, type(uint256).max
        );*/

        // Setup single wallet for testing for now. 
        // might need the code above to implement proxy later
        this.setup(_owners, _threshold,
                to, data,
                fallbackHandler,paymentToken, 
                payment, paymentReceiver);
        ++nonce;
    }

    /// @dev Verify the users signature and nonce with the user operation
    /// @param userOp User operation passed in by the entry point
    /// @param userOpHash Hash of the user operation
    /// @param missingAccountFunds Amount to pay entryPoint for transaction execution
    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) 
    external returns(uint256 sigTimeRange) { 

        requireFromEntryPoint();
        if(userOp.initCode.length == 0){
            bytes32 messageHash = userOpHash.toEthSignedMessageHash();

            (x,y) = this.checkNSignatures(messageHash, bytes(abi.encode(userOp)), 
                userOp.signature, threshold);

            try this.checkNSignatures(messageHash, bytes(abi.encode(userOp)), 
                userOp.signature, threshold){
                if(++nonce != userOp.nonce)
                    revert InvalidNonce();
            } catch {
                sigTimeRange = VALIDATION_FAILED;
                // Only included for testing purposes
                revert SignatureFailed();
            }

            if(missingAccountFunds > 0) {
                (bool success,) = payable(entryPoint).call{value : missingAccountFunds, gas : type(uint256).max}("");
                require(success);
            }
        } else {
            // Included for testing
            revert ContractHasInitCode();
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
        if(!isOwner(msg.sender))
            revert NotOwner();
        entryPoint = _entryPoint;
    }

    // Require the function call went through EntryPoint or owner
    function requireFromEntryPoint() internal view {
        if(msg.sender != entryPoint)
            revert EntryPointInvalid();
    }

}
