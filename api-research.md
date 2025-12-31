# API Research Findings

## YouTube Transcript Extraction

**Selected Library: youtube-transcript (npm)**
- Package: `youtube-transcript` version 1.2.1
- 52,444 weekly downloads, MIT licensed
- Simple API: `YoutubeTranscript.fetchTranscript(videoId or URL)`
- Returns transcript with timestamps
- Uses unofficial YouTube API (may break if YouTube changes their API)

## Video File Transcription

**Built-in Solution: Manus Voice Transcription**
- Available via `transcribeAudio()` helper in `server/_core/voiceTranscription.ts`
- Uses Whisper API
- Supports: webm, mp3, wav, ogg, m4a
- 16MB file size limit
- Returns full transcription with language detection and timestamped segments

## Translation

**Solution: Use Manus Built-in LLM**
- Available via `invokeLLM()` helper in `server/_core/llm.ts`
- Can translate text to any language
- Supports structured responses
- No additional API keys needed

## Implementation Plan

1. Install `youtube-transcript` npm package
2. Create tRPC procedures for:
   - YouTube transcript extraction (using youtube-transcript)
   - Video file transcription (using transcribeAudio)
   - Translation (using invokeLLM)
   - History management (CRUD operations)
3. Use S3 storage for uploaded video files
