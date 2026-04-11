import * as React from "react";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, Copy, RotateCcw, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Module } from "../types";

interface ModuleSidebarProps {
  startDate: Date;
  setStartDate: (date: Date) => void;
  endDate: Date;
  setEndDate: (date: Date) => void;
  holidays: Date[];
  setHolidays: (dates: Date[]) => void;
  skipWeekends: boolean;
  setSkipWeekends: (skip: boolean) => void;
  modules: Module[];
  addModule: () => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, updates: Partial<Module>) => void;
  duplicateModule: (id: string) => void;
  clearAllModules: () => void;
  newModuleName: string;
  setNewModuleName: (name: string) => void;
  newModuleDays: number | "";
  setNewModuleDays: (days: number | "") => void;
  newModuleInstructor: string;
  setNewModuleInstructor: (instructor: string) => void;
  editingModuleId: string | null;
  setEditingModuleId: (id: string | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export function ModuleSidebar({
  startDate, setStartDate,
  endDate, setEndDate,
  holidays, setHolidays,
  skipWeekends, setSkipWeekends,
  modules,
  addModule, removeModule, updateModule, duplicateModule, clearAllModules,
  newModuleName, setNewModuleName,
  newModuleDays, setNewModuleDays,
  newModuleInstructor, setNewModuleInstructor,
  editingModuleId, setEditingModuleId,
  isDarkMode, setIsDarkMode
}: ModuleSidebarProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">Timetable Generator</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Plan your modules and export your schedule.</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="rounded-full"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
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
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
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
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
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
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    holidays.length === 0 && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {holidays.length > 0 ? `${holidays.length} day(s) selected` : <span>Pick holidays</span>}
                </Button>
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Modules</CardTitle>
              <CardDescription>Add the blocks of work to schedule.</CardDescription>
            </div>
            {modules.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-neutral-500 hover:text-red-500 hover:bg-red-50"
                onClick={clearAllModules}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label htmlFor="module-name">Name</Label>
                <Input 
                  id="module-name" 
                  placeholder="e.g. Design" 
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
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
            <div className="space-y-2">
              <Label htmlFor="module-instructor">Instructor (Optional)</Label>
              <Input 
                id="module-instructor" 
                placeholder="e.g. John Doe" 
                value={newModuleInstructor}
                onChange={(e) => setNewModuleInstructor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addModule()}
              />
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2 mt-4">
              {modules.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4 border border-dashed rounded-md">No modules added yet.</p>
              ) : (
                <AnimatePresence initial={false}>
                  {modules.map((module) => (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {editingModuleId === module.id ? (
                        <div className="flex flex-col gap-2 p-3 rounded-md border bg-neutral-50 dark:bg-neutral-900 shadow-sm w-full">
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
                            <Label className="text-xs">Instructor</Label>
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
                            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => setEditingModuleId(null)}>Done</Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center justify-between p-2 rounded-md border bg-white dark:bg-neutral-800 shadow-sm group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: module.color }}
                            />
                            <div className="truncate">
                              <p className="text-sm font-medium truncate dark:text-neutral-200">{module.name}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                              onClick={() => duplicateModule(module.id)}
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-neutral-400 hover:text-blue-500 shrink-0"
                              onClick={() => setEditingModuleId(module.id)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-neutral-400 hover:text-red-500 shrink-0"
                              onClick={() => removeModule(module.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
