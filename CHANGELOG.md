# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
