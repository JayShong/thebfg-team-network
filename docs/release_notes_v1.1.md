# Release Notes: Version 1.1 - The "Fidelity" Update

## Overview
Version 1.1 focuses on institutional hardening of the user experience, specifically targeting mobile responsiveness and visual stability. We have eliminated the "left-clipping" issue that affected narrow viewports and introduced a dynamic TV-style newsreel for real-time network visibility.

## Key Changes

### 📱 Mobile Responsiveness Hardening
*   **Structural Refactor**: Replaced Flexbox-based body centering with a robust `margin: 0 auto` pattern. This ensures that the app frame is always pinned to the left edge on narrow screens, preventing the browser from cutting off content.
*   **Pixel-Perfect Constraints**: Applied `box-sizing: border-box` and `min-width: 0` app-wide to prevent internal components (like long text or wide cards) from "stretching" the layout beyond the physical screen width.
*   **Dynamic Variable Padding**: Implemented CSS spacing tokens (`--app-gutter`, `--card-padding`) that automatically shrink on small devices, providing more room for core content.

### 📺 TV-Style Newsreel Marquee
*   **Scrolling Intelligence**: Replaced the static/truncated newsreel with a smooth, right-to-left scrolling marquee.
*   **Full Readability**: All network activity, announcements, and supervisor alerts are now fully readable in a single line without breaking the layout.
*   **Pause on Hover**: Added a "Reading Pause" feature—hovering over the newsreel stops the animation for easier interaction.

### 🛡️ Infrastructure & Stability
*   **Cloud Function v2 Scheduler**: Refactored the hourly database pruning task to use the modern Firebase Functions v2 SDK with a standardized cron-based schedule (`0 * * * *`).
*   **Overflow Safety**: Added strict `overflow: hidden` and `text-overflow: ellipsis` guards to all high-risk UI components.

## Verification
*   Tested on multiple viewport sizes: **320px (iPhone SE)**, **360px (Standard Android)**, and **430px (iPhone Pro Max)**.
*   Verified backend pruning triggers in the Google Cloud Console.
*   Confirmed cache-busting deployment successfully pushed new assets to `app.thebfg.team`.

---
*The BFG Conviction Network: Strengthening the Empathy Economy through High-Fidelity Engineering.*
