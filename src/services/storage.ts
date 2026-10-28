import { StoreProfile, TestCase, TestRun, UserWorkspace } from '../types';
import { SAMPLE_STORE, SAMPLE_TEST_CASES } from '../data/sampleStore';

const STORAGE_KEYS = {
  STORES: 'truthcheck_stores_v1',
  TEST_CASES: 'truthcheck_testcases_v1',
  TEST_RUNS: 'truthcheck_testruns_v1',
  WORKSPACES: 'truthcheck_workspaces_v1',
  ACTIVE_WORKSPACE: 'truthcheck_active_workspace_v1',
};

const DEFAULT_WORKSPACE: UserWorkspace = {
  id: 'ws-default',
  name: 'Default Workspace',
  email: 'qa-engineer@truthcheck.ai',
  role: 'AI QA Lead',
};

export class StorageService {
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    // Initialize workspace if absent
    if (!localStorage.getItem(STORAGE_KEYS.WORKSPACES)) {
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify([DEFAULT_WORKSPACE]));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, DEFAULT_WORKSPACE.id);
    }

    // Initialize stores if absent
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify([SAMPLE_STORE]));
      // Initialize sample test cases
      const testCasesMap: Record<string, TestCase[]> = {
        [SAMPLE_STORE.id]: SAMPLE_TEST_CASES,
      };
      localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(testCasesMap));
    }

    this.isInitialized = true;
  }

  // --- STORES ---
  public static getStores(): StoreProfile[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load stores from storage', e);
      return [SAMPLE_STORE];
    }
  }

  public static getStore(id: string): StoreProfile | undefined {
    return this.getStores().find((s) => s.id === id);
  }

  public static saveStore(store: StoreProfile): void {
    const stores = this.getStores();
    const existingIndex = stores.findIndex((s) => s.id === store.id);
    if (existingIndex >= 0) {
      stores[existingIndex] = { ...store, updatedAt: new Date().toISOString() };
    } else {
      stores.unshift(store);
    }
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  }

  public static deleteStore(id: string): void {
    const stores = this.getStores().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));

    // Also remove test cases for this store
    try {
      const casesMap = this.getAllTestCasesMap();
      delete casesMap[id];
      localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(casesMap));
    } catch {}
  }

  // --- TEST CASES ---
  private static getAllTestCasesMap(): Record<string, TestCase[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEST_CASES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public static getTestCases(storeId: string): TestCase[] {
    this.initialize();
    const map = this.getAllTestCasesMap();
    return map[storeId] || [];
  }

  public static saveTestCase(testCase: TestCase): void {
    const map = this.getAllTestCasesMap();
    const storeCases = map[testCase.storeId] || [];
    const index = storeCases.findIndex((tc) => tc.id === testCase.id);
    if (index >= 0) {
      storeCases[index] = testCase;
    } else {
      storeCases.unshift(testCase);
    }
    map[testCase.storeId] = storeCases;
    localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(map));
  }

  public static saveTestCases(storeId: string, testCases: TestCase[]): void {
    const map = this.getAllTestCasesMap();
    map[storeId] = testCases;
    localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(map));
  }

  public static deleteTestCase(storeId: string, testCaseId: string): void {
    const map = this.getAllTestCasesMap();
    if (map[storeId]) {
      map[storeId] = map[storeId].filter((tc) => tc.id !== testCaseId);
      localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(map));
    }
  }

  // --- TEST RUNS ---
  public static getTestRuns(): TestRun[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEST_RUNS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getTestRun(id: string): TestRun | undefined {
    return this.getTestRuns().find((r) => r.id === id);
  }

  public static saveTestRun(run: TestRun): void {
    const runs = this.getTestRuns();
    const index = runs.findIndex((r) => r.id === run.id);
    if (index >= 0) {
      runs[index] = run;
    } else {
      runs.unshift(run);
    }
    localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(runs));
  }

  public static deleteTestRun(id: string): void {
    const runs = this.getTestRuns().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(runs));
  }

  // --- WORKSPACE & USER ISOLATION ---
  public static getWorkspaces(): UserWorkspace[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
      return data ? JSON.parse(data) : [DEFAULT_WORKSPACE];
    } catch {
      return [DEFAULT_WORKSPACE];
    }
  }

  public static getActiveWorkspace(): UserWorkspace {
    this.initialize();
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
    const workspaces = this.getWorkspaces();
    return workspaces.find((w) => w.id === id) || workspaces[0] || DEFAULT_WORKSPACE;
  }

  public static setActiveWorkspace(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, id);
  }

  public static createWorkspace(name: string, email: string): UserWorkspace {
    const ws: UserWorkspace = {
      id: `ws-${Date.now()}`,
      name,
      email,
      role: 'QA Engineer',
    };
    const list = this.getWorkspaces();
    list.push(ws);
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(list));
    this.setActiveWorkspace(ws.id);
    return ws;
  }

  // --- BACKUP & RESTORE ---
  public static exportAllData(): string {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stores: this.getStores(),
      testCases: this.getAllTestCasesMap(),
      testRuns: this.getTestRuns(),
      workspaces: this.getWorkspaces(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public static importData(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.stores || !Array.isArray(parsed.stores)) {
        return { success: false, message: 'Invalid backup file format: missing stores array.' };
      }
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(parsed.stores));
      if (parsed.testCases) {
        localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(parsed.testCases));
      }
      if (parsed.testRuns) {
        localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(parsed.testRuns));
      }
      return { success: true, message: 'Backup restored successfully!' };
    } catch (e: any) {
      return { success: false, message: `Failed to restore backup: ${e.message}` };
    }
  }

  public static resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.STORES);
    localStorage.removeItem(STORAGE_KEYS.TEST_CASES);
    localStorage.removeItem(STORAGE_KEYS.TEST_RUNS);
    this.isInitialized = false;
    this.initialize();
  }
}
