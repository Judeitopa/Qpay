/**
 * Account Storage & Persistence Manager
 * 
 * Ensures:
 * 1. Newly registered business or individual accounts start with 0 sales, 0 inventory, 0 transactions.
 * 2. Logging out and logging back in with the same business name or phone retains ALL their
 *    previous sales, inventory, transactions, and balance.
 * 3. Switching accounts cleanly isolates each business and individual's data.
 */

import { DEFAULT_UNISEX_AVATAR } from './avatar.js';

const ACCOUNTS_STORE_KEY = 'qpay_accounts_store';

function getStore() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStore(store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNTS_STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save accounts store:', e);
  }
}

/**
 * Normalizes identifier into a clean lookup key
 */
export function normalizeAccountKey(nameOrPhone = '', type = 'business') {
  const clean = String(nameOrPhone)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const prefix = type === 'business' ? 'biz_' : 'ind_';
  return prefix + (clean || 'unnamed');
}

/**
 * Clean phone number for cross-matching
 */
function cleanPhone(p = '') {
  return String(p).replace(/[^0-9]/g, '');
}

/**
 * Normalizes a Nigerian phone number to standard 11 digits (e.g. 08012345678)
 */
export function normalizeNigerianPhone(phone = '') {
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 10) {
    digits = '0' + digits;
  }
  return digits;
}

/**
 * Find an existing registered account by business name, phone, or tag
 */
export function findAccount(identifier = '', type = 'business') {
  if (!identifier) return null;
  const store = getStore();
  const directKey = normalizeAccountKey(identifier, type);
  
  if (store[directKey]) {
    return store[directKey];
  }

  const cleanedId = String(identifier).trim().toLowerCase();
  const cleanedDigits = cleanPhone(identifier);

  // Search through all stored accounts of the matching type
  for (const key of Object.keys(store)) {
    const acc = store[key];
    if (acc && acc.user) {
      if (type && acc.user.type !== type) continue;
      
      const accName = (acc.user.name || '').trim().toLowerCase();
      const accPhone = cleanPhone(acc.user.phone || '');
      const accTag = (acc.user.qpayTag || '').trim().toLowerCase();

      if (accName === cleanedId) return acc;
      if (cleanedDigits.length >= 8 && accPhone.includes(cleanedDigits)) return acc;
      if (accTag === cleanedId || accTag === '@' + cleanedId) return acc;
    }
  }

  return null;
}

/**
 * Find an existing registered account by phone number across all account types or for a specific type
 */
export function findAccountByPhone(identifier = '', type = null) {
  if (!identifier) return null;
  const store = getStore();
  const rawClean = String(identifier).trim().toLowerCase();
  const normalizedInput = normalizeNigerianPhone(identifier);
  const digitsOnly = String(identifier).replace(/[^0-9]/g, '');

  for (const key of Object.keys(store)) {
    const acc = store[key];
    if (acc && acc.user) {
      if (type && acc.user.type !== type) continue;

      const userPhone = acc.user.phone || '';
      const normUserPhone = normalizeNigerianPhone(userPhone);
      const userDigits = String(userPhone).replace(/[^0-9]/g, '');

      // 1. Direct normalized match
      if (normalizedInput && normUserPhone && normalizedInput === normUserPhone) {
        return acc;
      }

      // 2. Suffix match (last 10 digits)
      if (digitsOnly.length >= 8 && userDigits.length >= 8) {
        if (digitsOnly.endsWith(userDigits) || userDigits.endsWith(digitsOnly)) {
          return acc;
        }
      }

      // 3. Fallback match by Qpay tag or email or name
      const accTag = (acc.user.qpayTag || '').trim().toLowerCase().replace('@', '');
      const rawTag = rawClean.replace('@', '');
      if (rawTag && accTag === rawTag) {
        return acc;
      }
      if (acc.user.email && acc.user.email.trim().toLowerCase() === rawClean) {
        return acc;
      }
      if (acc.user.name && acc.user.name.trim().toLowerCase() === rawClean) {
        return acc;
      }
    }
  }

  return null;
}

/**
 * Save or update an account in the permanent accounts store
 */
