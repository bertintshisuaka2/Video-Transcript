import axios from "axios";
import { parseStringPromise } from "xml2js";

interface CaptionSegment {
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * Extract YouTube transcript using the Innertube API
 * This method is more reliable than the youtube-transcript package
 * @param videoId - YouTube video ID
 * @param language - Language code (default: "en")
 * @returns Array of caption segments with text and timestamps
 */
export async function getYoutubeTranscript(
  videoId: string,
  language: string = "en"
): Promise<CaptionSegment[]> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Step 1: Fetch the video page and extract INNERTUBE_API_KEY
    console.log("[Innertube] Fetching video page for API key...");
    const htmlResponse = await axios.get(videoUrl);
    const html = htmlResponse.data;

    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    if (!apiKeyMatch) {
      throw new Error("INNERTUBE_API_KEY not found in video page");
    }
    const apiKey = apiKeyMatch[1];
    console.log("[Innertube] API key extracted successfully");

    // Step 2: Call the Innertube player API with Android client context
    console.log("[Innertube] Calling player API...");
    const playerResponse = await axios.post(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
          },
        },
        videoId,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const playerData = playerResponse.data;

    // Step 3: Extract caption track URL
    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      throw new Error("No captions found for this video");
    }

    console.log("[Innertube] Available caption tracks:", tracks.map((t: any) => t.languageCode).join(", "));

    // Try to find the requested language, fallback to first available
    let track = tracks.find((t: any) => t.languageCode === language);
    if (!track) {
      console.log(`[Innertube] Language '${language}' not found, using first available: ${tracks[0].languageCode}`);
      track = tracks[0];
    }

    const baseUrl = track.baseUrl.replace(/&fmt=\w+$/, "");
    console.log("[Innertube] Caption track URL extracted");

    // Step 4: Fetch and parse captions XML
    console.log("[Innertube] Fetching captions XML...");
    const xmlResponse = await axios.get(baseUrl);
    const xml = xmlResponse.data;

    const parsed = await parseStringPromise(xml);

    if (!parsed.transcript || !parsed.transcript.text) {
      throw new Error("Invalid caption XML format");
    }

    const segments: CaptionSegment[] = parsed.transcript.text.map((entry: any) => ({
      text: entry._,
      startTime: parseFloat(entry.$.start),
      endTime: parseFloat(entry.$.start) + parseFloat(entry.$.dur),
    }));

    console.log("[Innertube] Successfully extracted", segments.length, "caption segments");

    return segments;
  } catch (error) {
    console.error("[Innertube] Error extracting transcript:", error);
    throw new Error(
      `Failed to extract transcript: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert caption segments to plain text
 */
export function segmentsToText(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}
