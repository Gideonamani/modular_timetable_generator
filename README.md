# Modular Timetable Generator

A browser-based timetable builder that distributes study modules across a date range. Configure modules with names, durations, colors, and instructors, then export the resulting schedule in multiple formats.

## Features

- **Module management** — add, edit, duplicate, reorder (drag-and-drop), and delete modules; 1-level undo on delete and clear-all
- **Date controls** — pick start/end dates, skip weekends, and mark custom holidays
- **Live schedule preview** — list and grid view modes with color-coded modules
- **Exports** — PNG, PDF, CSV, and ICS (calendar) formats
- **Import/Export config** — save and restore your full setup as JSON
- **Google Sheets sync** — pull module data from a published Google Sheet
- **Dark mode** — toggle with a smooth transition, persisted across sessions
- **Persistence** — all settings and modules are saved to `localStorage` automatically

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Date logic | date-fns |
| PDF export | jsPDF + html2canvas |
| Image export | html-to-image |
| CSV parsing | PapaParse |
| Tests | Vitest |

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Other Scripts

```bash
npm run build    # production build
npm run preview  # serve the production build locally
npm run lint     # TypeScript type check
npm run test     # run unit tests (Vitest)
```

## Project Structure

```
src/
  App.tsx                     # root component, state wiring
  types.ts                    # Module, DaySchedule, ViewMode types
  components/
    ModuleSidebar.tsx          # left panel — module form, settings, exports
    TimetablePreview.tsx       # right panel — schedule display
    ErrorBoundary.tsx
  lib/
    schedule-logic.ts          # core scheduling algorithm
    schedule-logic.test.ts     # unit tests
    constants.ts               # default modules
    google-sheets.ts           # Google Sheets fetch logic
  hooks/
    useModules.ts              # module CRUD + undo
    useExports.ts              # PNG/PDF/CSV/ICS/JSON export handlers
    useGoogleSheets.ts         # sheet sync state
    useDebouncedEffect.ts      # debounced localStorage writes
```

## Project Management

This project maintains a clear distinction between past achievements and future goals:

- **[CHANGELOG.md](file:///c:/Users/user/KeonGeraldo/CodeProjects/modular_timetable_generator/CHANGELOG.md)**: A historical record of all stable releases and significant changes.
- **[ROADMAP.md](file:///c:/Users/user/KeonGeraldo/CodeProjects/modular_timetable_generator/ROADMAP.md)**: A forward-looking document outlining planned features, current priorities, and experimental ideas.

We follow [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format to ensure the project remains maintainable and transparent as it grows.

## License

See [LICENSE](LICENSE).
