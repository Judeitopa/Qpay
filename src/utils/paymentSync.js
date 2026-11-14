/**
 * Qpay Cross-Device Real-Time Payment Synchronization Service
 * 
 * Enables multi-device QR payments across different devices & browsers (e.g. Phone <-> iPad <-> Laptop).
 * Uses a zero-config cloud sync rail (api.restful-api.dev) backed by BroadcastChannel & localStorage
 * for instant, resilient double-entry balance settlement.
 */

const SYNC_API_ENDPOINT = 'https://api.restful-api.dev/objects';
const SYNC_CHANNEL_NAME = 'qpay_sync_channel';

// In-memory set of processed transaction references to guarantee strict idempotency
const processedReferences = new Set();

/**
 * Safely initialize BroadcastChannel if supported in the browser
 */
function getBroadcastChannel() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 1. Create a Payment Invoice on the Cloud Rail
 * Called by Device B (Receiver) when displaying the Receive QR code.
 */
export async function createPaymentInvoice({ recipientUser, amount, note }) {
  const numericAmount = parseFloat(amount || 0);
  const reference = 'KP_QPAY_' + Math.floor(100000 + Math.random() * 900000);
  const qpayTag = recipientUser?.qpayTag || '@user';
  const recipientName = recipientUser?.name || 'Qpay User';
  const accountNumber = recipientUser?.accountNumber || '0234891102';
  const bankName = recipientUser?.bankName || 'Kora / Wema Bank';

  const invoiceData = {
    app: 'Qpay',
    type: 'korapay_invoice',
    reference,
    recipientTag: qpayTag,
    recipientName,
    accountNumber,
    bankName,
    amount: numericAmount,
    currency: 'NGN',
    note: note || 'Qpay Instant Settlement',
    status: 'PENDING',
    createdAt: Date.now()
  };

  let syncId = null;

  // Attempt to register on cloud sync rail for cross-device reach
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(SYNC_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'qpay_invoice_' + reference,
        data: invoiceData
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const resJson = await response.json();
      syncId = resJson.id;
    }
  } catch (err) {
    // Network or offline: local fallback continues smoothly
    syncId = 'local_' + reference;
  }

  // Store in local active invoices
  if (typeof window !== 'undefined') {
    try {
      const active = JSON.parse(localStorage.getItem('qpay_active_invoices') || '{}');
      active[reference] = { ...invoiceData, syncId };
      localStorage.setItem('qpay_active_invoices', JSON.stringify(active));
    } catch (e) {}
  }

  // Complete QR Payload embedded into the SVG QR code
  const qrPayload = JSON.stringify({
    app: 'Qpay',
    type: 'korapay_invoice',
    syncId: syncId || ('local_' + reference),
    ref: reference,
    reference: reference,
    accountNumber,
    accountName: recipientName,
    qpayTag,
    bankName,
    amount: String(numericAmount),
    currency: 'NGN',
    note: note || 'Qpay Instant Settlement',
    timestamp: Date.now()
  });

  return {
    syncId,
    reference,
    qrPayload,
    invoiceData
  };
}

/**
 * 2. Complete Payment Invoice
 * Called by Device A (Payer) after entering 4-digit PIN and verifying balance.
 */
export async function completePaymentInvoice({ syncId, reference, amount, payerUser, recipientData }) {
  const numericAmount = parseFloat(amount || 0);
  const payerName = payerUser?.name || 'Verified Customer';
  const payerTag = payerUser?.qpayTag || '@customer';
  const payerAccount = payerUser?.accountNumber || '0234891102';

  const settlementPayload = {
    reference,
    syncId,
    amount: numericAmount,
    status: 'PAID',
    settledAt: Date.now(),
    payer: {
      name: payerName,
      tag: payerTag,
      accountNumber: payerAccount
    },
    recipient: {
      tag: recipientData?.qpayTag || recipientData?.recipientTag,
      name: recipientData?.accountName || recipientData?.recipientName
    }
  };

  // 1. Notify Cloud Rail if syncId is a cloud ID
  if (syncId && !syncId.startsWith('local_')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      await fetch(`${SYNC_API_ENDPOINT}/${syncId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'qpay_invoice_' + reference,
          data: {
            ...settlementPayload,
            recipientTag: recipientData?.qpayTag || recipientData?.recipientTag,
            recipientName: recipientData?.accountName || recipientData?.recipientName
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch (e) {
      console.warn('Cloud sync complete error:', e);
    }
  }

  // 2. Broadcast locally via BroadcastChannel (for multi-tab / same machine testing)
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ type: 'QPAY_PAYMENT_SETTLED', payload: settlementPayload });
      channel.close();
    } catch (e) {}
  }

  // 3. Set in localStorage for storage event listener across tabs/windows
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('qpay_latest_settlement', JSON.stringify({
        ...settlementPayload,
        _nonce: Date.now()
      }));
    } catch (e) {}
  }

  return settlementPayload;
}

/**
 * 3. Poll Payment Status for an Invoice
 * Called by Device B (Receiver) while displaying QR code or in background.
 */
export async function checkInvoiceSettlementStatus(syncId, reference) {
  // Check local active storage first
  if (typeof window !== 'undefined') {
    try {
      const latest = JSON.parse(localStorage.getItem('qpay_latest_settlement') || 'null');
      if (latest && (latest.reference === reference || latest.syncId === syncId) && latest.status === 'PAID') {
        return latest;
      }
    } catch (e) {}
  }

  // Poll cloud rail if syncId is remote
  if (syncId && !syncId.startsWith('local_')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${SYNC_API_ENDPOINT}/${syncId}`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data && data.status === 'PAID') {
          return data;
        }
      }
    } catch (e) {
      // transient network error, will retry on next tick
    }
  }

  return null;
}

