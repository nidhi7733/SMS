export type InclusionCategory =
  | 'DALIT'
  | 'JANAJATI'
  | 'BRAHMIN_CHHETRI'
  | 'MADHESI'
  | 'MUSLIM'
  | 'THARU'
  | 'BACKWARD'
  | 'OTHER';

export type DisabilityType =
  | 'NONE'
  | 'PHYSICAL'
  | 'VISUAL'
  | 'HEARING'
  | 'SPEECH'
  | 'INTELLECTUAL'
  | 'MULTIPLE';

export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'UNKNOWN';

export type StudentStatus =
  | 'ACTIVE'
  | 'PROMOTED'
  | 'RETAINED'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'GRADUATED';

export type GuardianRelationship = 'FATHER' | 'MOTHER' | 'LOCAL_GUARDIAN';

export interface Guardian {
  id?: string;
  studentId?: string;
  relationship: GuardianRelationship;
  fullNameEn: string;
  fullNameNp: string;
  phone: string;
  email?: string;
  occupation?: string;
  isPrimaryContact?: boolean;
}

export interface StudentHealthRecord {
  id?: string;
  schoolId?: string;
  studentId?: string;
  bloodGroup: BloodGroup | string;
  allergies?: string;
  chronicConditions?: string;
  regularMedications?: string;
  physicalAccommodations?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredHospital?: string;
  immunizationStatus?: 'COMPLETE' | 'PARTIAL' | 'NOT_SPECIFIED';
  medicalNotes?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  schoolId: string;
  studentId: string; // [BSYear]-[Sequence] e.g. 2083-0001
  iemisCode?: string | null;
  firstNameEn: string;
  middleNameEn?: string | null;
  lastNameEn: string;
  firstNameNp: string;
  middleNameNp?: string | null;
  lastNameNp: string;
  dobBs: string;
  dobAd: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: BloodGroup | string | null;
  motherTongue?: string | null;
  nationality: string;
  ethnicityInclusion: InclusionCategory | string;
  disabilityStatus: DisabilityType | string;
  scholarshipEligible: boolean;
  photoUrl?: string | null;
  houseId?: string | null;
  
  // Permanent Address
  permProvince: string;
  permDistrict: string;
  permLocalLevel: string;
  permWardNumber: number;
  permTole?: string | null;

  // Current Address
  currProvince: string;
  currDistrict: string;
  currLocalLevel: string;
  currWardNumber: number;
  currTole?: string | null;

  // Academic Placement
  admissionYearBs: number;
  admissionDateBs: string;
  admissionDateAd: string;
  currentClassId: string;
  currentSectionId?: string | null;
  currentRollNumber?: number | null;
  status: StudentStatus;
  
  // Relations
  currentClass?: any;
  currentSection?: any;
  guardians?: Guardian[];
  healthRecord?: StudentHealthRecord | null;
  house?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentInput {
  iemisCode?: string;
  firstNameEn: string;
  middleNameEn?: string;
  lastNameEn: string;
  firstNameNp: string;
  middleNameNp?: string;
  lastNameNp: string;
  dobBs: string;
  dobAd: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  motherTongue?: string;
  nationality?: string;
  ethnicityInclusion: string;
  disabilityStatus?: string;
  scholarshipEligible?: boolean;
  photoUrl?: string;
  houseId?: string;
  
  permProvince: string;
  permDistrict: string;
  permLocalLevel: string;
  permWardNumber: number;
  permTole?: string;

  currProvince: string;
  currDistrict: string;
  currLocalLevel: string;
  currWardNumber: number;
  currTole?: string;

  currentClassId: string;
  currentSectionId?: string;
  currentRollNumber?: number;

  guardians: {
    relationship: GuardianRelationship;
    fullNameEn: string;
    fullNameNp: string;
    phone: string;
    email?: string;
    occupation?: string;
    isPrimaryContact?: boolean;
  }[];

  healthInfo?: {
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    regularMedications?: string;
    physicalAccommodations?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    preferredHospital?: string;
    immunizationStatus?: 'COMPLETE' | 'PARTIAL' | 'NOT_SPECIFIED';
    medicalNotes?: string;
  };
}

export interface BulkPromoteInput {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  sourceClassId: string;
  targetClassId: string;
  targetSectionId?: string;
  promotions: {
    studentId: string;
    status: 'PROMOTED' | 'RETAINED' | 'TRANSFERRED' | 'GRADUATED';
    rollNumber?: number;
    remarks?: string;
    principalOverride?: boolean;
  }[];
}
