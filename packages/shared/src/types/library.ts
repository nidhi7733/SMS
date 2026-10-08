export interface LibraryCategory {
  id: string;
  schoolId: string;
  code: string; // e.g. "010", "800", "500"
  nameEn: string;
  nameNp: string;
  description?: string | null;
  createdAt?: string;
}

export type BookCondition = 'GOOD' | 'FAIR' | 'DAMAGED';
export type BookCopyStatus = 'AVAILABLE' | 'ISSUED' | 'LOST' | 'RESERVED';
export type LibraryMemberType = 'STUDENT' | 'STAFF';
export type LibraryMemberStatus = 'ACTIVE' | 'SUSPENDED';
export type CirculationStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
export type FinePaymentStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface LibraryBook {
  id: string;
  schoolId: string;
  isbn?: string | null;
  titleEn: string;
  titleNp: string;
  author: string;
  publisher?: string | null;
  edition?: string | null;
  publicationYear?: string | null;
  language: 'NEPALI' | 'ENGLISH' | 'SANSKRIT' | 'MAITHILI' | string;
  categoryId: string;
  rackLocation: string;
  price: number;
  totalCopies: number;
  availableCopies: number;
  description?: string | null;
  coverImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryBookCopy {
  id: string;
  bookId: string;
  accessionNumber: string; // e.g. "ACC-2083-0001"
  barcode?: string | null;
  condition: BookCondition;
  status: BookCopyStatus;
  addedDateBs: string;
  createdAt?: string;
}

export interface LibraryMember {
  id: string;
  schoolId: string;
  memberType: LibraryMemberType;
  studentId?: string | null;
  staffId?: string | null;
  cardNumber: string; // e.g. "LIB-STU-0012", "LIB-STF-0005"
  maxAllowedBooks: number;
  maxIssueDays: number;
  status: LibraryMemberStatus;
  createdAt?: string;
}

export interface LibraryCirculation {
  id: string;
  schoolId: string;
  circulationNumber: string; // e.g. "CIR-2083-0001"
  copyId: string;
  memberId: string;
  issueDateBs: string;
  issueDateAd: string;
  dueDateBs: string;
  returnDateBs?: string | null;
  returnDateAd?: string | null;
  status: CirculationStatus;
  fineAmount: number;
  finePaid: boolean;
  remarks?: string | null;
  issuedById?: string | null;
  returnedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryFine {
  id: string;
  schoolId: string;
  circulationId: string;
  memberId: string;
  overdueDays: number;
  ratePerDay: number; // e.g. NPR 2 per day
  fineAmount: number;
  waivedAmount: number;
  paidAmount: number;
  paymentStatus: FinePaymentStatus;
  receiptNumber?: string | null;
  paymentDateBs?: string | null;
  collectedById?: string | null;
  createdAt?: string;
}

// Joined and response types
export interface LibraryBookWithDetails extends LibraryBook {
  category?: LibraryCategory;
  copies?: LibraryBookCopy[];
}

export interface LibraryMemberWithDetails extends LibraryMember {
  fullNameEn: string;
  fullNameNp: string;
  email?: string | null;
  phone?: string | null;
  detailsLabel?: string; // Class & Section or Department & Designation
  activeIssuesCount: number;
}

export interface LibraryCirculationWithDetails extends LibraryCirculation {
  bookTitleEn: string;
  bookTitleNp: string;
  author: string;
  accessionNumber: string;
  rackLocation: string;
  memberNameEn: string;
  memberNameNp: string;
  memberCardNumber: string;
  memberType: LibraryMemberType;
  overdueDays?: number;
  calculatedFine?: number;
}

// DTOs
export interface CreateLibraryCategoryDto {
  code: string;
  nameEn: string;
  nameNp: string;
  description?: string;
}

export interface CreateLibraryBookDto {
  isbn?: string;
  titleEn: string;
  titleNp: string;
  author: string;
  publisher?: string;
  edition?: string;
  publicationYear?: string;
  language?: string;
  categoryId: string;
  rackLocation: string;
  price?: number;
  initialCopiesCount?: number;
  accessionPrefix?: string; // e.g. "ACC-2083"
  description?: string;
}

export interface IssueBookDto {
  accessionNumber?: string;
  copyId?: string;
  cardNumber?: string;
  memberId?: string;
  issueDateBs: string;
  issueDateAd?: string;
  dueDateBs: string;
  remarks?: string;
}

export interface ReturnBookDto {
  circulationId: string;
  returnDateBs: string;
  returnDateAd?: string;
  condition?: BookCondition;
  fineAmount?: number;
  finePaid?: boolean;
  remarks?: string;
}

export interface PayFineDto {
  fineId?: string;
  circulationId?: string;
  paidAmount: number;
  waivedAmount?: number;
  paymentDateBs: string;
  receiptNumber?: string;
}
