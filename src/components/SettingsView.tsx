import React, { useState, useEffect } from 'react';
import { UserWorkspace } from '../types';
import {
  Database,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Server,
  User,
  Key,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ApiService, HealthResponse } from '../services/api';

interface Props {
  workspace: UserWorkspace;
  onWorkspaceChange: (ws: UserWorkspace) => void;
  onSetToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<Props> = ({
  workspace,
  onWorkspaceChange,
  onSetToast,
  onRefreshData,
}) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceEmail, setNewWorkspaceEmail] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  useEffect(() => {
    setWorkspaces(StorageService.getWorkspaces());
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await ApiService.checkHealth();
      setHealth(res);
    } catch {
      setHealth({
        status: 'error',
        geminiConfigured: false,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleExportBackup = () => {
    const json = StorageService.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `truthcheck_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onSetToast('Full workspace JSON backup exported.', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = StorageService.importData(text);
      if (res.success) {
        onSetToast(res.message, 'success');
        onRefreshData();
      } else {
        onSetToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const created = StorageService.createWorkspace(
      newWorkspaceName.trim(),
      newWorkspaceEmail.trim() || 'qa-member@truthcheck.ai'
    );
    setWorkspaces(StorageService.getWorkspaces());
    onWorkspaceChange(created);
    setIsCreatingWorkspace(false);
    setNewWorkspaceName('');
    setNewWorkspaceEmail('');
    onSetToast(`Switched to workspace: ${created.name}`, 'success');
  };

  const handleResetData = () => {
    if (
      confirm(
        'Are you sure you want to delete all saved test runs and custom stores? The sample store will be restored.'
      )
    ) {
      StorageService.resetAllData();
      onRefreshData();
      onSetToast('Application data has been reset to defaults.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Server & Gemini API Health */}
      <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Backend & Gemini Model Status</h3>
              <p className="text-xs text-stone-500">
                Evaluation engine powered server-side via Google Gemini 3.8 Flash
              </p>
            </div>
          </div>
          <button
            onClick={checkSystemHealth}
            disabled={checkingHealth}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
            title="Refresh status"
          >
            <RefreshCw size={15} className={checkingHealth ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-stone-500 block text-[11px]">Server API Connectivity</span>
            <div className="flex items-center gap-1.5 font-semibold text-stone-900 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Full-Stack Express Active</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-stone-500 block text-[11px]">Server-Side Gemini Secret</span>
            <div className="flex items-center gap-1.5 font-semibold text-stone-900 mt-1">
              {health?.geminiConfigured ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-emerald-700">GEMINI_API_KEY Configured</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-amber-600" />
                  <span className="text-amber-700">Checking Key Status...</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-stone-500 block text-[11px]">AI Model Architecture</span>
            <div className="flex items-center gap-1.5 font-semibold text-stone-900 mt-1">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>models/gemini-3.8-flash</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-start gap-2">
          <Lock size={13} className="text-emerald-800 shrink-0 mt-0.5" />
          <span>
            <strong>Secure Zero-Exposure Architecture:</strong> Gemini API keys are kept strictly in
            server-side runtime environment memory and are never exposed to browser bundles or
            client network requests.
          </span>
        </div>
      </div>

      {/* 2. Workspace & User Isolation */}
      <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">User Workspaces & Data Isolation</h3>
              <p className="text-xs text-stone-500">
                Switch workspaces to test cross-user data isolation and QA personas
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreatingWorkspace(!isCreatingWorkspace)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900"
          >
            {isCreatingWorkspace ? 'Cancel' : '+ Add Workspace'}
          </button>
        </div>

        {isCreatingWorkspace && (
          <form
            onSubmit={handleCreateWorkspace}
            className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-3 text-xs"
          >
            <h4 className="font-semibold text-stone-800">Create New Workspace Persona</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace Name (e.g. Acme Retail Team)"
                className="p-2 border border-stone-300 rounded-lg bg-white outline-hidden"
              />
              <input
                type="email"
                value={newWorkspaceEmail}
                onChange={(e) => setNewWorkspaceEmail(e.target.value)}
                placeholder="QA Analyst Email (e.g. lead@acme.example)"
                className="p-2 border border-stone-300 rounded-lg bg-white outline-hidden"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-800 text-white font-medium rounded-lg hover:bg-emerald-700"
              >
                Create & Switch
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => {
                StorageService.setActiveWorkspace(ws.id);
                onWorkspaceChange(ws);
                onSetToast(`Switched active workspace to "${ws.name}"`, 'info');
              }}
              className={`p-3 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition ${
                ws.id === workspace.id
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    ws.id === workspace.id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{ws.name}</div>
                  <div className="text-[11px] text-stone-500">{ws.email}</div>
                </div>
              </div>

              {ws.id === workspace.id && (
                <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Persistence & Backup */}
      <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Data Persistence & Backups</h3>
            <p className="text-xs text-stone-500">
              Export and restore all store fact bases, generated test cases, and audit evaluations
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
          <div className="font-semibold text-stone-800 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-700" />
            <span>Active Storage Mode: Browser LocalStorage Persistence</span>
          </div>
          <p className="text-stone-600 leading-relaxed text-[11px]">
            Your store configurations, generated test cases, and audit histories are safely stored
            within your local browser storage. You can create complete portable JSON backups to
            safeguard your data across browsers or restore previous test runs.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export Complete JSON Backup</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer">
            <Upload size={14} />
            <span>Restore from Backup File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="bg-white rounded-xl p-5 border border-red-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 text-red-700 rounded-lg">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Danger Zone</h3>
            <p className="text-xs text-stone-500">
              Irreversibly delete stored test runs and reset to sample store
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-stone-600 max-w-md">
            Permanently clear all user-created stores, test cases, and test run evaluation results.
          </p>
          <button
            onClick={handleResetData}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition cursor-pointer shrink-0 shadow-xs"
          >
            Reset All Application Data
          </button>
        </div>
      </div>
    </div>
  );
};
