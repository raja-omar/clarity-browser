import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark as BookmarkIcon,
  ChevronDown,
  Command,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import type { Bookmark, BrowserTab } from "../../types";

interface BrowserToolbarProps {
  activeTab?: BrowserTab;
  tabs: BrowserTab[];
  bookmarks: Bookmark[];
  onAddBookmarkFromActiveTab: () => void;
  onToggleBookmarkFromActiveTab: () => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onNavigate: (value: string) => void;
  onOpenCommandPalette: () => void;
  onOpenExternal: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
}

export function BrowserToolbar({
  activeTab,
  tabs,
  bookmarks,
  onAddBookmarkFromActiveTab,
  onToggleBookmarkFromActiveTab,
  onRemoveBookmark,
  onNavigate,
  onOpenCommandPalette,
  onOpenExternal,
  onGoBack,
  onGoForward,
  onReload,
}: BrowserToolbarProps) {
  const [value, setValue] = useState(activeTab?.url ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [bookmarkMenuOpen, setBookmarkMenuOpen] = useState(false);
  const activeBookmark = activeTab ? bookmarks.find((bookmark) => bookmark.url === activeTab.url) : undefined;

  useEffect(() => {
    setValue(activeTab?.url ?? "");
  }, [activeTab?.url]);

  const suggestions = useMemo(() => {
    const trimmed = value.trim();
    const normalizedQuery = trimmed.toLowerCase();
    const items: Array<{
      id: string;
      label: string;
      value: string;
      hint: string;
    }> = [];
    const seen = new Set<string>();

    function addSuggestion(id: string, label: string, nextValue: string, hint: string) {
      const dedupeKey = nextValue.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      items.push({ id, label, value: nextValue, hint });
    }

    if (trimmed.length > 0) {
      addSuggestion(
        `search-${trimmed}`,
        `Search Google for "${trimmed}"`,
        trimmed,
        "Search",
      );

      if (trimmed.includes(".") && !trimmed.includes(" ")) {
        const directUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : `https://${trimmed}`;
        addSuggestion(`direct-${directUrl}`, directUrl, directUrl, "Direct URL");
      }
    }

    for (const bookmark of bookmarks) {
      const label = bookmark.label.toLowerCase();
      const url = bookmark.url.toLowerCase();
      if (normalizedQuery && !label.includes(normalizedQuery) && !url.includes(normalizedQuery)) {
        continue;
      }
      addSuggestion(`bookmark-${bookmark.id}`, bookmark.label, bookmark.url, "Bookmark");
    }

    for (const tab of tabs) {
      const title = tab.title.toLowerCase();
      const url = tab.url.toLowerCase();
      if (normalizedQuery && !title.includes(normalizedQuery) && !url.includes(normalizedQuery)) {
        continue;
      }
      addSuggestion(`tab-${tab.id}`, tab.title, tab.url, "Open tab");
    }

    const commonSites = [
      "https://mail.google.com",
      "https://calendar.google.com",
      "https://www.notion.so",
      "https://linear.app",
      "https://github.com",
      "https://www.youtube.com",
    ];

    for (const site of commonSites) {
      if (normalizedQuery && !site.toLowerCase().includes(normalizedQuery)) {
        continue;
      }
      addSuggestion(`site-${site}`, site, site, "Popular");
    }

    return items.slice(0, 8);
  }, [bookmarks, tabs, value]);

  useEffect(() => {
    if (activeSuggestionIndex >= suggestions.length) {
      setActiveSuggestionIndex(suggestions.length > 0 ? 0 : -1);
    }
  }, [activeSuggestionIndex, suggestions.length]);

  function navigateTo(nextValue: string) {
    setValue(nextValue);
    onNavigate(nextValue);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setBookmarkMenuOpen(false);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (showSuggestions && activeSuggestionIndex >= 0) {
      const picked = suggestions[activeSuggestionIndex];
      if (picked) {
        navigateTo(picked.value);
        return;
      }
    }
    navigateTo(value);
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
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg p-1.5 transition hover:bg-white/5 hover:text-slate-300"
          title="Refresh page"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative min-w-0 flex-1">
        <form
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5"
          onSubmit={handleSubmit}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-200 outline-none placeholder:text-slate-500"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setShowSuggestions(true);
              setActiveSuggestionIndex(0);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              setActiveSuggestionIndex(suggestions.length > 0 ? 0 : -1);
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
              }, 100);
            }}
            onKeyDown={(event) => {
              if (!showSuggestions || suggestions.length === 0) return;

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveSuggestionIndex((current) =>
                  current < suggestions.length - 1 ? current + 1 : 0,
                );
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveSuggestionIndex((current) =>
                  current > 0 ? current - 1 : suggestions.length - 1,
                );
              }

              if (event.key === "Escape") {
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
              }
            }}
            placeholder="Search or enter URL..."
          />
        </form>

        {showSuggestions && suggestions.length > 0 ? (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                  index === activeSuggestionIndex ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  navigateTo(suggestion.value);
                }}
              >
                <span className="truncate pr-3">{suggestion.label}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                  {suggestion.hint}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          title="Command palette"
        >
          <Command className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleBookmarkFromActiveTab}
          disabled={!activeTab || activeTab.url.startsWith("clarity://") || activeTab.url === "about:blank"}
          className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
            activeBookmark
              ? "text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          }`}
          title={activeBookmark ? "Remove bookmark" : "Add bookmark"}
        >
          <Star className={`h-3.5 w-3.5 ${activeBookmark ? "fill-current" : ""}`} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setBookmarkMenuOpen((open) => !open)}
            className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
            title="Bookmarks"
          >
            <BookmarkIcon className="h-3.5 w-3.5" />
            <span>Bookmarks</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {bookmarkMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onAddBookmarkFromActiveTab();
                  setBookmarkMenuOpen(false);
                }}
                disabled={!activeTab || activeTab.url.startsWith("clarity://") || activeTab.url === "about:blank"}
                className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add current tab to bookmarks</span>
              </button>

              <div className="max-h-64 overflow-y-auto soft-scrollbar py-1">
                {bookmarks.length > 0 ? (
                  bookmarks.map((bookmark) => (
                    <button
                      key={bookmark.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setValue(bookmark.url);
                        navigateTo(bookmark.url);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        onRemoveBookmark(bookmark.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5"
                      title="Click to open, right-click to delete"
                    >
                      <BookmarkIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-100">{bookmark.label}</span>
                        <span className="block truncate text-[10px] text-slate-500">{bookmark.url}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-slate-500">No bookmarks yet.</div>
                )}
              </div>
              {bookmarks.length > 0 ? (
                <div className="border-t border-white/5 px-3 py-2 text-[10px] text-slate-500">
                  Right-click a bookmark to delete it.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() =>
            activeTab && !activeTab.url.startsWith("clarity://") && onOpenExternal(activeTab.url)
          }
          disabled={!activeTab || activeTab.url.startsWith("clarity://")}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          title="Open externally"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
