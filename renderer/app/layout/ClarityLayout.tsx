import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { HealthCheckInModal } from "../../features/ai/HealthCheckInModal";
import { DueSoonPopup } from "../../features/notifications/DueSoonPopup";
import type {
  Bookmark,
  BrowserTab,
  CalendarRecommendationTrigger,
  CoachContextPayload,
  EnergyLevel,
  EnergyLog,
  HealthInterventionPlan,
  GoogleCalendarStatus,
  Meeting,
  SaveHealthCheckInInput,
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
  healthCheckInOpen: boolean;
  sidebarCollapsed: boolean;
  tasks: Task[];
  selectedTask?: Task;
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  energyLogs: EnergyLog[];
  googleCalendarStatus: GoogleCalendarStatus;
  googleCalendarBusy: boolean;
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
  onStartDay: () => void;
  onSetHealthCheckIn: (open: boolean) => void;
  onToggleSidebar: () => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onAddTask: (title: string) => void;
  onOpenAddTaskModal: () => void;
  onOpenAddMeetingModal: () => void;
  onOpenPersonalization: () => void;
  onOpenHealthCheckIn: () => void;
  onSubmitHealthCheckIn: (payload: SaveHealthCheckInInput) => Promise<void>;
  onGenerateHealthEscalationDraft: (userIntent: string) => Promise<string>;
  onHealthCheckInRecovered: () => void;
  healthCheckInSubmitting?: boolean;
  healthInterventionPlan?: HealthInterventionPlan;
  healthInterventionLoading?: boolean;
  projectedHealthIntervalMinutes?: number;
  projectedHealthTimes?: string[];
  onSyncJira: () => void;
  jiraSyncing?: boolean;
  dueSoonReminder?: DueSoonReminder;
  dueSoonReminderOpen: boolean;
  calendarScanNotice?: string;
  onCloseDueSoonReminder: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
  onUpdateMeetingSupport: (
    payload: import("../../types").UpdateMeetingSupportInput,
  ) => Promise<Meeting | undefined>;
  onEscalationDraftCopied: (payload: CalendarRecommendationTrigger) => void;
  onConnectGoogleCalendar: () => void;
  onRefreshGoogleCalendar: () => void;
  onDisconnectGoogleCalendar: () => void;
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
  healthCheckInOpen,
  sidebarCollapsed,
  tasks,
  selectedTask,
  meetings,
  schedule,
  energyLogs,
  googleCalendarStatus,
  googleCalendarBusy,
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
  onStartDay,
  onSetHealthCheckIn,
  onToggleSidebar,
  onCloseTab,
  onNewTab,
  onAddTask,
  onOpenAddTaskModal,
  onOpenAddMeetingModal,
  onOpenPersonalization,
  onOpenHealthCheckIn,
  onSubmitHealthCheckIn,
  onGenerateHealthEscalationDraft,
  onHealthCheckInRecovered,
  healthCheckInSubmitting,
  healthInterventionPlan,
  healthInterventionLoading,
  projectedHealthIntervalMinutes,
  projectedHealthTimes,
  onSyncJira,
  jiraSyncing,
  dueSoonReminder,
  dueSoonReminderOpen,
  calendarScanNotice,
  onCloseDueSoonReminder,
  onOpenCoach,
  onUpdateMeetingSupport,
  onEscalationDraftCopied,
  onConnectGoogleCalendar,
  onRefreshGoogleCalendar,
  onDisconnectGoogleCalendar,
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
      <AnimatePresence>
        {calendarScanNotice ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-4 z-[120] -translate-x-1/2 rounded-xl border border-indigo-300/25 bg-slate-950/95 px-4 py-2.5 text-xs text-indigo-100 shadow-2xl shadow-black/40 backdrop-blur"
          >
            {calendarScanNotice}
          </motion.div>
        ) : null}
      </AnimatePresence>
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
        googleCalendarStatus={googleCalendarStatus}
        googleCalendarBusy={googleCalendarBusy}
        onOpenAddMeetingModal={onOpenAddMeetingModal}
        onOpenCoach={onOpenCoach}
        onConnectGoogleCalendar={onConnectGoogleCalendar}
        onRefreshGoogleCalendar={onRefreshGoogleCalendar}
        onDisconnectGoogleCalendar={onDisconnectGoogleCalendar}
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
        onStartDay={onStartDay}
        tasks={tasks}
        meetings={meetings}
        schedule={schedule}
        latestEnergy={energyLogs[0]}
      />

      <HealthCheckInModal
        open={healthCheckInOpen}
        onClose={() => onSetHealthCheckIn(false)}
        onSubmit={onSubmitHealthCheckIn}
        onGenerateEscalationDraft={onGenerateHealthEscalationDraft}
        onFeelBetter={onHealthCheckInRecovered}
        submitting={healthCheckInSubmitting}
        plan={healthInterventionPlan}
        planLoading={healthInterventionLoading}
        projectedIntervalMinutes={projectedHealthIntervalMinutes}
        projectedTimes={projectedHealthTimes}
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
        onOpenCoach={onOpenCoach}
        onUpdateMeetingSupport={onUpdateMeetingSupport}
        onEscalationDraftCopied={onEscalationDraftCopied}
      />
    </>
  );
}
