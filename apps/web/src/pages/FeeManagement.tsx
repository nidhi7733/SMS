import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { toDevanagariDigits } from '@sms/shared';
import {
  Receipt,
  QrCode,
  CreditCard,
  Banknote,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  FileText,
  Upload,
  Eye,
  Download,
  PlusCircle,
  X,
  FileCheck2,
  Calendar,
  User,
  School as SchoolIcon,
  Phone,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  Sliders,
  Sparkles,
  Pencil,
} from 'lucide-react';

interface FeeHead {
  id: string;
  code: string;
  nameEn: string;
  nameNp: string;
  feeType: string;
  isActive: boolean;
  displayOrder: number;
  description?: string;
}

interface FeeStructure {
  id: string;
  academicYearId: string;
  classId: string;
  feeHeadId: string;
  amount: number;
  headNameEn?: string;
  headNameNp?: string;
  headCode?: string;
  feeType?: string;
  classNameEn?: string;
  classNameNp?: string;
}

interface StudentOption {
  id: string;
  studentId: string;
  firstNameEn: string;
  middleNameEn?: string;
  lastNameEn?: string;
  firstNameNp: string;
  middleNameNp?: string;
  lastNameNp?: string;
  currentClassId: string;
  currentRollNumber?: number;
  phone?: string;
  fatherNameEn?: string;
  fatherNameNp?: string;
}

interface FeeBillItem {
  id: string;
  feeHeadId: string;
  headNameEn: string;
  headNameNp: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
}

interface FeeBill {
  id: string;
  billNumber: string;
  studentId: string;
  monthBs: number;
  yearBs: number;
  titleEn: string;
  titleNp: string;
  subTotal: number;
  discountAmount: number;
  previousDue: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  dueDateBs?: string;
  items?: FeeBillItem[];
}

interface FeePayment {
  id: string;
  receiptNumber: string;
  studentId: string;
  amountPaid: number;
  paymentMode: string;
  transactionRef?: string;
  qrBankProvider?: string;
  paymentDateBs: string;
  paymentDateAd: string;
  remarks?: string;
  printedCount: number;
  studentNameEn?: string;
  studentNameNp?: string;
  classNameNp?: string;
}

interface StudentDiscount {
  id: string;
  studentId: string;
  studentNameEn?: string;
  studentNameNp?: string;
  admissionNumber?: string;
  rollNumber?: number;
  classNameEn?: string;
  classNameNp?: string;
  headNameEn?: string;
  headNameNp?: string;
  discountType: string;
  discountValue: number;
  reason: string;
  documentUrl?: string;
  documentName?: string;
  uploadedAt?: string;
}

interface ReceiptPayload {
  school: {
    nameEn: string;
    nameNp: string;
    addressEn: string;
    addressNp: string;
    phone: string;
    email: string;
    logoUrl?: string;
    feeQrCodeUrl?: string;
    feeMerchantName?: string;
    iemisCode?: string;
  };
  payment: FeePayment & {
    admissionNumber?: string;
    rollNumber?: number;
    classNameEn?: string;
    classNameNp?: string;
    receivedByName?: string;
  };
  bill?: FeeBill | null;
  billItems?: FeeBillItem[];
  outstandingDueRemaining: number;
}

const NEPALI_MONTHS = [
  { bs: 1, nameEn: 'Baisakh', nameNp: 'बैशाख' },
  { bs: 2, nameEn: 'Jestha', nameNp: 'जेठ' },
  { bs: 3, nameEn: 'Ashadh', nameNp: 'असार' },
  { bs: 4, nameEn: 'Shrawan', nameNp: 'साउन' },
  { bs: 5, nameEn: 'Bhadra', nameNp: 'भदौ' },
  { bs: 6, nameEn: 'Ashwin', nameNp: 'असोज' },
  { bs: 7, nameEn: 'Kartik', nameNp: 'कार्तिक' },
  { bs: 8, nameEn: 'Mangsir', nameNp: 'मंसिर' },
  { bs: 9, nameEn: 'Poush', nameNp: 'पुस' },
  { bs: 10, nameEn: 'Magh', nameNp: 'माघ' },
  { bs: 11, nameEn: 'Falgun', nameNp: 'फागुन' },
  { bs: 12, nameEn: 'Chaitra', nameNp: 'चैत' },
];

function numberToNepaliWords(amount: number): string {
  if (!amount || isNaN(amount)) return 'शून्य रुपैयाँ मात्र';
  const units = [
    '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दस',
    'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस', 'बीस',
    'एक्काइस', 'बाइस', 'तेइस', 'चौबिस', 'पच्चिस', 'छब्बीस', 'सत्ताइस', 'अठ्ठाइस', 'उनन्तिस', 'तीस',
    'एकत्तिस', 'बत्तीस', 'तेत्तीस', 'चौतीस', 'पैँतिस', 'छत्तीस', 'सैँतीस', 'अठतीस', 'उनन्चालीस', 'चालीस',
    'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैँतालीस', 'छयालीस', 'सत्चालीस', 'अठचालीस', 'उनन्पचास', 'पचास',
    'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चौवन्न', 'पचपन्न', 'छप्पन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी', 'साठी',
    'एकसट्ठी', 'बासट्ठी', 'त्रीसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी', 'सत्तरी',
    'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनन्असी', 'असी',
    'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनन्नब्बे', 'नब्बे',
    'एकानब्बे', 'बयानब्बे', 'त्रियानब्बे', 'चौरानब्बे', 'पन्चानब्बे', 'छयानब्बे', 'सन्तानब्बे', 'अन्ठानब्बे', 'उनन्सय', 'सय'
  ];

  let n = Math.floor(amount);
  if (n === 0) return 'शून्य रुपैयाँ मात्र';

  let words = '';
  if (Math.floor(n / 10000000) > 0) {
    const cr = Math.floor(n / 10000000);
    words += (units[cr] || cr) + ' करोड ';
    n %= 10000000;
  }
  if (Math.floor(n / 100000) > 0) {
    const lk = Math.floor(n / 100000);
    words += (units[lk] || lk) + ' लाख ';
    n %= 100000;
  }
  if (Math.floor(n / 1000) > 0) {
    const hz = Math.floor(n / 1000);
    words += (units[hz] || hz) + ' हजार ';
    n %= 1000;
  }
  if (Math.floor(n / 100) > 0) {
    const sy = Math.floor(n / 100);
    words += (units[sy] || sy) + ' सय ';
    n %= 100;
  }
  if (n > 0) {
    words += (units[n] || n) + ' ';
  }

  return words.trim() + ' रुपैयाँ मात्र';
}

function numberToEnglishWords(amount: number): string {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return a[num] + ' ';
    if (num < 100) return b[Math.floor(num / 10)] + ' ' + (num % 10 ? a[num % 10] + ' ' : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred ' + inWords(num % 100);
    if (num < 100000) return inWords(Math.floor(num / 1000)) + 'Thousand ' + inWords(num % 1000);
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + 'Lakh ' + inWords(num % 100000);
    return inWords(Math.floor(num / 10000000)) + 'Crore ' + inWords(num % 10000000);
  }

  const res = inWords(Math.floor(amount)).trim();
  return (res || 'Zero') + ' Rupees Only';
}

function formatAmountWords(amount: number, isNp: boolean): string {
  return isNp ? numberToNepaliWords(amount) : numberToEnglishWords(amount);
}

