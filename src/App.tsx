import * as React from "react";
import { addDays } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import { Module, ViewMode } from "./types";
import { COLORS, DEFAULT_MODULES } from "./lib/constants";
import { generateSchedule } from "./lib/schedule-logic";
import { ModuleSidebar } from "./components/ModuleSidebar";
import { TimetablePreview } from "./components/TimetablePreview";

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
      isDarkMode
    };
    localStorage.setItem('timetable_data', JSON.stringify(data));
  }, [startDate, endDate, skipWeekends, holidays, viewMode, timetableTitle, timetableSubtitle, modules, isDarkMode]);

  const [newModuleName, setNewModuleName] = React.useState('');
  const [newModuleDays, setNewModuleDays] = React.useState<number | ''>(1);
  const [newModuleInstructor, setNewModuleInstructor] = React.useState('');
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);

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
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;
    
    const originalBg = element.style.backgroundColor;
    const originalPadding = element.style.padding;
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    
    try {
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        width, height,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      
      const pdfWidth = 595.28;
      const pdfHeight = (height * pdfWidth) / width;
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${timetableTitle.replace(/\s+/g, '_') || 'timetable'}.pdf`);
    } catch (err: any) {
      console.error('Failed to export PDF', err);
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-8 font-sans text-neutral-900 transition-colors duration-300">
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
            duplicateModule={duplicateModule}
            clearAllModules={clearAllModules}
            newModuleName={newModuleName} setNewModuleName={setNewModuleName}
            newModuleDays={newModuleDays} setNewModuleDays={setNewModuleDays}
            newModuleInstructor={newModuleInstructor} setNewModuleInstructor={setNewModuleInstructor}
            editingModuleId={editingModuleId} setEditingModuleId={setEditingModuleId}
          />
        </div>

        <div className="lg:col-span-8">
          <TimetablePreview 
            schedule={schedule}
            viewMode={viewMode} setViewMode={setViewMode}
            timetableTitle={timetableTitle} setTimetableTitle={setTimetableTitle}
            timetableSubtitle={timetableSubtitle} setTimetableSubtitle={setTimetableSubtitle}
            startDate={startDate} endDate={endDate}
            modules={modules}
            exportToPNG={exportToPNG}
            exportToPDF={exportToPDF}
            exportToCSV={exportToCSV}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
