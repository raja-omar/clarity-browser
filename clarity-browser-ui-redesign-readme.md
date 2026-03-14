# Clarity Browser --- UI Redesign Guide

## Goal

Refactor the Clarity Browser interface to remove clutter and restore a
**browser‑first experience**.

The browser must feel calm, minimal, and focused.

Core philosophy:

**90% browsing** **10% intelligent assistance**

The current design behaves like a productivity dashboard with a browser
embedded.\
The redesign should make Clarity feel like a **clean browser that
quietly helps users stay focused.**

Design inspiration:

-   Arc Browser
-   Safari
-   Linear
-   Notion

------------------------------------------------------------------------

# Core Design Principles

## 1. Browser First

The browser content should dominate the interface.

Productivity tools should appear **only when needed**.

Avoid permanent dashboards.

------------------------------------------------------------------------

## 2. Progressive Disclosure

Only show complexity when the user asks for it.

Examples:

Calendar → opens as overlay\
Tasks → slide-out panel\
Energy metrics → visible only in focus mode

------------------------------------------------------------------------

## 3. Calm Interface

The interface should feel:

-   quiet
-   spacious
-   minimal
-   distraction‑free

Reduce cards, panels, and visual noise.

------------------------------------------------------------------------

# New Layout Architecture

## Old Layout

    Sidebar | Browser | Context | Energy | Tasks | Timeline

## New Layout

    Sidebar | Browser

Everything else becomes **temporary UI surfaces**.

------------------------------------------------------------------------

# New Interface Structure

    -------------------------------------------------
    | Sidebar | Tab Bar + URL                       |
    |         |                                     |
    |         |                                     |
    |         |            Web Content              |
    |         |                                     |
    |         |                                     |
    -------------------------------------------------

Optional panels slide in when needed.

------------------------------------------------------------------------

# Sidebar Redesign

The sidebar must be extremely minimal.

### Include

-   Tabs
-   Pinned apps
-   Command button

### Remove

-   calendar panels
-   timeline cards
-   task widgets
-   energy metrics

These should appear **only when invoked**.

------------------------------------------------------------------------

# Sidebar Structure

    Tabs
    Pinned Apps
    Command Button

Example pinned apps:

-   Gmail
-   Notion
-   Linear
-   Jira

------------------------------------------------------------------------

# Tasks System Redesign

Tasks should **not permanently live in the sidebar**.

Instead create a **slide-out task panel**.

### Trigger

Keyboard shortcut:

    Cmd + T

The panel slides from the right side.

### Panel Content

-   Today's tasks
-   Upcoming tasks
-   Quick add
-   Task focus button

------------------------------------------------------------------------

# Calendar Redesign

Calendar should be hidden by default.

Open with:

    Cmd + E

Calendar appears as an overlay panel.

This keeps the browsing experience uncluttered.

------------------------------------------------------------------------

# Timeline Redesign

The adaptive day timeline should not always be visible.

Instead it appears in two situations.

## Morning Brief

When the user opens the browser for the first time each day.

Example:

Good morning.\
Here's your focus plan today.

The timeline appears in a modal.

------------------------------------------------------------------------

## Focus Mode

When a task starts, the timeline appears alongside the timer.

------------------------------------------------------------------------

# Energy System Redesign

Energy metrics should not be permanently visible.

They appear inside:

-   morning briefing
-   focus mode

Example metrics:

-   sleep hours
-   mood
-   energy level

------------------------------------------------------------------------

# Focus Mode

Focus mode becomes the **primary intelligent feature**.

When the user clicks **Start Focus**, the interface transforms.

Changes:

-   sidebar collapses
-   tabs fade
-   single task is highlighted
-   focus timer appears

Minimal interface with calming visuals.

------------------------------------------------------------------------

# Command Palette

The command palette becomes the **main control system**.

Shortcut:

    Cmd + K

Capabilities:

-   search tabs
-   open tasks
-   open calendar
-   update energy
-   start focus session
-   open pinned apps

Inspired by:

-   Raycast
-   Spotlight
-   Arc Command Bar

------------------------------------------------------------------------

# Context Drawer

Instead of a permanent right column, use a **context drawer**.

The drawer appears only when needed.

### Example Triggers

Opening a meeting link\
Opening a Jira issue\
Starting a task

The panel slides in from the right.

------------------------------------------------------------------------

# Example Context Drawer Content

When opening a Jira issue:

    Jira Issue Title
    Description
    Related Tasks
    Suggested Focus Block

The drawer disappears when navigating away.

------------------------------------------------------------------------

# Visual Design Guidelines

Reduce visual density.

### Use

-   large whitespace
-   subtle separators
-   soft shadows
-   glass blur
-   rounded corners

### Avoid

-   stacked cards
-   dashboard grids
-   excessive borders

------------------------------------------------------------------------

# Design Language

Adopt a **calm OS aesthetic**.

Color palette example:

Primary: soft blue\
Secondary: warm gray\
Accent: lavender

Use gradients sparingly.

------------------------------------------------------------------------

# Motion System

Use **Framer Motion**.

Animations should guide attention.

Examples:

Task panel slide-in\
Calendar fade overlay\
Focus mode zoom transition

Duration:

150ms -- 250ms

Animations should feel smooth and calming.

------------------------------------------------------------------------

# Tab Bar Design

Make tabs feel like a real browser.

Features:

-   horizontal tab bar
-   minimal style
-   pinned tabs as icons
-   hover preview

------------------------------------------------------------------------

# Cognitive Relief Mode

Relief mode simplifies the interface.

When activated:

-   sidebar labels hide
-   visual noise reduces
-   notifications mute

Focus remains on the active task.

------------------------------------------------------------------------

# UI Density Rules

Never show simultaneously:

-   calendar
-   tasks
-   timeline
-   energy dashboard
-   suggestions

At most show **one assistant surface at a time**.

------------------------------------------------------------------------

# Required Components

Implement these components:

    Sidebar
    TabBar
    BrowserView
    CommandPalette
    TaskDrawer
    CalendarDrawer
    ContextDrawer
    FocusModeOverlay
    MorningBriefModal

------------------------------------------------------------------------

# Success Criteria

The browser should feel:

-   calm
-   clean
-   focused
-   browser‑first

Users should feel like they are **just browsing**, while the system
quietly assists them.
