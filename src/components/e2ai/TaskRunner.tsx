import { useEffect, useRef, useState } from "react";
import { Mic, Play, Send, Timer, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScoreBars, PrototypeNotice } from "@/components/e2ai/bits";
import { DIFFICULTY_LABELS, type PracticeTask } from "@/lib/e2ai/content";
import {
  buildFeedback,
  countWords,
  overallScore,
  prototypeLevel,
  scoreResponse,
} from "@/lib/e2ai/scoring";
import { buildRecommendation } from "@/lib/e2ai/adaptive";
import { addSession, newId } from "@/lib/e2ai/storage";
import type { Session, Student } from "@/lib/e2ai/types";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function TaskRunner({
  student,
  task,
  categoryId,
  categoryLabel,
  kind,
  previousSessions,
  onSaved,
  index,
  total,
}: {
  student: Student;
  task: PracticeTask;
  categoryId: string;
  categoryLabel: string;
  kind: "diagnostic" | "practice" | "posttest";
  previousSessions: Session[];
  onSaved: (session: Session) => void;
  index?: number;
  total?: number;
}) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [response, setResponse] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [result, setResult] = useState<Session | null>(null);
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  useEffect(() => {
    setStarted(false);
    setElapsed(0);
    setResponse("");
    setManualTime("");
    setResult(null);
    setAudioUrl(null);
    startRef.current = null;
  }, [task.id]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setSpeechAvailable(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!started || result) return;
    const id = window.setInterval(() => {
      if (startRef.current !== null) setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [started, result]);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setStarted(true);
    setResult(null);
  };

  const audioBase64Ref = useRef<string | null>(null);

  const startAudioRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          try {
            const blob = new Blob(audioChunksRef.current, {
              type: mr.mimeType || "audio/webm",
            });
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              audioBase64Ref.current = res;
              setAudioUrl(res);
            };
            reader.readAsDataURL(blob);
          } catch (e) {
            console.warn("Audio processing error:", e);
          } finally {
            stream.getTracks().forEach((track) => track.stop());
          }
        };
        mr.start(200); // chunk every 200ms
      }
    } catch (err) {
      console.warn("MediaRecorder start warning:", err);
    }
  };

  const stopAudioRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const mr = mediaRecorderRef.current;
        if (!mr || mr.state === "inactive") {
          resolve(audioBase64Ref.current || audioUrl);
          return;
        }
        mr.onstop = () => {
          try {
            const blob = new Blob(audioChunksRef.current, {
              type: mr.mimeType || "audio/webm",
            });
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              audioBase64Ref.current = res;
              setAudioUrl(res);
              resolve(res);
            };
            reader.readAsDataURL(blob);
          } catch {
            resolve(audioBase64Ref.current || audioUrl);
          }
        };
        mr.stop();
      } catch (err) {
        console.warn("MediaRecorder stop warning:", err);
        resolve(audioBase64Ref.current || audioUrl);
      }
    });
  };

  /** Browser speech recognition + parallel MediaRecorder audio recording. */
  const toggleMic = async () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (listening) {
      recognitionRef.current?.stop();
      await stopAudioRecording();
      setListening(false);
      return;
    }

    // Start Audio recording via MediaRecorder API
    await startAudioRecording();

    if (!Ctor) {
      setListening(true);
      if (!started) start();
      toast.info("Đang ghi âm giọng nói thực tế (bạn có thể gõ thêm câu trả lời).");
      return;
    }

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i += 1) text += `${e.results[i]![0]!.transcript} `;
      setResponse(text.trim());
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("Không thể nhận diện văn bản tự động. Bản ghi âm giọng nói vẫn được lưu.");
    };
    rec.onend = () => {
      setListening(false);
      void stopAudioRecording();
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    if (!started) start();
  };

  const submit = async () => {
    const capturedAudio = await stopAudioRecording();
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    if (!response.trim()) {
      toast.error("Vui lòng nhập câu trả lời trước khi nộp.");
      return;
    }
    let seconds: number;
    if (started && startRef.current !== null) {
      seconds = Math.round(((Date.now() - startRef.current) / 1000) * 10) / 10;
    } else {
      const parsed = Number(manualTime);
      if (!manualTime.trim() || Number.isNaN(parsed) || parsed <= 0 || parsed > 600) {
        toast.error(
          'Thời gian phản hồi không hợp lệ. Hãy bấm "Bắt đầu" hoặc nhập số giây (0–600).',
        );
        return;
      }
      seconds = Math.round(parsed * 10) / 10;
    }

    const scores = scoreResponse(response, task.keywords);
    const overall = overallScore(scores);
    const sorted = [...previousSessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const recentTimes = [seconds, ...sorted.slice(0, 4).map((s) => s.responseTimeSeconds)];
    const session: Session = {
      id: newId("ses"),
      studentId: student.studentId,
      kind,
      categoryId,
      categoryLabel,
      scenario: task.scenario,
      question: task.question,
      difficulty: task.difficulty,
      suggestedSeconds: task.suggestedSeconds,
      response: response.trim(),
      audioUrl: capturedAudio || audioBase64Ref.current || audioUrl || undefined,
      responseTimeSeconds: seconds,
      wordCount: countWords(response),
      createdAt: new Date().toISOString(),
      scores,
      overall,
      feedback: buildFeedback(scores, seconds),
      recommendation: buildRecommendation({
        latestScores: scores,
        latestOverall: overall,
        latestResponseTime: seconds,
        avgResponseTime: recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length,
        lastThreeOverall: [overall, ...sorted.slice(0, 2).map((s) => s.overall)],
        currentDifficulty: task.difficulty,
      }),
      ...(student.isDemo ? { isDemo: true } : {}),
    };

    try {
      addSession(session);
    } catch {
      toast.error("Không thể lưu phiên luyện tập trên thiết bị này.");
      return;
    }
    setResult(session);
    setStarted(false);
    startRef.current = null;
    toast.success(`Đã lưu phiên luyện tập · Overall ${overall.toFixed(1)}/5`);
    onSaved(session);
  };

  return (
    <div className="space-y-4">
      <Card className="surface-card">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryLabel}</Badge>
            <Badge variant="outline">{DIFFICULTY_LABELS[task.difficulty]}</Badge>
            <Badge variant="outline">Gợi ý: {task.suggestedSeconds} giây</Badge>
            {index !== undefined && total !== undefined && (
              <Badge variant="outline">
                Nhiệm vụ {index + 1}/{total}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg leading-snug">{task.question}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Scenario: </span>
            {task.scenario}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={start} variant={started ? "secondary" : "default"} size="lg">
              <Play className="size-4" />
              {started ? "Bắt đầu lại" : "Bắt đầu"}
            </Button>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm tabular-nums">
              <Timer className="size-4 text-primary" />
              {elapsed.toFixed(1)} giây
            </div>
            <Button variant={listening ? "destructive" : "outline"} onClick={toggleMic} size="lg">
              <Mic className="size-4" />
              {listening ? "Dừng ghi âm & nói" : "Ghi âm & Nói (Speech + Audio)"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="response">Câu trả lời của bạn (Script / Transcript)</Label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your English response here or use the microphone to speak..."
              rows={6}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Bạn có thể nói hoặc gõ câu trả lời bằng tiếng Anh. Số từ hiện tại:{" "}
              {countWords(response)}
            </p>
          </div>

          {audioUrl && (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Volume2 className="size-4 text-primary" /> Bản ghi âm giọng nói của bạn
                </span>
                <span className="text-muted-foreground">Sẵn sàng lưu kèm</span>
              </div>
              <audio controls src={audioUrl} className="w-full h-9" />
            </div>
          )}

          {!started && (
            <div className="space-y-2">
              <Label htmlFor="manual-time">Thời gian phản hồi (giây)</Label>
              <Input
                id="manual-time"
                inputMode="decimal"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder="Ví dụ: 8.5"
                className="max-w-40"
              />
              <p className="text-xs text-muted-foreground">
                Chỉ cần nhập nếu bạn không dùng đồng hồ bấm giờ tự động.
              </p>
            </div>
          )}

          <Button onClick={submit} size="lg" className="w-full sm:w-auto">
            <Send className="size-4" />
            Nộp câu trả lời & Lưu phiên
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="surface-card border-accent/40">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-3">
              <span>E2AI Prototype Score</span>
              <span className="text-2xl font-extrabold text-primary">
                Overall: {result.overall.toFixed(1)} / 5
              </span>
              <Badge variant="secondary">{prototypeLevel(result.overall).label}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Thời gian phản hồi: {result.responseTimeSeconds.toFixed(1)} giây · Số từ:{" "}
              {result.wordCount} · Prototype practice level – not an official CEFR classification.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {result.audioUrl && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="size-4 text-primary" /> Bản ghi âm giọng nói đã lưu
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Audio Saved
                  </Badge>
                </div>
                <audio controls src={result.audioUrl} className="w-full h-9" />
              </div>
            )}
            <ScoreBars scores={result.scores} />
            <div>
              <h3 className="text-sm font-bold">Nhận xét cá nhân hóa</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.feedback.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-primary-soft p-4">
              <h3 className="text-sm font-bold">Đề xuất luyện tập tiếp theo</h3>
              <p className="mt-1 text-sm font-semibold text-primary">
                {result.recommendation.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{result.recommendation.reason}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.recommendation.difficultyNote}
              </p>
            </div>
            <PrototypeNotice />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
