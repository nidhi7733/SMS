export interface TransportVehicle {
  id: string;
  schoolId: string;
  vehicleNumber: string; // e.g. "बा १ क १२३४"
  vehicleType: 'BUS' | 'MINIBUS' | 'VAN' | 'MICRO';
  capacity: number; // seat capacity e.g. 35
  fuelType: 'DIESEL' | 'PETROL' | 'ELECTRIC';
  modelYear?: string;
  bluebookExpiryBs: string;
  insuranceExpiryBs: string;
  pollutionExpiryBs?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportStaff {
  id: string;
  schoolId: string;
  staffId?: string; // Optional link to staff record
  role: 'DRIVER' | 'HELPER';
  fullName: string;
  phone: string;
  licenseNo?: string;
  licenseCategory?: string; // e.g. "B", "F"
  licenseExpiryBs?: string;
  emergencyContact?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportStop {
  id: string;
  routeId: string;
  stopOrder: number;
  stopNameEn: string;
  stopNameNp: string;
  morningPickupTime: string; // "07:30"
  eveningDropTime: string; // "16:15"
  monthlyFare: number; // NPR 1500
  createdAt: string;
  updatedAt: string;
}

export interface TransportRoute {
  id: string;
  schoolId: string;
  vehicleId?: string;
  driverId?: string;
  helperId?: string;
  routeNameEn: string;
  routeNameNp: string;
  startPoint: string;
  endPoint: string;
  isActive: boolean;
  vehicle?: TransportVehicle;
  driver?: TransportStaff;
  helper?: TransportStaff;
  stops?: TransportStop[];
  totalAllocatedStudents?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentTransportAllocation {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  className?: string;
  sectionName?: string;
  routeId: string;
  routeName?: string;
  vehicleNumber?: string;
  stopId: string;
  stopName?: string;
  monthlyFare?: number;
  academicYearBs: number;
  startDateBs: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportMaintenanceLog {
  id: string;
  schoolId: string;
  vehicleId: string;
  vehicleNumber?: string;
  logDateBs: string;
  logType: 'FUEL' | 'SERVICING' | 'REPAIR' | 'PARTS_REPLACEMENT' | 'OTHER';
  odometerKm?: number;
  fuelQuantityLiters?: number;
  totalCost: number;
  vendorName?: string;
  invoiceNo?: string;
  remarks?: string;
  createdAt: string;
}
