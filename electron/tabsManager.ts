import type { Bookmark, BrowserTab } from "../renderer/types";

export function createStarterTabs(): {
  tabs: BrowserTab[];
  bookmarks: Bookmark[];
} {
  return {
    tabs: [
      {
        id: "tab-dashboard",
        title: "Clarity Home",
        url: "https://example.com",
        icon: "Sparkles",
        pinned: true,
        group: "Today",
        context: "focus",
      },
      {
        id: "tab-jira",
        title: "Sprint Board",
        url: "https://jira.atlassian.com",
        icon: "KanbanSquare",
        group: "Work",
        context: "jira",
      },
      {
        id: "tab-calendar",
        title: "Calendar",
        url: "https://calendar.google.com",
        icon: "CalendarDays",
        group: "Work",
        context: "calendar",
      },
      {
        id: "tab-meeting",
        title: "Design Review",
        url: "https://meet.google.com",
        icon: "Video",
        group: "Meetings",
        context: "meeting",
      },
    ],
    bookmarks: [
      { id: "bookmark-gmail", label: "Gmail", url: "https://mail.google.com" },
      { id: "bookmark-notion", label: "Notion", url: "https://www.notion.so" },
      { id: "bookmark-linear", label: "Linear", url: "https://linear.app" },
    ],
  };
}

export function normalizeUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  if (input.includes(".") && !input.includes(" ")) {
    return `https://${input}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}
