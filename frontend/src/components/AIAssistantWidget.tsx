// ===== FILE: src/components/AIAssistantWidget.tsx =====
// Floating AI Assistant — Phase 1 (scripted, no backend/API calls).
// Add <AIAssistantWidget /> once in AppLayout.tsx so it appears on every
// dashboard page. Phase 2 can later swap matchTopic()/free-text handling
// for a real AI API call without changing this component's UI.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, ChevronRight, ArrowLeft, Sparkles } from "lucide-react";
import { ASSISTANT_TOPICS, matchTopic, AssistantTopic } from "../data/assistantTopics";

type ChatEntry =
  | { kind: "bot-text"; text: string }
  | { kind: "bot-topic"; topic: AssistantTopic }
  | { kind: "user-text"; text: string };

const GREETING =
  "Hi! I'm your Procurement Hub assistant 👋 Pick a topic below, or type your question.";

// ── Avatar icon — friendly assistant wearing a hijab (simple SVG, no
// external image needed) ────────────────────────────────────────────
function AvatarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#EEF2FF" />
      {/* neck/shoulders */}
      <path d="M24 46C24 42 27 40 32 40C37 40 40 42 40 46V52H24V46Z" fill="#F0B896" />
      {/* hijab back drape, softer indigo tone matching theme */}
      <path
        d="M11 46C10 30 14 15 32 15C50 15 54 30 53 46C52.5 52 46 54 40 51.5C37.5 50.4 34.5 50 32 50C29.5 50 26.5 50.4 24 51.5C18 54 11.5 52 11 46Z"
        fill="#6366F1"
      />
      <path
        d="M11 46C10 30 14 15 32 15C50 15 54 30 53 46C52.5 52 46 54 40 51.5C37.5 50.4 34.5 50 32 50C29.5 50 26.5 50.4 24 51.5C18 54 11.5 52 11 46Z"
        fill="url(#hijabShade)"
      />
      {/* face */}
      <ellipse cx="32" cy="31" rx="13.5" ry="14.5" fill="#F6C9A0" />
      {/* hijab framing the face, inner layer slightly darker for depth */}
      <path
        d="M15 32C15 19 21 12 32 12C43 12 49 19 49 32C49 22.5 43 18 32 18C21 18 15 22.5 15 32Z"
        fill="#4F46E5"
      />
      {/* soft cheeks */}
      <circle cx="23.5" cy="35" r="2.2" fill="#F2A98A" opacity="0.55" />
      <circle cx="40.5" cy="35" r="2.2" fill="#F2A98A" opacity="0.55" />
      {/* eyes */}
      <path d="M24.5 31C25.5 29.7 27.3 29.7 28.3 31" stroke="#3B2F45" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M35.7 31C36.7 29.7 38.5 29.7 39.5 31" stroke="#3B2F45" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* gentle smile */}
      <path d="M26 38C28.5 41 35.5 41 38 38" stroke="#B5654A" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="hijabShade" x1="11" y1="15" x2="53" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#818CF8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#4338CA" stopOpacity="0.35" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Voice greeting using the browser's built-in text-to-speech ─────────────
