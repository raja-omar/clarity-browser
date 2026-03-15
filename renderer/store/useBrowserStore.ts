import { create } from "zustand";
import type { AppBootstrap, Bookmark, BrowserTab, CoachContextPayload } from "../types";

interface BrowserState {
  tabs: BrowserTab[];
  groups: string[];
  bookmarks: Bookmark[];
  activeSection: "home" | "group";
  activeHomeTabId?: string;
  activeGroupTabId?: string;
  activeGroup?: string;
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
  setActiveHome: () => void;
  setActiveGroup: (group: string) => void;
  createGroup: (group: string) => void;
  renameGroup: (fromGroup: string, toGroup: string) => void;
  moveTabToGroup: (tabId: string, group: string) => void;
  addBookmarkFromTab: (tabId: string) => void;
  removeBookmark: (bookmarkId: string) => void;
  toggleBookmarkFromTab: (tabId: string) => void;
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

function getTabGroup(tab?: BrowserTab): string | undefined {
  const group = tab?.group?.trim();
  return group ? group : undefined;
}

function isTabInGroup(tab: BrowserTab, group: string): boolean {
  return getTabGroup(tab) === group;
}

function getAutoTabTitle(value: string): string {
  return value.length > 36 ? `${value.slice(0, 36)}...` : value;
}

function getUniqueGroups(tabs: BrowserTab[], extraGroups: string[] = []): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];

  for (const group of [
    ...tabs.map((tab) => getTabGroup(tab)).filter((group): group is string => Boolean(group)),
    ...extraGroups,
  ]) {
    const trimmed = group.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    groups.push(trimmed);
  }

  return groups;
}

