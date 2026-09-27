export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'SICK_LEAVE'
  | 'EXCUSED_LEAVE'
  | 'HALF_DAY';

export interface StudentAttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  sectionId?: string | null;
  academicYearId: string;
  attendanceDateBs: string;
  attendanceDateAd: string;
  status: AttendanceStatus;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyRegisterStudentRow {
  studentId: string;
  studentCode: string;
  rollNumber: number;
  fullNameEn: string;
  fullNameNp: string;
  gender: string;
  attendanceByDay: Record<number, AttendanceStatus>; // day of month 1..32 -> status
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePercentage: number;
  belowThreshold: boolean; // < 75%
}

export interface StaffAttendanceRecord {
  id: string;
  schoolId: string;
  staffId: string;
  attendanceDateBs: string;
  attendanceDateAd: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'LATE' | 'OFFICIAL_DUTY';
  inTime?: string | null;
  outTime?: string | null;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export type StaffLeaveType =
  | 'CASUAL'
  | 'FESTIVE'
  | 'SICK'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'MOURNING'
  | 'SPECIAL';

export type StaffLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StaffLeaveApplication {
  id: string;
  schoolId: string;
  staffId: string;
  leaveType: StaffLeaveType;
  startDateBs: string;
  endDateBs: string;
  totalDays: number;
  reason: string;
  status: StaffLeaveStatus;
  approvedById?: string | null;
  reviewRemarks?: string | null;
  createdAt: string;
}
