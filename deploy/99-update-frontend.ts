// TODO: I'm not such a big fan of this script, in production the FE will be a git repo
// and this would change files in that repo. Ideally we would use a remote location where the abi could be fetched
// (ideally directly from the contract on the blockchain?)

import { ethers } from "hardhat"

const FRONT_END_ADDRESSES_FILE =
  "../fcc-hardhat-smart-contract-lottery-frontend/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../fcc-hardhat-smart-contract-lottery-frontend/constants/abi.json"

async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle")
}

module.exports = async function () {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating front end...")
    updateContractAddresses()
  }
}
