import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { isDevelopment } from "../helper-hardhat-config"

// TODO: why are we using 0.25 ETH whereas it should be 0.25 LINK?
const BASE_FEE = ethers.utils.parseEther("0.25") // it costs 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 // calculated value based on the gas price of the chain

module.exports = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  if (isDevelopment) {
    log("Local network detected! Deploying mocks...")

    const VRFCoordinatorV2MockArgs = [BASE_FEE, GAS_PRICE_LINK]
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: VRFCoordinatorV2MockArgs,
    })

    log("Mocks deployed!")
    log("--------------------------------")
  }
}

module.exports.tags = ["all", "mocks"]
