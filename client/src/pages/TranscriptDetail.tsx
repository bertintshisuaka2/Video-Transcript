import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Copy, Download, Languages, Check, Sparkles, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
];

export default function TranscriptDetail() {
  const [, params] = useRoute("/transcript/:id");
  const [, setLocation] = useLocation();
  const transcriptId = params?.id ? parseInt(params.id) : null;

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const { data: transcript, isLoading } = trpc.transcript.getById.useQuery(
    { id: transcriptId! },
    { enabled: !!transcriptId }
  );

  const translateMutation = trpc.translation.translate.useMutation({
    onSuccess: (data) => {
      if (data.cached) {
        toast.info("Translation loaded from cache");
      } else {
        toast.success("Translation completed!");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const analysisMutation = trpc.analysis.analyzeText.useMutation({
    onSuccess: (data) => {
      const promptUsed = analysisPrompt || "Quick action";
      setConversationHistory((prev) => [
        ...prev,
        { role: "user" as const, content: promptUsed },
        { role: "assistant" as const, content: String(data.analysis) },
      ]);
      setAnalysisPrompt("");
      toast.success("Analysis completed!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAnalyze = (predefinedPrompt?: string) => {
    if (!transcript) return;
    
    const promptToUse = predefinedPrompt || analysisPrompt;
    if (!promptToUse.trim()) {
      toast.error("Please enter a question or select a quick action");
      return;
    }

    // Save the prompt before clearing it
    if (!predefinedPrompt) {
      setAnalysisPrompt(promptToUse);
    }

    const textToAnalyze = translateMutation.data?.translatedText || transcript.transcriptText;

    analysisMutation.mutate({
      text: textToAnalyze,
      prompt: promptToUse,
      conversationHistory,
    });
  };

  const handleTranslate = () => {
    if (!selectedLanguage || !transcriptId) return;

    const language = LANGUAGES.find((l) => l.code === selectedLanguage);
    if (!language) return;

    translateMutation.mutate({
      transcriptId,
      targetLanguage: selectedLanguage,
      languageName: language.name,
    });
  };

  const handleCopy = (text: string, isTranslation: boolean) => {
    navigator.clipboard.writeText(text);
    if (isTranslation) {
      setCopiedTranslation(true);
      setTimeout(() => setCopiedTranslation(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded successfully!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Transcript not found</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Languages className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Divalaser Software Solution
              </h1>
              <p className="text-sm text-muted-foreground">
                {transcript.videoTitle || (transcript.sourceType === "youtube" ? "YouTube Video" : "Uploaded File")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Original Transcript */}
          <Card className="border-border shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Original Transcript</CardTitle>
                  <CardDescription>
                    {transcript.originalLanguage
                      ? `Detected language: ${transcript.originalLanguage}`
                      : "Extracted from video"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(transcript.transcriptText, false)}
                  >
                    {copiedOriginal ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownload(transcript.transcriptText, "transcript.txt")
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="p-4 bg-muted/30 rounded-lg text-foreground whitespace-pre-wrap font-normal leading-relaxed">
                  {transcript.transcriptText}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translation Section */}
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Translate</CardTitle>
              <CardDescription>
                Select a target language to translate the transcript
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTranslate}
                  disabled={!selectedLanguage || translateMutation.isPending}
                  className="min-w-[140px]"
                >
                  {translateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4 mr-2" />
                      Translate
                    </>
                  )}
                </Button>
              </div>

              {translateMutation.data && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">
                      Translation ({LANGUAGES.find((l) => l.code === selectedLanguage)?.name})
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopy(translateMutation.data.translatedText, true)
                        }
                      >
                        {copiedTranslation ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownload(
                            translateMutation.data.translatedText,
                            `translation-${selectedLanguage}.txt`
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="p-4 bg-primary/5 rounded-lg text-foreground whitespace-pre-wrap font-normal leading-relaxed border border-primary/20">
                      {translateMutation.data.translatedText}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Section */}
          <Card className="border-border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Analysis</CardTitle>
              </div>
              <CardDescription>
                Ask questions or analyze the {translateMutation.data ? "translation" : "transcript"} using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyze("Provide a concise summary of this text")}
                  disabled={analysisMutation.isPending}
                >
                  Summarize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyze("Extract the key points from this text")}
                  disabled={analysisMutation.isPending}
                >
                  Key Points
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyze("Analyze the sentiment and tone of this text")}
                  disabled={analysisMutation.isPending}
                >
                  Sentiment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyze("What are the main topics discussed in this text?")}
                  disabled={analysisMutation.isPending}
                >
                  Topics
                </Button>
              </div>

              {/* Conversation History */}
              {conversationHistory.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary/10 border border-primary/20 ml-8"
                          : "bg-muted/30 mr-8"
                      }`}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {msg.role === "user" ? "You" : "AI Assistant"}
                      </div>
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        <div className="text-foreground whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Ask a question about the text... (e.g., 'What is the main message?', 'Explain this in simple terms')"
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                  className="min-h-[100px] resize-none"
                  disabled={analysisMutation.isPending}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  <Button
                    onClick={() => handleAnalyze()}
                    disabled={!analysisPrompt.trim() || analysisMutation.isPending}
                  >
                    {analysisMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
