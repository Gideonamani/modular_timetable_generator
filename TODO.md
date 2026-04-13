# Modular Timetable Generator — TODO

## Your Ideas

- [ ] **Optimize mobile view and downloads** — improve responsiveness of the schedule grid and ensure export files (PDF/PNG/CSV) are usable on small screens
- [ ] **Holiday prefill sheet** — provide a pre-populated set of public holidays; users can choose to keep, remove, or add their own before generating the schedule
- [ ] **CA component integration** — support Continuous Assessment days as a distinct block type, separate from module days
- [ ] **Practical days labelling** — allow individual days within a module to be tagged as "Practical" so they render differently in the grid and exports
- [ ] **File naming conventions** — standardize and make configurable how exported files are named (e.g. `{semester}_{module}_{date}.pdf`)
- [ ] **Timetable export versioning** — when exporting, append a version number or timestamp so successive exports don't overwrite each other

---

## Suggested Additions

### UX & Interface
- [ ] **Dark mode** — toggle between light and dark themes, persisted to localStorage alongside other settings
- [ ] **Keyboard shortcuts** — quick actions for adding modules, undoing, switching views, and triggering exports
- [ ] **Drag-to-reorder modules in sidebar** — use the existing `@dnd-kit` setup to let users reorder the module list, not just the schedule
- [ ] **Inline module editing** — click a module name directly on the grid to rename or change its color without opening the sidebar

### Scheduling Logic
- [ ] **Module conflict / gap detection** — warn the user if modules overlap, leave unassigned days, or if the date range is too short for all modules
- [ ] **Buffer days between modules** — option to insert 1–2 blank days between consecutive modules for review or travel
- [ ] **Weighted distribution** — let certain modules span more days relative to others without manually changing day counts (e.g. a "weight" slider)
- [ ] **Semester/term templates** — save a full semester config (date range, holidays, modules) as a reusable template

### Exports & Sharing
- [ ] **Shareable URL** — encode the current schedule state into a URL so it can be shared without exporting a file
- [ ] **Google Calendar sync** — push the schedule directly to a Google Calendar via the existing Gemini/Google API integration
- [ ] **Print-optimized view** — a clean print stylesheet so `Ctrl+P` produces a well-formatted timetable without UI chrome
- [ ] **Batch export** — export all formats (PDF, CSV, ICS, PNG) at once as a ZIP file

### Data & Integration
- [ ] **Import from CSV/Excel** — let users upload an existing timetable or module list in spreadsheet form, not just from Google Sheets
- [ ] **Multi-semester view** — display or compare two semesters side by side
- [ ] **Audit log / change history** — track when the schedule was last modified and by what change (extends the existing undo logic in `useModules.ts`)

### Gemini AI (dormant — currently referenced but unused)
- [ ] **AI schedule suggestions** — use the Gemini API key to suggest optimal module ordering based on prerequisites, instructor availability, or student load
- [ ] **Natural language input** — let users describe a schedule in plain text ("8 weeks, 4 modules, 2 weeks each, avoid Fridays") and have Gemini parse it into module config
