# Clarity Browser

**Tagline:**\
*A browser designed for cognitive relief and intelligent work.*

------------------------------------------------------------------------

# Overview

Clarity Browser is an Electron-based productivity browser designed to
help users work smarter when they are overwhelmed.

Instead of forcing users to manage many different tools (Jira, Calendar,
task apps, notes, etc.), Clarity Browser aggregates everything into a
single intelligent workspace that:

-   Understands user energy levels
-   Syncs meetings and tasks
-   Generates an optimized daily schedule
-   Guides users through their work with a calm, minimal UI

The experience should feel like a hybrid of:

-   Arc Browser
-   Notion
-   Motion
-   A cognitive AI assistant

The UI/UX should be extremely polished with smooth animations and
calming interactions.

------------------------------------------------------------------------

# Core Concept

When people are overwhelmed, the hardest problem is deciding **what to
do next**.

Clarity Browser solves this by:

1.  Aggregating tasks and meetings
2.  Understanding user energy levels
3.  Generating an optimized schedule
4.  Visually guiding users through their work

The browser becomes a **command center for focus**.

------------------------------------------------------------------------

# Tech Stack

Electron\
React\
TypeScript\
Vite\
TailwindCSS\
Framer Motion (animations)\
Radix UI\
Zustand (state management)\
SQLite (local storage)

Optional:

-   tRPC
-   Node backend within Electron main process

------------------------------------------------------------------------

# High Level Architecture

## Electron Main Process

Responsibilities:

-   window management
-   tab lifecycle
-   OS integrations
-   background task syncing
-   API integrations
-   local database management

## Renderer (React App)

Responsibilities:

-   browser UI
-   task management
-   calendar interface
-   schedule visualization
-   AI assistant
-   energy tracking

------------------------------------------------------------------------

# Folder Structure

    clarity-browser/

    electron/
      main.ts
      windowManager.ts
      tabsManager.ts

    renderer/

      app/
        App.tsx
        layout/

      components/
        browser/
        tabs/
        sidebar/

      features/
        calendar/
        tasks/
        scheduler/
        energy/
        jira/
        ai/

      store/
        useTaskStore.ts
        useEnergyStore.ts
        useCalendarStore.ts

      lib/
        api/
        integrations/
        scheduler/

      styles/

    database/
      schema.sql
      db.ts

------------------------------------------------------------------------

# Browser UI Layout

The UI should resemble **Arc Browser's layout**.

    -----------------------------------------
    | Sidebar | Main Browser | Context Pane |
    -----------------------------------------

### Sidebar

Contains:

-   Vertical Tabs
-   Tasks
-   Calendar

### Main Area

Web content and browsing.

### Context Pane

Dynamic information depending on the current tab.

------------------------------------------------------------------------

# Sidebar Sections

## Tabs

Vertical tab list inspired by Arc Browser.

Features:

-   pinned tabs
-   tab groups
-   hover preview
-   animated transitions

------------------------------------------------------------------------

## Tasks

Displays:

-   today's tasks
-   upcoming tasks
-   quick task creation

Each task includes:

-   title
-   estimated time
-   energy requirement
-   source (jira / personal)

------------------------------------------------------------------------

## Calendar

Displays:

-   meetings
-   time blocks
-   free schedule slots

------------------------------------------------------------------------

# Context Pane (Right Panel)

Dynamic panel depending on context.

Examples:

If a meeting tab is open:

-   meeting notes
-   agenda
-   related tasks

If a Jira issue is open:

-   related work
-   suggested schedule block

------------------------------------------------------------------------

# Intelligent Scheduler

One of the most important features.

The scheduler automatically generates a **daily plan**.

Inputs:

-   Calendar events
-   Jira tasks
-   Personal tasks
-   Sleep data
-   Energy levels

Output example:

Morning (high focus)\
Deep work tasks

Midday\
Meetings

Afternoon\
Low cognitive tasks

------------------------------------------------------------------------

# Energy Model

Users can input:

-   sleep hours
-   mood
-   energy level

Or connect to:

-   Apple Health
-   Oura
-   Fitbit

Energy states:

-   High Focus
-   Medium Focus
-   Low Energy

Tasks contain an energy requirement field.

Example:

Task: Write report\
Energy: High

Task: Reply to emails\
Energy: Low

Scheduler assigns tasks accordingly.

------------------------------------------------------------------------

# Jira Integration

Use Jira REST API.

Features:

Fetch:

-   assigned issues
-   priority
-   story points
-   due dates

Convert to internal task format.

Example:

    {
    id,
    title,
    source: "jira",
    energy: "medium",
    estimate: 90
    }

------------------------------------------------------------------------

# Calendar Integration

Integrate with Google Calendar.

Use OAuth.

Sync:

-   meetings
-   event duration
-   event titles

Display events in timeline.

------------------------------------------------------------------------

# Timeline View

Visual schedule timeline inspired by:

-   Motion
-   Notion Calendar
-   Linear

Example layout:

08:00 Morning routine\
09:00 Deep work\
11:00 Meeting\
13:00 Lunch\
14:00 Emails

Blocks should be draggable.

------------------------------------------------------------------------

# Cognitive Relief Mode

Special mode triggered by:

**"I'm overwhelmed"**

The system:

1.  hides distractions
2.  shows only one task
3.  starts a focus timer

Interface becomes minimal and calm.

------------------------------------------------------------------------

# Browser Features

The browser should include:

-   Tabs
-   Navigation
-   Bookmarks
-   Search bar

But maintain a minimal interface.

------------------------------------------------------------------------

# Global Command Palette

Shortcut:

Cmd + K

Capabilities:

-   search tabs
-   create tasks
-   open URLs
-   ask AI

Inspired by:

-   Raycast
-   Spotlight
-   Arc command bar

------------------------------------------------------------------------

# Animations

Use Framer Motion heavily.

Animations include:

-   tab switching
-   sidebar transitions
-   schedule block interactions
-   task completion

Animations should feel smooth and calming.

------------------------------------------------------------------------

# Visual Design

Design inspiration:

Arc\
Notion\
Safari

Design principles:

-   soft gradients
-   glassmorphism
-   smooth shadows
-   rounded corners

Color palette:

Primary: soft blue\
Secondary: warm gray\
Accent: lavender

Use blur and transparency.

------------------------------------------------------------------------

# Focus Timer

When a task starts:

Display timer.

Example:

25 min focus\
5 min break

Add ambient visual animations.

------------------------------------------------------------------------

# Local Database

Use SQLite.

Tables:

Users\
Tasks\
Meetings\
EnergyLogs\
Schedules

------------------------------------------------------------------------

# AI Assistant

Optional AI layer.

Capabilities:

-   summarize meetings
-   break tasks into subtasks
-   suggest schedule improvements

------------------------------------------------------------------------

# MVP Scope

Build these first:

-   Electron browser shell
-   Vertical tab system
-   Task panel
-   Calendar sync
-   Basic scheduler
-   Timeline UI

------------------------------------------------------------------------

# Code Quality Requirements

-   TypeScript everywhere
-   modular architecture
-   reusable components
-   strict typing

Add comments explaining architecture.

------------------------------------------------------------------------

# Running the Project

    npm install
    npm run dev

------------------------------------------------------------------------

# Vision

Clarity Browser should become:

**The operating system for focused knowledge work.**
