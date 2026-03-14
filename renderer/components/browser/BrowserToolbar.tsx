import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Search, Star } from "lucide-react";
import type { Bookmark, BrowserTab } from "../../types";

interface BrowserToolbarProps {
  activeTab?: BrowserTab;
  bookmarks: Bookmark[];
  onNavigate: (value: string) => void;
  onOpenCommandPalette: () => void;
  onOpenExternal: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
}

export function BrowserToolbar({
  activeTab,
  bookmarks,
  onNavigate,
  onOpenCommandPalette,
  onOpenExternal,
  onGoBack,
  onGoForward,
}: BrowserToolbarProps) {
  const [value, setValue] = useState(activeTab?.url ?? "");

  useEffect(() => {
    setValue(activeTab?.url ?? "");
  }, [activeTab?.url]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNavigate(value);
  };

  return (
    <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
      <div className="flex items-center gap-1 text-slate-500">
        <button
          type="button"
          onClick={onGoBack}
          className="rounded-lg p-1.5 transition hover:bg-white/5 hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onGoForward}
          className="rounded-lg p-1.5 transition hover:bg-white/5 hover:text-slate-300"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <form
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5"
        onSubmit={handleSubmit}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-200 outline-none placeholder:text-slate-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={onOpenCommandPalette}
          placeholder="Search or enter URL…"
        />
      </form>

      <div className="flex items-center gap-1">
        {bookmarks.slice(0, 3).map((bookmark) => (
          <button
            key={bookmark.id}
            type="button"
            onClick={() => {
              setValue(bookmark.url);
              onNavigate(bookmark.url);
            }}
            title={bookmark.label}
            className="rounded-lg px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {bookmark.label}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => activeTab && onOpenExternal(activeTab.url)}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          title="Open externally"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
