import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { DaySchedule, Module } from '../types';

export interface TimetablePDFProps {
  schedule: DaySchedule[];
  timetableTitle: string;
  timetableSubtitle: string;
  startDate: Date;
  endDate: Date;
  modules: Module[];
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
        </View>
        {mod.instructor ? (
          <Text style={s.instructor}>{mod.instructor}</Text>
        ) : null}
      </View>
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

        {/* ── Column headers ── */}
        <View style={s.tableHead} fixed>
          <Text style={[s.thCell, s.colDate]}>DATE</Text>
          <Text style={[s.thCell, s.colDay]}>DAY</Text>
          <Text style={[s.thCell, s.colModule]}>MODULE / ACTIVITY</Text>
        </View>

        {/* ── Schedule rows ── */}
        {schedule.map((day, i) => {
          if (day.isWeekend) return <WeekendRow key={i} day={day} />;
          if (day.isHoliday) return <HolidayRow key={i} day={day} />;
          if (day.module)    return <ModuleRow  key={i} day={day} />;
          return                    <FreeRow    key={i} day={day} />;
        })}

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
