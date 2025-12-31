import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Youtube, Upload, Loader2, Languages } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("youtube");

  const youtubeTranscriptMutation = trpc.transcript.fromYouTube.useMutation({
    onSuccess: (data) => {
      toast.success("Transcript extracted successfully!");
      setLocation(`/transcript/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadTranscriptMutation = trpc.transcript.fromUpload.useMutation({
    onSuccess: (data) => {
      toast.success("Video transcribed successfully!");
      setLocation(`/transcript/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    youtubeTranscriptMutation.mutate({ url: youtubeUrl });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      toast.error("Please select a file");
      return;
    }

    // Check file size (16MB limit)
    const maxSize = 16 * 1024 * 1024;
    if (uploadedFile.size > maxSize) {
      toast.error("File size must be less than 16MB");
      return;
    }

    try {
      // Upload file to S3
      const fileBuffer = await uploadedFile.arrayBuffer();
      const { url } = await fetch("/api/upload-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileData: Array.from(new Uint8Array(fileBuffer)),
        }),
      }).then((res) => res.json());

      // Transcribe uploaded file
      uploadTranscriptMutation.mutate({
        fileUrl: url,
        fileName: uploadedFile.name,
      });
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Languages className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Divalaser Software Solution</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Extract & Translate Video Transcripts
            </h2>
            <p className="text-muted-foreground text-lg">
              Get transcripts from YouTube videos or upload your own files
            </p>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Choose Your Source</CardTitle>
              <CardDescription>
                Extract transcripts from YouTube URLs or upload video/audio files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="youtube" className="gap-2">
                    <Youtube className="h-4 w-4" />
                    YouTube URL
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="youtube" className="mt-6">
                  <form onSubmit={handleYouTubeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="youtube-url" className="text-sm font-medium text-foreground">
                        YouTube Video URL
                      </label>
                      <Input
                        id="youtube-url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="h-12"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the URL of any YouTube video with captions
                      </p>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={youtubeTranscriptMutation.isPending}
                    >
                      {youtubeTranscriptMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Youtube className="h-4 w-4 mr-2" />
                          Extract Transcript
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="upload" className="mt-6">
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="file-upload" className="text-sm font-medium text-foreground">
                        Video or Audio File
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="file-upload"
                          type="file"
                          accept="audio/*,video/*,.mp3,.wav,.mp4,.webm,.ogg,.m4a"
                          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                          className="h-12"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: MP3, WAV, MP4, WebM, OGG, M4A (max 16MB)
                      </p>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={uploadTranscriptMutation.isPending || !uploadedFile}
                    >
                      {uploadTranscriptMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transcribing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Transcribe
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
                <Youtube className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">YouTube Support</h3>
              <p className="text-sm text-muted-foreground">
                Extract captions from any YouTube video instantly
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Multi-Language</h3>
              <p className="text-sm text-muted-foreground">
                Translate transcripts to any language you need
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">File Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload your own audio or video files for transcription
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
