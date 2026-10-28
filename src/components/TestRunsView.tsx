import React, { useState, useEffect } from 'react';
import {
  TestRun,
  TestExecution,
  StoreProfile,
  TestCase,
  Verdict,
  EvaluationResult,
  HumanReview,
} from '../types';
import {
  PlaySquare,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
  Edit2,
  Trash2,
  FileCheck2,
  Check,
  AlertCircle,
  ExternalLink,
  Info,
  Layers,
  UserCheck,
} from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';
import { RiskBadge } from './RiskBadge';
import { SAMPLE_BOT_RESPONSES } from '../data/sampleStore';
import { ApiService } from '../services/api';

interface Props {
  testRuns: TestRun[];
  stores: StoreProfile[];
  getTestCasesForStore: (storeId: string) => TestCase[];
  onSaveTestRun: (run: TestRun) => void;
  onDeleteTestRun: (id: string) => void;
  activeRunId: string | null;
  setActiveRunId: (id: string | null) => void;
  onNavigateToReport: (runId: string) => void;
  onSetToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TestRunsView: React.FC<Props> = ({
  testRuns,
  stores,
  getTestCasesForStore,
  onSaveTestRun,
  onDeleteTestRun,
  activeRunId,
  setActiveRunId,
  onNavigateToReport,
  onSetToast,
}) => {
  // New Run Modal State
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [newRunStoreId, setNewRunStoreId] = useState<string>(stores[0]?.id || '');
  const [newRunName, setNewRunName] = useState<string>('');
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);

  // Workbench State
  const activeRun = testRuns.find((r) => r.id === activeRunId) || null;
  const [selectedExecutionIndex, setSelectedExecutionIndex] = useState<number>(0);
  const [evaluatingTestId, setEvaluatingTestId] = useState<string | null>(null);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState<boolean>(false);

  // Human Review form state
  const [humanOverrideVerdict, setHumanOverrideVerdict] = useState<Verdict | ''>('');
  const [humanReviewerNotes, setHumanReviewerNotes] = useState<string>('');

  // Sync selected test cases when changing store in new run modal
  useEffect(() => {
    if (newRunStoreId) {
      const cases = getTestCasesForStore(newRunStoreId);
      setSelectedTestCaseIds(cases.map((c) => c.id));
      const s = stores.find((st) => st.id === newRunStoreId);
      if (s) {
        setNewRunName(`${s.name} Reliability Run #${testRuns.length + 1}`);
      }
    }
  }, [newRunStoreId, isNewRunModalOpen]);

  // Current active execution
  const currentExecution: TestExecution | undefined =
    activeRun?.executions[selectedExecutionIndex];

  // Reset human override inputs when switching test execution
  useEffect(() => {
    if (currentExecution) {
      setHumanOverrideVerdict(currentExecution.humanReview?.verdictOverride || '');
      setHumanReviewerNotes(currentExecution.humanReview?.reviewerNotes || '');
    }
  }, [currentExecution?.testCaseId, activeRunId]);

  // Create New Run
  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    const store = stores.find((s) => s.id === newRunStoreId);
    if (!store) {
      onSetToast('Please select a store', 'error');
      return;
    }

    const allStoreCases = getTestCasesForStore(store.id);
    const chosenCases = allStoreCases.filter((c) => selectedTestCaseIds.includes(c.id));

    if (chosenCases.length === 0) {
      onSetToast('Please select at least one test case for this run.', 'error');
      return;
    }

