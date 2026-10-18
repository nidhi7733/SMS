export interface WebsiteSettings {
  id: string;
  schoolId: string;
  // Header Branding & School Identity
  logoUrl?: string | null;
  schoolNameNp?: string | null;
  schoolNameEn?: string | null;
  mottoNp?: string | null;
  mottoEn?: string | null;
  iemisCode?: string | null;
  establishedYearBs?: number | string | null;
  affiliationTextNp?: string | null;
  affiliationTextEn?: string | null;

  // Hero Section
  heroTitleNp?: string | null;
  heroTitleEn?: string | null;
  heroSubtitleNp?: string | null;
  heroSubtitleEn?: string | null;

  // About School Section
  aboutTitleNp?: string | null;
  aboutTitleEn?: string | null;
  aboutContentNp?: string | null;
  aboutContentEn?: string | null;
  aboutImageUrl?: string | null;
  aboutImageCaptionNp?: string | null;
  aboutImageCaptionEn?: string | null;
  aboutFeaturesList?: string[] | null;

  // Leadership Messages (Principal & SMC Chairperson)
  principalNameNp?: string | null;
  principalNameEn?: string | null;
  principalDesignationNp?: string | null;
  principalDesignationEn?: string | null;
  principalMessageNp?: string | null;
  principalMessageEn?: string | null;
  principalPhotoUrl?: string | null;
  principalVisible?: boolean;

  smcChairNameNp?: string | null;
  smcChairNameEn?: string | null;
  smcChairDesignationNp?: string | null;
  smcChairDesignationEn?: string | null;
  smcChairMessageNp?: string | null;
  smcChairMessageEn?: string | null;
  smcChairPhotoUrl?: string | null;
  smcChairVisible?: boolean;

  // Contact, Address & Office Hours
  contactAddressNp?: string | null;
  contactAddressEn?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  officeHoursNp?: string | null;
  officeHoursEn?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;

  // Admissions & Portal Links
  admissionOpen: boolean;
  admissionBannerTextNp?: string | null;
  admissionBannerTextEn?: string | null;
  portalButtonTextNp?: string | null;
  portalButtonTextEn?: string | null;
  portalUrl?: string | null;

  // Custom Stats Overrides
  customTotalStudents?: number | null;
  customTotalTeachers?: number | null;
  customTotalClassrooms?: number | null;

  // Footer
  footerCopyrightTextNp?: string | null;
  footerCopyrightTextEn?: string | null;

  updatedAt?: string;
}

export interface WebsiteNavItem {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  url: string;
  isExternal: boolean;
  sortOrder: number;
  isVisible: boolean;
  createdAt?: string;
}

export interface WebsiteAcademicProgram {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  descriptionNp: string;
  descriptionEn: string;
  icon?: string | null;
  badgeNp?: string | null;
  badgeEn?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface WebsiteHeroSlide {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  subtitleNp?: string | null;
  subtitleEn?: string | null;
  imageUrl: string;
  buttonTextNp?: string | null;
  buttonTextEn?: string | null;
  buttonLink?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface WebsiteNotice {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  contentNp: string;
  contentEn: string;
  category: 'GENERAL' | 'ACADEMIC' | 'EXAM' | 'ADMISSION' | 'URGENT' | 'HOLIDAY';
  publishDateBs: string;
  expireDateBs?: string | null;
  fileUrl?: string | null;
  isPinned: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebsiteEvent {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  descriptionNp?: string | null;
  descriptionEn?: string | null;
  eventDateBs: string;
  eventTime?: string | null;
  venueNp?: string | null;
  venueEn?: string | null;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface WebsiteGalleryAlbum {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  category: string;
  coverImageUrl: string;
  descriptionNp?: string | null;
  descriptionEn?: string | null;
  images?: WebsiteGalleryImage[];
  createdAt?: string;
}

export interface WebsiteGalleryImage {
  id: string;
  albumId: string;
  titleNp?: string | null;
  titleEn?: string | null;
  imageUrl: string;
  sortOrder: number;
  createdAt?: string;
}

export interface WebsiteDownload {
  id: string;
  schoolId: string;
  titleNp: string;
  titleEn: string;
  category: 'ADMISSION' | 'SYLLABUS' | 'CALENDAR' | 'RULES' | 'EXAM' | 'OTHER';
  fileUrl: string;
  fileSize?: string | null;
  downloadCount: number;
  createdAt?: string;
}

export interface WebsiteInquiry {
  id: string;
  schoolId: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string | null;
  subject: string;
  message: string;
  status: 'PENDING' | 'CONTACTED' | 'RESOLVED' | 'SPAM';
  responseNotes?: string | null;
  createdAt?: string;
}

export interface PublicWebsiteOverview {
  school: {
    id: string;
    code: string;
    nameEn: string;
    nameNp: string;
    mottoEn?: string | null;
    mottoNp?: string | null;
    logoUrl?: string | null;
    iemisCode?: string | null;
  };
  settings: WebsiteSettings;
  navItems?: WebsiteNavItem[];
  academicPrograms?: WebsiteAcademicProgram[];
  heroSlides: WebsiteHeroSlide[];
  latestNotices: WebsiteNotice[];
  upcomingEvents: WebsiteEvent[];
  featuredAlbums: WebsiteGalleryAlbum[];
  downloads: WebsiteDownload[];
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClassrooms: number;
    establishedYearBs: number;
  };
}
