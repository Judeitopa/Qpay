import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  ShoppingBag,
  Clock,
  Compass,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import VintagePaperTag from './VintagePaperTag';

/**
 * Helper to analyze customer payments from localStorage
 */
function getBusinessCustomerAnalytics() {
  try {
    const saved = localStorage.getItem('qpay_customer_payments');
    const bills = saved ? JSON.parse(saved) : [];
    const successfulBills = bills.filter(
      (b) =>
        (b.status === 'SUCCESSFUL' || b.status === 'PAID') &&
        b.customerName &&
        !b.customerName.includes('Awaiting')
    );

    const customerMap = {};

    successfulBills.forEach((bill) => {
      const name = (bill.customerName || 'Customer').trim();
      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          tag: bill.customerTag || '@' + name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          visitCount: 0,
          totalSpent: 0,
          items: {},
          days: {},
          times: []
        };
      }
      const c = customerMap[name];
      c.visitCount += 1;
      c.totalSpent += bill.amountPaid || 0;

      if (Array.isArray(bill.items)) {
        bill.items.forEach((it) => {
          const itName = it.name?.trim() || 'Item';
          const qty = parseInt(it.qty, 10) || 1;
          c.items[itName] = (c.items[itName] || 0) + qty;
        });
      }

      const billDate = new Date(bill.timeIso || bill.date || Date.now());
      const dayName = !isNaN(billDate.getTime())
        ? billDate.toLocaleDateString('en-US', { weekday: 'long' })
        : 'Friday';
      c.days[dayName] = (c.days[dayName] || 0) + 1;
      c.times.push(bill.date || 'Evening');
    });

    const rankedCustomers = Object.values(customerMap).sort(
      (a, b) => b.visitCount - a.visitCount || b.totalSpent - a.totalSpent
    );

    // Aggregate global item popularity
    const globalItems = {};
    const globalDays = {};

    successfulBills.forEach((bill) => {
      if (Array.isArray(bill.items)) {
        bill.items.forEach((it) => {
          const itName = it.name?.trim() || 'Item';
          const qty = parseInt(it.qty, 10) || 1;
          globalItems[itName] = (globalItems[itName] || 0) + qty;
        });
      }
      const billDate = new Date(bill.timeIso || bill.date || Date.now());
      const dayName = !isNaN(billDate.getTime())
        ? billDate.toLocaleDateString('en-US', { weekday: 'long' })
        : 'Friday';
      globalDays[dayName] = (globalDays[dayName] || 0) + 1;
    });

    const topItems = Object.entries(globalItems)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topDays = Object.entries(globalDays)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCustomers: rankedCustomers.length,
      rankedCustomers,
      topItems,
      topDays,
      totalRevenue: successfulBills.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0)
    };
  } catch (e) {
    return {
      totalCustomers: 0,
      rankedCustomers: [],
      topItems: [],
      topDays: [],
      totalRevenue: 0
    };
  }
}

