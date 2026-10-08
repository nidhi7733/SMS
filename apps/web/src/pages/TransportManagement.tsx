import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { toDevanagariDigits } from '@sms/shared';
import {
  Bus,
  MapPin,
  Users,
  Wrench,
  Plus,
  Search,
  Fuel,
  Calendar,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  Edit2,
  X,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface TransportVehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  fuelType: string;
  modelYear?: string;
  bluebookExpiryBs: string;
  insuranceExpiryBs: string;
  pollutionExpiryBs?: string;
  status: string;
  notes?: string;
  currentOccupancy?: number;
  occupancyPercentage?: number;
}

interface TransportStaff {
  id: string;
  role: string;
  fullName: string;
  phone: string;
  licenseNo?: string;
  licenseCategory?: string;
  licenseExpiryBs?: string;
  emergencyContact?: string;
  isActive: boolean;
}

interface TransportStop {
  id: string;
  routeId: string;
  stopOrder: number;
  stopNameEn: string;
  stopNameNp: string;
  morningPickupTime: string;
  eveningDropTime: string;
  monthlyFare: number;
}

interface TransportRoute {
  id: string;
  routeNameEn: string;
  routeNameNp: string;
  startPoint: string;
  endPoint: string;
  isActive: boolean;
  vehicleId?: string;
  vehicle?: TransportVehicle;
  driverId?: string;
  driver?: TransportStaff;
  helperId?: string;
  helper?: TransportStaff;
  stops?: TransportStop[];
  totalAllocatedStudents?: number;
}

interface StudentAllocation {
  id: string;
  studentId: string;
  studentNameNp: string;
  studentNameEn: string;
  studentName: string;
  admissionNo?: string;
  rollNumber?: number;
  className?: string;
  sectionName?: string;
  routeId: string;
  routeName: string;
  vehicleNumber?: string;
  stopId: string;
  stopNameNp: string;
  stopNameEn: string;
  stopName: string;
  morningPickupTime: string;
  eveningDropTime: string;
  monthlyFare: number;
  academicYearBs: number;
  startDateBs: string;
  status: string;
  remarks?: string;
}

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  logDateBs: string;
  logType: string;
  odometerKm?: number;
  fuelQuantityLiters?: number;
  totalCost: number;
  vendorName?: string;
  invoiceNo?: string;
  remarks?: string;
}

interface StudentItem {
  id: string;
  firstNameNp?: string;
  lastNameNp?: string;
  firstNameEn: string;
  lastNameEn?: string;
  admissionNo?: string;
  currentRollNumber?: number;
}