    const newRun: TestRun = {
      id: `run-${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      name: newRunName.trim() || `${store.name} Audit`,
      createdAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      executions: chosenCases.map((tc) => ({
        testCaseId: tc.id,
        testCase: tc,
        chatbotAnswer: '',
        status: 'UNTESTED',
      })),
    };

    onSaveTestRun(newRun);
    setActiveRunId(newRun.id);
    setSelectedExecutionIndex(0);
    setIsNewRunModalOpen(false);
    onSetToast(`Created test run "${newRun.name}" with ${chosenCases.length} cases.`, 'success');
  };

  // Update chatbot answer for current execution
  const handleAnswerChange = (val: string) => {
    if (!activeRun || !currentExecution) return;
    const updatedExecutions = [...activeRun.executions];
    updatedExecutions[selectedExecutionIndex] = {
      ...currentExecution,
      chatbotAnswer: val,
    };
    const updatedRun: TestRun = {
      ...activeRun,
      executions: updatedExecutions,
    };
    onSaveTestRun(updatedRun);
  };

  // Quick fill sample bot response
  const handleSelectSampleResponse = (sampleText: string) => {
    handleAnswerChange(sampleText);
    onSetToast('Sample chatbot response pasted into test case.', 'info');
  };

  // Evaluate single answer with Gemini
  const handleEvaluateCurrentAnswer = async () => {
    if (!activeRun || !currentExecution) return;

    const targetTestCaseId = currentExecution.testCaseId;
    const answerText = currentExecution.chatbotAnswer.trim();

    if (!answerText) {
      onSetToast("Please paste or type a chatbot response before clicking Analyze.", "error");
      return;
    }

    const store = stores.find((s) => s.id === activeRun.storeId);
    if (!store) {
      onSetToast("Store profile not found for this run.", "error");
      return;
    }

    setEvaluatingTestId(targetTestCaseId);
    try {
      onSetToast("Analyzing chatbot answer against store policies with Gemini...", "info");
      const evaluation = await ApiService.evaluateAnswer(
        store,
        currentExecution.testCase,
        answerText
      );

      const updatedExecutions = activeRun.executions.map((e) =>
        e.testCaseId === targetTestCaseId
          ? {
              ...e,
              status: "EVALUATED" as const,
              evaluation,
              errorMessage: undefined,
            }
          : e
      );

      const updatedRun = calculateRunSummary({
        ...activeRun,
        executions: updatedExecutions,
      });

      onSaveTestRun(updatedRun);
      onSetToast(
        `Analysis complete: ${evaluation.verdict.replace(/_/g, " ")} (${evaluation.severity} Severity)`,
        evaluation.verdict === "PASS" ? "success" : "info"
      );
    } catch (err: any) {
      const errMsg = err?.message || "Evaluation request failed.";
      console.error("[TruthCheck UI] Evaluation error:", errMsg);
      const updatedExecutions = activeRun.executions.map((e) =>
        e.testCaseId === targetTestCaseId
          ? {
              ...e,
              status: "ERROR" as const,
              errorMessage: errMsg,
            }
          : e
      );
      onSaveTestRun({ ...activeRun, executions: updatedExecutions });
      onSetToast(`Analysis failed: ${errMsg}`, "error");
    } finally {
      setEvaluatingTestId(null);
    }
  };

  // Batch evaluate all pending answers that have text entered
  const handleBatchEvaluatePending = async () => {
    if (!activeRun) return;
    const store = stores.find((s) => s.id === activeRun.storeId);
    if (!store) return;

    const pendingItems = activeRun.executions
      .map((e, idx) => ({ ...e, index: idx }))
      .filter((e) => e.status !== 'EVALUATED' && e.chatbotAnswer.trim().length > 0);

    if (pendingItems.length === 0) {
      onSetToast('No pending answers with text to evaluate.', 'info');
      return;
    }

    setIsBatchEvaluating(true);
    onSetToast(`Batch evaluating ${pendingItems.length} chatbot answers with Gemini...`, 'info');

    try {
      const results = await ApiService.batchEvaluate(
        store,
        pendingItems.map((p) => ({
          testCaseId: p.testCaseId,
          testCase: p.testCase,
          chatbotAnswer: p.chatbotAnswer,
        }))
      );

      const updatedExecutions = [...activeRun.executions];

      results.forEach((res) => {
        const itemIdx = updatedExecutions.findIndex((e) => e.testCaseId === res.testCaseId);
        if (itemIdx >= 0) {
          if (res.evaluation) {
            updatedExecutions[itemIdx] = {
              ...updatedExecutions[itemIdx],
              status: 'EVALUATED',
              evaluation: res.evaluation,
              errorMessage: undefined,
            };
          } else if (res.error) {
            updatedExecutions[itemIdx] = {
              ...updatedExecutions[itemIdx],
              status: 'ERROR',
              errorMessage: res.error,
            };
          }
        }
      });

      const updatedRun = calculateRunSummary({
        ...activeRun,
        executions: updatedExecutions,
      });

      onSaveTestRun(updatedRun);
      onSetToast(`Batch evaluation completed for ${results.length} answers!`, 'success');
    } catch (err: any) {
      onSetToast(`Batch evaluation failed: ${err.message}`, 'error');
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  // Save human review & decision override
  const handleSaveHumanReview = (status: 'CONFIRMED' | 'OVERRIDDEN') => {
    if (!activeRun || !currentExecution) return;

    const humanReview: HumanReview = {
      status,
      verdictOverride: status === 'OVERRIDDEN' && humanOverrideVerdict ? humanOverrideVerdict : undefined,
      reviewerNotes: humanReviewerNotes.trim(),
      reviewedBy: 'QA Lead',
      reviewedAt: new Date().toISOString(),
    };

    const updatedExecutions = [...activeRun.executions];
    updatedExecutions[selectedExecutionIndex] = {
      ...currentExecution,
      humanReview,
    };

    const updatedRun = calculateRunSummary({
      ...activeRun,
      executions: updatedExecutions,
    });

    onSaveTestRun(updatedRun);
    onSetToast(
      status === 'CONFIRMED' ? 'AI Verdict confirmed.' : 'Verdict override recorded.',
      'success'
    );
  };

  // Helper to re-calculate run summary stats
  const calculateRunSummary = (run: TestRun): TestRun => {
    let pass = 0;
    let potentialFailure = 0;
    let needsReview = 0;
    let insufficientEvidence = 0;
    let criticalCount = 0;
    let highCount = 0;

    run.executions.forEach((e) => {
      if (e.status === 'EVALUATED' && e.evaluation) {
        const effectiveVerdict = e.humanReview?.verdictOverride || e.evaluation.verdict;
        if (effectiveVerdict === 'PASS') pass++;
        else if (effectiveVerdict === 'POTENTIAL_FAILURE') potentialFailure++;
        else if (effectiveVerdict === 'NEEDS_REVIEW') needsReview++;
        else if (effectiveVerdict === 'INSUFFICIENT_EVIDENCE') insufficientEvidence++;

        if (e.evaluation.severity === 'CRITICAL') criticalCount++;
        else if (e.evaluation.severity === 'HIGH') highCount++;
      }
    });

    const totalEvaluated = pass + potentialFailure + needsReview + insufficientEvidence;
    const isAllEvaluated = totalEvaluated === run.executions.length && run.executions.length > 0;

    return {
      ...run,
      status: isAllEvaluated ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: isAllEvaluated ? run.completedAt || new Date().toISOString() : undefined,
      summary: {
        total: run.executions.length,
        pass,
        potentialFailure,
        needsReview,
        insufficientEvidence,
        criticalCount,
        highCount,
      },
    };
  };

  // Mark run completed
  const handleFinalizeRun = () => {
    if (!activeRun) return;
    const finalized = calculateRunSummary({
      ...activeRun,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
    onSaveTestRun(finalized);
    onSetToast('Test run completed and audit report generated!', 'success');
    onNavigateToReport(finalized.id);
  };

  // Pre-configured sample bot answers for the current test case
  const sampleResponsesForCurrent = currentExecution
    ? SAMPLE_BOT_RESPONSES[currentExecution.testCaseId] || []
    : [];

  return (
    <div className="space-y-6">
      {/* View Header */}
      {!activeRun ? (
        // ------------------ RUNS LIST VIEW ------------------
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-stone-900">AI Reliability Test Runs</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Execute structured reliability test suites by pasting chatbot responses and
                evaluating evidence with Gemini.
              </p>
            </div>
            <button
              onClick={() => setIsNewRunModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#122B20] hover:bg-[#1B3E2F] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Start New Test Run</span>
            </button>
          </div>

          {/* Test Runs Cards Grid */}
          {testRuns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testRuns.map((run) => {
                const evaluatedCount = run.executions.filter((e) => e.status === 'EVALUATED').length;
                const failureCount = run.executions.filter(
                  (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'POTENTIAL_FAILURE'
                ).length;
                const passCount = run.executions.filter(
                  (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'PASS'
                ).length;

                return (
                  <div
                    key={run.id}
                    className="bg-white rounded-xl p-5 border border-stone-200/80 hover:border-emerald-700/40 shadow-xs transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {run.storeName}
                          </span>
                          <h3 className="text-sm font-bold text-stone-900 mt-1.5 line-clamp-1">
                            {run.name}
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                            run.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {run.status === 'COMPLETED' ? 'Finalized' : 'In Progress'}
                        </span>
                      </div>

                      <div className="text-xs text-stone-500 flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>Started {new Date(run.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Progress meter */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-600 font-medium">Evaluation Progress:</span>
                          <span className="font-semibold text-stone-800">
                            {evaluatedCount} / {run.executions.length} ({Math.round((evaluatedCount / run.executions.length) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{
                              width: `${(evaluatedCount / run.executions.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Results pill summary */}
                      {evaluatedCount > 0 && (
                        <div className="flex items-center gap-2 pt-1 text-[11px]">
                          <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {passCount} Pass
                          </span>
                          {failureCount > 0 && (
                            <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {failureCount} Potential Failures
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Run Actions */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveRunId(run.id);
                          setSelectedExecutionIndex(0);
                        }}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{run.status === 'COMPLETED' ? 'Review Run' : 'Resume Testing'}</span>
                        <ArrowRight size={13} />
                      </button>

                      <div className="flex items-center gap-1.5">
                        {run.status === 'COMPLETED' && (
                          <button
                            onClick={() => onNavigateToReport(run.id)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 rounded hover:bg-stone-100"
                            title="View Audit Report"
                          >
                            <FileCheck2 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete test run "${run.name}"?`)) {
                              onDeleteTestRun(run.id);
                              onSetToast('Test run deleted.', 'info');
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete Run"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-stone-200 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
                <PlaySquare size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">No Test Runs Executed Yet</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                  Start your first test run to evaluate your customer support chatbot. You can test
                  individual answers or run an entire evaluation suite with Gemini.
                </p>
              </div>
              <button
                onClick={() => setIsNewRunModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Launch Test Run</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        // ------------------ INTERACTIVE WORKBENCH VIEW ------------------
        <div className="space-y-4">
          {/* Top Workbench Control Bar */}
          <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveRunId(null)}
                className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                ← All Runs
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-stone-900">{activeRun.name}</h2>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {activeRun.storeName}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {activeRun.executions.filter((e) => e.status === 'EVALUATED').length} of{' '}
                  {activeRun.executions.length} cases evaluated
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBatchEvaluatePending}
                disabled={isBatchEvaluating}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-60"
              >
                <Sparkles size={13} className={isBatchEvaluating ? 'animate-spin' : ''} />
                <span>
                  {isBatchEvaluating ? 'Batch Evaluating...' : 'Evaluate All Pending'}
                </span>
              </button>

              <button
                onClick={handleFinalizeRun}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <FileCheck2 size={14} />
                <span>Finalize & View Report</span>
              </button>
            </div>
          </div>

          {/* Workbench Split View: Cases list (Left) + Evaluation Stage (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 4 Cols: Test Case Nav Drawer */}
            <div className="lg:col-span-4 space-y-2">
              <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Test Cases Queue</span>
                <span className="text-stone-400 font-mono">
                  {selectedExecutionIndex + 1} / {activeRun.executions.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {activeRun.executions.map((exec, idx) => {
                  const isSelected = idx === selectedExecutionIndex;
                  const effectiveVerdict =
                    exec.humanReview?.verdictOverride || exec.evaluation?.verdict;

                  return (
                    <div
                      key={exec.testCaseId}
                      onClick={() => setSelectedExecutionIndex(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                        isSelected
                          ? 'bg-emerald-950 text-white border-emerald-900 shadow-sm'
                          : 'bg-white hover:bg-stone-50 border-stone-200/90 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {exec.testCase.id}
                        </span>

                        {effectiveVerdict ? (
                          <VerdictBadge verdict={effectiveVerdict} size="sm" />
                        ) : exec.status === 'ERROR' ? (
                          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">
                            Error
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-medium ${
                              isSelected ? 'text-emerald-300' : 'text-stone-400'
                            }`}
                          >
                            Untested
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isSelected ? 'text-stone-100' : 'text-stone-700'
                        }`}
                      >
                        "{exec.testCase.question}"
                      </p>

                      <div
                        className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                          isSelected ? 'border-emerald-900 text-emerald-300' : 'border-stone-100 text-stone-400'
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{exec.testCase.category}</span>
                        <RiskBadge level={exec.testCase.riskLevel} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Main Interactive Evaluation Workspace */}
            {currentExecution && (
              <div className="lg:col-span-8 space-y-4">
                {/* 1. Customer Scenario & Policy Ground Truth Card */}
                <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {currentExecution.testCase.id}
                        </span>
                        <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {currentExecution.testCase.category}
                        </span>
                        {currentExecution.testCase.requiresEscalation && (
                          <span className="text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium">
                            Mandatory Escalation
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-stone-900 mt-2">
                        "{currentExecution.testCase.question}"
                      </h3>
                    </div>
                    <RiskBadge level={currentExecution.testCase.riskLevel} />
                  </div>

                  {/* Ground Truth & Expected Criteria Box */}
                  <div className="bg-stone-50 rounded-lg p-3.5 border border-stone-200/70 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
                        Expected Response Criteria:
                      </span>
                      <p className="text-stone-800 leading-relaxed font-medium">
                        {currentExecution.testCase.expectedCriteria}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 flex items-start gap-1.5 text-stone-600">
                      <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-stone-800">Source Ground Truth:</strong>{' '}
                        {currentExecution.testCase.sourcePolicy}
                      </span>
                    </div>

                    {currentExecution.testCase.sourceExcerpt && (
                      <p className="text-[11px] text-stone-500 italic bg-white p-2 rounded border border-stone-200/60">
                        "{currentExecution.testCase.sourceExcerpt}"
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Chatbot Answer Input Section */}
                <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span>Chatbot's Actual Response (Untrusted Content)</span>
                      <span className="text-stone-400 font-normal text-[11px]">
                        — Paste or type below
                      </span>
                    </label>

                    {/* Quick Sample Selector */}
                    {sampleResponsesForCurrent.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-stone-400 text-[11px]">Quick-test:</span>
                        <div className="flex items-center gap-1">
                          {sampleResponsesForCurrent.map((sample, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSelectSampleResponse(sample.answer)}
                              className={`text-[10px] px-2 py-1 rounded border font-medium cursor-pointer transition ${
                                sample.type === 'PASS'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={sample.description}
                            >
                              {sample.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={currentExecution.chatbotAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Paste the customer support chatbot's exact generated reply here..."
                    className="w-full text-xs font-sans p-3 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-stone-50/40"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-stone-400">
                      {currentExecution.chatbotAnswer.length} characters entered
                    </div>

                    <button
                      onClick={handleEvaluateCurrentAnswer}
                      disabled={
                        evaluatingTestId === currentExecution.testCaseId ||
                        !currentExecution.chatbotAnswer.trim()
                      }
                      className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Sparkles
                        size={14}
                        className={
                          evaluatingTestId === currentExecution.testCaseId ? 'animate-spin' : ''
                        }
                      />
                      <span>
                        {evaluatingTestId === currentExecution.testCaseId
                          ? 'Evaluating with Gemini...'
                          : 'Analyze with Gemini'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Evaluation Result & Findings Card */}
                {currentExecution.evaluation ? (
                  <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
                    {/* Verdict Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-stone-50 border border-stone-200">
                      <div className="flex items-center gap-3">
                        <VerdictBadge verdict={currentExecution.evaluation.verdict} size="lg" />
                        <RiskBadge level={currentExecution.evaluation.severity} type="severity" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-stone-500">Confidence:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${currentExecution.evaluation.confidence}%` }}
                            />
                          </div>
                          <span className="font-bold text-stone-800">
                            {currentExecution.evaluation.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Short Explanation */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Evaluation Analysis
                      </h4>
                      <p className="text-xs text-stone-800 leading-relaxed font-medium">
                        {currentExecution.evaluation.shortExplanation}
                      </p>
                    </div>

                    {/* Unsupported / Contradictory Claims */}
                    {currentExecution.evaluation.unsupportedClaims &&
                      currentExecution.evaluation.unsupportedClaims.length > 0 && (
                        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1.5 text-xs">
                          <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                            <AlertOctagon size={14} className="text-rose-700" />
                            <span>Flagged Discrepancies & Contradictions:</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-rose-800 pl-1">
                            {currentExecution.evaluation.unsupportedClaims.map((claim, cIdx) => (
                              <li key={cIdx} className="leading-relaxed">
                                {claim}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Supporting Policy Quote */}
                    {currentExecution.evaluation.supportingQuotation &&
                      currentExecution.evaluation.supportingQuotation !== 'No direct supporting policy found' && (
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1 text-xs">
                          <span className="font-semibold text-stone-700 block">
                            Direct Policy Citation:
                          </span>
                          <blockquote className="italic text-stone-700 border-l-2 border-emerald-600 pl-2.5 my-1">
                            "{currentExecution.evaluation.supportingQuotation}"
                          </blockquote>
                          <span className="text-[11px] text-stone-500">
                            Section: {currentExecution.evaluation.relevantSourcePolicy}
                          </span>
                        </div>
                      )}

                    {/* Suggested Correction & Action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/70 space-y-1">
                        <span className="font-semibold text-emerald-950 block">
                          Suggested Compliant Phrasing:
                        </span>
                        <p className="text-emerald-900 leading-relaxed text-[11px]">
                          "{currentExecution.evaluation.suggestedCorrection}"
                        </p>
                      </div>

                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                        <span className="font-semibold text-stone-900 block">
                          Recommended Next Action:
                        </span>
                        <p className="text-stone-700 leading-relaxed text-[11px]">
                          {currentExecution.evaluation.recommendedNextAction}
                        </p>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="p-2.5 bg-stone-100/60 rounded-md text-[10px] text-stone-500 flex items-start gap-1.5">
                      <Info size={13} className="text-stone-400 shrink-0 mt-0.5" />
                      <span>{currentExecution.evaluation.disclaimer}</span>
                    </div>

                    {/* 4. Human Review & Decision Override Panel */}
                    <div className="pt-4 border-t border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <UserCheck size={15} className="text-emerald-800" />
                          <span>Human QA Review & Decision Override</span>
                        </h4>
                        {currentExecution.humanReview?.status && (
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              currentExecution.humanReview.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            Review: {currentExecution.humanReview.status}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-medium text-stone-600 block mb-1">
                            Reviewer Notes / Evidence Log:
                          </label>
                          <input
                            type="text"
                            value={humanReviewerNotes}
                            onChange={(e) => setHumanReviewerNotes(e.target.value)}
                            placeholder="Add human reviewer observations or override rationale..."
                            className="w-full text-xs p-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-stone-600 block mb-1">
                            Override Verdict:
                          </label>
                          <select
                            value={humanOverrideVerdict}
                            onChange={(e) =>
                              setHumanOverrideVerdict(e.target.value as Verdict | '')
                            }
                            className="w-full text-xs p-2 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                          >
                            <option value="">Keep AI Verdict</option>
                            <option value="PASS">Override to PASS</option>
                            <option value="POTENTIAL_FAILURE">Override to FAILURE</option>
                            <option value="NEEDS_REVIEW">Override to NEEDS REVIEW</option>
                            <option value="INSUFFICIENT_EVIDENCE">
                              Override to INSUFFICIENT EVIDENCE
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveHumanReview('CONFIRMED')}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                        >
                          Confirm AI Verdict
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveHumanReview('OVERRIDDEN')}
                          disabled={!humanOverrideVerdict}
                          className="px-3 py-1.5 text-xs font-medium text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition disabled:opacity-40"
                        >
                          Save Override
                        </button>
                      </div>
                    </div>
                  </div>
                ) : currentExecution.status === "ERROR" ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                      <AlertCircle size={18} className="text-rose-600 shrink-0" />
                      <span>Analysis Could Not Complete</span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed bg-white/80 p-3 rounded-lg border border-rose-200 font-mono">
                      {currentExecution.errorMessage || "The AI evaluation engine was unable to evaluate this response."}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                      <span className="text-stone-500">
                        Check server logs or verify your internet connection.
                      </span>
                      <button
                        onClick={handleEvaluateCurrentAnswer}
                        disabled={evaluatingTestId === currentExecution.testCaseId}
                        className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer shrink-0"
                      >
                        {evaluatingTestId === currentExecution.testCaseId ? "Retrying..." : "Retry Analysis"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50/60 rounded-xl p-8 text-center border border-stone-200/70 space-y-2">
                    <p className="text-xs text-stone-500">
                      No evaluation recorded yet for this response. Paste the chatbot's answer and
                      click <strong>"Evaluate Answer with Gemini"</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Test Run Modal */}
      {isNewRunModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-stone-200 p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Start New Test Run</h3>
                <p className="text-xs text-stone-500">
                  Select a store and choose test cases to evaluate.
                </p>
              </div>
              <button
                onClick={() => setIsNewRunModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="flex-1 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Select Store *</label>
                <select
                  value={newRunStoreId}
                  onChange={(e) => setNewRunStoreId(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isSample ? '(Sample Store)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Test Run Name *</label>
                <input
                  type="text"
                  required
                  value={newRunName}
                  onChange={(e) => setNewRunName(e.target.value)}
                  placeholder="e.g. Q4 Chatbot Reliability Audit"
                  className="w-full p-2.5 border border-stone-300 rounded-lg outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Test Cases Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-stone-700">
                    Included Test Cases ({selectedTestCaseIds.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = getTestCasesForStore(newRunStoreId).map((c) => c.id);
                      if (selectedTestCaseIds.length === allIds.length) {
                        setSelectedTestCaseIds([]);
                      } else {
                        setSelectedTestCaseIds(allIds);
                      }
                    }}
                    className="text-emerald-800 hover:underline font-medium text-[11px]"
                  >
                    {selectedTestCaseIds.length === getTestCasesForStore(newRunStoreId).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-2 space-y-1.5 bg-stone-50/50">
                  {getTestCasesForStore(newRunStoreId).map((tc) => (
                    <label
                      key={tc.id}
                      className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTestCaseIds.includes(tc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTestCaseIds([...selectedTestCaseIds, tc.id]);
                          } else {
                            setSelectedTestCaseIds(
                              selectedTestCaseIds.filter((id) => id !== tc.id)
                            );
                          }
                        }}
                        className="rounded text-emerald-800 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-stone-500">
                            {tc.id}
                          </span>
                          <span className="text-[10px] font-medium text-emerald-800 truncate">
                            {tc.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-700 truncate mt-0.5">
                          "{tc.question}"
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRunModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-700 shadow-xs"
                >
                  Create & Launch Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
