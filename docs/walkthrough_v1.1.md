# Walkthrough: Version 1.1 - Fidelity & Flow

This walkthrough demonstrates the key UI hardening and real-time visibility features introduced in the BFG Network v1.1.

## 1. The Mobile Centering Logic
We moved from a fragile "Flex-Center" model to a robust "Safe-Margin" model.

### Desktop View
The app remains centered in a professional 480px frame for focused engagement.
*   **Method**: `margin: 0 auto` on `#app-container`.

### Mobile View (320px - 400px)
On small screens, the app now maintains its left-side alignment perfectly, ensuring that no pixels are cut off.
*   **Hardening**: Used `--app-gutter` and `--card-padding` variables that shrink automatically on narrow viewports.

## 2. TV-Style Newsreel
The static top-banner has been replaced with a dynamic, scrolling marquee.

*   **Behavior**: Text travels from right to left.
*   **Constraint**: The marquee acts as a "window," so long text never expands the app width.
*   **Interaction**: Hovering (or long-pressing) the newsreel pauses the animation, allowing users to easily read or click on alerts.

## 3. Backend Self-Cleaning
We implemented a modern v2 Scheduler for database maintenance.

*   **Task**: `prunepublicactivity`
*   **Trigger**: Every hour on the hour (`0 * * * *`).
*   **Goal**: Keeps the `public_activity` collection (which feeds the Newsreel) at a maximum of 50 records for optimal performance and cost-efficiency.

## 4. Verification Checklist
- [x] Tested on iPhone SE (320px) - No clipping.
- [x] Verified Marquee animation smoothness.
- [x] Confirmed Cloud Functions deployment status in Firebase Console.
- [x] Validated production assets on `app.thebfg.team`.

---
*Verified by Antigravity v1.1*
