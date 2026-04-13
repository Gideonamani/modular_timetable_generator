# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-04-13

### Added
- **Richer JSON Export**: Exported templates now include `startDate`, `endDate`, `skipWeekends`, and `holidays` alongside modules and title. Importing a template fully restores the entire schedule state, not just the module list. Old templates that only carry modules remain fully compatible.
- **Timestamped Export Filenames**: All exported files (PDF, PNG, CSV, ICS, JSON) now embed a `YYYY-MM-DD_HH-mm` timestamp in the filename (e.g. `Modular_Timetable_2026-04-13_14-30.pdf`). Repeated exports no longer produce `(1)`, `(2)` clutter.

### Fixed
- **PNG Export Overflow Clipping**: `exportToPNG` now unlocks `overflow: visible` on both the timetable container and its `.overflow-x-auto` parent before capture, matching the behaviour already in place for PDF. Long timetables and grid views are no longer silently clipped in PNG output.
- **Google Sheets Color Validation**: Color values read from a sheet are now validated as `#rgb` or `#rrggbb` hex strings before use. Named CSS colors (e.g. `"coral"`) previously rendered in the grid but silently broke `<input type="color">` when editing that module. Invalid values now fall back to the auto-assigned palette color.

---

## [0.1.2] - 2026-04-13

### Fixed
- **Clear All Modules Button**: `clearAllModules` relied on `window.confirm()`, which is silently suppressed in cross-origin iframes, certain Chromium security contexts, and some deployed environments — causing the button to appear broken. Replaced with an inline double-click confirmation: first click arms the button ("Sure?"), second click within 2 seconds executes; the button auto-resets if the second click doesn't come.
- **JSON Import File Picker**: Clicking the Import button never opened the file dialog because a `<Button>` (rendered as `<button>`) was nested inside a `<label>`. The `<button>` consumed the click event before the label could forward it to the hidden `<input type="file">`. Fixed by attaching a `ref` to the input and calling `.click()` directly from the button's `onClick` handler.
- **PDF Break Point Measurement**: Break points were computed using a custom `relativeOffsetTop()` helper that walked the `offsetParent` chain looking for `#timetable-container` as the stop condition. Because the container is `position: static` it is never an `offsetParent`, so the loop climbed to `<body>` and returned each element's absolute page offset instead of its container-relative offset. Reverted to `getBoundingClientRect()` with the container rect as reference — viewport-relative coordinates cancel the scroll offset correctly in both approaches, but `getBoundingClientRect()` does not require the ancestor to be positioned.
- **PDF Grid View Pagination**: Grid-view exports no longer squish all weeks onto one page. Break points are now collected from CSS grid cells grouped by `getBoundingClientRect().top`, identifying each week-row's bottom edge correctly.
- **Conditional Hook Call in `ModuleSidebar`**: `useSensors`/`useSensor` were called inline as a JSX prop value inside a `modules.length > 0` ternary, violating the Rules of Hooks (hook call count changed at runtime). Hoisted to the top of the component.
- **`setState` Side-Effect in `useModules` Updater**: `removeModule` called `setUndoSnapshot(prev)` inside the `setModules` updater function. React calls updaters twice in Strict Mode (dev), so the snapshot was capturing the already-filtered list, breaking undo. Moved `setUndoSnapshot(modules)` to a separate call before `setModules`.

---

## [0.1.1] - 2026-04-13

### Fixed
- **PDF Grid View Squish**: Grid-view exports were compressing all weeks onto a single page because the paginator only searched for `<tr>` break points, which don't exist in the CSS grid layout. The fix groups grid cells by `offsetTop` to find each week-row's bottom edge and uses those as page-break candidates.
- **PDF List View Row Cutting**: Rows with multi-line content (module name + instructor) were being split mid-row across pages. The root cause was use of `getBoundingClientRect()`, whose viewport-relative coordinates drift for rows below the visible scroll area. Replaced with a `relativeOffsetTop()` helper that walks the `offsetParent` chain, giving scroll-independent offsets.
- **PDF Capture Clipping**: The `.overflow-x-auto` wrapper surrounding the timetable container was left at its default overflow during export, allowing it to clip the `html-to-image` capture. The wrapper's overflow is now temporarily set to `visible` alongside the container and restored afterwards.
- **PDF Layout Measurement Timing**: Break points were measured immediately after applying export styles, before the browser had time to reflow. Two `requestAnimationFrame` ticks are now awaited before any measurements are taken.

---

## [0.1.0] - 2026-04-13

### Added
- **Google Sheets Integration**: Ability to synchronize module data from a published Google Sheet.
- **Onboarding Guide**: A modal to help new users understand how to use the generator.
- **Export Options**: Added iCal (ICS) format for calendar integration alongside PNG, PDF, and CSV.
- **Data Mobility**: Support for importing/exporting full application configurations as JSON.
- **Deployment**: Vercel configuration for automated CI/CD and production hosting.

### Fixed
- **PDF Pagination**: Implemented row-aware pagination for PDF exports to prevent content cropping.
- **A4 Layout**: Optimized export sizes to fit standard A4 dimensions.
- **UI Polish**: Removed unwanted scrollbars from generated image and PDF exports.
- **Theme Consistency**: Aligned all components with CSS variables for better styling control.

### Changed
- **Architecture Refactor**: Heavy modularization of the codebase:
    - Extracted logic into custom hooks (`useModules`, `useGoogleSheets`, `useExports`).
    - Separated UI into `ModuleSidebar` and `TimetablePreview` components.
- **Grid Layout**: Enhanced the timetable grid with 5-day layout logic and improved text overflow handling.
- **Internal Cleanup**: Standardized types, constants, and scheduling algorithms.

---
*Initial versioning started at 0.1.0 based on existing project state.*
