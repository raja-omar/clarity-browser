import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { BrowserTab, Task } from "../../types";

export interface BrowserViewportHandle {
  goBack: () => void;
  goForward: () => void;
}

interface BrowserViewportProps {
  activeTab?: BrowserTab;
  reliefMode: boolean;
  selectedTask?: Task;
}

export const BrowserViewport = forwardRef<BrowserViewportHandle, BrowserViewportProps>(
  function BrowserViewport({ activeTab, reliefMode, selectedTask }, ref) {
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
      <div className="relative flex-1 bg-slate-950/40">
        {activeTab ? (
          <webview
            ref={webviewRef}
            className="h-full w-full"
            src={activeTab.url}
            partition="persist:clarity"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">Select a tab to begin.</p>
          </div>
        )}
      </div>
    );
  },
);
