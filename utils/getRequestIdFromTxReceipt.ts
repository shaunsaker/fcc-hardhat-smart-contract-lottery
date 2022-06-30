import { BigNumber, Event } from "ethers"
import { Result } from "ethers/lib/utils"
import { Receipt } from "hardhat-deploy/dist/types"

export const getRequestIdFromTxReceipt = (txReceipt: Receipt): BigNumber => {
  // TODO: .requestId did not exist in args so I think the video is a bit incorrect there
  const eventArgs = (txReceipt.events as Event[])[1].args as Result
  const requestId = eventArgs[0]

  return requestId
}
