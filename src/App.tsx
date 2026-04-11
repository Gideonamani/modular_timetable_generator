import * as React from "react";
import { format, addDays, isWeekend, differenceInDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Download, FileImage, FileText, GripVertical, LayoutList, LayoutGrid, Pencil } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type Module = {
  id: string;
  name: string;
  days: number;
  color: string;
  instructor?: string;
};

type DaySchedule = {
  date: Date;
  isWeekend: boolean;
  isHoliday?: boolean;
  module?: Module;
  isExamDay?: boolean;
};

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', 
  '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'
];

export default function App() {
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  const [endDate, setEndDate] = React.useState<Date>(addDays(new Date(), 14));
  const [skipWeekends, setSkipWeekends] = React.useState(true);
  const [holidays, setHolidays] = React.useState<Date[]>([]);
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  
  const [timetableTitle, setTimetableTitle] = React.useState('Modular Timetable');
  const [timetableSubtitle, setTimetableSubtitle] = React.useState('');
  
  const [modules, setModules] = React.useState<Module[]>([
    { id: '1', name: 'Introduction', days: 2, color: '#f87171' },
    { id: '2', name: 'Core Concepts', days: 5, color: '#fbbf24' },
    { id: '3', name: 'Advanced Topics', days: 3, color: '#34d399' },
  ]);

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
      id: Math.random().toString(36).substring(7), 
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

  const schedule = React.useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    
    const result: DaySchedule[] = [];
    let currentDate = startDate;
    let currentModuleIndex = 0;
    let currentModuleDaysLeft = modules.length > 0 ? modules[0].days : 0;

    const totalDays = differenceInDays(endDate, startDate) + 1;

    for (let i = 0; i < totalDays; i++) {
      const isWknd = isWeekend(currentDate);
      const isHoliday = holidays.some(h => isSameDay(h, currentDate));
      
      if ((skipWeekends && isWknd) || isHoliday) {
        result.push({ date: currentDate, isWeekend: isWknd, isHoliday });
      } else {
        if (currentModuleIndex < modules.length) {
          const isExam = currentModuleDaysLeft === 1;
          result.push({ date: currentDate, isWeekend: false, isHoliday: false, module: modules[currentModuleIndex], isExamDay: isExam });
          currentModuleDaysLeft--;

          if (currentModuleDaysLeft === 0) {
            currentModuleIndex++;
            if (currentModuleIndex < modules.length) {
              currentModuleDaysLeft = modules[currentModuleIndex].days;
            }
          }
        } else {
          result.push({ date: currentDate, isWeekend: false, isHoliday: false }); // Free day
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    return result;
  }, [startDate, endDate, modules, skipWeekends, holidays]);

  const exportToPNG = async () => {
    const element = document.getElementById('timetable-container');
    if (!element) return;
    
    // Add a temporary class to ensure background is white for export
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '24px';
    
    try {
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      
      if (!width || !height) throw new Error("Container has no dimensions");
      
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        width: width,
        height: height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      const link = document.createElement('a');
      link.download = 'timetable.png';
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
      
      if (!width || !height) throw new Error("Container has no dimensions");
      
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        width: width,
        height: height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      // Calculate dimensions in points (pt)
      // Standard A4 width is 595.28 pt
      const pdfWidth = 595.28;
      const pdfHeight = (height * pdfWidth) / width;
      
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('timetable.pdf');
    } catch (err: any) {
      console.error('Failed to export PDF', err);
      alert('Failed to export PDF: ' + (err.message || err));
    } finally {
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;
    }
  };

  const renderGridView = () => {
    if (schedule.length === 0) return <div className="p-8 text-center text-neutral-500">Start date must be before end date.</div>;

    const firstDay = schedule[0].date;
    const lastDay = schedule[schedule.length - 1].date;
    
    const start = startOfWeek(firstDay, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(lastDay, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({ start, end });

    return (
      <div className="p-6">
        <div className="grid grid-cols-7 gap-px bg-neutral-200 border border-neutral-200 rounded-lg overflow-hidden">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="bg-neutral-50 p-2 text-center text-sm font-semibold text-neutral-700">
              {day}
            </div>
          ))}
          {calendarDays.map((date, i) => {
            const scheduleDay = schedule.find(s => isSameDay(s.date, date));
            const isOutOfRange = !scheduleDay;
            
            return (
              <div key={i} className={cn(
                "min-h-[100px] bg-white p-2 flex flex-col gap-1",
                isOutOfRange && "bg-neutral-50/50 text-neutral-400",
                scheduleDay?.isWeekend && "bg-neutral-50",
                scheduleDay?.isHoliday && "bg-red-50/30"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-sm font-medium",
                    isOutOfRange ? "text-neutral-400" : "text-neutral-700",
                    scheduleDay?.isHoliday && "text-red-600"
                  )}>
                    {format(date, 'd')}
                  </span>
                  {scheduleDay?.isHoliday && (
                    <span className="text-[10px] font-bold uppercase text-red-500 bg-red-100 px-1.5 py-0.5 rounded-sm">Holiday</span>
                  )}
                </div>
                
                {scheduleDay?.module && (
                  <div 
                    className="mt-1 text-xs p-1.5 rounded-md font-medium truncate border flex flex-col gap-0.5"
                    style={{ 
                      backgroundColor: `${scheduleDay.module.color}15`,
                      borderColor: `${scheduleDay.module.color}30`,
                      color: '#171717'
                    }}
                    title={scheduleDay.module.name}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: scheduleDay.module.color }} />
                      <span className="truncate">{scheduleDay.module.name}</span>
                    </div>
                    {scheduleDay.module.instructor && (
                      <span className="text-[10px] text-neutral-600 truncate ml-3">{scheduleDay.module.instructor}</span>
                    )}
                    {scheduleDay.isExamDay && (
                      <span className="text-[10px] font-bold text-red-600 ml-3 uppercase">Exam Day</span>
                    )}
                  </div>
                )}
                
                {!isOutOfRange && !scheduleDay?.module && !scheduleDay?.isWeekend && !scheduleDay?.isHoliday && (
                  <div className="mt-1 text-xs p-1.5 text-neutral-400 italic">
                    Free
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-950">Timetable Generator</h1>
            <p className="text-neutral-500 mt-1">Plan your modules and export your schedule.</p>
          </div>

          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      />
                    }>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      />
                    }>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Holidays / Special Days</Label>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        holidays.length === 0 && "text-muted-foreground"
                      )}
                    />
                  }>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {holidays.length > 0 ? `${holidays.length} day(s) selected` : <span>Pick holidays</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="multiple"
                      selected={holidays}
                      onSelect={(dates) => setHolidays(dates as Date[])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {holidays.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {holidays.map((h, i) => (
                      <span key={i} className="inline-flex items-center text-xs bg-neutral-100 border px-2 py-1 rounded-md">
                        {format(h, 'MMM d')}
                        <button 
                          onClick={() => setHolidays(holidays.filter(d => !isSameDay(d, h)))}
                          className="ml-1 text-neutral-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Skip Weekends</Label>
                  <p className="text-xs text-neutral-500">Don't assign modules on Sat/Sun</p>
                </div>
                <Switch 
                  checked={skipWeekends} 
                  onCheckedChange={setSkipWeekends} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Modules</CardTitle>
              <CardDescription>Add the blocks of work to schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="module-name">Name</Label>
                    <Input 
                      id="module-name" 
                      placeholder="e.g. Design Phase" 
                      value={newModuleName}
                      onChange={(e) => setNewModuleName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addModule()}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="module-instructor">Instructor</Label>
                    <Input 
                      id="module-instructor" 
                      placeholder="e.g. John Doe" 
                      value={newModuleInstructor}
                      onChange={(e) => setNewModuleInstructor(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addModule()}
                    />
                  </div>
                  <div className="space-y-2 w-20">
                    <Label htmlFor="module-days">Days</Label>
                    <Input 
                      id="module-days" 
                      type="number" 
                      min="1"
                      value={newModuleDays}
                      onChange={(e) => setNewModuleDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && addModule()}
                    />
                  </div>
                  <Button onClick={addModule} size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2 mt-4">
                  {modules.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4 border border-dashed rounded-md">No modules added yet.</p>
                  ) : (
                    modules.map((module) => (
                      editingModuleId === module.id ? (
                        <div key={module.id} className="flex flex-col gap-2 p-3 rounded-md border bg-neutral-50 shadow-sm w-full">
                          <div className="space-y-1">
                            <Label className="text-xs">Module Name</Label>
                            <Input
                              value={module.name}
                              onChange={(e) => updateModule(module.id, { name: e.target.value })}
                              placeholder="Module Name"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Instructor (Optional)</Label>
                            <Input
                              value={module.instructor || ''}
                              onChange={(e) => updateModule(module.id, { instructor: e.target.value })}
                              placeholder="Instructor Name"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Days</Label>
                            <Input
                              type="number"
                              min="1"
                              value={module.days}
                              onChange={(e) => updateModule(module.id, { days: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-end mt-1">
                            <Button size="sm" onClick={() => setEditingModuleId(null)}>Done</Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          key={module.id} 
                          className="flex items-center justify-between p-2 rounded-md border bg-white shadow-sm group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: module.color }}
                            />
                            <div className="truncate">
                              <p className="text-sm font-medium truncate">{module.name}</p>
                              <p className="text-xs text-neutral-500">
                                {module.days} day{module.days !== 1 ? 's' : ''}
                                {module.instructor ? ` • ${module.instructor}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-neutral-400 hover:text-blue-500 shrink-0"
                              onClick={() => setEditingModuleId(module.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-neutral-400 hover:text-red-500 shrink-0"
                              onClick={() => removeModule(module.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Timetable View */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Preview</h2>
              <p className="text-sm text-neutral-500">
                {schedule.length} total days &bull; {schedule.filter(s => !s.isWeekend && !s.isHoliday).length} working days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md p-1 bg-neutral-50 mr-2">
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-4 w-4 mr-1.5" />
                  List
                </Button>
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Grid
                </Button>
              </div>
              <Button variant="outline" onClick={exportToPNG} className="bg-white">
                <FileImage className="mr-2 h-4 w-4" />
                PNG
              </Button>
              <Button onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          <Card className="border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div id="timetable-container" className="min-w-[600px] bg-white">
                <div className="p-6 border-b border-neutral-100">
                  <input
                    type="text"
                    value={timetableTitle}
                    onChange={(e) => setTimetableTitle(e.target.value)}
                    className="text-2xl font-bold text-neutral-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
                    placeholder="Timetable Title"
                  />
                  <div className="flex flex-col gap-1 mt-1">
                    <input
                      type="text"
                      value={timetableSubtitle}
                      onChange={(e) => setTimetableSubtitle(e.target.value)}
                      className="text-neutral-500 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
                      placeholder="Add a subtitle (optional)"
                    />
                    <p className="text-neutral-400 text-sm px-1">
                      {format(startDate, "MMMM d, yyyy")} - {format(endDate, "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                {viewMode === 'list' ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50">
                        <TableHead className="w-[120px] font-semibold">Date</TableHead>
                        <TableHead className="w-[100px] font-semibold">Day</TableHead>
                        <TableHead className="font-semibold">Module / Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-neutral-500">
                            Start date must be before end date.
                          </TableCell>
                        </TableRow>
                      ) : (
                        schedule.map((day, i) => (
                          <TableRow 
                            key={i} 
                            className={cn(
                              day.isWeekend && "bg-neutral-50/80 text-neutral-400 hover:bg-neutral-50/80",
                              day.isHoliday && "bg-red-50/50 text-red-600 hover:bg-red-50/50",
                              !day.isWeekend && !day.isHoliday && !day.module && "bg-orange-50/30 text-orange-600 hover:bg-orange-50/30"
                            )}
                          >
                            <TableCell className={cn("font-medium", (day.isWeekend || day.isHoliday) && "font-normal")}>
                              {format(day.date, "MMM d")}
                            </TableCell>
                            <TableCell>{format(day.date, "EEEE")}</TableCell>
                            <TableCell>
                              {day.isHoliday ? (
                                <span className="font-medium text-red-500">Holiday / Special Day</span>
                              ) : day.isWeekend ? (
                                <span className="italic text-neutral-400">Weekend</span>
                              ) : day.module ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                                      style={{ backgroundColor: day.module.color }}
                                    />
                                    <span className="font-medium text-neutral-700">{day.module.name}</span>
                                    {day.isExamDay && (
                                      <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm ml-2">
                                        Exam Day
                                      </span>
                                    )}
                                  </div>
                                  {day.module.instructor && (
                                    <span className="text-xs text-neutral-500 ml-[18px]">
                                      Instructor: {day.module.instructor}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="italic">Free / Unscheduled</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  renderGridView()
                )}
                
                {/* Legend for export */}
                {modules.length > 0 && (
                  <div className="p-6 border-t border-neutral-100 bg-neutral-50/30">
                    <h4 className="text-sm font-semibold text-neutral-700 mb-3">Module Legend</h4>
                    <div className="flex flex-wrap gap-4">
                      {modules.map(m => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-sm text-neutral-600">{m.name} ({m.days} days)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

