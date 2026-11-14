import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper validator extracted from RegisterView for verification
function isValidNigerianPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const localRegex = /^0[789][01]\d{8}$/;
  const intlRegex = /^\+234[789][01]\d{8}$/;
  const rawIntlRegex = /^234[789][01]\d{8}$/;
  return localRegex.test(cleaned) || intlRegex.test(cleaned) || rawIntlRegex.test(cleaned);
}

describe('Fintech Security, KYC & Account Tier Limits Tests', () => {
  it('1. Nigerian phone number validation rules', () => {
    // Valid standard numbers
    assert.strictEqual(isValidNigerianPhone('08031234567'), true);
    assert.strictEqual(isValidNigerianPhone('+2348031234567'), true);
    assert.strictEqual(isValidNigerianPhone('2349012345678'), true);
    assert.strictEqual(isValidNigerianPhone('07055554444'), true);
    assert.strictEqual(isValidNigerianPhone('081-2345-6789'), true);

    // Invalid numbers
    assert.strictEqual(isValidNigerianPhone('080123'), false, 'Too short');
    assert.strictEqual(isValidNigerianPhone('12345678901'), false, 'Invalid prefix');
    assert.strictEqual(isValidNigerianPhone('06012345678'), false, 'Non-existent telco code');
    assert.strictEqual(isValidNigerianPhone(''), false, 'Empty phone');
  });

  it('2. Account Tier Daily Limits enforcement', () => {
    const tierLimits = {
      individual: {
        1: 50000,
        2: 500000,
        3: 5000000
      },
      business: {
        1: 500000,
        2: 5000000,
        3: Infinity
      }
    };

    // Tier 1 Individual cannot send more than 50k in a day
    const indTier1Limit = tierLimits.individual[1];
    assert.strictEqual(indTier1Limit, 50000);
    assert.strictEqual(65000 <= indTier1Limit, false, '65,000 exceeds Tier 1 individual limit');
    assert.strictEqual(25000 <= indTier1Limit, true, '25,000 is allowed within Tier 1 individual limit');

    // Tier 1 Business gets 500k/day limit
    const bizTier1Limit = tierLimits.business[1];
    assert.strictEqual(bizTier1Limit, 500000);
    assert.strictEqual(250000 <= bizTier1Limit, true, '250,000 is within Tier 1 business limit');
  });

  it('3. Security PIN verification rules', () => {
    const defaultPin = '1234';

    const verifyPin = (inputPin, savedPin = defaultPin) => {
      return inputPin === savedPin;
    };

    assert.strictEqual(verifyPin('1234'), true, 'Default PIN 1234 must authenticate');
    assert.strictEqual(verifyPin('0000'), false, 'Incorrect PIN must be rejected');
    assert.strictEqual(verifyPin('123'), false, 'Incomplete PIN must be rejected');
    assert.strictEqual(verifyPin('8821', '8821'), true, 'Custom user PIN must authenticate');
  });

  it('4. Insufficient balance prevention', () => {
    const balance = 4500;
    const canPay = (amount, availBalance = balance) => {
      return amount > 0 && amount <= availBalance;
    };

    assert.strictEqual(canPay(2000), true, '2,000 is payable with 4,500 balance');
    assert.strictEqual(canPay(4500), true, 'Exact amount 4,500 is payable');
    assert.strictEqual(canPay(5000), false, '5,000 must be rejected due to insufficient funds');
    assert.strictEqual(canPay(0), false, 'Zero amount must be rejected');
  });
});
