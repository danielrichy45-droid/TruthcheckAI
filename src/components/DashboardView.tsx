import React from 'react';
import {
  Store,
  PlaySquare,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Clock,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { StoreProfile, TestRun } from '../types';
import { VerdictBadge } from './VerdictBadge';

interface Props {
  stores: StoreProfile[];
  testRuns: TestRun[];
  onNavigateToRuns: () => void;
  onNavigateToStores: () => void;
  onStartSampleTest: () => void;
  onOpenTestRun: (runId: string) => void;
  onOpenReport: (runId: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  stores,
  testRuns,
  onNavigateToRuns,
  onNavigateToStores,
  onStartSampleTest,
  onOpenTestRun,
  onOpenReport,
}) => {
  // Aggregate real statistics derived exclusively from saved data
  const totalStores = stores.length;
  const totalTestRuns = testRuns.length;

  let totalEvaluatedTests = 0;
  let passCount = 0;
  let failureCount = 0;
  let needsReviewCount = 0;
  let insufficientEvidenceCount = 0;
  let criticalCount = 0;
  let highCount = 0;

  const categoryFailureMap: Record<string, { total: number; failures: number }> = {};

  testRuns.forEach((run) => {
    run.executions.forEach((exec) => {
      if (exec.status === 'EVALUATED' && exec.evaluation) {
        totalEvaluatedTests++;
        const effectiveVerdict = exec.humanReview?.verdictOverride || exec.evaluation.verdict;

        if (effectiveVerdict === 'PASS') passCount++;
        else if (effectiveVerdict === 'POTENTIAL_FAILURE') failureCount++;
        else if (effectiveVerdict === 'NEEDS_REVIEW') needsReviewCount++;
        else if (effectiveVerdict === 'INSUFFICIENT_EVIDENCE') insufficientEvidenceCount++;

        const category = exec.testCase.category || 'General';
        if (!categoryFailureMap[category]) {
          categoryFailureMap[category] = { total: 0, failures: 0 };
        }
        categoryFailureMap[category].total++;
        if (effectiveVerdict === 'POTENTIAL_FAILURE') {
          categoryFailureMap[category].failures++;
        }

        if (exec.evaluation.severity === 'CRITICAL') criticalCount++;
        else if (exec.evaluation.severity === 'HIGH') highCount++;
      }
    });
  });

  const passRate =
    totalEvaluatedTests > 0 ? Math.round((passCount / totalEvaluatedTests) * 100) : 0;

  const failureCategories = Object.entries(categoryFailureMap)
    .sort((a, b) => b[1].failures - a[1].failures)
    .slice(0, 5);

  const sampleStore = stores.find((s) => s.isSample);
  const recentRuns = [...testRuns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Sample Store Quick Onboarding Banner */}
      {totalEvaluatedTests === 0 && (
        <div className="bg-gradient-to-r from-[#122B20] to-[#1E4333] rounded-xl p-5 text-white shadow-sm border border-[#275340]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                <Sparkles size={12} />
                <span>Ready to Test Immediately</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                Evaluate Your First AI Chatbot Response with TruthCheck
              </h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                We have pre-configured a sample store — <strong>Apex Ridge Outfitters</strong> — with
                rigorous shipping, return, warranty, and escalation policies. You can launch a test
                run right now, paste sample chatbot answers (both compliant and hallucinated), and
                watch Gemini evaluate factual accuracy against real policy evidence.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onStartSampleTest}
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Launch Sample Test Run</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stores */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Configured Stores</span>
            <div className="p-1.5 bg-stone-100 rounded-md text-stone-600">
              <Store size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{totalStores}</span>
            <span className="text-xs text-stone-400">
              ({stores.filter((s) => !s.isSample).length} custom)
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Across US, UK, CA, and AU</p>
        </div>

        {/* Metric 2: Test Runs */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Total Test Runs</span>
            <div className="p-1.5 bg-stone-100 rounded-md text-stone-600">
              <PlaySquare size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{totalTestRuns}</span>
            <span className="text-xs text-stone-400">runs saved</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {testRuns.filter((r) => r.status === 'COMPLETED').length} finalized audits
          </p>
        </div>

        {/* Metric 3: Tests Evaluated */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Tests Evaluated</span>
            <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-700">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{totalEvaluatedTests}</span>
            {totalEvaluatedTests > 0 && (
              <span className="text-xs font-semibold text-emerald-700">{passRate}% Pass Rate</span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {totalEvaluatedTests === 0 ? 'No tests evaluated yet' : 'Real-time Gemini audits'}
          </p>
        </div>

        {/* Metric 4: Discrepancies Caught */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Potential Failures</span>
            <div className="p-1.5 bg-rose-50 rounded-md text-rose-700">
              <AlertOctagon size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{failureCount}</span>
            {criticalCount > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                {criticalCount} Critical
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Policy contradictions & hallucinated claims
          </p>
        </div>
      </div>

      {/* Secondary Verdict Breakdown Bar */}
      {totalEvaluatedTests > 0 && (
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Evaluation Verdict Distribution</h3>
              <p className="text-xs text-stone-500">
                Aggregated outcomes across all completed and ongoing test runs
              </p>
            </div>
            <span className="text-xs font-medium text-stone-600">
              {totalEvaluatedTests} Total Responses Evaluated
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full rounded-full bg-stone-100 flex overflow-hidden">
            <div
              style={{ width: `${(passCount / totalEvaluatedTests) * 100}%` }}
              className="bg-emerald-600 transition-all"
              title={`Pass: ${passCount}`}
            />
            <div
              style={{ width: `${(failureCount / totalEvaluatedTests) * 100}%` }}
              className="bg-rose-600 transition-all"
              title={`Potential Failure: ${failureCount}`}
            />
            <div
              style={{ width: `${(needsReviewCount / totalEvaluatedTests) * 100}%` }}
              className="bg-amber-500 transition-all"
              title={`Needs Review: ${needsReviewCount}`}
            />
            <div
              style={{ width: `${(insufficientEvidenceCount / totalEvaluatedTests) * 100}%` }}
              className="bg-sky-500 transition-all"
              title={`Insufficient Evidence: ${insufficientEvidenceCount}`}
            />
          </div>

          {/* Legend Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-stone-600">Pass:</span>
              <strong className="text-stone-900">{passCount}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              <span className="text-stone-600">Potential Failure:</span>
              <strong className="text-rose-700">{failureCount}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-stone-600">Needs Review:</span>
              <strong className="text-amber-700">{needsReviewCount}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="text-stone-600">Insufficient Evidence:</span>
              <strong className="text-sky-700">{insufficientEvidenceCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Split: Failure Breakdown & Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Risk Breakdown or Empty State */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Failure Breakdown by Category</h3>
                <p className="text-xs text-stone-500">
                  Where ecommerce chatbots fail store policies most frequently
                </p>
              </div>
              <span className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">
                Risk Analysis
              </span>
            </div>

            {failureCategories.length > 0 ? (
              <div className="space-y-3.5">
                {failureCategories.map(([cat, stats]) => {
                  const failureRate =
                    stats.total > 0 ? Math.round((stats.failures / stats.total) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-800">{cat}</span>
                        <div className="flex items-center gap-2 text-stone-500">
                          <span className="font-semibold text-rose-700">
                            {stats.failures} failure{stats.failures === 1 ? '' : 's'}
                          </span>
                          <span>/ {stats.total} tested</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.max(5, failureRate)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-stone-800">No Failure Data Yet</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                    Once you evaluate chatbot responses in a test run, this chart displays the top
                    policy areas where contradictions and over-promises occur.
                  </p>
                </div>
                <button
                  onClick={onStartSampleTest}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-medium hover:text-emerald-900"
                >
                  <span>Run sample test to populate metrics</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Evaluations powered by Google Gemini 3.8 Flash</span>
            <button
              onClick={onNavigateToRuns}
              className="text-emerald-800 hover:text-emerald-900 font-medium flex items-center gap-1"
            >
              <span>View All Test Runs</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Right Col: Recent Test Runs */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-stone-900">Recent Test Runs</h3>
              <span className="text-[11px] text-stone-400 font-medium">{testRuns.length} total</span>
            </div>

            {recentRuns.length > 0 ? (
              <div className="space-y-2.5">
                {recentRuns.map((run) => {
                  const testedCount = run.executions.filter((e) => e.status === 'EVALUATED').length;
                  const failuresInRun = run.executions.filter(
                    (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'POTENTIAL_FAILURE'
                  ).length;

                  return (
                    <div
                      key={run.id}
                      onClick={() => onOpenTestRun(run.id)}
                      className="p-3 rounded-lg border border-stone-200 hover:border-emerald-600/50 hover:bg-stone-50/60 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition">
                            {run.name}
                          </h4>
                          <p className="text-[11px] text-stone-500 truncate mt-0.5">
                            {run.storeName}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            run.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {run.status === 'COMPLETED' ? 'Finalized' : 'In Progress'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 text-[11px] text-stone-500">
                        <span>
                          {testedCount}/{run.executions.length} evaluated
                        </span>
                        {failuresInRun > 0 ? (
                          <span className="text-rose-700 font-medium">
                            {failuresInRun} failure{failuresInRun === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">0 failures</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Clock size={20} className="mx-auto text-stone-400" />
                <p className="text-xs text-stone-500">No test runs executed yet.</p>
                <button
                  onClick={onStartSampleTest}
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-medium"
                >
                  Create your first test run →
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-stone-100">
            <button
              onClick={onNavigateToStores}
              className="w-full text-center text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Manage Store Profiles & Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
