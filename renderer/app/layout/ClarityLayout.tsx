import { useRef } from "react";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { TabBar } from "../../components/tabs/TabBar";
import { BrowserToolbar } from "../../components/browser/BrowserToolbar";
import { BrowserViewport, type BrowserViewportHandle } from "../../components/browser/BrowserViewport";
import { CommandPalette } from "../../features/ai/CommandPalette";
import { TaskDrawer } from "../../features/tasks/TaskDrawer";
import { CalendarDrawer } from "../../features/calendar/CalendarDrawer";
import { ContextDrawer } from "../../features/ai/ContextDrawer";
import { FocusModeOverlay } from "../../features/ai/FocusModeOverlay";
import { MorningBriefModal } from "../../features/ai/MorningBriefModal";
import { DueSoonPopup } from "../../features/notifications/DueSoonPopup";
import type {
  Bookmark,
  BrowserTab,
  CoachContextPayload,
  EnergyLevel,
  EnergyLog,
  Meeting,
  ScheduleBlock,
  Task,
} from "../../types";
import type { DueSoonReminder } from "../../features/notifications/reminderEngine";

interface ClarityLayoutProps {
  tabs: BrowserTab[];
  groups: string[];
  activeSection: "home" | "group";
  activeGroup?: string;
  bookmarks: Bookmark[];
  activeTab?: BrowserTab;
  reliefMode: boolean;
  focusMinutes: number;
  commandPaletteOpen: boolean;
  focusModeActive: boolean;
  taskDrawerOpen: boolean;
  calendarDrawerOpen: boolean;
  contextDrawerOpen: boolean;
  morningBriefOpen: boolean;
  sidebarCollapsed: boolean;
  tasks: Task[];
  selectedTask?: Task;
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  energyLogs: EnergyLog[];
  onSelectTab: (tabId: string) => void;
  onSelectHome: () => void;
  onSelectGroup: (group: string) => void;
  onCreateGroup: (group: string) => void;
  onRenameGroup: (fromGroup: string, toGroup: string) => void;
  onMoveTabToGroup: (tabId: string, group: string) => void;
  onAddBookmarkFromTab: (tabId: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onToggleBookmarkFromTab: (tabId: string) => void;
  onNavigate: (value: string) => void;
  onToggleReliefMode: () => void;
  onOpenCommandPalette: () => void;
  onCommandPaletteOpenChange: (open: boolean) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  onLogEnergy: (energy: EnergyLevel) => void;
  onOpenExternal: (url: string) => void;
  onSetFocusMode: (active: boolean) => void;
  onSetTaskDrawer: (open: boolean) => void;
  onSetCalendarDrawer: (open: boolean) => void;
  onSetContextDrawer: (open: boolean) => void;
  onSetMorningBrief: (open: boolean) => void;
  onToggleSidebar: () => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onAddTask: (title: string) => void;
  onOpenAddTaskModal: () => void;
  onOpenAddMeetingModal: () => void;
  onOpenPersonalization: () => void;
  onOpenHealthCheckIn: () => void;
  onSyncJira: () => void;
  jiraSyncing?: boolean;
  dueSoonReminder?: DueSoonReminder;
  dueSoonReminderOpen: boolean;
  onCloseDueSoonReminder: () => void;
  onSnoozeDueSoonReminder: () => void;
  onMarkHandledDueSoonReminder: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
  onUpdateMeetingSupport: (
    payload: import("../../types").UpdateMeetingSupportInput,
  ) => Promise<Meeting | undefined>;
  onTriggerTestTaskPopup: () => void;
  onTriggerTestMeetingPopup: () => void;
}

export function ClarityLayout({
  tabs,
  groups,
  activeSection,
  activeGroup,
  bookmarks,
  activeTab,
  reliefMode,
  focusMinutes,
  commandPaletteOpen,
  focusModeActive,
  taskDrawerOpen,
  calendarDrawerOpen,
  contextDrawerOpen,
  morningBriefOpen,
  sidebarCollapsed,
  tasks,
  selectedTask,
  meetings,
  schedule,
  energyLogs,
  onSelectTab,
  onSelectHome,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onMoveTabToGroup,
  onAddBookmarkFromTab,
  onRemoveBookmark,
  onToggleBookmarkFromTab,
  onNavigate,
  onToggleReliefMode,
  onOpenCommandPalette,
  onCommandPaletteOpenChange,
  onSelectTask,
  onUpdateTaskStatus,
  onLogEnergy,
  onOpenExternal,
  onSetFocusMode,
  onSetTaskDrawer,
  onSetCalendarDrawer,
  onSetContextDrawer,
  onSetMorningBrief,
  onToggleSidebar,
  onCloseTab,
  onNewTab,
  onAddTask,
  onOpenAddTaskModal,
  onOpenAddMeetingModal,
  onOpenPersonalization,
  onOpenHealthCheckIn,
  onSyncJira,
  jiraSyncing,
  dueSoonReminder,
  dueSoonReminderOpen,
  onCloseDueSoonReminder,
  onSnoozeDueSoonReminder,
  onMarkHandledDueSoonReminder,
  onOpenCoach,
  onUpdateMeetingSupport,
  onTriggerTestTaskPopup,
  onTriggerTestMeetingPopup,
}: ClarityLayoutProps) {
  const viewportRef = useRef<BrowserViewportHandle>(null);
  const visibleTabs = tabs.filter((tab) =>
    activeSection === "home" ? !tab.group?.trim() : tab.group?.trim() === activeGroup,
  );

  function handleStartFocus(taskId: string) {
    onSelectTask(taskId);
    onSetFocusMode(true);
    onSetTaskDrawer(false);
  }

  return (
    <>
      <div className="flex h-screen gap-3 p-3">
        <Sidebar
          tabs={tabs}
          groups={groups}
          activeSection={activeSection}
          activeGroup={activeGroup}
          collapsed={sidebarCollapsed}
          focusMode={focusModeActive}
          onSelectHome={onSelectHome}
          onSelectGroup={onSelectGroup}
          onCreateGroup={onCreateGroup}
          onRenameGroup={onRenameGroup}
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenTasks={() => onSetTaskDrawer(true)}
          onOpenCalendar={() => onSetCalendarDrawer(true)}
          onOpenPersonalization={onOpenPersonalization}
          onOpenHealth={onOpenHealthCheckIn}
          onToggleCollapse={onToggleSidebar}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <div className="browser-shell flex flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
              <TabBar
                tabs={visibleTabs}
                groups={groups}
                activeTabId={activeTab?.id}
                onSelectTab={onSelectTab}
                onCloseTab={onCloseTab}
                onNewTab={onNewTab}
                onMoveTabToGroup={onMoveTabToGroup}
              />
            </div>

            <BrowserToolbar
              activeTab={activeTab}
              tabs={tabs}
              bookmarks={bookmarks}
              onAddBookmarkFromActiveTab={() => activeTab && onAddBookmarkFromTab(activeTab.id)}
              onToggleBookmarkFromActiveTab={() => activeTab && onToggleBookmarkFromTab(activeTab.id)}
              onRemoveBookmark={onRemoveBookmark}
              onNavigate={onNavigate}
              onOpenCommandPalette={onOpenCommandPalette}
              onOpenExternal={onOpenExternal}
              onGoBack={() => viewportRef.current?.goBack()}
              onGoForward={() => viewportRef.current?.goForward()}
              onReload={() => viewportRef.current?.reload()}
            />

            <BrowserViewport
              ref={viewportRef}
              activeTab={activeTab}
              activeSection={activeSection}
              reliefMode={reliefMode}
              selectedTask={selectedTask}
            />
          </div>
        </main>
      </div>

      <FocusModeOverlay
        active={focusModeActive}
        task={selectedTask}
        focusMinutes={focusMinutes}
        onStop={() => onSetFocusMode(false)}
      />

      <TaskDrawer
        open={taskDrawerOpen}
        onClose={() => onSetTaskDrawer(false)}
        tasks={tasks}
        selectedTaskId={selectedTask?.id}
        onSelectTask={onSelectTask}
        onUpdateStatus={onUpdateTaskStatus}
        onStartFocus={handleStartFocus}
        onAddTask={onAddTask}
        onOpenAddTaskModal={onOpenAddTaskModal}
        onSyncJira={onSyncJira}
        jiraSyncing={jiraSyncing}
      />

      <CalendarDrawer
        open={calendarDrawerOpen}
        onClose={() => onSetCalendarDrawer(false)}
        meetings={meetings}
        onOpenAddMeetingModal={onOpenAddMeetingModal}
        onOpenCoach={onOpenCoach}
      />

      <ContextDrawer
        open={contextDrawerOpen}
        onClose={() => onSetContextDrawer(false)}
        activeTab={activeTab}
        selectedTask={selectedTask}
      />

      <MorningBriefModal
        open={morningBriefOpen}
        onClose={() => onSetMorningBrief(false)}
        tasks={tasks}
        meetings={meetings}
        schedule={schedule}
        latestEnergy={energyLogs[0]}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={onCommandPaletteOpenChange}
        tabs={tabs}
        tasks={tasks}
        bookmarks={bookmarks}
        onOpenTab={onSelectTab}
        onNavigate={onNavigate}
        onSelectTask={onSelectTask}
        onOpenTasks={() => onSetTaskDrawer(true)}
        onOpenCalendar={() => onSetCalendarDrawer(true)}
        onStartFocus={() => {
          if (selectedTask) {
            onSetFocusMode(true);
          }
        }}
        onToggleReliefMode={onToggleReliefMode}
        onOpenContext={() => onSetContextDrawer(true)}
        onOpenPersonalization={onOpenPersonalization}
        onOpenCoach={() =>
          onOpenCoach({
            source: "general",
            title: "General guidance",
            summary: "Help me prioritize and communicate clearly when I feel overwhelmed.",
          })
        }
      />

      <DueSoonPopup
        reminder={dueSoonReminder}
        open={dueSoonReminderOpen}
        onClose={onCloseDueSoonReminder}
        onSnooze={onSnoozeDueSoonReminder}
        onMarkHandled={onMarkHandledDueSoonReminder}
        onOpenCoach={onOpenCoach}
        onUpdateMeetingSupport={onUpdateMeetingSupport}
      />
      <div
        className="fixed bottom-5 left-5 z-[81] rounded-xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur"
        style={{ width: sidebarCollapsed ? 64 : 260 }}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onTriggerTestTaskPopup}
            className={`rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.08)] transition duration-150 hover:-translate-y-0.5 hover:border-indigo-300/45 hover:bg-indigo-500/25 hover:shadow-[0_10px_30px_rgba(79,70,229,0.18)] active:translate-y-0 active:scale-[0.99] ${
              sidebarCollapsed ? "w-full" : "w-full text-left"
            }`}
            title="Incoming Task CheckIn"
          >
            {sidebarCollapsed ? "Task" : "Incoming Task CheckIn"}
          </button>
          <button
            type="button"
            onClick={onTriggerTestMeetingPopup}
            className={`rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] transition duration-150 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-emerald-500/25 hover:shadow-[0_10px_30px_rgba(16,185,129,0.18)] active:translate-y-0 active:scale-[0.99] ${
              sidebarCollapsed ? "w-full" : "w-full text-left"
            }`}
            title="Incoming Meeting CheckIn"
          >
            {sidebarCollapsed ? "Meet" : "Incoming Meeting CheckIn"}
          </button>
        </div>
      </div>
    </>
  );
}
