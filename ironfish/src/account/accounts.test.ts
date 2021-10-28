/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { VerificationResultReason } from '..'
import {
  createNodeTest,
  useAccountFixture,
  useMinerBlockFixture,
  useTxFixture,
} from '../testUtilities'
import { makeBlockAfter } from '../testUtilities/helpers/blockchain'

describe('Accounts', () => {
  const nodeTest = createNodeTest()

  it('sync account head', async () => {
    const { node, chain, strategy } = nodeTest
    strategy.disableMiningReward()

    const getTransactionsSpy = jest.spyOn(chain, 'iterateBlockTransactions')

    // G -> A1
    const blockA1 = await makeBlockAfter(chain, chain.genesis)
    await expect(chain).toAddBlock(blockA1)

    await node.accounts.updateHead()
    expect(node.accounts['headHash']).toEqual(blockA1.header.hash.toString('hex'))
    expect(getTransactionsSpy).toBeCalledTimes(2)

    // G -> A1 -> A2
    const blockA2 = await makeBlockAfter(chain, blockA1)
    await expect(chain).toAddBlock(blockA2)

    await node.accounts.updateHead()
    expect(node.accounts['headHash']).toEqual(blockA2.header.hash.toString('hex'))
    expect(getTransactionsSpy).toBeCalledTimes(3)

    // Add 3 more on a heavier fork. Chain A should be removed first, then chain B added
    // G -> A1 -> A2
    //   -> B1 -> B2 -> B3
    const blockB1 = await makeBlockAfter(chain, chain.genesis)
    const blockB2 = await makeBlockAfter(chain, blockB1)
    const blockB3 = await makeBlockAfter(chain, blockB2)

    await expect(chain).toAddBlock(blockB1)
    await expect(chain).toAddBlock(blockB2)
    await expect(chain).toAddBlock(blockB3)

    await node.accounts.updateHead()
    expect(node.accounts['headHash']).toEqual(blockB3.header.hash.toString('hex'))
    expect(getTransactionsSpy).toBeCalledTimes(8)
  }, 8000)

  it('should reproduce issue', async () => {
    const { node: nodeA } = await nodeTest.createSetup()
    const { node: nodeB } = await nodeTest.createSetup()

    const accountA = await useAccountFixture(nodeA.accounts, 'a')
    const accountB = await useAccountFixture(nodeA.accounts, 'b')

    const blockA1 = await useMinerBlockFixture(nodeA.chain, undefined, accountA, nodeA.accounts)
    await expect(nodeA.chain).toAddBlock(blockA1)

    const blockB1 = await useMinerBlockFixture(nodeB.chain)
    await expect(nodeB.chain).toAddBlock(blockB1)
    const blockB2 = await useMinerBlockFixture(nodeB.chain)
    await expect(nodeB.chain).toAddBlock(blockB2)
    await nodeA.accounts.updateHead()

    expect(nodeA.accounts.getBalance(accountA)).toMatchObject({
      confirmedBalance: BigInt(500000000),
      unconfirmedBalance: BigInt(500000000),
    })

    // This transaction will be invalid after the reorg
    const invalidTx = await useTxFixture(nodeA.accounts, accountA, accountB)

    expect(nodeA.accounts.getBalance(accountA)).toMatchObject({
      confirmedBalance: BigInt(0),
      unconfirmedBalance: BigInt(499999999),
    })

    await expect(nodeA.chain).toAddBlock(blockB1)
    await expect(nodeA.chain).toAddBlock(blockB2)
    expect(nodeA.chain.head.hash.equals(blockB2.header.hash)).toBe(true)
    await nodeA.accounts.updateHead()

    // We now have this tree with nodeA's wallet trying to spend a note in
    // invalidTx that has been removed once A1 was disconnected from the
    // blockchain after the reorg
    //
    // G -> A1
    //   -> B2 -> B3

    await expect(
      nodeA.memPool['isValidTransaction'](invalidTx, await nodeA.chain.notes.size(), []),
    ).resolves.toBe(false)

    // This should be be 500000000 for both once A1 is removed
    expect(nodeA.accounts.getBalance(accountA)).toMatchObject({
      confirmedBalance: BigInt(0),
      unconfirmedBalance: BigInt(499999999),
    })

    // TODO: check rebroadcasting and accounts
  }, 60000)
})
