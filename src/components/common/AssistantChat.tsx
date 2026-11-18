import React, { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { apiFetch } from "../../api/client";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const welcomeMessage =
  "আসসালামু আলাইকুম! Smart Mudi Manager ব্যবহার করতে আমি ধাপে ধাপে সাহায্য করব। কী জানতে চান?";

const suggestions = [
  "নতুন পণ্য কীভাবে যোগ করব?",
  "১০০ গ্রাম পণ্য বিক্রি করব কীভাবে?",
  "রসিদ কীভাবে প্রিন্ট করব?",
];

export const AssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: welcomeMessage },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const stopSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  };

  const toggleSpeech = (index: number, text: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("এই ব্রাউজারে উত্তর পড়ে শোনানোর সুবিধা নেই।");
      return;
    }
    if (speakingIndex === index) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "bn-BD";
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setError("");
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    stopSpeech();

    const previous = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", text }]);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const data = await apiFetch<{ reply: string }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: previous.map(({ role, text: messageText }) => ({
            role,
            text: messageText,
          })),
        }),
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.reply },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "সহকারীর সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsSending(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionApi =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setError("এই ব্রাউজারে ভয়েস ইনপুট নেই। Chrome বা Edge-এ চেষ্টা করুন।");
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "bn-BD";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcripts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) transcripts.push(result[0]?.transcript || "");
      }
      const spokenText = transcripts.join(" ").trim();
      if (spokenText) {
        setDraft((current) =>
          (current ? `${current} ${spokenText}` : spokenText).slice(0, 1000),
        );
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setError(
        event.error === "not-allowed"
          ? "ভয়েস ইনপুটের জন্য মাইক্রোফোন অনুমতি দিন।"
          : "কথা বোঝা যায়নি। আবার চেষ্টা করুন বা লিখে পাঠান।",
      );
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setError("");
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("মাইক্রোফোন চালু করা যায়নি। আবার চেষ্টা করুন।");
    }
  };

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[70] sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="AI সহকারী"
          className="mb-3 flex h-[min(520px,calc(100dvh-120px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold">AI সহকারী</h2>
                <p className="text-[10px] text-slate-300">
                  অ্যাপ ব্যবহার শেখার সহায়তা
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setIsOpen(false);
              }}
              aria-label="সহকারী বন্ধ করুন"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[88%] ${message.role === "user" ? "ml-auto" : "mr-auto"}`}
              >
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {message.text}
                </div>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => toggleSpeech(index, message.text)}
                    aria-label={speakingIndex === index ? "উত্তর শোনা বন্ধ করুন" : "উত্তর শুনুন"}
                    aria-pressed={speakingIndex === index}
                    className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                  >
                    {speakingIndex === index ? (
                      <Square className="h-3 w-3 fill-current" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                    {speakingIndex === index ? "বন্ধ করুন" : "শুনুন"}
                  </button>
                )}
              </div>
            ))}
            {messages.length === 1 && !isSending && (
              <div className="space-y-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="block rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-left text-[11px] text-emerald-800 hover:bg-emerald-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {isSending && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                উত্তর তৈরি হচ্ছে...
              </div>
            )}
            {error && (
              <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={isListening ? "ভয়েস ইনপুট বন্ধ করুন" : "ভয়েসে প্রশ্ন বলুন"}
              aria-pressed={isListening}
              title={isListening ? "শোনা বন্ধ করুন" : "ভয়েসে প্রশ্ন বলুন"}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                isListening
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              placeholder="আপনার প্রশ্ন লিখুন..."
              aria-label="আপনার প্রশ্ন"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              aria-label="প্রশ্ন পাঠান"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="bg-white px-3 pb-2 text-[9px] text-slate-400">
            গোপন তথ্য, পাসওয়ার্ড বা গ্রাহকের ব্যক্তিগত তথ্য লিখবেন না।
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          if (isOpen) stopSpeech();
          setIsOpen((open) => !open);
        }}
        aria-label={isOpen ? "AI সহকারী বন্ধ করুন" : "AI সহকারী খুলুন"}
        aria-expanded={isOpen}
        className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-white hover:bg-emerald-700"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
};