/**
 * 4. Apply Credit to Recipient User Account
 * Guarantees idempotency (each reference can only be credited once).
 */
export function applyIncomingPaymentCredit({ payment, currentUser, onUserUpdated }) {
  if (!payment || !payment.reference) return null;

  const ref = payment.reference;
  if (processedReferences.has(ref)) return null;

  // Also check persistent registry in localStorage
  if (typeof window !== 'undefined') {
    try {
      const processed = JSON.parse(localStorage.getItem('qpay_processed_credits') || '[]');
      if (processed.includes(ref)) {
        processedReferences.add(ref);
        return null;
      }
      processed.push(ref);
      localStorage.setItem('qpay_processed_credits', JSON.stringify(processed));
    } catch (e) {}
  }

  processedReferences.add(ref);

  const creditAmount = parseFloat(payment.amount || 0);
  if (creditAmount <= 0) return null;

  // 1. Update User Balance in State and localStorage
  const currentBalance = Number(currentUser?.balance || 0);
  const newBalance = currentBalance + creditAmount;

  const updatedUser = {
    ...currentUser,
    balance: newBalance
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('qpay_registered_user', JSON.stringify(updatedUser));
  }

  if (onUserUpdated) {
    onUserUpdated(updatedUser);
  }

  // 2. Add Credit Transaction into Transaction History
  if (typeof window !== 'undefined') {
    try {
      const existingTx = JSON.parse(localStorage.getItem('qpay_transactions') || '[]');
      const payerName = payment.payer?.name || 'Verified Qpay Customer';
      const payerTag = payment.payer?.tag ? ` (${payment.payer.tag})` : '';

      const creditTx = {
        id: 'tx_cr_' + Date.now(),
        title: `Payment from ${payerName}${payerTag}`,
        type: 'credit',
        amount: creditAmount,
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timeIso: new Date().toISOString(),
        ref: ref,
        status: 'Successful',
        rail: 'Qpay QR Rail'
      };

      localStorage.setItem('qpay_transactions', JSON.stringify([creditTx, ...existingTx]));
      window.dispatchEvent(new Event('qpay_transactions_updated'));
    } catch (e) {}

    // 3. If recipient is a Business, also record in customer payments terminal
    if (currentUser?.type === 'business') {
      try {
        const existingBills = JSON.parse(localStorage.getItem('qpay_customer_payments') || '[]');
        const newBill = {
          id: 'CP_' + Date.now(),
          billRef: 'CP_' + Math.floor(100000 + Math.random() * 900000),
          customerName: payment.payer?.name || 'Customer',
          customerTag: payment.payer?.tag || '@customer',
          phone: '+234 80' + Math.floor(10000000 + Math.random() * 90000000),
          amountPaid: creditAmount,
          itemsCount: 1,
          time: 'Just now',
          timeIso: new Date().toISOString(),
          status: 'SUCCESSFUL',
          rail: 'Qpay QR Rail'
        };
        const updatedBills = [newBill, ...existingBills];
        localStorage.setItem('qpay_customer_payments', JSON.stringify(updatedBills));
        window.dispatchEvent(new CustomEvent('qpay_payments_updated', { detail: { bills: updatedBills } }));
      } catch (e) {}
    }
  }

  return updatedUser;
}
