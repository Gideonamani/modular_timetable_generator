import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { DaySchedule, Module } from '../types';
import { ViewMode } from '../types';

export interface TimetablePDFProps {
  schedule: DaySchedule[];
  timetableTitle: string;
  timetableSubtitle: string;
  startDate: Date;
  endDate: Date;
  modules: Module[];
  viewMode: ViewMode;
  skipWeekends: boolean;
}

const MARGIN = 28;
const COL_DATE = 68;
const COL_DAY  = 58;
const GAP_GREY = '#e5e7eb';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#171717',
    paddingTop: MARGIN,
    paddingBottom: MARGIN + 20,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
  },

  // ── Footer (fixed every page) ───────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: MARGIN - 4,
    left: MARGIN,
    right: MARGIN,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: { marginBottom: 14 },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: '#4b5563',
    marginBottom: 3,
  },
  dateRange: {
    fontSize: 9,
    color: '#9ca3af',
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  // ── Table header ────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  thCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },

  // ── Data rows ───────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 22,
  },
  rowWeekend: { backgroundColor: '#f9fafb' },
  rowHoliday: { backgroundColor: '#fef2f2' },
  rowFree:    { backgroundColor: '#fffbeb' },
  rowGap:     { backgroundColor: '#f9fafb' },

  // ── Column widths ───────────────────────────────────────────────────────
  colDate:   { width: COL_DATE },
  colDay:    { width: COL_DAY },
  colModule: { flex: 1 },

  // ── Cell text variants ──────────────────────────────────────────────────
  cellText:         { fontSize: 9 },
  cellMuted:        { fontSize: 9, color: '#9ca3af' },
  cellWeekend:      { fontSize: 9, color: '#9ca3af', fontFamily: 'Helvetica-Oblique' },
  cellHoliday:      { fontSize: 9, color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  cellFree:         { fontSize: 9, color: '#d97706', fontFamily: 'Helvetica-Oblique' },
  cellGapName:      { fontSize: 9, color: '#9ca3af', fontFamily: 'Helvetica-Oblique' },
  cellModuleName:   { fontSize: 9, color: '#374151', fontFamily: 'Helvetica-Bold' },

  // ── Module / gap cell internals ─────────────────────────────────────────
  moduleLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGap: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: GAP_GREY,
  },
  instructor: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    marginLeft: 14,
  },

  // ── Badges ──────────────────────────────────────────────────────────────
  examBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
    alignSelf: 'center',
  },
  examBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  practicalBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
    alignSelf: 'center',
  },
  practicalBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
  },
  gridPracticalText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
    marginTop: 1,
  },
  gapBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
    alignSelf: 'center',
  },
  gapBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
  },

  // ── Legend ───────────────────────────────────────────────────────────────
  legendSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendDotGap: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: GAP_GREY,
  },
  legendText:    { fontSize: 8, color: '#6b7280' },
  legendTextGap: { fontSize: 8, color: '#9ca3af', fontFamily: 'Helvetica-Oblique' },

  // ── Grid / calendar view ─────────────────────────────────────────────────
  gridDayHeaderRow: {
    flexDirection: 'row',
  },
  gridDayHeader: {
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  gridDayHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textAlign: 'center',
  },
  gridWeekRow: {
    flexDirection: 'row',
  },
  gridCell: {
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    minHeight: 56,
    paddingHorizontal: 3,
    paddingVertical: 3,
    backgroundColor: '#ffffff',
  },
  gridCellOOR: {
    backgroundColor: '#f9fafb',
  },
  gridCellHoliday: {
    backgroundColor: '#fef2f2',
  },
  gridCellWeekend: {
    backgroundColor: '#f9fafb',
  },
  gridDateNum: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 3,
  },
  gridDateNumMuted: {
    fontSize: 9,
    color: '#d1d5db',
    marginBottom: 3,
  },
  gridDateNumHoliday: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 3,
  },
  gridHolidayBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  gridHolidayBadgeText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  gridModuleBlock: {
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginTop: 1,
  },
  gridModuleBlockGap: {
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginTop: 1,
  },
  gridModuleName: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  gridModuleNameGap: {
    fontSize: 7,
    color: '#9ca3af',
    fontFamily: 'Helvetica-Oblique',
  },
  gridExamText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginTop: 1,
  },
  gridInstructor: {
    fontSize: 6,
    color: '#6b7280',
    marginTop: 1,
  },
});