export const useBrowserStore = create<BrowserState>((set) => ({
  tabs: [],
  groups: [],
  bookmarks: [],
  activeSection: "home",
  activeHomeTabId: undefined,
  activeGroupTabId: undefined,
  activeGroup: undefined,
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
    set(() => {
      const groups = getUniqueGroups(bootstrap.tabs);
      return {
        tabs: bootstrap.tabs,
        groups,
        bookmarks: bootstrap.bookmarks,
        activeSection: "home",
        activeHomeTabId: undefined,
        activeGroupTabId: groups[0]
          ? bootstrap.tabs.find((tab) => getTabGroup(tab) === groups[0])?.id
          : undefined,
        activeGroup: groups[0],
      };
    }),
  setActiveTab: (tabId) =>
    set((state) => {
      const nextActiveTab = state.tabs.find((tab) => tab.id === tabId);
      if (!nextActiveTab) {
        return {
          activeSection: state.activeSection,
          activeHomeTabId: state.activeHomeTabId,
          activeGroupTabId: state.activeGroupTabId,
          activeGroup: state.activeGroup,
        };
      }
      const group = getTabGroup(nextActiveTab);
      if (!group) {
        return {
          activeSection: "home" as const,
          activeHomeTabId: tabId,
          activeGroupTabId: state.activeGroupTabId,
          activeGroup: state.activeGroup,
        };
      }
      return {
        activeSection: "group" as const,
        activeHomeTabId: state.activeHomeTabId,
        activeGroupTabId: tabId,
        activeGroup: group,
      };
    }),
  setActiveHome: () =>
    set((state) => ({
      activeSection: "home",
      activeHomeTabId:
        state.activeHomeTabId ?? state.tabs.find((tab) => getTabGroup(tab) === undefined)?.id,
      activeGroupTabId: state.activeGroupTabId,
      activeGroup: state.activeGroup,
    })),
  setActiveGroup: (group) =>
    set((state) => {
      const tabsInGroup = state.tabs.filter((tab) => isTabInGroup(tab, group));
      const activeTabInGroup = tabsInGroup.find((tab) => tab.id === state.activeGroupTabId);
      return {
        activeSection: "group" as const,
        activeGroup: group,
        activeHomeTabId: state.activeHomeTabId,
        activeGroupTabId: activeTabInGroup?.id ?? tabsInGroup[0]?.id,
      };
    }),
  createGroup: (group) =>
    set((state) => {
      const trimmed = group.trim();
      if (!trimmed || state.groups.includes(trimmed)) {
        return { groups: state.groups, activeGroup: state.activeGroup };
      }
      return {
        groups: [...state.groups, trimmed],
        activeSection: "group" as const,
        activeGroup: trimmed,
        activeHomeTabId: state.activeHomeTabId,
        activeGroupTabId: undefined,
      };
    }),
  renameGroup: (fromGroup, toGroup) =>
    set((state) => {
      const nextGroup = toGroup.trim();
      if (!nextGroup) {
        return { tabs: state.tabs, groups: state.groups, activeGroup: state.activeGroup };
      }

      const tabs = state.tabs.map((tab) =>
        isTabInGroup(tab, fromGroup)
          ? {
              ...tab,
              group: nextGroup,
            }
          : tab,
      );

      return {
        tabs,
        groups: getUniqueGroups(tabs, state.groups.map((group) => (group === fromGroup ? nextGroup : group))),
        activeGroup: state.activeGroup === fromGroup ? nextGroup : state.activeGroup,
      };
    }),
  moveTabToGroup: (tabId, group) =>
    set((state) => {
      const nextGroup = group.trim();
      if (!nextGroup) {
        return {
          tabs: state.tabs,
          groups: state.groups,
          activeSection: state.activeSection,
          activeGroup: state.activeGroup,
          activeHomeTabId: state.activeHomeTabId,
          activeGroupTabId: state.activeGroupTabId,
        };
      }

      const tabs = state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              group: nextGroup,
            }
          : tab,
      );

      return {
        tabs,
        groups: getUniqueGroups(tabs, [...state.groups, nextGroup]),
        activeSection:
          state.activeSection === "home" && state.activeHomeTabId === tabId ? ("group" as const) : state.activeSection,
        activeGroup:
          state.activeSection === "home" && state.activeHomeTabId === tabId
            ? nextGroup
            : state.activeSection === "group" && state.activeGroupTabId === tabId
              ? nextGroup
              : state.activeGroup,
        activeHomeTabId:
          state.activeHomeTabId === tabId
            ? state.tabs.find((tab) => tab.id !== tabId && getTabGroup(tab) === undefined)?.id
            : state.activeHomeTabId,
        activeGroupTabId:
          state.activeSection === "home" && state.activeHomeTabId === tabId
            ? tabId
            : state.activeGroupTabId,
      };
    }),
  addBookmarkFromTab: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId);
      if (!tab || tab.url.startsWith("clarity://") || tab.url === "about:blank") {
        return { bookmarks: state.bookmarks };
      }

      const existingBookmark = state.bookmarks.find((bookmark) => bookmark.url === tab.url);
      if (existingBookmark) {
        return { bookmarks: state.bookmarks };
      }

      const nextBookmark: Bookmark = {
        id: `bookmark-${Date.now()}`,
        label: tab.title.trim() || "Saved tab",
        url: tab.url,
      };

      return {
        bookmarks: [...state.bookmarks, nextBookmark],
      };
    }),
  removeBookmark: (bookmarkId) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
    })),
  toggleBookmarkFromTab: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId);
      if (!tab || tab.url.startsWith("clarity://") || tab.url === "about:blank") {
        return { bookmarks: state.bookmarks };
      }

      const existingBookmark = state.bookmarks.find((bookmark) => bookmark.url === tab.url);
      if (existingBookmark) {
        return {
          bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== existingBookmark.id),
        };
      }

      const nextBookmark: Bookmark = {
        id: `bookmark-${Date.now()}`,
        label: tab.title.trim() || "Saved tab",
        url: tab.url,
      };

      return {
        bookmarks: [...state.bookmarks, nextBookmark],
      };
    }),
  navigateActiveTab: (value) =>
    set((state) => {
      const normalizedUrl = normalizeInput(value);
      const currentActiveTabId =
        state.activeSection === "home" ? state.activeHomeTabId : state.activeGroupTabId;
      const currentTab = state.tabs.find((tab) => tab.id === currentActiveTabId);
      const targetGroup = state.activeSection === "group" ? state.activeGroup : undefined;
      const existingTab = state.tabs.find(
        (tab) =>
          getTabGroup(tab) === targetGroup && tab.url === normalizedUrl && tab.context !== "coach",
      );

      if (existingTab) {
        return {
          tabs: state.tabs,
          groups: getUniqueGroups(state.tabs, targetGroup ? [...state.groups, targetGroup] : state.groups),
          activeSection: state.activeSection,
          activeHomeTabId: targetGroup ? state.activeHomeTabId : existingTab.id,
          activeGroupTabId: targetGroup ? existingTab.id : state.activeGroupTabId,
          activeGroup: targetGroup ?? state.activeGroup,
        };
      }

      const canReuseCurrentTab =
        currentTab &&
        currentTab.context !== "coach" &&
        currentTab.url === "about:blank" &&
        getTabGroup(currentTab) === targetGroup;

      if (canReuseCurrentTab) {
        return {
          tabs: state.tabs.map((tab) =>
            tab.id === currentTab.id
              ? {
                  ...tab,
                  url: normalizedUrl,
                  title: getAutoTabTitle(value),
                }
              : tab,
          ),
          groups: getUniqueGroups(state.tabs, targetGroup ? [...state.groups, targetGroup] : state.groups),
          activeSection: state.activeSection,
          activeHomeTabId: targetGroup ? state.activeHomeTabId : currentTab.id,
          activeGroupTabId: targetGroup ? currentTab.id : state.activeGroupTabId,
          activeGroup: targetGroup ?? state.activeGroup,
        };
      }

      const id = `tab-${Date.now()}`;
      const newTab: BrowserTab = {
        id,
        title: getAutoTabTitle(value),
        url: normalizedUrl,
        icon: "Globe",
        group: targetGroup,
        context: "browser",
      };

      return {
        tabs: [...state.tabs, newTab],
        groups: getUniqueGroups(
          [...state.tabs, newTab],
          targetGroup ? [...state.groups, targetGroup] : state.groups,
        ),
        activeSection: state.activeSection,
        activeHomeTabId: targetGroup ? state.activeHomeTabId : id,
        activeGroupTabId: targetGroup ? id : state.activeGroupTabId,
        activeGroup: targetGroup ?? state.activeGroup,
      };
    }),
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
      const closedTab = state.tabs.find((tab) => tab.id === tabId);
      const closedTabGroup = getTabGroup(closedTab);
      let nextActiveHomeTabId = state.activeHomeTabId;
      let nextActiveGroupTabId = state.activeGroupTabId;
      let nextActiveSection = state.activeSection;
      let nextActiveGroup = state.activeGroup;

      if (state.activeHomeTabId === tabId) {
        nextActiveHomeTabId = remaining.find((tab) => getTabGroup(tab) === undefined)?.id;
        if (state.activeSection === "home") {
          nextActiveSection = "home";
        }
      }

      if (state.activeGroupTabId === tabId) {
        const nextInSameGroup = closedTabGroup
          ? remaining.find((tab) => getTabGroup(tab) === closedTabGroup)?.id
          : undefined;
        nextActiveGroupTabId = nextInSameGroup;
        if (state.activeSection === "group") {
          nextActiveGroup = closedTabGroup ?? state.activeGroup;
        }
      }

      return {
        tabs: remaining,
        groups: getUniqueGroups(remaining, state.groups),
        activeSection: nextActiveSection,
        activeHomeTabId: nextActiveHomeTabId,
        activeGroupTabId: nextActiveGroupTabId,
        activeGroup: nextActiveGroup,
      };
    }),
  addTab: () =>
    set((state) => {
      const targetGroup = state.activeSection === "group" ? state.activeGroup : undefined;
      const id = `tab-${Date.now()}`;
      const newTab: BrowserTab = {
        id,
        title: "New Tab",
        url: "about:blank",
        icon: "Globe",
        group: targetGroup,
        context: "browser",
      };
      return {
        tabs: [...state.tabs, newTab],
        groups: getUniqueGroups(
          [...state.tabs, newTab],
          targetGroup ? [...state.groups, targetGroup] : state.groups,
        ),
        activeSection: state.activeSection,
        activeHomeTabId: targetGroup ? state.activeHomeTabId : id,
        activeGroupTabId: targetGroup ? id : state.activeGroupTabId,
        activeGroup: targetGroup ?? state.activeGroup,
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
                  group: "Coach",
                  coachContext: context,
                }
              : tab,
          ),
          activeSection: "group" as const,
          activeHomeTabId: state.activeHomeTabId,
          activeGroupTabId: existingCoachTab.id,
          groups: getUniqueGroups(state.tabs, [...state.groups, "Coach"]),
          activeGroup: "Coach",
        };
      }

      const id = `coach-${Date.now()}`;
      const coachTab: BrowserTab = {
        id,
        title: context.title ? `Coach: ${context.title}` : "AI Coach",
        url: "clarity://coach",
        icon: "Bot",
        group: "Coach",
        context: "coach",
        coachContext: context,
      };
      return {
        tabs: [...state.tabs, coachTab],
        activeSection: "group" as const,
        activeHomeTabId: state.activeHomeTabId,
        activeGroupTabId: id,
        groups: getUniqueGroups([...state.tabs, coachTab], [...state.groups, "Coach"]),
        activeGroup: "Coach",
      };
    }),
}));
