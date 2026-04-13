# Project Roadmap — Modular Timetable Generator

This document outlines the planned trajectory for the project. For a historical record of what has already been delivered, see [CHANGELOG.md](file:///c:/Users/user/KeonGeraldo/CodeProjects/modular_timetable_generator/CHANGELOG.md).

## Recently Completed
- [x] **Logic Modularization** — extracted core functionality into `useModules`, `useGoogleSheets`, and `useExports` hooks
- [x] **Vercel Deployment** — configured CI/CD and deployment settings for production hosting
- [x] **Google Sheets Sync** — added ability to pull module data from external spreadsheets
- [x] **Grid View Enhancements** — implemented 5-day layout logic and improved text rendering
- [x] **PDF Export Optimization** — fixed row cropping and added intelligent pagination
- [x] **PDF Grid View Pagination** — grid-view exports now paginate correctly by week-row instead of squishing all content onto one page
- [x] **PDF List View Row Integrity** — multi-line rows (module + instructor) no longer split across page boundaries; replaced `getBoundingClientRect()` with scroll-independent `offsetParent` measurements
- [x] **PDF Export Capture Fix** — resolved overflow clipping from the scroll wrapper and added reflow timing so measurements are always accurate
- [x] **PDF Break Point Measurement** — reverted to `getBoundingClientRect()` with the container rect as reference; the previous `offsetParent`-walking helper silently returned wrong values because `#timetable-container` is `position: static`
- [x] **PDF Pagination Extraction & Tests** — `computePages()` extracted into `src/lib/pdf-pagination.ts` as a pure, independently testable function; 16 unit tests added covering all edge cases; algorithm proven correct
- [x] **JSON Import File Picker** — replaced `<label>` wrapper with a `ref`-driven `.click()` call; nested `<button>` inside `<label>` was consuming the click event
- [x] **Conditional Hook Call (`ModuleSidebar`)** — hoisted `useSensors(...)` to component top; was called conditionally inside a ternary
- [x] **`setState` Side-Effect in Updater (`useModules`)** — separated `setUndoSnapshot` into its own call before `setModules`
- [x] **Clear All Button** — replaced `window.confirm()` (silently suppressed in many contexts) with inline double-click confirmation

---

## Known Bugs

### 🔴 Critical
- [x] **Conditional hook call in `ModuleSidebar`** — hoisted `useSensors(...)` to the top of the component; was previously called inline inside a `modules.length > 0` ternary.
- [x] **`setState` side-effect inside updater in `useModules`** — separated `setUndoSnapshot(modules)` into its own call before `setModules`; was previously a side-effect inside the updater function.

### 🟡 Medium
- [ ] **PDF list-view rows still being cut at page boundaries** — investigation complete. The `computePages()` algorithm is proven correct by 16 unit tests (all pass). Root cause of residual cutting is DOM measurement drift: `getBoundingClientRect()` measures the live DOM layout while `html-to-image` renders an off-screen clone; subpixel height differences accumulate across many rows, causing 1–2 px misalignment per row that grows in long tables. The permanent fix is `@react-pdf/renderer` (see Future Ideas below) — the PDF engine handles pagination natively, bypassing DOM measurement entirely. `computePages()` and its tests remain in place as a solid foundation.
- [x] **PNG export not unlocking overflow** — applied the same overflow-visible fix as PDF; container and wrapper are both unlocked before capture and restored after.
- [x] **Unvalidated sheet color values** — added `resolveHexColor()` in `google-sheets.ts`; only valid `#rgb`/`#rrggbb` values are accepted, everything else falls back to the auto palette.

### 🟢 Low
- [ ] **Single-day modules always flagged as Exam Day** — `schedule-logic.ts` marks a day as exam day when `currentModuleDaysLeft === 1`, so any module with `days: 1` has its only day flagged. This is likely unintentional for short modules like workshops or orientations.

---

## Future Ideas

### UX & Interface
- [ ] **Dark mode** — toggle between light and dark themes, persisted to localStorage
- [ ] **Keyboard shortcuts** — quick actions for adding modules, undoing, and exports
- [ ] **Drag-to-reorder modules in sidebar** — let users reorder the module list directly
- [ ] **Inline module editing** — click a module name directly on the grid to rename or change color

### Scheduling Logic
- [ ] **Conflict / Gap Detection** — warn the user if modules overlap or leave unassigned days
- [ ] **Buffer Days** — option to insert blank days between consecutive modules
- [ ] **Weighted Distribution** — let certain modules span more days relative to others
- [ ] **Semester Templates** — save full semester configurations as reusable templates

### Exports & Sharing
- [x] **Richer JSON template** — exported JSON now includes `startDate`, `endDate`, `skipWeekends`, and `holidays`; import restores the full schedule state. Old module-only templates remain compatible.
- [x] **Timestamped export filenames** — all exported files now embed a `YYYY-MM-DD_HH-mm` timestamp; no more `(1)`, `(2)` collisions.
- [x] **PDF export file size reduction** — lowered capture `pixelRatio` from 2× to 1.5× and switched per-page images from PNG to JPEG at 0.92 quality; canvas pre-filled white to handle JPEG's lack of alpha. PNG exports unchanged.
- [ ] **SVG Export** — add a standalone `.svg` download using `html-to-image`'s `toSvg()`. Gives designers and power users a fully scalable, resolution-independent version of the timetable that opens cleanly in Figma, Illustrator, and browsers. Note: SVG output from `html-to-image` wraps HTML in `<foreignObject>`, so text is not natively selectable in all viewers — this is a display/design export, not a replacement for PDF.
- [ ] **Native PDF rendering with selectable text** — replace the current screenshot-to-PDF pipeline with `@react-pdf/renderer`. The timetable layout would be defined as PDF-native React components (`<Document>`, `<Page>`, `<Text>`, `<View>`), producing PDFs with real, selectable, searchable text for all module names, dates, and instructor fields. This also permanently resolves the row-cutting issue since pagination is handled by the PDF engine rather than DOM measurement. Requires maintaining a parallel layout definition alongside the existing HTML view — significant but high-payoff refactor.
- [ ] **Shareable URL** — encode current schedule state into a URL for easy sharing
- [ ] **Google Calendar Sync** — push the schedule directly to a Google Calendar
- [ ] **Print-Optimized View** — clean print stylesheet for `Ctrl+P`
- [ ] **Batch Export** — export all formats (PDF, CSV, ICS, PNG) at once as a ZIP

### Data & Integration
- [ ] **Import from CSV/Excel** — upload existing timetables or module lists from local files
- [ ] **Multi-Semester View** — display or compare two semesters side by side
- [ ] **Audit Log / Change History** — track when and how the schedule was last modified

### Gemini AI (Planed Integration)
- [ ] **AI Schedule Suggestions** — use Gemini to suggest optimal module ordering
- [ ] **Natural Language Input** — describe a schedule in plain text and have it parsed automatically
