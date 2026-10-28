import React from 'react';
import {
  LayoutDashboard,
  Store,
  PlaySquare,
  FileCheck2,
  Settings,
  ShieldCheck,
  Sparkles,
  Database,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { UserWorkspace } from '../types';

export type NavTab = 'overview' | 'stores' | 'test-runs' | 'reports' | 'settings';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  workspace: UserWorkspace;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  geminiConnected: boolean;
  onNewTestRun: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  workspace,
  mobileOpen,
  setMobileOpen,
  geminiConnected,
  onNewTestRun,
}) => {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Reliability metrics & activity',
    },
    {
      id: 'stores' as NavTab,
      label: 'Stores',
      icon: Store,
      description: 'Store policies & fact bases',
    },
    {
      id: 'test-runs' as NavTab,
      label: 'Test Runs',
      icon: PlaySquare,
      description: 'Active workbench & evaluations',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: FileCheck2,
      description: 'Audits, PDF & CSV exports',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      description: 'Workspaces, data & storage',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-[#122B20] text-stone-100 flex flex-col border-r border-[#1B3E2F] shadow-xl lg:shadow-none transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1B3E2F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-stone-950 shadow-md">
              <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-base tracking-tight text-white">TruthCheck</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-none mt-1">Ecommerce AI Reliability</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-stone-400 hover:text-white p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Button: Start Test Run */}
        <div className="p-4 pb-2">
          <button
            onClick={() => {
              onNewTestRun();
              setMobileOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 px-3 rounded-lg shadow-sm transition cursor-pointer active:scale-[0.99]"
          >
            <Sparkles size={16} className="text-emerald-200" />
            <span>Start Test Run</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-white/10 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-emerald-400' : 'text-stone-400'}
                />
                <div className="flex-1">
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[11px] text-stone-400 font-normal leading-tight mt-0.5">
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight size={14} className="text-emerald-400" />}
              </button>
            );
          })}
        </nav>

        {/* Target Markets Info */}
        <div className="mx-3 my-2 p-3 rounded-lg bg-[#0E2219] border border-[#1B3E2F]/80 text-xs">
          <div className="flex items-center justify-between text-stone-300 font-medium mb-1">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400">Target Markets</span>
            <span className="text-[10px] text-stone-400">US • UK • CA • AU</span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Checks policies across currencies, returns, shipping, and warranties.
          </p>
        </div>

        {/* Workspace & Persistence Footer */}
        <div className="p-3 border-t border-[#1B3E2F] bg-[#0E2219]/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-xs font-semibold text-emerald-200">
              {workspace.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{workspace.name}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    geminiConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>{geminiConnected ? 'Gemini 3.8 Flash' : 'API Connecting...'}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileOpen(false);
              }}
              title="Settings & Storage"
              className="p-1 text-stone-400 hover:text-white rounded"
            >
              <Database size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
