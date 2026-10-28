import React, { useState } from 'react';
import {
  StoreProfile,
  TestCase,
  CountryCode,
  CurrencyCode,
  RiskLevel,
} from '../types';
import {
  Store,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Sparkles,
  Layers,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  BadgeAlert,
  ArrowRight,
} from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { ApiService } from '../services/api';

interface Props {
  stores: StoreProfile[];
  onSaveStore: (store: StoreProfile) => void;
  onDeleteStore: (id: string) => void;
  getTestCasesForStore: (storeId: string) => TestCase[];
  onSaveTestCase: (testCase: TestCase) => void;
  onDeleteTestCase: (storeId: string, testCaseId: string) => void;
  onStartTestRunWithStore: (storeId: string) => void;
  onSetToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StoresView: React.FC<Props> = ({
  stores,
  onSaveStore,
  onDeleteStore,
  getTestCasesForStore,
  onSaveTestCase,
  onDeleteTestCase,
  onStartTestRunWithStore,
  onSetToast,
}) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    stores[0]?.id || ''
  );
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<StoreProfile> | null>(
    null
  );
  const [activePolicyTab, setActivePolicyTab] = useState<
    | 'shipping'
    | 'returns'
    | 'products'
    | 'discounts'
    | 'warranty'
    | 'escalation'
    | 'additional'
  >('shipping');

  // Test Case generation state
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [genCount, setGenCount] = useState<number>(10);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [expandedPolicyPreview, setExpandedPolicyPreview] = useState(false);

  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];
  const testCases = currentStore ? getTestCasesForStore(currentStore.id) : [];

  // Helper to open create modal
  const handleOpenCreateStore = () => {
    setEditingStore({
      id: `store-${Date.now()}`,
      name: '',
      url: '',
      country: 'United States',
      currency: 'USD',
      shippingPolicy: '',
      returnPolicy: '',
      productFacts: '',
      discountRules: '',
      warrantyInfo: '',
      escalationRules: '',
      additionalPolicies: '',
      isSample: false,
    });
    setActivePolicyTab('shipping');
    setIsStoreModalOpen(true);
  };

  // Helper to open edit modal
  const handleOpenEditStore = (store: StoreProfile) => {
    setEditingStore({ ...store });
    setActivePolicyTab('shipping');
    setIsStoreModalOpen(true);
  };

  // Save Store with validation
  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore?.name || !editingStore.name.trim()) {
      onSetToast('Store Name is required.', 'error');
      return;
    }
    if (!editingStore.shippingPolicy || !editingStore.shippingPolicy.trim()) {
      onSetToast('Shipping policy is required for accurate evaluation.', 'error');
      return;
    }
    if (!editingStore.returnPolicy || !editingStore.returnPolicy.trim()) {
      onSetToast('Return & refund policy is required.', 'error');
      return;
    }

    const fullStore: StoreProfile = {
      id: editingStore.id || `store-${Date.now()}`,
      name: editingStore.name.trim(),
      url: editingStore.url?.trim() || '',
      country: (editingStore.country as CountryCode) || 'United States',
      currency: (editingStore.currency as CurrencyCode) || 'USD',
      shippingPolicy: editingStore.shippingPolicy?.trim() || '',
      returnPolicy: editingStore.returnPolicy?.trim() || '',
      productFacts: editingStore.productFacts?.trim() || '',
      discountRules: editingStore.discountRules?.trim() || '',
      warrantyInfo: editingStore.warrantyInfo?.trim() || '',
      escalationRules: editingStore.escalationRules?.trim() || '',
      additionalPolicies: editingStore.additionalPolicies?.trim() || '',
      isSample: Boolean(editingStore.isSample),
      createdAt: editingStore.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveStore(fullStore);
    setSelectedStoreId(fullStore.id);
    setIsStoreModalOpen(false);
    setEditingStore(null);
    onSetToast(`Store "${fullStore.name}" saved successfully!`, 'success');
  };

  // Generate Test Cases via Gemini
  const handleGenerateTestCases = async () => {
    if (!currentStore) return;
    setIsGeneratingTests(true);
    try {
      onSetToast(
        `Generating ${genCount} test cases for ${currentStore.name} using Gemini...`,
        'info'
      );
      const generated = await ApiService.generateTestCases(currentStore, genCount);

      if (generated.length === 0) {
        throw new Error('No test cases returned from server.');
      }

      // Save each test case into storage
      generated.forEach((tc) => onSaveTestCase(tc));
      onSetToast(
        `Successfully generated ${generated.length} test cases!`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to generate test cases:', err);
      onSetToast(
        `Generation failed: ${err.message || 'Please check Gemini API key'}`,
        'error'
      );
    } finally {
      setIsGeneratingTests(false);
    }
  };

  // Handle saving edited test case
  const handleSaveTestCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestCase) return;
    onSaveTestCase(editingTestCase);
    setIsTestCaseModalOpen(false);
    setEditingTestCase(null);
    onSetToast('Test case updated.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Store Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 shrink-0">
            <Store size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">
                {currentStore?.name || 'Select a Store'}
              </h2>
              {currentStore?.isSample && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  Sample Data
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
              <span>
                {currentStore?.country} ({currentStore?.currency})
              </span>
              <span>•</span>
              {currentStore?.url ? (
                <a
                  href={currentStore.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <span>{currentStore.url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span>No URL provided</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => currentStore && handleOpenEditStore(currentStore)}
            className="px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 size={14} />
            <span>Edit Store Policies</span>
          </button>
          <button
            onClick={handleOpenCreateStore}
            className="px-3 py-2 text-xs font-medium text-white bg-[#122B20] hover:bg-[#1B3E2F] rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Create Store</span>
          </button>
          {currentStore && !currentStore.isSample && (
            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete "${currentStore.name}" and all its test cases?`
                  )
                ) {
                  onDeleteStore(currentStore.id);
                  onSetToast('Store deleted.', 'info');
                }
              }}
              title="Delete Store"
              className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stores List Selector Chips */}
      {stores.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-medium whitespace-nowrap pl-1">
            Stores ({stores.length}):
          </span>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStoreId(s.id)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                s.id === currentStore?.id
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>{s.name}</span>
              {s.isSample && (
                <span className="text-[10px] bg-white/20 px-1 rounded">Sample</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Store Knowledge & Policies Accordion Card */}
      {currentStore && (
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <FileText size={16} className="text-emerald-700" />
                <span>Store Fact Base & Ground Truth Rules</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Gemini evaluates chatbot responses strictly against these verified source policies.
              </p>
            </div>
            <button
              onClick={() => setExpandedPolicyPreview(!expandedPolicyPreview)}
              className="text-xs text-emerald-800 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>{expandedPolicyPreview ? 'Collapse Details' : 'View Full Fact Base'}</span>
              {expandedPolicyPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Quick Policy summary pills */}
          <div className="p-4 bg-stone-50/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-b border-stone-100">
            <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                Shipping
              </span>
              <p className="text-stone-800 font-medium mt-1 truncate">
                {currentStore.shippingPolicy.slice(0, 50)}...
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                Returns & Refunds
              </span>
              <p className="text-stone-800 font-medium mt-1 truncate">
                {currentStore.returnPolicy.slice(0, 50)}...
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                Warranty
              </span>
              <p className="text-stone-800 font-medium mt-1 truncate">
                {currentStore.warrantyInfo.slice(0, 50)}...
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                Escalation
              </span>
              <p className="text-stone-800 font-medium mt-1 truncate">
                {currentStore.escalationRules.slice(0, 50)}...
              </p>
            </div>
          </div>

          {/* Expanded policy viewer */}
          {expandedPolicyPreview && (
            <div className="p-5 space-y-4 text-xs text-stone-700 bg-stone-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Shipping Policy</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.shippingPolicy}
                  </pre>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Returns & Refunds Policy</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.returnPolicy}
                  </pre>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Product Facts & Limitations</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.productFacts || 'No specific product facts entered.'}
                  </pre>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Warranty Information</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.warrantyInfo || 'No warranty policies specified.'}
                  </pre>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Escalation & Human Handoff</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.escalationRules || 'No escalation rules specified.'}
                  </pre>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-1">
                  <h4 className="font-semibold text-stone-900 text-xs">Discount & Promotion Rules</h4>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600 max-h-40 overflow-y-auto">
                    {currentStore.discountRules || 'No discount rules specified.'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Cases Section Header */}
      <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Generated Test Cases ({testCases.length})
              </h3>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">
                {currentStore?.name}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Realistic customer scenarios grounded in actual store policies. No policies are
              invented.
            </p>
          </div>

          {/* Test Case Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1.5 rounded-lg text-xs">
              <span className="text-stone-500 font-medium">Count:</span>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="bg-transparent font-semibold text-stone-800 outline-hidden cursor-pointer"
              >
                <option value={5}>5 cases</option>
                <option value={10}>10 cases</option>
                <option value={15}>15 cases</option>
                <option value={20}>20 cases</option>
              </select>
            </div>

            <button
              onClick={handleGenerateTestCases}
              disabled={isGeneratingTests || !currentStore}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Sparkles size={14} className={isGeneratingTests ? 'animate-spin' : ''} />
              <span>{isGeneratingTests ? 'Generating with Gemini...' : 'Generate Test Cases'}</span>
            </button>

            {testCases.length > 0 && (
              <button
                onClick={() => currentStore && onStartTestRunWithStore(currentStore.id)}
                className="inline-flex items-center gap-1.5 bg-[#122B20] hover:bg-[#1A3D2D] text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <span>Launch Test Run ({testCases.length})</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Test Cases List Cards */}
        {testCases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {testCases.map((tc, index) => (
              <div
                key={tc.id}
                className="bg-stone-50/70 hover:bg-white rounded-xl p-4 border border-stone-200/90 hover:border-emerald-700/40 transition shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {tc.id}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 truncate max-w-[200px]">
                        {tc.category}
                      </span>
                    </div>
                    <RiskBadge level={tc.riskLevel} />
                  </div>

                  {/* Customer Question */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Customer Question / Scenario:
                    </span>
                    <p className="text-xs font-medium text-stone-900 italic bg-white p-2.5 rounded-lg border border-stone-200/70">
                      "{tc.question}"
                    </p>
                  </div>

                  {/* Expected criteria */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Expected Response Criteria:
                    </span>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {tc.expectedCriteria}
                    </p>
                  </div>

                  {/* Ground Truth Policy */}
                  <div className="text-[11px] text-stone-500 flex items-start gap-1.5 pt-1">
                    <ShieldCheck size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-stone-700">Source:</strong> {tc.sourcePolicy}
                    </span>
                  </div>

                  {/* Why it matters */}
                  <div className="text-[11px] text-stone-500 bg-stone-100/70 p-2 rounded-md">
                    <strong className="text-stone-700">Business Risk:</strong> {tc.whyItMatters}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {tc.isEdgeCase && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                        Edge Case
                      </span>
                    )}
                    {tc.requiresEscalation && (
                      <span className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                        Requires Escalation
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingTestCase({ ...tc });
                        setIsTestCaseModalOpen(true);
                      }}
                      className="p-1 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-200 transition"
                      title="Edit Test Case"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete test case ${tc.id}?`)) {
                          onDeleteTestCase(tc.storeId, tc.id);
                          onSetToast(`Test case ${tc.id} deleted.`, 'info');
                        }
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                      title="Delete Test Case"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-xl space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900">
                No Test Cases Generated Yet
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                Click <strong>"Generate Test Cases"</strong> above. Gemini will analyze{' '}
                {currentStore?.name}'s shipping, return, warranty, and escalation rules to construct
                challenging, realistic test prompts.
              </p>
            </div>
            <button
              onClick={handleGenerateTestCases}
              disabled={isGeneratingTests || !currentStore}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Generate 10 Grounded Test Cases</span>
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Store Modal */}
      {isStoreModalOpen && editingStore && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-stone-200 max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingStore.createdAt ? 'Edit Store Profile' : 'Create New Store Profile'}
                </h3>
                <p className="text-xs text-stone-500">
                  Provide verified store facts and policies. TruthCheck AI tests against these exact rules.
                </p>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStoreSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Basic Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStore.name || ''}
                    onChange={(e) =>
                      setEditingStore({ ...editingStore, name: e.target.value })
                    }
                    placeholder="e.g. Lumina Living Goods"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Store URL
                  </label>
                  <input
                    type="url"
                    value={editingStore.url || ''}
                    onChange={(e) =>
                      setEditingStore({ ...editingStore, url: e.target.value })
                    }
                    placeholder="https://luminaliving.example.com"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Primary Country *
                  </label>
                  <select
                    value={editingStore.country || 'United States'}
                    onChange={(e) =>
                      setEditingStore({
                        ...editingStore,
                        country: e.target.value as CountryCode,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Base Currency *
                  </label>
                  <select
                    value={editingStore.currency || 'USD'}
                    onChange={(e) =>
                      setEditingStore({
                        ...editingStore,
                        currency: e.target.value as CurrencyCode,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              {/* Policy Section Navigation Tabs */}
              <div className="border-t border-stone-200 pt-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 text-xs">
                  {[
                    { id: 'shipping', label: 'Shipping *' },
                    { id: 'returns', label: 'Returns & Refunds *' },
                    { id: 'products', label: 'Product Facts' },
                    { id: 'discounts', label: 'Discounts & Promos' },
                    { id: 'warranty', label: 'Warranty' },
                    { id: 'escalation', label: 'Escalations' },
                    { id: 'additional', label: 'Additional Docs' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePolicyTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                        activePolicyTab === tab.id
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content Fields */}
                <div className="pt-3">
                  {activePolicyTab === 'shipping' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Shipping Policy, Zones & Rates *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Specify delivery speed, free shipping threshold, express rates, carrier
                        restrictions, and international destination exclusions.
                      </p>
                      <textarea
                        rows={7}
                        required
                        value={editingStore.shippingPolicy || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            shippingPolicy: e.target.value,
                          })
                        }
                        placeholder="e.g. Free standard shipping on orders over $50 within the US. Transit time is 3-5 business days. International shipping to Canada only ($15 flat fee). We do not ship to the UK or Europe..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'returns' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Returns & Refunds Policy *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Include return window (e.g. 30 days), conditions (unworn, tags attached),
                        return label fees, non-returnable items, and refund processing timeline.
                      </p>
                      <textarea
                        rows={7}
                        required
                        value={editingStore.returnPolicy || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            returnPolicy: e.target.value,
                          })
                        }
                        placeholder="e.g. Returns accepted within 30 days of delivery. Items must be in original condition with tags attached. A $5.99 return shipping fee is deducted from the refund unless store credit is chosen. Final sale items and intimates cannot be returned..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'products' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Product Facts, Specifications & Limitations
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Materials, waterproof ratings, certifications, battery inclusions, and
                        explicit limitations to catch hallucinated compatibility.
                      </p>
                      <textarea
                        rows={7}
                        value={editingStore.productFacts || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            productFacts: e.target.value,
                          })
                        }
                        placeholder="e.g. Outerwear is 15,000mm water resistant, gentle wash cold only. Footwear runs true to size. Watches are water resistant to 30m but not for diving..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'discounts' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Discount & Promotion Rules
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Code stacking rules, active authorized promo codes, clearance exclusions,
                        and price-match limits.
                      </p>
                      <textarea
                        rows={7}
                        value={editingStore.discountRules || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            discountRules: e.target.value,
                          })
                        }
                        placeholder="e.g. Welcome coupon WELCOME10 gives 10% off full price items only. Codes cannot be stacked. No price matching against third-party marketplaces..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'warranty' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Warranty Information
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Warranty length, covered craftsmanship defects, excluded wear-and-tear or
                        accidental damage, and proof of purchase requirement.
                      </p>
                      <textarea
                        rows={7}
                        value={editingStore.warrantyInfo || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            warrantyInfo: e.target.value,
                          })
                        }
                        placeholder="e.g. 1-year limited warranty against manufacturing defects. Does not cover normal wear and tear, accidental drops, or unauthorized modifications..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'escalation' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Escalation Rules & Human Handoff Triggers
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Conditions under which chatbot must transfer to humans (chargebacks, injury,
                        lost package &gt;10 days, high dollar claims).
                      </p>
                      <textarea
                        rows={7}
                        value={editingStore.escalationRules || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            escalationRules: e.target.value,
                          })
                        }
                        placeholder="e.g. Bot MUST escalate on: chargeback or legal dispute mentions, claims over $100, reports of product damage causing injury, or customer requesting human manager..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {activePolicyTab === 'additional' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Additional Policies or FAQ Documents
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Any other store knowledge base entries, holiday shipping cutoff dates, or
                        packaging guidelines.
                      </p>
                      <textarea
                        rows={7}
                        value={editingStore.additionalPolicies || ''}
                        onChange={(e) =>
                          setEditingStore({
                            ...editingStore,
                            additionalPolicies: e.target.value,
                          })
                        }
                        placeholder="e.g. Holiday cutoff: orders placed after Dec 15 not guaranteed before Christmas..."
                        className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Save Store Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Test Case Modal */}
      {isTestCaseModalOpen && editingTestCase && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-stone-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  Edit Test Case {editingTestCase.id}
                </h4>
                <p className="text-xs text-stone-500">{editingTestCase.category}</p>
              </div>
              <button
                onClick={() => setIsTestCaseModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTestCaseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Customer Question / Scenario *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingTestCase.question}
                  onChange={(e) =>
                    setEditingTestCase({ ...editingTestCase, question: e.target.value })
                  }
                  className="w-full p-2.5 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Expected Answer Criteria *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingTestCase.expectedCriteria}
                  onChange={(e) =>
                    setEditingTestCase({
                      ...editingTestCase,
                      expectedCriteria: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Risk Level</label>
                  <select
                    value={editingTestCase.riskLevel}
                    onChange={(e) =>
                      setEditingTestCase({
                        ...editingTestCase,
                        riskLevel: e.target.value as RiskLevel,
                      })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Source Policy Reference
                  </label>
                  <input
                    type="text"
                    value={editingTestCase.sourcePolicy}
                    onChange={(e) =>
                      setEditingTestCase({
                        ...editingTestCase,
                        sourcePolicy: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Why this test matters
                </label>
                <input
                  type="text"
                  value={editingTestCase.whyItMatters}
                  onChange={(e) =>
                    setEditingTestCase({
                      ...editingTestCase,
                      whyItMatters: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTestCase.isEdgeCase}
                    onChange={(e) =>
                      setEditingTestCase({
                        ...editingTestCase,
                        isEdgeCase: e.target.checked,
                      })
                    }
                    className="rounded text-emerald-700"
                  />
                  <span>Edge Case</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTestCase.requiresEscalation}
                    onChange={(e) =>
                      setEditingTestCase({
                        ...editingTestCase,
                        requiresEscalation: e.target.checked,
                      })
                    }
                    className="rounded text-emerald-700"
                  />
                  <span>Requires Escalation</span>
                </label>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestCaseModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 text-white font-medium rounded hover:bg-emerald-700"
                >
                  Update Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
