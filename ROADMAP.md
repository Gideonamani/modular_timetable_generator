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

---

## Known Bugs

### 🔴 Critical
- [ ] **Conditional hook call in `ModuleSidebar`** — `useSensors`/`useSensor` are called inline as a JSX prop inside a `modules.length > 0` ternary, violating the Rules of Hooks. Hook call count changes at runtime, which can cause unpredictable state bugs or crashes in Strict Mode. Fix: hoist the `useSensors(...)` call to the top of the component.
- [ ] **`setState` side-effect inside updater in `useModules`** — `removeModule` calls `setUndoSnapshot(prev)` inside the `setModules` updater function. Updaters must be pure; in Strict Mode they are intentionally invoked twice, so the snapshot would capture the already-filtered list instead of the original. Fix: call `setUndoSnapshot` separately before `setModules`.

### 🟡 Medium
- [ ] **PNG export not unlocking overflow** — `exportToPNG` in `useExports` doesn't set `overflow: visible` on the timetable container or its `.overflow-x-auto` parent, so long timetables and grid views can be silently clipped in PNG output. The same fix applied to PDF export should be applied here.
- [ ] **Unvalidated sheet color values** — `google-sheets.ts` passes color values from the sheet directly without validation. CSS color names (e.g. `"coral"`) render fine but break `<input type="color">`, which requires a valid hex string. Fix: attempt to resolve named colors to hex, or fall back to the auto palette if the value isn't a valid hex code.

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