export const FeeManagement: React.FC = () => {
  const { language, t, formatNumber } = useLanguage();
  const isNp = language === 'np';
  const { school } = useSchool();
  const token = localStorage.getItem('sms_token') || '';

  // Active Tab: COLLECT | GENERATE_BILLS | STRUCTURES | DISCOUNTS | REPORTS
  const [activeTab, setActiveTab] = useState<'COLLECT' | 'GENERATE_BILLS' | 'STRUCTURES' | 'DISCOUNTS' | 'REPORTS'>('COLLECT');

  // Metadata
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);

  // Tab 1: Collection State
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentDueStatement, setStudentDueStatement] = useState<any>(null);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'QR_CODE' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [qrBankProvider, setQrBankProvider] = useState('Fonepay');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');

  // Official Receipt Print Modal State
  const [printableReceipt, setPrintableReceipt] = useState<ReceiptPayload | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Tab 2: Monthly Bill Generation State
  const [genYearBs, setGenYearBs] = useState(2083);
  const [genMonthBs, setGenMonthBs] = useState(1);
  const [genClassId, setGenClassId] = useState('');
  const [genDueDateBs, setGenDueDateBs] = useState('2083-01-25');
  const [isGeneratingBills, setIsGeneratingBills] = useState(false);
  const [billGenResult, setBillGenResult] = useState<string | null>(null);

  // Tab 3: Fee Structures State
  const [structureEditClassId, setStructureEditClassId] = useState('');
  const [isSavingStructures, setIsSavingStructures] = useState(false);
  const [structureSavedMsg, setStructureSavedMsg] = useState('');
  const [editStructureModalOpen, setEditStructureModalOpen] = useState(false);
  const [editClassId, setEditClassId] = useState('');
  const [editAmounts, setEditAmounts] = useState<Record<string, number>>({});
  const [newHeadModalOpen, setNewHeadModalOpen] = useState(false);
  const [newHeadForm, setNewHeadForm] = useState({
    code: '',
    nameEn: '',
    nameNp: '',
    feeType: 'MONTHLY',
    description: '',
  });

  // Tab 4: Student Discounts & Document Upload State
  const [discountsList, setDiscountsList] = useState<StudentDiscount[]>([]);
  const [isAddDiscountModalOpen, setIsAddDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    studentId: '',
    feeHeadId: '',
    discountType: 'PERCENTAGE',
    discountValue: 25,
    reason: 'MERIT',
    documentUrl: '',
    documentName: '',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSavingQr, setIsSavingQr] = useState(false);
  const [documentViewerModal, setDocumentViewerModal] = useState<{
    isOpen: boolean;
    url: string;
    name: string;
  }>({ isOpen: false, url: '', name: '' });

  // Tab 5: Daily Report & Dues State
  const [reportDateBs, setReportDateBs] = useState('2083-01-01');
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  const [duesReportData, setDuesReportData] = useState<any>(null);
  const [isQrSettingsModalOpen, setIsQrSettingsModalOpen] = useState(false);
  const [qrSettingsForm, setQrSettingsForm] = useState({
    feeQrCodeUrl: '',
    feeMerchantName: '',
  });

  // Load Initial Metadata
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Sync date from system when ready
  useEffect(() => {
    fetchDailyReport();
    fetchDuesReport();
  }, [reportDateBs]);

  const getToken = () => localStorage.getItem('sms_token') || '';

  const fetchMetadata = async () => {
    try {
      const activeToken = getToken();
      const [resClasses, resYears, resHeads, resStudents, resQr] = await Promise.all([
        fetch('/api/academic/classes', { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch('/api/academic/years', { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch('/api/fees/heads', { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch('/api/students', { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch('/api/fees/qr-settings', { headers: { Authorization: `Bearer ${activeToken}` } }),
      ]);

      if (resClasses.ok) {
        const cData = await resClasses.json();
        setClasses(Array.isArray(cData) ? cData : (cData.classes || []));
      }
      if (resYears.ok) {
        const yData = await resYears.json();
        setAcademicYears(Array.isArray(yData) ? yData : (yData.academicYears || []));
      }
      if (resHeads.ok) {
        const hData = await resHeads.json();
        setFeeHeads(Array.isArray(hData) ? hData : (hData.heads || hData.feeHeads || []));
      }
      if (resStudents.ok) {
        const studData = await resStudents.json();
        setAllStudents(Array.isArray(studData) ? studData : (studData.students || studData.items || []));
      }
      if (resQr.ok) {
        const qrData = await resQr.json();
        setQrSettingsForm({
          feeQrCodeUrl: qrData.feeQrCodeUrl || '',
          feeMerchantName: qrData.feeMerchantName || '',
        });
      }

      fetchFeeStructures();
      fetchDiscounts();
    } catch (err) {
      console.error('Error fetching fee metadata:', err);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      const activeToken = getToken();
      const res = await fetch('/api/fees/structures', { headers: { Authorization: `Bearer ${activeToken}` } });
      if (res.ok) {
        const data = await res.json();
        setFeeStructures(Array.isArray(data) ? data : (data.structures || []));
      }
    } catch (err) {
      console.error('Error fetching fee structures:', err);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const activeToken = getToken();
      const res = await fetch('/api/fees/discounts', { headers: { Authorization: `Bearer ${activeToken}` } });
      if (res.ok) {
        const data = await res.json();
        setDiscountsList(Array.isArray(data) ? data : (data.discounts || []));
      }
    } catch (err) {
      console.error('Error fetching fee discounts:', err);
    }
  };

  const fetchDailyReport = async () => {
    try {
      const activeToken = getToken();
      const res = await fetch(`/api/fees/reports/daily?dateBs=${reportDateBs}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDailyReportData(data);
      }
    } catch (err) {
      console.error('Error fetching daily report:', err);
    }
  };

  const fetchDuesReport = async () => {
    try {
      const activeToken = getToken();
      const res = await fetch('/api/fees/reports/dues', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDuesReportData(data);
      }
    } catch (err) {
      console.error('Error fetching dues report:', err);
    }
  };

  const handleSaveNewHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadForm.code || !newHeadForm.nameEn || !newHeadForm.nameNp) {
      alert('कृपया कोड, अंग्रेजी नाम र नेपाली नाम प्रविष्टि गर्नुहोस्।');
      return;
    }
    try {
      const res = await fetch('/api/fees/heads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newHeadForm),
      });
      if (res.ok) {
        setNewHeadModalOpen(false);
        setNewHeadForm({
          code: '',
          nameEn: '',
          nameNp: '',
          feeType: 'MONTHLY',
          description: '',
        });
        const resHeads = await fetch('/api/fees/heads', { headers: { Authorization: `Bearer ${getToken()}` } });
        if (resHeads.ok) {
          const hData = await resHeads.json();
          setFeeHeads(Array.isArray(hData) ? hData : (hData.heads || hData.feeHeads || []));
        }
      } else {
        const err = await res.json();
        alert(err.message || (isNp ? 'शीर्षक थप्न सकिएन' : 'Failed to add fee head'));
      }
    } catch (err) {
      console.error('Error adding fee head:', err);
    }
  };

  const handleOpenEditStructures = (targetClassId?: string) => {
    const clsId = targetClassId || structureEditClassId || (classes[0]?.id || '');
    setEditClassId(clsId);
    setStructureSavedMsg('');

    const amounts: Record<string, number> = {};
    (feeHeads || []).forEach((h) => {
      const existing = (feeStructures || []).find((s) => s.classId === clsId && s.feeHeadId === h.id);
      amounts[h.id] = existing ? Number(existing.amount) : 0;
    });
    setEditAmounts(amounts);
    setEditStructureModalOpen(true);
  };

  const handleClassChangeInEdit = (clsId: string) => {
    setEditClassId(clsId);
    const amounts: Record<string, number> = {};
    (feeHeads || []).forEach((h) => {
      const existing = (feeStructures || []).find((s) => s.classId === clsId && s.feeHeadId === h.id);
      amounts[h.id] = existing ? Number(existing.amount) : 0;
    });
    setEditAmounts(amounts);
  };

  const handleSaveStructures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassId) {
      alert(isNp ? 'कृपया कक्षा छान्नुहोस्।' : 'Please select a class.');
      return;
    }
    const currentYear = (academicYears || []).find((y) => y.isCurrent) || academicYears[0];
    if (!currentYear) {
      alert(isNp ? 'सक्रिय शैक्षिक सत्र फेला परेन।' : 'Active academic year not found.');
      return;
    }

    setIsSavingStructures(true);
    setStructureSavedMsg('');
    try {
      const items = (feeHeads || []).map((h) => ({
        academicYearId: currentYear.id,
        classId: editClassId,
        feeHeadId: h.id,
        amount: Number(editAmounts[h.id] || 0),
      }));

      const res = await fetch('/api/fees/structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(items),
      });

      if (res.ok) {
        setStructureSavedMsg(isNp ? 'कक्षागत शुल्क दर सफलतापूर्वक सुरक्षित गरियो!' : 'Class fee structures saved successfully!');
        setEditStructureModalOpen(false);
        fetchFeeStructures();
      } else {
        const err = await res.json();
        alert(err.message || (isNp ? 'शुल्क दर सुरक्षित गर्न सकिएन' : 'Failed to save fee structures'));
      }
    } catch (err) {
      console.error('Error saving fee structures:', err);
      alert(isNp ? 'शुल्क दर सुरक्षित गर्दा त्रुटि आयो' : 'Error saving fee structures');
    } finally {
      setIsSavingStructures(false);
    }
  };

  // Select student for fee collection
  const handleSelectStudent = async (student: StudentOption) => {
    setSelectedStudent(student);
    setSearchStudentTerm('');
    setPaymentSuccessMsg('');
    try {
      const res = await fetch(`/api/fees/students/${student.id}/due`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentDueStatement(data);
        setAmountToPay(data.totalDue > 0 ? data.totalDue : 0);
      }
    } catch (err) {
      console.error('Error fetching student due statement:', err);
    }
  };

  // Submit Payment Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || amountToPay <= 0) return;

    if (paymentMode === 'QR_CODE' && !transactionRef.trim()) {
      alert(isNp ? 'कृपया क्युआर भुक्तानीको ट्रान्जेक्सन आईडी (UTR/Ref ID) अनिवार्य प्रविष्टि गर्नुहोस्।' : 'Please enter the transaction reference / UTR ID for QR payment.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentSuccessMsg('');
    try {
      const res = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amountPaid: Number(amountToPay),
          paymentMode,
          transactionRef: transactionRef.trim() || undefined,
          qrBankProvider: paymentMode === 'QR_CODE' ? qrBankProvider : undefined,
          remarks: paymentRemarks || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentSuccessMsg(data.message || (isNp ? 'भुक्तानी सफल भयो!' : 'Payment received successfully!'));
        // Refresh student statement
        handleSelectStudent(selectedStudent);
        // Automatically open Printable Receipt
        if (data.payment?.id) {
          handleOpenReceipt(data.payment.id);
        }
        setTransactionRef('');
        setPaymentRemarks('');
      } else {
        const err = await res.json();
        alert(err.message || (isNp ? 'भुक्तानी प्रविष्टिमा त्रुटि आयो' : 'Error recording payment'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(isNp ? 'भुक्तानी प्रविष्टि गर्न सकिएन' : 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Official Printable Receipt
  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/fees/receipts/${paymentId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrintableReceipt(data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching printable receipt:', err);
    }
  };

  // Handle Document Upload via Base64 FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert(isNp ? 'फाइलको आकार ५ एमबी भन्दा सानो हुनुपर्छ।' : 'File size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDiscountForm((prev) => ({
        ...prev,
        documentUrl: reader.result as string,
        documentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle QR Image Upload via Base64 FileReader
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(isNp ? 'कृपया फोटो फाइल (PNG, JPG, JPEG) मात्र छनोट गर्नुहोस्।' : 'Please choose an image file (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(isNp ? 'फोटोको आकार ५ एमबी भन्दा सानो हुनुपर्छ।' : 'Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQrSettingsForm((prev) => ({
        ...prev,
        feeQrCodeUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Save Discount
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.studentId) {
      alert(isNp ? 'कृपया विद्यार्थी छनोट गर्नुहोस्।' : 'Please select a student.');
      return;
    }

    const currentYear = (academicYears || []).find((y) => y.isCurrent) || academicYears[0];
    if (!currentYear) {
      alert(isNp ? 'सक्रिय शैक्षिक सत्र फेला परेन।' : 'Active academic year not found.');
      return;
    }

    try {
      const res = await fetch('/api/fees/discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          studentId: discountForm.studentId,
          academicYearId: currentYear.id,
          feeHeadId: discountForm.feeHeadId || null,
          discountType: discountForm.discountType,
          discountValue: Number(discountForm.discountValue) || 0,
          reason: discountForm.reason,
          documentUrl: discountForm.documentUrl || null,
          documentName: discountForm.documentName || null,
        }),
      });

      if (res.ok) {
        setIsAddDiscountModalOpen(false);
        setDiscountForm({
          studentId: '',
          feeHeadId: '',
          discountType: 'PERCENTAGE',
          discountValue: 25,
          reason: 'MERIT',
          documentUrl: '',
          documentName: '',
        });
        fetchDiscounts();
      } else {
        const err = await res.json();
        alert(err.message || (isNp ? 'छुट सुरक्षित गर्न सकिएन' : 'Failed to save discount'));
      }
    } catch (err) {
      console.error('Error saving discount:', err);
    }
  };

  // Generate Monthly Bills
  const handleGenerateMonthlyBills = async () => {
    const currentYear = (academicYears || []).find((y) => y.isCurrent) || academicYears[0];
    if (!currentYear) {
      alert(isNp ? 'शैक्षिक सत्र फेला परेन।' : 'Academic year not found.');
      return;
    }

    setIsGeneratingBills(true);
    setBillGenResult(null);
    try {
      const res = await fetch('/api/fees/generate-monthly-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          academicYearId: currentYear.id,
          monthBs: Number(genMonthBs),
          yearBs: Number(genYearBs),
          classId: genClassId || undefined,
          dueDateBs: genDueDateBs || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBillGenResult(data.message || (isNp ? 'मासिक बिल सफलतापूर्वक तयार गरियो।' : 'Monthly bills generated successfully.'));
        if (selectedStudent) handleSelectStudent(selectedStudent);
      } else {
        alert(data.message || (isNp ? 'बिल उत्पादनमा त्रुटि आयो' : 'Error generating bills'));
      }
    } catch (err) {
      console.error('Error generating bills:', err);
      alert(isNp ? 'बिल उत्पादन गर्न सकिएन' : 'Failed to generate bills');
    } finally {
      setIsGeneratingBills(false);
    }
  };

  // Filter students for autocomplete search
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(allStudents) || !searchStudentTerm.trim()) return [];
    const term = searchStudentTerm.toLowerCase().trim();
    return allStudents
      .filter((s) => {
        if (!s) return false;
        if (filterClassId && s.currentClassId !== filterClassId) return false;
        const nameEn = `${s.firstNameEn || ''} ${s.middleNameEn || ''} ${s.lastNameEn || ''}`.toLowerCase();
        const nameNp = `${s.firstNameNp || ''} ${s.middleNameNp || ''} ${s.lastNameNp || ''}`.toLowerCase();
        const code = (s.studentId || '').toLowerCase();
        const roll = String(s.currentRollNumber || '');
        return nameEn.includes(term) || nameNp.includes(term) || code.includes(term) || roll === term;
      })
      .slice(0, 10);
  }, [allStudents, searchStudentTerm, filterClassId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-linear-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {isNp ? 'शुल्क तथा लेखा व्यवस्थापन' : 'Fee & Billing Management'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Stage 4 Active
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isNp
                ? 'शुल्क संकलन, २-प्रति रसिद, क्युआर भुक्तानी तथा प्रमाणिक कागजात'
                : 'Fee Collection, Bilingual 2-Up Receipts, QR Code Payments & Verification Documents'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsQrSettingsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>{isNp ? 'क्युआर सेटिङ' : 'QR Settings'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('COLLECT')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'COLLECT'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>{isNp ? 'शुल्क संकलन तथा रसिद' : 'Fee Collection & Receipts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('GENERATE_BILLS')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'GENERATE_BILLS'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isNp ? 'मासिक बिल उत्पादन' : 'Generate Monthly Bills'}</span>
        </button>

        <button
          onClick={() => setActiveTab('STRUCTURES')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'STRUCTURES'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{isNp ? 'शुल्क संरचना दर' : 'Fee Structures & Rates'}</span>
        </button>

        <button
          onClick={() => setActiveTab('DISCOUNTS')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'DISCOUNTS'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>{isNp ? 'छात्रवृत्ति तथा छुट' : 'Discounts & Scholarships'}</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'REPORTS'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{isNp ? 'वित्तीय प्रतिवेदन तथा बक्यौता' : 'Financial Reports & Dues'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COLLECT FEE & ISSUE RECEIPT */}
      {/* ========================================================================= */}
      {activeTab === 'COLLECT' && (
        <div className="space-y-6">
          {/* Student Search & Selection Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>{isNp ? 'विद्यार्थी खोज्नुहोस् तथा छनोट गर्नुहोस्' : 'Search & Select Student'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {isNp ? 'कक्षा फिल्टर' : 'Class Filter'}
                </label>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{isNp ? 'सबै कक्षाहरू' : 'All Classes'}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 relative">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {isNp ? 'विद्यार्थीको नाम, दर्ता नं वा रोल नं' : 'Search by Name, Admission ID or Roll No'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchStudentTerm}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                    placeholder={isNp ? 'उदा. रोशन अधिकारी, 2083-0001, वा रोल नं टाइप गर्नुहोस्...' : 'Search by student name, 2083-0001, or roll no...'}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {/* Dropdown Suggestions */}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredStudents.map((s) => {
                      const cls = classes.find((c) => c.id === s.currentClassId);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className="px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700/60 cursor-pointer border-b border-slate-100 dark:border-slate-750 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white text-sm">
                              {isNp
                                ? (s.firstNameNp ? `${s.firstNameNp} ${s.middleNameNp || ''} ${s.lastNameNp || ''}` : `${s.firstNameEn} ${s.lastNameEn}`)
                                : `${s.firstNameEn} ${s.middleNameEn || ''} ${s.lastNameEn || ''}`}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {isNp ? 'दर्ता नं' : 'ID'}: {s.studentId} | {isNp ? 'रोल नं' : 'Roll'}: {s.currentRollNumber || '-'} | {isNp ? 'कक्षा' : 'Class'}: {isNp ? (cls?.nameNp || cls?.nameEn || '-') : (cls?.nameEn || cls?.nameNp || '-')}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded">
                            {isNp ? 'छनोट गर्नुहोस्' : 'Select'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student Billing Profile & Payment Box */}
          {selectedStudent && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Student Details & Bills (2 spans) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-300 dark:border-emerald-800">
                        {isNp ? (selectedStudent.firstNameNp?.[0] || 'वि') : (selectedStudent.firstNameEn?.[0] || 'S')}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {isNp
                            ? `${selectedStudent.firstNameNp} ${selectedStudent.middleNameNp || ''} ${selectedStudent.lastNameNp || ''}`
                            : `${selectedStudent.firstNameEn} ${selectedStudent.middleNameEn || ''} ${selectedStudent.lastNameEn || ''}`}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedStudent.firstNameEn} {selectedStudent.lastNameEn} | {isNp ? 'दर्ता नं' : 'Admission ID'}: {selectedStudent.studentId}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800">
                        {isNp ? (studentDueStatement?.student?.classNameNp || 'कक्षा') : (studentDueStatement?.student?.classNameEn || 'Class')} ({isNp ? 'रोल नं' : 'Roll'}: {selectedStudent.currentRollNumber || '-'})
                      </span>
                    </div>
                  </div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {isNp ? 'कुल बिल रकम' : 'Total Billed Amount'}
                      </div>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        रु {Number(studentDueStatement?.totalCurrentBilled || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        {isNp ? 'कुल भुक्तानी' : 'Total Paid Amount'}
                      </div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        रु {Number(studentDueStatement?.totalPaid || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800/50">
                      <div className="text-xs text-rose-700 dark:text-rose-400">
                        {isNp ? 'बाँकी बक्यौता' : 'Due Remaining'}
                      </div>
                      <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                        रु {Number(studentDueStatement?.totalDue || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outstanding Monthly Bills Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                    <span>{isNp ? 'मासिक बिल विवरणहरू' : 'Monthly Bills Statement'}</span>
                    <span className="text-xs text-slate-500 font-normal">
                      {isNp ? `कुल ${studentDueStatement?.bills?.length || 0} वटा बिलहरू` : `Total ${studentDueStatement?.bills?.length || 0} Bills`}
                    </span>
                  </h3>

                  {studentDueStatement?.bills && studentDueStatement.bills.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-2.5 px-3">{isNp ? 'बिल नं' : 'Bill No'}</th>
                            <th className="py-2.5 px-3">{isNp ? 'महिना/शीर्षक' : 'Month / Head'}</th>
                            <th className="py-2.5 px-3 text-right">{isNp ? 'कुल बिल' : 'Total'}</th>
                            <th className="py-2.5 px-3 text-right">{isNp ? 'छुट' : 'Discount'}</th>
                            <th className="py-2.5 px-3 text-right">{isNp ? 'तिरेको' : 'Paid'}</th>
                            <th className="py-2.5 px-3 text-right">{isNp ? 'बाँकी' : 'Due'}</th>
                            <th className="py-2.5 px-3 text-center">{isNp ? 'स्थिति' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentDueStatement.bills.map((b: FeeBill) => (
                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                                {b.billNumber}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                                {isNp ? (b.titleNp || b.titleEn) : (b.titleEn || b.titleNp)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-900 dark:text-white">
                                रु {Number(b.totalAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                                {b.discountAmount > 0 ? `रु ${Number(b.discountAmount).toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                                रु {Number(b.paidAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                रु {Number(b.dueAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                                    b.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : b.status === 'PARTIAL'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {b.status === 'PAID' ? (isNp ? 'चुक्ता' : 'Paid') : b.status === 'PARTIAL' ? (isNp ? 'आंशिक' : 'Partial') : (isNp ? 'बाँकी' : 'Unpaid')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      {isNp ? 'यस विद्यार्थीको कुनै पनि मासिक बिल जारी गरिएको छैन।' : 'No monthly bills issued for this student yet.'}
                    </div>
                  )}
                </div>

                {/* Recent Receipts Table */}
                {studentDueStatement?.recentPayments && studentDueStatement.recentPayments.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                      {isNp ? 'हालै जारी गरिएका रसिदहरू' : 'Recent Payment Receipts'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-2 px-3">{isNp ? 'रसिद नं' : 'Receipt No'}</th>
                            <th className="py-2 px-3">{isNp ? 'मिति (BS)' : 'Date (BS)'}</th>
                            <th className="py-2 px-3">{isNp ? 'माध्यम' : 'Mode'}</th>
                            <th className="py-2 px-3">{isNp ? 'रकम (रु)' : 'Amount (NPR)'}</th>
                            <th className="py-2 px-3 text-right">{isNp ? 'कार्य' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentDueStatement.recentPayments.map((p: FeePayment) => (
                            <tr key={p.id}>
                              <td className="py-2 px-3 font-mono font-medium text-emerald-600">
                                {p.receiptNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{p.paymentDateBs}</td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-2xs bg-slate-100 dark:bg-slate-800">
                                  {p.paymentMode === 'QR_CODE' ? '📱 QR Pay' : p.paymentMode === 'CASH' ? (isNp ? '💵 नगद' : '💵 Cash') : p.paymentMode}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                रु {Number(p.amountPaid).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleOpenReceipt(p.id)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded border border-emerald-300 dark:border-emerald-800"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>{isNp ? 'रसिद छाप्नुहोस्' : 'Print Receipt'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Payment Collection Box (1 span) */}
              <div className="space-y-6">
                <form
                  onSubmit={handleSubmitPayment}
                  className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>{isNp ? 'शुल्क संकलन' : 'Collect Fee'}</span>
                    </h3>
                    <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 px-2 py-0.5 rounded-full font-semibold">
                      Live Collection
                    </span>
                  </div>

                  {paymentSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{paymentSuccessMsg}</span>
                    </div>
                  )}

                  {/* Amount to Collect Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isNp ? 'बुझाउने रकम (Amount to Pay - रु) *' : 'Amount to Pay (NPR) *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">रु</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={amountToPay || ''}
                        onChange={(e) => setAmountToPay(Number(e.target.value))}
                        className="w-full text-lg font-bold pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {amountToPay > 0 && (
                      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 italic">
                        {isNp ? 'अक्षरेपि:' : 'In Words:'} {formatAmountWords(amountToPay, isNp)}
                      </p>
                    )}
                  </div>

                  {/* Payment Mode Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isNp ? 'भुक्तानी माध्यम *' : 'Payment Mode *'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('CASH')}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMode === 'CASH'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>{isNp ? '💵 नगद (Cash)' : '💵 Cash'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMode('QR_CODE')}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMode === 'QR_CODE'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-blue-600" />
                        <span>{isNp ? '📱 क्युआर (QR Pay)' : '📱 QR Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMode('BANK_TRANSFER')}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMode === 'BANK_TRANSFER'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Landmark className="w-4 h-4 text-indigo-600" />
                        <span>{isNp ? '🏦 बैंक दाखिला' : '🏦 Bank Transfer'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMode('CHEQUE')}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMode === 'CHEQUE'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>{isNp ? '📜 चेक (Cheque)' : '📜 Cheque'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SPECIAL REQUIREMENT 2: Dedicated QR Code Payment Engine Card */}
                  {paymentMode === 'QR_CODE' && (
                    <div className="bg-gradient-to-b from-blue-50 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-850 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-2xs font-extrabold rounded">
                            Fonepay / NepalPay QR
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isNp ? 'स्क्यान गरी भुक्तानी' : 'Scan & Pay'}
                          </span>
                        </div>
                        <span className="text-2xs text-blue-700 dark:text-blue-300 font-semibold">
                          Exact Amount
                        </span>
                      </div>

                      {/* QR Display Frame */}
                      <div className="flex flex-col items-center bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center mb-1.5">
                          {qrSettingsForm.feeMerchantName || (isNp ? school?.nameNp : school?.nameEn) || (isNp ? 'विद्यालय' : 'School')}
                        </p>

                        <div className="relative p-2 bg-white rounded-lg border-2 border-dashed border-blue-400">
                          <img
                            src={
                              qrSettingsForm.feeQrCodeUrl ||
                              `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=fonepay://merchant?pan=9800000000&amt=${amountToPay}&name=${encodeURIComponent(
                                qrSettingsForm.feeMerchantName || 'School'
                              )}`
                            }
                            alt="Merchant Payment QR Code"
                            className="w-44 h-44 object-contain"
                          />
                        </div>

                        <div className="mt-2 text-center">
                          <span className="text-2xs text-slate-500 uppercase tracking-wider block">
                            {isNp ? 'भुक्तानी गर्नुपर्ने रकम' : 'Payable Amount'}
                          </span>
                          <span className="text-base font-extrabold text-blue-700 dark:text-blue-400">
                            रु {Number(amountToPay || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Reference & Provider inputs */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isNp ? 'QR वालेट/बैंक सेवाप्रदायक (Provider) *' : 'QR Wallet/Bank Provider *'}
                          </label>
                          <select
                            value={qrBankProvider}
                            onChange={(e) => setQrBankProvider(e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Fonepay">Fonepay (फोनपे)</option>
                            <option value="NepalPay">NepalPay (नेपालपे)</option>
                            <option value="eSewa">eSewa (ईसेवा)</option>
                            <option value="Khalti">Khalti (खल्ती)</option>
                            <option value="Global IME Bank">Global IME Bank QR</option>
                            <option value="Nabil Bank">Nabil Bank QR</option>
                            <option value="Other">अन्य वालेट/बैंक</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isNp ? 'ट्रान्जेक्सन आइडी / UTR Ref Number *' : 'Transaction ID / UTR Ref Number *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            placeholder="उदा. TXN-9821831 वा UTR नं..."
                            className="w-full text-xs font-mono font-bold rounded border border-blue-400 dark:border-blue-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="text-2xs text-slate-500 mt-0.5">
                            {isNp
                              ? 'अभिभावकको मोबाइलमा सफल भएको ट्रान्जेक्सन आईडी यहाँ टाइप गर्नुहोस्।'
                              : 'Enter the transaction ID or reference number from the mobile banking payment receipt.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer / Cheque Reference Inputs */}
                  {(paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE') && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        {paymentMode === 'CHEQUE'
                          ? (isNp ? 'चेक नम्बर तथा बैंक *' : 'Cheque Number & Bank *')
                          : (isNp ? 'भौचर / ट्रान्जेक्सन नम्बर *' : 'Voucher / Transaction Number *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="उदा. Cheque #001293 वा भौचर नं..."
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {/* Remarks input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {isNp ? 'कैफियत (Remarks / Optional)' : 'Remarks (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      placeholder={isNp ? 'उदा. बैशाख महिनाको पढाइ तथा कम्प्युटर शुल्क...' : 'e.g. Tuition fee for Baisakh...'}
                      className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingPayment || amountToPay <= 0}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                  >
                    {isSubmittingPayment ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>{isNp ? 'रकम बुझिलिई रसिद जारी गर्नुहोस्' : 'Receive Payment & Issue Receipt'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERATE MONTHLY BILLS */}
      {/* ========================================================================= */}
      {activeTab === 'GENERATE_BILLS' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isNp ? 'मासिक शुल्क बिल उत्पादन' : 'Generate Monthly Fee Bills'}
              </h2>
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'कक्षागत विद्यार्थीहरूको लागि एकमुष्ट मासिक बिल तथा पुरानो बक्यौता रोलओभर'
                  : 'Bulk monthly bill generation and rollover of unpaid dues for students by class'}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">
                {isNp ? 'स्वचालित हिसाब तथा बक्यौता मिलान नियम:' : 'Automatic Calculation & Due Adjustment Rules:'}
              </p>
              <p className="mt-0.5">
                {isNp
                  ? 'यस प्रक्रियाले कक्षागत शुल्क तालिका अनुसार शीर्षकगत रकम जोड्छ, विद्यार्थीको छात्रवृत्ति/छुट स्वतः घटाउँछ र विगतका महिनाको नतिरेको बक्यौता रकम (Previous Due) स्वतः नयाँ बिलमा थप गर्दछ।'
                  : 'This process sums fee head amounts according to class fee structures, automatically subtracts approved student discounts/scholarships, and rolls over previous unpaid balances to the new bill.'}
              </p>
            </div>
          </div>

          {billGenResult && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{billGenResult}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'शैक्षिक वर्ष (BS Year)' : 'Academic Year (BS Year)'}
              </label>
              <input
                type="number"
                value={genYearBs}
                onChange={(e) => setGenYearBs(Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'कुन महिनाको बिल (Nepali BS Month) *' : 'Billing Month (Nepali BS Month) *'}
              </label>
              <select
                value={genMonthBs}
                onChange={(e) => setGenMonthBs(Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 font-medium"
              >
                {NEPALI_MONTHS.map((m) => (
                  <option key={m.bs} value={m.bs}>
                    {m.bs}. {isNp ? m.nameNp : m.nameEn} ({isNp ? m.nameEn : m.nameNp})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'लक्षित कक्षा (Target Class)' : 'Target Class'}
              </label>
              <select
                value={genClassId}
                onChange={(e) => setGenClassId(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">{isNp ? 'सबै कक्षाहरू (All Classes in School)' : 'All Classes in School'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'शुल्क तिर्ने अन्तिम मिति (Due Date BS)' : 'Payment Due Date (BS)'}
              </label>
              <input
                type="text"
                value={genDueDateBs}
                onChange={(e) => setGenDueDateBs(e.target.value)}
                placeholder="2083-01-25"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleGenerateMonthlyBills}
              disabled={isGeneratingBills}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
            >
              {isGeneratingBills ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isNp ? 'एकमुष्ट मासिक बिलहरू उत्पादन गर्नुहोस्' : 'Generate Bulk Monthly Bills'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEE STRUCTURES & RATES */}
      {/* ========================================================================= */}
      {activeTab === 'STRUCTURES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {isNp ? 'कक्षा फिल्टर:' : 'Class Filter:'}
              </label>
              <select
                value={structureEditClassId}
                onChange={(e) => setStructureEditClassId(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-slate-100"
              >
                <option value="">{isNp ? 'सबै कक्षाहरू (All Classes)' : 'All Classes'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleOpenEditStructures()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isNp ? 'कक्षागत शुल्क मिलाउनुहोस्' : 'Configure Class Fees'}</span>
              </button>

              <button
                onClick={() => setNewHeadModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isNp ? 'नयाँ शीर्षक थप्नुहोस्' : 'Add Fee Head'}</span>
              </button>
            </div>
          </div>

          {structureSavedMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{structureSavedMsg}</span>
            </div>
          )}

          {/* Structures Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {isNp ? 'कक्षागत शुल्क दर तालिका' : 'Class Fee Rates Matrix'}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3">{isNp ? 'कक्षा' : 'Class'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'शुल्क शीर्षक' : 'Fee Head'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'प्रकार' : 'Fee Type'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'निर्धारित रकम (रु)' : 'Standard Rate (NPR)'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'कार्य' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {feeStructures
                    .filter((st) => !structureEditClassId || st.classId === structureEditClassId)
                    .map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {isNp ? (st.classNameNp || st.classNameEn) : (st.classNameEn || st.classNameNp)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {isNp ? (st.headNameNp || st.headNameEn) : (st.headNameEn || st.headNameNp)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-2xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {st.feeType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          रु {Number(st.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenEditStructures(st.classId)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-2xs font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{isNp ? 'मिलाउनुहोस्' : 'Edit'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DISCOUNTS & SCHOLARSHIPS WITH SUPPORTING DOCUMENT UPLOAD */}
      {/* ========================================================================= */}
      {activeTab === 'DISCOUNTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isNp ? 'छात्रवृत्ति, छुट तथा प्रमाणिक कागजात व्यवस्थापन' : 'Scholarships, Discounts & Proof Documents'}
              </h3>
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'जेहेन्दार, विपन्न, वा सहोदर छुटका लागि वडा सिफारिस पत्र, जन्मदर्ता वा लब्धांक पत्र अपलोड गर्नुहोस्'
                  : 'Upload verification documents (ward recommendations, birth certificate, marksheet) for merit, need-based or sibling discounts'}
              </p>
            </div>

            <button
              onClick={() => setIsAddDiscountModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isNp ? 'नयाँ छात्रवृत्ति / छुट दर्ता गर्नुहोस्' : 'Register New Discount / Scholarship'}</span>
            </button>
          </div>

          {/* Discounts Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3">{isNp ? 'विद्यार्थीको नाम' : 'Student Name'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'दर्ता / रोल नं' : 'Reg / Roll No'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'कक्षा' : 'Class'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'लागु हुने शीर्षक' : 'Fee Head'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'छुट प्रतिशत/रकम' : 'Discount Rate'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'कारण' : 'Reason'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'प्रमाणिक कागजात' : 'Verification Document'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {discountsList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {isNp ? (d.studentNameNp || d.studentNameEn) : (d.studentNameEn || d.studentNameNp)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {d.admissionNumber} ({d.rollNumber || '-'})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {isNp ? (d.classNameNp || d.classNameEn) : (d.classNameEn || d.classNameNp)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {isNp ? (d.headNameNp || 'सबै शीर्षक') : (d.headNameEn || 'All Fee Heads')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {d.discountType === 'PERCENTAGE'
                          ? (isNp ? `${d.discountValue}% छुट` : `${d.discountValue}% Off`)
                          : d.discountType === 'FULL_WAIVER'
                          ? (isNp ? '१००% पूर्ण मिनाहा' : '100% Full Waiver')
                          : (isNp ? `रु ${d.discountValue} छुट` : `NPR ${d.discountValue} Off`)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {d.reason === 'MERIT'
                            ? (isNp ? 'जेहेन्दार (Merit)' : 'Merit Scholarship')
                            : d.reason === 'NEED_BASED'
                            ? (isNp ? 'विपन्न (Need Based)' : 'Need Based')
                            : d.reason === 'SIBLING'
                            ? (isNp ? 'सहोदर (Sibling)' : 'Sibling Discount')
                            : d.reason === 'STAFF_CHILD'
                            ? (isNp ? 'कर्मचारी सन्तति' : 'Staff Child')
                            : d.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {d.documentUrl ? (
                          <button
                            onClick={() =>
                              setDocumentViewerModal({
                                isOpen: true,
                                url: d.documentUrl!,
                                name: d.documentName || 'Verification Document',
                              })
                            }
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-2xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 rounded border border-blue-300 dark:border-blue-800"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isNp ? 'कागजात हेर्नुहोस्' : 'View Document'}</span>
                          </button>
                        ) : (
                          <span className="text-2xs text-slate-400 italic">{isNp ? 'कागजात छैन' : 'No Document'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {discountsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        {isNp ? 'कुनै पनि छात्रवृत्ति वा छुट दर्ता गरिएको छैन।' : 'No scholarships or discounts registered yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINANCIAL REPORTS & DUES DEFAULTERS */}
      {/* ========================================================================= */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Daily Collection Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{isNp ? 'आजको कुल संकलन' : "Today's Total Collection"}</span>
                <Banknote className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                रु {Number(dailyReportData?.summary?.totalAmount || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-2xs text-slate-400 mt-1">
                {dailyReportData?.summary?.totalTransactions || 0} {isNp ? 'वटा कारोबार' : 'Transactions'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{isNp ? '💵 नगद संकलन (Cash)' : '💵 Cash Collection'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                रु {Number(dailyReportData?.summary?.cashTotal || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-2xs text-slate-400 mt-1">{isNp ? 'काउन्टर नगद दाखिला' : 'Counter Cash Receipts'}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{isNp ? '📱 क्युआर संकलन (QR Pay)' : '📱 QR Collection'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                रु {Number(dailyReportData?.summary?.qrTotal || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-2xs text-slate-400 mt-1">{isNp ? 'Fonepay / NepalPay डिजिटल' : 'Digital QR Payments'}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{isNp ? '🏦 बैंक / चेक दाखिला' : '🏦 Bank / Cheque'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              </div>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                रु {Number((dailyReportData?.summary?.bankTotal || 0) + (dailyReportData?.summary?.chequeTotal || 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-2xs text-slate-400 mt-1">{isNp ? 'बैंक भौचर तथा चेक' : 'Bank Vouchers & Cheques'}</div>
            </div>
          </div>

          {/* Class-wise Dues Summary Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {isNp ? 'कक्षागत बक्यौता तथा संकलन दर' : 'Class-wise Collection & Dues'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3">{isNp ? 'कक्षा' : 'Class'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'विद्यार्थी संख्या' : 'Total Students'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'कुल बिल (रु)' : 'Total Billed (NPR)'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'कुल संकलन (रु)' : 'Total Collected (NPR)'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'बाँकी बक्यौता (रु)' : 'Remaining Due (NPR)'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'बक्यौता विद्यार्थी' : 'Defaulters'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'संकलन दर (%)' : 'Collection Rate (%)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {duesReportData?.classSummary?.map((cs: any) => (
                    <tr key={cs.classId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {isNp ? (cs.classNameNp || cs.classNameEn) : (cs.classNameEn || cs.classNameNp)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
                        {cs.studentCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        रु {Number(cs.totalBilled).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                        रु {Number(cs.totalPaid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                        रु {Number(cs.totalDue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">
                        {cs.defaulterCount} {isNp ? 'जना' : ''}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cs.collectionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defaulter List (बक्यौता बाँकी विद्यार्थीहरू) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>{isNp ? 'बक्यौता बाँकी विद्यार्थीहरूको सूची' : 'Outstanding Dues / Defaulters List'}</span>
              <span className="text-xs text-rose-600 font-bold">
                {isNp
                  ? `कुल ${duesReportData?.defaulters?.length || 0} जना विद्यार्थी`
                  : `Total ${duesReportData?.defaulters?.length || 0} Students`}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3">{isNp ? 'विद्यार्थीको नाम' : 'Student Name'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'दर्ता / रोल नं' : 'Reg / Roll No'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'कक्षा' : 'Class'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'अभिभावकको नाम' : 'Parent Name'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'सम्पर्क फोन' : 'Contact Phone'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'बाँकी बक्यौता (रु)' : 'Due Amount (NPR)'}</th>
                    <th className="py-2.5 px-3 text-center">{isNp ? 'कार्य' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {duesReportData?.defaulters?.slice(0, 30).map((df: any) => (
                    <tr key={df.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {isNp ? (df.fullNameNp || df.fullNameEn) : (df.fullNameEn || df.fullNameNp)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {df.admissionNumber} ({df.rollNumber || '-'})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {isNp ? (df.classNameNp || df.classNameEn) : (df.classNameEn || df.classNameNp)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{df.parentName || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono">
                        {df.parentPhone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                        रु {Number(df.totalDue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const found = allStudents.find((s) => s.id === df.studentId);
                            if (found) {
                              handleSelectStudent(found);
                              setActiveTab('COLLECT');
                            }
                          }}
                          className="px-2.5 py-1 text-2xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                        >
                          {isNp ? 'शुल्क संकलन' : 'Collect Fee'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: OFFICIAL 2-UP SPLIT RECEIPT PRINT ENGINE (SCHOOL + STUDENT COPY) */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && printableReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
            {/* Modal Controls (Hidden in Print) */}
            <div className="print:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">
                  {isNp ? 'आधिकारिक शुल्क रसिद' : 'Official Fee Receipt (2-Up Split)'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isNp ? 'छाप्नुहोस् (Print Receipt)' : 'Print Receipt'}</span>
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area with 2 Copies (School Copy & Student Copy) */}
            <div className="p-6 space-y-6 text-slate-900 font-sans print:p-3 print:space-y-4">
              {/* Copy Generator Helper */}
              {[
                { title: isNp ? 'विद्यालय प्रति (School Copy)' : 'Official School Copy', tag: 'OFFICIAL SCHOOL COPY' },
                { title: isNp ? 'विद्यार्थी / अभिभावक प्रति (Student Copy)' : 'Student / Parent Copy', tag: 'STUDENT COPY' },
              ].map((copy, index) => (
                <div key={index} className="space-y-4">
                  {/* Divider line before second copy */}
                  {index > 0 && (
                    <div className="border-t-2 border-dashed border-slate-400 my-6 pt-4 text-center text-xs text-slate-500 font-mono select-none">
                      {isNp
                        ? '✂️ --------------------------- कैंची चिन्ह (यहाँबाट काट्नुहोस् / Cut Along Line) ---------------------------'
                        : '✂️ --------------------------- Cut Along Line ---------------------------'}
                    </div>
                  )}

                  {/* Single Receipt Frame */}
                  <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/30 print:border-slate-400 print:bg-white text-xs">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-300 pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full border border-slate-300 bg-white flex items-center justify-center p-1">
                          <SchoolIcon className="w-8 h-8 text-emerald-700" />
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                            {isNp ? (printableReceipt.school.nameNp || printableReceipt.school.nameEn) : (printableReceipt.school.nameEn || printableReceipt.school.nameNp)}
                          </h2>
                          <p className="text-2xs text-slate-600 font-medium">
                            {printableReceipt.school.nameEn} | {isNp ? (printableReceipt.school.addressNp || printableReceipt.school.addressEn) : (printableReceipt.school.addressEn || printableReceipt.school.addressNp)}
                          </p>
                          <p className="text-2xs text-slate-500">
                            {isNp ? 'फोन:' : 'Phone:'} {printableReceipt.school.phone} | IEMIS: {printableReceipt.school.iemisCode || school?.iemisCode || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-2xs border border-emerald-300">
                          {copy.title}
                        </span>
                        <div className="font-mono font-bold text-sm text-emerald-700 mt-1">
                          {printableReceipt.payment.receiptNumber}
                        </div>
                        <div className="text-2xs text-slate-600 mt-0.5">
                          {isNp ? 'मिति:' : 'Date:'} {printableReceipt.payment.paymentDateBs} ({printableReceipt.payment.paymentDateAd})
                        </div>
                      </div>
                    </div>

                    {/* Student Info Bar */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-100 print:bg-slate-50 p-2.5 rounded my-3 text-2xs font-medium text-slate-800">
                      <div>
                        <span className="text-slate-500 block">{isNp ? 'विद्यार्थीको नाम:' : 'Student Name:'}</span>
                        <span className="font-bold text-xs">
                          {isNp
                            ? (printableReceipt.payment.studentNameNp || printableReceipt.payment.studentNameEn)
                            : (printableReceipt.payment.studentNameEn || printableReceipt.payment.studentNameNp)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isNp ? 'दर्ता नं:' : 'Admission No:'}</span>
                        <span className="font-mono font-semibold">{printableReceipt.payment.admissionNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isNp ? 'कक्षा र रोल नं:' : 'Class & Roll:'}</span>
                        <span className="font-semibold">
                          {printableReceipt.payment.classNameNp} ({isNp ? 'रोल:' : 'Roll:'} {printableReceipt.payment.rollNumber || '-'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isNp ? 'भुक्तानी माध्यम:' : 'Payment Mode:'}</span>
                        <span className="font-bold text-emerald-800">
                          {printableReceipt.payment.paymentMode === 'QR_CODE'
                            ? `📱 ${isNp ? 'डिजिटल क्युआर' : 'Digital QR'} (${printableReceipt.payment.qrBankProvider || 'Fonepay'})`
                            : printableReceipt.payment.paymentMode === 'CASH'
                            ? (isNp ? '💵 नगद (Cash)' : '💵 Cash')
                            : printableReceipt.payment.paymentMode}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Table if Bill items exist */}
                    {printableReceipt.billItems && printableReceipt.billItems.length > 0 && (
                      <div className="my-2">
                        <table className="w-full text-left text-2xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-300 text-slate-600 bg-slate-100/80">
                              <th className="py-1 px-2">{isNp ? 'क्र.सं.' : 'S.N.'}</th>
                              <th className="py-1 px-2">{isNp ? 'शुल्क शीर्षक' : 'Fee Head'}</th>
                              <th className="py-1 px-2 text-right">{isNp ? 'रकम (रु)' : 'Amount (NPR)'}</th>
                              <th className="py-1 px-2 text-right">{isNp ? 'छुट (रु)' : 'Discount (NPR)'}</th>
                              <th className="py-1 px-2 text-right">{isNp ? 'खुद रकम (रु)' : 'Net Amount (NPR)'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {printableReceipt.billItems.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="py-1 px-2 text-slate-500">{idx + 1}</td>
                                <td className="py-1 px-2 font-medium">
                                  {isNp ? (item.headNameNp || item.headNameEn) : (item.headNameEn || item.headNameNp)}
                                </td>
                                <td className="py-1 px-2 text-right">{Number(item.amount).toLocaleString('en-IN')}</td>
                                <td className="py-1 px-2 text-right text-emerald-700">
                                  {item.discountAmount > 0 ? Number(item.discountAmount).toLocaleString('en-IN') : '-'}
                                </td>
                                <td className="py-1 px-2 text-right font-semibold">{Number(item.netAmount).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Payment Summary Footer */}
                    <div className="border-t border-slate-300 pt-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-2xs font-semibold text-slate-800">
                          {isNp ? 'बुझाएको रकम अक्षरेपि:' : 'Amount in Words:'}{' '}
                          <span className="font-bold italic">
                            {formatAmountWords(printableReceipt.payment.amountPaid, isNp)}
                          </span>
                        </p>
                        {printableReceipt.payment.paymentMode === 'QR_CODE' && (
                          <div className="mt-1 flex items-center space-x-1.5 text-2xs text-blue-700 font-mono font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              QR Verified Ref: {printableReceipt.payment.transactionRef || 'N/A'} ({printableReceipt.payment.qrBankProvider || 'Fonepay'})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          {isNp ? 'प्राप्त रकम:' : 'Amount Received:'}{' '}
                          <span className="text-sm font-extrabold text-emerald-700">
                            रु {Number(printableReceipt.payment.amountPaid).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-2xs text-rose-600 font-medium">
                          {isNp ? 'बाँकी कुल बक्यौता:' : 'Remaining Balance:'} रु {Number(printableReceipt.outstandingDueRemaining || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-4 pt-6 text-center text-2xs text-slate-600">
                      <div>
                        <div className="border-t border-dotted border-slate-400 pt-1 font-medium">
                          {isNp ? 'बुझाउने (अभिभावक/विद्यार्थी)' : 'Payer (Student / Parent)'}
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dotted border-slate-400 pt-1 font-medium">
                          {isNp
                            ? `लेखापाल / क्यासियर (${printableReceipt.payment.receivedByName || 'लेखापाल'})`
                            : `Accountant / Cashier (${printableReceipt.payment.receivedByName || 'Accountant'})`}
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dotted border-slate-400 pt-1 font-medium">
                          {isNp ? 'प्रधानाध्यापकको हस्ताक्षर / छाप' : 'Principal Signature / Stamp'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SUPPORTING VERIFICATION DOCUMENT VIEWER */}
      {/* ========================================================================= */}
      {documentViewerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {isNp ? 'प्रमाणिक कागजात (Verification Document):' : 'Verification Document:'} {documentViewerModal.name}
                </span>
              </div>
              <button
                onClick={() => setDocumentViewerModal({ isOpen: false, url: '', name: '' })}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              {documentViewerModal.url.startsWith('data:image/') ||
              documentViewerModal.url.endsWith('.png') ||
              documentViewerModal.url.endsWith('.jpg') ||
              documentViewerModal.url.endsWith('.jpeg') ? (
                <img
                  src={documentViewerModal.url}
                  alt={documentViewerModal.name}
                  className="max-h-[70vh] object-contain rounded border border-slate-200 dark:border-slate-800"
                />
              ) : documentViewerModal.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={documentViewerModal.url}
                  className="w-full h-[70vh] rounded border border-slate-200 dark:border-slate-800"
                  title="PDF Viewer"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isNp
                      ? 'कागजात सुरक्षित रूपमा प्रणालीमा भण्डारण गरिएको छ।'
                      : 'The document is securely stored in the system.'}
                  </p>
                  <a
                    href={documentViewerModal.url}
                    download={documentViewerModal.name}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isNp ? 'कागजात डाउनलोड गर्नुहोस्' : 'Download Document'}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD STUDENT DISCOUNT WITH DOCUMENT UPLOAD */}
      {/* ========================================================================= */}
      {isAddDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDiscount}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isNp ? 'नयाँ छात्रवृत्ति / शुल्क छुट दर्ता' : 'Register Student Discount / Scholarship'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'विद्यार्थी छनोट (Select Student) *' : 'Select Student *'}
              </label>
              <select
                required
                value={discountForm.studentId}
                onChange={(e) => setDiscountForm({ ...discountForm, studentId: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">{isNp ? 'विद्यार्थी छनोट गर्नुहोस्...' : 'Select a student...'}</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isNp
                      ? `${s.firstNameNp} ${s.lastNameNp}`
                      : `${s.firstNameEn || s.firstNameNp} ${s.lastNameEn || s.lastNameNp}`}{' '}
                    ({s.studentId})
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Head */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'लागु हुने शीर्षक (Applicable Fee Head)' : 'Applicable Fee Head'}
              </label>
              <select
                value={discountForm.feeHeadId}
                onChange={(e) => setDiscountForm({ ...discountForm, feeHeadId: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">{isNp ? 'सम्पूर्ण शुल्क / पढाइ शुल्क (All Fees)' : 'All Fees / General'}</option>
                {feeHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {isNp ? (h.nameNp || h.nameEn) : (h.nameEn || h.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'छुट प्रकार (Type)' : 'Discount Type'}
                </label>
                <select
                  value={discountForm.discountType}
                  onChange={(e) => setDiscountForm({ ...discountForm, discountType: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="PERCENTAGE">{isNp ? 'प्रतिशत (Percentage %)' : 'Percentage (%)'}</option>
                  <option value="FIXED_AMOUNT">{isNp ? 'निश्चित रकम (Fixed Rs.)' : 'Fixed Amount (NPR)'}</option>
                  <option value="FULL_WAIVER">{isNp ? 'पूर्ण मिनाहा (Full 100%)' : 'Full Waiver (100%)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'छुट मान (Value)' : 'Discount Value'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountForm.discountValue}
                  onChange={(e) => setDiscountForm({ ...discountForm, discountValue: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'छुटको कारण / आधार (Reason)' : 'Discount Reason / Category'}
              </label>
              <select
                value={discountForm.reason}
                onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="MERIT">{isNp ? 'जेहेन्दार छात्रवृत्ति (Merit Scholarship)' : 'Merit Scholarship'}</option>
                <option value="NEED_BASED">{isNp ? 'विपन्न तथा लक्षित वर्ग (Need-Based / Poverty)' : 'Need-Based / Disadvantaged'}</option>
                <option value="SIBLING">{isNp ? 'सहोदर छुट (Sibling Discount)' : 'Sibling Discount'}</option>
                <option value="STAFF_CHILD">{isNp ? 'शिक्षक/कर्मचारी सन्तति (Staff Child)' : 'Staff Child'}</option>
                <option value="OTHER">{isNp ? 'अन्य विशेष निर्णय (Other)' : 'Other / Discretionary'}</option>
              </select>
            </div>

            {/* SPECIAL REQUIREMENT 1: Verification Document Upload */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>{isNp ? 'प्रमाणिक कागजात अपलोड (Upload Verification Proof)' : 'Upload Verification Proof Document'}</span>
                <span className="text-2xs text-slate-400 font-normal">PDF/JPG/PNG &lt; 5MB</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
              />

              <div className="flex items-center space-x-3 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-800 dark:text-slate-200 inline-flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isNp ? 'फाइल छनोट गर्नुहोस्' : 'Choose File'}</span>
                </button>

                {discountForm.documentName && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                    {discountForm.documentName}
                  </span>
                )}
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                {isNp
                  ? 'वडा कार्यालयको विपन्न सिफारिस, जन्मदर्ता वा पूर्व शैक्षिक ग्रेडसिट अपलोड गर्न सकिन्छ।'
                  : 'Upload ward recommendation letter, birth certificate, or academic marksheets.'}
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddDiscountModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isNp ? 'छुट सुरक्षित गर्नुहोस्' : 'Save Discount'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QR SETTINGS CONFIGURATION */}
      {/* ========================================================================= */}
      {isQrSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>{isNp ? 'विद्यालय क्युआर सेटिङ (QR Settings)' : 'School QR Payment Settings'}</span>
              </h3>
              <button
                onClick={() => setIsQrSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'मर्चन्ट / विद्यालयको नाम (Merchant / School Name) *' : 'Merchant / School Name *'}
              </label>
              <input
                type="text"
                value={qrSettingsForm.feeMerchantName}
                onChange={(e) => setQrSettingsForm({ ...qrSettingsForm, feeMerchantName: e.target.value })}
                placeholder={isNp ? 'श्री ज्ञानोदय नमूना माध्यमिक विद्यालय' : 'Shree Gyanodaya Secondary School'}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* QR Code File Upload & Live Preview */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isNp ? 'विद्यालयको भुक्तानी क्युआर कोड फोटो (Upload QR Image)' : 'School QR Payment Image'}
              </label>

              <input
                type="file"
                ref={qrFileInputRef}
                onChange={handleQrFileUpload}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
              />

              {qrSettingsForm.feeQrCodeUrl ? (
                <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border-2 border-dashed border-emerald-400 dark:border-emerald-600/60">
                  <p className="text-2xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                    {isNp ? '✓ क्युआर कोड फोटो तयार छ (QR Preview):' : '✓ QR Image Preview Ready:'}
                  </p>
                  <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200 dark:border-slate-700">
                    <img
                      src={qrSettingsForm.feeQrCodeUrl}
                      alt="Uploaded Merchant QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isNp ? 'अर्को फोटो छान्नुहोस्' : 'Change Photo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrSettingsForm((prev) => ({ ...prev, feeQrCodeUrl: '' }))}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 shadow-xs"
                    >
                      {isNp ? 'हटाउनुहोस्' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => qrFileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
                    {isNp ? 'कम्प्युटरबाट QR कोड फोटो अपलोड गर्नुहोस्' : 'Upload QR Code Image from Computer'}
                  </p>
                  <p className="text-2xs text-slate-400 mt-0.5 text-center">
                    {isNp
                      ? 'PNG, JPG, JPEG सम्म ५ एमबी (Fonepay, NepalPay, Bank QR)'
                      : 'PNG, JPG, JPEG up to 5MB (Fonepay, NepalPay, Bank QR)'}
                  </p>
                  <button
                    type="button"
                    className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-xs pointer-events-none"
                  >
                    {isNp ? 'फोटो छनोट गर्नुहोस्' : 'Select Photo'}
                  </button>
                </div>
              )}
            </div>

            {/* Optional URL input fallback */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {isNp ? 'वा सिधै फोटो लिङ्क राख्नुहोस् (Optional Image URL):' : 'Or enter Image URL (Optional):'}
              </label>
              <input
                type="text"
                value={qrSettingsForm.feeQrCodeUrl.startsWith('data:') ? '' : qrSettingsForm.feeQrCodeUrl}
                onChange={(e) => setQrSettingsForm({ ...qrSettingsForm, feeQrCodeUrl: e.target.value })}
                placeholder={qrSettingsForm.feeQrCodeUrl.startsWith('data:') ? (isNp ? '(अपलोड गरिएको फोटो सुरक्षित छ)' : '(Uploaded image ready)') : 'https://...'}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-slate-100 font-mono text-2xs"
              />
              <p className="text-2xs text-slate-400 mt-0.5">
                {isNp
                  ? 'खाली छाडेमा प्रणालीले पूर्वनिर्धारित Fonepay डायनामिक क्युआर प्रयोग गर्नेछ।'
                  : 'If left empty, system uses default dynamic Fonepay QR.'}
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsQrSettingsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {isNp ? 'बन्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSavingQr}
                onClick={async () => {
                  setIsSavingQr(true);
                  try {
                    const res = await fetch('/api/fees/qr-settings', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`,
                      },
                      body: JSON.stringify(qrSettingsForm),
                    });
                    if (res.ok) {
                      setIsQrSettingsModalOpen(false);
                      alert(isNp ? 'क्युआर सेटिङ तथा फोटो सफलतापूर्वक सुरक्षित गरियो!' : 'QR settings and image saved successfully!');
                      fetchMetadata();
                    } else {
                      const err = await res.json();
                      alert(err.message || (isNp ? 'क्युआर सेटिङ सुरक्षित गर्न सकिएन' : 'Failed to save QR settings'));
                    }
                  } catch (err) {
                    console.error('Error saving QR settings:', err);
                    alert(isNp ? 'क्युआर सुरक्षित गर्दा त्रुटि आयो' : 'Error saving QR settings');
                  } finally {
                    setIsSavingQr(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSavingQr ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{isNp ? 'सुरक्षित गर्नुहोस्' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD NEW FEE HEAD */}
      {newHeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNewHead}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isNp ? 'नयाँ शुल्क शीर्षक थप्नुहोस् (Add Fee Head)' : 'Add New Fee Head'}
              </h3>
              <button
                type="button"
                onClick={() => setNewHeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'शीर्षक कोड (Code) *' : 'Fee Head Code *'}
              </label>
              <input
                type="text"
                required
                value={newHeadForm.code}
                onChange={(e) => setNewHeadForm({ ...newHeadForm, code: e.target.value.toUpperCase() })}
                placeholder="उदा. TUITION, LAB, BUS"
                className="w-full text-xs uppercase font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'नेपाली नाम (Name in Nepali) *' : 'Name in Nepali *'}
              </label>
              <input
                type="text"
                required
                value={newHeadForm.nameNp}
                onChange={(e) => setNewHeadForm({ ...newHeadForm, nameNp: e.target.value })}
                placeholder={isNp ? 'उदा. मासिक पढाइ शुल्क' : 'e.g. मासिक पढाइ शुल्क'}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'अंग्रेजी नाम (Name in English) *' : 'Name in English *'}
              </label>
              <input
                type="text"
                required
                value={newHeadForm.nameEn}
                onChange={(e) => setNewHeadForm({ ...newHeadForm, nameEn: e.target.value })}
                placeholder="उदा. Monthly Tuition Fee"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'शुल्क प्रकार (Fee Frequency)' : 'Fee Frequency'}
              </label>
              <select
                value={newHeadForm.feeType}
                onChange={(e) => setNewHeadForm({ ...newHeadForm, feeType: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="MONTHLY">{isNp ? 'मासिक (MONTHLY)' : 'Monthly'}</option>
                <option value="ANNUAL">{isNp ? 'वार्षिक (ANNUAL)' : 'Annual'}</option>
                <option value="TERM">{isNp ? 'त्रैमासिक / परीक्षा (TERM)' : 'Term / Exam'}</option>
                <option value="ONE_TIME">{isNp ? 'एक पटक (ONE_TIME)' : 'One-Time / Admission'}</option>
                <option value="OPTIONAL">{isNp ? 'ऐच्छिक (OPTIONAL)' : 'Optional'}</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNewHeadModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isNp ? 'शीर्षक थप्नुहोस्' : 'Add Fee Head'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: SET / EDIT CLASS FEE STRUCTURES */}
      {editStructureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStructures}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isNp ? 'कक्षागत शुल्क दर निर्धारण / सम्पादन' : 'Configure Class Fee Structures'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditStructureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="shrink-0 flex items-center space-x-3 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-900/50">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {isNp ? 'कक्षा छान्नुहोस् (Select Class):' : 'Select Class:'}
              </label>
              <select
                value={editClassId}
                onChange={(e) => handleClassChangeInEdit(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-slate-100 flex-1"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'यस कक्षाका लागि प्रत्येक शीर्षकको मासिक वा वार्षिक शुल्क दर (रुपैयाँमा) प्रविष्टि गर्नुहोस्:'
                  : 'Enter monthly or periodic fee rate (in NPR) for each fee head in this class:'}
              </p>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">{isNp ? 'शुल्क शीर्षक' : 'Fee Head'}</th>
                      <th className="py-2 px-3">{isNp ? 'प्रकार' : 'Frequency'}</th>
                      <th className="py-2 px-3 text-right">{isNp ? 'दर (Amount रु)' : 'Rate (NPR)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {feeHeads.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {isNp ? (h.nameNp || h.nameEn) : (h.nameEn || h.nameNp)}
                          </div>
                          <div className="text-2xs text-slate-400 font-mono">{h.code}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-2xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {h.feeType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center space-x-1">
                            <span className="text-2xs text-slate-400">रु</span>
                            <input
                              type="number"
                              min="0"
                              value={editAmounts[h.id] ?? 0}
                              onChange={(e) =>
                                setEditAmounts({
                                  ...editAmounts,
                                  [h.id]: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-28 text-right font-bold text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {isNp ? 'जम्मा मासिक शुल्क:' : 'Total Monthly Fee:'} रु{' '}
                {feeHeads
                  .filter((h) => h.feeType === 'MONTHLY')
                  .reduce((sum, h) => sum + (Number(editAmounts[h.id]) || 0), 0)
                  .toLocaleString('en-IN')}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditStructureModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingStructures}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSavingStructures ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{isNp ? 'शुल्क दर सुरक्षित गर्नुहोस्' : 'Save Rates'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
