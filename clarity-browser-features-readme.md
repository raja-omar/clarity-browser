# Clarity Browser --- Tasks, Calendar, Health Goals & Check‑Ins

## Overview

Clarity Browser is a **browser-first productivity environment** designed
to help users manage work, meetings, and personal wellbeing without
leaving the browser.

Unlike traditional productivity dashboards, Clarity keeps the **browsing
experience central** while quietly providing intelligent assistance.

The system integrates:

-   Task management
-   Meeting calendar
-   Health goals
-   Personalization setup
-   Cognitive check-ins

These systems feed into the **adaptive scheduler** that helps users plan
their day.

------------------------------------------------------------------------

# Core Philosophy

Clarity Browser should feel like:

**90% browsing**\
**10% intelligent assistance**

Productivity features should support the browsing experience rather than
dominate the interface.

------------------------------------------------------------------------

# Feature 1 --- Task Management

Users can manually create tasks similar to tools like **Jira, Linear, or
Notion**.

For now, tasks are entered by the user directly.

------------------------------------------------------------------------

## Task Object Model

``` typescript
Task {
  id: string
  name: string
  description?: string
  priority: "high" | "medium" | "low"
  deadline?: Date
  estimatedTimeMinutes: number
  subtasks?: Subtask[]
  type: "focus" | "relax" | "collaborate"
  status: "pending" | "in-progress" | "done"
}
```

------------------------------------------------------------------------

## Task Creation Form

Create an **Add Task modal** with the following fields:

-   Name
-   Description
-   Priority (High / Medium / Low)
-   Deadline (optional)
-   Estimated time to completion

Estimated time can be:

1.  manually entered by the user
2.  AI recommended (future feature)

------------------------------------------------------------------------

## Subtasks

Subtasks are optional.

Two possible modes:

Manual subtasks\
AI-generated subtasks (future feature)

------------------------------------------------------------------------

## Task Types

Tasks include a category used by the scheduler.

    Focus
    Relax
    Collaborate

------------------------------------------------------------------------

# Feature 2 --- Meeting Calendar

Users can manually add meetings.

Future integrations can include:

-   Google Calendar
-   Outlook
-   Zoom
-   Slack

------------------------------------------------------------------------

## Meeting Types

Three types of meetings exist.

### Static Meeting

Cannot move or reschedule.

Example:

Doctor appointment

------------------------------------------------------------------------

### Dynamic Meeting

Can be rescheduled.

Example:

Team sync

------------------------------------------------------------------------

### Optional Meeting

Can be skipped.

Example:

Optional workshop

------------------------------------------------------------------------

## Meeting Object Model

``` typescript
Meeting {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  type: "static" | "dynamic" | "optional"
  attendees?: string[]
  meetingLink?: string
  notesLink?: string
  recurring?: boolean
}
```

------------------------------------------------------------------------

## Recurring Meetings

Support recurring meetings such as:

-   Daily
-   Weekly
-   Monthly
-   Yearly

Users should be able to select specific days.

Example:

    Every Monday and Wednesday

------------------------------------------------------------------------

## Travel Time

Meetings may include travel time.

Example option:

    Travel time required?

If enabled, the scheduler inserts a buffer.

------------------------------------------------------------------------

# Feature 3 --- Health Goals

Users can define simple personal health routines that run alongside
their work schedule.

Examples:

-   Drink water
-   Movement
-   Stretching
-   Break reminders

------------------------------------------------------------------------

## Health Goal Model

``` typescript
HealthGoal {
  id: string
  name: string
  frequencyHours: number
  occurrencesPerDay: number
  enabled: boolean
}
```

------------------------------------------------------------------------

## Example Health Goals

Drink water every 1 hour\
Movement every 2 hours\
Stretch 3 times per day

------------------------------------------------------------------------

## Health Reminder System

Health goals trigger **non-intrusive reminders**.

Example reminder:

    Hydration reminder
    Have you had water recently?

User options:

-   Yes
-   Snooze
-   Delay reminder

------------------------------------------------------------------------

# Feature 4 --- Personalization Setup

When the user first installs Clarity Browser, show a **Personalization
Wizard**.

------------------------------------------------------------------------

## Step 1 --- Sleep Schedule

User selects sleep pattern.

Options:

-   Regular
-   Irregular

User enters sleep time and wake time.

Example:

    10:00 PM — 8:00 AM

------------------------------------------------------------------------

## Step 2 --- Focus Periods

User selects preferred focus hours.

Multi-select time ranges.

Example ranges:

    Morning (6–9)
    Late Morning (9–12)
    Afternoon (12–3)
    Late Afternoon (3–6)
    Evening (6–9)
    Late Evening (9–12)
    Night (12–3)
    Early Morning (3–6)

These inform the scheduler.

------------------------------------------------------------------------

## Step 3 --- Work Hours

User defines work window.

Example:

    9:00 AM — 5:00 PM

------------------------------------------------------------------------

## Step 4 --- Integrations (Future)

Future integrations may include:

-   Google Calendar
-   Jira
-   Linear
-   Slack

------------------------------------------------------------------------

# Feature 5 --- Pop-Up Cognitive Check-Ins

Check-ins are lightweight prompts that help Clarity understand the
user's energy and progress.

They must be **minimal and non-disruptive**.

------------------------------------------------------------------------

## Check-In Type 1 --- Morning Check-In

Triggered when the browser opens for the first time each day.

Questions:

-   Sleep time (actual)
-   How well did you sleep?
-   Energy level
-   Mood

Energy slider:

    Low → High

Mood scale:

😞 😐 🙂 😊 😄

------------------------------------------------------------------------

## Check-In Type 2 --- After Meeting

Triggered after meetings.

Prompt:

    Would you like to create a task from this meeting?

Future feature:

AI extracts tasks from meeting notes.

------------------------------------------------------------------------

## Check-In Type 3 --- After Task

After completing a task:

    Did you complete the task?
    Yes / No

Follow-up:

    What % is complete?

Then:

    Would you like to continue working?

------------------------------------------------------------------------

## Check-In Type 4 --- Health Check-In

Triggered by health goals.

Example:

    Have you had water?

Options:

-   Yes
-   No
-   Snooze reminder
-   Delay reminder

------------------------------------------------------------------------

# Scheduler Integration

All systems feed the **adaptive scheduler**.

Inputs include:

-   Tasks
-   Meetings
-   Health goals
-   Sleep quality
-   Energy levels

The scheduler generates the user's daily plan.

------------------------------------------------------------------------

# UI Requirements

The interface must remain **minimal**.

Never display all systems at once.

Use:

-   drawers
-   overlays
-   focus mode surfaces

------------------------------------------------------------------------

# Required Components

    AddTaskModal
    AddMeetingModal
    HealthGoalsPanel
    MorningCheckInModal
    MeetingCheckInPopup
    TaskCompletionPopup
    HealthReminderPopup
    PersonalizationWizard

------------------------------------------------------------------------

# Database Tables

Create the following tables:

Tasks\
Subtasks\
Meetings\
HealthGoals\
CheckIns\
UserPreferences

------------------------------------------------------------------------

# Success Criteria

Clarity Browser should feel:

-   clean
-   calm
-   intelligent
-   browser-first

The system should help users organize their day **without turning the
browser into a productivity dashboard**.
