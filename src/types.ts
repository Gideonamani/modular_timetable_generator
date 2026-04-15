export type Module = {
  id: string;
  name: string;
  days: number;
  color: string;
  instructor?: string;
  hasExamDay?: boolean;
  hasPracticalDays?: boolean;
  practicalDaysCount?: number;
  type?: 'module' | 'gap';
};

export type DaySchedule = {
  date: Date;
  isWeekend: boolean;
  isHoliday?: boolean;
  module?: Module;
  isExamDay?: boolean;
  isPracticalDay?: boolean;
};

export type ViewMode = 'list' | 'grid';