export function saveAccount(user, extraData = {}) {
  if (!user || !user.name) return;
  const store = getStore();
  const key = normalizeAccountKey(user.name, user.type || 'business');

  const existing = store[key] || {};
  const password = extraData.password || user.password || existing.password || existing.user?.password || '';

  const updated = {
    ...existing,
    password: password,
    user: {
      ...existing.user,
      ...user,
      password: password,
      balance: typeof extraData.balance === 'number' ? extraData.balance : (user.balance ?? existing.user?.balance ?? 0)
    },
    bills: extraData.bills !== undefined ? extraData.bills : (existing.bills || []),
    inventory: extraData.inventory !== undefined ? extraData.inventory : (existing.inventory || []),
    transactions: extraData.transactions !== undefined ? extraData.transactions : (existing.transactions || []),
    lastUpdated: Date.now()
  };

  store[key] = updated;
  saveStore(store);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('qpay_has_account', 'true');
      if (user.type) {
        localStorage.setItem(`qpay_has_account_${user.type}`, 'true');
        if (user.phone) {
          localStorage.setItem(`qpay_last_phone_${user.type}`, user.phone);
        }
      }
      if (user.phone) {
        localStorage.setItem('qpay_last_phone', user.phone);
      }
    } catch (e) {}
  }

  return updated;
}

/**
 * Restore an existing account's data into the active session keys
 */
export function restoreAccountToActiveSession(account) {
  if (!account || !account.user) return null;
  const user = { ...account.user };

  // Ensure individual accounts use the unisex avatar if legacy photo was stored
  if (user.type === 'individual' && (!user.avatar || user.avatar.includes('photo-1573496359142-b8d87734a5a2'))) {
    user.avatar = DEFAULT_UNISEX_AVATAR;
  }

  try {
    localStorage.setItem('qpay_registered_user', JSON.stringify(user));

    if (user.type === 'business') {
      localStorage.setItem('qpay_customer_payments', JSON.stringify(account.bills || []));
      localStorage.setItem('qpay_business_inventory', JSON.stringify(account.inventory || []));
    } else {
      localStorage.setItem('qpay_transactions', JSON.stringify(account.transactions || []));
    }
  } catch (e) {
    console.error('Failed to restore active session:', e);
  }

  return user;
}

/**
 * Synchronize the current active session state into the permanent account store
 */
export function persistActiveSession() {
  if (typeof window === 'undefined') return;
  try {
    const rawUser = localStorage.getItem('qpay_registered_user');
    if (!rawUser) return;
    const user = JSON.parse(rawUser);

    let bills = [];
    let inventory = [];
    let transactions = [];

    if (user.type === 'business') {
      try {
        bills = JSON.parse(localStorage.getItem('qpay_customer_payments') || '[]');
      } catch (e) {}
      try {
        inventory = JSON.parse(localStorage.getItem('qpay_business_inventory') || '[]');
      } catch (e) {}
    } else {
      try {
        transactions = JSON.parse(localStorage.getItem('qpay_transactions') || '[]');
      } catch (e) {}
    }

    saveAccount(user, {
      bills,
      inventory,
      transactions,
      balance: user.balance || 0
    });
  } catch (e) {
    console.error('Failed to persist active session:', e);
  }
}

/**
 * Clear the active session for logging out, while preserving data in the account store
 */
export function clearActiveSession() {
  if (typeof window === 'undefined') return;
  // First persist whatever is currently active
  persistActiveSession();

  try {
    const rawUser = localStorage.getItem('qpay_registered_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed.phone) {
        localStorage.setItem('qpay_last_phone', parsed.phone);
        if (parsed.type) {
          localStorage.setItem(`qpay_last_phone_${parsed.type}`, parsed.phone);
          localStorage.setItem(`qpay_has_account_${parsed.type}`, 'true');
        }
      }
    }
    localStorage.setItem('qpay_has_account', 'true');
    localStorage.removeItem('qpay_registered_user');
    // Clear active working storage keys so next login or registration begins fresh
    localStorage.setItem('qpay_customer_payments', '[]');
    localStorage.setItem('qpay_business_inventory', '[]');
    localStorage.setItem('qpay_transactions', '[]');
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
}

/**
 * Authenticates user credentials (phone and password) against permanent storage.
 * Restores the full user session upon success.
 * If type ('individual' | 'business') is provided, authenticates specifically for that account type.
 */
