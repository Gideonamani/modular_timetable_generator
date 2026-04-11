import * as React from "react";
import { addDays, format } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import { Module, ViewMode } from "./types";
import { COLORS, DEFAULT_MODULES } from "./lib/constants";
import { generateSchedule } from "./lib/schedule-logic";
import { ModuleSidebar } from "./components/ModuleSidebar";
import { TimetablePreview } from "./components/TimetablePreview";
import { fetchModulesFromSheet } from "./lib/google-sheets";

export default function App() {
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  const [endDate, setEndDate] = React.useState<Date>(addDays(new Date(), 14));
  const [skipWeekends, setSkipWeekends] = React.useState(true);
  const [holidays, setHolidays] = React.useState<Date[]>([]);
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [timetableTitle, setTimetableTitle] = React.useState('Modular Timetable');
  const [timetableSubtitle, setTimetableSubtitle] = React.useState('');
  const [modules, setModules] = React.useState<Module[]>(DEFAULT_MODULES);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  // Google Sheets integration state
  const [sheetUrl, setSheetUrl] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState('');

  // Theme effect
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('timetable_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.startDate) setStartDate(new Date(data.startDate));
        if (data.endDate) setEndDate(new Date(data.endDate));
        if (data.skipWeekends !== undefined) setSkipWeekends(data.skipWeekends);
        if (data.holidays) setHolidays(data.holidays.map((h: string) => new Date(h)));
        if (data.viewMode) setViewMode(data.viewMode);
        if (data.timetableTitle) setTimetableTitle(data.timetableTitle);
        if (data.timetableSubtitle !== undefined) setTimetableSubtitle(data.timetableSubtitle);
        if (data.modules) setModules(data.modules);
        if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
        if (data.sheetUrl) setSheetUrl(data.sheetUrl);
      } catch (err) {
        console.error('Failed to load saved data', err);
      }
    }
  }, []);

  // Save to localStorage on changes
  React.useEffect(() => {
    const data = {
      startDate,
      endDate,
      skipWeekends,
      holidays,
      viewMode,
      timetableTitle,
      timetableSubtitle,
      modules,
      isDarkMode,
      sheetUrl
    };
    localStorage.setItem('timetable_data', JSON.stringify(data));
  }, [startDate, endDate, skipWeekends, holidays, viewMode, timetableTitle, timetableSubtitle, modules, isDarkMode, sheetUrl]);

  const [newModuleName, setNewModuleName] = React.useState('');
  const [newModuleDays, setNewModuleDays] = React.useState<number | ''>(1);
  const [newModuleInstructor, setNewModuleInstructor] = React.useState('');
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);

  const syncWithGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setSyncError('Please enter a Google Sheet URL');
      return;
    }
    
    setIsSyncing(true);
    setSyncError('');
    
    try {
      const fetchedModules = await fetchModulesFromSheet(sheetUrl);
      if (fetchedModules.length > 0) {
        setModules(fetchedModules);
        alert(`Successfully synced ${fetchedModules.length} modules!`);
      } else {
        setSyncError('No modules found in the provided sheet.');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to sync with Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateModule = (id: string, updates: Partial<Module>) => {
    setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addModule = () => {
    if (!newModuleName.trim() || !newModuleDays || newModuleDays <= 0) return;
    const color = COLORS[modules.length % COLORS.length];
    setModules([...modules, { 
      id: crypto.randomUUID(), 
      name: newModuleName, 
      days: Number(newModuleDays), 
      color,
      instructor: newModuleInstructor.trim() || undefined
    }]);
    setNewModuleName('');
    setNewModuleDays(1);
    setNewModuleInstructor('');
  };

  const moveModule = (id: string, direction: 'up' | 'down') => {
    const index = modules.findIndex(m => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;

    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
    setModules(newModules);
  };

  const removeModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const duplicateModule = (id: string) => {
    const module = modules.find(m => m.id === id);
    if (!module) return;
    setModules([...modules, { ...module, id: crypto.randomUUID(), name: `${module.name} (Copy)` }]);
  };

  const clearAllModules = () => {
    if (confirm('Are you sure you want to clear all modules?')) {
      setModules([]);
    }
  };

  const schedule = React.useMemo(() => {
    return generateSchedule(startDate, endDate, modules, skipWeekends, holidays);
  }, [startDate, endDate, modules, skipWeekends, holidays]);

  const exportToPNG = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;
    
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    element.classList.add('export-mode');
    
    try {
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        width, height,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    } finally {
      element.style.backgroundColor = '';
      element.style.padding = '';
      element.classList.remove('export-mode');
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;
    
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
      
      // --- Collect row boundaries from the DOM ---
      const containerRect = element.getBoundingClientRect();
      const breakPoints: number[] = [0]; // start of content
      
      // Get all table rows
      const tableRows = element.querySelectorAll('tr');
      tableRows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const rowBottom = rect.bottom - containerRect.top;
        breakPoints.push(rowBottom);
      });
      
      // Also treat the legend section as a block
      const legendEl = element.querySelector('[class*="border-t"]');
      if (legendEl) {
        const legendRect = legendEl.getBoundingClientRect();
        const legendTop = legendRect.top - containerRect.top;
        // Add legend top as a break point if not already present
        if (!breakPoints.includes(legendTop)) {
          breakPoints.push(legendTop);
        }
      }
      
      // End of content
      breakPoints.push(srcHeight);
      
      // Deduplicate and sort
      const uniqueBreaks = [...new Set(breakPoints)].sort((a, b) => a - b);
      
      // --- Render to image ---
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        width: srcWidth,
        height: srcHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      
      // A4 dimensions in points
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const MARGIN = 28;
      const FOOTER_HEIGHT = 20; // space for page numbers
      
      const printableWidth = A4_WIDTH - MARGIN * 2;
      const printableHeight = A4_HEIGHT - MARGIN * 2 - FOOTER_HEIGHT;
      
      // Scale factor: how the source pixels map to PDF points
      const scale = printableWidth / srcWidth;
      
      // --- Determine page breaks using row boundaries ---
      const pages: Array<{ srcTop: number; srcBottom: number }> = [];
      let currentPageTop = 0;
      
      for (let i = 1; i < uniqueBreaks.length; i++) {
        const breakY = uniqueBreaks[i];
        const pageContentHeight = (breakY - currentPageTop) * scale;
        
        if (pageContentHeight > printableHeight) {
          // This row would overflow: find the last break that fits
          let bestBreak = currentPageTop;
          for (let j = i - 1; j >= 0; j--) {
            if ((uniqueBreaks[j] - currentPageTop) * scale <= printableHeight && uniqueBreaks[j] > currentPageTop) {
              bestBreak = uniqueBreaks[j];
              break;
            }
          }
          
          // If no good break found (single row taller than page), force it
          if (bestBreak === currentPageTop) {
            bestBreak = breakY;
          }
          
          pages.push({ srcTop: currentPageTop, srcBottom: bestBreak });
          currentPageTop = bestBreak;
          i--; // Re-check this break point for the new page
        }
      }
      
      // Add the final page
      if (currentPageTop < srcHeight) {
        pages.push({ srcTop: currentPageTop, srcBottom: srcHeight });
      }
      
      const totalPages = pages.length;
      
      // --- Load image ---
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });
      
      const imgPixelWidth = img.naturalWidth;
      const imgPixelHeight = img.naturalHeight;
      // Pixel ratio: image pixels per source pixel
      const pxRatio = imgPixelHeight / srcHeight;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        if (pageIdx > 0) pdf.addPage();
        
        const { srcTop, srcBottom } = pages[pageIdx];
        const sliceSrcHeight = srcBottom - srcTop;
        
        // Crop from the full image
        const cropY = Math.floor(srcTop * pxRatio);
        const cropH = Math.min(Math.ceil(sliceSrcHeight * pxRatio), imgPixelHeight - cropY);
        
        const canvas = document.createElement('canvas');
        canvas.width = imgPixelWidth;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        ctx.drawImage(
          img,
          0, cropY,
          imgPixelWidth, cropH,
          0, 0,
          imgPixelWidth, cropH
        );
        
        const pageDataUrl = canvas.toDataURL('image/png');
        const slicePdfHeight = sliceSrcHeight * scale;
        
        pdf.addImage(
          pageDataUrl, 'PNG',
          MARGIN, MARGIN,
          printableWidth,
          Math.min(slicePdfHeight, printableHeight)
        );
        
        // --- Page number footer ---
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        const footerText = `Page ${pageIdx + 1} of ${totalPages}`;
        const textWidth = pdf.getTextWidth(footerText);
        pdf.text(footerText, (A4_WIDTH - textWidth) / 2, A4_HEIGHT - MARGIN + 4);
      }
      
      pdf.save(`${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.pdf`);
    } catch (err: any) {
      console.error('Failed to export PDF', err);
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
      element.style.overflow = originalOverflow;
      element.classList.remove('export-mode');
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
      day.isExamDay ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(e => e.map(cell => `"${cell}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToICS = () => {
    if (schedule.length === 0) return;
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Modular Timetable Generator//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    schedule.forEach((day, index) => {
      if (day.module) {
        // Simple full-day event
        const dtStart = format(day.date, 'yyyyMMdd');
        const dtEnd = format(addDays(day.date, 1), 'yyyyMMdd');
        const timestamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
        
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${dtStart}-${index}@timetable-generator.local`);
        icsContent.push(`DTSTAMP:${timestamp}`);
        icsContent.push(`DTSTART;VALUE=DATE:${dtStart}`);
        icsContent.push(`DTEND;VALUE=DATE:${dtEnd}`);
        icsContent.push(`SUMMARY:${day.module.name}`);
        if (day.module.instructor) {
          icsContent.push(`DESCRIPTION:Instructor: ${day.module.instructor}`);
        }
        if (day.isExamDay) {
          icsContent.push('CATEGORIES:EXAM');
          icsContent.push('PRIORITY:1');
        }
        icsContent.push('END:VEVENT');
      }
    });
    
    icsContent.push('END:VCALENDAR');
    
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.ics`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const data = {
      modules,
      timetableTitle,
      timetableSubtitle
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${timetableTitle.replace(/\s+/g, '_') || 'timetable'}_template.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.modules && Array.isArray(data.modules)) {
          setModules(data.modules.map((m: any) => ({ ...m, id: crypto.randomUUID() })));
          if (data.timetableTitle) setTimetableTitle(data.timetableTitle);
          if (data.timetableSubtitle) setTimetableSubtitle(data.timetableSubtitle);
        }
      } catch (err) {
        console.error('Failed to parse template file', err);
        alert('Invalid template file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <ModuleSidebar 
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            holidays={holidays} setHolidays={setHolidays}
            skipWeekends={skipWeekends} setSkipWeekends={setSkipWeekends}
            modules={modules}
            addModule={addModule}
            removeModule={removeModule}
            updateModule={updateModule}
            moveModule={moveModule}
            duplicateModule={duplicateModule}
            clearAllModules={clearAllModules}
            newModuleName={newModuleName} setNewModuleName={setNewModuleName}
            newModuleDays={newModuleDays} setNewModuleDays={setNewModuleDays}
            newModuleInstructor={newModuleInstructor} setNewModuleInstructor={setNewModuleInstructor}
            editingModuleId={editingModuleId} setEditingModuleId={setEditingModuleId}
            exportToJSON={exportToJSON}
            importFromJSON={importFromJSON}
            isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
            sheetUrl={sheetUrl} setSheetUrl={setSheetUrl}
            isSyncing={isSyncing} syncError={syncError} syncWithGoogleSheet={syncWithGoogleSheet}
          />
        </div>

        <div className="lg:col-span-8">
          <TimetablePreview 
            schedule={schedule}
            viewMode={viewMode} setViewMode={setViewMode}
            timetableTitle={timetableTitle} setTimetableTitle={setTimetableTitle}
            timetableSubtitle={timetableSubtitle} setTimetableSubtitle={setTimetableSubtitle}
            startDate={startDate} endDate={endDate}
            skipWeekends={skipWeekends}
            modules={modules}
            exportToPNG={exportToPNG}
            exportToPDF={exportToPDF}
            exportToCSV={exportToCSV}
            exportToICS={exportToICS}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
