import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage in Node environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
global.window = {};

import {
  saveAccount,
  findAccountByPhone,
  loginWithCredentials,
  hasRegisteredAccount,
  hasRegisteredAccountType,
  getRecognizedAccountByType,
  clearActiveSession,
  normalizeNigerianPhone
} from '../src/utils/accountStorage.js';

describe('Login Authentication & Returning User Recognition', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Normalizes various Nigerian phone number formats to standard local format', () => {
    assert.equal(normalizeNigerianPhone('08012345678'), '08012345678');
    assert.equal(normalizeNigerianPhone('+2348012345678'), '08012345678');
    assert.equal(normalizeNigerianPhone('2348012345678'), '08012345678');
    assert.equal(normalizeNigerianPhone('8012345678'), '08012345678');
  });

  it('2. Saves account with password and successfully logs in with phone and password', () => {
    const businessUser = {
      id: 'usr_biz_1',
      name: 'Super Foods Store',
      type: 'business',
      phone: '08012345678',
      email: 'superfoods@qpay.africa.com',
      qpayTag: '@superfoods'
    };

    saveAccount(businessUser, {
      password: 'password123',
      bills: [{ id: 'bill_1', amount: 5000, customerName: 'Emeka' }],
      inventory: [{ id: 'inv_1', name: 'Jollof Rice', qty: 20 }],
      balance: 15000
    });

    assert.equal(hasRegisteredAccount(), true, 'Recognizes that account has registered');
    assert.equal(hasRegisteredAccountType('business'), true, 'Recognizes business account');
    assert.equal(hasRegisteredAccountType('individual'), false, 'No individual account yet');

    // Simulate Logout
    clearActiveSession();
    assert.equal(localStorage.getItem('qpay_registered_user'), null, 'Session cleared on logout');

    // Log in with correct phone and password
    const result = loginWithCredentials('08012345678', 'password123', 'business');
    assert.equal(result.success, true);
    assert.equal(result.user.name, 'Super Foods Store');

    // Verify inventory, payments and balance were fully restored
    const restoredInventory = JSON.parse(localStorage.getItem('qpay_business_inventory'));
    const restoredBills = JSON.parse(localStorage.getItem('qpay_customer_payments'));
    assert.equal(restoredInventory.length, 1);
    assert.equal(restoredInventory[0].name, 'Jollof Rice');
    assert.equal(restoredBills.length, 1);
    assert.equal(restoredBills[0].amount, 5000);
  });

  it('3. Rejects login with incorrect password with clear error message', () => {
    const individualUser = {
      id: 'usr_ind_1',
      name: 'Chioma Adebayo',
      type: 'individual',
      phone: '09087654321',
      email: 'chioma@qpay.africa.com',
      qpayTag: '@chioma'
    };

    saveAccount(individualUser, {
      password: 'mysecurepassword'
    });

    // Attempt login with wrong password
    const failResult = loginWithCredentials('09087654321', 'wrongpassword', 'individual');
    assert.equal(failResult.success, false);
    assert.match(failResult.error, /Incorrect password/i);
  });

  it('4. Rejects login with unregistered phone number with clear error message', () => {
    const failResult = loginWithCredentials('07000000000', 'somepass', 'business');
    assert.equal(failResult.success, false);
    assert.match(failResult.error, /No registered business account found/i);
  });

  it('5. Successfully matches international +234 prefix to stored local 080 phone', () => {
    const user = {
      id: 'usr_2',
      name: 'Tunde Ventures',
      type: 'business',
      phone: '08123456789',
      qpayTag: '@tundev'
    };

    saveAccount(user, { password: 'pass12345' });

    // User logs in using +234 format
    const result = loginWithCredentials('+2348123456789', 'pass12345', 'business');
    assert.equal(result.success, true);
    assert.equal(result.user.name, 'Tunde Ventures');
  });

  it('6. Remembers BOTH an individual and business account on the same device independently', () => {
    // 1. Register Business Account
    const biz = {
      id: 'usr_biz_99',
      name: 'Amara Grocery Stores',
      type: 'business',
      phone: '08099887766',
      qpayTag: '@amaragrocery'
    };
    saveAccount(biz, {
      password: 'bizpassword',
      inventory: [{ id: 'i1', name: 'Milk', qty: 10 }]
    });

    // 2. Register Individual Account
    const ind = {
      id: 'usr_ind_99',
      name: 'Amara Nwosu',
      type: 'individual',
      phone: '08011223344',
      qpayTag: '@amaranwosu'
    };
    saveAccount(ind, {
      password: 'indpassword',
      balance: 25000
    });

    // Verify both are recognized
    assert.equal(hasRegisteredAccountType('business'), true, 'Business account registered');
    assert.equal(hasRegisteredAccountType('individual'), true, 'Individual account registered');

    const recBiz = getRecognizedAccountByType('business');
    assert.equal(recBiz.name, 'Amara Grocery Stores');

    const recInd = getRecognizedAccountByType('individual');
    assert.equal(recInd.name, 'Amara Nwosu');

    // 3. Log in as Business
    const bizLogin = loginWithCredentials('08099887766', 'bizpassword', 'business');
    assert.equal(bizLogin.success, true);
    assert.equal(bizLogin.user.type, 'business');
    assert.equal(bizLogin.user.name, 'Amara Grocery Stores');

    clearActiveSession();

    // 4. Log in as Individual
    const indLogin = loginWithCredentials('08011223344', 'indpassword', 'individual');
    assert.equal(indLogin.success, true);
    assert.equal(indLogin.user.type, 'individual');
    assert.equal(indLogin.user.name, 'Amara Nwosu');
  });

  it('7. If individual is registered but business is not, prompts registration for business', () => {
    const ind = {
      id: 'usr_ind_only',
      name: 'David Mark',
      type: 'individual',
      phone: '08055667788',
      qpayTag: '@davidmark'
    };
    saveAccount(ind, { password: 'pass' });

    assert.equal(hasRegisteredAccountType('individual'), true);
    assert.equal(hasRegisteredAccountType('business'), false);
  });
});
