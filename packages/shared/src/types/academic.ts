export type SchoolStage =
  | 'PRE_PRIMARY'
  | 'PRIMARY'
  | 'LOWER_SECONDARY'
  | 'SECONDARY'
  | 'HIGHER_SECONDARY';

export type ShiftType = 'MORNING' | 'DAY' | 'EVENING';

export type StreamCode =
  | 'SCIENCE'
  | 'MANAGEMENT'
  | 'EDUCATION'
  | 'HUMANITIES'
  | 'COMPUTER_ENGINEERING';

export interface ClassLevel {
  id: string;
  schoolId: string;
  code: string;
  nameEn: string;
  nameNp: string;
  displayOrder: number;
  stage: SchoolStage;
  hasStreams: boolean;
  createdAt?: string;
  sections?: Section[];
  subjects?: Subject[];
}

export interface Stream {
  id: string;
  schoolId: string;
  code: StreamCode | string;
  nameEn: string;
  nameNp: string;
  description?: string;
}

export interface Section {
  id: string;
  schoolId: string;
  classId: string;
  streamId?: string | null;
  nameEn: string;
  nameNp: string;
  code: string;
  shift: ShiftType;
  capacity: number;
  classTeacherId?: string | null;
  classTeacherName?: string;
  roomNumber?: string;
  studentCount?: number;
}

export interface House {
  id: string;
  schoolId: string;
  nameEn: string;
  nameNp: string;
  colorHex: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  classId: string;
  streamId?: string | null;
  code: string;
  nameEn: string;
  nameNp: string;
  isOptional: boolean;
  creditHours: number;
  theoryFullMarks: number;
  practicalFullMarks: number;
  theoryPassMarks: number;
  practicalPassMarks: number;
}

export interface AcademicYearSession {
  id: string;
  schoolId: string;
  yearBs: number;
  startDateAd: string;
  endDateAd: string;
  startDateBs: string;
  endDateBs: string;
  isCurrent: boolean;
  isClosed: boolean;
}
