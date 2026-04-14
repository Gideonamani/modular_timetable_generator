import * as React from "react";
import { format, addDays } from "date-fns";
import { toPng, toSvg } from "html-to-image";
import { Module, DaySchedule, ViewMode } from "../types";

interface ExportOptions {
  schedule: DaySchedule[];
  timetableTitle: string;
  timetableSubtitle: string;
  startDate: Date;
  endDate: Date;
  holidays: Date[];
  skipWeekends: boolean;
  viewMode: ViewMode;
  modules: Module[];
  setModules: (modules: Module[]) => void;
  setTimetableTitle: (title: string) => void;
  setTimetableSubtitle: (subtitle: string) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setHolidays: (dates: Date[]) => void;
  setSkipWeekends: (skip: boolean) => void;
}

export function useExports({
  schedule,
  timetableTitle,
  timetableSubtitle,
  startDate,
  endDate,
  holidays,
  skipWeekends,
  viewMode,
  modules,
  setModules,
  setTimetableTitle,
  setTimetableSubtitle,
  setStartDate,
  setEndDate,
  setHolidays,
  setSkipWeekends,
}: ExportOptions) {
  const [isExporting, setIsExporting] = React.useState(false);

  // Embed a timestamp so repeated exports never produce colliding filenames
  const getFilename = (ext: string) => {
    const title = timetableTitle.replace(/\s+/g, '_') || 'timetable';
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    return `${title}_${timestamp}.${ext}`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPNG = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;

    const scrollWrapper = element.closest<HTMLElement>('.overflow-x-auto');
    const originalWrapperOverflow = scrollWrapper?.style.overflow ?? '';

    setIsExporting(true);
    const originalBg = element.style.backgroundColor;
    const originalPadding = element.style.padding;
    const originalOverflow = element.style.overflow;
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    element.style.overflow = 'visible';
    if (scrollWrapper) scrollWrapper.style.overflow = 'visible';
    element.classList.add('export-mode');

    await new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }));

    try {
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toPng(element, {
        pixelRatio: 2, width, height,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
      });
      const link = document.createElement('a');
      link.download = getFilename('png');
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
      element.style.overflow = originalOverflow;
      if (scrollWrapper) scrollWrapper.style.overflow = originalWrapperOverflow;
      element.classList.remove('export-mode');
      setIsExporting(false);
    }
  };

  const exportToSVG = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;

    const scrollWrapper = element.closest<HTMLElement>('.overflow-x-auto');
    const originalWrapperOverflow = scrollWrapper?.style.overflow ?? '';

    setIsExporting(true);
    const originalBg = element.style.backgroundColor;
    const originalPadding = element.style.padding;
    const originalOverflow = element.style.overflow;
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    element.style.overflow = 'visible';
    if (scrollWrapper) scrollWrapper.style.overflow = 'visible';
    element.classList.add('export-mode');

    await new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }));

    try {
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toSvg(element, {
        width, height,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
      });
      const link = document.createElement('a');
      link.download = getFilename('svg');
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export SVG', err);
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
      element.style.overflow = originalOverflow;
      if (scrollWrapper) scrollWrapper.style.overflow = originalWrapperOverflow;
      element.classList.remove('export-mode');
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Dynamically import so the renderer's heavy internals are code-split
      // and don't inflate the initial bundle.
      const [{ pdf }, { TimetablePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/TimetablePDF'),
      ]);
      const element = React.createElement(TimetablePDF, {
        schedule,
        timetableTitle,
        timetableSubtitle,
        startDate,
        endDate,
        modules,
        viewMode,
        skipWeekends,
      });
      // Cast needed because TypeScript can't statically verify that
      // TimetablePDF's return type satisfies DocumentProps — it wraps <Document> internally.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(element as any).toBlob();
      if (blob) downloadBlob(blob, getFilename('pdf'));
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    if (schedule.length === 0) return;
    const headers = ['Date', 'Day', 'Module', 'Instructor', 'Is Exam Day'];
    const rows = schedule.map(day => [
      format(day.date, 'yyyy-MM-dd'),
      format(day.date, 'EEEE'),
      day.module?.name || (day.isHoliday ? 'Holiday' : day.isWeekend ? 'Weekend' : 'Free'),
      day.module?.instructor || '',
      day.isExamDay ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), getFilename('csv'));
  };

  const exportToICS = () => {
    if (schedule.length === 0) return;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Modular Timetable Generator//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ];
    schedule.forEach((day, index) => {
      if (!day.module) return;
      const dtStart = format(day.date, 'yyyyMMdd');
      const dtEnd = format(addDays(day.date, 1), 'yyyyMMdd');
      const timestamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${dtStart}-${index}@timetable-generator.local`);
      lines.push(`DTSTAMP:${timestamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${day.module.name}`);
      if (day.module.instructor) lines.push(`DESCRIPTION:Instructor: ${day.module.instructor}`);
      if (day.isExamDay) { lines.push('CATEGORIES:EXAM'); lines.push('PRIORITY:1'); }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' }), getFilename('ics'));
  };

  const exportToJSON = () => {
    const data = {
      timetableTitle,
      timetableSubtitle,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      skipWeekends,
      holidays: holidays.map(h => h.toISOString()),
      modules,
    };
    const filename = getFilename('json').replace('.json', '_template.json');
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.modules || !Array.isArray(data.modules)) {
          alert('Invalid template file: missing modules array.');
          return;
        }
        setModules(data.modules.map((m: any) => ({ ...m, id: crypto.randomUUID() })));
        if (data.timetableTitle)              setTimetableTitle(data.timetableTitle);
        if (data.timetableSubtitle !== undefined) setTimetableSubtitle(data.timetableSubtitle);
        if (data.startDate)    setStartDate(new Date(data.startDate));
        if (data.endDate)      setEndDate(new Date(data.endDate));
        if (typeof data.skipWeekends === 'boolean') setSkipWeekends(data.skipWeekends);
        if (Array.isArray(data.holidays))
          setHolidays(data.holidays.map((h: string) => new Date(h)));
      } catch {
        alert('Invalid template file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return { isExporting, exportToPNG, exportToSVG, exportToPDF, exportToCSV, exportToICS, exportToJSON, importFromJSON };
}
