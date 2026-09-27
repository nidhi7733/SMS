export enum UserRoleType {
  PRINCIPAL = 'PRINCIPAL',
  ADMINISTRATIVE_STAFF = 'ADMINISTRATIVE_STAFF',
  ACCOUNTANT = 'ACCOUNTANT',
  TEACHER = 'TEACHER',
  LIBRARIAN = 'LIBRARIAN',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  LOCAL_GOVERNMENT_OFFICER = 'LOCAL_GOVERNMENT_OFFICER',
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  descriptionEn: string;
  descriptionNp: string;
}

export interface Role {
  id: string;
  schoolId: string;
  name: string;
  displayNameEn: string;
  displayNameNp: string;
  description?: string;
  isSystemRole: boolean;
  permissions?: string[]; // Permission codes
}

export interface UserSession {
  id: string;
  schoolId: string;
  username: string;
  email: string | null;
  phone: string | null;
  fullNameEn: string;
  fullNameNp: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isSuperAdmin: boolean;
  roles: {
    id: string;
    name: string;
    displayNameEn: string;
    displayNameNp: string;
  }[];
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
  schoolCode?: string;
}

export interface LoginResponse {
  user: UserSession;
  token: string;
}
