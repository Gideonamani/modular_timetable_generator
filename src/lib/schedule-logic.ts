import { addDays, isWeekend, isSameDay, differenceInDays } from "date-fns";
import { Module, DaySchedule } from "../types";

export function generateSchedule(
  startDate: Date,
  endDate: Date,
  modules: Module[],
  skipWeekends: boolean,
  holidays: Date[]
): DaySchedule[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  const result: DaySchedule[] = [];
  let currentDate = startDate;
  let currentModuleIndex = 0;
  let currentModuleDaysLeft = modules.length > 0 ? modules[0].days : 0;

  const totalDays = differenceInDays(endDate, startDate) + 1;

  for (let i = 0; i < totalDays; i++) {
    const isWknd = isWeekend(currentDate);
    const isHoliday = holidays.some((h) => isSameDay(h, currentDate));

    if ((skipWeekends && isWknd) || isHoliday) {
      result.push({ date: currentDate, isWeekend: isWknd, isHoliday });
    } else {
      if (currentModuleIndex < modules.length) {
        const mod = modules[currentModuleIndex];
        const isExam = currentModuleDaysLeft === 1
          && mod.hasExamDay !== false
          && mod.type !== 'gap';
        const hasExam = mod.hasExamDay !== false && mod.type !== 'gap';
        const practicalCount = mod.practicalDaysCount ?? 3;
        const isPractical = !isExam
          && mod.hasPracticalDays === true
          && mod.type !== 'gap'
          && (hasExam
            ? currentModuleDaysLeft <= practicalCount + 1
            : currentModuleDaysLeft <= practicalCount);
        result.push({
          date: currentDate,
          isWeekend: false,
          isHoliday: false,
          module: mod,
          isExamDay: isExam,
          isPracticalDay: isPractical || undefined,
        });
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
}
