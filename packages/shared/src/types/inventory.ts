export type InventoryItemType = 'CONSUMABLE' | 'NON_CONSUMABLE';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'WDV';
export type AssetConditionStatus = 'GOOD' | 'REPAIR_NEEDED' | 'SCRAPPED' | 'DISPOSED';

export interface InventoryCategory {
  id: string;
  schoolId: string;
  code: string;
  nameEn: string;
  nameNp: string;
  description?: string | null;
  createdAt?: string;
}

export interface InventoryItem {
  id: string;
  schoolId: string;
  categoryId: string;
  category?: InventoryCategory;
  itemCode: string;
  nameEn: string;
  nameNp: string;
  itemType: InventoryItemType;
  unit: string;
  reorderLevel: number;
  currentStock: number;
  lastPurchasePrice?: number | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryPurchaseItem {
  id?: string;
  purchaseId?: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  remarks?: string | null;
}

export interface InventoryPurchase {
  id: string;
  schoolId: string;
  grnNumber: string;
  vendorName: string;
  vendorPan?: string | null;
  billNumber: string;
  purchaseDateBs: string;
  purchaseDateAd: string;
  subTotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentType: 'CASH' | 'CREDIT' | 'BANK';
  creditAccountId?: string | null;
  voucherId?: string | null;
  remarks?: string | null;
  status: 'RECEIVED' | 'CANCELLED';
  receivedById?: string | null;
  items?: InventoryPurchaseItem[];
  createdAt?: string;
}

export interface CreatePurchasePayload {
  vendorName: string;
  vendorPan?: string;
  billNumber: string;
  purchaseDateBs: string;
  paymentType: 'CASH' | 'CREDIT' | 'BANK';
  creditAccountId?: string;
  remarks?: string;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    remarks?: string;
  }[];
}

export interface InventoryIssueItem {
  id?: string;
  issueId?: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
  remarks?: string | null;
}

export interface InventoryIssue {
  id: string;
  schoolId: string;
  issueNumber: string;
  issueDateBs: string;
  issueDateAd: string;
  issuedToStaffId?: string | null;
  issuedToName: string;
  department?: string | null;
  purpose: string;
  voucherId?: string | null;
  status: 'ISSUED' | 'CANCELLED';
  approvedById?: string | null;
  items?: InventoryIssueItem[];
  createdAt?: string;
}

export interface CreateIssuePayload {
  issueDateBs: string;
  issuedToStaffId?: string;
  issuedToName: string;
  department?: string;
  purpose: string;
  items: {
    itemId: string;
    quantity: number;
    remarks?: string;
  }[];
}

export interface FixedAsset {
  id: string;
  schoolId: string;
  assetTag: string;
  nameEn: string;
  nameNp: string;
  itemId?: string | null;
  item?: InventoryItem;
  purchaseDateBs: string;
  purchaseDateAd: string;
  originalCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  depreciationRate: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  location: string;
  custodianStaffId?: string | null;
  conditionStatus: AssetConditionStatus;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLedgerReportItem {
  itemId: string;
  itemCode: string;
  nameEn: string;
  nameNp: string;
  unit: string;
  itemType: InventoryItemType;
  reorderLevel: number;
  currentStock: number;
  lastPurchasePrice: number;
  stockValue: number;
  isLowStock: boolean;
}
