export interface AuditLogEntry {
  id: string;
  schoolId: string;
  userId?: string;
  action: string; // e.g. "USER_LOGIN", "UPDATE_SCHOOL_PROFILE", "FEE_WAIVER_APPROVED"
  entity: string; // e.g. "User", "School", "FeeReceipt"
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SyncOutboxEntry {
  id: string;
  schoolId: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'CANCEL' | 'REVERSE';
  payload: Record<string, unknown>;
  version: number;
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT';
  createdAt: string;
  syncedAt?: string;
}
