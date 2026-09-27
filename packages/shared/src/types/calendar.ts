export type CalendarEventType =
  | 'PUBLIC_HOLIDAY'
  | 'SCHOOL_HOLIDAY'
  | 'EXAM_DAY'
  | 'EVENT_SPORTS'
  | 'EVENT_CULTURAL'
  | 'MEETING'
  | 'TRAINING';

export interface CalendarEvent {
  id: string;
  schoolId: string;
  academicYearId: string;
  titleEn: string;
  titleNp: string;
  description?: string | null;
  eventType: CalendarEventType;
  startDateBs: string;
  endDateBs: string;
  startDateAd: string;
  endDateAd: string;
  isTeachingDay: boolean;
  createdAt: string;
}
