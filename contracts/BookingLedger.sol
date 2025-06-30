// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BookingLedger
 * @dev Manages bookings and their amendments on a distributed ledger.
 * This contract handles the core logic for UC8: Process amendment to confirmed Booking.
 */
contract BookingLedger is AccessControl {

    address public mainCarrier;
    bytes32 public constant CARRIER_ROLE = keccak256("CARRIER_ROLE");
    bytes32 public constant SHIPPER_ROLE = keccak256("SHIPPER_ROLE");
    uint256 public bookingCount = 0;
    uint256 public amendmentCount = 0;
    mapping(address => bytes32[]) public shipperBookings;
    mapping(address => bytes32[]) public carrierBookings;
    mapping(bytes32 => bytes32[]) public amendmentByBooking;
    event BookingCreated(bytes32 indexed bookingId, address indexed shipper, address indexed carrier, 
        uint256 amendmentCount, BookingStatus status, string details);
    event AmendmentRequested(bytes32 indexed amendmentId, bytes32 indexed bookingId, 
        address indexed requester, string newsDetails, AmendmentStatus status);
    event AmendmentConfirmed(bytes32 indexed bookingId, bytes32 indexed amendmentId);
    event AmendmentDeclined(bytes32 indexed bookingId, bytes32 indexed amendmentId, string reason);
    event AmendmentCancelled(bytes32 indexed bookingId, bytes32 indexed amendmentId);
    

    enum BookingStatus {
        CONFIRMED,
        PENDING_AMENDMENT
    }

    enum AmendmentStatus {
        AMENDMENT_RECEIVED,
        AMENDMENT_CONFIRMED,
        AMENDMENT_DECLINED,
        AMENDMENT_CANCELLED
    }

    struct Booking {
        bytes32 bookingId;
        address shipper;
        address carrier;
        string details;
        BookingStatus status;
        uint256 amendmentCount;
    }

    struct Amendment {
        bytes32 amendmentId;
        bytes32 bookingId;
        address requester;
        string newsDetails;
        AmendmentStatus status;
        string reason;
    }

    mapping (bytes32 => Booking) public bookings;
    mapping (bytes32 => Amendment) public amendments;
    constructor() {
            _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
            _grantRole(CARRIER_ROLE, msg.sender);
            mainCarrier = msg.sender;
    }

    function grantShipperRole(address shipperAddress) onlyRole(DEFAULT_ADMIN_ROLE) public {
        _grantRole(SHIPPER_ROLE, shipperAddress);
    }

    function createBooking(string calldata details) public onlyRole(SHIPPER_ROLE) returns(bytes32 bookingId){
        Booking memory booking;
        booking.bookingId = bytes32(bookingCount++);
        booking.shipper = msg.sender;
        booking.carrier = mainCarrier;
        booking.status = BookingStatus.CONFIRMED;
        booking.details = details;
        booking.amendmentCount = 0;
        bookings[booking.bookingId] = booking;
        shipperBookings[msg.sender].push(booking.bookingId);
        carrierBookings[mainCarrier].push(booking.bookingId);
        emit BookingCreated(booking.bookingId, booking.shipper, booking.carrier, 
            booking.amendmentCount, booking.status, booking.details);
        return booking.bookingId;
    }

    function requestAmendment(bytes32 bookingId, string calldata newsDetails) public returns(bytes32 amendmentId){ 
        require(bookings[bookingId].shipper == msg.sender, "Only shipper can request amendment");
        require(bookings[bookingId].status == BookingStatus.CONFIRMED, "Booking must be confirmed");
        bookings[bookingId].status = BookingStatus.PENDING_AMENDMENT;
        Amendment memory amendment;
        amendment.amendmentId = keccak256(abi.encodePacked(bookingId, bookings[bookingId].amendmentCount++));
        amendment.bookingId = bookingId;
        amendment.requester = msg.sender;
        amendment.newsDetails = newsDetails;
        amendment.status = AmendmentStatus.AMENDMENT_RECEIVED;
        amendments[amendment.amendmentId] = amendment;
        amendmentByBooking[bookingId].push(amendment.amendmentId);
        amendmentCount++;
        emit AmendmentRequested(amendment.amendmentId, amendment.bookingId, 
            amendment.requester, amendment.newsDetails, amendment.status);
        return amendment.amendmentId;
    }

    function processAmendment(bytes32 bookingId, bytes32 amendmentId, bool isConfirmed, 
        string calldata reason) onlyRole(CARRIER_ROLE) public returns(string memory output){
        Amendment storage amendment = amendments[amendmentId];
        Booking storage booking = bookings[bookingId];
        require(amendment.status == AmendmentStatus.AMENDMENT_RECEIVED, "Amendment must be received");
        require(booking.status == BookingStatus.PENDING_AMENDMENT, "Booking must be in pending amendment state");
        if (isConfirmed) {
            amendment.status = AmendmentStatus.AMENDMENT_CONFIRMED;
            booking.status = BookingStatus.CONFIRMED;
            booking.details = amendment.newsDetails;
            amendment.reason = reason;
            emit AmendmentConfirmed(amendment.amendmentId, amendment.bookingId);
            return "Amendment confirmed";
        } else {
            require(bytes(reason).length > 0, "Reason must be provided");
            amendment.reason = reason;
            amendment.status = AmendmentStatus.AMENDMENT_DECLINED;
            booking.status = BookingStatus.CONFIRMED;
            emit AmendmentDeclined(amendment.amendmentId, amendment.bookingId, reason);
            return "Amendment declined";
        }
    }

    function cancelAmendment(bytes32 amendmentId) public{
        Amendment storage amendment = amendments[amendmentId];
        require(amendment.requester == msg.sender, "Only requester can cancel amendment");
        require(amendment.status == AmendmentStatus.AMENDMENT_DECLINED,
         "Amendment must be declined");
        amendment.status = AmendmentStatus.AMENDMENT_CANCELLED;
        emit AmendmentCancelled(amendment.amendmentId, amendment.bookingId);
    }

    function getAmendmentDetailsForBooking(bytes32 bookingId) public view returns(Amendment[] memory){
        bytes32[] memory amendmentIds = amendmentByBooking[bookingId];
        Amendment[] memory detailsList = new Amendment[](amendmentIds.length);
        for (uint256 i = 0; i < amendmentIds.length; i++) {
            detailsList[i] = amendments[amendmentIds[i]];
        }
        return detailsList;
    }
}