export interface SchoolProfile {
  id: string;
  code: string;
  nameEn: string;
  nameNp: string;
  logoUrl?: string;
  mottoEn?: string;
  mottoNp?: string;
  iemisCode?: string;
  establishedBsYear?: number;
  phone: string;
  email: string;
  website?: string;
  addressEn: string;
  addressNp: string;
  province: string;
  district: string;
  localLevel: string;
  wardNumber: number;
  shifts: ('MORNING' | 'DAY')[];
  minClass: string; // e.g. "ECD"
  maxClass: string; // e.g. "12"
  activeAcademicYearBs: number; // e.g. 2083
  fiscalYearBs: string; // e.g. "2082/083"
  isOfflineCapable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  yearBs: number; // e.g. 2083
  startDateAd: string;
  endDateAd: string;
  startDateBs: string;
  endDateBs: string;
  isCurrent: boolean;
  isClosed: boolean;
}
