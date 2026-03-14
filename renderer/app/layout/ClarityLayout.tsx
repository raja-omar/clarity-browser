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
import type {
  Bookmark,
  BrowserTab,
  EnergyLevel,
  EnergyLog,
  Meeting,
  ScheduleBlock,
  Task,
} from "../../types";

interface ClarityLayoutProps {
  tabs: BrowserTab[];
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
}

export function ClarityLayout({
  tabs,
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
}: ClarityLayoutProps) {
  const viewportRef = useRef<BrowserViewportHandle>(null);

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
          activeTabId={activeTab?.id}
          collapsed={sidebarCollapsed}
          focusMode={focusModeActive}
          onSelectTab={onSelectTab}
          onNavigate={onNavigate}
          onOpenCommandPalette={onOpenCommandPalette}
          onToggleCollapse={onToggleSidebar}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <div className="glass-panel flex flex-col overflow-hidden rounded-2xl flex-1">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
              <TabBar
                tabs={tabs}
                activeTabId={activeTab?.id}
                onSelectTab={onSelectTab}
                onCloseTab={onCloseTab}
                onNewTab={onNewTab}
              />
            </div>

            <BrowserToolbar
              activeTab={activeTab}
              bookmarks={bookmarks}
              onNavigate={onNavigate}
              onOpenCommandPalette={onOpenCommandPalette}
              onOpenExternal={onOpenExternal}
              onGoBack={() => viewportRef.current?.goBack()}
              onGoForward={() => viewportRef.current?.goForward()}
            />

            <BrowserViewport
              ref={viewportRef}
              activeTab={activeTab}
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
      />

      <CalendarDrawer
        open={calendarDrawerOpen}
        onClose={() => onSetCalendarDrawer(false)}
        meetings={meetings}
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
      />
    </>
  );
}
