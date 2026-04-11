export type Module = {
  id: string;
  name: string;
  days: number;
  color: string;
  instructor?: string;
};

export type DaySchedule = {
  date: Date;
  isWeekend: boolean;
  isHoliday?: boolean;
  module?: Module;
  isExamDay?: boolean;
};

export type ViewMode = 'list' | 'grid';
