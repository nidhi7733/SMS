export type StaffCategory = 'TEACHING' | 'NON_TEACHING';

export type AppointmentType =
  | 'PERMANENT'
  | 'RELIEF'
  | 'MUNICIPAL'
  | 'CONTRACT'
  | 'PRIVATE'
  | 'ECD_FACILITATOR'
  | 'OFFICE_SUPPORT';

export type StaffDesignation =
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'SECONDARY_TEACHER'
  | 'LOWER_SECONDARY_TEACHER'
  | 'PRIMARY_TEACHER'
  | 'ECD_TEACHER'
  | 'ACCOUNTANT'
  | 'ADMIN_STAFF'
  | 'LAB_ASSISTANT'
  | 'OFFICE_ASSISTANT';

export type StaffQualification =
  | 'SLC_SEE'
  | 'PLUS_TWO'
  | 'BACHELOR'
  | 'MASTER'
  | 'MPHIL_PHD';

export type StaffStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'TRANSFERRED'
  | 'RETIRED'
  | 'RESIGNED';

export interface Staff {
  id: string;
  schoolId: string;
  staffCode: string;
  category: StaffCategory;
  fullNameEn: string;
  fullNameNp: string;
  dobBs: string;
  dobAd?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string | null;
  phone: string;
  email?: string | null;
  citizenshipNo?: string | null;
  nationalIdNo?: string | null;
  panNumber?: string | null;
  appointmentType: AppointmentType;
  designation: StaffDesignation;
  teachingLicenseNo?: string | null;
  qualification: StaffQualification;
  majorSubject?: string | null;
  training?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  userId?: string | null;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StaffBulkImportRow {
  sn?: number | string;
  orgCode?: string;
  orgName?: string;
  fullName: string;
  contactNumber: string;
  training?: string;
  dobBs: string;
  category?: StaffCategory;
  appointmentType?: AppointmentType;
  designation?: StaffDesignation;
  isDuplicate?: boolean;
  duplicateReason?: string;
}
