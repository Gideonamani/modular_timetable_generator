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

export type AppTab = 'timetable' | 'invigilation';

export type Invigilator = {
  id: string;
  name: string;
  role?: string;
};

export type SessionAssignment = {
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'custom';
  startTime?: string; // "HH:mm"
  duration?: number; // minutes
  venue?: string;
  leadInvigilatorId?: string;
  additionalInvigilatorIds?: string[];
};

export type ExamDay = {
  date: string; // "YYYY-MM-DD"
  included: boolean;
};

export type ExamPeriod = {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  days: ExamDay[];
};