// Fails silently if the browser doesn't support it or blocks it — never
// breaks the widget itself.
function speakGreeting() {
  try {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(
      "Welcome, I am your supporter. How can I help you today?"
    );
    utter.rate = 1;
    utter.pitch = 1.1;
    utter.volume = 0.9;

    // Try to pick a female-sounding voice if the browser has one loaded
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => /female|zira|samantha|victoria/i.test(v.name));
    if (femaleVoice) utter.voice = femaleVoice;

    window.speechSynthesis.cancel(); // stop any previous speech first
    window.speechSynthesis.speak(utter);
  } catch {
    // Speech not supported/blocked — ignore
  }
}

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([{ kind: "bot-text", text: GREETING }]);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState<AssistantTopic | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Draggable launcher position — persists only for this browser tab
  // session (resets on reload). Stored as distance from bottom-right
  // corner so it stays sensible if the window is resized.
  const [pos, setPos] = useState<{ right: number; bottom: number }>({ right: 24, bottom: 24 });
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);

  // ── Tracks whether the voice greeting has already played this session.
  const hasGreetedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, activeTopic, stepIndex, open]);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    movedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startRight: pos.right, startBottom: pos.bottom };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;

    const iconSize = 56; // approx button size incl. border
    const maxRight = window.innerWidth - iconSize;
    const maxBottom = window.innerHeight - iconSize;

    const newRight = Math.min(Math.max(dragRef.current.startRight - dx, 4), maxRight);
    const newBottom = Math.min(Math.max(dragRef.current.startBottom - dy, 4), maxBottom);
    setPos({ right: newRight, bottom: newBottom });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function handleOpen() {
    // A drag ending shouldn't also trigger opening the chat panel.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen(true);
    if (!hasGreetedRef.current) {
      speakGreeting();
      hasGreetedRef.current = true;
    }
  }

  function openTopic(topic: AssistantTopic, fromUserText?: string) {
    setChat(prev => [
      ...prev,
      ...(fromUserText ? [{ kind: "user-text", text: fromUserText } as ChatEntry] : []),
      { kind: "bot-topic", topic },
    ]);
    setActiveTopic(topic);
    setStepIndex(0);
  }

  function backToMenu() {
    setActiveTopic(null);
    setStepIndex(0);
  }

  function handleSend() {
    const q = input.trim();
    if (!q) return;
    setInput("");

    const match = matchTopic(q);
    if (match) {
      openTopic(match, q);
    } else {
      setChat(prev => [
        ...prev,
        { kind: "user-text", text: q },
        {
          kind: "bot-text",
          text: "I don't have a scripted answer for that yet — try one of the topics below, or rephrase your question.",
        },
      ]);
      setActiveTopic(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <>
      {/* Floating launcher button — draggable */}
      {!open && (
        <button
          onClick={handleOpen}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ right: pos.right, bottom: pos.bottom, touchAction: "none" }}
          aria-label="Open assistant"
          className={`fixed z-[9998] w-16 h-16 rounded-full bg-white shadow-xl border border-indigo-100 flex items-center justify-center hover:shadow-2xl transition-shadow duration-200 group ${
            dragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-105"
          }`}
        >
          <AvatarIcon size={40} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          style={{ right: Math.min(pos.right, window.innerWidth - 384), bottom: Math.min(pos.bottom, window.innerHeight - 40) }}
          className="fixed z-[9999] w-[92vw] max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shrink-0">
                <AvatarIcon size={26} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">Procurement Assistant</p>
                <p className="text-indigo-100 text-xs flex items-center gap-1">
                  <Sparkles size={10} /> Here to help
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition p-1"
              aria-label="Close assistant"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {chat.map((entry, i) => {
              if (entry.kind === "user-text") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
                      {entry.text}
                    </div>
                  </div>
                );
              }
              if (entry.kind === "bot-text") {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="bg-white border border-gray-200 text-gray-700 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[85%] shadow-sm">
                      {entry.text}
                    </div>
                  </div>
                );
              }
              // bot-topic — only render fully if it's the active topic (keeps history light)
              return (
                <div key={i} className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-700 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                    {entry.topic.intro || `Here's how: ${entry.topic.label}`}
                  </div>
                </div>
              );
            })}

            {/* Active topic — step walkthrough */}
            {activeTopic && (
              <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between border-b border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-700">{activeTopic.label}</span>
                  <span className="text-xs text-indigo-400">
                    Step {stepIndex + 1} / {activeTopic.steps.length}
                  </span>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {stepIndex + 1}. {activeTopic.steps[stepIndex].title}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {activeTopic.steps[stepIndex].detail}
                  </p>
                </div>
                <div className="px-4 pb-3.5 flex items-center justify-between">
                  <button
                    onClick={backToMenu}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Menu
                  </button>
                  <div className="flex gap-2">
                    {stepIndex > 0 && (
                      <button
                        onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >
                        Back
                      </button>
                    )}
                    {stepIndex < activeTopic.steps.length - 1 ? (
                      <button
                        onClick={() => setStepIndex(i => i + 1)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1"
                      >
                        Next <ChevronRight size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={backToMenu}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Done ✓
                      </button>
                    )}
                  </div>
                </div>
                {activeTopic.note && stepIndex === activeTopic.steps.length - 1 && (
                  <div className="px-4 pb-3.5 -mt-1">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      {activeTopic.note}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Topic menu — shown when no topic is active */}
            {!activeTopic && (
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {ASSISTANT_TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => openTopic(topic)}
                    className="text-left text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/50 transition flex items-center justify-between group"
                  >
                    {topic.label}
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-400 transition shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-3 bg-white shrink-0 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
