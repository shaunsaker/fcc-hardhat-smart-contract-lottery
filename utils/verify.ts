import { run } from "hardhat"
import { TaskArguments } from "hardhat/types"

export async function verify(contractAddress: string, args: TaskArguments = []) {
  console.log("Verifying...")
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (error) {
    if ((error as Error).message.toLowerCase().includes("already verified")) {
      console.log("Already verified!")
    } else {
      console.error(error)
    }
  }
}
