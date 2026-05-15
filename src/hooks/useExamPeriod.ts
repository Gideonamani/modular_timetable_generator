import * as React from "react";
import { eachDayOfInterval, parseISO, isWeekend, format } from "date-fns";
import { ExamPeriod, ExamDay } from "../types";

export function useExamPeriod(initial: ExamPeriod | null = null) {
  const [examPeriod, setExamPeriod] = React.useState<ExamPeriod | null>(initial);

  const setExamPeriodDates = React.useCallback((startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (end < start) return;

    setExamPeriod(prev => {
      const existingMap = new Map(prev?.days.map(d => [d.date, d.included]) ?? []);
      const days: ExamDay[] = eachDayOfInterval({ start, end })
        .filter(d => !isWeekend(d))
        .map(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return { date: dateStr, included: existingMap.get(dateStr) ?? true };
        });
      return { startDate, endDate, days };
    });
  }, []);

  const toggleDay = React.useCallback((date: string) => {
    setExamPeriod(prev =>
      prev
        ? { ...prev, days: prev.days.map(d => d.date === date ? { ...d, included: !d.included } : d) }
        : prev
    );
  }, []);

  const addDay = React.useCallback((date: string) => {
    setExamPeriod(prev => {
      if (!prev || prev.days.some(d => d.date === date)) return prev;
      const newDays = [...prev.days, { date, included: true }]
        .sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, days: newDays };
    });
  }, []);

  const removeDay = React.useCallback((date: string) => {
    setExamPeriod(prev =>
      prev ? { ...prev, days: prev.days.filter(d => d.date !== date) } : prev
    );
  }, []);

  const clearExamPeriod = React.useCallback(() => setExamPeriod(null), []);

  const activeDays = React.useMemo(
    () => (examPeriod?.days ?? [])
      .filter(d => d.included)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [examPeriod]
  );

  return {
    examPeriod,
    setExamPeriod,
    setExamPeriodDates,
    toggleDay,
    addDay,
    removeDay,
    clearExamPeriod,
    activeDays,
  };
}
