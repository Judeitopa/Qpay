import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Crown,
  Users,
  Calendar,
  Clock,
  Heart,
  Search,
  ChevronRight,
  X,
  Phone,
  CheckCircle2,
  Gift,
  ShieldCheck,
  ArrowUpRight,
  Download
} from 'lucide-react';
import VintagePaperTag from './VintagePaperTag';
import confetti from 'canvas-confetti';
import { exportCustomerProfilePdf, exportLeaderboardPdf } from '../utils/pdfExport';

// Helper to determine day of week name from date string or ISO
function getDayOfWeek(dateStr) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
  } catch (e) {}
  return 'Weekend';
}

// Helper to determine time slot description
function getTimeOfDaySlot(dateStr) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const hour = d.getHours();
      if (hour >= 6 && hour < 12) return 'Morning (8:00 AM – 12:00 PM)';
      if (hour >= 12 && hour < 17) return 'Afternoon (12:00 PM – 5:00 PM)';
      if (hour >= 17 && hour < 21) return 'Evening Rush (5:00 PM – 9:00 PM)';
      return 'Late Night (9:00 PM – 12:00 AM)';
    }
  } catch (e) {}
  return 'Evening Rush (5:00 PM – 9:00 PM)';
}

function renderModalPortal(content) {
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

export default function CustomerLeaderboardTab({ businessName = 'Your Business' }) {
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem('qpay_customer_payments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'repeat'
  const [loyaltyPerkSent, setLoyaltyPerkSent] = useState('');

  // Sync with persistent bills storage
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('qpay_customer_payments');
        if (saved) setBills(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('qpay_payments_updated', handleSync);
    return () => window.removeEventListener('qpay_payments_updated', handleSync);
  }, []);

  // Filter bills to only successful/paid bills with valid customer name
  const successfulBills = bills.filter(
    (b) =>
      (b.status === 'SUCCESSFUL' || b.status === 'PAID') &&
      b.customerName &&
      !b.customerName.includes('Awaiting')
  );

  // Aggregate customer profiles from recorded bills
  const customerMap = {};

  successfulBills.forEach((bill) => {
    const name = bill.customerName.trim();
    if (!customerMap[name]) {
      customerMap[name] = {
        name,
        tag: bill.customerTag || '@' + name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        phone: bill.phone || '+234 800 000 0000',
        visitCount: 0,
        totalSpent: 0,
        bills: [],
        itemFrequencies: {},
        dayFrequencies: {},
        timeSlotFrequencies: {},
        lastVisit: bill.date || 'Recent'
      };
    }

    const c = customerMap[name];
    c.visitCount += 1;
    c.totalSpent += bill.amountPaid || 0;
    c.bills.push(bill);

    // Track purchased items
    if (Array.isArray(bill.items)) {
      bill.items.forEach((it) => {
        const itemName = it.name?.trim() || 'Item';
        const qty = parseInt(it.qty, 10) || 1;
        const total =
          parseFloat(it.total) || qty * (parseFloat(it.unitPrice) || 0);
        if (!c.itemFrequencies[itemName]) {
          c.itemFrequencies[itemName] = { name: itemName, qty: 0, totalSpend: 0 };
        }
        c.itemFrequencies[itemName].qty += qty;
        c.itemFrequencies[itemName].totalSpend += total;
      });
    }

    // Track days of the week
    const day = getDayOfWeek(bill.timeIso || bill.date);
    c.dayFrequencies[day] = (c.dayFrequencies[day] || 0) + 1;

    // Track time slot
    const timeSlot = getTimeOfDaySlot(bill.timeIso || bill.date);
    c.timeSlotFrequencies[timeSlot] = (c.timeSlotFrequencies[timeSlot] || 0) + 1;
  });

  // Calculate ranks and top favorites
  const customerLeaderboard = Object.values(customerMap)
    .map((c) => {
      const favoriteItems = Object.values(c.itemFrequencies)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);

      const peakDay =
        Object.entries(c.dayFrequencies).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        'Fridays';

      const peakTime =
        Object.entries(c.timeSlotFrequencies).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || 'Evening Rush (5:00 PM – 9:00 PM)';

      return {
        ...c,
        favoriteItems,
        peakDay,
        peakTime,
        avgOrder: c.visitCount > 0 ? c.totalSpent / c.visitCount : 0
      };
    })
    .sort((a, b) => {
      if (b.visitCount !== a.visitCount) {
        return b.visitCount - a.visitCount;
      }
      return b.totalSpent - a.totalSpent;
    });

  const totalRepeatCustomers = customerLeaderboard.filter((c) => c.visitCount >= 2).length;
  const topCustomer = customerLeaderboard[0] || null;

  // Filtered list
  const filteredLeaderboard = customerLeaderboard.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tag.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'repeat') return matchesSearch && c.visitCount >= 2;
    return matchesSearch;
  });

  const handleSendPerk = (customerName) => {
    setLoyaltyPerkSent(`10% Loyalty discount perk sent to ${customerName}!`);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
    setTimeout(() => setLoyaltyPerkSent(''), 3500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-6 select-none">
      {/* Toast Alert */}
      {loyaltyPerkSent && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{loyaltyPerkSent}</span>
        </div>
      )}

      {/* Clean Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Trophy className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Intelligence</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {businessName}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Customer Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify top returning customers, peak visiting days, and favorite purchases.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({customerLeaderboard.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('repeat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeFilter === 'repeat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Returning ({totalRepeatCustomers})</span>
          </button>
        </div>
      </div>

      {/* 3 Clean Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Top Patron */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Top Returning Customer</span>
            </span>
            {topCustomer && topCustomer.visitCount >= 2 && (
              <VintagePaperTag count={topCustomer.visitCount} />
            )}
          </div>
          {topCustomer ? (
            <div className="mt-2">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {topCustomer.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {topCustomer.tag} • <strong>₦{topCustomer.totalSpent.toLocaleString('en-NG')}</strong>
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">No customer data yet</p>
          )}
        </div>

        {/* Card 2: Peak Day */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Peak Business Day</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-2">
            {topCustomer?.peakDay || 'Fridays'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Highest footfall and payment volume
          </p>
        </div>

        {/* Card 3: Peak Hours */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Peak Visiting Hours</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-2 truncate">
            {topCustomer?.peakTime || 'Evening (5:00 PM – 9:00 PM)'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Optimal sales conversion window
          </p>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Customer Rankings
            </h3>
            <span className="text-xs text-slate-400">
              ({filteredLeaderboard.length})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => exportLeaderboardPdf(filteredLeaderboard, businessName)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              title="Download Leaderboard as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or @tag..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Customer Entries */}
        <div className="divide-y divide-slate-100">
          {filteredLeaderboard.map((customer, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const topItem = customer.favoriteItems[0];

            return (
              <div
                key={customer.name}
                className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Rank & Customer Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      rank === 1
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : rank === 2
                        ? 'bg-slate-200 text-slate-700'
                        : rank === 3
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {customer.name}
                      </span>
                      {customer.visitCount >= 2 && (
                        <VintagePaperTag count={customer.visitCount} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-indigo-600 font-medium">{customer.tag}</span>
                      <span>•</span>
                      <span>{customer.visitCount} {customer.visitCount === 1 ? 'visit' : 'visits'}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Key Habits (Favorite Item & Schedule) */}
                <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap">
                  {topItem && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500 flex-shrink-0" />
                      <span className="text-slate-700 truncate max-w-[140px]">
                        {topItem.qty}× {topItem.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-slate-600">
                    <Calendar className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    <span>{customer.peakDay}</span>
                  </div>
                </div>

                {/* Right: Spend & Details Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total Spent
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-sans">
                      ₦{customer.totalSpent.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(customer)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredLeaderboard.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-400">
              {customerLeaderboard.length === 0
                ? 'No customer records found yet. Customer visit patterns and top purchases will appear here once customer payments are completed.'
                : `No customer records found matching "${searchQuery}"`}
            </div>
          )}
        </div>
      </div>

      {/* CRM Details Modal */}
      {selectedCustomer && renderModalPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomer(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scaleUp my-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedCustomer(null)}
              type="button"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Customer Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                {selectedCustomer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h3>
                  {selectedCustomer.visitCount >= 2 && (
                    <VintagePaperTag count={selectedCustomer.visitCount} />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-indigo-600 font-semibold">{selectedCustomer.tag}</span>
                  <span> • {selectedCustomer.phone}</span>
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Visits</span>
                <span className="text-base font-bold text-slate-900">{selectedCustomer.visitCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Spent</span>
                <span className="text-base font-bold text-slate-900">
                  ₦{selectedCustomer.totalSpent.toLocaleString('en-NG')}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Order</span>
                <span className="text-base font-bold text-slate-900">
                  ₦{Math.round(selectedCustomer.avgOrder).toLocaleString('en-NG')}
                </span>
              </div>
            </div>

            {/* Patronage Schedule */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Patronage Schedule
              </span>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Peak Day of Week:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.peakDay}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Peak Visiting Hours:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.peakTime}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Last Visited:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.lastVisit}</span>
              </div>
            </div>

            {/* Favorite Items */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Favorite Items Purchased
              </span>
              <div className="space-y-1">
                {Object.values(selectedCustomer.itemFrequencies)
                  .sort((a, b) => b.qty - a.qty)
                  .map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-white text-slate-600 font-semibold text-[10px] flex items-center justify-center border border-slate-200">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{it.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {it.qty}×
                        </span>
                        <span className="font-semibold text-slate-900">
                          ₦{it.totalSpend.toLocaleString('en-NG')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSendPerk(selectedCustomer.name)}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Send Loyalty Discount Perk</span>
              </button>
              <button
                type="button"
                onClick={() => exportCustomerProfilePdf(selectedCustomer, businessName)}
                className="py-2.5 px-3.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                title="Download Customer Details PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
