import * as React from "react";
import { format, addDays } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Module, DaySchedule } from "../types";

interface ExportOptions {
  schedule: DaySchedule[];
  timetableTitle: string;
  timetableSubtitle: string;
  modules: Module[];
  setModules: (modules: Module[]) => void;
  setTimetableTitle: (title: string) => void;
  setTimetableSubtitle: (subtitle: string) => void;
}

export function useExports({
  schedule,
  timetableTitle,
  timetableSubtitle,
  modules,
  setModules,
  setTimetableTitle,
  setTimetableSubtitle,
}: ExportOptions) {
  const [isExporting, setIsExporting] = React.useState(false);

  const getFilename = (ext: string) =>
    `${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.${ext}`;

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
    setIsExporting(true);
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    element.classList.add('export-mode');
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
      element.style.backgroundColor = '';
      element.style.padding = '';
      element.classList.remove('export-mode');
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;
    setIsExporting(true);
    const originalBg = element.style.backgroundColor;
    const originalPadding = element.style.padding;
    const originalOverflow = element.style.overflow;
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    element.style.overflow = 'visible';
    element.classList.add('export-mode');
    try {
      const srcWidth = element.scrollWidth;
      const srcHeight = element.scrollHeight;
      const containerRect = element.getBoundingClientRect();
      const breakPoints: number[] = [0];

      element.querySelectorAll('tr').forEach(row => {
        breakPoints.push(row.getBoundingClientRect().bottom - containerRect.top);
      });

      const legendEl = element.querySelector('[class*="border-t"]');
      if (legendEl) {
        const legendTop = legendEl.getBoundingClientRect().top - containerRect.top;
        if (!breakPoints.includes(legendTop)) breakPoints.push(legendTop);
      }
      breakPoints.push(srcHeight);

      const uniqueBreaks = [...new Set(breakPoints)].sort((a, b) => a - b);

      const dataUrl = await toPng(element, {
        pixelRatio: 2, width: srcWidth, height: srcHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
      });

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const MARGIN = 28;
      const FOOTER_HEIGHT = 20;
      const printableWidth = A4_WIDTH - MARGIN * 2;
      const printableHeight = A4_HEIGHT - MARGIN * 2 - FOOTER_HEIGHT;
      const scale = printableWidth / srcWidth;

      const pages: Array<{ srcTop: number; srcBottom: number }> = [];
      let currentPageTop = 0;

      for (let i = 1; i < uniqueBreaks.length; i++) {
        const pageContentHeight = (uniqueBreaks[i] - currentPageTop) * scale;
        if (pageContentHeight > printableHeight) {
          let bestBreak = currentPageTop;
          for (let j = i - 1; j >= 0; j--) {
            if ((uniqueBreaks[j] - currentPageTop) * scale <= printableHeight && uniqueBreaks[j] > currentPageTop) {
              bestBreak = uniqueBreaks[j];
              break;
            }
          }
          if (bestBreak === currentPageTop) bestBreak = uniqueBreaks[i];
          pages.push({ srcTop: currentPageTop, srcBottom: bestBreak });
          currentPageTop = bestBreak;
          i--;
        }
      }
      if (currentPageTop < srcHeight) pages.push({ srcTop: currentPageTop, srcBottom: srcHeight });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });

      const imgPixelWidth = img.naturalWidth;
      const imgPixelHeight = img.naturalHeight;
      const pxRatio = imgPixelHeight / srcHeight;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        if (pageIdx > 0) pdf.addPage();
        const { srcTop, srcBottom } = pages[pageIdx];
        const sliceSrcHeight = srcBottom - srcTop;
        const cropY = Math.floor(srcTop * pxRatio);
        const cropH = Math.min(Math.ceil(sliceSrcHeight * pxRatio), imgPixelHeight - cropY);

        const canvas = document.createElement('canvas');
        canvas.width = imgPixelWidth;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(img, 0, cropY, imgPixelWidth, cropH, 0, 0, imgPixelWidth, cropH);

        const slicePdfHeight = sliceSrcHeight * scale;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, printableWidth, Math.min(slicePdfHeight, printableHeight));

        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        const footerText = `Page ${pageIdx + 1} of ${pages.length}`;
        pdf.text(footerText, (A4_WIDTH - pdf.getTextWidth(footerText)) / 2, A4_HEIGHT - MARGIN + 4);
      }

      pdf.save(getFilename('pdf'));
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
      element.style.overflow = originalOverflow;
      element.classList.remove('export-mode');
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
    const data = { modules, timetableTitle, timetableSubtitle };
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
        if (data.modules && Array.isArray(data.modules)) {
          setModules(data.modules.map((m: any) => ({ ...m, id: crypto.randomUUID() })));
          if (data.timetableTitle) setTimetableTitle(data.timetableTitle);
          if (data.timetableSubtitle !== undefined) setTimetableSubtitle(data.timetableSubtitle);
        }
      } catch {
        alert('Invalid template file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return { isExporting, exportToPNG, exportToPDF, exportToCSV, exportToICS, exportToJSON, importFromJSON };
}
