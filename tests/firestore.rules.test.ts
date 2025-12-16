/// <reference types="vitest" />
import { readFileSync } from 'fs';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-buildmybot';

describe('Firestore security rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required. Run tests via firebase emulators:exec.');
    }

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: process.env.FIRESTORE_EMULATOR_HOST.split(':')[0],
        port: Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]),
        rules: readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows owners to manage their bots', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const botRef = doc(ownerDb, 'bots/alpha');

    await assertSucceeds(setDoc(botRef, { userId: 'owner-1', name: 'Alpha Bot' }));
    await assertSucceeds(getDoc(botRef));
    await assertSucceeds(updateDoc(botRef, { name: 'Alpha Bot v2', userId: 'owner-1' }));
  });

  it('prevents non-owners from reading or updating bots', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-2').firestore();
    const botRef = doc(ownerDb, 'bots/bravo');
    await assertSucceeds(setDoc(botRef, { userId: 'owner-2', name: 'Bravo Bot' }));

    const otherDb = testEnv.authenticatedContext('intruder').firestore();
    await assertFails(getDoc(doc(otherDb, 'bots/bravo')));
    await assertFails(updateDoc(doc(otherDb, 'bots/bravo'), { name: 'Hijack', userId: 'intruder' }));
  });

  it('forces lead ownership on create and update', async () => {
    const ownerDb = testEnv.authenticatedContext('owner-3').firestore();
    const leadRef = doc(ownerDb, 'leads/lead-1');

    await assertSucceeds(setDoc(leadRef, {
      userId: 'owner-3',
      name: 'Test Lead',
      email: 'lead@example.com',
      score: 9,
      status: 'New'
    }));

    await assertFails(setDoc(leadRef, { userId: 'different-owner', name: 'Invalid' }));
    await assertFails(updateDoc(leadRef, { userId: 'attacker', status: 'Closed' }));
  });

  it('restricts profile documents to the matching user id', async () => {
    const ownerDb = testEnv.authenticatedContext('profile-owner').firestore();
    const profileRef = doc(ownerDb, 'profiles/profile-owner');

    await assertSucceeds(setDoc(profileRef, { userId: 'profile-owner', name: 'Owner' }));
    await assertFails(setDoc(profileRef, { userId: 'other-user', name: 'Invalid' }));

    const otherDb = testEnv.authenticatedContext('profile-other').firestore();
    await assertFails(getDoc(doc(otherDb, 'profiles/profile-owner')));
  });
});
