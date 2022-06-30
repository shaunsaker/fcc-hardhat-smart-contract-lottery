//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";

/* Error declarations */
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 * @author Shaun Saker
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
  /* Type declarations */
  enum RaffleState {
    OPEN,
    CALCULATING
  }

  /* State Variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoordindator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private immutable i_callbackGasLimit;
  uint32 private constant NUMBER_OF_WORDS = 1;
  address private s_recentWinner;
  RaffleState private s_raffleState;
  uint256 private s_latestTimestamp;
  uint256 private immutable i_interval;

  /* Event declarations */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexedRequestId);
  event WinnerPicked(address indexed player);

  constructor(
    address vrfCoorindatorV2, // contract
    uint256 entranceFee,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2(vrfCoorindatorV2) {
    i_entranceFee = entranceFee;
    i_vrfCoordindator = VRFCoordinatorV2Interface(vrfCoorindatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_raffleState = RaffleState.OPEN;
    s_latestTimestamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    if (s_raffleState != RaffleState.OPEN) {
      revert Raffle__NotOpen();
    }

    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETHEntered();
    }

    s_players.push(payable(msg.sender));

    // log an event
    emit RaffleEnter(msg.sender);
  }

  /**
   * @dev this is the functino that the Chainlink Keeper nodes call
   * and should return true or false.
   * The following should be true in order to return true:
   * 1. Our time interval should have passed
   * 2. The lottery should have at least 1 player
   * 3. Our subscription is funded with LINK
   * 4. The lottery should be in an "open" state
   */
  function checkUpkeep(bytes memory) public override returns (bool upkeepNeeded, bytes memory) {
    bool isOpen = s_raffleState == RaffleState.OPEN;
    bool hasIntervalPassed = block.timestamp - s_latestTimestamp > i_interval;
    bool hasPlayers = (s_players.length > 0);
    bool hasBalance = address(this).balance > 0;
    upkeepNeeded = isOpen && hasIntervalPassed && hasPlayers && hasBalance;

    return (upkeepNeeded, "");
  }

  function performUpkeep(bytes calldata) external override {
    // anyone can call this function so let's make sure upkeep is actually needed first
    (bool upkeepNeeded, ) = checkUpkeep("");
    if (!upkeepNeeded) {
      revert Raffle__UpkeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }

    // close the Raffle so that no one can enter while we are drawing the winner
    s_raffleState = RaffleState.CALCULATING;

    uint256 requestId = i_vrfCoordindator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUMBER_OF_WORDS
    );

    // log an event
    // NOTE: this is actually redundant, requestRandomWords already emits an event
    emit RequestedRaffleWinner(requestId);
  }

  // this is called by VRFCoordinatorV2 after performUpkeep passes
  function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
    // select the random winner
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;

    // send them the money
    (bool success, ) = recentWinner.call{value: address(this).balance}("");

    if (!success) {
      revert Raffle__TransferFailed();
    }

    // log an event
    emit WinnerPicked(recentWinner);

    // reset the players
    s_players = new address payable[](0);

    // reset the timestamp
    s_latestTimestamp = block.timestamp;

    // reopen the lottery
    s_raffleState = RaffleState.OPEN;
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

  function getLatestTimestamp() public view returns (uint256) {
    return s_latestTimestamp;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getNumberOfWords() public pure returns (uint256) {
    return NUMBER_OF_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }
}
