# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2026-04-15

### Changed
- **Load Performance**: Reduced main Javascript bundle size by ~60% (from 730 KB to 292 KB) using Vite manual chunking and splitting third-party libraries (UI, motion, drag-and-drop, dates) into cacheable vendor chunks.
- **Lazy-Loading**: Substantially deferred loading of heavy libraries (`html-to-image`, `papaparse`, `lz-string`, and `@react-pdf/renderer`). These are now dynamically imported strictly on-demand, improving initial render times.
- **CSS Transitions**: Optimized page rendering and paint costs by replacing universal `*` style transitions with specific, targeted rules for background color and text color.
- **Dependency Hygiene**: Cleaned up `package.json` by removing 33 unused packages (`html2canvas`, `jspdf`, `express`, `dotenv`), establishing correct `devDependencies` mapping, and enforcing nested version resolutions for compatibility.

## [0.1.8] - 2026-04-15

### Added
- **Shareable URLs ("Magic Links")**: Implemented state-in-URL sharing using `lz-string` compression. The entire application state (modules, dates, holidays, title, view mode) is encoded into a compressed, URL-safe string.
- **Deep Linking & Hydration**: Opening a "Magic Link" automatically hydrates the application with the shared state, enabling instant collaboration and version branching. Shared state takes precedence over local storage on mount.
- **Share Button**: Added a dedicated "Share" button to the preview toolbar with native clipboard integration and 2-second visual "Copied!" feedback.
- **URL State Utility**: Created `src/lib/url-state.ts` to manage the lifecycle of compressed state strings.

## [0.1.7] - 2026-04-14

### Added
- **SVG Export**: New "SVG" button (distinct `FileCode2` icon) exports the timetable as a fully scalable `.svg` file using `html-to-image`'s `toSvg()`. Ideal for Figma / Illustrator workflows. A tooltip notes that text is wrapped in `<foreignObject>` and may not be selectable in all viewers.
- **Button Tooltips**: All 7 toolbar buttons in the Preview panel (List, Grid, PNG, SVG, CSV, iCal, PDF) now carry descriptive `title` attributes so their purpose is clear on hover.
- **Exam Day Opt-out**: Each module now has a `hasExamDay` flag (default `true`). An "Include exam day" checkbox in the add/edit form lets users uncheck it to prevent the last day of a module from being flagged as an exam day. Fully backward-compatible — existing data without the field is treated as `true`.
- **Gap Pseudo-module**: A new "Gap" module type lets users insert explicitly named breaks between modules (e.g. "Reading Week", "Study Break"). Gaps share the module infrastructure (name, days, optional description) but render distinctly: dashed border, square icon, italic muted text, and a "GAP" badge. The colour picker is shown but visually disabled (fixed light grey). Gap days are never flagged as exam days.
- **Live Day Counter**: A `X / Yd` counter sits next to the Module/Gap toggle pill in the sidebar, showing scheduled days vs. available working days in real time. Colour-coded: green-600 = exact fit, faint green = gap (under-scheduled), red-500 = overrun.
- **`@react-pdf/renderer` PDF Engine**: Replaced the `html-to-image` + JPEG-slice + `jsPDF` screenshot pipeline with a native `@react-pdf/renderer` document component (`TimetablePDF.tsx`). PDFs now contain real, selectable, searchable text; pagination is handled by the PDF engine (no more DOM measurement); output is identical across devices (mobile and desktop produce the same PDF). Vite config extended with `cjsCompatPlugin` to shim `base64-js` as a proper ESM module and `optimizeDeps.include` to pre-bundle the renderer.
- **PDF Grid View**: `TimetablePDF` branches on the active view mode — list view renders the familiar date/day/module table; grid view renders a calendar-style layout with week rows, day-name column headers (fixed, repeating on every page), and colour-tinted module blocks. Week rows use `wrap={false}` to prevent a week from splitting across pages.
- **PDF Respects Active View Mode**: The exported PDF now mirrors whichever view (list or grid) is active in the app at export time. `viewMode` and `skipWeekends` are threaded from `App` → `useExports` → `TimetablePDF`.

