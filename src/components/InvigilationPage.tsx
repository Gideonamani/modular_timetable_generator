import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  UserPlus, Trash2, AlertTriangle, Download, Users, ChevronDown,
  CalendarDays, Plus, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExamPeriod, Invigilator, SessionAssignment } from "../types";

// ─── Time slot presets ───────────────────────────────────────────────────────

const PRESET_SLOTS = {
  morning:   { label: 'Morning',   startTime: '08:00', duration: 120 },
  afternoon: { label: 'Afternoon', startTime: '13:00', duration: 120 },
  evening:   { label: 'Evening',   startTime: '16:00', duration: 120 },
} as const;

type PresetKey = keyof typeof PRESET_SLOTS;

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(s1: string, d1: number, s2: string, d2: number): boolean {
  const a = toMinutes(s1), b = a + d1;
  const c = toMinutes(s2), d = c + d2;
  return a < d && c < b;
}

function getEffectiveTime(a: SessionAssignment): { startTime: string; duration: number } | null {
  if (!a.timeSlot) return null;
  if (a.timeSlot === 'custom') {
    if (!a.startTime || !a.duration) return null;
    return { startTime: a.startTime, duration: a.duration };
  }
  return PRESET_SLOTS[a.timeSlot as PresetKey];
}

// ─── Conflict detection ───────────────────────────────────────────────────────

