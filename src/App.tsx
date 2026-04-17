import * as React from "react";
import { addDays } from "date-fns";

import { ViewMode } from "./types";
import { DEFAULT_MODULES } from "./lib/constants";
import { generateSchedule } from "./lib/schedule-logic";
import { ModuleSidebar } from "./components/ModuleSidebar";
import { TimetablePreview } from "./components/TimetablePreview";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useModules } from "./hooks/useModules";
import { useGoogleSheets } from "./hooks/useGoogleSheets";
import { useExports } from "./hooks/useExports";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";
import { getStateFromUrl } from "./lib/url-state";

function getInitialData() {
  const urlState = getStateFromUrl();
  if (urlState) return urlState;

  try {
    const saved = localStorage.getItem('timetable_data');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const savedData = React.useRef(getInitialData());
  const saved = savedData.current;

  const [startDate, setStartDate] = React.useState<Date>(
    saved?.startDate ? new Date(saved.startDate) : new Date()
  );
  const [endDate, setEndDate] = React.useState<Date>(
    saved?.endDate ? new Date(saved.endDate) : addDays(new Date(), 14)
  );
  const [skipWeekends, setSkipWeekends] = React.useState<boolean>(saved?.skipWeekends ?? true);
  const [holidays, setHolidays] = React.useState<Date[]>(
    saved?.holidays ? saved.holidays.map((h: string) => new Date(h)) : []
  );
  const [viewMode, setViewMode] = React.useState<ViewMode>(saved?.viewMode ?? 'list');
  const [timetableTitle, setTimetableTitle] = React.useState<string>(
    saved?.timetableTitle ?? 'Modular Timetable'
  );
  const [timetableSubtitle, setTimetableSubtitle] = React.useState<string>(
    saved?.timetableSubtitle ?? ''
  );
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(saved?.isDarkMode ?? false);

  const moduleState = useModules(saved?.modules ?? DEFAULT_MODULES);
  const sheetsState = useGoogleSheets(moduleState.setModules, saved?.sheetUrl ?? '');

  const schedule = React.useMemo(
    () => generateSchedule(startDate, endDate, moduleState.modules, skipWeekends, holidays),
    [startDate, endDate, moduleState.modules, skipWeekends, holidays]
  );

  const workingDays = React.useMemo(
    () => schedule.filter(d => !d.isWeekend && !d.isHoliday).length,
    [schedule]
  );

  const exports = useExports({
    schedule,
    timetableTitle,
    timetableSubtitle,
    startDate,
    endDate,
    holidays,
    skipWeekends,
    viewMode,
    modules: moduleState.modules,
    setModules: moduleState.setModules,
    setTimetableTitle,
    setTimetableSubtitle,
    setStartDate,
    setEndDate,
    setHolidays,
    setSkipWeekends,
  });

  // Dark mode
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Persist to localStorage (debounced to avoid writing on every keystroke)
  useDebouncedEffect(() => {
    localStorage.setItem('timetable_data', JSON.stringify({
      startDate, endDate, skipWeekends, holidays,
      viewMode, timetableTitle, timetableSubtitle,
      modules: moduleState.modules, isDarkMode,
      sheetUrl: sheetsState.sheetUrl,
    }));
  }, [startDate, endDate, skipWeekends, holidays, viewMode, timetableTitle,
      timetableSubtitle, moduleState.modules, isDarkMode, sheetsState.sheetUrl], 500);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <ErrorBoundary>
          <ModuleSidebar
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            holidays={holidays} setHolidays={setHolidays}
            skipWeekends={skipWeekends} setSkipWeekends={setSkipWeekends}
            modules={moduleState.modules}
            addModule={moduleState.addModule}
            removeModule={moduleState.removeModule}
            updateModule={moduleState.updateModule}
            moveModule={moduleState.moveModule}
            reorderModules={moduleState.reorderModules}
            duplicateModule={moduleState.duplicateModule}
            clearAllModules={moduleState.clearAllModules}
            onClearTitleAndSubtitle={() => { setTimetableTitle(''); setTimetableSubtitle(''); }}
            canUndo={moduleState.canUndo}
            undoLastDelete={moduleState.undoLastDelete}
            newModuleName={moduleState.newModuleName} setNewModuleName={moduleState.setNewModuleName}
            newModuleDays={moduleState.newModuleDays} setNewModuleDays={moduleState.setNewModuleDays}
            newModuleInstructor={moduleState.newModuleInstructor} setNewModuleInstructor={moduleState.setNewModuleInstructor}
            newModuleColor={moduleState.newModuleColor} setNewModuleColor={moduleState.setNewModuleColor}
            newModuleHasExamDay={moduleState.newModuleHasExamDay} setNewModuleHasExamDay={moduleState.setNewModuleHasExamDay}
            newModuleHasPracticalDays={moduleState.newModuleHasPracticalDays} setNewModuleHasPracticalDays={moduleState.setNewModuleHasPracticalDays}
            newModulePracticalDaysCount={moduleState.newModulePracticalDaysCount} setNewModulePracticalDaysCount={moduleState.setNewModulePracticalDaysCount}
            newModuleType={moduleState.newModuleType} setNewModuleType={moduleState.setNewModuleType}
            formError={moduleState.formError}
            editingModuleId={moduleState.editingModuleId} setEditingModuleId={moduleState.setEditingModuleId}
            workingDays={workingDays}
            exportToJSON={exports.exportToJSON}
            importFromJSON={exports.importFromJSON}
            isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
            sheetUrl={sheetsState.sheetUrl} setSheetUrl={sheetsState.setSheetUrl}
            isSyncing={sheetsState.isSyncing} syncError={sheetsState.syncError}
            syncWithGoogleSheet={sheetsState.syncWithGoogleSheet}
          />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-8">
          <ErrorBoundary>
          <TimetablePreview
            schedule={schedule}
            viewMode={viewMode} setViewMode={setViewMode}
            timetableTitle={timetableTitle} setTimetableTitle={setTimetableTitle}
            timetableSubtitle={timetableSubtitle} setTimetableSubtitle={setTimetableSubtitle}
            startDate={startDate} endDate={endDate}
            skipWeekends={skipWeekends}
            modules={moduleState.modules}
            isExporting={exports.isExporting}
            exportToPNG={exports.exportToPNG}
            exportToSVG={exports.exportToSVG}
            exportToPDF={exports.exportToPDF}
            exportToCSV={exports.exportToCSV}
            exportToICS={exports.exportToICS}
            isDarkMode={isDarkMode}
            getShareUrl={exports.getShareUrl}
          />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
