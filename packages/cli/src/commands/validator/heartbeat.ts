import { concurrentMap } from '@celo/utils/lib/async'
import { flags } from '@oclif/command'
import chalk from 'chalk'
import { BaseCommand } from '../../base'
import { Flags } from '../../utils/command'
import { ElectionResultsCache } from '../../utils/election'

/**
 * Printer object to output marks in a grid to indicate signing status.
 */
class MarkPrinter {
  private previousBlockNumber: number | null = null

  constructor(private width: number) {}

  addMark(blockNumber: number, elected: boolean, signed: boolean) {
    if (this.previousBlockNumber === null) {
      const labelNumber = Math.floor(blockNumber / this.width) * this.width
      this.previousBlockNumber = labelNumber - 1
    }
    if (blockNumber <= this.previousBlockNumber - 1) {
      throw new Error(
        `cannot add mark for ${blockNumber} which is not after ${this.previousBlockNumber}`
      )
    }

    for (let i = this.previousBlockNumber + 1; i <= blockNumber; i++) {
      if (i % this.width === 0) {
        this.printLineLabel(i)
      }
      if (i < blockNumber) {
        process.stdout.write(' ')
      } else {
        process.stdout.write(this.mark(elected, signed))
      }
    }
    this.previousBlockNumber = blockNumber
  }

  done() {
    process.stdout.write('\n', () => {})
  }

  private mark(elected: boolean, signed: boolean) {
    return elected ? (signed ? chalk.green('.') : chalk.red('✘')) : chalk.yellow('~')
  }

  private printLineLabel(blockNumber: number, newline: boolean = true) {
    if (newline) {
      process.stdout.write('\n')
    }
    process.stdout.write(`${blockNumber} `.padStart(8, ' '))
  }
}

export default class ValidatorHeartbeat extends BaseCommand {
  static description = 'Display '

  static flags = {
    ...BaseCommand.flags,
    signer: Flags.address({
      description: 'address of the signer to check for signatures',
      required: true,
    }),
    'at-block': flags.integer({
      description: 'latest block to examine for sginer activity',
      exclusive: ['follow'],
    }),
    lookback: flags.integer({
      description: 'how many blocks to look back for signer activity',
      default: 120,
    }),
    width: flags.integer({
      description: 'line width for printing marks',
      default: 40,
    }),
    // TODO(victor): Fix this the follow flag functionality.
    follow: flags.boolean({
      char: 'f',
      default: false,
      exclusive: ['at-block'],
      hidden: true,
    }),
  }

  static examples = ['blocks --signer 0x5409ED021D9299bf6814279A6A1411A7e866A631']

  async run() {
    const res = this.parse(ValidatorHeartbeat)
    const election = await this.kit.contracts.getElection()
    const validators = await this.kit.contracts.getValidators()
    const epochSize = await validators.getEpochSize()
    const electionCache = new ElectionResultsCache(election, epochSize.toNumber())

    const latest = res.flags['at-block'] ?? (await this.web3.eth.getBlock('latest')).number

    const blocks = await concurrentMap(10, [...Array(res.flags.lookback).keys()], (i) =>
      this.web3.eth.getBlock(latest - res.flags.lookback! + i + 1)
    )
    const printer = new MarkPrinter(res.flags.width!)
    try {
      for (const block of blocks) {
        const elected = await electionCache.elected(res.flags.signer, block.number)
        const signed = elected && (await electionCache.signed(res.flags.signer, block))
        printer.addMark(block.number, elected, signed)
      }

      // TODO(victor) Fix the follow flag functionality.
      /*
      if (res.flags.follow) {
        const subscription = this.web3.eth.subscribe("newBlockHeaders", (error) =>  {
          if (error) { this.error(error) }
        }).on("data", (block) => {
          const elected = electionCache.elected(res.flags.signer, block.number)
          const signed = elected && electionCache.signed(res.flags.signer, block)
          printer.addMark(block.number, elected, signed)
        }).on("error", (error) => {
          this.error(`error in block header subscription: ${error}`)
        })

        try {
          let response: string
          do {
            response = await cli.prompt('', {prompt: '', type: 'single', required: false})
          } while (response !== 'q' && response !== '\u0003' / ctrl-c /)
        } finally {
          await subscription.unsubscribe()
        }
      }
       */
    } finally {
      // Print a final newline to complete the line.
      printer.done()
    }
  }
}