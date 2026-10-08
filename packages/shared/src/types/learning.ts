export type AssignmentStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED';

export type SubmissionStatus = 'SUBMITTED' | 'CHECKED' | 'NEEDS_REVISION' | 'LATE' | 'REJECTED';

export type ResourceType = 'PDF' | 'IMAGE' | 'VIDEO_URL' | 'DOCUMENT';

export interface LmsAssignment {
  id: string;
  schoolId: string;
  academicYearId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId?: string | null;
  title: string;
  description: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  assignedDateBs: string;
  dueDateBs: string;
  totalMarks?: number | null;
  status: AssignmentStatus;
  createdAt?: string;
  // Joined details
  className?: string;
  classNameEn?: string;
  sectionName?: string;
  sectionNameEn?: string;
  subjectName?: string;
  subjectNameEn?: string;
  teacherFullNameNp?: string;
  teacherFullNameEn?: string;
  teacherName?: string;
  submissionsCount?: number;
}

export interface LmsSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: SubmissionStatus;
  marksObtained?: number | null;
  teacherFeedback?: string | null;
  evaluatedAt?: string | null;
  evaluatedById?: string | null;
  // Joined details
  studentName?: string;
  studentNameNp?: string;
  studentNameEn?: string;
  studentCode?: string;
  rollNumber?: number | string;
}

export interface LmsStudyMaterial {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  unitName: string;
  title: string;
  resourceType: ResourceType;
  fileUrl: string;
  fileName?: string | null;
  description?: string | null;
  uploadedById?: string | null;
  createdAt?: string;
  // Joined details
  className?: string;
  classNameEn?: string;
  subjectName?: string;
  subjectNameEn?: string;
  uploadedByName?: string;
  uploadedByNameEn?: string;
}

export interface StudentLearningSummary {
  studentId: string;
  studentName: string;
  studentNameNp?: string;
  studentNameEn?: string;
  studentCode?: string;
  totalAssignments: number;
  submittedCount: number;
  checkedCount: number;
  pendingCount: number;
  submissionRate: number; // percentage e.g. 85
  averageMarks?: number | null;
  remedialRemarks?: string[];
}
