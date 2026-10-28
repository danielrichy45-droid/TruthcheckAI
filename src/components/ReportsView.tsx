import React, { useState } from 'react';
import { TestRun, StoreProfile, Verdict } from '../types';
import {
  FileCheck2,
  Download,
  Printer,
  Calendar,
  Store,
  Layers,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Search,
  Filter,
  ExternalLink,
  Info,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';
import { RiskBadge } from './RiskBadge';

interface Props {
  testRuns: TestRun[];
  stores: StoreProfile[];
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
  onSetToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportsView: React.FC<Props> = ({
  testRuns,
  stores,
  selectedRunId,
  setSelectedRunId,
  onSetToast,
}) => {
  const [filterVerdict, setFilterVerdict] = useState<Verdict | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentRun = testRuns.find((r) => r.id === selectedRunId) || testRuns[0] || null;
  const currentStore = currentRun
    ? stores.find((s) => s.id === currentRun.storeId)
    : null;

  // CSV Export implementation
  const handleExportCSV = (run: TestRun) => {
    if (!run) return;

    const headers = [
      'Test ID',
      'Category',
      'Risk Level',
      'Customer Question',
      'Chatbot Answer',
      'AI Verdict',
      'Human Override',
      'Final Verdict',
      'Severity',
      'Confidence',
      'Explanation',
      'Discrepancies / Unsupported Claims',
      'Source Policy Reference',
      'Supporting Policy Quotation',
      'Suggested Correction',
      'Recommended Action',
      'Reviewer Notes',
      'Evaluation Date',
    ];

    const escapeCSV = (str: string | undefined | null) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = run.executions.map((e) => {
      const finalVerdict = e.humanReview?.verdictOverride || e.evaluation?.verdict || 'UNTESTED';
      return [
        escapeCSV(e.testCase.id),
        escapeCSV(e.testCase.category),
        escapeCSV(e.testCase.riskLevel),
        escapeCSV(e.testCase.question),
        escapeCSV(e.chatbotAnswer),
        escapeCSV(e.evaluation?.verdict || 'UNTESTED'),
        escapeCSV(e.humanReview?.verdictOverride || 'NONE'),
        escapeCSV(finalVerdict),
        escapeCSV(e.evaluation?.severity || 'N/A'),
        escapeCSV(e.evaluation?.confidence ? `${e.evaluation.confidence}%` : 'N/A'),
        escapeCSV(e.evaluation?.shortExplanation || ''),
        escapeCSV(e.evaluation?.unsupportedClaims?.join('; ') || ''),
        escapeCSV(e.evaluation?.relevantSourcePolicy || e.testCase.sourcePolicy),
        escapeCSV(e.evaluation?.supportingQuotation || ''),
        escapeCSV(e.evaluation?.suggestedCorrection || ''),
        escapeCSV(e.evaluation?.recommendedNextAction || ''),
        escapeCSV(e.humanReview?.reviewerNotes || ''),
        escapeCSV(e.evaluation?.evaluatedAt || run.createdAt),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = run.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `truthcheck_${safeName}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onSetToast('CSV report downloaded successfully.', 'success');
  };

  // Print PDF Trigger
  const handlePrintReport = () => {
    window.print();
  };

  if (!currentRun) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-stone-200 space-y-3">
        <FileCheck2 size={24} className="mx-auto text-stone-400" />
        <h3 className="text-base font-bold text-stone-900">No Reports Available</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Complete a test run to generate executive audit reports and download CSV data.
        </p>
      </div>
    );
  }

  // Filter executions for report table
  const filteredExecutions = currentRun.executions.filter((e) => {
    const finalVerdict = e.humanReview?.verdictOverride || e.evaluation?.verdict;
    if (filterVerdict !== 'ALL' && finalVerdict !== filterVerdict) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQ = e.testCase.question.toLowerCase().includes(q);
      const matchA = e.chatbotAnswer.toLowerCase().includes(q);
      const matchCat = e.testCase.category.toLowerCase().includes(q);
      const matchId = e.testCase.id.toLowerCase().includes(q);
      return matchQ || matchA || matchCat || matchId;
    }
    return true;
  });

  const totalCases = currentRun.executions.length;
  const evaluatedCases = currentRun.executions.filter((e) => e.status === 'EVALUATED');
  const passCount = evaluatedCases.filter(
    (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'PASS'
  ).length;
  const failureCount = evaluatedCases.filter(
    (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'POTENTIAL_FAILURE'
  ).length;
  const needsReviewCount = evaluatedCases.filter(
    (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'NEEDS_REVIEW'
  ).length;
  const insufficientCount = evaluatedCases.filter(
    (e) => (e.humanReview?.verdictOverride || e.evaluation?.verdict) === 'INSUFFICIENT_EVIDENCE'
  ).length;

  const passRate =
    evaluatedCases.length > 0 ? Math.round((passCount / evaluatedCases.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Run Selector & Export Bar */}
      <div className="no-print bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-600 shrink-0">Selected Audit:</span>
          <select
            value={currentRun.id}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 outline-hidden cursor-pointer max-w-sm truncate"
          >
            {testRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.storeName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCSV(currentRun)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#122B20] hover:bg-[#1B3E2F] rounded-lg transition cursor-pointer shadow-xs"
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Printable Report Sheet */}
      <div className="print-container bg-white rounded-xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Report Header */}
        <div className="border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-800 text-white px-2 py-0.5 rounded">
                TruthCheck AI Audit Report
              </span>
              <span className="text-xs text-stone-400">ID: {currentRun.id}</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-2">
              {currentRun.name}
            </h2>
            <div className="flex items-center gap-4 text-xs text-stone-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Store size={13} className="text-emerald-800" />
                <strong>{currentRun.storeName}</strong> ({currentStore?.country},{' '}
                {currentStore?.currency})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                <span>Audited on {new Date(currentRun.createdAt).toLocaleDateString()}</span>
              </span>
              <span>•</span>
              <span>
                Status:{' '}
                <strong className="text-stone-800">
                  {currentRun.status === 'COMPLETED' ? 'Finalized' : 'In Progress'}
                </strong>
              </span>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-2xl font-bold text-emerald-800">{passRate}%</div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Reliability Score
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {evaluatedCases.length} of {totalCases} cases tested
            </div>
          </div>
        </div>

        {/* Executive Verdict Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="font-semibold">Pass</span>
              <CheckCircle2 size={16} />
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{passCount}</div>
            <p className="text-[11px] text-emerald-700 mt-0.5">Fully compliant with store policy</p>
          </div>

          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200/80">
            <div className="flex items-center justify-between text-rose-800">
              <span className="font-semibold">Potential Failures</span>
              <AlertOctagon size={16} />
            </div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{failureCount}</div>
            <p className="text-[11px] text-rose-700 mt-0.5">Direct contradictions or inventions</p>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/80">
            <div className="flex items-center justify-between text-amber-800">
              <span className="font-semibold">Needs Review</span>
              <AlertTriangle size={16} />
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{needsReviewCount}</div>
            <p className="text-[11px] text-amber-700 mt-0.5">Edge cases or ambiguous answers</p>
          </div>

          <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200/80">
            <div className="flex items-center justify-between text-sky-800">
              <span className="font-semibold">Insufficient Evidence</span>
              <HelpCircle size={16} />
            </div>
            <div className="text-2xl font-bold text-sky-900 mt-1">{insufficientCount}</div>
            <p className="text-[11px] text-sky-700 mt-0.5">Undocumented factual claims</p>
          </div>
        </div>

        {/* Filters bar (hidden during print) */}
        <div className="no-print pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-stone-400 font-medium mr-1">Filter Verdict:</span>
            {(['ALL', 'PASS', 'POTENTIAL_FAILURE', 'NEEDS_REVIEW', 'INSUFFICIENT_EVIDENCE'] as const).map(
              (verdict) => (
                <button
                  key={verdict}
                  onClick={() => setFilterVerdict(verdict)}
                  className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition whitespace-nowrap ${
                    filterVerdict === verdict
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {verdict.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions or answers..."
              className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs outline-hidden focus:border-emerald-700"
            />
            <Search size={14} className="absolute left-2.5 top-2 text-stone-400" />
          </div>
        </div>

        {/* Detailed Evaluation Findings Table */}
        <div className="space-y-4 pt-1">
          <h3 className="text-sm font-bold text-stone-900">
            Detailed Test Case Findings ({filteredExecutions.length})
          </h3>

          <div className="space-y-4">
            {filteredExecutions.map((exec, idx) => {
              const effectiveVerdict =
                exec.humanReview?.verdictOverride || exec.evaluation?.verdict;

              return (
                <div
                  key={exec.testCaseId}
                  className="rounded-xl border border-stone-200/90 p-4 space-y-3 bg-stone-50/30 break-inside-avoid"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {exec.testCase.id}
                      </span>
                      <span className="text-xs font-semibold text-stone-800">
                        {exec.testCase.category}
                      </span>
                      <RiskBadge level={exec.testCase.riskLevel} />
                    </div>

                    <div className="flex items-center gap-2">
                      {effectiveVerdict ? (
                        <VerdictBadge verdict={effectiveVerdict} size="md" />
                      ) : (
                        <span className="text-xs text-stone-400">Untested</span>
                      )}
                      {exec.evaluation && (
                        <RiskBadge level={exec.evaluation.severity} type="severity" />
                      )}
                    </div>
                  </div>

                  {/* Customer Question */}
                  <div className="text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Customer Question / Scenario:
                    </span>
                    <p className="font-medium text-stone-900 italic bg-white p-2.5 rounded border border-stone-200/80">
                      "{exec.testCase.question}"
                    </p>
                  </div>

                  {/* Chatbot Response */}
                  <div className="text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Pasted Chatbot Answer:
                    </span>
                    <p className="text-stone-800 bg-white p-2.5 rounded border border-stone-200/80 leading-relaxed">
                      {exec.chatbotAnswer || (
                        <span className="text-stone-400 italic">No answer provided</span>
                      )}
                    </p>
                  </div>

                  {/* Evaluation Analysis */}
                  {exec.evaluation && (
                    <div className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                          Evaluation Finding ({exec.evaluation.confidence}% Confidence):
                        </span>
                        <p className="text-stone-800 leading-relaxed font-medium mt-0.5">
                          {exec.evaluation.shortExplanation}
                        </p>
                      </div>

                      {/* Unsupported Claims */}
                      {exec.evaluation.unsupportedClaims &&
                        exec.evaluation.unsupportedClaims.length > 0 && (
                          <div className="p-2 bg-rose-50 rounded border border-rose-200 text-rose-900 text-[11px]">
                            <strong>Discrepancies:</strong>{' '}
                            {exec.evaluation.unsupportedClaims.join('; ')}
                          </div>
                        )}

                      {/* Citation */}
                      {exec.evaluation.supportingQuotation &&
                        exec.evaluation.supportingQuotation !== 'No direct supporting policy found' && (
                          <div className="text-[11px] text-stone-600">
                            <strong>Source Citation:</strong> "{exec.evaluation.supportingQuotation}"
                            ({exec.evaluation.relevantSourcePolicy})
                          </div>
                        )}

                      {/* Suggested correction */}
                      {exec.evaluation.suggestedCorrection && (
                        <div className="text-[11px] text-emerald-950 bg-emerald-50/60 p-2 rounded border border-emerald-200/60">
                          <strong>Recommended Correction:</strong> "
                          {exec.evaluation.suggestedCorrection}"
                        </div>
                      )}

                      {/* Human override badge */}
                      {exec.humanReview?.status && (
                        <div className="text-[11px] text-purple-950 bg-purple-50 p-2 rounded border border-purple-200 flex items-center justify-between">
                          <span>
                            <strong>Human QA Review:</strong> {exec.humanReview.status}
                            {exec.humanReview.verdictOverride
                              ? ` (Overridden to ${exec.humanReview.verdictOverride})`
                              : ''}
                          </span>
                          {exec.humanReview.reviewerNotes && (
                            <span className="italic text-purple-800 truncate max-w-xs">
                              Note: {exec.humanReview.reviewerNotes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Limitations & Legal AI QA Disclaimer */}
        <div className="pt-6 border-t border-stone-200 text-xs text-stone-500 space-y-1.5 bg-stone-50 p-4 rounded-xl">
          <div className="flex items-center gap-1.5 font-semibold text-stone-700">
            <Info size={14} className="text-emerald-800" />
            <span>Audit Limitations & Evaluation Methodology</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            TruthCheck AI evaluates customer support chatbot responses by applying automated
            evaluations using Google Gemini against the explicit policy documents provided. Findings
            highlight potential factual discrepancies, unsupported commitments, or policy deviations
            relative strictly to the supplied text. Because customer context and legal interpretations
            vary, all AI-generated findings must undergo final human QA review before altering
            customer compensation or production chatbot prompt guardrails.
          </p>
        </div>
      </div>
    </div>
  );
};
