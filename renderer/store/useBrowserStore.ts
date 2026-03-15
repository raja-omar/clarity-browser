import { create } from "zustand";
import type { AppBootstrap, Bookmark, BrowserTab, CoachContextPayload } from "../types";

interface BrowserState {
  tabs: BrowserTab[];
  bookmarks: Bookmark[];
  activeTabId?: string;
  reliefMode: boolean;
  commandPaletteOpen: boolean;
  focusTimerMinutes: number;
  focusModeActive: boolean;
  taskDrawerOpen: boolean;
  calendarDrawerOpen: boolean;
  contextDrawerOpen: boolean;
  morningBriefShown: boolean;
  sidebarCollapsed: boolean;
  initialize: (bootstrap: AppBootstrap) => void;
  setActiveTab: (tabId: string) => void;
  navigateActiveTab: (value: string) => void;
  toggleReliefMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setFocusTimerMinutes: (minutes: number) => void;
  setFocusModeActive: (active: boolean) => void;
  setTaskDrawerOpen: (open: boolean) => void;
  setCalendarDrawerOpen: (open: boolean) => void;
  setContextDrawerOpen: (open: boolean) => void;
  setMorningBriefShown: (shown: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  closeTab: (tabId: string) => void;
  addTab: () => void;
  openCoachTab: (context: CoachContextPayload) => void;
}

function normalizeInput(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.includes(".") && !value.includes(" ")) {
    return `https://${value}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

export const useBrowserStore = create<BrowserState>((set) => ({
  tabs: [],
  bookmarks: [],
  activeTabId: undefined,
  reliefMode: false,
  commandPaletteOpen: false,
  focusTimerMinutes: 25,
  focusModeActive: false,
  taskDrawerOpen: false,
  calendarDrawerOpen: false,
  contextDrawerOpen: false,
  morningBriefShown: false,
  sidebarCollapsed: false,
  initialize: (bootstrap) =>
    set({
      tabs: bootstrap.tabs,
      bookmarks: bootstrap.bookmarks,
      activeTabId: bootstrap.tabs[0]?.id,
    }),
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  navigateActiveTab: (value) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId
          ? tab.context === "coach"
            ? tab
            : {
                ...tab,
                url: normalizeInput(value),
                title: value.length > 36 ? `${value.slice(0, 36)}...` : value,
              }
          : tab,
      ),
    })),
  toggleReliefMode: () => set((state) => ({ reliefMode: !state.reliefMode })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setFocusTimerMinutes: (minutes) => set({ focusTimerMinutes: minutes }),
  setFocusModeActive: (active) =>
    set({ focusModeActive: active, sidebarCollapsed: active }),
  setTaskDrawerOpen: (open) =>
    set({ taskDrawerOpen: open, calendarDrawerOpen: false, contextDrawerOpen: false }),
  setCalendarDrawerOpen: (open) =>
    set({ calendarDrawerOpen: open, taskDrawerOpen: false, contextDrawerOpen: false }),
  setContextDrawerOpen: (open) =>
    set({ contextDrawerOpen: open, taskDrawerOpen: false, calendarDrawerOpen: false }),
  setMorningBriefShown: (shown) => set({ morningBriefShown: shown }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  closeTab: (tabId) =>
    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== tabId);
      const needsNewActive = state.activeTabId === tabId;
      return {
        tabs: remaining,
        activeTabId: needsNewActive
          ? remaining[0]?.id
          : state.activeTabId,
      };
    }),
  addTab: () =>
    set((state) => {
      const id = `tab-${Date.now()}`;
      const newTab: BrowserTab = {
        id,
        title: "New Tab",
        url: "about:blank",
        icon: "Globe",
        context: "browser",
      };
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      };
    }),
  openCoachTab: (context) =>
    set((state) => {
      const existingCoachTab = state.tabs.find((tab) => tab.context === "coach");
      if (existingCoachTab) {
        return {
          tabs: state.tabs.map((tab) =>
            tab.id === existingCoachTab.id
              ? {
                  ...tab,
                  title: context.title ? `Coach: ${context.title}` : "AI Coach",
                  coachContext: context,
                }
              : tab,
          ),
          activeTabId: existingCoachTab.id,
        };
      }

      const id = `coach-${Date.now()}`;
      const coachTab: BrowserTab = {
        id,
        title: context.title ? `Coach: ${context.title}` : "AI Coach",
        url: "clarity://coach",
        icon: "Bot",
        context: "coach",
        coachContext: context,
      };
      return {
        tabs: [...state.tabs, coachTab],
        activeTabId: id,
      };
    }),
}));
