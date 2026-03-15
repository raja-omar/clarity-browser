import { useEffect, useMemo, useState } from "react";
import { Bot, SendHorizonal } from "lucide-react";
import type { CoachChatMessage, CoachContextPayload } from "../../types";

interface CoachChatPaneProps {
  context?: CoachContextPayload;
}

export function CoachChatPane({ context }: CoachChatPaneProps) {
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasConfiguredKey, setHasConfiguredKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const systemSeed = useMemo<CoachChatMessage[]>(() => {
    const intro = context
      ? `I can help with "${context.title}". Share what you need and I will draft messages, next steps, and concrete questions to ask.`
      : "I can help you work smarter when overloaded. Share your situation and I will propose next actions.";

    const seed: CoachChatMessage[] = [{ role: "assistant", content: intro }];
    if (context?.draftMessage) {
      seed.push({ role: "assistant", content: `Starter draft:\n${context.draftMessage}` });
    }
    return seed;
  }, [context]);

  useEffect(() => {
    setMessages(systemSeed);
    setInput(context?.suggestedPrompts?.[0] ?? "");
  }, [context, systemSeed]);

  useEffect(() => {
    async function checkKey() {
      if (!window.clarity?.hasOpenAIKey) {
        setCheckingKey(false);
        return;
      }
      try {
        const status = await window.clarity.hasOpenAIKey();
        setHasConfiguredKey(Boolean(status.configured));
      } finally {
        setCheckingKey(false);
      }
    }
    void checkKey();
  }, []);

  async function handleSend(): Promise<void> {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const nextUserMessage: CoachChatMessage = { role: "user", content: prompt };
    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      if (!window.clarity?.chatWithCoach) {
        throw new Error("AI coach bridge is not available.");
      }
      const response = await window.clarity.chatWithCoach({
        messages: nextMessages,
        context,
      });
      setMessages((current) => [...current, { role: "assistant", content: response.reply }]);
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "I could not reach AI right now. Try again and keep your request short.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `I could not complete that request.\n${fallback}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveApiKey(): Promise<void> {
    const value = apiKeyInput.trim();
    if (!value || !window.clarity?.saveOpenAIApiKey || keySaving) return;
    setKeySaving(true);
    try {
      const result = await window.clarity.saveOpenAIApiKey(value);
      setKeySaved(Boolean(result.saved));
      if (result.saved) {
        setApiKeyInput("");
        setHasConfiguredKey(true);
      }
    } finally {
      setKeySaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="border-b border-white/10 bg-slate-900/80 px-5 py-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-indigo-200/80">
          <Bot className="h-4 w-4" />
          AI Coach
        </p>
        <h2 className="mt-1 text-base font-semibold text-white">
          {context?.title ? `${context.title} support` : "Guidance chat"}
        </h2>
        {context?.summary && <p className="mt-1 text-xs text-slate-400">{context.summary}</p>}
      </div>

      {!checkingKey && !hasConfiguredKey && (
        <div className="border-b border-white/5 bg-slate-900/60 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            Optional: save your OpenAI API key in local app settings to enable full AI responses.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="sk-..."
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
            />
            <button
              type="button"
              disabled={keySaving || !apiKeyInput.trim()}
              onClick={() => void handleSaveApiKey()}
              className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {keySaving ? "Saving..." : keySaved ? "Saved" : "Save key"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto soft-scrollbar px-5 py-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[88%] rounded-xl border px-3 py-2 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto border-indigo-300/20 bg-indigo-500/15 text-indigo-50"
                : "border-white/10 bg-slate-900/75 text-slate-100"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form
        className="border-t border-white/10 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for help with messaging, prioritization, or next steps..."
            className="flex-1 bg-transparent px-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-indigo-500/20 p-2 text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
