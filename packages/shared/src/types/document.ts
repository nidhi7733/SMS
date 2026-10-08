export interface InwardDocument {
  id: string;
  schoolId: string;
  dartaNo: number;
  fiscalYear: string;
  registeredDateBs: string;
  senderOrganization: string;
  senderLetterNo?: string;
  senderLetterDateBs?: string;
  subject: string;
  category: 'GOVERNMENT' | 'MUNICIPALITY' | 'PARENT' | 'COMMUNITY' | 'CIRCULAR' | 'OTHER';
  priority: 'NORMAL' | 'URGENT' | 'VERY_URGENT' | 'CONFIDENTIAL';
  status: 'PENDING' | 'IN_PROCESS' | 'ACTION_TAKEN' | 'FILED';
  scannedFileUrl?: string;
  receiverStaffId?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutwardDocument {
  id: string;
  schoolId: string;
  chalaniNo: number;
  fiscalYear: string;
  dispatchDateBs: string;
  recipientOrganization: string;
  subject: string;
  category: 'RECOMMENDATION' | 'REPORT' | 'REQUEST' | 'RESPONSE' | 'NOTICE' | 'OTHER';
  dispatchMode: 'HAND_DELIVERY' | 'EMAIL' | 'POST' | 'COURIER' | 'PORTAL';
  signatoryStaffId?: string;
  scannedFileUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LetterTemplate {
  id: string;
  schoolId: string;
  code: string;
  titleEn: string;
  titleNp: string;
  templateBodyHtml: string;
  category: 'STUDENT_BONAFIDE' | 'SCHOLARSHIP' | 'STAFF_EXPERIENCE' | 'RELATION_VERIFICATION' | 'CHARACTER' | 'GENERAL';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IssuedOfficialLetter {
  id: string;
  schoolId: string;
  letterNo: string;
  templateId: string;
  templateTitle?: string;
  targetType: 'STUDENT' | 'STAFF' | 'GENERAL';
  targetId?: string;
  targetName?: string;
  issueDateBs: string;
  generatedContentHtml: string;
  signatoryStaffId?: string;
  remarks?: string;
  createdAt: string;
}

export interface InstitutionalArchive {
  id: string;
  schoolId: string;
  title: string;
  category: 'LAND_OWNERSHIP' | 'BUILDING_MAP' | 'SMC_MINUTES' | 'PTA_MINUTES' | 'AUDIT_REPORT' | 'POLICIES' | 'MISCELLANEOUS';
  documentYearBs?: number;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
  tags?: string[];
  confidentialityLevel: 'PUBLIC' | 'RESTRICTED' | 'HIGHLY_CONFIDENTIAL';
  createdAt: string;
  updatedAt: string;
}
