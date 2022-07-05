import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BLOCK_CONFIRMATIONS, isDevelopment, networkConfig } from "../helper-hardhat-config"
import { verify } from "../utils/verify"

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  let vrfCoordinatorV2Address
  let subscriptionId

  if (isDevelopment) {
    // get the mock contract address
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

    // get the subscriptionId
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = transactionReceipt.events[0].args.subId

    // fund the subscription
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  } else {
    vrfCoordinatorV2Address = networkConfig[network.name].vrfCoordinatorV2
    subscriptionId = networkConfig[network.name].subscriptionId
  }

  const entranceFee = networkConfig[network.name].entranceFee
  const gasLane = networkConfig[network.name].gasLane
  const callbackGasLimit = networkConfig[network.name].callbackGasLimit
  const interval = networkConfig[network.name].interval

  const raffleArgs = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ]
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: raffleArgs,
    log: true,
    waitConfirmations: !isDevelopment ? BLOCK_CONFIRMATIONS : 1,
  })

  if (!isDevelopment && process.env.ETHERSCAN_API_KEY) {
    // verify the contract if not in development
    await verify(raffle.address, raffleArgs)
  }

  log("--------------------------------")
}

module.exports.tags = ["all", "raffle"]