export function loginWithCredentials(phone, password, rawType = null) {
  if (!phone || !String(phone).trim()) {
    return { success: false, error: 'Please enter your phone number.' };
  }
  if (!password || !String(password).trim()) {
    return { success: false, error: 'Please enter your password.' };
  }

  // Ensure type is strictly sanitized to 'business' | 'individual' or null
  const cleanType = typeof rawType === 'string' && (rawType.toLowerCase() === 'business' || rawType.toLowerCase() === 'individual')
    ? rawType.toLowerCase()
    : null;

  const acc = findAccountByPhone(phone, cleanType);
  if (!acc || !acc.user) {
    if (cleanType) {
      return {
        success: false,
        error: `No registered ${cleanType} account found with this phone number. Please check your phone number or register as ${cleanType === 'individual' ? 'an individual' : 'a business'}.`
      };
    }
    return {
      success: false,
      error: 'No account found with this phone number. Please check your phone number or create an account.'
    };
  }

  const storedPassword = acc.password || acc.user.password;
  if (storedPassword) {
    if (storedPassword !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your password and try again.'
      };
    }
  } else {
    // If account was created prior to password field persistence, adopt the entered password
    acc.password = password;
    acc.user.password = password;
    saveAccount(acc.user, { password });
  }

  // Restore this account's persistent records to active session
  const restoredUser = restoreAccountToActiveSession(acc);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('qpay_has_account', 'true');
      if (acc.user.type) {
        localStorage.setItem(`qpay_has_account_${acc.user.type}`, 'true');
        if (acc.user.phone) {
          localStorage.setItem(`qpay_last_phone_${acc.user.type}`, acc.user.phone);
        }
      }
      if (acc.user.phone) {
        localStorage.setItem('qpay_last_phone', acc.user.phone);
      }
    } catch (e) {}
  }

  return { success: true, user: restoredUser, account: acc };
}

/**
 * Checks whether an account of a specific type ('individual' or 'business')
 * has registered on this device.
 */
export function hasRegisteredAccountType(type = 'individual') {
  if (typeof window === 'undefined') return false;
  try {
    const store = getStore();
    for (const key of Object.keys(store)) {
      const acc = store[key];
      if (acc && acc.user && acc.user.type === type) {
        return true;
      }
    }
    const flag = localStorage.getItem(`qpay_has_account_${type}`);
    if (flag === 'true') return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Checks whether any registered accounts exist in this browser/device.
 */
export function hasRegisteredAccount() {
  if (typeof window === 'undefined') return false;
  try {
    const flag = localStorage.getItem('qpay_has_account');
    if (flag === 'true') return true;
    const store = getStore();
    return Object.keys(store).length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the phone number of the most recently active or registered user for a type
 */
export function getLastPhone(type = null) {
  if (typeof window === 'undefined') return '';
  try {
    if (type) {
      const typePhone = localStorage.getItem(`qpay_last_phone_${type}`);
      if (typePhone) return typePhone;
      const rec = getRecognizedAccountByType(type);
      if (rec && rec.phone) return rec.phone;
    }
    return localStorage.getItem('qpay_last_phone') || '';
  } catch (e) {
    return '';
  }
}

/**
 * Returns recognized account details for a specific type ('individual' or 'business')
 */
export function getRecognizedAccountByType(type = 'individual') {
  if (typeof window === 'undefined') return null;
  try {
    const lastTypePhone = localStorage.getItem(`qpay_last_phone_${type}`);
    if (lastTypePhone) {
      const acc = findAccountByPhone(lastTypePhone, type);
      if (acc && acc.user && acc.user.type === type) {
        return {
          name: acc.user.name,
          phone: acc.user.phone,
          type: acc.user.type,
          qpayTag: acc.user.qpayTag,
          avatar: acc.user.avatar,
          email: acc.user.email
        };
      }
    }

    const store = getStore();
    for (const key of Object.keys(store)) {
      const acc = store[key];
      if (acc && acc.user && acc.user.type === type) {
        return {
          name: acc.user.name,
          phone: acc.user.phone,
          type: acc.user.type,
          qpayTag: acc.user.qpayTag,
          avatar: acc.user.avatar,
          email: acc.user.email
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Returns information about the most recently recognized user on this device
 */
export function getRecognizedAccountInfo() {
  if (typeof window === 'undefined') return null;
  try {
    const lastPhone = localStorage.getItem('qpay_last_phone');
    if (lastPhone) {
      const acc = findAccountByPhone(lastPhone);
      if (acc && acc.user) {
        return {
          name: acc.user.name,
          phone: acc.user.phone,
          type: acc.user.type,
          qpayTag: acc.user.qpayTag,
          avatar: acc.user.avatar,
          email: acc.user.email
        };
      }
    }
    const store = getStore();
    const keys = Object.keys(store);
    if (keys.length > 0) {
      const firstAcc = store[keys[0]];
      if (firstAcc && firstAcc.user) {
        return {
          name: firstAcc.user.name,
          phone: firstAcc.user.phone,
          type: firstAcc.user.type,
          qpayTag: firstAcc.user.qpayTag,
          avatar: firstAcc.user.avatar,
          email: firstAcc.user.email
        };
      }
    }
  } catch (e) {}
  return null;
}
