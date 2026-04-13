import * as React from "react";
import { format, addDays } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Module, DaySchedule } from "../types";

interface ExportOptions {
  schedule: DaySchedule[];
  timetableTitle: string;
  timetableSubtitle: string;
  startDate: Date;
  endDate: Date;
  holidays: Date[];
  skipWeekends: boolean;
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

  const exportToPDF = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;

    // Also unlock the overflow-x-auto wrapper so it never clips the capture
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

    // Wait two animation frames so the browser fully reflows after the style changes
    await new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }));

    try {
      const srcWidth = element.scrollWidth;
      const srcHeight = element.scrollHeight;
      const breakPoints: number[] = [0];

      // getBoundingClientRect() gives viewport-relative coordinates for every element.
      // Taking (child.rect - container.rect) cancels the scroll offset, giving the correct
      // position of any child relative to the container top — regardless of page scroll.
      // This works even though #timetable-container is position:static (not an offsetParent),
      // which made the previous offsetParent-walking approach return wrong values.
      const containerRect = element.getBoundingClientRect();

      // List view — break after the bottom edge of each <tr>
      element.querySelectorAll<HTMLElement>('tr').forEach(row => {
        breakPoints.push(Math.round(row.getBoundingClientRect().bottom - containerRect.top));
      });

      // Grid view — the calendar is a CSS grid of <div>s, not a <table>.
      // Group cells by their rounded top edge to identify each week-row, then
      // take the maximum bottom edge of that group as the break point.
      const gridContainer = element.querySelector<HTMLElement>('[class*="grid-cols"]');
      if (gridContainer) {
        const rowBottomByTop = new Map<number, number>();
        Array.from(gridContainer.querySelectorAll<HTMLElement>(':scope > div')).forEach(cell => {
          const rect = cell.getBoundingClientRect();
          const relTop  = Math.round(rect.top  - containerRect.top);
          const relBottom = Math.round(rect.bottom - containerRect.top);
          rowBottomByTop.set(relTop, Math.max(rowBottomByTop.get(relTop) ?? 0, relBottom));
        });
        rowBottomByTop.forEach(bottom => breakPoints.push(bottom));
      }

      // Legend section — prefer not to split it across pages
      const legendEl = element.querySelector<HTMLElement>('[class*="border-t"]');
      if (legendEl) {
        breakPoints.push(Math.round(legendEl.getBoundingClientRect().top - containerRect.top));
      }

      breakPoints.push(srcHeight);

      const uniqueBreaks = [...new Set(breakPoints.map(Math.round))]
        .filter(b => b >= 0 && b <= srcHeight)
        .sort((a, b) => a - b);

      // 1.5× is sufficient for print quality and reduces canvas area to ~56% of 2×.
      // 2× is only needed for Retina screen rendering, not for PDF output.
      const dataUrl = await toPng(element, {
        pixelRatio: 1.5, width: srcWidth, height: srcHeight,
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
          // Walk backwards to find the last break point that fits
          let bestBreak = currentPageTop;
          for (let j = i - 1; j >= 0; j--) {
            if (
              uniqueBreaks[j] > currentPageTop &&
              (uniqueBreaks[j] - currentPageTop) * scale <= printableHeight
            ) {
              bestBreak = uniqueBreaks[j];
              break;
            }
          }
          // If nothing fits (single row taller than a page), force-cut at this break
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
      // Physical pixel : CSS pixel ratio from the actual captured image
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
        // Fill white before drawing — JPEG has no alpha channel and transparent
        // pixels would otherwise render as black in the PDF.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, cropY, imgPixelWidth, cropH, 0, 0, imgPixelWidth, cropH);

        // Clamp to printableHeight as a safety net — correct break points mean this
        // should never trigger in practice, but prevents content overflowing the page
        // if a slice ends up fractionally over due to rounding.
        const slicePdfHeight = Math.min(sliceSrcHeight * scale, printableHeight);
        // JPEG at 0.92 quality: dramatically smaller than PNG for colour-heavy content
        // (coloured module cells, backgrounds) with no visible quality loss in print.
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, printableWidth, slicePdfHeight);

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
      if (scrollWrapper) scrollWrapper.style.overflow = originalWrapperOverflow;
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

  return { isExporting, exportToPNG, exportToPDF, exportToCSV, exportToICS, exportToJSON, importFromJSON };
}
