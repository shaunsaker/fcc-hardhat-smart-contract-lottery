// copied from https://github.com/PatrickAlphaC/hardhat-smartcontract-lottery-fcc/blob/main/scripts/mockOffchain.js

import { Contract } from "ethers"
import { ethers, network } from "hardhat"
import { isDevelopment } from "../helper-hardhat-config"
import { getRequestIdFromTxReceipt } from "../utils/getRequestIdFromTxReceipt"

async function mockKeepers() {
  const raffle = await ethers.getContract("Raffle")
  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData)
  if (upkeepNeeded) {
    const tx = await raffle.performUpkeep(checkData)
    const txReceipt = await tx.wait(1)
    const requestId = getRequestIdFromTxReceipt(txReceipt) // adapted here
    console.log(`Performed upkeep with RequestId: ${requestId}`)

    if (isDevelopment) {
      await mockVrf(requestId.toString(), raffle)
    }
  } else {
    console.log("No upkeep needed!")
  }
}

async function mockVrf(requestId: string, raffle: Contract) {
  console.log("We on a local network? Ok let's pretend...")
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
  console.log("Responded!")
  const recentWinner = await raffle.getRecentWinner()
  console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
