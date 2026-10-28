import React from 'react';
import { Menu, Store, Plus, Sparkles, Building2, ChevronDown } from 'lucide-react';
import { StoreProfile, UserWorkspace } from '../types';
import { NavTab } from './Sidebar';

interface Props {
  activeTab: NavTab;
  setMobileOpen: (open: boolean) => void;
  stores: StoreProfile[];
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  onNewStore: () => void;
  onNewTestRun: () => void;
  workspace: UserWorkspace;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setMobileOpen,
  stores,
  selectedStoreId,
  setSelectedStoreId,
  onNewStore,
  onNewTestRun,
  workspace,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Reliability Overview',
      subtitle: 'Real-time performance metrics across chatbot evaluations',
    },
    stores: {
      title: 'Store Profiles & Policies',
      subtitle: 'Manage store factbases, shipping terms, warranties, and escalation triggers',
    },
    'test-runs': {
      title: 'AI Reliability Test Runs',
      subtitle: 'Evaluate live chatbot answers against store policies with Gemini',
    },
    reports: {
      title: 'Audit Reports & Exports',
      subtitle: 'Printable executive PDF reports and full CSV data exports',
    },
    settings: {
      title: 'Settings & Workspace Isolation',
      subtitle: 'Manage local persistence, data backups, and Gemini model health',
    },
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <header className="bg-white border-b border-stone-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight leading-tight">
            {titles[activeTab].title}
          </h1>
          <p className="text-xs text-stone-500 hidden sm:block mt-0.5">
            {titles[activeTab].subtitle}
          </p>
        </div>
      </div>

      {/* Right: Store Context & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Store Context Dropdown */}
        {stores.length > 0 && (
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 transition">
              <Store size={14} className="text-emerald-700 shrink-0" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-transparent font-medium text-stone-800 outline-hidden pr-3 cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isSample ? '(Sample)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quick CTA */}
        {activeTab !== 'test-runs' && (
          <button
            onClick={onNewTestRun}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#122B20] hover:bg-[#1A3D2D] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Sparkles size={13} className="text-emerald-400" />
            <span>New Test Run</span>
          </button>
        )}
      </div>
    </header>
  );
};