export const TransportManagement: React.FC = () => {
  const { language } = useLanguage();
  const isNp = language === 'np';
  const { school } = useSchool();

  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'allocations' | 'maintenance'>('vehicles');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Data states
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [staffList, setStaffList] = useState<TransportStaff[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [allocations, setAllocations] = useState<StudentAllocation[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<string>('');
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [printManifestData, setPrintManifestData] = useState<TransportRoute | null>(null);

  // Forms
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleType: 'BUS',
    capacity: 32,
    fuelType: 'DIESEL',
    modelYear: '2022',
    bluebookExpiryBs: '2083-12-30',
    insuranceExpiryBs: '2083-12-30',
    pollutionExpiryBs: '2083-12-30',
    status: 'ACTIVE',
    notes: '',
  });

  const [routeForm, setRouteForm] = useState({
    routeNameEn: '',
    routeNameNp: '',
    startPoint: '',
    endPoint: '',
    vehicleId: '',
    driverId: '',
    helperId: '',
  });

  const [stopForm, setStopForm] = useState({
    routeId: '',
    stopOrder: 1,
    stopNameEn: '',
    stopNameNp: '',
    morningPickupTime: '07:30',
    eveningDropTime: '16:00',
    monthlyFare: 1500,
  });

  const [allocForm, setAllocForm] = useState({
    studentId: '',
    routeId: '',
    stopId: '',
    startDateBs: '2083-01-15',
    remarks: '',
  });

  const [maintForm, setMaintForm] = useState({
    vehicleId: '',
    logDateBs: '2083-01-15',
    logType: 'FUEL',
    odometerKm: '',
    fuelQuantityLiters: '',
    totalCost: '',
    vendorName: '',
    invoiceNo: '',
    remarks: '',
  });

  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem('sms_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [sumRes, vehRes, stfRes, rtRes, studRes] = await Promise.all([
        fetch('/api/transport/summary', { headers }),
        fetch('/api/transport/vehicles', { headers }),
        fetch('/api/transport/staff', { headers }),
        fetch('/api/transport/routes', { headers }),
        fetch('/api/students', { headers }),
      ]);
      if (sumRes.ok) setStats(await sumRes.json());
      if (vehRes.ok) {
        const vData = await vehRes.json();
        setVehicles(Array.isArray(vData) ? vData : []);
      }
      if (stfRes.ok) {
        const sData = await stfRes.json();
        setStaffList(Array.isArray(sData) ? sData : []);
      }
      if (rtRes.ok) {
        const rData = await rtRes.json();
        setRoutes(Array.isArray(rData) ? rData : []);
      }
      if (studRes.ok) {
        const stData = await studRes.json();
        setStudents(Array.isArray(stData) ? stData : (stData.students || []));
      }

      if (activeTab === 'allocations') {
        const alRes = await fetch('/api/transport/allocations', { headers });
        if (alRes.ok) setAllocations(await alRes.json());
      } else if (activeTab === 'maintenance') {
        const mnRes = await fetch('/api/transport/maintenance', { headers });
        if (mnRes.ok) setMaintenanceLogs(await mnRes.json());
      }
    } catch (err) {
      console.error('Error loading transport data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Form Submissions
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport/vehicles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(vehicleForm),
      });
      if (res.ok) {
        setIsVehicleModalOpen(false);
        fetchData();
        setVehicleForm({
          vehicleNumber: '',
          vehicleType: 'BUS',
          capacity: 32,
          fuelType: 'DIESEL',
          modelYear: '2022',
          bluebookExpiryBs: '2083-12-30',
          insuranceExpiryBs: '2083-12-30',
          pollutionExpiryBs: '2083-12-30',
          status: 'ACTIVE',
          notes: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error creating vehicle');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport/routes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(routeForm),
      });
      if (res.ok) {
        setIsRouteModalOpen(false);
        fetchData();
        setRouteForm({
          routeNameEn: '',
          routeNameNp: '',
          startPoint: '',
          endPoint: '',
          vehicleId: '',
          driverId: '',
          helperId: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error creating route');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport/stops', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...stopForm, routeId: selectedRouteForStop }),
      });
      if (res.ok) {
        setIsStopModalOpen(false);
        fetchData();
        setStopForm({
          routeId: '',
          stopOrder: 1,
          stopNameEn: '',
          stopNameNp: '',
          morningPickupTime: '07:30',
          eveningDropTime: '16:00',
          monthlyFare: 1500,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport/allocations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(allocForm),
      });
      if (res.ok) {
        setIsAllocModalOpen(false);
        fetchData();
        setAllocForm({
          studentId: '',
          routeId: '',
          stopId: '',
          startDateBs: '2083-01-15',
          remarks: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error allocating student');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport/maintenance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintForm),
      });
      if (res.ok) {
        setIsMaintModalOpen(false);
        fetchData();
        setMaintForm({
          vehicleId: '',
          logDateBs: '2083-01-15',
          logType: 'FUEL',
          odometerKm: '',
          fuelQuantityLiters: '',
          totalCost: '',
          vendorName: '',
          invoiceNo: '',
          remarks: '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (endpoint: string, id: string) => {
    if (!confirm(isNp ? 'के तपाईं यो विवरण मेटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this?')) return;
    try {
      const res = await fetch(`/api/transport/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Find stops for selected route in allocation modal
  const stopsForSelectedRoute = useMemo(() => {
    if (!allocForm.routeId) return [];
    const r = routes.find((rt) => rt.id === allocForm.routeId);
    return r?.stops || [];
  }, [allocForm.routeId, routes]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bus className="w-7 h-7 text-amber-500" />
            {isNp ? 'विद्यालय यातायात तथा बस सेवा व्यवस्थापन' : 'School Transport & Fleet Management'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isNp
              ? 'सवारी साधन, रुट र बस स्टप, विद्यार्थी सिट बाँडफाँड, इन्धन तथा मर्मत लगबुक'
              : 'Fleet inventory, routes, stop fares, student bus allocations and fuel/maintenance logging'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'vehicles' && (
            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ सवारी साधन दर्ता' : 'Add Vehicle'}
            </button>
          )}
          {activeTab === 'routes' && (
            <button
              onClick={() => setIsRouteModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ रुट निर्माण' : 'Add New Route'}
            </button>
          )}
          {activeTab === 'allocations' && (
            <button
              onClick={() => setIsAllocModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'विद्यार्थी सिट तोक्नुहोस्' : 'Allocate Student'}
            </button>
          )}
          {activeTab === 'maintenance' && (
            <button
              onClick={() => setIsMaintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'खर्च / मर्मत लग थप्नुहोस्' : 'Log Maintenance/Fuel'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'सवारी साधन (Fleet)' : 'Total Vehicles'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalVehicles) : stats.totalVehicles}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                {isNp ? `${toDevanagariDigits(stats.activeVehicles)} सञ्चालनमा` : `${stats.activeVehicles} Active`}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'सञ्चालित रुटहरू' : 'Active Routes'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.activeRoutes) : stats.activeRoutes}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNp ? `सिट क्षमता: ${toDevanagariDigits(stats.totalCapacity)}` : `Capacity: ${stats.totalCapacity}`}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'यात्री विद्यार्थी' : 'Bus Students'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalAllocatedStudents) : stats.totalAllocatedStudents}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {isNp ? 'सिट बाँडफाँड गरिएको' : 'Seats Assigned'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'मासिक अनुमानित भाडा' : 'Est. Monthly Fare'}</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                रू. {isNp ? toDevanagariDigits(stats.estimatedMonthlyTransportRevenue) : stats.estimatedMonthlyTransportRevenue.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNp ? `मर्मत खर्च: रू. ${toDevanagariDigits(stats.totalMaintenanceExpenses)}` : `Maint: रू. ${stats.totalMaintenanceExpenses}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'vehicles'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Bus className="w-4 h-4" />
          {isNp ? 'सवारी साधन (Fleet)' : 'Vehicles & Fleet'}
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'routes'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {isNp ? 'रुट तथा बस स्टप (Routes & Stops)' : 'Routes & Stops'}
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'allocations'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          {isNp ? 'विद्यार्थी सिट बाँडफाँड (Passengers)' : 'Student Allocations'}
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          {isNp ? 'मर्मत तथा इन्धन लगबुक (Maintenance)' : 'Maintenance & Fuel'}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. VEHICLES TAB */}
      {/* ========================================================= */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-1 text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded font-bold font-mono">
                    {v.vehicleNumber}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">{v.vehicleType}</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    v.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  }`}
                >
                  {v.status}
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>{isNp ? 'सिट उपयोग क्षमता' : 'Seat Occupancy'}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {isNp ? toDevanagariDigits(v.currentOccupancy || 0) : v.currentOccupancy || 0} / {isNp ? toDevanagariDigits(v.capacity) : v.capacity} ({v.occupancyPercentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (v.occupancyPercentage || 0) > 90
                        ? 'bg-rose-500'
                        : (v.occupancyPercentage || 0) > 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${v.occupancyPercentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Compliance & Expiry Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isNp ? 'ब्लुबुक म्याद:' : 'Bluebook Expiry:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {isNp ? toDevanagariDigits(v.bluebookExpiryBs) : v.bluebookExpiryBs}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isNp ? 'बीमा म्याद:' : 'Insurance Expiry:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {isNp ? toDevanagariDigits(v.insuranceExpiryBs) : v.insuranceExpiryBs}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isNp ? 'इन्धन प्रकार:' : 'Fuel Type:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{v.fuelType}</span>
                </div>
              </div>

              {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleDelete('vehicles', v.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ROUTES & STOPS TAB */}
      {/* ========================================================= */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          {routes.map((rt) => (
            <div
              key={rt.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    {isNp ? rt.routeNameNp : rt.routeNameEn}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rt.startPoint} ➔ {rt.endPoint}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium rounded-full">
                    {isNp ? `${toDevanagariDigits(rt.totalAllocatedStudents || 0)} जना विद्यार्थी` : `${rt.totalAllocatedStudents || 0} Students`}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRouteForStop(rt.id);
                      setStopForm({ ...stopForm, routeId: rt.id, stopOrder: (rt.stops?.length || 0) + 1 });
                      setIsStopModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isNp ? 'बस स्टप थप्नुहोस्' : 'Add Stop'}
                  </button>
                  <button
                    onClick={() => setPrintManifestData(rt)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {isNp ? 'यात्री सूची' : 'Manifest'}
                  </button>
                </div>
              </div>

              {/* Staff / Vehicle Assignment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block">{isNp ? 'तोकिएको गाडी:' : 'Vehicle:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {rt.vehicle?.vehicleNumber || (isNp ? 'तोकिएको छैन' : 'Unassigned')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isNp ? 'चालक (Driver):' : 'Driver:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {rt.driver ? `${rt.driver.fullName} (${rt.driver.phone})` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isNp ? 'सह-चालक (Helper):' : 'Helper:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {rt.helper ? `${rt.helper.fullName} (${rt.helper.phone})` : '-'}
                  </span>
                </div>
              </div>

              {/* Stops Timeline Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {isNp ? 'बस स्टप तथा समय-तालिका' : 'Bus Stops & Timetable'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-100 dark:border-slate-800">
                    <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2 w-12 text-center">#</th>
                        <th className="p-2">{isNp ? 'बस स्टपको नाम' : 'Stop Name'}</th>
                        <th className="p-2 w-28">{isNp ? 'बिहानी पिकअप' : 'Pickup'}</th>
                        <th className="p-2 w-28">{isNp ? 'बेलुकी ड्रप' : 'Drop'}</th>
                        <th className="p-2 w-28">{isNp ? 'मासिक भाडा' : 'Monthly Fare'}</th>
                        <th className="p-2 w-12 text-center">{isNp ? 'हटाउनु' : 'Del'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rt.stops && rt.stops.length > 0 ? (
                        rt.stops.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2 text-center font-bold text-slate-400">{st.stopOrder}</td>
                            <td className="p-2 font-medium text-slate-900 dark:text-slate-100">
                              {isNp ? st.stopNameNp : st.stopNameEn}
                              <span className="block text-[11px] text-slate-400">{st.stopNameEn}</span>
                            </td>
                            <td className="p-2 text-emerald-600 font-semibold">{st.morningPickupTime}</td>
                            <td className="p-2 text-sky-600 font-semibold">{st.eveningDropTime}</td>
                            <td className="p-2 font-bold text-slate-800 dark:text-slate-200">
                              रू. {isNp ? toDevanagariDigits(st.monthlyFare) : st.monthlyFare}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleDelete('stops', st.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            {isNp ? 'कुनै बस स्टप थपिएको छैन।' : 'No stops added.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STUDENT ALLOCATIONS TAB */}
      {/* ========================================================= */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={isNp ? 'विद्यार्थी, दर्ता नं वा बस स्टप खोजी...' : 'Search student, stop...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 w-full sm:w-auto"
            >
              <option value="ALL">{isNp ? 'सबै रुटहरू' : 'All Routes'}</option>
              {routes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {isNp ? rt.routeNameNp : rt.routeNameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Allocation Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-3">{isNp ? 'विद्यार्थीको नाम' : 'Student'}</th>
                  <th className="p-3 w-28">{isNp ? 'कक्षा / सेक्सन' : 'Class/Sec'}</th>
                  <th className="p-3">{isNp ? 'तोकिएको रुट र गाडी' : 'Route & Vehicle'}</th>
                  <th className="p-3">{isNp ? 'बस स्टप (Stop)' : 'Boarding Stop'}</th>
                  <th className="p-3 w-28">{isNp ? 'समय (पिकअप/ड्रप)' : 'Schedule'}</th>
                  <th className="p-3 w-28">{isNp ? 'मासिक भाडा' : 'Fare'}</th>
                  <th className="p-3 w-20 text-center">{isNp ? 'रद्द' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isNp ? 'कुनै विद्यार्थी बस सेवामा बाँडफाँड भएको छैन।' : 'No students allocated yet.'}
                    </td>
                  </tr>
                ) : (
                  allocations
                    .filter((al) => selectedRouteFilter === 'ALL' || al.routeId === selectedRouteFilter)
                    .filter(
                      (al) =>
                        !searchQuery ||
                        al.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        al.stopName.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((al) => (
                      <tr key={al.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                          {isNp ? al.studentNameNp : al.studentNameEn}
                          <span className="block text-xs text-slate-400 font-mono">
                            {al.admissionNo ? `Roll: ${al.rollNumber || '-'} | Adm: ${al.admissionNo}` : ''}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {al.className} {al.sectionName ? `(${al.sectionName})` : ''}
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {al.routeName}
                          <span className="block text-xs text-amber-600 font-mono font-medium">
                            {al.vehicleNumber}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400">
                          {isNp ? al.stopNameNp : al.stopNameEn}
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                          {al.morningPickupTime} / {al.eveningDropTime}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                          रू. {isNp ? toDevanagariDigits(al.monthlyFare) : al.monthlyFare}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDelete('allocations', al.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Unassign"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MAINTENANCE & FUEL TAB */}
      {/* ========================================================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-3 w-28">{isNp ? 'मिति (वि.सं.)' : 'Date BS'}</th>
                  <th className="p-3 w-32">{isNp ? 'गाडी नं' : 'Vehicle'}</th>
                  <th className="p-3 w-32">{isNp ? 'खर्च शीर्षक' : 'Log Type'}</th>
                  <th className="p-3 w-28">{isNp ? 'इन्धन (लिटर)' : 'Fuel Liters'}</th>
                  <th className="p-3 w-28">{isNp ? 'ओडोमिटर (किमि)' : 'Odometer'}</th>
                  <th className="p-3 w-32">{isNp ? 'कुल खर्च (रू.)' : 'Total Cost'}</th>
                  <th className="p-3">{isNp ? 'विक्रेता / पम्प' : 'Vendor'}</th>
                  <th className="p-3 w-16 text-center">{isNp ? 'कार्य' : 'Del'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {maintenanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isNp ? 'कुनै मर्मत वा इन्धन खर्च दर्ता भएको छैन।' : 'No maintenance logs recorded.'}
                    </td>
                  </tr>
                ) : (
                  maintenanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {isNp ? toDevanagariDigits(log.logDateBs) : log.logDateBs}
                      </td>
                      <td className="p-3 font-mono font-medium text-amber-700 dark:text-amber-400">
                        {log.vehicleNumber}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-700 dark:text-slate-300">
                          {log.logType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {log.fuelQuantityLiters ? `${log.fuelQuantityLiters} L` : '-'}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-xs">
                        {log.odometerKm ? `${log.odometerKm} km` : '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        रू. {isNp ? toDevanagariDigits(log.totalCost) : log.totalCost.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-600 text-xs">
                        {log.vendorName || '-'}
                        {log.invoiceNo && <span className="block text-slate-400">Inv: {log.invoiceNo}</span>}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete('maintenance', log.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD VEHICLE */}
      {/* ========================================================= */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bus className="w-5 h-5 text-amber-500" />
                {isNp ? 'नयाँ सवारी साधन दर्ता' : 'Register Vehicle'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'सवारी नम्बर' : 'Vehicle Plate No'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.vehicleNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="उदा: बा २ ख ३४५६"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'सिट क्षमता' : 'Capacity (Seats)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'प्रकार' : 'Type'}
                  </label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="BUS">बस (Bus)</option>
                    <option value="MINIBUS">मिनीबस (Minibus)</option>
                    <option value="VAN">भ्यान (Van)</option>
                    <option value="MICRO">माइक्रो (Micro)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'इन्धन प्रकार' : 'Fuel Type'}
                  </label>
                  <select
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="DIESEL">डिजेल (Diesel)</option>
                    <option value="PETROL">पेट्रोल (Petrol)</option>
                    <option value="ELECTRIC">विद्युतीय (Electric)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'ब्लुबुक म्याद (वि.सं.)' : 'Bluebook Expiry'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.bluebookExpiryBs}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, bluebookExpiryBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'बीमा म्याद (वि.सं.)' : 'Insurance Expiry'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.insuranceExpiryBs}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiryBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कैफियत / विवरण' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={vehicleForm.notes}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="रुट वा गाडीको थप अवस्था..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD ROUTE */}
      {/* ========================================================= */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                {isNp ? 'नयाँ रुट निर्माण' : 'Create Route'}
              </h3>
              <button onClick={() => setIsRouteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'रुटको नाम (नेपाली)' : 'Route Name (Nepali)'} *
                </label>
                <input
                  type="text"
                  required
                  value={routeForm.routeNameNp}
                  onChange={(e) => setRouteForm({ ...routeForm, routeNameNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: रुट २: सानेपा - पुल्चोक - कुपण्डोल"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'रुटको नाम (अङ्ग्रेजी)' : 'Route Name (English)'} *
                </label>
                <input
                  type="text"
                  required
                  value={routeForm.routeNameEn}
                  onChange={(e) => setRouteForm({ ...routeForm, routeNameEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Route 2: Sanepa - Pulchowk - Kupondole"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'सुरु विन्दु' : 'Start Point'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={routeForm.startPoint}
                    onChange={(e) => setRouteForm({ ...routeForm, startPoint: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="सानेपा चोक"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'अन्तिम विन्दु' : 'End Point'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={routeForm.endPoint}
                    onChange={(e) => setRouteForm({ ...routeForm, endPoint: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="विद्यालय मूल गेट"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'गाडी तोक्नुहोस्' : 'Vehicle'}
                  </label>
                  <select
                    value={routeForm.vehicleId}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- छनोट --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'चालक (Driver)' : 'Driver'}
                  </label>
                  <select
                    value={routeForm.driverId}
                    onChange={(e) => setRouteForm({ ...routeForm, driverId: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- छनोट --</option>
                    {staffList
                      .filter((s) => s.role === 'DRIVER')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'सह-चालक' : 'Helper'}
                  </label>
                  <select
                    value={routeForm.helperId}
                    onChange={(e) => setRouteForm({ ...routeForm, helperId: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- छनोट --</option>
                    {staffList
                      .filter((s) => s.role === 'HELPER')
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'रुट सुरक्षित गर्नुहोस्' : 'Save Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD STOP */}
      {/* ========================================================= */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                {isNp ? 'बस स्टप थप्नुहोस्' : 'Add Stop'}
              </h3>
              <button onClick={() => setIsStopModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStop} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'बस स्टपको नाम (नेपाली)' : 'Stop Name (Nepali)'} *
                </label>
                <input
                  type="text"
                  required
                  value={stopForm.stopNameNp}
                  onChange={(e) => setStopForm({ ...stopForm, stopNameNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: जावलाखेल चोक"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'बस स्टपको नाम (अङ्ग्रेजी)' : 'Stop Name (English)'} *
                </label>
                <input
                  type="text"
                  required
                  value={stopForm.stopNameEn}
                  onChange={(e) => setStopForm({ ...stopForm, stopNameEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Jawalakhel Chowk"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'बिहान पिकअप समय' : 'Morning Pickup Time'} *
                  </label>
                  <input
                    type="time"
                    required
                    value={stopForm.morningPickupTime}
                    onChange={(e) => setStopForm({ ...stopForm, morningPickupTime: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'बेलुकी ड्रप समय' : 'Evening Drop Time'} *
                  </label>
                  <input
                    type="time"
                    required
                    value={stopForm.eveningDropTime}
                    onChange={(e) => setStopForm({ ...stopForm, eveningDropTime: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'मासिक भाडा दर (रू.)' : 'Monthly Fare (NPR)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={stopForm.monthlyFare}
                    onChange={(e) => setStopForm({ ...stopForm, monthlyFare: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'क्रम संख्या' : 'Stop Order'}
                  </label>
                  <input
                    type="number"
                    value={stopForm.stopOrder}
                    onChange={(e) => setStopForm({ ...stopForm, stopOrder: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStopModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'स्टप थप्नुहोस्' : 'Save Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ALLOCATE STUDENT */}
      {/* ========================================================= */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {isNp ? 'विद्यार्थी सिट बाँडफाँड' : 'Allocate Student to Bus'}
              </h3>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'विद्यार्थी छनोट गर्नुहोस्' : 'Select Student'} *
                </label>
                <select
                  required
                  value={allocForm.studentId}
                  onChange={(e) => setAllocForm({ ...allocForm, studentId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- विद्यार्थी छनोट --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.admissionNo ? `[${st.admissionNo}] ` : ''}
                      {st.firstNameNp || st.firstNameEn} {st.lastNameNp || st.lastNameEn || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'यातायात रुट' : 'Select Route'} *
                </label>
                <select
                  required
                  value={allocForm.routeId}
                  onChange={(e) => setAllocForm({ ...allocForm, routeId: e.target.value, stopId: '' })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- रुट छनोट --</option>
                  {routes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {isNp ? rt.routeNameNp : rt.routeNameEn} ({rt.vehicle?.vehicleNumber || 'No Bus'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'चढ्ने / ओर्लने बस स्टप' : 'Boarding Stop'} *
                </label>
                <select
                  required
                  disabled={!allocForm.routeId}
                  value={allocForm.stopId}
                  onChange={(e) => setAllocForm({ ...allocForm, stopId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
                >
                  <option value="">-- बस स्टप छनोट --</option>
                  {stopsForSelectedRoute.map((st) => (
                    <option key={st.id} value={st.id}>
                      {isNp ? st.stopNameNp : st.stopNameEn} (रू. {st.monthlyFare}/महिना, Pickup: {st.morningPickupTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'सुरु मिति (वि.सं.)' : 'Start Date (BS)'} *
                </label>
                <input
                  type="text"
                  required
                  value={allocForm.startDateBs}
                  onChange={(e) => setAllocForm({ ...allocForm, startDateBs: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'बाँडफाँड गर्नुहोस्' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MAINTENANCE / FUEL LOG */}
      {/* ========================================================= */}
      {isMaintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-rose-600" />
                {isNp ? 'सवारी खर्च तथा इन्धन लगबुक' : 'Log Maintenance / Fuel Expense'}
              </h3>
              <button onClick={() => setIsMaintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'सवारी साधन' : 'Vehicle'} *
                  </label>
                  <select
                    required
                    value={maintForm.vehicleId}
                    onChange={(e) => setMaintForm({ ...maintForm, vehicleId: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- छनोट --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'खर्च मिति (वि.सं.)' : 'Log Date (BS)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={maintForm.logDateBs}
                    onChange={(e) => setMaintForm({ ...maintForm, logDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'खर्च शीर्षक (Type)' : 'Log Type'} *
                  </label>
                  <select
                    value={maintForm.logType}
                    onChange={(e) => setMaintForm({ ...maintForm, logType: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="FUEL">इन्धन (Fuel / Diesel)</option>
                    <option value="SERVICING">सर्भिसिङ (Servicing)</option>
                    <option value="REPAIR">मर्मत (Repair)</option>
                    <option value="PARTS_REPLACEMENT">पार्ट्स फेरबदल (Parts)</option>
                    <option value="TAX_RENEWAL">कर/ब्लुबुक नवीकरण (Tax/Renewal)</option>
                    <option value="INSURANCE_RENEWAL">बीमा नवीकरण (Insurance)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'कुल रकम (रू.)' : 'Total Cost (NPR)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={maintForm.totalCost}
                    onChange={(e) => setMaintForm({ ...maintForm, totalCost: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'इन्धन मात्रा (लिटर)' : 'Fuel Quantity (Liters)'}
                  </label>
                  <input
                    type="number"
                    value={maintForm.fuelQuantityLiters}
                    onChange={(e) => setMaintForm({ ...maintForm, fuelQuantityLiters: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="उदा: 30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'ओडोमिटर (किलोमिटर)' : 'Odometer (KM)'}
                  </label>
                  <input
                    type="number"
                    value={maintForm.odometerKm}
                    onChange={(e) => setMaintForm({ ...maintForm, odometerKm: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="उदा: 45200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पम्प वा वर्कशपको नाम' : 'Vendor / Pump Name'}
                  </label>
                  <input
                    type="text"
                    value={maintForm.vendorName}
                    onChange={(e) => setMaintForm({ ...maintForm, vendorName: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="साझा पेट्रोल पम्प"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'बिल / इनभोइस नं' : 'Invoice Number'}
                  </label>
                  <input
                    type="text"
                    value={maintForm.invoiceNo}
                    onChange={(e) => setMaintForm({ ...maintForm, invoiceNo: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="INV-9921"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMaintModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'खर्च सुरक्षित गर्नुहोस्' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRINT ROUTE PASSENGER MANIFEST */}
      {/* ========================================================= */}
      {printManifestData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
                {isNp ? 'यात्री विद्यार्थी सूची (Bus Manifest)' : 'Passenger Manifest'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print'}
                </button>
                <button onClick={() => setPrintManifestData(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="text-center space-y-1 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {isNp ? school?.nameNp : school?.nameEn}
              </h2>
              <p className="text-xs font-semibold text-amber-800">
                {isNp ? 'यातायात रुट यात्रु तथा विद्यार्थी नामावली' : 'Transport Route Passenger Manifest'}
              </p>
              <p className="text-xs text-slate-600">
                {isNp ? printManifestData.routeNameNp : printManifestData.routeNameEn} | गाडी: {printManifestData.vehicle?.vehicleNumber || '-'}
              </p>
            </div>

            {/* Driver & Staff Info */}
            <div className="flex justify-between text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
              <div>
                <p><strong>चालक (Driver):</strong> {printManifestData.driver?.fullName || '-'} ({printManifestData.driver?.phone || '-'})</p>
              </div>
              <div className="text-right">
                <p><strong>सह-चालक (Helper):</strong> {printManifestData.helper?.fullName || '-'} ({printManifestData.helper?.phone || '-'})</p>
              </div>
            </div>

            {/* List */}
            <table className="w-full text-left text-xs border border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2 w-10 text-center">#</th>
                  <th className="p-2">विद्यार्थीको नाम</th>
                  <th className="p-2">कक्षा</th>
                  <th className="p-2">बस स्टप (Stop)</th>
                  <th className="p-2">पिकअप समय</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allocations
                  .filter((a) => a.routeId === printManifestData.id)
                  .map((al, idx) => (
                    <tr key={al.id}>
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2 font-medium">{al.studentName}</td>
                      <td className="p-2">{al.className}</td>
                      <td className="p-2">{al.stopName}</td>
                      <td className="p-2 font-semibold">{al.morningPickupTime}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="pt-8 flex justify-between text-xs text-slate-600">
              <div>यातायात इन्चार्ज दस्तखत: _________________</div>
              <div>प्रधानाध्यापक दस्तखत: _________________</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportManagement;
