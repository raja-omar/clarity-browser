import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { BrowserTab, Task } from "../../types";
import { CoachChatPane } from "../../features/ai/CoachChatPane";
import { CalendarRecommendationsPane } from "../../features/ai/CalendarRecommendationsPane";

export interface BrowserViewportHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

interface BrowserViewportProps {
  activeTab?: BrowserTab;
  activeSection: "home" | "group";
  reliefMode: boolean;
  selectedTask?: Task;
}

export const BrowserViewport = forwardRef<BrowserViewportHandle, BrowserViewportProps>(
  function BrowserViewport({ activeTab, activeSection, reliefMode, selectedTask }, ref) {
    const webviewRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (webviewRef.current) {
        webviewRef.current.setAttribute("allowpopups", "true");
      }
    }, [activeTab?.url]);

    useImperativeHandle(ref, () => ({
      goBack() {
        const wv = webviewRef.current as any;
        if (wv?.canGoBack?.()) wv.goBack();
      },
      goForward() {
        const wv = webviewRef.current as any;
        if (wv?.canGoForward?.()) wv.goForward();
      },
      reload() {
        const wv = webviewRef.current as any;
        if (wv?.reload) wv.reload();
      },
    }));

    if (reliefMode) {
      return (
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div className="mesh-overlay absolute inset-0 opacity-30" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 max-w-md px-8 text-center"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Sparkles className="h-6 w-6 text-indigo-300" />
            </div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-indigo-300/70">
              Cognitive Relief Mode
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Focus on one thing at a time.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {selectedTask
                ? `Current focus: ${selectedTask.title}. Keep the browser minimal and return when the timer completes.`
                : "Clarity is reducing visual noise so the next best action is obvious."}
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="webview-host relative flex-1 overflow-hidden">
        {activeTab ? (
          activeTab.context === "coach" ? (
            <CoachChatPane context={activeTab.coachContext} />
          ) : activeTab.context === "calendar_recommendations" ? (
            <CalendarRecommendationsPane data={activeTab.calendarRecommendationsData} />
          ) : (
            <webview
              ref={webviewRef}
              className="h-full w-full"
              src={activeTab.url}
              partition="persist:clarity"
            />
          )
        ) : (
          activeSection === "home" ? <HomeBlankState /> : <EmptyGroupState />
        )}
      </div>
    );
  },
);

function HomeBlankState() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10">
          <Sparkles className="h-7 w-7 text-indigo-300" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-indigo-300/75">Home</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{greeting}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Start with a clean workspace. Use the `+` button to open tabs here and work without adding them to any saved
          group.
        </p>
      </div>
    </div>
  );
}

function EmptyGroupState() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="max-w-md text-center">
        <p className="text-sm text-slate-400">This group does not have any tabs yet. Use `+` to add one.</p>
      </div>
    </div>
  );
}
