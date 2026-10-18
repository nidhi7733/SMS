export type CalendarEventType = string;

export interface CalendarEventCategory {
  id: string;
  schoolId: string;
  code: string;
  nameNp: string;
  nameEn: string;
  color: string;
  isHoliday: boolean;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  schoolId: string;
  academicYearId: string;
  titleEn: string;
  titleNp: string;
  description?: string | null;
  eventType: string; // references category code
  startDateBs: string;
  endDateBs: string;
  startDateAd: string;
  endDateAd: string;
  isTeachingDay: boolean;
  showOnWebsite?: boolean;
  eventTime?: string | null;
  venueNp?: string | null;
  venueEn?: string | null;
  category?: CalendarEventCategory | null;
  createdAt?: string;
}
