export type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY';

export interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId?: string | null;
  dayOfWeek: DayOfWeek;
  periodNumber: number; // 1 to 8
  startTime: string; // "10:15"
  endTime: string; // "11:00"
  roomNumber?: string | null;
  createdAt: string;

  // Joined details
  subjectNameEn?: string;
  subjectNameNp?: string;
  subjectCode?: string;
  teacherNameEn?: string;
  teacherNameNp?: string;
  classNameEn?: string;
  sectionCode?: string;
}

export interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  labelEn: string;
  labelNp: string;
}
