import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTag,
  generateUniqueQpayTag,
  isQpayTagTaken,
  provisionKorapayVirtualAccount
} from '../src/utils/korapayVault.js';

// Setup mock storage for test runner
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
global.window = {};

describe('Korapay Zero-Digit Vault & Tag Architecture Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. formatTag standardizes handles with leading @ and lowercase alphanumeric characters', () => {
    assert.strictEqual(formatTag('Chidi Obi'), '@chidiobi');
    assert.strictEqual(formatTag('@@Tunde_99!'), '@tunde_99');
    assert.strictEqual(formatTag(''), '@user');
    assert.strictEqual(formatTag('KORA_SHOP'), '@kora_shop');
  });

  it('2. generateUniqueQpayTag generates collision-free handle based on user name', () => {
    const tag1 = generateUniqueQpayTag('Emeka Nwosu', 'individual');
    assert.strictEqual(tag1, '@emekanwosu');

    // Register tag1
    provisionKorapayVirtualAccount({ name: 'Emeka Nwosu', qpayTag: tag1, type: 'individual' });

    // Second user with identical name gets distinct suffix to avoid collision
    const tag2 = generateUniqueQpayTag('Emeka Nwosu', 'individual');
    assert.notStrictEqual(tag2, tag1, 'Second user must not collide with existing registered tag');
    assert.ok(tag2.startsWith('@emekanwosu'), 'Tag must retain name prefix');
  });

  it('3. provisionKorapayVirtualAccount generates safe masked NUBAN and secure internal vault token', () => {
    const userProfile = {
      name: 'Bolanle Adeleke',
      type: 'business',
      tier: 1
    };

    const vaultResult = provisionKorapayVirtualAccount(userProfile);
    assert.ok(vaultResult.qpayTag, 'Must generate valid Qpay Tag');
    assert.ok(vaultResult.vaultToken.startsWith('qp_sec_'), 'Must generate cryptographic vaultToken');
    assert.ok(vaultResult.mappedNubanMasked.startsWith('••••••'), 'Must hide internal 10-digit NUBAN');
    assert.strictEqual(vaultResult.mappedNubanMasked.length, 10, 'Total masked representation must be 10 characters');

    // Verify tag is now marked as taken in database
    assert.strictEqual(isQpayTagTaken(vaultResult.qpayTag), true);
  });
});
