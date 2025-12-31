import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getYoutubeTranscript, segmentsToText } from "./youtubeTranscript";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { 
  createTranscript, 
  getUserTranscripts, 
  getTranscriptById,
  deleteTranscript,
  createTranslation,
  getTranslation,
  getTranslationsByTranscriptId
} from "./db";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  transcript: router({
    // Extract transcript from YouTube URL
    fromYouTube: publicProcedure
      .input(z.object({
        url: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Extract video ID from URL
          const videoId = extractYouTubeVideoId(input.url);
          if (!videoId) {
            throw new Error("Invalid YouTube URL");
          }

          // Fetch transcript using Innertube API
          console.log('[YouTube Transcript] Fetching transcript for video:', videoId);
          const segments = await getYoutubeTranscript(videoId);
          const transcriptText = segmentsToText(segments);
          console.log('[YouTube Transcript] Combined text length:', transcriptText.length);
          console.log('[YouTube Transcript] First 100 chars:', transcriptText.substring(0, 100));
          
          // Save to database
          console.log('[YouTube Transcript] Saving to database, text length:', transcriptText.length);
          const transcript = await createTranscript({
            userId: null,
            videoId,
            videoUrl: input.url,
            videoTitle: null,
            sourceType: "youtube",
            originalLanguage: null,
            transcriptText,
          });
          console.log('[YouTube Transcript] Saved with ID:', transcript.id);

          return {
            id: transcript.id,
            transcriptText,
            videoId,
          };
        } catch (error) {
          console.error("YouTube transcript error:", error);
          throw new Error("Failed to extract transcript from YouTube video. The video may not have captions available.");
        }
      }),

    // Upload and transcribe video file
    fromUpload: publicProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Transcribe audio using Manus built-in service
          const result = await transcribeAudio({
            audioUrl: input.fileUrl,
          });

          if ('error' in result) {
            throw new Error(result.error);
          }

          // Save to database
          const transcript = await createTranscript({
            userId: null,
            videoId: null,
            videoUrl: null,
            videoTitle: input.fileName,
            sourceType: "upload",
            originalLanguage: result.language,
            transcriptText: result.text,
            fileKey: input.fileUrl,
          });

          return {
            id: transcript.id,
            transcriptText: result.text,
            language: result.language,
          };
        } catch (error) {
          console.error("Upload transcription error:", error);
          throw new Error("Failed to transcribe uploaded file. Please ensure the file is a valid audio/video format.");
        }
      }),

    // Get transcript by ID
    getById: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        const transcript = await getTranscriptById(input.id);
        
        if (!transcript) {
          throw new Error("Transcript not found");
        }

        return transcript;
      }),

    // Get user's transcript history
    getHistory: publicProcedure
      .query(async () => {
        // Return empty array for public access - no history tracking
        return [];
      }),

    // Delete transcript
    delete: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        // For public access, allow deletion without user check
        const transcript = await getTranscriptById(input.id);
        if (transcript) {
          await deleteTranscript(input.id, transcript.userId || 0);
        }
        return { success: true };
      }),
  }),

  translation: router({
    // Translate transcript to target language
    translate: publicProcedure
      .input(z.object({
        transcriptId: z.number(),
        targetLanguage: z.string(),
        languageName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if translation already exists
        const existing = await getTranslation(input.transcriptId, input.targetLanguage);
        if (existing) {
          return {
            translatedText: existing.translatedText,
            cached: true,
          };
        }

        // Get original transcript
        const transcript = await getTranscriptById(input.transcriptId);
        if (!transcript) {
          throw new Error("Transcript not found");
        }

        // Translate using LLM
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following text to ${input.languageName}. Preserve the meaning and tone. Return only the translated text without any additional commentary.`,
            },
            {
              role: "user",
              content: transcript.transcriptText,
            },
          ],
        });

        const messageContent = response.choices[0]?.message?.content;
        const translatedText = typeof messageContent === 'string' ? messageContent : "";

        // Save translation
        await createTranslation({
          transcriptId: input.transcriptId,
          targetLanguage: input.targetLanguage,
          translatedText,
        });

        return {
          translatedText,
          cached: false,
        };
      }),

    // Get all translations for a transcript
    getByTranscriptId: publicProcedure
      .input(z.object({
        transcriptId: z.number(),
      }))
      .query(async ({ input }) => {
        // Verify transcript exists
        const transcript = await getTranscriptById(input.transcriptId);
        if (!transcript) {
          throw new Error("Transcript not found");
        }

        return await getTranslationsByTranscriptId(input.transcriptId);
      }),
  }),

  // AI Analysis router
  analysis: router({
    // Analyze text with AI
    analyzeText: publicProcedure
      .input(z.object({
        text: z.string(),
        prompt: z.string().optional(),
        conversationHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { text, prompt, conversationHistory = [] } = input;

          // Build messages array
          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            {
              role: "system",
              content: "You are an AI assistant helping to analyze video transcripts and translations. Provide insightful, accurate, and helpful analysis based on the text provided.",
            },
          ];

          // Add conversation history
          conversationHistory.forEach((msg) => {
            messages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            });
          });

          // Add current prompt
          const userPrompt = prompt 
            ? `${prompt}\n\nText to analyze:\n${text.substring(0, 4000)}` 
            : `Please analyze the following text:\n\n${text.substring(0, 4000)}`;
          
          messages.push({
            role: "user",
            content: userPrompt,
          });

          // Call LLM
          const response = await invokeLLM({ messages });
          const analysis = response.choices[0]?.message?.content || "No analysis available";

          return {
            analysis,
            success: true,
          };
        } catch (error) {
          console.error("[AI Analysis] Error:", error);
          throw new Error("Failed to analyze text");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Helper function to extract YouTube video ID from URL
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
