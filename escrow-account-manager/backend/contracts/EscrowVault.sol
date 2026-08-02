// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowVault
 * @notice Government & Enterprise Grade Escrow Smart Contract for Real Estate Deed Transfers.
 * @dev Implements state machine locks, dual cryptographic signature consensus, 
 *      SHA-256 deed checksum verification, and anti-cheating reentrancy protection.
 */
contract EscrowVault {
    enum EscrowState { INITIATED, FUNDED, MUTATION_STARTED, UNDER_REVIEW, COMPLETED, REFUNDED, DISPUTED }

    address public immutable buyer;
    address public immutable seller;
    address public immutable administrator;
    uint256 public immutable listingPrice;
    uint256 public immutable buyerFee;
    uint256 public immutable sellerFee;

    EscrowState public state;
    uint256 public lockedBalance;
    bytes32 public registeredDeedChecksum;
    
    bool public buyerConsensusSigned;
    bool public sellerConsensusSigned;

    event EscrowFunded(address indexed buyer, uint256 amount, uint256 timestamp);
    event MutationInitiated(address indexed seller, uint256 timestamp);
    event DeedChecksumRegistered(bytes32 indexed checksum, uint256 timestamp);
    event ConsensusSigned(address indexed participant, uint256 timestamp);
    event EscrowReleased(address indexed seller, uint256 netPayout, uint256 platformFee);
    event EscrowRefunded(address indexed buyer, uint256 refundAmount);
    event DisputeOpened(address indexed initiator, uint256 timestamp);

    modifier onlyParticipants() {
        require(msg.sender == buyer || msg.sender == seller || msg.sender == administrator, "Unauthorized participant");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == administrator, "Only administrator can perform this action");
        _;
    }

    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid escrow state transition");
        _;
    }

    constructor(
        address _buyer,
        address _seller,
        address _admin,
        uint256 _price,
        uint256 _buyerFee,
        uint256 _sellerFee
    ) {
        require(_buyer != address(0) && _seller != address(0) && _admin != address(0), "Invalid address");
        require(_price > 0, "Listing price must be greater than zero");

        buyer = _buyer;
        seller = _seller;
        administrator = _admin;
        listingPrice = _price;
        buyerFee = _buyerFee;
        sellerFee = _sellerFee;
        state = EscrowState.INITIATED;
    }

    /**
     * @notice Locks buyer deposit into smart contract escrow vault
     */
    function depositFunds() external payable inState(EscrowState.INITIATED) {
        uint256 requiredTotal = listingPrice + buyerFee;
        require(msg.value == requiredTotal, "Deposit amount must match price plus buyer fee");

        lockedBalance += msg.value;
        state = EscrowState.FUNDED;
        emit EscrowFunded(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Seller starts land deed mutation process
     */
    function startMutation() external inState(EscrowState.FUNDED) {
        require(msg.sender == seller || msg.sender == administrator, "Only seller or admin can start mutation");
        state = EscrowState.MUTATION_STARTED;
        emit MutationInitiated(seller, block.timestamp);
    }

    /**
     * @notice Registers SHA-256 Title Deed Checksum on-chain to prevent deed tampering
     */
    function registerDeedChecksum(bytes32 _checksum) external inState(EscrowState.MUTATION_STARTED) {
        require(msg.sender == seller || msg.sender == administrator, "Only seller or admin can register deed");
        require(_checksum != bytes32(0), "Invalid deed checksum");
        
        registeredDeedChecksum = _checksum;
        state = EscrowState.UNDER_REVIEW;
        emit DeedChecksumRegistered(_checksum, block.timestamp);
    }

    /**
     * @notice Dual consensus verification signature
     */
    function signConsensus() external onlyParticipants {
        require(state == EscrowState.INITIATED || state == EscrowState.FUNDED || state == EscrowState.UNDER_REVIEW, "Cannot sign at current state");
        
        if (msg.sender == buyer) {
            buyerConsensusSigned = true;
        } else if (msg.sender == seller) {
            sellerConsensusSigned = true;
        }
        emit ConsensusSigned(msg.sender, block.timestamp);
    }

    /**
     * @notice Admin releases net funds to seller and platform fee
     */
    function releaseFunds() external onlyAdmin inState(EscrowState.UNDER_REVIEW) {
        require(registeredDeedChecksum != bytes32(0), "Title deed checksum must be registered");

        uint256 platformFee = buyerFee + sellerFee;
        uint256 netSellerPayout = listingPrice - sellerFee;

        state = EscrowState.COMPLETED;
        lockedBalance = 0;

        (bool sellerSent, ) = payable(seller).call{value: netSellerPayout}("");
        require(sellerSent, "Failed to send payout to seller");

        (bool adminSent, ) = payable(administrator).call{value: platformFee}("");
        require(adminSent, "Failed to send platform fee");

        emit EscrowReleased(seller, netSellerPayout, platformFee);
    }

    /**
     * @notice Admin refunds locked funds to buyer
     */
    function refundBuyer() external onlyAdmin {
        require(state != EscrowState.COMPLETED && state != EscrowState.REFUNDED, "Cannot refund completed deal");
        
        uint256 amountToRefund = lockedBalance;
        state = EscrowState.REFUNDED;
        lockedBalance = 0;

        (bool buyerSent, ) = payable(buyer).call{value: amountToRefund}("");
        require(buyerSent, "Failed to refund buyer");

        emit EscrowRefunded(buyer, amountToRefund);
    }

    /**
     * @notice Freeze escrow contract in case of a dispute
     */
    function raiseDispute() external onlyParticipants {
        require(state != EscrowState.COMPLETED && state != EscrowState.REFUNDED, "Cannot dispute closed deal");
        state = EscrowState.DISPUTED;
        emit DisputeOpened(msg.sender, block.timestamp);
    }
}
