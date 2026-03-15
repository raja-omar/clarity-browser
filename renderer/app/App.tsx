import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createFallbackBootstrap } from "../lib/integrations/mockData";
import { ClarityLayout } from "./layout/ClarityLayout";
import { AddTaskModal } from "../features/tasks/AddTaskModal";
import { AddMeetingModal } from "../features/calendar/AddMeetingModal";
import { PersonalizationWizard } from "../features/onboarding/PersonalizationWizard";
import { useBrowserStore } from "../store/useBrowserStore";
import { useTaskStore } from "../store/useTaskStore";
import { useCalendarStore } from "../store/useCalendarStore";
import { useEnergyStore } from "../store/useEnergyStore";
import type {
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLevel,
  Meeting,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "../types";
import type { CoachContextPayload } from "../types";
import {
  collectDueSoonReminders,
  type DueSoonReminder,
} from "../features/notifications/reminderEngine";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addMeetingModalOpen, setAddMeetingModalOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | undefined>(undefined);

  const {
    tabs,
    groups,
    bookmarks,
    activeSection,
    activeHomeTabId,
    activeGroupTabId,
    activeGroup,
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
    setActiveHome,
    setActiveGroup,
    createGroup,
    renameGroup,
    moveTabToGroup,
    addBookmarkFromTab,
    removeBookmark,
    toggleBookmarkFromTab,
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
    openCoachTab,
  } = useBrowserStore();

  const {
    tasks,
    selectedTaskId,
    jiraSyncing,
    initialize: initializeTasks,
    selectTask,
    updateTaskStatus,
    addTask,
    syncJira,
  } = useTaskStore();

  const {
    meetings,
    schedule,
    initialize: initializeCalendar,
    recomputeSchedule,
    addMeeting,
    updateMeetingSupport,
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
      setUserPreferences(payload.userPreferences);
      setLoading(false);
    }

    void bootstrap();
  }, [initializeBrowser, initializeCalendar, initializeEnergy, initializeTasks]);

  useEffect(() => {
    if (loading) return;
    recomputeSchedule(tasks, logs[0]);
  }, [loading, logs, meetings, recomputeSchedule, tasks]);

  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  const [dueSoonReminder, setDueSoonReminder] = useState<DueSoonReminder | undefined>(undefined);
  const [pendingReminders, setPendingReminders] = useState<DueSoonReminder[]>([]);
  const [testMeetingDetails, setTestMeetingDetails] = useState<Meeting | undefined>(undefined);
  const seenReminderKeys = useRef(new Set<string>());
  const lastReminderScan = useRef<Date | undefined>(undefined);

  useEffect(() => {
    if (loading || morningBriefShown) return;

    const timer = setTimeout(() => {
      setMorningBriefOpen(true);
      setMorningBriefShown(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [loading, morningBriefShown, setMorningBriefShown]);

  useEffect(() => {
    if (!loading && !userPreferences) {
      setPersonalizationOpen(true);
    }
  }, [loading, userPreferences]);

  useEffect(() => {
    if (loading) return;

    const tick = () => {
      const now = new Date();
      const reminders = collectDueSoonReminders(tasks, meetings, now, lastReminderScan.current);
      lastReminderScan.current = now;
      if (reminders.length === 0) return;

      setPendingReminders((current) => {
        const existing = new Set(current.map((item) => item.key));
        const next = [...current];
        for (const reminder of reminders) {
          if (seenReminderKeys.current.has(reminder.key)) continue;
          if (dueSoonReminder?.key === reminder.key) continue;
          if (existing.has(reminder.key)) continue;
          seenReminderKeys.current.add(reminder.key);
          next.push(reminder);
        }
        return next;
      });
    };

    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [dueSoonReminder?.key, loading, meetings, tasks]);

  useEffect(() => {
    if (dueSoonReminder || pendingReminders.length === 0) return;
    const [nextReminder, ...rest] = pendingReminders;
    setDueSoonReminder(nextReminder);
    setPendingReminders(rest);
  }, [dueSoonReminder, pendingReminders]);

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
        if (dueSoonReminder) setDueSoonReminder(undefined);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    calendarDrawerOpen,
    contextDrawerOpen,
    dueSoonReminder,
    setCalendarDrawerOpen,
    setCommandPaletteOpen,
    setContextDrawerOpen,
    setTaskDrawerOpen,
    taskDrawerOpen,
  ]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === (activeSection === "home" ? activeHomeTabId : activeGroupTabId)),
    [activeGroupTabId, activeHomeTabId, activeSection, tabs],
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

  async function handleCreateTask(payload: CreateTaskInput): Promise<void> {
    await addTask(payload);
  }

  async function handleCreateMeeting(payload: CreateMeetingInput): Promise<void> {
    await addMeeting(payload);
  }

  async function handleUpdateMeetingSupport(
    payload: UpdateMeetingSupportInput,
  ): Promise<Meeting | undefined> {
    const updated = await updateMeetingSupport(payload);
    const resolvedMeeting =
      updated ??
      (payload.meetingId === "test-meeting-popup"
        ? {
            ...(dueSoonReminder?.itemType === "meeting" && dueSoonReminder.meeting?.id === payload.meetingId
              ? dueSoonReminder.meeting
              : testMeetingDetails ?? buildTestMeeting(Date.now())),
            prepChecklist: payload.prepChecklist ?? testMeetingDetails?.prepChecklist ?? [],
            rescheduleReason: payload.rescheduleReason,
            rescheduleEmailDraft: payload.rescheduleEmailDraft ?? testMeetingDetails?.rescheduleEmailDraft,
          }
        : undefined);

    if (resolvedMeeting?.id === "test-meeting-popup") {
      setTestMeetingDetails(resolvedMeeting);
    }

    if (resolvedMeeting) {
      setDueSoonReminder((current) =>
        current?.itemType === "meeting" && current.meeting?.id === resolvedMeeting.id
          ? { ...current, meeting: resolvedMeeting }
          : current,
      );
    }

    return resolvedMeeting;
  }

  async function handleSavePreferences(payload: UserPreferences): Promise<void> {
    const saved = window.clarity
      ? await window.clarity.saveUserPreferences(payload)
      : payload;
    setUserPreferences(saved);
  }

  function handleOpenCoach(context: CoachContextPayload): void {
    openCoachTab(context);
  }

  function handleSnoozeDueSoonReminder(): void {
    if (!dueSoonReminder) return;
    const snoozed = {
      ...dueSoonReminder,
      key: `${dueSoonReminder.key}:snooze:${Date.now()}`,
      dueAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      slotMinutes: 10,
    };
    setDueSoonReminder(undefined);
    setPendingReminders((current) => [snoozed, ...current]);
  }

  function handleMarkHandledDueSoonReminder(): void {
    setDueSoonReminder(undefined);
  }

  function handleTriggerTestTaskPopup(): void {
    const now = Date.now();
    const dueIso = new Date(now + 10 * 60 * 1000).toISOString();
    setDueSoonReminder({
      key: `task:test-${now}:10`,
      itemType: "task",
      slotMinutes: 10,
      dueAt: dueIso,
      task: {
        id: "test-task-popup",
        title: "[DEV] Sample Jira ticket: API timeout investigation",
        estimate: 40,
        estimatedTimeMinutes: 40,
        energy: "high",
        source: "jira",
        status: "todo",
        priority: "high",
        dueAt: dueIso,
        deadline: dueIso,
        description:
          "Investigate recurring API timeout failures in the request pipeline. Identify root cause and propose a fix or mitigation.",
        ownerName: "Jane Smith",
        ownerContact: "jane.smith@example.com",
        escalationContact: "eng-manager@example.com",
        subtasks: [
          { id: "test-sub-1", title: "Capture failing request logs", done: false },
          { id: "test-sub-2", title: "Propose fix and review with owner", done: false },
        ],
        type: "focus",
      },
    });
  }

  function handleTriggerTestMeetingPopup(): void {
    const now = Date.now();
    const meeting = buildTestMeeting(now, testMeetingDetails);
    setDueSoonReminder({
      key: `meeting:test-${now}:10`,
      itemType: "meeting",
      slotMinutes: 10,
      dueAt: new Date(now + 10 * 60 * 1000).toISOString(),
      meeting,
    });
    setTestMeetingDetails(meeting);
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
    <>
      <ClarityLayout
        tabs={tabs}
        groups={groups}
        activeSection={activeSection}
        activeGroup={activeGroup}
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
        onSelectHome={setActiveHome}
        onSelectGroup={setActiveGroup}
        onCreateGroup={createGroup}
        onRenameGroup={renameGroup}
        onMoveTabToGroup={moveTabToGroup}
        onAddBookmarkFromTab={addBookmarkFromTab}
        onRemoveBookmark={removeBookmark}
        onToggleBookmarkFromTab={toggleBookmarkFromTab}
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
        onAddTask={(title) => void addTask(title)}
        onOpenAddTaskModal={() => setAddTaskModalOpen(true)}
        onOpenAddMeetingModal={() => setAddMeetingModalOpen(true)}
        onOpenPersonalization={() => setPersonalizationOpen(true)}
        onOpenHealthCheckIn={() => setMorningBriefOpen(true)}
        onSyncJira={() => void syncJira()}
        jiraSyncing={jiraSyncing}
        dueSoonReminder={dueSoonReminder}
        dueSoonReminderOpen={Boolean(dueSoonReminder)}
        onCloseDueSoonReminder={() => setDueSoonReminder(undefined)}
        onSnoozeDueSoonReminder={handleSnoozeDueSoonReminder}
        onMarkHandledDueSoonReminder={handleMarkHandledDueSoonReminder}
        onOpenCoach={handleOpenCoach}
        onUpdateMeetingSupport={handleUpdateMeetingSupport}
        onTriggerTestTaskPopup={handleTriggerTestTaskPopup}
        onTriggerTestMeetingPopup={handleTriggerTestMeetingPopup}
      />
      <AddTaskModal
        open={addTaskModalOpen}
        onOpenChange={setAddTaskModalOpen}
        onSubmit={handleCreateTask}
      />
      <AddMeetingModal
        open={addMeetingModalOpen}
        onOpenChange={setAddMeetingModalOpen}
        onSubmit={handleCreateMeeting}
      />
      <PersonalizationWizard
        open={personalizationOpen}
        initialValue={userPreferences}
        onOpenChange={setPersonalizationOpen}
        onComplete={handleSavePreferences}
      />
    </>
  );
}

function buildTestMeeting(now: number, existing?: Meeting): Meeting {
  return {
    id: "test-meeting-popup",
    title: "Test meeting: Design review handoff",
    start: new Date(now + 10 * 60 * 1000).toISOString(),
    end: new Date(now + 40 * 60 * 1000).toISOString(),
    attendees: 4,
    attendeeList: ["Omar", "Mina", "Alex", "Sam"],
    description: "Hardcoded popup test meeting.",
    notes: "Use this to test prepare and reschedule flows.",
    type: "dynamic",
    meetingLink: "https://meet.google.com/demo-room",
    hostName: "Mina (Host)",
    hostContact: "mina@example.com",
    hostPreferredChannel: "chat",
    prepChecklist: existing?.prepChecklist ?? [],
    rescheduleEmailDraft: existing?.rescheduleEmailDraft,
  };
}
