import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createTranscript } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("transcript history", () => {
  let testTranscriptId: number;

  beforeAll(async () => {
    // Create test transcripts
    const transcript1 = await createTranscript({
      userId: 1,
      videoId: "test456",
      videoUrl: "https://www.youtube.com/watch?v=test456",
      videoTitle: "Test Video for History",
      sourceType: "youtube",
      originalLanguage: "en",
      transcriptText: "This is a test transcript for history testing.",
    });
    testTranscriptId = transcript1.id;

    await createTranscript({
      userId: 1,
      videoId: null,
      videoUrl: null,
      videoTitle: "Uploaded Test File",
      sourceType: "upload",
      originalLanguage: "en",
      transcriptText: "This is an uploaded file transcript.",
    });
  });

  it("should retrieve user transcript history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const history = await caller.transcript.getHistory();

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    
    // Verify structure of history items
    const firstItem = history[0];
    expect(firstItem).toHaveProperty("id");
    expect(firstItem).toHaveProperty("userId");
    expect(firstItem).toHaveProperty("transcriptText");
    expect(firstItem).toHaveProperty("sourceType");
    expect(firstItem).toHaveProperty("createdAt");
  });

  it("should retrieve specific transcript by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const transcript = await caller.transcript.getById({
      id: testTranscriptId,
    });

    expect(transcript).toBeDefined();
    expect(transcript.id).toBe(testTranscriptId);
    expect(transcript.userId).toBe(1);
    expect(transcript.videoTitle).toBe("Test Video for History");
  });

  it("should delete transcript successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a transcript to delete
    const toDelete = await createTranscript({
      userId: 1,
      videoId: "delete-test",
      videoUrl: "https://www.youtube.com/watch?v=delete-test",
      videoTitle: "To Be Deleted",
      sourceType: "youtube",
      originalLanguage: "en",
      transcriptText: "This transcript will be deleted.",
    });

    const result = await caller.transcript.delete({
      id: toDelete.id,
    });

    expect(result.success).toBe(true);

    // Verify it's deleted
    await expect(
      caller.transcript.getById({ id: toDelete.id })
    ).rejects.toThrow("Transcript not found");
  });

  it("should not allow accessing another user's transcript", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a transcript for a different user
    const otherUserTranscript = await createTranscript({
      userId: 999, // Different user ID
      videoId: "other-user",
      videoUrl: "https://www.youtube.com/watch?v=other-user",
      videoTitle: "Other User's Video",
      sourceType: "youtube",
      originalLanguage: "en",
      transcriptText: "This belongs to another user.",
    });

    // Try to access it with user ID 1 - should throw
    await expect(
      caller.transcript.getById({
        id: otherUserTranscript.id,
      })
    ).rejects.toThrow("Transcript not found");
  });
});
