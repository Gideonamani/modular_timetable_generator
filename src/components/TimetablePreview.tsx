import * as React from "react";
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { FileImage, FileText, LayoutList, LayoutGrid, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Module, DaySchedule, ViewMode } from "../types";
import { WEEKDAYS } from "../lib/constants";

interface TimetablePreviewProps {
  schedule: DaySchedule[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  timetableTitle: string;
  setTimetableTitle: (title: string) => void;
  timetableSubtitle: string;
  setTimetableSubtitle: (subtitle: string) => void;
  startDate: Date;
  endDate: Date;
  modules: Module[];
  exportToPNG: () => void;
  exportToPDF: () => void;
  exportToCSV: () => void;
  isDarkMode: boolean;
}

export function TimetablePreview({
  schedule, viewMode, setViewMode,
  timetableTitle, setTimetableTitle,
  timetableSubtitle, setTimetableSubtitle,
  startDate, endDate,
  modules,
  exportToPNG, exportToPDF, exportToCSV,
  isDarkMode
}: TimetablePreviewProps) {
  
  const renderGridView = () => {
    if (schedule.length === 0) return <div className="p-8 text-center text-neutral-500">Start date must be before end date.</div>;

    const firstDay = schedule[0].date;
    const lastDay = schedule[schedule.length - 1].date;
    
    const start = startOfWeek(firstDay, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(lastDay, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({ start, end });

    return (
      <div className="p-6">
        <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          {WEEKDAYS.map(day => (
            <div key={day} className="bg-neutral-50 dark:bg-neutral-900 p-2 text-center text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {day}
            </div>
          ))}
          {calendarDays.map((date, i) => {
            const scheduleDay = schedule.find(s => isSameDay(s.date, date));
            const isOutOfRange = !scheduleDay;
            
            return (
              <div key={i} className={cn(
                "min-h-[100px] bg-white dark:bg-neutral-900 p-2 flex flex-col gap-1",
                isOutOfRange && "bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-400",
                scheduleDay?.isWeekend && "bg-neutral-50 dark:bg-neutral-800/50",
                scheduleDay?.isHoliday && "bg-red-50/30 dark:bg-red-950/20"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-sm font-medium",
                    isOutOfRange ? "text-neutral-400" : "text-neutral-700 dark:text-neutral-300",
                    scheduleDay?.isHoliday && "text-red-600"
                  )}>
                    {format(date, 'd')}
                  </span>
                  {scheduleDay?.isHoliday && (
                    <span className="text-[10px] font-bold uppercase text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-sm">Holiday</span>
                  )}
                </div>
                
                {scheduleDay?.module && (
                  <div 
                    className="mt-1 text-xs p-1.5 rounded-md font-medium truncate border flex flex-col gap-0.5"
                    style={{ 
                      backgroundColor: `${scheduleDay.module.color}15`,
                      borderColor: `${scheduleDay.module.color}30`,
                      color: isDarkMode ? '#e5e5e5' : '#171717'
                    }}
                    title={scheduleDay.module.name}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: scheduleDay.module.color }} />
                      <span className="truncate">{scheduleDay.module.name}</span>
                    </div>
                    {scheduleDay.module.instructor && (
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 truncate ml-3">{scheduleDay.module.instructor}</span>
                    )}
                    {scheduleDay.isExamDay && (
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 ml-3 uppercase">Exam Day</span>
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors">
        <div>
          <h2 className="text-lg font-semibold dark:text-neutral-100">Preview</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {schedule.length} total days &bull; {schedule.filter(s => !s.isWeekend && !s.isHoliday).length} working days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border dark:border-neutral-700 rounded-md p-1 bg-neutral-50 dark:bg-neutral-800 mr-2">
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
          <Button variant="outline" onClick={exportToPNG} className="bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
            <FileImage className="mr-2 h-4 w-4" />
            PNG
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportToPDF} className="bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden bg-white dark:bg-neutral-900 transition-colors">
        <div className="overflow-x-auto">
          <div id="timetable-container" className="min-w-[600px] bg-white dark:bg-neutral-900 transition-colors">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <input
                type="text"
                value={timetableTitle}
                onChange={(e) => setTimetableTitle(e.target.value)}
                className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
                placeholder="Timetable Title"
              />
              <div className="flex flex-col gap-1 mt-1">
                <input
                  type="text"
                  value={timetableSubtitle}
                  onChange={(e) => setTimetableSubtitle(e.target.value)}
                  className="text-neutral-500 dark:text-neutral-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
                  placeholder="Add a subtitle (optional)"
                />
                <p className="text-neutral-400 dark:text-neutral-500 text-sm px-1">
                  {format(startDate, "MMMM d, yyyy")} - {format(endDate, "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            {viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50/50 dark:bg-neutral-800/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800">
                    <TableHead className="w-[120px] font-semibold dark:text-neutral-200">Date</TableHead>
                    <TableHead className="w-[100px] font-semibold dark:text-neutral-200">Day</TableHead>
                    <TableHead className="font-semibold dark:text-neutral-200">Module / Activity</TableHead>
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
                          "border-neutral-50 dark:border-neutral-800",
                          day.isWeekend && "bg-neutral-50/80 dark:bg-neutral-900/80 text-neutral-400 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/80",
                          day.isHoliday && "bg-red-50/50 dark:bg-red-950/20 text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20",
                          !day.isWeekend && !day.isHoliday && !day.module && "bg-orange-50/30 dark:bg-orange-950/10 text-orange-600 hover:bg-orange-50/30 dark:hover:bg-orange-950/10"
                        )}
                      >
                        <TableCell className={cn("font-medium dark:text-neutral-300", (day.isWeekend || day.isHoliday) && "font-normal")}>
                          {format(day.date, "MMM d")}
                        </TableCell>
                        <TableCell className="dark:text-neutral-400">{format(day.date, "EEEE")}</TableCell>
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
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">{day.module.name}</span>
                                {day.isExamDay && (
                                  <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-sm ml-2">
                                    Exam Day
                                  </span>
                                )}
                              </div>
                              {day.module.instructor && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-[18px]">
                                  Instructor: {day.module.instructor}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="italic text-neutral-500 px-0.5">Free / Unscheduled</span>
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
              <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/30 transition-colors">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Module Legend</h4>
                <div className="flex flex-wrap gap-4">
                  {modules.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{m.name} ({m.days} days)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
