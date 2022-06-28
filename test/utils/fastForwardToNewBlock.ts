import { BigNumber } from "ethers"
import { network } from "hardhat"

export const fastForwardToNewBlock = async (interval: BigNumber): Promise<void> => {
  // fast forward passed the interval
  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])

  // mine one extra block
  await network.provider.send("evm_mine", [])
}