function findConflicts(
  sessions: { key: string; date: string; assignment: SessionAssignment }[],
): Set<string> {
  const conflicted = new Set<string>();

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.date !== b.date) continue;

      const aInvigs = new Set(
        [a.assignment.leadInvigilatorId, ...(a.assignment.additionalInvigilatorIds ?? [])].filter(Boolean)
      );
      const bInvigs = new Set(
        [b.assignment.leadInvigilatorId, ...(b.assignment.additionalInvigilatorIds ?? [])].filter(Boolean)
      );
      const shared = [...aInvigs].some(id => bInvigs.has(id as string));
      if (!shared) continue;

      const aTime = getEffectiveTime(a.assignment);
      const bTime = getEffectiveTime(b.assignment);

      if (!aTime || !bTime) {
        conflicted.add(a.key);
        conflicted.add(b.key);
      } else if (timesOverlap(aTime.startTime, aTime.duration, bTime.startTime, bTime.duration)) {
        conflicted.add(a.key);
        conflicted.add(b.key);
      }
    }
  }

  return conflicted;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(
  sessions: { key: string; date: string }[],
  assignments: Record<string, SessionAssignment>,
  invigilators: Invigilator[],
) {
  const invMap = Object.fromEntries(invigilators.map(i => [i.id, i.name]));
  const rows: string[][] = [
    ['Date', 'Day', 'Time Slot', 'Start Time', 'Duration (min)', 'Venue', 'Lead Invigilator', 'Additional Invigilators'],
  ];

  for (const { key, date } of sessions) {
    const a = assignments[key] ?? {};
    const preset = a.timeSlot && a.timeSlot !== 'custom' ? PRESET_SLOTS[a.timeSlot as PresetKey] : null;
    const slotLabel = a.timeSlot
      ? a.timeSlot === 'custom' ? 'Custom' : PRESET_SLOTS[a.timeSlot as PresetKey].label
      : '';
    const startTime = a.timeSlot === 'custom' ? (a.startTime ?? '') : (preset?.startTime ?? '');
    const duration = a.timeSlot === 'custom' ? String(a.duration ?? '') : (preset ? String(preset.duration) : '');
    const dateObj = parseISO(date);

    rows.push([
      format(dateObj, 'yyyy-MM-dd'),
      format(dateObj, 'EEEE'),
      slotLabel,
      startTime,
      duration,
      a.venue ?? '',
      a.leadInvigilatorId ? (invMap[a.leadInvigilatorId] ?? '') : '',
      (a.additionalInvigilatorIds ?? []).map(id => invMap[id] ?? '').filter(Boolean).join('; '),
    ]);
  }

  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invigilation-plan.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeSlotCell({
  assignment,
  onChange,
}: {
  assignment: SessionAssignment;
  onChange: (patch: Partial<SessionAssignment>) => void;
}) {
  return (
    <div className="space-y-1">
      <select
        value={assignment.timeSlot ?? ''}
        onChange={e => {
          const val = e.target.value;
          if (!val) onChange({ timeSlot: undefined, startTime: undefined, duration: undefined });
          else onChange({ timeSlot: val as SessionAssignment['timeSlot'] });
        }}
        className="h-7 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-neutral-200 px-2 w-full min-w-[120px]"
      >
        <option value="">— None —</option>
        <option value="morning">Morning (08:00)</option>
        <option value="afternoon">Afternoon (13:00)</option>
        <option value="evening">Evening (16:00)</option>
        <option value="custom">Custom…</option>
      </select>
      {assignment.timeSlot === 'custom' && (
        <div className="flex gap-1 items-center">
          <Input
            type="time"
            value={assignment.startTime ?? ''}
            onChange={e => onChange({ startTime: e.target.value })}
            className="h-6 text-xs w-[90px] px-1"
          />
          <Input
            type="number"
            placeholder="min"
            value={assignment.duration ?? ''}
            onChange={e => onChange({ duration: Number(e.target.value) || undefined })}
            className="h-6 text-xs w-[60px] px-1"
            min={30}
            step={30}
          />
        </div>
      )}
    </div>
  );
}

function AdditionalInvigilatorsCell({
  allInvigilators,
  selectedIds,
  leadId,
  isConflict,
  onChange,
}: {
  allInvigilators: Invigilator[];
  selectedIds: string[];
  leadId?: string;
  isConflict: boolean;
  onChange: (ids: string[]) => void;
}) {
  const available = allInvigilators.filter(i => i.id !== leadId);

  if (available.length === 0) {
    return <span className="text-xs text-neutral-400 dark:text-neutral-500 px-1">—</span>;
  }

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

  const selectedNames = selectedIds
    .map(id => allInvigilators.find(i => i.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-7 text-xs rounded-md border px-2 min-w-[100px] w-full text-left flex items-center justify-between gap-1 transition-colors",
            isConflict
              ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20 dark:text-neutral-200"
              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-neutral-200",
            "hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
          )}
        >
          <span className="truncate">
            {selectedNames.length > 0
              ? selectedNames.length === 1
                ? selectedNames[0]
                : `${selectedNames.length} selected`
              : <span className="text-neutral-400 dark:text-neutral-500">None</span>}
          </span>
          <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5 space-y-0.5" align="start">
        {available.map(inv => (
          <label
            key={inv.id}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(inv.id)}
              onChange={() => toggle(inv.id)}
              className="rounded border-neutral-300"
            />
            <div className="min-w-0">
              <span className="text-sm dark:text-neutral-200 truncate block">{inv.name}</span>
              {inv.role && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate block">{inv.role}</span>
              )}
            </div>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Exam Period Panel ────────────────────────────────────────────────────────

function ExamPeriodPanel({
  examPeriod,
  onSetPeriod,
  onToggleDay,
  onAddDay,
  onRemoveDay,
  onClear,
}: {
  examPeriod: ExamPeriod | null;
  onSetPeriod: (start: string, end: string) => void;
  onToggleDay: (date: string) => void;
  onAddDay: (date: string) => void;
  onRemoveDay: (date: string) => void;
  onClear: () => void;
}) {
  const [draftStart, setDraftStart] = React.useState(examPeriod?.startDate ?? '');
  const [draftEnd, setDraftEnd] = React.useState(examPeriod?.endDate ?? '');
  const [isEditing, setIsEditing] = React.useState(examPeriod === null);
  const [addDayValue, setAddDayValue] = React.useState('');
  const [showDays, setShowDays] = React.useState(false);
  const [dateError, setDateError] = React.useState('');

  const handleSetPeriod = () => {
    if (!draftStart || !draftEnd) {
      setDateError('Both dates are required');
      return;
    }
    if (draftStart > draftEnd) {
      setDateError('Start date must be before end date');
      return;
    }
    setDateError('');
    onSetPeriod(draftStart, draftEnd);
    setIsEditing(false);
    setShowDays(true);
  };

  const handleAddDay = () => {
    if (!addDayValue) return;
    onAddDay(addDayValue);
    setAddDayValue('');
  };

  const activeCount = examPeriod?.days.filter(d => d.included).length ?? 0;
  const totalCount = examPeriod?.days.length ?? 0;

  // Setup / edit form
  if (!examPeriod || isEditing) {
    return (
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-neutral-500" />
          <h3 className="font-semibold text-sm dark:text-neutral-100">
            {isEditing && examPeriod ? 'Edit Exam Period' : 'Set Up Exam Period'}
          </h3>
        </div>
        {!examPeriod && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Choose a start and end date to generate your exam days. This is independent of the module timetable.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Start Date</label>
            <Input
              type="date"
              value={draftStart}
              onChange={e => { setDraftStart(e.target.value); setDateError(''); }}
              className="h-8 text-sm w-auto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">End Date</label>
            <Input
              type="date"
              value={draftEnd}
              onChange={e => { setDraftEnd(e.target.value); setDateError(''); }}
              className="h-8 text-sm w-auto"
            />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Button size="sm" className="h-8" onClick={handleSetPeriod}>
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              {isEditing && examPeriod ? 'Update Period' : 'Generate Days'}
            </Button>
            {isEditing && examPeriod && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={() => { setIsEditing(false); setDateError(''); }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
        {dateError && <p className="text-xs text-red-500">{dateError}</p>}
      </div>
    );
  }

  // Info header + day list
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-3">
        <CalendarDays className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-semibold dark:text-neutral-100">Exam Period</span>
          <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
          <span className="text-neutral-600 dark:text-neutral-300">
            {format(parseISO(examPeriod.startDate), 'dd MMM yyyy')}
            {' – '}
            {format(parseISO(examPeriod.endDate), 'dd MMM yyyy')}
          </span>
          <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
          <span className="text-neutral-600 dark:text-neutral-300">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{activeCount}</span>
            {' '}active day{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowDays(v => !v)}
            className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Manage days
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showDays && "rotate-180")} />
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs dark:text-neutral-300 dark:hover:bg-neutral-800"
            onClick={() => {
              setDraftStart(examPeriod.startDate);
              setDraftEnd(examPeriod.endDate);
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-red-400"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>

      {showDays && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {activeCount} of {totalCount} days active
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={addDayValue}
                onChange={e => setAddDayValue(e.target.value)}
                className="h-7 text-xs w-auto"
                title="Add a custom exam day"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={handleAddDay}
                disabled={!addDayValue}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Day
              </Button>
            </div>
          </div>

          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
            {examPeriod.days.map(day => (
              <div
                key={day.date}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 group"
              >
                <input
                  type="checkbox"
                  checked={day.included}
                  onChange={() => onToggleDay(day.date)}
                  className="rounded border-neutral-300 dark:border-neutral-600 shrink-0"
                />
                <span className={cn(
                  "text-sm flex-1",
                  day.included
                    ? "text-neutral-800 dark:text-neutral-200"
                    : "text-neutral-400 dark:text-neutral-600 line-through"
                )}>
                  {format(parseISO(day.date), 'EEE, dd MMM yyyy')}
                </span>
                {!day.included && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">excluded</span>
                )}
                <button
                  onClick={() => onRemoveDay(day.date)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded"
                  title="Remove this day"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface InvigilationPageProps {
  examPeriod: ExamPeriod | null;
  onSetExamPeriodDates: (startDate: string, endDate: string) => void;
  onToggleDay: (date: string) => void;
  onAddDay: (date: string) => void;
  onRemoveDay: (date: string) => void;
  onClearExamPeriod: () => void;
  invigilators: Invigilator[];
  assignments: Record<string, SessionAssignment>;
  addInvigilator: (name: string, role?: string) => void;
  removeInvigilator: (id: string) => void;
  updateAssignment: (sessionKey: string, patch: Partial<SessionAssignment>) => void;
  isDarkMode: boolean;
}

export function InvigilationPage({
  examPeriod,
  onSetExamPeriodDates,
  onToggleDay,
  onAddDay,
  onRemoveDay,
  onClearExamPeriod,
  invigilators,
  assignments,
  addInvigilator,
  removeInvigilator,
  updateAssignment,
}: InvigilationPageProps) {
  const [newName, setNewName] = React.useState('');
  const [newRole, setNewRole] = React.useState('');
  const [nameError, setNameError] = React.useState('');

  // Derive exam sessions from the exam period (not from timetable schedule)
  const activeDays = React.useMemo(
    () => (examPeriod?.days ?? [])
      .filter(d => d.included)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [examPeriod]
  );

  const examSessions = React.useMemo(
    () => activeDays.map(day => ({ key: day.date, date: day.date })),
    [activeDays]
  );

  // Conflict detection
  const conflictKeys = React.useMemo(() => {
    const sessions = examSessions.map(({ key, date }) => ({
      key,
      date,
      assignment: assignments[key] ?? {},
    }));
    return findConflicts(sessions);
  }, [examSessions, assignments]);

  const configuredCount = examSessions.filter(({ key }) => {
    const a = assignments[key];
    return a?.leadInvigilatorId || a?.venue || a?.timeSlot;
  }).length;

  const handleAddInvigilator = () => {
    if (!newName.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    addInvigilator(newName.trim(), newRole.trim() || undefined);
    setNewName('');
    setNewRole('');
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold dark:text-neutral-100">Invigilation Plan</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {examPeriod ? (
                <>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{examSessions.length}</span>
                  {' '}exam day{examSessions.length !== 1 ? 's' : ''}
                  {' '}·{' '}
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{configuredCount}</span> configured
                </>
              ) : (
                'Set up an exam period to begin'
              )}
              {conflictKeys.size > 0 && (
                <span className="ml-2 text-red-500 font-medium">
                  · {conflictKeys.size} conflict{conflictKeys.size !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => exportCSV(examSessions, assignments, invigilators)}
            disabled={examSessions.length === 0}
            className="bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200 shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Exam period setup / info */}
      <ExamPeriodPanel
        examPeriod={examPeriod}
        onSetPeriod={onSetExamPeriodDates}
        onToggleDay={onToggleDay}
        onAddDay={onAddDay}
        onRemoveDay={onRemoveDay}
        onClear={onClearExamPeriod}
      />

      {/* Conflict banner */}
      {conflictKeys.size > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Scheduling conflicts detected</p>
            <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-0.5">
              {conflictKeys.size} session{conflictKeys.size !== 1 ? 's have' : ' has'} an invigilator double-booked at the same time. Highlighted rows need attention.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Invigilator roster ───────────────────────────────────────────── */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              <h3 className="font-semibold text-sm dark:text-neutral-100">Invigilators</h3>
              <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                {invigilators.length} registered
              </span>
            </div>

            {/* Add form */}
            <div className="space-y-2">
              <div>
                <Input
                  placeholder="Full name *"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNameError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddInvigilator()}
                  className={cn("h-8 text-sm", nameError && "border-red-400 focus-visible:ring-red-300")}
                />
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Role / department (optional)"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddInvigilator()}
                  className="h-8 text-sm flex-1"
                />
                <Button size="sm" className="h-8 shrink-0" onClick={handleAddInvigilator}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Add
                </Button>
              </div>
            </div>

            {/* List */}
            {invigilators.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">
                No invigilators added yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {invigilators.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate dark:text-neutral-200">{inv.name}</p>
                      {inv.role && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{inv.role}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeInvigilator(inv.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded"
                      title={`Remove ${inv.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Exam sessions table ──────────────────────────────────────────── */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {!examPeriod ? (
              <div className="p-12 text-center space-y-2">
                <CalendarDays className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">No exam period set</p>
                <p className="text-neutral-400 dark:text-neutral-500 text-sm">
                  Set up an exam period above to start assigning invigilators.
                </p>
              </div>
            ) : examSessions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">No active exam days</p>
                <p className="text-neutral-400 dark:text-neutral-500 text-sm">
                  Enable days in the Exam Period panel above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="text-left p-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Date</th>
                      <th className="text-left p-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Time Slot</th>
                      <th className="text-left p-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400">Venue</th>
                      <th className="text-left p-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Lead Invigilator</th>
                      <th className="text-left p-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400">Additional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examSessions.map(({ key, date }) => {
                      const a = assignments[key] ?? {};
                      const isConflict = conflictKeys.has(key);
                      const dateObj = parseISO(date);

                      return (
                        <tr
                          key={key}
                          className={cn(
                            "border-b border-neutral-100 dark:border-neutral-800/60 transition-colors",
                            isConflict
                              ? "bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/20"
                              : "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30"
                          )}
                        >
                          {/* Date */}
                          <td className="p-3 whitespace-nowrap align-top">
                            <div className="flex items-start gap-1.5">
                              {isConflict && (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                  {format(dateObj, 'dd MMM')}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {format(dateObj, 'EEE, yyyy')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Time slot */}
                          <td className="p-3 align-top">
                            <TimeSlotCell
                              assignment={a}
                              onChange={patch => updateAssignment(key, patch)}
                            />
                          </td>

                          {/* Venue */}
                          <td className="p-3 align-top">
                            <Input
                              placeholder="e.g. Hall A"
                              value={a.venue ?? ''}
                              onChange={e => updateAssignment(key, { venue: e.target.value })}
                              className="h-7 text-xs min-w-[100px]"
                            />
                          </td>

                          {/* Lead invigilator */}
                          <td className="p-3 align-top">
                            <select
                              value={a.leadInvigilatorId ?? ''}
                              onChange={e =>
                                updateAssignment(key, {
                                  leadInvigilatorId: e.target.value || undefined,
                                  additionalInvigilatorIds: (a.additionalInvigilatorIds ?? []).filter(
                                    id => id !== e.target.value
                                  ),
                                })
                              }
                              className={cn(
                                "h-7 text-xs rounded-md border bg-white dark:bg-neutral-800 dark:text-neutral-200 px-2 min-w-[130px] w-full",
                                isConflict
                                  ? "border-red-300 dark:border-red-700"
                                  : "border-neutral-200 dark:border-neutral-700"
                              )}
                            >
                              <option value="">— Select —</option>
                              {invigilators.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Additional invigilators */}
                          <td className="p-3 align-top">
                            <AdditionalInvigilatorsCell
                              allInvigilators={invigilators}
                              selectedIds={a.additionalInvigilatorIds ?? []}
                              leadId={a.leadInvigilatorId}
                              isConflict={isConflict}
                              onChange={ids => updateAssignment(key, { additionalInvigilatorIds: ids })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
