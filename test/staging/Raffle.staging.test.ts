import { expect } from "chai"
import { BigNumber, Event } from "ethers"
import { Result } from "ethers/lib/utils"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { Receipt } from "hardhat-deploy/dist/types"
import { isDevelopment, networkConfig } from "../../helper-hardhat-config"
import { Raffle } from "../../typechain"

isDevelopment
  ? describe.skip
  : describe("Raffle Staging Tests", () => {
      let deployer: string
      let raffle: Raffle
      let raffleEntranceFee: BigNumber
      let interval: BigNumber

      beforeEach(async () => {
        const namedAccounts = await getNamedAccounts()
        deployer = namedAccounts.deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })

      describe("fulfillRandomWords", () => {
        it("works with live Chainlink Keepers and Chainlink VRT, we get a random winner", async () => {
          // enter the raffle
          const startingTimestamp = await raffle.getLatestTimestamp()
          const accounts = await ethers.getSigners()
          const deployerAccount = accounts[0]
          let winnerStartingBalance: BigNumber

          await new Promise(async (resolve, reject) => {
            // setup the listener
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!")

              try {
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const endingTimestamp = await raffle.getLatestTimestamp()
                const winnerEndingBalance = await deployerAccount.getBalance()

                await expect(raffle.getPlayer(0)).to.be.reverted
                expect(recentWinner.toString()).to.equal(deployerAccount.address)
                expect(raffleState).to.equal(0)
                expect(endingTimestamp.toNumber()).to.be.greaterThan(startingTimestamp.toNumber())

                // the winner should receive their entrance fee back
                expect(winnerEndingBalance.toString()).to.equal(
                  winnerStartingBalance.add(raffleEntranceFee).toString()
                )

                resolve(null)
              } catch (error) {
                console.error(error)
                reject(error)
              }
            })

            await raffle.enterRaffle({ value: raffleEntranceFee })
            winnerStartingBalance = await deployerAccount.getBalance()
          })
        })
      })
    })
