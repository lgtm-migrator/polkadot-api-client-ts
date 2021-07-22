import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';
import fs from 'fs-extra';
import { Keyring } from '@polkadot/api';
import { should } from 'chai';
import { TestPolkadotRPC } from '@w3f/test-utils';
import tmp from 'tmp';

import { Client } from '../src/client';
import { Keystore } from '../src/types';
import { ZeroBalance } from '../src/constants';

should();

const testRPC = new TestPolkadotRPC();
let subject: Client;
let keyring: Keyring;

const testSend = async (isKeepAliveForced = false): Promise<void> =>{
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');

  const pass = 'pass';
  const aliceKeypairJson = keyring.toJson(alice.address, pass);
  const ksFile = tmp.fileSync();
  fs.writeSync(ksFile.fd, JSON.stringify(aliceKeypairJson));
  const passFile = tmp.fileSync();
  fs.writeSync(passFile.fd, pass);
  const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };

  const initialBobBalance = await subject.balanceOf(bob.address);

  const toSend = new BN(10000000000000);
  await subject.send(ks, bob.address, toSend as Balance, isKeepAliveForced);

  const finalBobBalance = await subject.balanceOf(bob.address);

  const expected = (initialBobBalance as BN).add(toSend) as Balance;
  finalBobBalance.eq(expected).should.be.true;
}


describe('Client', () => {
    before(async () => {
        await testRPC.start("v0.9.8");
        keyring = new Keyring({ type: 'sr25519' });
    });

    after(async () => {
        await testRPC.stop();
    });

    beforeEach(() => {
        subject = new Client(testRPC.endpoint());
    })

    it('should get a balance', async () => {
        const alice = keyring.addFromUri('//Alice');

        const balance = await subject.balanceOf(alice.address);

        ZeroBalance.lt(balance).should.be.true;
    });

    it('should make transfers', async () => {
        await testSend();
    });

    it('should make transfers KeepAlive', async () => {
        await testSend(true)
    });

    it('should return the api object', async () => {
        const api = await subject.api();

        const chain = await api.rpc.system.chain();

        chain.should.eq('Development');
    });

});
