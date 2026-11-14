import React, { useState } from 'react';
import { Plus, Package, Trash2, Search, CheckCircle2, AlertCircle, TrendingUp, Layers, Tag, Lock, Unlock, KeyRound, ShieldCheck, X, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const BUSINESS_CATEGORIES = [
  'Food',
  'Shoe',
  'Drink',
  'Pharmaceuticals',
  'Skincare',
  'Toiletries',
  'Stationaries',
  'Clothes',
  'Electronics',
  'Groceries',
  'Other'
];

export default function BusinessInventoryTab({ businessUser }) {
  // Saved inventory items stored in localStorage
  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('qpay_business_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Default initial items with realistic categories
    return [
      { id: 'item_1', category: 'Food', name: 'Smoky Jollof Rice & Dodo', qty: 40, price: 3500 },
      { id: 'item_2', category: 'Food', name: 'Catfish Pepper Soup Platter', qty: 25, price: 6000 },
      { id: 'item_3', category: 'Drink', name: 'Chilled Chapman with Bitters', qty: 50, price: 1500 },
      { id: 'item_4', category: 'Clothes', name: 'Vintage Ankara Unisex Shirt', qty: 15, price: 9500 },
      { id: 'item_5', category: 'Shoe', name: 'Handcrafted Leather Loafers', qty: 10, price: 18500 }
    ];
  });

  // 4-Digit Manager PIN (Default '1234')
  const [managerPin, setManagerPin] = useState(() => {
    return localStorage.getItem('qpay_inventory_pin') || '1234';
  });

  // Selected category filter tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New item form state
  const [newItemCategory, setNewItemCategory] = useState('Food');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 4-DIGIT PIN PROMPT & STOCK EDIT MODAL STATE
  const [itemToEdit, setItemToEdit] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState(0);
  const [successToast, setSuccessToast] = useState('');

  // Save new item to inventory
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;

    const newItem = {
      id: 'item_' + Date.now(),
      category: newItemCategory || 'Other',
      name: newItemName.trim(),
      qty: parseInt(newItemQty) || 1,
      price: parseFloat(newItemPrice) || 0
    };

    const updated = [newItem, ...inventory];
    setInventory(updated);
    localStorage.setItem('qpay_business_inventory', JSON.stringify(updated));

    setNewItemName('');
    setNewItemQty('');
    setNewItemPrice('');
    setShowAddForm(false);
  };

  // Open the 4-digit PIN prompt to unlock stock editing for an item
  const handleOpenStockEditor = (item) => {
    setItemToEdit(item);
    setEditQtyValue(item.qty);
    setPinInput('');
    setPinError('');
    setIsPinUnlocked(false);
  };

  // Handle PIN Submission
  const handleVerifyPin = (e) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === managerPin) {
      setIsPinUnlocked(true);
      setPinError('');
    } else {
      setPinError('Incorrect 4-digit PIN. Only authorized managers can edit inventory quantities to prevent stock tampering.');
      setPinInput('');
    }
  };

  // Keypad press handler
  const handleKeypadPress = (val) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      setPinError('');
      if (nextPin.length === 4) {
        if (nextPin === managerPin) {
          setIsPinUnlocked(true);
          setPinError('');
        } else {
          setPinError('Incorrect 4-digit PIN. Only authorized managers can edit inventory quantities.');
          setPinInput('');
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError('');
  };

  // Save modified quantity after PIN verification
  const handleSaveQuantity = () => {
    if (!itemToEdit) return;

    const updatedQty = Math.max(0, parseInt(editQtyValue) || 0);
    const updated = inventory.map(it => {
      if (it.id === itemToEdit.id) {
        return { ...it, qty: updatedQty };
      }
      return it;
    });

    setInventory(updated);
    localStorage.setItem('qpay_business_inventory', JSON.stringify(updated));

    setSuccessToast(`Stock for "${itemToEdit.name}" updated to ${updatedQty} units by Manager.`);
    setTimeout(() => setSuccessToast(''), 3500);

    setItemToEdit(null);
    setIsPinUnlocked(false);
    setPinInput('');

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {}
  };

  // Delete item from inventory (also requires PIN protection)
  const handleDeleteItem = (id) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    // Quick confirm
    if (window.confirm(`Are you sure you want to remove "${item.name}" from the catalog?`)) {
      const updated = inventory.filter(item => item.id !== id);
      setInventory(updated);
      localStorage.setItem('qpay_business_inventory', JSON.stringify(updated));
    }
  };

  // Filtered inventory list by search and category
  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Aggregate stats
  const totalStockUnits = inventory.reduce((acc, curr) => acc + (curr.qty || 0), 0);
  const totalCatalogValue = inventory.reduce((acc, curr) => acc + ((curr.qty || 0) * (curr.price || 0)), 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12 select-none">
      
      {/* Success Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              INVENTORY
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-1.5">
            Sales
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your products, category, stock and unit prices. Stock quantities are tamper-proof and require a 4-digit manager PIN to edit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'Add Item'}</span>
        </button>
      </div>

      {/* Aggregate Metrics Bar - 3 Columns Web */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Package className="w-4 h-4 text-indigo-500" />
            <span>Items Cataloged</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-sans">
            {inventory.length} <span className="text-xs font-normal text-slate-400">products</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Total Units in Stock</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-sans flex items-center gap-2">
            <span>{totalStockUnits.toLocaleString()}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" title="Protected stock count" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Total Inventory Value</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-sans text-emerald-700">
            ₦{totalCatalogValue.toLocaleString('en-NG')}
          </div>
        </div>
      </div>

      {/* Add New Item Form with Category Selector */}
      {showAddForm && (
        <form onSubmit={handleSaveItem} className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-md space-y-4 animate-scaleUp">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Add New Item Under Category</span>
            </h3>
            <span className="text-xs text-slate-400">All fields required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 transition"
                >
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Leather Loafers"
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Qty in Stock */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Qty in Stock
              </label>
              <input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="e.g. 20"
                min="0"
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Price per Unit */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Price per Unit (₦)
              </label>
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="e.g. 4500"
                min="1"
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Save Item to Catalog
            </button>
          </div>
        </form>
      )}

      {/* Inventory Catalog List */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        
        {/* Header with Category Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Category Horizontal Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full sm:max-w-md pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategoryFilter === 'All'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({inventory.length})
            </button>
            {BUSINESS_CATEGORIES.map(cat => {
              const count = inventory.filter(i => i.category === cat).length;
              if (count === 0 && selectedCategoryFilter !== cat) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name..."
              className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="divide-y divide-slate-100 pt-1">
          {filteredInventory.map(item => (
            <div
              key={item.id}
              className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-3 rounded-2xl transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100">
                    {item.category || 'General'}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                  {item.qty <= 5 && item.qty > 0 && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-md border border-amber-200">
                      Low Stock
                    </span>
                  )}
                  {item.qty === 0 && (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-semibold rounded-md border border-rose-200">
                      Out of Stock
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>Unit Price: <strong className="text-indigo-600 font-semibold">₦{item.price.toLocaleString('en-NG')}</strong></span>
                  <span>•</span>
                  <span>Total Value: <strong>₦{(item.price * item.qty).toLocaleString('en-NG')}</strong></span>
                </div>
              </div>

              {/* STOCK QUANTITY - LOCKED AGAINST WORKER TAMPERING */}
              <div className="flex items-center gap-2 flex-shrink-0">
                
                {/* Locked Quantity Badge with Manager Edit Button */}
                <div 
                  onClick={() => handleOpenStockEditor(item)}
                  title="Stock locked against worker tampering. Click to enter 4-digit manager PIN to edit"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFBFD] hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl cursor-pointer transition group shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center transition">
                    <Lock className="w-3 h-3" />
                  </div>
                  
                  <div className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-900">
                    {item.qty} units
                  </div>

                  <span className="ml-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-lg transition">
                    Edit
                  </span>
                </div>

                {/* Delete Item */}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-400">
              No items found in {selectedCategoryFilter === 'All' ? 'catalog' : `"${selectedCategoryFilter}"`}. Click "Add Item for Sale" above to add products.
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4-DIGIT PIN SECURITY MODAL TO UNLOCK & EDIT QUANTITY */}
      {/* ======================================================== */}
      {itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn select-none">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
            
            <button
              onClick={() => {
                setItemToEdit(null);
                setIsPinUnlocked(false);
                setPinInput('');
              }}
              type="button"
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!isPinUnlocked ? (
              /* SCREEN 1: 4-DIGIT PIN PROMPT */
              <div className="space-y-4">
                
                {/* Security Icon */}
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl mx-auto flex items-center justify-center text-indigo-600">
                  <KeyRound className="w-7 h-7 stroke-[1.8]" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mb-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Worker Tamper Protection</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Enter 4-Digit Manager PIN
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Stock quantities are locked so workers cannot tamper with inventory. Enter your 4-digit manager PIN to edit <strong>{itemToEdit.name}</strong>.
                  </p>
                </div>

                {/* 4 PIN Indicators */}
                <div className="flex justify-center items-center gap-3 py-2">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = pinInput.length > index;
                    return (
                      <div
                        key={index}
                        className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                          isFilled
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105'
                            : 'bg-[#F8FAFD] border-2 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isFilled ? '●' : ''}
                      </div>
                    );
                  })}
                </div>

                {/* PIN Error Alert */}
                {pinError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 flex items-center gap-1.5 text-left animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit.toString())}
                      className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-indigo-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-400 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-indigo-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                {/* Helper text showing default PIN */}
                <p className="text-[11px] text-slate-400 pt-1">
                  Default Manager Security PIN: <strong className="text-indigo-600 font-mono">1234</strong>
                </p>

              </div>
            ) : (
              /* SCREEN 2: AUTHORIZED MANAGER QUANTITY EDITOR */
              <div className="space-y-4 text-left animate-scaleUp">
                
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 mb-2">
                    <Unlock className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    Manager Access Granted
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Edit Stock: {itemToEdit.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Category: {itemToEdit.category} • Current: {itemToEdit.qty} units
                  </p>
                </div>

                {/* Quantity Control Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Quantity in Stock
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditQtyValue(prev => Math.max(0, prev - 1))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 font-bold text-base text-slate-800 flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    
                    <input
                      type="number"
                      min="0"
                      value={editQtyValue}
                      onChange={(e) => setEditQtyValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-[#F8FAFD] border-2 border-indigo-200 rounded-xl py-2 px-3 text-center text-xl font-black text-slate-900 focus:outline-none focus:border-indigo-600"
                    />

                    <button
                      type="button"
                      onClick={() => setEditQtyValue(prev => prev + 1)}
                      className="w-11 h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 font-bold text-base text-indigo-700 flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {[+5, +10, +25, +50].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setEditQtyValue(prev => prev + inc)}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition cursor-pointer"
                    >
                      {inc}
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItemToEdit(null);
                      setIsPinUnlocked(false);
                    }}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQuantity}
                    className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Lock Stock</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
