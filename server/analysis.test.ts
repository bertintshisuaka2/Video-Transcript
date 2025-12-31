import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("analysis.analyzeText", () => {
  it("should analyze text with a custom prompt", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analysis.analyzeText({
      text: "The quick brown fox jumps over the lazy dog. This is a sample text for testing AI analysis.",
      prompt: "What is the main subject of this text?",
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeTruthy();
    expect(typeof result.analysis).toBe("string");
    expect(result.analysis.length).toBeGreaterThan(0);
  }, 30000);

  it("should analyze text without a prompt", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analysis.analyzeText({
      text: "Artificial intelligence is transforming the world. Machine learning algorithms are becoming more sophisticated every day.",
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeTruthy();
    expect(typeof result.analysis).toBe("string");
  }, 30000);

  it("should handle conversation history", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analysis.analyzeText({
      text: "Climate change is a global challenge that requires immediate action.",
      prompt: "What are the key themes?",
      conversationHistory: [
        { role: "user", content: "Tell me about this text" },
        { role: "assistant", content: "This text discusses climate change." },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeTruthy();
  }, 30000);

  it("should handle long text by truncating", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a very long text (more than 4000 characters)
    const longText = "This is a test sentence. ".repeat(200);

    const result = await caller.analysis.analyzeText({
      text: longText,
      prompt: "Summarize this text",
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeTruthy();
  }, 30000);
});