// ── Row renderers ────────────────────────────────────────────────────────────

function WeekendRow({ day }: { day: DaySchedule }) {
  return (
    <View style={[s.row, s.rowWeekend]} wrap={false}>
      <Text style={[s.cellMuted, s.colDate]}>{format(day.date, 'MMM d')}</Text>
      <Text style={[s.cellMuted, s.colDay]}>{format(day.date, 'EEE')}</Text>
      <Text style={[s.cellWeekend, s.colModule]}>Weekend</Text>
    </View>
  );
}

function HolidayRow({ day }: { day: DaySchedule }) {
  return (
    <View style={[s.row, s.rowHoliday]} wrap={false}>
      <Text style={[s.cellHoliday, s.colDate]}>{format(day.date, 'MMM d')}</Text>
      <Text style={[s.cellHoliday, s.colDay]}>{format(day.date, 'EEE')}</Text>
      <Text style={[s.cellHoliday, s.colModule]}>Holiday / Special Day</Text>
    </View>
  );
}

function FreeRow({ day }: { day: DaySchedule }) {
  return (
    <View style={[s.row, s.rowFree]} wrap={false}>
      <Text style={[s.cellText, s.colDate]}>{format(day.date, 'MMM d')}</Text>
      <Text style={[s.cellMuted, s.colDay]}>{format(day.date, 'EEE')}</Text>
      <Text style={[s.cellFree, s.colModule]}>Free / Unscheduled</Text>
    </View>
  );
}

