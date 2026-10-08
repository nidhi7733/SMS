import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Plus,
  Search,
  ShoppingCart,
  Send,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  Calculator,
  Trash2,
  Layers,
  Archive,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  InventoryPurchase,
  InventoryIssue,
  FixedAsset,
  StockLedgerReportItem,
} from '@sms/shared';

export const InventoryManagement: React.FC = () => {
  const { language, formatNumber } = useLanguage();
  const isNp = language === 'np';
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'items' | 'purchases' | 'issues' | 'assets' | 'stock_ledger'>('items');

  // Data states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [issues, setIssues] = useState<InventoryIssue[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDepreciationConfirmOpen, setIsDepreciationConfirmOpen] = useState(false);

  // New Item State
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemNameNp, setNewItemNameNp] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState('');
  const [newItemType, setNewItemType] = useState<'CONSUMABLE' | 'NON_CONSUMABLE'>('CONSUMABLE');
  const [newItemUnit, setNewItemUnit] = useState('PCS');
  const [newItemReorder, setNewItemReorder] = useState(5);
  const [newItemStock, setNewItemStock] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // New Purchase State
  const [purchaseVendor, setPurchaseVendor] = useState('');
  const [purchasePan, setPurchasePan] = useState('');
  const [purchaseBillNo, setPurchaseBillNo] = useState('');
  const [purchaseDateBs, setPurchaseDateBs] = useState('2083-01-20');
  const [purchasePaymentType, setPurchasePaymentType] = useState<'CASH' | 'BANK' | 'CREDIT'>('CASH');
  const [purchaseItems, setPurchaseItems] = useState<{ itemId: string; quantity: number; unitPrice: number }[]>([
    { itemId: '', quantity: 1, unitPrice: 0 },
  ]);

  // New Issue State
  const [issueToName, setIssueToName] = useState('');
  const [issueDepartment, setIssueDepartment] = useState('प्रशासन शाखा (Administration)');
  const [issuePurpose, setIssuePurpose] = useState('');
  const [issueDateBs, setIssueDateBs] = useState('2083-01-20');
  const [issueItems, setIssueItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: '', quantity: 1 },
  ]);

  // New Asset State
  const [assetTag, setAssetTag] = useState('');
  const [assetNameEn, setAssetNameEn] = useState('');
  const [assetNameNp, setAssetNameNp] = useState('');
  const [assetItemId, setAssetItemId] = useState('');
  const [assetPurchaseDateBs, setAssetPurchaseDateBs] = useState('2083-01-20');
  const [assetCost, setAssetCost] = useState(0);
  const [assetMethod, setAssetMethod] = useState<'STRAIGHT_LINE' | 'WDV'>('STRAIGHT_LINE');
  const [assetRate, setAssetRate] = useState(20);
  const [assetLocation, setAssetLocation] = useState('कम्प्युटर ल्याब (Room 201)');

  // Auto-hide feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || localStorage.getItem('sms_token')}`,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, purchRes, issuesRes, assetsRes, ledgerRes] = await Promise.all([
        fetch('/api/inventory/items', { headers: getAuthHeaders() }),
        fetch('/api/inventory/categories', { headers: getAuthHeaders() }),
        fetch('/api/inventory/purchases', { headers: getAuthHeaders() }),
        fetch('/api/inventory/issues', { headers: getAuthHeaders() }),
        fetch('/api/inventory/assets', { headers: getAuthHeaders() }),
        fetch('/api/inventory/reports/stock-ledger', { headers: getAuthHeaders() }),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (catsRes.ok) {
        const cData = await catsRes.json();
        setCategories(cData);
        if (cData.length > 0 && !newItemCategoryId) setNewItemCategoryId(cData[0].id);
      }
      if (purchRes.ok) setPurchases(await purchRes.json());
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (ledgerRes.ok) setStockLedger(await ledgerRes.json());
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          itemCode: newItemCode,
          nameEn: newItemNameEn,
          nameNp: newItemNameNp,
          categoryId: newItemCategoryId,
          itemType: newItemType,
          unit: newItemUnit,
          reorderLevel: Number(newItemReorder) || 5,
          currentStock: Number(newItemStock) || 0,
          lastPurchasePrice: Number(newItemPrice) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error saving item');

      setFeedback({ type: 'success', message: isNp ? 'सामग्री सफलतापूर्वक दर्ता भयो!' : 'Item registered successfully!' });
      setIsItemModalOpen(false);
      setNewItemCode('');
      setNewItemNameEn('');
      setNewItemNameNp('');
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Handle Add Purchase (GRN)
  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = purchaseItems.filter((i) => i.itemId && i.quantity > 0);
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: isNp ? 'कम्तिमा एउटा सामान छान्नुहोस्।' : 'Select at least one item.' });
      return;
    }

    try {
      const res = await fetch('/api/inventory/purchases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          vendorName: purchaseVendor,
          vendorPan: purchasePan,
          billNumber: purchaseBillNo,
          purchaseDateBs,
          paymentType: purchasePaymentType,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error recording purchase');

      setFeedback({
        type: 'success',
        message: isNp
          ? `खरिद दाखिला ${data.grnNumber} दर्ता भयो र लेखामा स्वतः खरिद भौचर प्रविष्टि भयो!`
          : `GRN ${data.grnNumber} recorded with automatic accounting voucher entry!`,
      });
      setIsPurchaseModalOpen(false);
      setPurchaseVendor('');
      setPurchaseBillNo('');
      setPurchaseItems([{ itemId: '', quantity: 1, unitPrice: 0 }]);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Handle Add Issue
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = issueItems.filter((i) => i.itemId && i.quantity > 0);
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: isNp ? 'कम्तिमा एउटा सामान छान्नुहोस्।' : 'Select at least one item.' });
      return;
    }

    try {
      const res = await fetch('/api/inventory/issues', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          issuedToName: issueToName,
          department: issueDepartment,
          purpose: issuePurpose,
          issueDateBs,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error creating issue');

      setFeedback({
        type: 'success',
        message: isNp
          ? `निकासी फारम ${data.issueNumber} जारी भयो र मौज्दातबाट घटाइयो!`
          : `Stock Issue ${data.issueNumber} issued successfully!`,
      });
      setIsIssueModalOpen(false);
      setIssueToName('');
      setIssuePurpose('');
      setIssueItems([{ itemId: '', quantity: 1 }]);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Handle Add Fixed Asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/assets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assetTag,
          nameEn: assetNameEn,
          nameNp: assetNameNp,
          itemId: assetItemId || null,
          purchaseDateBs: assetPurchaseDateBs,
          originalCost: Number(assetCost) || 0,
          depreciationMethod: assetMethod,
          depreciationRate: Number(assetRate) || 20,
          location: assetLocation,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error saving asset');

      setFeedback({
        type: 'success',
        message: isNp ? 'स्थिर सम्पत्ति दर्ता किताबमा सुरक्षित भयो!' : 'Asset registered successfully!',
      });
      setIsAssetModalOpen(false);
      setAssetTag('');
      setAssetNameEn('');
      setAssetNameNp('');
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Run Depreciation
  const handleRunDepreciation = async () => {
    try {
      const res = await fetch('/api/inventory/assets/depreciate', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error computing depreciation');

      setFeedback({
        type: 'success',
        message: isNp
          ? `वार्षिक ह्रासकट्टी (रू. ${formatNumber(data.totalDepreciation.toLocaleString())}) सफलतापूर्वक गणना भई लेखा भौचर ${data.voucherNumber || ''} मा सदर भयो!`
          : `Annual depreciation (NPR ${data.totalDepreciation}) calculated and posted to Journal Voucher!`,
      });
      setIsDepreciationConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Calculations for Stock Summary
  const totalItemsCount = stockLedger.length;
  const lowStockCount = stockLedger.filter((i) => i.isLowStock).length;
  const totalStockValuation = stockLedger.reduce((sum, i) => sum + (i.stockValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Boxes className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {isNp ? 'जिन्सी तथा भौतिक सम्पत्ति व्यवस्थापन' : 'Inventory & Asset Management'}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {isNp ? 'दोहोरो लेखासँग आबद्ध' : 'Accounting Integrated'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isNp
                  ? 'जिन्सी सामग्री दर्ता, खरिद दाखिला (GRN), माग तथा निकासी, स्थिर सम्पत्ति लगत र ह्रासकट्टी'
                  : 'Item Master, GRN Purchases, Stock Issues, Fixed Asset Register and Depreciation'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs sm:text-sm gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {isNp ? 'खरिद दाखिला (GRN)' : 'New GRN'}
            </button>
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm gap-2"
            >
              <Send className="w-4 h-4" />
              {isNp ? 'निकासी फारम (Issue)' : 'Issue Stock'}
            </button>
            <button
              onClick={() => setIsItemModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'सामग्री दर्ता' : 'Add Item'}
            </button>
          </div>
        </div>

        {/* Global Feedback */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 font-semibold">{isNp ? 'कुल दर्ता सामग्रीहरू' : 'Total Items'}</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{formatNumber(totalItemsCount)}</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 font-semibold">{isNp ? 'कुल जिन्सी मौज्दात मूल्यांकन' : 'Stock Valuation'}</span>
            <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              रू. {formatNumber(Math.round(totalStockValuation).toLocaleString())}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 font-semibold">{isNp ? 'पुनः खरिद अलर्ट (न्यून मौज्दात)' : 'Low Stock Alerts'}</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
              {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {formatNumber(lowStockCount)} {isNp ? 'सामग्रीहरू' : 'items'}
            </p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 overflow-x-auto space-x-1">
          {[
            { id: 'items', labelNp: 'सामग्री सूची (Item Master)', labelEn: 'Item Master', icon: Boxes },
            { id: 'purchases', labelNp: 'खरिद तथा दाखिला (GRN)', labelEn: 'Purchase GRN', icon: ShoppingCart },
            { id: 'issues', labelNp: 'माग तथा निकासी (Issues)', labelEn: 'Stock Issues', icon: Send },
            { id: 'assets', labelNp: 'स्थिर सम्पत्ति लगत (Fixed Assets)', labelEn: 'Fixed Assets Register', icon: Building2 },
            { id: 'stock_ledger', labelNp: 'जिन्सी मौज्दात प्रतिवेदन (Bin Card)', labelEn: 'Stock Ledger', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isNp ? tab.labelNp : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ITEM MASTER & CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              {isNp ? 'जिन्सी सामग्री सूची (Item Master)' : 'Inventory Items Catalog'}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={isNp ? 'सामग्री वा कोड खोज्नुहोस्...' : 'Search items...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'सामग्री कोड' : 'Item Code'}</th>
                  <th className="py-3 px-4">{isNp ? 'सामग्रीको नाम' : 'Item Name'}</th>
                  <th className="py-3 px-4">{isNp ? 'वर्गीकरण' : 'Category'}</th>
                  <th className="py-3 px-4">{isNp ? 'प्रकार' : 'Type'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'एकाइ' : 'Unit'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'हालको मौज्दात' : 'Stock'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'पुनः खरिद विन्दु' : 'Reorder Level'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'अन्तिम खरिद दर' : 'Last Rate'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'स्थिति' : 'Alert'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items
                  .filter(
                    (i) =>
                      i.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      i.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      i.nameNp.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">{item.itemCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {isNp ? item.nameNp : item.nameEn}
                        <span className="block text-xs font-normal text-slate-400">
                          {isNp ? item.nameEn : item.nameNp}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {item.category ? (isNp ? item.category.nameNp : item.category.nameEn) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            item.itemType === 'CONSUMABLE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          }`}
                        >
                          {item.itemType === 'CONSUMABLE'
                            ? isNp
                              ? 'खर्च हुने (Consumable)'
                              : 'Consumable'
                            : isNp
                            ? 'खर्च नहुने (Non-Consumable)'
                            : 'Capital'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-base text-slate-900 dark:text-white">
                        {formatNumber(item.currentStock)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatNumber(item.reorderLevel)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        रू. {formatNumber(item.lastPurchasePrice || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.currentStock <= item.reorderLevel ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            {isNp ? '⚠ खरिद आवश्यक' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {isNp ? 'पर्याप्त' : 'Adequate'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PURCHASES & GRN */}
      {/* ========================================================================= */}
      {activeTab === 'purchases' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              {isNp ? 'जिन्सी खरिद तथा दाखिला फारम (GRN Entries)' : 'Goods Receipt Notes (GRN)'}
            </h2>
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ खरिद दाखिला' : 'New Purchase GRN'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'दाखिला नं. (GRN)' : 'GRN Number'}</th>
                  <th className="py-3 px-4">{isNp ? 'साहु / आपूर्तिकर्ता' : 'Vendor'}</th>
                  <th className="py-3 px-4">{isNp ? 'बिल नम्बर' : 'Bill No'}</th>
                  <th className="py-3 px-4">{isNp ? 'दाखिला मिति' : 'Date (BS)'}</th>
                  <th className="py-3 px-4">{isNp ? 'भुक्तानी विधि' : 'Payment'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'जम्मा रकम (रू)' : 'Total Amount'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'लेखा भौचर' : 'Accounting JV'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map((p) => (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">{p.grnNumber}</td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.vendorName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.billNumber}</td>
                      <td className="py-3 px-4">{formatNumber(p.purchaseDateBs)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800">
                          {p.paymentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white text-base">
                        रू. {formatNumber(p.totalAmount.toLocaleString())}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {isNp ? '✓ स्वतः सदर' : 'AUTO POSTED'}
                        </span>
                      </td>
                    </tr>
                    {p.items && p.items.length > 0 && (
                      <tr className="bg-slate-50/40 dark:bg-slate-950/40">
                        <td colSpan={7} className="py-2 px-6">
                          <div className="border border-slate-200/80 rounded-lg overflow-hidden text-xs">
                            <table className="w-full">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                                <tr>
                                  <th className="py-1 px-3">{isNp ? 'सामग्री' : 'Item'}</th>
                                  <th className="py-1 px-3 text-center">{isNp ? 'परिमाण' : 'Qty'}</th>
                                  <th className="py-1 px-3 text-right">{isNp ? 'दर (रू)' : 'Rate'}</th>
                                  <th className="py-1 px-3 text-right">{isNp ? 'रकम (रू)' : 'Total'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.items.map((it, idx) => (
                                  <tr key={idx} className="border-t border-slate-200/50">
                                    <td className="py-1 px-3 font-medium">
                                      {it.item ? (isNp ? it.item.nameNp : it.item.nameEn) : it.itemId}
                                    </td>
                                    <td className="py-1 px-3 text-center font-mono">{formatNumber(it.quantity)}</td>
                                    <td className="py-1 px-3 text-right font-mono">{formatNumber(it.unitPrice)}</td>
                                    <td className="py-1 px-3 text-right font-mono font-bold">
                                      {formatNumber(it.totalPrice.toLocaleString())}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ISSUES & REQUISITION */}
      {/* ========================================================================= */}
      {activeTab === 'issues' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              {isNp ? 'जिन्सी माग तथा निकासी अभिलेख (Stock Issues)' : 'Stock Requisition & Issues'}
            </h2>
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ निकासी फारम' : 'New Stock Issue'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'निकासी नं.' : 'Issue No'}</th>
                  <th className="py-3 px-4">{isNp ? 'निकासी मिति' : 'Date (BS)'}</th>
                  <th className="py-3 px-4">{isNp ? 'सामग्री पाउने' : 'Issued To'}</th>
                  <th className="py-3 px-4">{isNp ? 'शाखा / विभाग' : 'Department'}</th>
                  <th className="py-3 px-4">{isNp ? 'प्रयोजन' : 'Purpose'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'स्थिति' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {issues.map((i) => (
                  <React.Fragment key={i.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{i.issueNumber}</td>
                      <td className="py-3 px-4 font-medium">{formatNumber(i.issueDateBs)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{i.issuedToName}</td>
                      <td className="py-3 px-4 text-slate-600">{i.department || '-'}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{i.purpose}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {isNp ? 'निकासी सम्पन्न' : 'ISSUED'}
                        </span>
                      </td>
                    </tr>
                    {i.items && i.items.length > 0 && (
                      <tr className="bg-slate-50/40 dark:bg-slate-950/40">
                        <td colSpan={6} className="py-2 px-6">
                          <div className="border border-slate-200/80 rounded-lg overflow-hidden text-xs">
                            <table className="w-full">
                              <thead className="bg-slate-100 text-slate-500">
                                <tr>
                                  <th className="py-1 px-3">{isNp ? 'सामग्री' : 'Item'}</th>
                                  <th className="py-1 px-3 text-center">{isNp ? 'निकासी परिमाण' : 'Issued Quantity'}</th>
                                  <th className="py-1 px-3">{isNp ? 'कैफियत' : 'Remarks'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {i.items.map((it, idx) => (
                                  <tr key={idx} className="border-t border-slate-200/50">
                                    <td className="py-1 px-3 font-medium">
                                      {it.item ? (isNp ? it.item.nameNp : it.item.nameEn) : it.itemId}
                                    </td>
                                    <td className="py-1 px-3 text-center font-mono font-bold text-indigo-600">
                                      {formatNumber(it.quantity)} {it.item?.unit || ''}
                                    </td>
                                    <td className="py-1 px-3 text-slate-500">{it.remarks || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FIXED ASSET REGISTER & DEPRECIATION */}
      {/* ========================================================================= */}
      {activeTab === 'assets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {isNp ? 'स्थिर सम्पत्ति दर्ता तथा ह्रासकट्टी किताब' : 'Fixed Asset Register'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp ? 'भौतिक स्थिर सम्पत्तिहरूको लगत, ह्रासकट्टी र खुद बुक भ्यालु' : 'Capital assets and depreciation valuation'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDepreciationConfirmOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-sm gap-2"
              >
                <Calculator className="w-4 h-4" />
                {isNp ? 'वार्षिक ह्रासकट्टी गणना गर्नुहोस्' : 'Run Annual Depreciation'}
              </button>
              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm gap-2"
              >
                <Plus className="w-4 h-4" />
                {isNp ? 'नयाँ सम्पत्ति दर्ता' : 'Register Asset'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'सम्पत्ति ट्याग' : 'Asset Tag'}</th>
                  <th className="py-3 px-4">{isNp ? 'सम्पत्तिको नाम' : 'Asset Name'}</th>
                  <th className="py-3 px-4">{isNp ? 'स्थान (Location)' : 'Location'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'खरिद मूल्य (रू)' : 'Original Cost'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'विधि / दर' : 'Method / Rate'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'कुल ह्रासकट्टी (रू)' : 'Accum. Dep.'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'हालको खुद मूल्य (रू)' : 'Book Value'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'अवस्था' : 'Condition'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{a.assetTag}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {isNp ? a.nameNp : a.nameEn}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{a.location}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      रू. {formatNumber(a.originalCost.toLocaleString())}
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <span className="font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded">
                        {a.depreciationMethod === 'STRAIGHT_LINE' ? 'SLM' : 'WDV'} ({formatNumber(a.depreciationRate)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      रू. {formatNumber(a.accumulatedDepreciation.toLocaleString())}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-base">
                      रू. {formatNumber(a.currentBookValue.toLocaleString())}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {a.conditionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STOCK LEDGER & BIN CARD */}
      {/* ========================================================================= */}
      {activeTab === 'stock_ledger' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                {isNp ? 'जिन्सी मौज्दात खाता (Stock Ledger / Bin Card Report)' : 'Stock Ledger & Valuation'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp ? 'सामग्रीगत मौज्दात, दर र कुल स्टक मूल्यांकन प्रतिवेदन' : 'Stock status with financial valuation'}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 text-sm gap-2"
            >
              <Printer className="w-4 h-4" />
              {isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print Ledger'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'सामग्री कोड' : 'Item Code'}</th>
                  <th className="py-3 px-4">{isNp ? 'सामग्रीको विवरण' : 'Description'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'एकाइ' : 'Unit'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'हालको मौज्दात' : 'Stock Qty'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'खरिद दर (रू)' : 'Unit Rate'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'कुल मौज्दात मूल्य (रू)' : 'Stock Valuation'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'अवस्था' : 'Alert'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockLedger.map((item) => (
                  <tr key={item.itemId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-amber-600">{item.itemCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {isNp ? item.nameNp : item.nameEn}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{item.unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-base text-slate-900 dark:text-white">
                      {formatNumber(item.currentStock)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      रू. {formatNumber(item.lastPurchasePrice.toLocaleString())}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-base">
                      रू. {formatNumber(item.stockValue.toLocaleString())}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {isNp ? '⚠ खरिद आवश्यक' : 'Low Stock'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {isNp ? 'पर्याप्त' : 'In Stock'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">
                    {isNp ? 'कुल जिन्सी मूल्यांकन (Total Stock Valuation):' : 'Total Stock Valuation:'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-lg text-emerald-600">
                    रू. {formatNumber(Math.round(totalStockValuation).toLocaleString())}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW ITEM */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                {isNp ? 'नयाँ जिन्सी सामग्री दर्ता' : 'Register New Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सामग्री कोड' : 'Code'}</label>
                  <input
                    type="text"
                    placeholder="उदा: ITM-STN-010"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'वर्गीकरण (Category)' : 'Category'}</label>
                  <select
                    value={newItemCategoryId}
                    onChange={(e) => setNewItemCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isNp ? c.nameNp : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'सामग्रीको नाम (नेपाली)' : 'Name (Nepali)'}</label>
                <input
                  type="text"
                  placeholder="उदा: ह्वाइटबोर्ड मार्कर"
                  value={newItemNameNp}
                  onChange={(e) => setNewItemNameNp(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'सामग्रीको नाम (English)' : 'Name (English)'}</label>
                <input
                  type="text"
                  placeholder="e.g. Whiteboard Marker"
                  value={newItemNameEn}
                  onChange={(e) => setNewItemNameEn(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सामग्री प्रकार' : 'Type'}</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="CONSUMABLE">{isNp ? 'खर्च हुने' : 'Consumable'}</option>
                    <option value="NON_CONSUMABLE">{isNp ? 'खर्च नहुने' : 'Non-Consumable'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'मापन एकाइ' : 'Unit'}</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="PCS, PKT, SET"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'पुनः खरिद विन्दु' : 'Reorder Alert'}</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemReorder}
                    onChange={(e) => setNewItemReorder(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium">
                  {isNp ? 'दर्ता गर्नुहोस्' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PURCHASE GRN */}
      {/* ========================================================================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  {isNp ? 'नयाँ जिन्सी खरिद तथा दाखिला (New Purchase GRN)' : 'New Goods Receipt Note'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isNp ? 'दाखिला हुनासाथ मौज्दात थपिनेछ र लेखामा स्वचालित खरिद भौचर बन्नेछ' : 'Automatically creates accounting voucher & updates stock'}
                </p>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'साहु / आपूर्तिकर्ता (Vendor)' : 'Vendor Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: हिमालयन स्टेसनरी सप्लायर्स"
                    value={purchaseVendor}
                    onChange={(e) => setPurchaseVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'बिल / भ्याट नम्बर' : 'Bill Number'}</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: INV-9842"
                    value={purchaseBillNo}
                    onChange={(e) => setPurchaseBillNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'दाखिला मिति (वि.सं.)' : 'Purchase Date (BS)'}</label>
                  <input
                    type="text"
                    required
                    value={purchaseDateBs}
                    onChange={(e) => setPurchaseDateBs(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'भुक्तानी विधि' : 'Payment Type'}</label>
                <div className="flex gap-4">
                  {[
                    { id: 'CASH', labelNp: 'नगद (Cash)', labelEn: 'Cash' },
                    { id: 'BANK', labelNp: 'बैंक खाता (Bank)', labelEn: 'Bank' },
                    { id: 'CREDIT', labelNp: 'उधारो (Vendor Payable)', labelEn: 'Credit' },
                  ].map((mode) => (
                    <label key={mode.id} className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="payType"
                        value={mode.id}
                        checked={purchasePaymentType === mode.id}
                        onChange={() => setPurchasePaymentType(mode.id as any)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isNp ? mode.labelNp : mode.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Items in Purchase */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isNp ? 'खरिद गरिएका सामानहरू' : 'Purchase Items'}
                </span>
                {purchaseItems.map((pIt, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <select
                        value={pIt.itemId}
                        onChange={(e) => {
                          const updated = [...purchaseItems];
                          updated[idx].itemId = e.target.value;
                          const found = items.find((i) => i.id === e.target.value);
                          if (found) updated[idx].unitPrice = found.lastPurchasePrice || 0;
                          setPurchaseItems(updated);
                        }}
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="">-- {isNp ? 'सामग्री छान्नुहोस्' : 'Select Item'} --</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.itemCode} - {isNp ? it.nameNp : it.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={pIt.quantity}
                        onChange={(e) => {
                          const updated = [...purchaseItems];
                          updated[idx].quantity = parseFloat(e.target.value) || 1;
                          setPurchaseItems(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={pIt.unitPrice}
                        onChange={(e) => {
                          const updated = [...purchaseItems];
                          updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setPurchaseItems(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {purchaseItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPurchaseItems([...purchaseItems, { itemId: '', quantity: 1, unitPrice: 0 }])}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isNp ? '+ थप सामान' : '+ Add Item'}
                </button>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-emerald-50 rounded-xl flex justify-between items-center text-sm font-bold text-emerald-900">
                <span>{isNp ? 'कुल खरिद रकम:' : 'Total Purchase Amount:'}</span>
                <span className="font-mono text-lg">
                  रू.{' '}
                  {formatNumber(
                    purchaseItems
                      .reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0)
                      .toLocaleString()
                  )}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-medium">
                  {isNp ? 'दाखिला सदर गर्नुहोस्' : 'Post GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW ISSUE */}
      {/* ========================================================================= */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  {isNp ? 'नयाँ जिन्सी माग तथा निकासी फारम' : 'New Stock Requisition & Issue'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isNp ? 'निकासी हुनासाथ मौज्दात घट्नेछ र खर्च जनाइनेछ' : 'Deducts stock and records expense'}
                </p>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सामग्री पाउने शिक्षक/कर्मचारी' : 'Issued To'}</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: रमेश शर्मा (शिक्षक)"
                    value={issueToName}
                    onChange={(e) => setIssueToName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'शाखा वा विभाग' : 'Department'}</label>
                  <input
                    type="text"
                    value={issueDepartment}
                    onChange={(e) => setIssueDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'निकासी मिति (वि.सं.)' : 'Issue Date (BS)'}</label>
                  <input
                    type="text"
                    required
                    value={issueDateBs}
                    onChange={(e) => setIssueDateBs(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'निकासीको प्रयोजन' : 'Purpose'}</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: प्रथम त्रैमासिक परीक्षा कापी तथा मार्कर प्रयोजन"
                  value={issuePurpose}
                  onChange={(e) => setIssuePurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Items in Issue */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isNp ? 'निकासी गरिने सामानहरू' : 'Items to Issue'}
                </span>
                {issueItems.map((it, idx) => {
                  const selectedItem = items.find((i) => i.id === it.itemId);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-8">
                        <select
                          value={it.itemId}
                          onChange={(e) => {
                            const updated = [...issueItems];
                            updated[idx].itemId = e.target.value;
                            setIssueItems(updated);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="">-- {isNp ? 'सामग्री छान्नुहोस्' : 'Select Item'} --</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.itemCode} - {isNp ? i.nameNp : i.nameEn} (मौज्दात: {i.currentStock} {i.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          max={selectedItem ? selectedItem.currentStock : undefined}
                          placeholder="परिमाण"
                          value={it.quantity}
                          onChange={(e) => {
                            const updated = [...issueItems];
                            updated[idx].quantity = parseFloat(e.target.value) || 1;
                            setIssueItems(updated);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-center"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {issueItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIssueItems(issueItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIssueItems([...issueItems, { itemId: '', quantity: 1 }])}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isNp ? '+ थप सामान' : '+ Add Item'}
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium">
                  {isNp ? 'निकासी जारी गर्नुहोस्' : 'Issue Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW ASSET */}
      {/* ========================================================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {isNp ? 'नयाँ स्थिर सम्पत्ति दर्ता' : 'Register Fixed Asset'}
              </h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सम्पत्ति ट्याग' : 'Asset Tag'}</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: AST-IT-005"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'खरिद मूल्य (रू)' : 'Original Cost'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assetCost || ''}
                    onChange={(e) => setAssetCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'सम्पत्तिको नाम (नेपाली)' : 'Name (Nepali)'}</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: ल्याब प्रोजेक्टर"
                  value={assetNameNp}
                  onChange={(e) => setAssetNameNp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'सम्पत्तिको नाम (English)' : 'Name (English)'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab Projector"
                  value={assetNameEn}
                  onChange={(e) => setAssetNameEn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'ह्रासकट्टी विधि' : 'Depreciation Method'}</label>
                  <select
                    value={assetMethod}
                    onChange={(e) => setAssetMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="STRAIGHT_LINE">सरल विधि (Straight Line)</option>
                    <option value="WDV">घट्दो मौज्दात (WDV)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'वार्षिक ह्रासकट्टी दर (%)' : 'Rate (%)'}</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={assetRate}
                    onChange={(e) => setAssetRate(parseFloat(e.target.value) || 20)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'राखिएको कोठा / शाखा (Location)' : 'Location'}</label>
                <input
                  type="text"
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium">
                  {isNp ? 'दर्ता गर्नुहोस्' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEPRECIATION CONFIRMATION */}
      {/* ========================================================================= */}
      {isDepreciationConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-purple-600">
              <Calculator className="w-8 h-8" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isNp ? 'वार्षिक ह्रासकट्टी गणना तथा लेखा प्रविष्टि' : 'Run Annual Depreciation'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isNp
                ? 'के तपाईं विद्यालयका सम्पूर्ण चालु स्थिर सम्पत्तिहरूमा तोकिएको विधि (SLM/WDV) अनुसार ह्रासकट्टी गणना गरी लेखा प्रणालीमा स्वतः भौचर प्रविष्टि गर्न चाहनुहुन्छ?'
                : 'Are you sure you want to run annual depreciation across all active fixed assets and post the depreciation journal voucher?'}
            </p>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsDepreciationConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRunDepreciation}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold"
              >
                {isNp ? 'ह्रासकट्टी सदर गर्नुहोस्' : 'Execute Depreciation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