### Fixed
- **PDF Row Cutting (Permanent Fix)**: The previous DOM-measurement-based pagination is fully replaced by `@react-pdf/renderer`'s native engine, permanently eliminating the subpixel drift that caused rows to split at page boundaries in long timetables.
- **Grid Date Numbers Missing Month**: Grid view cells (both frontend and PDF) now display `MMM d` (e.g. "Apr 13") instead of a bare day number, making the month always visible without having to cross-reference the header.

### Changed
- **PDF Export Pipeline**: `exportToPDF` in `useExports` no longer captures a DOM screenshot. It dynamically imports `@react-pdf/renderer` and `TimetablePDF`, calls `pdf().toBlob()`, and downloads the result. The old `computePages()` / `html-to-image` / `jsPDF` pipeline and its associated test file are removed.

---

## [0.1.6] - 2026-04-14

### Fixed
- **Mobile: export buttons overflow** — Added `flex-wrap` to the Preview toolbar and made button labels hidden on mobile (icon-only below `sm`), preventing horizontal overflow on small screens.
- **Mobile: module action buttons inaccessible** — Edit, Duplicate, and Delete buttons on module rows were `opacity-0` until hover, which doesn't exist on touch devices. They are now always visible on mobile and revert to hover-only reveal on `sm+` screens.
- **Mobile: timetable table column widths and wrapping** — Narrowed the Date column (`w-[72px]`) and Day column (`w-[52px]`) on mobile to give the Module / Activity column room to breathe. Day names shorten to three-letter abbreviations (Mon, Tue, Wed…) on mobile and expand to full names on `sm+`. The timetable container's `min-w-[600px]` is now scoped to `sm+` only, so on mobile the table fills the viewport and the module column wraps long names. The EXAM DAY badge and instructor are rendered on a dedicated line below the module name so they are always visible regardless of name length. Root cause of original clipping was `TableCell`'s default `whitespace-nowrap`; overridden with `whitespace-normal`.
- **Mobile: module list scroll trap** — The `ScrollArea` holding the module list used a fixed `h-[300px]` which created a nested scroll context inside the page scroll. Removed the height constraint entirely below `sm` so the list expands naturally; the fixed height and custom scrollbar are retained on `sm+` desktop layouts. This also fixes the module edit form being clipped — expanding a module for editing now pushes content down naturally rather than hiding it behind the scroll boundary.
- **Mobile: date picker button text** — Start / End Date buttons showed the full `PPP` format ("April 13th, 2026") which was cramped in the 50%-width grid on mobile. Now shows the shorter `MMM d, yyyy` format ("Apr 13, 2026") on mobile, falling back to the full format on `sm+`.

---

## [0.1.5] - 2026-04-13

### Added
- **PDF Pagination Unit Tests**: Extracted `computePages()` from the PDF export pipeline into a standalone pure function in `src/lib/pdf-pagination.ts`. Added 16 unit tests in `src/lib/pdf-pagination.test.ts` covering single-page, multi-page, mixed row heights, edge cases (zero height, exact-fit, oversized row force-cut), input sanitisation (duplicates, out-of-range, unsorted, fractional break points), and invariant verification (no gaps, no overlaps, boundaries always on break points). All 29 tests pass.

### Changed
- **`exportToPDF` refactor**: The inline pagination loop in `useExports.ts` has been replaced with a call to the new `computePages()` utility. Behaviour is identical; the extracted function is now independently testable.

---

## [0.1.4] - 2026-04-13

### Changed
- **PDF Export File Size**: Significantly reduced PDF file sizes through two changes applied to the PDF pipeline only (PNG exports are unchanged):
    - Capture `pixelRatio` lowered from `2×` to `1.5×` — reduces the raw canvas area to ~56% of its previous size. `2×` is Retina-screen quality and unnecessary for print output.
    - Per-page images embedded in the PDF are now encoded as **JPEG at 0.92 quality** instead of PNG. JPEG compresses colour-heavy content (coloured module cells, row backgrounds) dramatically better than PNG with no visible quality difference in print. The canvas is pre-filled with white before drawing to prevent transparent pixels rendering as black (JPEG has no alpha channel).

---

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
