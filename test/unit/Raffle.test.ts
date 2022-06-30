import { expect } from "chai"
import { BigNumber, Event } from "ethers"
import { Result } from "ethers/lib/utils"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { Receipt } from "hardhat-deploy/dist/types"
import { isDevelopment, networkConfig } from "../../helper-hardhat-config"
import { Raffle } from "../../typechain"
import { VRFCoordinatorV2Mock } from "../../typechain/VRFCoordinatorV2Mock"
import { fastForwardToNewBlock } from "../utils/fastForwardToNewBlock"

const getRequestIdFromTxReceipt = (txReceipt: Receipt): BigNumber => {
  // TODO: .requestId did not exist in args so I think the video is a bit incorrect there
  const eventArgs = (txReceipt.events as Event[])[1].args as Result
  const requestId = eventArgs[0]

  return requestId
}

!isDevelopment
  ? describe.skip
  : describe("Raffle", () => {
      let deployer: string
      let raffle: Raffle
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
      let raffleEntranceFee: BigNumber
      let interval: BigNumber
      const networkName = "hardhat"

      beforeEach(async () => {
        const namedAccounts = await getNamedAccounts()
        deployer = namedAccounts.deployer

        await deployments.fixture(["all"])

        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })

      describe("constructor", () => {
        it("initialises the raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState()
          // TODO: test the rest of the constructor variables

          expect(raffleState.toString()).to.equal("0")
          expect(interval.toString()).to.equal(networkConfig[networkName].interval)
        })
      })

      describe("enterRaffle", () => {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })

        it("records players when they enter", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })

          const playerFromContract = await raffle.getPlayer(0)

          expect(playerFromContract).to.equal(deployer)
        })

        it("emits an event on enter", async () => {
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
            raffle,
            "RaffleEnter"
          )
        })

        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await fastForwardToNewBlock(interval)

          // pretent to be a Chainlink keeper (checkUpkeep should now be true)
          await raffle.performUpkeep([])

          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
            "Raffle__NotOpen"
          )
        })
      })

      describe("checkUpkeep", () => {
        it("returns false if people haven't sent any ETH", async () => {
          await fastForwardToNewBlock(interval)

          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

          expect(upkeepNeeded).to.equal(false)
        })

        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await fastForwardToNewBlock(interval)
          await raffle.performUpkeep([])

          const raffleState = await raffle.getRaffleState()
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

          expect(raffleState.toString()).to.equal("1")
          expect(upkeepNeeded).to.equal(false)
        })
      })

      describe("performUpkeep", () => {
        it("can only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await fastForwardToNewBlock(interval)
          const tx = await raffle.performUpkeep([])

          expect(Boolean(tx)).to.equal(true)
        })

        it("reverts when checkUpkeep is false", async () => {
          // TODO: you could add the args it reverted with like so, `Raffle__UpkeepNotNeeded${...args}`
          await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })

        it("updates the raffle state, emits an event and calls the vrf coordinator", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await fastForwardToNewBlock(interval)
          const txResponse = await raffle.performUpkeep([])
          const txReceipt = await txResponse.wait(1)

          // 1st event is from the vrf coordinator

          const raffleState = await raffle.getRaffleState()
          const requestId = getRequestIdFromTxReceipt(txReceipt)
          expect(requestId.toNumber()).to.be.greaterThan(0)
          expect(raffleState.toString()).to.equal("1")
        })
      })

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await fastForwardToNewBlock(interval)
        })

        it("can only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request")
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request")
        })

        it("picks a winner, resets the lottery and sends money", async () => {
          const additionalEntrants = 3
          const startingAccountIndex = 1 // deployer = 0
          const accounts = await ethers.getSigners()

          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i])
            await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
          }

          const startingTimestamp = await raffle.getLatestTimestamp()

          // we know that account at index 1 will win because we already ran the below "WinnerPicked" block
          const winnerStartingBalance = await accounts[1].getBalance()

          await new Promise(async (resolve, reject) => {
            // setup the listener
            raffle.once("WinnerPicked", async () => {
              try {
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const endingTimestamp = await raffle.getLatestTimestamp()
                const numberOfPlayers = await raffle.getNumberOfPlayers()
                const winnerEndingBalance = await accounts[1].getBalance()

                expect(numberOfPlayers.toString()).to.equal("0")
                expect(raffleState.toString()).to.equal("0")
                expect(endingTimestamp.toNumber()).to.be.greaterThan(startingTimestamp.toNumber())
                expect(winnerEndingBalance.toString()).to.equal(
                  winnerStartingBalance
                    // there were x additional entrants + the winner
                    .add(raffleEntranceFee.mul(additionalEntrants + 1))
                    .toString()
                )
              } catch (error) {
                reject(error)
              }

              resolve(null)
            })

            const tx = await raffle.performUpkeep([])
            const txReceipt = await tx.wait(1)
            const requestId = getRequestIdFromTxReceipt(txReceipt)

            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
          })
        })
      })
    })