export default function AiAssistantChat({
  registeredUser,
  onNavigate,
  onOpenProfile,
  onOpenAddMoney,
  customerPaymentsTotal
}) {
  const isBusiness = registeredUser?.type === 'business';
  const userName = registeredUser?.name || (isBusiness ? 'Merchant' : 'Friend');

  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissedPop, setHasDismissedPop] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(transcript);
          handleSendMessage(transcript);
        }
      };

      recognizer.onerror = () => {
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  // Initialize greeting messages
  useEffect(() => {
    const initialGreeting = isBusiness
      ? `Hello ${userName}! 👋 I am your Qpay Merchant Assistant.\n\nI can analyze your customers' purchase habits, identify your most returning customers, pinpoint peak visit days, and advise you on how to boost customer retention. How may I assist your business today?`
      : `Hello ${userName}! 👋 I am your Qpay Assistant.\n\nI can help you navigate around Qpay, check your available balance, explain QR scan payments, or take you straight to Send or Transactions. What would you like to do?`;

    setMessages([
      {
        id: 'msg_init',
        sender: 'assistant',
        text: initialGreeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: isBusiness
          ? [
              'Who are my most returning customers?',
              'What do customers like to buy most?',
              'What are my peak visited days?',
              'Advice on keeping customers returning'
            ]
          : [
              'Take me to Send',
              'Open QR Scanner',
              'Check my balance',
              'Show transaction history'
            ]
      }
    ]);
  }, [isBusiness, userName]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Text to Speech
  const speakText = (text) => {
    if (!isSpeakingEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown characters for smoother voice
      const clean = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleVoiceUnavailable = () => {
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const explanation = !isHttps
      ? "🎙️ iPad Voice Chat Notice:\n\nApple's WebKit / Safari policy blocks the microphone and Web Speech API over plain local HTTP (http://192.168.x.x).\n\nOnce Qpay is hosted on Vercel with automatic HTTPS (https://), your iPad microphone will work seamlessly!\n\nYou can still type your questions or tap any shortcut suggestion below."
      : "🎙️ Speech recognition is not available in this browser. Please ensure Dictation is enabled in iPad Settings > General > Keyboard > Enable Dictation.";

    setMessages((prev) => [
      ...prev,
      {
        id: 'voice_notice_' + Date.now(),
        sender: 'assistant',
        text: explanation,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Process user input and generate intelligent reply
  const processQuery = (rawText) => {
    const text = rawText.toLowerCase().trim();

    // ----------------------------------------------------
    // INDIVIDUAL ACCOUNT LOGIC
    // ----------------------------------------------------
    if (!isBusiness) {
      // Navigation: Send
      if (text.includes('send') || text.includes('transfer') || text.includes('withdraw') || text.includes('bank')) {
        onNavigate && onNavigate('send');
        return {
          reply: `Taking you to the Send page right now. You can transfer money from your Qpay balance directly into your locked permanent bank account.`,
          action: 'send'
        };
      }

      // Navigation: Scanner
      if (text.includes('scan') || text.includes('camera') || text.includes('pay merchant')) {
        onNavigate && onNavigate('scanner');
        return {
          reply: `Opening the Scan to Pay camera. Hold a merchant or friend's QR code completely inside the frame to pay instantly!`,
          action: 'scanner'
        };
      }

      // Navigation: Receive
      if (text.includes('receive') || text.includes('my qr') || text.includes('show qr') || text.includes('request')) {
        onNavigate && onNavigate('receive');
        return {
          reply: `Opening your Receive QR code. You can set an exact embedded amount or display your collisions-free @tag to collect payments.`,
          action: 'receive'
        };
      }

      // Navigation: Transaction History
      if (text.includes('transaction') || text.includes('history') || text.includes('statement') || text.includes('inflow') || text.includes('outflow')) {
        onNavigate && onNavigate('transactions');
        return {
          reply: `Opening your Transaction History. You can filter by any month to review all completed QR payments and withdrawals.`,
          action: 'transactions'
        };
      }

      // Navigation: Settings
      if (text.includes('setting') || text.includes('preference') || text.includes('camera permission')) {
        onNavigate && onNavigate('settings');
        return {
          reply: `Opening your Account Settings where you can adjust camera permissions, transaction alerts, and privacy.`,
          action: 'settings'
        };
      }

      // Navigation: Profile
      if (text.includes('profile') || text.includes('tier') || text.includes('kyc') || text.includes('verify')) {
        onOpenProfile && onOpenProfile();
        return {
          reply: `Opening your Profile & KYC verification modal. You can review your Tier limit and verify your identity.`,
          action: 'profile'
        };
      }

      // Navigation: Add money
      if (text.includes('add money') || text.includes('top up') || text.includes('deposit') || text.includes('fund')) {
        onOpenAddMoney && onOpenAddMoney();
        return {
          reply: `Opening the Add Money window. You can link a permanent payment card for instant 1-click top-ups.`,
          action: 'add_money'
        };
      }

      // Balance check
      if (text.includes('balance') || text.includes('how much') || text.includes('my money')) {
        const bal = (registeredUser?.balance || 0).toLocaleString('en-NG', {
          minimumFractionDigits: 2
        });
        return {
          reply: `Your current available Qpay balance is ₦${bal}. You can use this for instant contactless QR scan payments or withdraw to your registered bank.`,
          action: null
        };
      }

      // Default explanation
      return {
        reply: `Qpay lets you make instant contactless payments with just a simple scan—no 10-digit account numbers needed! You can ask me to "Take me to Send", "Open Scanner", "Show Transactions", or "Check my balance".`,
        action: null
      };
    }

    // ----------------------------------------------------
    // BUSINESS ACCOUNT CRM LOGIC
    // ----------------------------------------------------
    const analytics = getBusinessCustomerAnalytics();

    // 1. Most returning customers query
    if (
      text.includes('returning') ||
      text.includes('loyal') ||
      text.includes('repeat') ||
      text.includes('top customer') ||
      text.includes('most visit')
    ) {
      if (analytics.rankedCustomers.length === 0) {
        return {
          reply: `You don't have recorded customer payments yet. Once customers scan your Qpay merchant QR code, I will automatically rank your top returning regulars here!`,
          action: null
        };
      }

      const top3 = analytics.rankedCustomers.slice(0, 3);
      const topList = top3
        .map(
          (c, idx) =>
            `${idx + 1}. **${c.name}** (${c.tag}) — **${c.visitCount} visits** (x${c.visitCount} Returning Tag), ₦${c.totalSpent.toLocaleString('en-NG')} total spend.`
        )
        .join('\n');

      return {
        reply: `Here are your most patronizing returning customers:\n\n${topList}\n\n💡 **Tip:** Your #1 customer is **${top3[0].name}**! They have patronized your business ${top3[0].visitCount} times. A small token of appreciation or loyalty discount keeps them coming back.`,
        action: null
      };
    }

    // 2. What they like to purchase most
    if (
      text.includes('habit') ||
      text.includes('like to buy') ||
      text.includes('favorite') ||
      text.includes('popular item') ||
      text.includes('item') ||
      text.includes('food') ||
      text.includes('product')
    ) {
      if (analytics.topItems.length === 0) {
        return {
          reply: `No item data found yet. Generate itemized bills in your Sales tab so I can track exact customer purchase habits!`,
          action: null
        };
      }

      const topItemsStr = analytics.topItems
        .slice(0, 4)
        .map((it, idx) => `${idx + 1}. **${it.name}** (${it.count} orders)`)
        .join('\n');

      return {
        reply: `Based on your customer order records, here are the top favorite items customers purchase most:\n\n${topItemsStr}\n\n💡 **Insight:** Ensure you always have adequate stock of **${analytics.topItems[0].name}** as it drives the highest repeat orders!`,
        action: null
      };
    }

    // 3. Peak days and visit times
    if (
      text.includes('day') ||
      text.includes('time') ||
      text.includes('when') ||
      text.includes('peak') ||
      text.includes('busy') ||
      text.includes('schedule')
    ) {
      const topDay = analytics.topDays[0]?.day || 'Friday & Saturday';
      return {
        reply: `📅 **Peak Patronage Days & Times:**\n\n- **Busiest Day:** **${topDay}** is your highest traffic period.\n- **Peak Hours:** Evening rush (**5:00 PM – 8:30 PM**) and afternoon lunch (**12:30 PM – 2:30 PM**).\n- **Monthly Cadence:** Purchases surge during month-end payday weekends and mid-month salary dates.\n\n💡 **Recommendation:** Schedule extra counter staff and pre-prep your best-selling items before 5:00 PM on ${topDay}!`,
        action: null
      };
    }

    // 4. Advice to keep customers returning
    if (
      text.includes('advice') ||
      text.includes('retain') ||
      text.includes('keep them') ||
      text.includes('grow') ||
      text.includes('tip') ||
      text.includes('strategy')
    ) {
      const topCust = analytics.rankedCustomers[0]?.name || 'your regular customers';
      const favItem = analytics.topItems[0]?.name || 'their favorite items';

      return {
        reply: `🎯 **Actionable Advice to Maximize Customer Retention:**\n\n1. **Personalized Recognition:** Acknowledge repeat buyers by name when their x2, x3, or x4 Returning Tag pops up at checkout. They feel valued.\n2. **Targeted Loyalty Offers:** Offer a periodic perk on ${favItem} to top customers like **${topCust}**.\n3. **Frictionless QR Checkout:** Ensure your Qpay QR terminal is prominently displayed on the counter so customers never have to wait for manual bank alert confirmations.\n4. **Pre-stock Before Peak Hours:** Ensure high inventory of fast-moving items before Friday evening rush.`,
        action: null
      };
    }

    // 5. Business Navigation helpers
    if (text.includes('sales') || text.includes('inventory') || text.includes('item for sale')) {
      onNavigate && onNavigate('inventory');
      return {
        reply: `Switching to your Sales & Items tab where you can ring up products and manage inventory.`,
        action: 'inventory'
      };
    }

    if (text.includes('leaderboard') || text.includes('crm') || text.includes('relation')) {
      onNavigate && onNavigate('leaderboard');
      return {
        reply: `Opening your Customer Leaderboard tab. You can inspect complete profiles, lifetime spend, and patronage schedules for each buyer.`,
        action: 'leaderboard'
      };
    }

    if (text.includes('payment') || text.includes('bill') || text.includes('receipt')) {
      onNavigate && onNavigate('customer_payments');
      return {
        reply: `Opening Customer Payments tab. You can monitor incoming payments, print thermal receipts, and filter settled bills.`,
        action: 'customer_payments'
      };
    }

    // General fallback
    return {
      reply: `As your Qpay Business AI Assistant, I can help you monitor customer purchase habits, review your most loyal returning customers, or navigate between Receive, Sales, Customer Payments, and the Leaderboard. What would you like to explore?`,
      action: null
    };
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputVal;
    if (!query.trim()) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    setTimeout(() => {
      const outcome = processQuery(query);
      const assistantMsg = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: outcome.reply,
        action: outcome.action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(outcome.reply);
    }, 450);
  };

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* 1. FLOATING "HI" POP MESSAGE ON WELCOME DASHBOARD    */}
      {/* ---------------------------------------------------- */}
      {!isOpen && (
        <div className="fixed bottom-20 right-6 sm:bottom-22 sm:right-12 z-40 flex flex-col items-end gap-2.5 select-none">
          {/* Proactive Pop "Hi" Message Bubble */}
          {!hasDismissedPop && (
            <div
              onClick={() => {
                setIsOpen(true);
                setHasDismissedPop(true);
              }}
              className="relative bg-white text-slate-800 px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/90 flex items-center gap-2 cursor-pointer hover:shadow-xl transition-all animate-bounce"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHasDismissedPop(true);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                title="Dismiss"
              >
                <X className="w-2.5 h-2.5" />
              </button>

              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                Hi {userName}! 👋
              </span>
            </div>
          )}

          {/* Floating Trigger Button: Minimal circle showing ONLY the star icon already there */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setHasDismissedPop(true);
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
            title="Qpay AI Assistant"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
            </div>
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. FULL EXPANDED CHATBOX DRAWER (ZENDESK/KORA STYLE)  */}
      {/* ---------------------------------------------------- */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[560px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-scaleUp">
          {/* Header (Matching Blue/Indigo Kora & Qpay Assistant Banner) */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight leading-tight">
                  {isBusiness ? 'Qpay Merchant AI' : 'Qpay Assistant'}
                </h3>
                <p className="text-[11px] text-indigo-100 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online • Voice &amp; Smart CRM Enabled</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white">
              {/* Voice TTS Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isSpeakingEnabled;
                  setIsSpeakingEnabled(next);
                  if (!next && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer"
                title={isSpeakingEnabled ? 'Mute voice replies' : 'Enable voice replies'}
              >
                {isSpeakingEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <VolumeX className="w-4 h-4 text-white/60" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtitle Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {isBusiness
                ? 'Ask about returning customers, purchase habits, or peak times.'
                : 'Ask me to navigate, check balance, or guide you through Qpay.'}
            </span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#F8FAFD]/60">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isAssistant ? 'items-start' : 'items-end'
                  } space-y-1.5 animate-fadeIn`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                      isAssistant
                        ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                        : 'bg-indigo-600 text-white rounded-br-xs shadow-sm font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>

                  <span className="text-[10px] text-slate-400 px-1">
                    {msg.time}
                  </span>

                  {/* Quick Suggestion Chips */}
                  {isAssistant && msg.suggestions && (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-[95%]">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSendMessage(suggestion)}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-[11px] font-medium rounded-full transition shadow-xs cursor-pointer text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Listening Active Wave Bar */}
          {isListening && (
            <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-700 animate-pulse flex-shrink-0">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600 animate-bounce" />
                <span className="font-semibold">Listening to your voice... Speak now!</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
            {/* Mic Button */}
            <button
              type="button"
              onClick={recognitionSupported ? toggleListening : handleVoiceUnavailable}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex-shrink-0 ${
                isListening
                  ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                  : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600'
              }`}
              title={
                !recognitionSupported
                  ? 'Voice recognition on mobile Safari requires HTTPS'
                  : isListening
                  ? 'Stop listening'
                  : 'Start voice chat'
              }
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={
                isBusiness
                  ? 'Ask about customer habits or peak days...'
                  : 'Ask to navigate or check balance...'
              }
              className="flex-1 bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition cursor-pointer flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
