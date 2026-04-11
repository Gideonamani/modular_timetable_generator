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
        const isExam = currentModuleDaysLeft === 1;
        result.push({
          date: currentDate,
          isWeekend: false,
          isHoliday: false,
          module: modules[currentModuleIndex],
          isExamDay: isExam,
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
