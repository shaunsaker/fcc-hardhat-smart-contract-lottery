// TODO: I'm not such a big fan of this script, in production the FE will be a git repo
// and this would change files in that repo. Ideally we would use a remote location where the abi could be fetched

import { readFileSync, writeFileSync } from "fs"
import { ethers, network } from "hardhat"
import { join } from "path"

const FRONT_END_ADDRESSES_FILE = join(
  __dirname,
  "../../fcc-hardhat-smart-contract-lottery-frontend/constants/contractAddresses.json"
)
const FRONT_END_ABI_FILE = join(
  __dirname,
  "../../fcc-hardhat-smart-contract-lottery-frontend/constants/abi.json"
)
console.log(FRONT_END_ADDRESSES_FILE)
console.log(FRONT_END_ABI_FILE)

async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle")
  const chainId = network.config.chainId?.toString()

  if (!chainId) {
    console.error("No chainId!")

    return
  }

  // TODO: this will fail if the file/parent folder does not exist
  const currentAddresses = JSON.parse(readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8"))

  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffle.address)) {
      currentAddresses[chainId].push(raffle.address)
    }
  } else {
    currentAddresses[chainId] = [raffle.address]
  }

  writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle")
  const abi = raffle.interface.format(ethers.utils.FormatTypes.json)

  writeFileSync(FRONT_END_ABI_FILE, abi)
}

module.exports = async function () {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end updated!")
  }
}

module.exports.tags = ["all", "frontend"]