function ModuleRow({ day }: { day: DaySchedule }) {
  const mod = day.module!;
  const isGap = mod.type === 'gap';

  return (
    <View style={[s.row, isGap ? s.rowGap : {}]} wrap={false}>
      <Text style={[s.cellText, s.colDate]}>{format(day.date, 'MMM d')}</Text>
      <Text style={[s.cellMuted, s.colDay]}>{format(day.date, 'EEE')}</Text>
      <View style={s.colModule}>
        <View style={s.moduleLineRow}>
          {isGap ? (
            <View style={s.dotGap} />
          ) : (
            <View style={[s.dot, { backgroundColor: mod.color }]} />
          )}
          <Text style={isGap ? s.cellGapName : s.cellModuleName}>
            {mod.name || 'Gap'}
          </Text>
          {isGap && (
            <View style={s.gapBadge}>
              <Text style={s.gapBadgeText}>GAP</Text>
            </View>
          )}
          {day.isExamDay && (
            <View style={s.examBadge}>
              <Text style={s.examBadgeText}>EXAM DAY</Text>
            </View>
          )}
          {day.isPracticalDay && (
            <View style={s.practicalBadge}>
              <Text style={s.practicalBadgeText}>PRACTICAL</Text>
            </View>
          )}
        </View>
        {mod.instructor ? (
          <Text style={s.instructor}>{mod.instructor}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Grid / calendar view ─────────────────────────────────────────────────────

const PRINTABLE_WIDTH = 539.28; // A4 width minus 2 × 28pt margins
const WEEKDAY_NAMES_5 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKDAY_NAMES_7 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function GridCell({ date, scheduleDay, cellWidth }: {
  date: Date;
  scheduleDay: DaySchedule | undefined;
  cellWidth: number;
}) {
  const isOOR     = !scheduleDay;
  const isHoliday = scheduleDay?.isHoliday;
  const isWeekend = scheduleDay?.isWeekend;
  const mod       = scheduleDay?.module;
  const isGap     = mod?.type === 'gap';

  const cellBg = isOOR
    ? s.gridCellOOR
    : isHoliday
    ? s.gridCellHoliday
    : isWeekend
    ? s.gridCellWeekend
    : {};

  const dateStyle = isOOR
    ? s.gridDateNumMuted
    : isHoliday
    ? s.gridDateNumHoliday
    : s.gridDateNum;

  return (
    <View style={[s.gridCell, cellBg, { width: cellWidth }]}>
      <Text style={dateStyle}>{format(date, 'MMM d')}</Text>

      {isHoliday && (
        <View style={s.gridHolidayBadge}>
          <Text style={s.gridHolidayBadgeText}>HOLIDAY</Text>
        </View>
      )}

      {mod && (
        isGap ? (
          <View style={s.gridModuleBlockGap}>
            <Text style={s.gridModuleNameGap}>{mod.name || 'Gap'}</Text>
          </View>
        ) : (
          <View style={[s.gridModuleBlock, {
            backgroundColor: `${mod.color}20`,
          }]}>
            <Text style={[s.gridModuleName, { color: '#374151' }]}>
              {mod.name}
            </Text>
            {scheduleDay?.isExamDay && (
              <Text style={s.gridExamText}>EXAM</Text>
            )}
            {scheduleDay?.isPracticalDay && (
              <Text style={s.gridPracticalText}>PRACTICAL</Text>
            )}
            {mod.instructor ? (
              <Text style={s.gridInstructor}>{mod.instructor}</Text>
            ) : null}
          </View>
        )
      )}
    </View>
  );
}

function GridView({ schedule, skipWeekends }: { schedule: DaySchedule[]; skipWeekends: boolean }) {
  if (schedule.length === 0) return null;

  const cols      = skipWeekends ? 5 : 7;
  const dayNames  = skipWeekends ? WEEKDAY_NAMES_5 : WEEKDAY_NAMES_7;
  const cellWidth = PRINTABLE_WIDTH / cols;

  const firstDay = schedule[0].date;
  const lastDay  = schedule[schedule.length - 1].date;
  const start    = startOfWeek(firstDay, { weekStartsOn: 1 });
  const end      = endOfWeek(lastDay,   { weekStartsOn: 1 });

  let calendarDays = eachDayOfInterval({ start, end });
  if (skipWeekends) {
    calendarDays = calendarDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  }

  // Group into week rows
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += cols) {
    weeks.push(calendarDays.slice(i, i + cols));
  }

  return (
    <View>
      {/* Day-name header row — fixed so it repeats on each page */}
      <View style={s.gridDayHeaderRow} fixed>
        {dayNames.map(d => (
          <View key={d} style={[s.gridDayHeader, { width: cellWidth }]}>
            <Text style={s.gridDayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <View key={wi} style={s.gridWeekRow} wrap={false}>
          {week.map((date, di) => {
            const scheduleDay = schedule.find(sd => isSameDay(sd.date, date));
            return (
              <GridCell key={di} date={date} scheduleDay={scheduleDay} cellWidth={cellWidth} />
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main document ────────────────────────────────────────────────────────────

export function TimetablePDF({
  schedule,
  timetableTitle,
  timetableSubtitle,
  startDate,
  endDate,
  modules,
  viewMode,
  skipWeekends,
}: TimetablePDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Page-number footer — fixed so it repeats on every page */}
        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>{timetableTitle || 'Timetable'}</Text>
          {timetableSubtitle ? (
            <Text style={s.subtitle}>{timetableSubtitle}</Text>
          ) : null}
          <Text style={s.dateRange}>
            {format(startDate, 'MMMM d, yyyy')} – {format(endDate, 'MMMM d, yyyy')}
          </Text>
          <View style={s.divider} />
        </View>

        {/* ── Body: list or grid depending on active view ── */}
        {viewMode === 'grid' ? (
          <GridView schedule={schedule} skipWeekends={skipWeekends} />
        ) : (
          <>
            {/* Column headers */}
            <View style={s.tableHead} fixed>
              <Text style={[s.thCell, s.colDate]}>DATE</Text>
              <Text style={[s.thCell, s.colDay]}>DAY</Text>
              <Text style={[s.thCell, s.colModule]}>MODULE / ACTIVITY</Text>
            </View>

            {/* Schedule rows */}
            {schedule.map((day, i) => {
              if (day.isWeekend) return <WeekendRow key={i} day={day} />;
              if (day.isHoliday) return <HolidayRow key={i} day={day} />;
              if (day.module)    return <ModuleRow  key={i} day={day} />;
              return                    <FreeRow    key={i} day={day} />;
            })}
          </>
        )}

        {/* ── Legend ── */}
        {modules.length > 0 && (
          <View style={s.legendSection}>
            <Text style={s.legendTitle}>Module Legend</Text>
            <View style={s.legendGrid}>
              {modules.map(m => (
                <View key={m.id} style={s.legendItem}>
                  {m.type === 'gap' ? (
                    <View style={s.legendDotGap} />
                  ) : (
                    <View style={[s.legendDot, { backgroundColor: m.color }]} />
                  )}
                  <Text style={m.type === 'gap' ? s.legendTextGap : s.legendText}>
                    {m.name || 'Gap'} ({m.days} day{m.days !== 1 ? 's' : ''})
                    {m.type === 'gap' ? ' — gap' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
}
