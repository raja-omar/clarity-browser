import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createFallbackBootstrap } from "../lib/integrations/mockData";
import { ClarityLayout } from "./layout/ClarityLayout";
import { AddTaskModal } from "../features/tasks/AddTaskModal";
import { AddMeetingModal } from "../features/calendar/AddMeetingModal";
import { PersonalizationWizard } from "../features/onboarding/PersonalizationWizard";
import type { MorningStartInput } from "../features/onboarding/PersonalizationWizard";
import { useBrowserStore } from "../store/useBrowserStore";
import { useTaskStore } from "../store/useTaskStore";
import { useCalendarStore } from "../store/useCalendarStore";
import { useEnergyStore } from "../store/useEnergyStore";
import type {
  CalendarRecommendationMeetingInput,
  CalendarRecommendationTaskInput,
  CreateMeetingInput,
  CreateTaskInput,
  CalendarRecommendationTrigger,
  EnergyLevel,
  GoogleCalendarStatus,
  GoogleCalendarSyncWindow,
  HealthCheckIn,
  HealthInterventionPlan,
  Meeting,
  SaveHealthCheckInInput,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "../types";
import type { CoachContextPayload } from "../types";
import {
  collectHealthCheckInReminder,
  computeNextHealthCheckInDueAt,
  collectDueSoonReminders,
  getProjectedHealthSchedule,
  isWithinHealthWindow,
  type DueSoonReminder,
} from "../features/notifications/reminderEngine";

type StartupDemoStep = "idle" | "task" | "meeting" | "health" | "done";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addMeetingModalOpen, setAddMeetingModalOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | undefined>(undefined);
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus>({
    available: Boolean(window.clarity),
    connected: false,
  });
  const [googleCalendarBusy, setGoogleCalendarBusy] = useState(false);
  const [googleMeetings, setGoogleMeetings] = useState<Meeting[]>([]);

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
    openCalendarRecommendationsTab,
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
  const allMeetings = useMemo(() => mergeMeetings(meetings, googleMeetings), [googleMeetings, meetings]);

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
      setHealthCheckIns(payload.healthCheckIns ?? []);

      if (window.clarity) {
        try {
          const status = await window.clarity.getGoogleCalendarStatus();
          setGoogleCalendarStatus(status);

          if (status.connected) {
            const syncResult = await window.clarity.syncGoogleCalendar(getCurrentWeekWindow());
            setGoogleMeetings(syncResult.meetings);
            setGoogleCalendarStatus(syncResult.status);
          }
        } catch (error) {
          setGoogleCalendarStatus((current) => ({
            ...current,
            error: error instanceof Error ? error.message : "Unable to load Google Calendar.",
          }));
        }
      }

      setLoading(false);
    }

    void bootstrap();
  }, [initializeBrowser, initializeCalendar, initializeEnergy, initializeTasks]);

  useEffect(() => {
    if (loading) return;
    recomputeSchedule(tasks, logs[0], allMeetings);
  }, [allMeetings, loading, logs, recomputeSchedule, tasks]);

  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  const [healthCheckInOpen, setHealthCheckInOpen] = useState(false);
  const [healthCheckIns, setHealthCheckIns] = useState<HealthCheckIn[]>([]);
  const [healthCheckInSubmitting, setHealthCheckInSubmitting] = useState(false);
  const [healthInterventionPlan, setHealthInterventionPlan] = useState<
    HealthInterventionPlan | undefined
  >(undefined);
  const [healthInterventionLoading, setHealthInterventionLoading] = useState(false);
  const [nextHealthCheckInDueAt, setNextHealthCheckInDueAt] = useState<string | undefined>(undefined);
  const [dueSoonReminder, setDueSoonReminder] = useState<DueSoonReminder | undefined>(undefined);
  const [calendarScanNotice, setCalendarScanNotice] = useState<string | undefined>(undefined);
  const [pendingReminders, setPendingReminders] = useState<DueSoonReminder[]>([]);
  const [testMeetingDetails, setTestMeetingDetails] = useState<Meeting | undefined>(undefined);
  const [startupDemoStep, setStartupDemoStep] = useState<StartupDemoStep>("idle");
  const seenReminderKeys = useRef(new Set<string>());
  const seenHealthReminderKeys = useRef(new Set<string>());
  const completedHealthCheckInRef = useRef(false);
  const startupWizardPromptedRef = useRef(false);
  const startupDemoStartedRef = useRef(false);
  const lastReminderScan = useRef<Date | undefined>(undefined);

  useEffect(() => {
    if (loading || morningBriefShown || healthCheckInOpen || personalizationOpen) return;

    const timer = setTimeout(() => {
      setMorningBriefOpen(true);
      setMorningBriefShown(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [healthCheckInOpen, loading, morningBriefShown, personalizationOpen, setMorningBriefShown]);

  useEffect(() => {
    if (loading || startupWizardPromptedRef.current) return;
    startupWizardPromptedRef.current = true;
    if (!healthCheckInOpen) {
      setPersonalizationOpen(true);
    }
  }, [healthCheckInOpen, loading]);

  useEffect(() => {
    if (loading) return;

    const tick = () => {
      const now = new Date();
      const reminders = collectDueSoonReminders(tasks, allMeetings, now, lastReminderScan.current);
      const healthReminder = isWithinHealthWindow(now, userPreferences)
        ? collectHealthCheckInReminder(nextHealthCheckInDueAt, now, lastReminderScan.current)
        : undefined;
      lastReminderScan.current = now;
      if (reminders.length === 0 && !healthReminder) return;

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

      if (healthReminder && !healthCheckInOpen && !seenHealthReminderKeys.current.has(healthReminder.key)) {
        seenHealthReminderKeys.current.add(healthReminder.key);
        completedHealthCheckInRef.current = false;
        setHealthInterventionPlan(undefined);
        setHealthCheckInOpen(true);
      }
    };

    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [
    allMeetings,
    dueSoonReminder?.key,
    healthCheckInOpen,
    loading,
    nextHealthCheckInDueAt,
    tasks,
    userPreferences,
  ]);

  useEffect(() => {
    if (loading) return;
    setNextHealthCheckInDueAt((current) => {
      if (current) return current;
      return computeNextHealthCheckInDueAt({
        now: new Date(),
        preferences: userPreferences,
        recentCheckIns: healthCheckIns,
        reason: "startup",
      });
    });
  }, [healthCheckIns, loading, userPreferences]);

  useEffect(() => {
    if (!calendarDrawerOpen || !window.clarity || !googleCalendarStatus.connected || googleCalendarBusy) {
      return;
    }

    const lastSynced = googleCalendarStatus.lastSyncedAt
      ? new Date(googleCalendarStatus.lastSyncedAt).getTime()
      : 0;

    if (!lastSynced || Date.now() - lastSynced > 5 * 60 * 1000) {
      void handleRefreshGoogleCalendar();
    }
  }, [
    calendarDrawerOpen,
    googleCalendarBusy,
    googleCalendarStatus.connected,
    googleCalendarStatus.lastSyncedAt,
  ]);

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
  const projectedHealthSchedule = useMemo(
    () => getProjectedHealthSchedule(userPreferences, healthCheckIns),
    [healthCheckIns, userPreferences],
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

  async function handleSavePreferences(
    payload: UserPreferences,
    morning: MorningStartInput,
  ): Promise<void> {
    const enrichedPayload: UserPreferences = {
      ...payload,
      baselineSleepHours: morning.sleepLastNight,
      baselineMood: morning.startingMood,
      nutritionRhythm:
        morning.morningFood === "none"
          ? "irregular"
          : morning.morningFood === "light"
            ? "two_meals"
            : "three_meals",
      hydrationHabit:
        morning.hydrationNow === "dehydrated"
          ? "rarely"
          : morning.hydrationNow === "a_bit_low"
            ? "some"
            : "consistent",
    };
    const saved = window.clarity
      ? await window.clarity.saveUserPreferences(enrichedPayload)
      : enrichedPayload;
    setUserPreferences(saved);
    await saveLog({
      sleepHours: mapSleepBucketToHours(morning.sleepLastNight),
      mood: mapMoodToScale(morning.startingMood),
      energy: morning.startingEnergy,
    });

    const morningCheckIn: SaveHealthCheckInInput = {
      currentMood: morning.startingMood,
      focusLevel:
        morning.startingEnergy === "high"
          ? "focused"
          : morning.startingEnergy === "medium"
            ? "somewhat_focused"
            : "scattered",
      energyLevel: morning.startingEnergy,
      lastMealRecency:
        morning.morningFood === "none"
          ? "over_6h"
          : morning.morningFood === "light"
            ? "4_to_6h"
            : "under_2h",
      hydrationStatus: morning.hydrationNow,
      symptoms: ["none"],
    };
    const entry = window.clarity
      ? await window.clarity.saveHealthCheckIn(morningCheckIn)
      : {
          id: `health-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...morningCheckIn,
        };
    setHealthCheckIns((current) => [entry, ...current].slice(0, 20));
    setNextHealthCheckInDueAt(
      computeNextHealthCheckInDueAt({
        now: new Date(),
        preferences: saved,
        recentCheckIns: [entry, ...healthCheckIns].slice(0, 20),
        reason: "completed",
      }),
    );
  }

function mapSleepBucketToHours(value: MorningStartInput["sleepLastNight"]): number {
  switch (value) {
    case "under_5":
      return 4.5;
    case "5_to_6":
      return 5.5;
    case "6_to_7":
      return 6.5;
    case "7_to_8":
      return 7.5;
    case "8_plus":
      return 8.5;
    default:
      return 7;
  }
}

function mapMoodToScale(value: MorningStartInput["startingMood"]): number {
  switch (value) {
    case "very_low":
      return 1;
    case "low":
      return 2;
    case "okay":
      return 3;
    case "good":
      return 4;
    case "great":
      return 5;
    default:
      return 3;
  }
}

  async function handleSubmitHealthCheckIn(payload: SaveHealthCheckInInput): Promise<void> {
    setHealthCheckInSubmitting(true);
    setHealthInterventionLoading(true);
    try {
      const entry = window.clarity
        ? await window.clarity.saveHealthCheckIn(payload)
        : {
            id: `health-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...payload,
          };
      setHealthCheckIns((current) => [entry, ...current].slice(0, 20));
      completedHealthCheckInRef.current = true;

      if (window.clarity?.chatWithCoach) {
        const response = await window.clarity.chatWithCoach({
          mode: "health_interventions",
          messages: [
            {
              role: "user",
              content: "Generate a practical support plan focused on remedies first.",
            },
          ],
          healthIntervention: {
            checkIn: payload,
            preferences: userPreferences,
            currentTime: new Date().toISOString(),
          },
        });
        setHealthInterventionPlan(response.healthInterventionPlan);
      } else {
        setHealthInterventionPlan(undefined);
      }
      setNextHealthCheckInDueAt(
        computeNextHealthCheckInDueAt({
          now: new Date(),
          preferences: userPreferences,
          recentCheckIns: [entry, ...healthCheckIns].slice(0, 20),
          reason: "completed",
        }),
      );
    } finally {
      setHealthCheckInSubmitting(false);
      setHealthInterventionLoading(false);
    }
  }

  async function handleGenerateHealthEscalationDraft(userIntent: string): Promise<string> {
    if (!window.clarity?.chatWithCoach) {
      throw new Error("AI coach is unavailable.");
    }
    const latest = healthCheckIns[0];
    const response = await window.clarity.chatWithCoach({
      mode: "chat",
      context: {
        source: "general",
        title: "Health check-in escalation message",
        summary: latest
          ? `Mood=${latest.currentMood}, focus=${latest.focusLevel}, energy=${latest.energyLevel}, hydration=${latest.hydrationStatus}, meal=${latest.lastMealRecency}, symptoms=${latest.symptoms.join(", ")}`
          : "User requested escalation guidance after health check-in.",
      },
      messages: [
        {
          role: "user",
          content: `Draft a concise manager update message about my current health-related capacity. Follow these preferences: ${userIntent}. Keep it practical and human.`,
        },
      ],
    });
    return response.reply;
  }

  function handleHealthCheckInRecovered(): void {
    completedHealthCheckInRef.current = true;
    setHealthCheckInOpen(false);
  }

  function handleOpenCoach(context: CoachContextPayload): void {
    openCoachTab(context);
  }

  function handleStartDay(): void {
    setMorningBriefOpen(false);
    if (startupDemoStartedRef.current) return;
    startupDemoStartedRef.current = true;
    setStartupDemoStep("task");
    handleTriggerTestTaskPopup();
  }

  async function handleEscalationDraftCopied(
    trigger: CalendarRecommendationTrigger,
  ): Promise<void> {
    if (!window.clarity?.chatWithCoach) return;
    setCalendarScanNotice(
      "Got it — based on this update, I am now scanning your calendar and task list and will suggest changes shortly.",
    );
    const now = new Date();

    if (window.clarity && googleCalendarStatus.connected) {
      const lastSynced = googleCalendarStatus.lastSyncedAt
        ? new Date(googleCalendarStatus.lastSyncedAt).getTime()
        : 0;
      if (!lastSynced || Date.now() - lastSynced > 5 * 60 * 1000) {
        await handleRefreshGoogleCalendar();
      }
    }

    const upcomingToday = mergeMeetings(meetings, googleMeetings)
      .filter((meeting) => {
        const start = new Date(meeting.start);
        const end = new Date(meeting.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
        return isSameLocalDay(start, now) && end.getTime() > now.getTime();
      })
      .map<CalendarRecommendationMeetingInput>((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        start: meeting.start,
        end: meeting.end,
        attendees: meeting.attendees,
        source: meeting.source,
        type: meeting.type,
        isAllDay: meeting.isAllDay,
        hostName: meeting.hostName,
        description: meeting.description,
        location: meeting.location,
      }));
    const incompleteTasks = tasks.filter((task) => task.status !== "done");
    const tasksDueToday = incompleteTasks.filter((task) => {
      const dueAt = task.deadline ?? task.dueAt;
      if (!dueAt) return false;
      const dueDate = new Date(dueAt);
      if (Number.isNaN(dueDate.getTime())) return false;
      return isSameLocalDay(dueDate, now);
    });
    const taskInputs = (tasksDueToday.length > 0 ? tasksDueToday : incompleteTasks.slice(0, 6)).map<
      CalendarRecommendationTaskInput
    >((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueAt: task.dueAt,
      deadline: task.deadline,
      estimatedTimeMinutes: task.estimatedTimeMinutes ?? task.estimate,
      description: task.description ?? task.notes,
    }));

    const response = await window.clarity.chatWithCoach({
      mode: "calendar_recommendations",
      messages: [
        {
          role: "user",
          content:
            "I have escalated that I am delayed. Suggest what to change in the rest of my day based on my reason.",
        },
      ],
      calendarRecommendations: {
        currentTime: now.toISOString(),
        triggerTime: trigger.copiedAt,
        cause: trigger.cause,
        reason: trigger.constraints,
        sourceItemId: trigger.context.itemId,
        sourceItemType: trigger.context.itemType,
        sourceItemTitle: trigger.context.itemTitle,
        meetings: upcomingToday,
        tasks: taskInputs,
      },
    });

    if (response.calendarRecommendations) {
      openCalendarRecommendationsTab(response.calendarRecommendations);
    }
  }

  async function handleRefreshGoogleCalendar(): Promise<void> {
    if (!window.clarity || !googleCalendarStatus.connected) return;

    setGoogleCalendarBusy(true);
    try {
      const syncResult = await window.clarity.syncGoogleCalendar(getCurrentWeekWindow());
      setGoogleMeetings(syncResult.meetings);
      setGoogleCalendarStatus(syncResult.status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh Google Calendar meetings.";
      const latestStatus = await window.clarity
        .getGoogleCalendarStatus()
        .catch(() => googleCalendarStatus);
      setGoogleCalendarStatus({ ...latestStatus, error: message });
    } finally {
      setGoogleCalendarBusy(false);
    }
  }

  async function handleConnectGoogleCalendar(): Promise<void> {
    if (!window.clarity) return;

    setGoogleCalendarBusy(true);
    try {
      const status = await window.clarity.connectGoogleCalendar();
      setGoogleCalendarStatus(status);

      if (status.connected) {
        const syncResult = await window.clarity.syncGoogleCalendar(getCurrentWeekWindow());
        setGoogleMeetings(syncResult.meetings);
        setGoogleCalendarStatus(syncResult.status);
      }
    } catch (error) {
      setGoogleCalendarStatus((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to connect Google Calendar.",
      }));
    } finally {
      setGoogleCalendarBusy(false);
    }
  }

  async function handleDisconnectGoogleCalendar(): Promise<void> {
    if (!window.clarity) return;

    setGoogleCalendarBusy(true);
    try {
      const status = await window.clarity.disconnectGoogleCalendar();
      setGoogleMeetings([]);
      setGoogleCalendarStatus(status);
    } catch (error) {
      setGoogleCalendarStatus((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to disconnect Google Calendar.",
      }));
    } finally {
      setGoogleCalendarBusy(false);
    }
  }

  useEffect(() => {
    if (!calendarScanNotice) return;
    const timer = setTimeout(() => setCalendarScanNotice(undefined), 4200);
    return () => clearTimeout(timer);
  }, [calendarScanNotice]);

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

  function handleCloseDueSoonReminder(): void {
    const closingReminder = dueSoonReminder;
    setDueSoonReminder(undefined);
    if (!closingReminder) return;

    if (startupDemoStep === "task" && closingReminder.itemType === "task") {
      setStartupDemoStep("meeting");
      handleTriggerTestMeetingPopup();
      return;
    }

    if (startupDemoStep === "meeting" && closingReminder.itemType === "meeting") {
      setStartupDemoStep("health");
      completedHealthCheckInRef.current = false;
      setHealthInterventionPlan(undefined);
      setHealthCheckInOpen(true);
    }
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
        healthCheckInOpen={healthCheckInOpen}
        sidebarCollapsed={sidebarCollapsed}
        tasks={tasks}
        selectedTask={selectedTask}
        meetings={allMeetings}
        schedule={schedule}
        energyLogs={logs}
        googleCalendarStatus={googleCalendarStatus}
        googleCalendarBusy={googleCalendarBusy}
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
        onStartDay={handleStartDay}
        onSetHealthCheckIn={(open) => {
          setHealthCheckInOpen(open);
          if (!open) {
            const reason = completedHealthCheckInRef.current ? "completed" : "dismissed";
            setNextHealthCheckInDueAt(
              computeNextHealthCheckInDueAt({
                now: new Date(),
                preferences: userPreferences,
                recentCheckIns: healthCheckIns,
                reason,
              }),
            );
            completedHealthCheckInRef.current = false;
            setHealthInterventionPlan(undefined);
            setHealthInterventionLoading(false);
            if (startupDemoStep === "health") {
              setStartupDemoStep("done");
            }
          }
        }}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCloseTab={closeTab}
        onNewTab={addTab}
        onAddTask={(title) => void addTask(title)}
        onOpenAddTaskModal={() => setAddTaskModalOpen(true)}
        onOpenAddMeetingModal={() => setAddMeetingModalOpen(true)}
        onOpenPersonalization={() => setPersonalizationOpen(true)}
        onOpenHealthCheckIn={() => {
          completedHealthCheckInRef.current = false;
          setHealthInterventionPlan(undefined);
          setHealthCheckInOpen(true);
        }}
        onSubmitHealthCheckIn={handleSubmitHealthCheckIn}
        onGenerateHealthEscalationDraft={handleGenerateHealthEscalationDraft}
        onHealthCheckInRecovered={handleHealthCheckInRecovered}
        healthCheckInSubmitting={healthCheckInSubmitting}
        healthInterventionPlan={healthInterventionPlan}
        healthInterventionLoading={healthInterventionLoading}
        projectedHealthIntervalMinutes={projectedHealthSchedule.intervalMinutes}
        projectedHealthTimes={projectedHealthSchedule.times}
        onSyncJira={() => void syncJira()}
        jiraSyncing={jiraSyncing}
        dueSoonReminder={dueSoonReminder}
        dueSoonReminderOpen={Boolean(dueSoonReminder)}
        calendarScanNotice={calendarScanNotice}
        onCloseDueSoonReminder={handleCloseDueSoonReminder}
        onOpenCoach={handleOpenCoach}
        onUpdateMeetingSupport={handleUpdateMeetingSupport}
        onEscalationDraftCopied={(payload) => void handleEscalationDraftCopied(payload)}
        onConnectGoogleCalendar={() => void handleConnectGoogleCalendar()}
        onRefreshGoogleCalendar={() => void handleRefreshGoogleCalendar()}
        onDisconnectGoogleCalendar={() => void handleDisconnectGoogleCalendar()}
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

function getCurrentWeekWindow(now = new Date()): GoogleCalendarSyncWindow {
  const start = new Date(now);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset - 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 21);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function mergeMeetings(localMeetings: Meeting[], syncedMeetings: Meeting[]): Meeting[] {
  return [...localMeetings, ...syncedMeetings].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
