import { StoreProfile, TestCase, EvaluationResult } from "../types";

export interface HealthResponse {
  status: string;
  geminiConfigured: boolean;
  timestamp: string;
}

export class ApiService {
  public static async checkHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        status: "error",
        geminiConfigured: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public static async generateTestCases(
    store: StoreProfile,
    count: number = 10,
    categories?: string[]
  ): Promise<TestCase[]> {
    try {
      const res = await fetch("/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, count, categories }),
        signal: AbortSignal.timeout(28000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate test cases (${res.status})`);
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.testCases)) {
        throw new Error("Invalid response format received from test generation server.");
      }
      return data.testCases;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
        throw new Error("Test case generation timed out after 28 seconds. Please try again.");
      }
      throw err;
    }
  }

  public static async evaluateAnswer(
    store: StoreProfile,
    testCase: TestCase,
    chatbotAnswer: string
  ): Promise<EvaluationResult> {
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, testCase, chatbotAnswer }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server evaluation failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.evaluation) {
        throw new Error("Server did not return a valid evaluation result.");
      }

      // Check required fields
      const ev = data.evaluation;
      if (!ev.verdict || !ev.severity) {
        throw new Error("Evaluation response is missing required verdict or severity.");
      }

      return ev as EvaluationResult;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
        throw new Error("Analysis timed out after 25 seconds. Gemini API was slow to respond. Please try again.");
      }
      throw err;
    }
  }

  public static async batchEvaluate(
    store: StoreProfile,
    items: { testCaseId: string; testCase: TestCase; chatbotAnswer: string }[]
  ): Promise<{ testCaseId: string; evaluation?: EvaluationResult; error?: string }[]> {
    try {
      const res = await fetch("/api/batch-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, items }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Batch evaluation failed (${res.status})`);
      }

      const data = await res.json();
      return data.results || [];
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
        throw new Error("Batch evaluation timed out. Please evaluate fewer items or try again.");
      }
      throw err;
    }
  }
}
