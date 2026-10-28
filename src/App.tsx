import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { StoresView } from './components/StoresView';
import { TestRunsView } from './components/TestRunsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { StoreProfile, TestCase, TestRun, UserWorkspace } from './types';
import { StorageService } from './services/storage';
import { ApiService } from './services/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(false);

  // Core Data State
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<UserWorkspace>(StorageService.getActiveWorkspace());

  // Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Boot Data Loading
  const refreshAllData = () => {
    const loadedStores = StorageService.getStores();
    setStores(loadedStores);
    if (loadedStores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(loadedStores[0].id);
    }
    const loadedRuns = StorageService.getTestRuns();
    setTestRuns(loadedRuns);
    setWorkspace(StorageService.getActiveWorkspace());
  };

  useEffect(() => {
    refreshAllData();

    // Check Gemini API Connectivity
    ApiService.checkHealth().then((health) => {
      setGeminiConnected(health.geminiConfigured);
    });
  }, []);

  // Store Management Handlers
  const handleSaveStore = (store: StoreProfile) => {
    StorageService.saveStore(store);
    refreshAllData();
    setSelectedStoreId(store.id);
  };

  const handleDeleteStore = (id: string) => {
    StorageService.deleteStore(id);
    refreshAllData();
    if (selectedStoreId === id) {
      const remaining = StorageService.getStores();
      setSelectedStoreId(remaining[0]?.id || '');
    }
  };

  // Test Case Management Handlers
  const handleGetTestCasesForStore = (storeId: string): TestCase[] => {
    return StorageService.getTestCases(storeId);
  };

  const handleSaveTestCase = (testCase: TestCase) => {
    StorageService.saveTestCase(testCase);
    refreshAllData();
  };

  const handleDeleteTestCase = (storeId: string, testCaseId: string) => {
    StorageService.deleteTestCase(storeId, testCaseId);
    refreshAllData();
  };

  // Test Run Management Handlers
  const handleSaveTestRun = (run: TestRun) => {
    StorageService.saveTestRun(run);
    refreshAllData();
  };

  const handleDeleteTestRun = (id: string) => {
    StorageService.deleteTestRun(id);
    refreshAllData();
    if (activeRunId === id) {
      setActiveRunId(null);
    }
    if (selectedReportId === id) {
      setSelectedReportId(null);
    }
  };

  // Navigation shortcuts
  const handleStartTestRunWithStore = (storeId: string) => {
    const targetStore = stores.find((s) => s.id === storeId) || stores[0];
    if (!targetStore) return;

    const cases = StorageService.getTestCases(targetStore.id);
    if (cases.length === 0) {
      addToast('Please generate test cases for this store first.', 'info');
      setActiveTab('stores');
      return;
    }

    const newRun: TestRun = {
      id: `run-${Date.now()}`,
      storeId: targetStore.id,
      storeName: targetStore.name,
      name: `${targetStore.name} Reliability Audit #${testRuns.length + 1}`,
      createdAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      executions: cases.map((tc) => ({
        testCaseId: tc.id,
        testCase: tc,
        chatbotAnswer: '',
        status: 'UNTESTED',
      })),
    };

    StorageService.saveTestRun(newRun);
    refreshAllData();
    setActiveRunId(newRun.id);
    setActiveTab('test-runs');
    addToast(`Launched test run with ${cases.length} cases.`, 'success');
  };

  const handleStartSampleTest = () => {
    const sample = stores.find((s) => s.isSample) || stores[0];
    if (sample) {
      handleStartTestRunWithStore(sample.id);
    }
  };

  const handleOpenTestRun = (runId: string) => {
    setActiveRunId(runId);
    setActiveTab('test-runs');
  };

  const handleOpenReport = (runId: string) => {
    setSelectedReportId(runId);
    setActiveTab('reports');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col lg:flex-row antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workspace={workspace}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        geminiConnected={geminiConnected}
        onNewTestRun={() => {
          if (stores.length > 0) {
            handleStartTestRunWithStore(selectedStoreId || stores[0].id);
          } else {
            setActiveTab('stores');
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          stores={stores}
          selectedStoreId={selectedStoreId}
          setSelectedStoreId={setSelectedStoreId}
          onNewStore={() => setActiveTab('stores')}
          onNewTestRun={() => {
            if (stores.length > 0) {
              handleStartTestRunWithStore(selectedStoreId || stores[0].id);
            }
          }}
          workspace={workspace}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <DashboardView
              stores={stores}
              testRuns={testRuns}
              onNavigateToRuns={() => setActiveTab('test-runs')}
              onNavigateToStores={() => setActiveTab('stores')}
              onStartSampleTest={handleStartSampleTest}
              onOpenTestRun={handleOpenTestRun}
              onOpenReport={handleOpenReport}
            />
          )}

          {activeTab === 'stores' && (
            <StoresView
              stores={stores}
              onSaveStore={handleSaveStore}
              onDeleteStore={handleDeleteStore}
              getTestCasesForStore={handleGetTestCasesForStore}
              onSaveTestCase={handleSaveTestCase}
              onDeleteTestCase={handleDeleteTestCase}
              onStartTestRunWithStore={handleStartTestRunWithStore}
              onSetToast={addToast}
            />
          )}

          {activeTab === 'test-runs' && (
            <TestRunsView
              testRuns={testRuns}
              stores={stores}
              getTestCasesForStore={handleGetTestCasesForStore}
              onSaveTestRun={handleSaveTestRun}
              onDeleteTestRun={handleDeleteTestRun}
              activeRunId={activeRunId}
              setActiveRunId={setActiveRunId}
              onNavigateToReport={handleOpenReport}
              onSetToast={addToast}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              testRuns={testRuns}
              stores={stores}
              selectedRunId={selectedReportId}
              setSelectedRunId={setSelectedReportId}
              onSetToast={addToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              workspace={workspace}
              onWorkspaceChange={(ws) => {
                setWorkspace(ws);
                refreshAllData();
              }}
              onSetToast={addToast}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs flex items-start gap-2.5 transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                isSuccess
                  ? 'bg-emerald-900 text-white border-emerald-800'
                  : isError
                  ? 'bg-rose-900 text-white border-rose-800'
                  : 'bg-stone-900 text-stone-100 border-stone-800'
              }`}
            >
              {isSuccess && <CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />}
              {isError && <AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && <Info size={16} className="text-sky-300 shrink-0 mt-0.5" />}
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-white shrink-0 p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
