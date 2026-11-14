/**
 * Account Storage & Persistence Manager
 * 
 * Ensures:
 * 1. Newly registered business or individual accounts start with 0 sales, 0 inventory, 0 transactions.
 * 2. Logging out and logging back in with the same business name or phone retains ALL their
 *    previous sales, inventory, transactions, and balance.
 * 3. Switching accounts cleanly isolates each business and individual's data.
 */

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
 * Save or update an account in the permanent accounts store
 */
export function saveAccount(user, extraData = {}) {
  if (!user || !user.name) return;
  const store = getStore();
  const key = normalizeAccountKey(user.name, user.type || 'business');

  const existing = store[key] || {};
  const updated = {
    ...existing,
    user: {
      ...existing.user,
      ...user,
      balance: typeof extraData.balance === 'number' ? extraData.balance : (user.balance ?? existing.user?.balance ?? 0)
    },
    bills: extraData.bills !== undefined ? extraData.bills : (existing.bills || []),
    inventory: extraData.inventory !== undefined ? extraData.inventory : (existing.inventory || []),
    transactions: extraData.transactions !== undefined ? extraData.transactions : (existing.transactions || []),
    lastUpdated: Date.now()
  };

  store[key] = updated;
  saveStore(store);
  return updated;
}

/**
 * Restore an existing account's data into the active session keys
 */
export function restoreAccountToActiveSession(account) {
  if (!account || !account.user) return null;
  const user = account.user;

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
    localStorage.removeItem('qpay_registered_user');
    // Clear active working storage keys so next login or registration begins fresh
    localStorage.setItem('qpay_customer_payments', '[]');
    localStorage.setItem('qpay_business_inventory', '[]');
    localStorage.setItem('qpay_transactions', '[]');
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
}
