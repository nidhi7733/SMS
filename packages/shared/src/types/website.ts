export interface WebsiteSettings {
  id: string;
  schoolId: string;
  heroTitleNp?: string | null;
  heroTitleEn?: string | null;
  heroSubtitleNp?: string | null;
  heroSubtitleEn?: string | null;
  aboutTitleNp?: string | null;
  aboutTitleEn?: string | null;
  aboutContentNp?: string | null;
  aboutContentEn?: string | null;
  principalNameNp?: string | null;
  principalNameEn?: string | null;
  principalMessageNp?: string | null;
  principalMessageEn?: string | null;
  principalPhotoUrl?: string | null;
  smcChairNameNp?: string | null;
  smcChairNameEn?: string | null;
  smcChairMessageNp?: string | null;
  smcChairMessageEn?: string | null;
  smcChairPhotoUrl?: string | null;
  contactAddressNp?: string | null;
  contactAddressEn?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  admissionOpen: boolean;
  admissionBannerTextNp?: string | null;
  admissionBannerTextEn?: string | null;
  updatedAt?: string;
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
