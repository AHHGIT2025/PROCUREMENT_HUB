// ===== FILE: src/components/AIAssistantWidget.tsx =====
// Floating AI Assistant — Phase 1 (scripted, no backend/API calls).
// Add <AIAssistantWidget /> once in AppLayout.tsx so it appears on every
// dashboard page. Phase 2 can later swap matchTopic()/free-text handling
// for a real AI API call without changing this component's UI.

import { useEffect, useRef, useState } from "react";
import { X, Send, ChevronRight, ArrowLeft, Sparkles } from "lucide-react";
import { ASSISTANT_TOPICS, matchTopic, AssistantTopic } from "../data/assistantTopics";
import api from "../api/client";

const FALLBACK_TEXT =
  "I don't have a scripted answer for that one yet — try one of the topics below, or rephrase your question.";

type ChatEntry =
  | { kind: "bot-text"; text: string }
  | { kind: "bot-topic"; topic: AssistantTopic }
  | { kind: "bot-suggestions"; topics: AssistantTopic[] }
  | { kind: "user-text"; text: string };

// NEW — simple greeting detection ("hi", "hello", "hey", etc.) so a plain
// greeting gets a friendly reply instead of "I don't have a scripted
// answer for that". A few reply variants so it doesn't always say the
// exact same thing back.
const GREETING_WORDS = /^(hi+|hello+|hey+|hlo|helo|good\s?(morning|afternoon|evening)|salam|assalam(u|o)?alaikum)\b/i;
function greetingReply() {
  const options = [
    `Hi there! What can I help you with today?`,
    `Hello! 👋 What are you trying to do?`,
    `Hey! Happy to help — what's up?`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// NEW — instead of always showing every topic when free-typed text
// doesn't exactly match one, this scores each topic by how many of its
// keywords appear (even partially) in what the person typed, and returns
// only the topics that got at least one hit, best match first. Falls
// back to an empty list if truly nothing overlaps (handled by the AI
// fallback call in handleSend below).
function suggestTopics(query: string, max = 3): AssistantTopic[] {
  const q = query.toLowerCase();
  const scored = ASSISTANT_TOPICS
    .map(topic => {
      const score = topic.keywords.reduce((s, kw) => s + (q.includes(kw.toLowerCase()) ? 1 : 0), 0);
      return { topic, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(x => x.topic);
}

// NEW — assistant now has a name instead of a generic "Procurement
// Assistant" label. A named persona reads far less robotic than a
// function-description label in the header.
const ASSISTANT_NAME = "Sara";

// NEW — a few greeting variants, picked at random each session, instead of
// one fixed line every single time. Small thing, but a chatbot that says
// the exact same sentence every time it opens is one of the more obvious
// "robotic" tells.
const GREETINGS = [
  `Hi! I'm ${ASSISTANT_NAME}, your Procurement Hub assistant 👋 Pick a topic below, or just type your question.`,
  `Hey there! ${ASSISTANT_NAME} here — happy to help. Choose a topic below or ask me anything.`,
  `Hello 👋 I'm ${ASSISTANT_NAME}. Tell me what you're trying to do, or pick a topic to get started.`,
];
function pickGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

// ── Avatar — the person's actual uploaded avatar image, shown as a
// circular crop. Photorealistic images can't be reproduced as inline SVG
// (that only works for flat/vector art), so this renders the real image
// file instead. Place the file at:
//   frontend/public/assets/assistant-avatar.png
// (the src path below assumes Vite's default /public serving — adjust the
// path if the project stores static assets elsewhere).
function AvatarIcon({ size = 28 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 flex items-center justify-center bg-indigo-100 rounded-full overflow-hidden ring-2 ring-indigo-200/70"
    >
      {!failed ? (
        // NEW — cropped to a head-and-shoulders bust silhouette (rounded
        // head tapering out to shoulders) via clip-path, instead of a
        // plain circle. This reads as "a person" rather than "a photo
        // stuffed into a circle". The outer wrapper stays circular (as
        // the background/border), the image itself is clipped to the
        // bust shape and scaled slightly larger so it fills that shape.
        <img
          src="/assets/assistant-avatar.png"
          alt="Assistant avatar"
          draggable={false}
          onError={() => setFailed(true)}
          className="w-[120%] h-[120%] object-cover object-top absolute"
          style={{
            clipPath:
              "polygon(50% 0%, 62% 2%, 72% 8%, 80% 18%, 83% 30%, 80% 38%, 88% 44%, 94% 56%, 96% 70%, 94% 84%, 84% 94%, 65% 99%, 50% 100%, 35% 99%, 16% 94%, 6% 84%, 4% 70%, 6% 56%, 14% 44%, 22% 38%, 19% 30%, 22% 18%, 30% 8%, 40% 2%)",
            top: "-10%",
            left: "-10%",
          }}
        />
      ) : (
        <span className="text-indigo-400 font-semibold" style={{ fontSize: size * 0.4 }}>S</span>
      )}
    </div>
  );
}

// ── Typing indicator — three bouncing dots in a chat bubble, shown while
// the "bot" is composing a reply. This is the single biggest thing that
// makes a scripted assistant feel less like a machine: real people take a
// moment to respond, so an instant reply is one of the most obvious
// robotic tells. ─────────────────────────────────────────────────────
function TypingBubble() {
  return (
    <div className="flex justify-start animate-[fadeSlideIn_0.25s_ease-out]">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"
            style={{ animation: `typingBounce 1.1s ${i * 0.15}s infinite ease-in-out` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Natural response delay — a short, slightly randomized pause before a
// scripted reply appears, so it doesn't pop in instantly like a lookup
// table (which, functionally, it is — this just doesn't announce that).
function naturalDelay() {
  return 550 + Math.random() * 650; // ~0.55–1.2s
}

// ── Voice greeting using the browser's built-in text-to-speech ─────────────
// IMPROVED — voice selection now targets exact voice names confirmed
// available on this machine (via speechSynthesis.getVoices()), in priority
// order from most to least natural-sounding:
//   1. Jenny  — Microsoft's most commonly recommended natural US female voice
//   2. Aria   — also a strong natural US female voice
//   3. Ava    — natural US female voice
//   4. Michelle — natural US female voice
//   5. any other "Online (Natural)" + female-named voice
//   6. legacy "Zira" (older, more robotic-sounding, but always present as
//      a last resort so speech never silently fails to a random voice)
// Rate/pitch are nudged slightly for a warmer, less flat delivery. Fails
// silently if speech isn't supported/blocked — never breaks the widget.
const PREFERRED_VOICE_NAMES = [
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Ava Online (Natural) - English (United States)",
  "Microsoft Michelle Online (Natural) - English (United States)",
];

function speakGreeting(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;

    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.98;
      utter.pitch = 1.05;
      utter.volume = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const exact = PREFERRED_VOICE_NAMES
        .map(name => voices.find(v => v.name === name))
        .find(Boolean);

      const fallback =
        voices.find(v => /online \(natural\)/i.test(v.name) && /female|zira|samantha|victoria|aria|jenny|ava|michelle/i.test(v.name)) ??
        voices.find(v => /zira/i.test(v.name)) ??
        voices.find(v => v.lang?.startsWith("en"));

      const chosen = exact ?? fallback;
      if (chosen) utter.voice = chosen;

      window.speechSynthesis.cancel(); // stop any previous speech first
      window.speechSynthesis.speak(utter);
    };

    // "Online (Natural)" voices load asynchronously and are often missing
    // on the very first getVoices() call right after page load. If the
    // list looks empty/not-yet-populated, wait once for the browser to
    // finish loading voices before picking one — otherwise this silently
    // falls back to whatever default voice happened to be ready first
    // (usually the more robotic legacy one).
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
    } else {
      doSpeak();
    }
  } catch {
    // Speech not supported/blocked — ignore
  }
}

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [greeting] = useState(pickGreeting);
  const [chat, setChat] = useState<ChatEntry[]>([{ kind: "bot-text", text: greeting }]);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState<AssistantTopic | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [typing, setTyping] = useState(false);
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
  }, [chat, activeTopic, stepIndex, open, typing]);

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
      speakGreeting(greeting);
      hasGreetedRef.current = true;
    }
  }

  // NEW — runs a typing pause, then appends the given entries. Centralizes
  // the "show dots, wait, then reveal" pattern used by both openTopic and
  // handleSend below.
  function replyAfterDelay(entries: ChatEntry[]) {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setChat(prev => [...prev, ...entries]);
    }, naturalDelay());
  }

  function openTopic(topic: AssistantTopic, fromUserText?: string) {
    if (fromUserText) {
      setChat(prev => [...prev, { kind: "user-text", text: fromUserText }]);
    }
    setActiveTopic(topic);
    setStepIndex(0);
    replyAfterDelay([{ kind: "bot-topic", topic }]);
  }

  function backToMenu() {
    setActiveTopic(null);
    setStepIndex(0);
  }

  // NEW — simple AI fallback, only used when nothing scripted matches at
  // all (no greeting, no exact topic, no keyword overlap). Calls a small
  // backend endpoint that forwards the question to Claude with a system
  // prompt scoped to this app, so answers stay on-topic. If the endpoint
  // isn't set up yet, or the call fails for any reason, this falls back
  // to the old "try one of the topics below" message — it never breaks
  // the widget.
  async function askAiFallback(question: string): Promise<string> {
    try {
      const res = await api.post("/assistant/ask", { question });
      return res.data?.answer ?? res.data?.data?.answer ?? FALLBACK_TEXT;
    } catch {
      return FALLBACK_TEXT;
    }
  }

  function handleSend() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setChat(prev => [...prev, { kind: "user-text", text: q }]);
    setActiveTopic(null);

    // 1) Plain greeting — reply warmly, skip topic matching entirely.
    if (GREETING_WORDS.test(q.trim())) {
      replyAfterDelay([{ kind: "bot-text", text: greetingReply() }]);
      return;
    }

    // 2) Exact topic match — same as before, opens the step walkthrough.
    const match = matchTopic(q);
    if (match) {
      setActiveTopic(match);
      setStepIndex(0);
      replyAfterDelay([{ kind: "bot-topic", topic: match }]);
      return;
    }

    // 3) Partial keyword overlap — show only the relevant topics instead
    // of the full topic list, so the person isn't stuck scanning
    // everything to find what they meant.
    const suggestions = suggestTopics(q);
    if (suggestions.length > 0) {
      replyAfterDelay([
        { kind: "bot-text", text: "I'm not 100% sure, but this might be what you're after:" },
        { kind: "bot-suggestions", topics: suggestions },
      ]);
      return;
    }

    // 4) Nothing scripted matches at all — ask the AI fallback.
    setTyping(true);
    askAiFallback(q).then(answer => {
      setTyping(false);
      setChat(prev => [...prev, { kind: "bot-text", text: answer }]);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <>
      {/* Local keyframes for the typing dots and message entrance —
          scoped here so this component has no external CSS dependency. */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating launcher button — draggable */}
      {!open && (
        <button
          onClick={handleOpen}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ right: pos.right, bottom: pos.bottom, touchAction: "none" }}
          aria-label={`Open ${ASSISTANT_NAME}, your assistant`}
          className={`fixed z-[9998] w-16 h-16 rounded-full bg-white shadow-xl border border-indigo-100 flex items-center justify-center hover:shadow-2xl transition-shadow duration-200 group ${
            dragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-105"
          }`}
        >
          <AvatarIcon size={40} />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-white" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          style={{ right: Math.min(pos.right, window.innerWidth - 384), bottom: Math.min(pos.bottom, window.innerHeight - 40) }}
          className="fixed z-[9999] w-[92vw] max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shrink-0">
                <AvatarIcon size={26} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{ASSISTANT_NAME}</p>
                <p className="text-indigo-100 text-xs flex items-center gap-1">
                  <Sparkles size={10} /> Active now
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
                  <div key={i} className="flex justify-end animate-[fadeSlideIn_0.25s_ease-out]">
                    <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
                      {entry.text}
                    </div>
                  </div>
                );
              }
              if (entry.kind === "bot-text") {
                return (
                  <div key={i} className="flex justify-start animate-[fadeSlideIn_0.25s_ease-out]">
                    <div className="bg-white border border-gray-200 text-gray-700 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[85%] shadow-sm">
                      {entry.text}
                    </div>
                  </div>
                );
              }
              if (entry.kind === "bot-suggestions") {
                return (
                  <div key={i} className="flex justify-start animate-[fadeSlideIn_0.25s_ease-out]">
                    <div className="flex flex-col gap-1.5 max-w-[85%] w-full">
                      {entry.topics.map(t => (
                        <button
                          key={t.id}
                          onClick={() => openTopic(t)}
                          className="text-left text-xs font-medium text-gray-700 bg-white border border-indigo-100 rounded-xl px-3.5 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/50 transition flex items-center justify-between group shadow-sm"
                        >
                          {t.label}
                          <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-400 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              // bot-topic — only render fully if it's the active topic (keeps history light)
              return (
                <div key={i} className="flex justify-start animate-[fadeSlideIn_0.25s_ease-out]">
                  <div className="bg-white border border-gray-200 text-gray-700 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                    {entry.topic.intro || `Here's how: ${entry.topic.label}`}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator — shown while a scripted reply is "being composed" */}
            {typing && <TypingBubble />}

            {/* Active topic — step walkthrough */}
            {activeTopic && !typing && (
              <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden animate-[fadeSlideIn_0.25s_ease-out]">
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
            {!activeTopic && !typing && (
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
              placeholder={`Message ${ASSISTANT_NAME}...`}
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
