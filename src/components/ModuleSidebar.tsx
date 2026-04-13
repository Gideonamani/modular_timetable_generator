import * as React from "react";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, Copy, RotateCcw, Moon, Sun, GripVertical, FileUp, FileDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  moveModule: (id: string, direction: 'up' | 'down') => void;
  reorderModules: (activeId: string, overId: string) => void;
  duplicateModule: (id: string) => void;
  clearAllModules: () => void;
  canUndo: boolean;
  undoLastDelete: () => void;
  newModuleName: string;
  setNewModuleName: (name: string) => void;
  newModuleDays: number | "";
  setNewModuleDays: (days: number | "") => void;
  newModuleInstructor: string;
  setNewModuleInstructor: (instructor: string) => void;
  newModuleColor: string;
  setNewModuleColor: (color: string) => void;
  formError: string;
  editingModuleId: string | null;
  setEditingModuleId: (id: string | null) => void;
  exportToJSON: () => void;
  importFromJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  isSyncing: boolean;
  syncError: string;
  syncWithGoogleSheet: () => void;
}

interface SortableModuleRowProps {
  module: Module;
  isEditing: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onUpdate: (updates: Partial<Module>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableModuleRow({ module, isEditing, onEdit, onDoneEdit, onUpdate, onDuplicate, onRemove }: SortableModuleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: isDragging ? 0.5 : 1, height: 'auto', marginBottom: 8 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {isEditing ? (
        <div className="flex flex-col gap-2 p-3 rounded-md border bg-neutral-50 dark:bg-neutral-900 shadow-sm w-full">
          <div className="space-y-1">
            <Label className="text-xs">Module Name</Label>
            <Input value={module.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Module Name" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Instructor</Label>
            <Input value={module.instructor || ''} onChange={(e) => onUpdate({ instructor: e.target.value })} placeholder="Instructor Name" className="h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Days</Label>
              <Input type="number" min="1" value={module.days} onChange={(e) => onUpdate({ days: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <input type="color" value={module.color} onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-8 w-10 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700 p-0.5 bg-white dark:bg-neutral-800" title="Pick a color" />
            </div>
          </div>
          <div className="flex justify-end mt-1">
            <Button size="sm" className="h-7 px-3 text-xs" onClick={onDoneEdit}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 rounded-md border bg-white dark:bg-neutral-800 shadow-sm group">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 shrink-0 touch-none"
              title="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: module.color }} />
            <div className="truncate">
              <p className="text-sm font-medium truncate dark:text-neutral-200">{module.name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {module.days} day{module.days !== 1 ? 's' : ''}{module.instructor ? ` • ${module.instructor}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-blue-500 shrink-0" onClick={onDuplicate} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-blue-500 shrink-0" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-500 shrink-0" onClick={onRemove} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ModuleSidebar({
  startDate, setStartDate,
  endDate, setEndDate,
  holidays, setHolidays,
  skipWeekends, setSkipWeekends,
  modules,
  addModule, removeModule, updateModule, moveModule, reorderModules, duplicateModule, clearAllModules, canUndo, undoLastDelete,
  newModuleName, setNewModuleName,
  newModuleDays, setNewModuleDays,
  newModuleInstructor, setNewModuleInstructor,
  newModuleColor, setNewModuleColor,
  formError,
  editingModuleId, setEditingModuleId,
  exportToJSON, importFromJSON,
  isDarkMode, setIsDarkMode,
  sheetUrl, setSheetUrl,
  isSyncing, syncError, syncWithGoogleSheet
}: ModuleSidebarProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [clearPending, setClearPending] = React.useState(false);
  const clearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClearClick = () => {
    if (clearPending) {
      // Second click within window — execute
      clearAllModules();
      setClearPending(false);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    } else {
      // First click — arm and auto-cancel after 2s
      setClearPending(true);
      clearTimerRef.current = setTimeout(() => setClearPending(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">Timetable Generator</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Plan your modules and export your schedule.</p>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={importInputRef}
            type="file"
            className="hidden"
            accept=".json"
            onChange={importFromJSON}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            title="Import Template (JSON)"
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={exportToJSON}
            className="rounded-full h-8 w-8"
            title="Save Template (JSON)"
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="rounded-full h-8 w-8 ml-1"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
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
          <CardTitle className="text-lg">Google Sheets Backend</CardTitle>
          <CardDescription>
            Sync modules directly from a published Google Sheet. Use columns: Name, Days, Instructor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sheet-url">Google Sheet URL</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="h-auto p-0 text-xs text-blue-500 font-normal">How to connect?</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Google Sheets Backend Guide</DialogTitle>
                    <DialogDescription>
                      Follow these steps to sync modules directly from a Google Sheet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">1. Create a Spreadsheet</h4>
                      <p className="text-sm text-neutral-500">Create a Google Sheet with the following columns (headers must match approximately):</p>
                      <ul className="text-sm list-disc pl-5 text-neutral-500 space-y-1">
                        <li><strong>Name</strong> (Required): Module/topic name.</li>
                        <li><strong>Days</strong> (Required): Number of days it takes.</li>
                        <li><strong>Instructor</strong> (Optional): Name of the instructor.</li>
                        <li><strong>Color</strong> (Optional): Hex code (e.g., #ff7f50) or color name.</li>
                      </ul>
                      <div className="border rounded-md overflow-hidden bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                        <table className="w-full text-left">
                          <thead className="bg-neutral-100 dark:bg-neutral-800 border-b">
                            <tr>
                              <th className="p-2 font-medium">Name</th>
                              <th className="p-2 font-medium">Days</th>
                              <th className="p-2 font-medium">Instructor</th>
                              <th className="p-2 font-medium">Color</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="p-2">Intro to React</td>
                              <td className="p-2">4</td>
                              <td className="p-2">John Doe</td>
                              <td className="p-2">#eb4034</td>
                            </tr>
                            <tr>
                              <td className="p-2">Advanced State</td>
                              <td className="p-2">2</td>
                              <td className="p-2">Jane Smith</td>
                              <td className="p-2">#4287f5</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">2. Make It Public</h4>
                      <p className="text-sm text-neutral-500">
                        The app needs read-only access. Click <strong>Share</strong> in the top right, change General Access to <strong>"Anyone with the link"</strong>, and copy the link.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">3. Sync</h4>
                      <p className="text-sm text-neutral-500">
                        Paste the copied URL here and click Sync. If you're on a specific tab, ensure the URL ends with <code>gid=...</code>.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex gap-2">
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                autoComplete="off"
              />
              <Button 
                onClick={syncWithGoogleSheet} 
                disabled={isSyncing || !sheetUrl.trim()}
                className="shrink-0"
              >
                {isSyncing ? "Syncing..." : "Sync"}
              </Button>
            </div>
            {syncError && (
              <p className="text-sm text-red-500 mt-1">{syncError}</p>
            )}
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
            <div className="flex gap-1">
              {canUndo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-neutral-500 hover:text-blue-500 hover:bg-blue-50"
                  onClick={undoLastDelete}
                  title="Undo last delete"
                >
                  Undo
                </Button>
              )}
              {modules.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 transition-colors",
                    clearPending
                      ? "text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700"
                      : "text-neutral-500 hover:text-red-500 hover:bg-red-50"
                  )}
                  onClick={handleClearClick}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  {clearPending ? 'Sure?' : 'Clear'}
                </Button>
              )}
            </div>
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
            <div className="flex gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="module-instructor">Instructor (Optional)</Label>
                <Input
                  id="module-instructor"
                  placeholder="e.g. John Doe"
                  value={newModuleInstructor}
                  onChange={(e) => setNewModuleInstructor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addModule()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-color">Color</Label>
                <div className="flex items-center gap-1.5 h-9">
                  <input
                    id="module-color"
                    type="color"
                    value={newModuleColor || '#818cf8'}
                    onChange={(e) => setNewModuleColor(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700 p-0.5 bg-white dark:bg-neutral-800"
                    title="Pick a color"
                  />
                  {newModuleColor && (
                    <button
                      onClick={() => setNewModuleColor('')}
                      className="text-xs text-neutral-400 hover:text-neutral-600"
                      title="Reset to auto"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-500 -mt-1">{formError}</p>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2 mt-4">
              {modules.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4 border border-dashed rounded-md">No modules added yet.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      reorderModules(String(active.id), String(over.id));
                    }
                  }}
                >
                  <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence initial={false}>
                      {modules.map((module) => (
                        <SortableModuleRow
                          key={module.id}
                          module={module}
                          isEditing={editingModuleId === module.id}
                          onEdit={() => setEditingModuleId(module.id)}
                          onDoneEdit={() => setEditingModuleId(null)}
                          onUpdate={(updates) => updateModule(module.id, updates)}
                          onDuplicate={() => duplicateModule(module.id)}
                          onRemove={() => removeModule(module.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
