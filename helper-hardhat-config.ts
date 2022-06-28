import { BigNumber } from "ethers"
import { ethers, network } from "hardhat"

export const networkConfig: {
  [name: string]: {
    vrfCoordinatorV2: string
    entranceFee: BigNumber
    gasLane: string
    subscriptionId: string
    callbackGasLimit: string
    interval: string
  }
} = {
  hardhat: {
    vrfCoordinatorV2: "", // mocked
    entranceFee: ethers.utils.parseEther("0.01"),
    // this is mocked but it fails if we don't use a valid hex string
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "", // mocked
    callbackGasLimit: "500000",
    interval: "30",
  },
  rinkeby: {
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "TODO:",
    callbackGasLimit: "500000",
    interval: "30",
  },
}

export const developmentChains = ["hardhat", "localhost"]

export const isDevelopment = developmentChains.includes(network.name)

export const BLOCK_CONFIRMATIONS = 6
