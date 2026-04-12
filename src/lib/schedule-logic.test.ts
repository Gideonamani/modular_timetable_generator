import { describe, it, expect } from 'vitest';
import { generateSchedule } from './schedule-logic';
import { Module } from '../types';

// Monday 2024-01-08
const MON = new Date(2024, 0, 8);
// Friday 2024-01-12
const FRI = new Date(2024, 0, 12);
// Saturday 2024-01-13
const SAT = new Date(2024, 0, 13);
// Sunday 2024-01-14
const SUN = new Date(2024, 0, 14);
// Next Monday 2024-01-15
const NEXT_MON = new Date(2024, 0, 15);

const makeModule = (name: string, days: number): Module => ({
  id: name,
  name,
  days,
  color: '#000',
});

describe('generateSchedule', () => {
  it('returns empty array when startDate > endDate', () => {
    const result = generateSchedule(FRI, MON, [], false, []);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when dates are equal and no modules', () => {
    const result = generateSchedule(MON, MON, [], false, []);
    expect(result).toHaveLength(1);
    expect(result[0].module).toBeUndefined();
  });

  it('assigns module to each working day', () => {
    const modules = [makeModule('Intro', 3)];
    const result = generateSchedule(MON, FRI, modules, false, []);
    const withModule = result.filter(d => d.module?.name === 'Intro');
    expect(withModule).toHaveLength(3);
  });

  it('marks the last day of a module as exam day', () => {
    const modules = [makeModule('Intro', 3)];
    const result = generateSchedule(MON, FRI, modules, false, []);
    const examDays = result.filter(d => d.isExamDay);
    expect(examDays).toHaveLength(1);
    // Third working day (Wednesday) is the exam
    expect(examDays[0].date).toEqual(new Date(2024, 0, 10));
  });

  it('marks remaining days as free when modules run out', () => {
    const modules = [makeModule('Short', 1)];
    const result = generateSchedule(MON, FRI, modules, false, []);
    const freeDays = result.filter(d => !d.module && !d.isWeekend && !d.isHoliday);
    expect(freeDays).toHaveLength(4); // Mon has module, Tue–Fri are free
  });

  it('treats weekends as working days when skipWeekends is false', () => {
    // When skipWeekends=false, Sat+Sun are not skipped — they appear as regular (isWeekend: false) days
    const result = generateSchedule(MON, SUN, [], false, []);
    expect(result).toHaveLength(7); // all 7 days included
    const weekendRows = result.filter(d => d.isWeekend);
    expect(weekendRows).toHaveLength(0); // none flagged as weekend since they're treated as working days
  });

  it('skips weekends and does not assign modules on Sat/Sun', () => {
    const modules = [makeModule('Full', 7)];
    // Mon–Sun (7 days), skip weekends: Sat+Sun skipped
    const result = generateSchedule(MON, SUN, modules, true, []);
    const withModule = result.filter(d => d.module?.name === 'Full');
    expect(withModule).toHaveLength(5); // Mon–Fri only
    const weekendRows = result.filter(d => d.isWeekend);
    expect(weekendRows).toHaveLength(2);
  });

  it('skips weekends and module days continue into next week', () => {
    const modules = [makeModule('Continued', 7)];
    // Mon–next Mon (8 days), skip weekends: should fill Mon–Fri + next Mon = 6 working days
    const result = generateSchedule(MON, NEXT_MON, modules, true, []);
    const withModule = result.filter(d => d.module?.name === 'Continued');
    expect(withModule).toHaveLength(6);
  });

  it('marks holidays correctly', () => {
    const WED = new Date(2024, 0, 10);
    const result = generateSchedule(MON, FRI, [], false, [WED]);
    const holidays = result.filter(d => d.isHoliday);
    expect(holidays).toHaveLength(1);
    expect(holidays[0].date).toEqual(WED);
  });

  it('does not assign a module on a holiday', () => {
    const WED = new Date(2024, 0, 10);
    const modules = [makeModule('Big', 5)];
    const result = generateSchedule(MON, FRI, modules, false, [WED]);
    const holidayRow = result.find(d => d.isHoliday);
    expect(holidayRow?.module).toBeUndefined();
  });

  it('handles empty modules array', () => {
    const result = generateSchedule(MON, FRI, [], false, []);
    expect(result).toHaveLength(5);
    result.forEach(d => expect(d.module).toBeUndefined());
  });

  it('sequences multiple modules correctly', () => {
    const modules = [makeModule('A', 2), makeModule('B', 3)];
    const result = generateSchedule(MON, FRI, modules, false, []);
    const adays = result.filter(d => d.module?.name === 'A');
    const bdays = result.filter(d => d.module?.name === 'B');
    expect(adays).toHaveLength(2);
    expect(bdays).toHaveLength(3);
    // A comes before B
    expect(adays[adays.length - 1].date < bdays[0].date).toBe(true);
  });

  it('marks last day of each module as exam day', () => {
    const modules = [makeModule('A', 2), makeModule('B', 2)];
    const result = generateSchedule(MON, FRI, modules, false, []);
    const examDays = result.filter(d => d.isExamDay);
    expect(examDays).toHaveLength(2);
  });
});
