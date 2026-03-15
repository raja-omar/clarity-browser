import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createFallbackBootstrap } from "../lib/integrations/mockData";
import { ClarityLayout } from "./layout/ClarityLayout";
import { useBrowserStore } from "../store/useBrowserStore";
import { useTaskStore } from "../store/useTaskStore";
import { useCalendarStore } from "../store/useCalendarStore";
import { useEnergyStore } from "../store/useEnergyStore";
import type { EnergyLevel } from "../types";

export default function App() {
  const [loading, setLoading] = useState(true);

  const {
    tabs,
    bookmarks,
    activeTabId,
    reliefMode,
    commandPaletteOpen,
    focusTimerMinutes,
    focusModeActive,
    taskDrawerOpen,
    calendarDrawerOpen,
    contextDrawerOpen,
    morningBriefShown,
    sidebarCollapsed,
    initialize: initializeBrowser,
    setActiveTab,
    navigateActiveTab,
    toggleReliefMode,
    setCommandPaletteOpen,
    setFocusModeActive,
    setTaskDrawerOpen,
    setCalendarDrawerOpen,
    setContextDrawerOpen,
    setMorningBriefShown,
    setSidebarCollapsed,
    closeTab,
    addTab,
  } = useBrowserStore();

  const {
    tasks,
    selectedTaskId,
    jiraSyncing,
    initialize: initializeTasks,
    selectTask,
    updateTaskStatus,
    addTask,
    deleteTask,
    syncJira,
  } = useTaskStore();

  const {
    meetings,
    schedule,
    initialize: initializeCalendar,
    recomputeSchedule,
  } = useCalendarStore();

  const { logs, initialize: initializeEnergy, saveLog } = useEnergyStore();

  useEffect(() => {
    async function bootstrap() {
      const payload = window.clarity
        ? await window.clarity.getBootstrap()
        : createFallbackBootstrap();

      initializeBrowser(payload);
      initializeTasks(payload);
      initializeCalendar(payload);
      initializeEnergy(payload);
      setLoading(false);
    }

    void bootstrap();
  }, [initializeBrowser, initializeCalendar, initializeEnergy, initializeTasks]);

  useEffect(() => {
    if (loading) return;
    recomputeSchedule(tasks, logs[0]);
  }, [loading, logs, recomputeSchedule, tasks]);

  const [morningBriefOpen, setMorningBriefOpen] = useState(false);

  useEffect(() => {
    if (loading || morningBriefShown) return;

    const timer = setTimeout(() => {
      setMorningBriefOpen(true);
      setMorningBriefShown(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [loading, morningBriefShown, setMorningBriefShown]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }

      if (mod && key === "t") {
        event.preventDefault();
        setTaskDrawerOpen(!taskDrawerOpen);
      }

      if (mod && key === "e") {
        event.preventDefault();
        setCalendarDrawerOpen(!calendarDrawerOpen);
      }

      if (mod && key === "i") {
        event.preventDefault();
        setContextDrawerOpen(!contextDrawerOpen);
      }

      if (key === "escape") {
        if (taskDrawerOpen) setTaskDrawerOpen(false);
        if (calendarDrawerOpen) setCalendarDrawerOpen(false);
        if (contextDrawerOpen) setContextDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    calendarDrawerOpen,
    contextDrawerOpen,
    setCalendarDrawerOpen,
    setCommandPaletteOpen,
    setContextDrawerOpen,
    setTaskDrawerOpen,
    taskDrawerOpen,
  ]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId),
    [activeTabId, tabs],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId),
    [selectedTaskId, tasks],
  );

  async function handleLogEnergy(energy: EnergyLevel) {
    await saveLog({
      sleepHours: energy === "high" ? 7.5 : energy === "medium" ? 6.8 : 5.5,
      mood: energy === "high" ? 5 : energy === "medium" ? 4 : 3,
      energy,
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="glass-panel flex items-center gap-3 rounded-full px-6 py-4 text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading Clarity…
        </div>
      </div>
    );
  }

  return (
    <ClarityLayout
      tabs={tabs}
      bookmarks={bookmarks}
      activeTab={activeTab}
      reliefMode={reliefMode}
      focusMinutes={focusTimerMinutes}
      commandPaletteOpen={commandPaletteOpen}
      focusModeActive={focusModeActive}
      taskDrawerOpen={taskDrawerOpen}
      calendarDrawerOpen={calendarDrawerOpen}
      contextDrawerOpen={contextDrawerOpen}
      morningBriefOpen={morningBriefOpen}
      sidebarCollapsed={sidebarCollapsed}
      tasks={tasks}
      selectedTask={selectedTask}
      meetings={meetings}
      schedule={schedule}
      energyLogs={logs}
      onSelectTab={setActiveTab}
      onNavigate={navigateActiveTab}
      onToggleReliefMode={toggleReliefMode}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      onCommandPaletteOpenChange={setCommandPaletteOpen}
      onSelectTask={selectTask}
      onUpdateTaskStatus={(id, status) => void updateTaskStatus(id, status)}
      onLogEnergy={(energy) => void handleLogEnergy(energy)}
      onOpenExternal={(url) =>
        window.clarity ? void window.clarity.openExternal(url) : window.open(url, "_blank")
      }
      onSetFocusMode={setFocusModeActive}
      onSetTaskDrawer={setTaskDrawerOpen}
      onSetCalendarDrawer={setCalendarDrawerOpen}
      onSetContextDrawer={setContextDrawerOpen}
      onSetMorningBrief={(open) => setMorningBriefOpen(open)}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      onCloseTab={closeTab}
      onNewTab={addTab}
      onAddTask={(input) => void addTask(input)}
      onDeleteTask={(id) => void deleteTask(id)}
      onSyncJira={() => void syncJira()}
      jiraSyncing={jiraSyncing}
    />
  );
}
