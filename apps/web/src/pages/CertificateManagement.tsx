import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import {
  Award,
  FileCheck2,
  Printer,
  PlusCircle,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy,
  Trash2,
  X,
  Building2,
  Calendar,
  User,
  Hash,
  School,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Languages,
  Eye,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

interface CertificateRecord {
  id: string;
  schoolId: string;
  studentId: string;
  certificateType: 'SLC' | 'CHARACTER' | 'TRANSFER';
  certificateNo: string;
  classId: string;
  streamId?: string;
  passedAcademicYearBs: number;
  symbolNumber?: string;
  registrationNumber?: string;
  gpa?: string;
  divisionOrGrade?: string;
  characterRemarks: string;
  issueDateBs: string;
  isDuplicate: boolean;
  duplicateCount: number;
  reasonForLeaving: string;
  conductNotes?: string;
  remarks?: string;
  studentNameEn: string;
  studentNameNp: string;
  admissionNo?: string;
  rollNumber?: number;
  dobBs?: string;
  dobAd?: string;
  gender?: string;
  photoUrl?: string;
  fatherNameEn?: string;
  fatherNameNp?: string;
  motherNameEn?: string;
  motherNameNp?: string;
  classNameEn: string;
  classNameNp: string;
  classCode?: string;
  streamNameEn?: string;
  streamNameNp?: string;
  printCount?: number;
  firstPrintedAt?: string;
  lastPrintedAt?: string;
  createdAt: string;
}

interface StudentOption {
  id: string;
  studentId: string;
  firstNameEn: string;
  lastNameEn?: string;
  firstNameNp: string;
  lastNameNp?: string;
  dobBs?: string;
  dobAd?: string;
  photoUrl?: string;
  currentClassId: string;
  currentRollNumber?: number;
  fatherNameEn?: string;
  fatherNameNp?: string;
  motherNameEn?: string;
  motherNameNp?: string;
}

// School Seal SVG
const SchoolSealSvg = ({ schoolName }: { schoolName?: string }) => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 lg:w-20 lg:h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" stroke="#1E3A8A" strokeWidth="2.5" strokeDasharray="3 2" />
    <circle cx="50" cy="50" r="41" stroke="#B45309" strokeWidth="2" />
    <circle cx="50" cy="50" r="33" fill="#FEF3C7" fillOpacity="0.4" stroke="#B45309" strokeWidth="1" />
    {/* Torch and Open Book */}
    <path d="M36 55 Q50 48 64 55 L64 64 Q50 58 36 64 Z" fill="#1E3A8A" />
    <path d="M50 49 L50 63" stroke="#FEF3C7" strokeWidth="1.5" />
    <path d="M48 34 L52 34 L53 48 L47 48 Z" fill="#B45309" />
    <path d="M50 26 Q54 30 50 34 Q46 30 50 26 Z" fill="#DC2626" />
    <text x="50" y="74" fontSize="5" fill="#1E3A8A" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
      ESTD. 2028
    </text>
  </svg>
);

export const CertificateManagement: React.FC = () => {
  const { t, formatNumber, language } = useLanguage();
  const { school } = useSchool();

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintCert, setActivePrintCert] = useState<CertificateRecord | null>(null);

  // Print Language: 'BI' (Bilingual), 'NEP' (Nepali Only), 'ENG' (English Only)
  const [printLanguage, setPrintLanguage] = useState<'BI' | 'NEP' | 'ENG'>('BI');

  // Copy Type: 'ORIGINAL' (मूल प्रति) or 'DUPLICATE' (प्रतिलिपि)
  const [selectedCopyType, setSelectedCopyType] = useState<'ORIGINAL' | 'DUPLICATE'>('ORIGINAL');

  // Form State for Generating Certificate
  const [formData, setFormData] = useState({
    certificateType: 'SLC' as 'SLC' | 'CHARACTER' | 'TRANSFER',
    classId: '',
    streamId: '',
    studentId: '',
    passedAcademicYearBs: 2082,
    symbolNumber: '',
    registrationNumber: '',
    gpa: '3.60',
    divisionOrGrade: 'A',
    characterRemarks: 'उत्तम (Excellent)',
    reasonForLeaving: 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण',
    conductNotes: 'चारित्रिक आचरण अति उत्तम, अनुशासित तथा लगनशील रहेको।',
    issueDateBs: '2083-04-15',
    markAsGraduated: true,
    photoUrl: '',
  });

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentOption | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const token = localStorage.getItem('sms_token') || '';

  // Load baseline metadata
  useEffect(() => {
    fetchMetadata();
    fetchCertificates();
  }, []);

  // Handle ESC key to return back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPrintModalOpen(false);
        setIsGenerateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchMetadata = async () => {
    try {
      const [resClasses, resStreams, resStudents] = await Promise.all([
        fetch('/api/academic/classes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/streams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resClasses.ok) {
        const data = await resClasses.json();
        setClasses(data.classes || []);
        const c10 = (data.classes || []).find((c: any) => c.code === '10');
        if (c10) {
          setFormData((prev) => ({ ...prev, classId: c10.id }));
        }
      }
      if (resStreams.ok) {
        const data = await resStreams.json();
        setStreams(data.streams || []);
      }
      if (resStudents.ok) {
        const data = await resStudents.json();
        setStudents(data.students || []);
      }
    } catch (err: any) {
      console.error('Failed to load certificate metadata:', err);
    }
  };

  const fetchCertificates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedClassFilter !== 'ALL') params.append('classId', selectedClassFilter);
      if (selectedTypeFilter !== 'ALL') params.append('certificateType', selectedTypeFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/certificates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch certificates');
      }
      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching certificates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [selectedClassFilter, selectedTypeFilter, searchQuery]);

  // When class changes in modal, filter students
  const filteredStudentsForModal = useMemo(() => {
    if (!formData.classId) return [];
    return students.filter((s) => s.currentClassId === formData.classId);
  }, [students, formData.classId]);

  const handleStudentSelect = (studentId: string) => {
    const student = students.find((s) => s.id === studentId) || null;
    setSelectedStudentDetail(student);
    setFormData((prev) => ({
      ...prev,
      studentId,
      photoUrl: student?.photoUrl || '',
    }));
  };

  // Upload Photo for student
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, photoUrl: base64 }));
      if (selectedStudentDetail) {
        setSelectedStudentDetail((prev) => (prev ? { ...prev, photoUrl: base64 } : null));
        // Also save to database
        try {
          await fetch(`/api/students/${selectedStudentDetail.id}/photo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ photoUrl: base64 }),
          });
        } catch (err) {
          console.error('Failed to save student photo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Certificate Generation
  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.classId) {
      setError('Please select student and class');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate certificate');
      }

      setSuccessMessage(`Certificate ${data.certificate.certificateNo} issued successfully!`);
      setIsGenerateModalOpen(false);
      fetchCertificates();

      setActivePrintCert(data.certificate);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to issue certificate');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Duplicate Copy
  const handleIssueDuplicate = async (certId: string) => {
    if (!window.confirm('Are you sure you want to issue a Duplicate Copy (प्रतिलिपि) for this certificate?')) {
      return;
    }

    try {
      const res = await fetch(`/api/certificates/${certId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to issue duplicate');

      setSuccessMessage(`Duplicate copy #${data.certificate.duplicateCount} issued.`);
      fetchCertificates();
    } catch (err: any) {
      setError(err.message || 'Failed to issue duplicate');
    }
  };

  // Handle Delete Certificate
  const handleDeleteCertificate = async (certId: string) => {
    if (!window.confirm('Are you sure you want to cancel and delete this certificate record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/certificates/${certId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete certificate');
      setSuccessMessage('Certificate removed from registry.');
      fetchCertificates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete certificate');
    }
  };

  // Reset duplicate status (Revert to Original Copy)
  const handleResetDuplicate = async (certId: string) => {
    try {
      const res = await fetch(`/api/certificates/${certId}/reset-duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to reset certificate');
      setSuccessMessage('प्रमाणपत्रलाई मूल प्रति (Original) मा सफलतापूर्वक परिवर्तन गरियो।');
      fetchCertificates();
      if (activePrintCert && activePrintCert.id === certId) {
        setActivePrintCert((prev) => prev ? { ...prev, isDuplicate: false, duplicateCount: 0 } : null);
        setSelectedCopyType('ORIGINAL');
      }
    } catch (err: any) {
      setError(err.message || 'रिसेट गर्न सकिएन');
    }
  };

  // ================= DIRECT PRINT IN ISOLATED WINDOW =================
  // This opens a clean, blank window and triggers printer selection directly!
  const handleDirectPrint = (
    cert: CertificateRecord,
    mode: 'BI' | 'NEP' | 'ENG',
    copyType: 'ORIGINAL' | 'DUPLICATE' = 'ORIGINAL'
  ) => {
    const printWindow = window.open('', '_blank', 'width=950,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }

    // Log print in backend
    try {
      fetch(`/api/certificates/${cert.id}/record-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDuplicate: copyType === 'DUPLICATE' }),
      }).then(() => fetchCertificates());
    } catch (e) {
      console.error('Failed to log certificate print:', e);
    }

    const schoolNameNp = school?.nameNp || 'श्री राजेश्वर निधि माध्यमिक विद्यालय';
    const schoolNameEn = school?.nameEn || 'Shree Rajeshwar Nidhi Secondary School';
    const schoolAddressNp = school?.addressNp || 'टोखा-०४, काठमाडौं, बागमती प्रदेश, नेपाल';
    const schoolAddressEn = school?.addressEn || 'Tokha-04, Kathmandu, Bagmati Province, Nepal';
    const schoolPhone = school?.phone || '०१-४३५१२३४';
    const establishedBs = school?.establishedBsYear || 2028;
    const iemisCode = school?.iemisCode || '170720001';
    const logoUrl = school?.logoUrl || '';

    const schoolLogoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="School Logo" style="width: 72px; height: 72px; object-fit: contain;" />`
      : `<svg viewBox="0 0 100 100" style="width: 72px; height: 72px;" fill="none" xmlns="http://www.w3.org/2000/svg">
           <circle cx="50" cy="50" r="46" stroke="#1E3A8A" stroke-width="2.5" stroke-dasharray="3 2" />
           <circle cx="50" cy="50" r="41" stroke="#B45309" stroke-width="2" />
           <circle cx="50" cy="50" r="33" fill="#FEF3C7" fill-opacity="0.4" stroke="#B45309" stroke-width="1" />
           <path d="M36 55 Q50 48 64 55 L64 64 Q50 58 36 64 Z" fill="#1E3A8A" />
           <path d="M50 49 L50 63" stroke="#FEF3C7" stroke-width="1.5" />
           <path d="M48 34 L52 34 L53 48 L47 48 Z" fill="#B45309" />
           <path d="M50 26 Q54 30 50 34 Q46 30 50 26 Z" fill="#DC2626" />
           <text x="50" y="74" font-size="5" fill="#1E3A8A" text-anchor="middle" font-weight="bold" font-family="sans-serif">
             ESTD. ${establishedBs}
           </text>
         </svg>`;

    const titleNp =
      cert.certificateType === 'SLC'
        ? 'विद्यालय परित्याग प्रमाणपत्र'
        : cert.certificateType === 'CHARACTER'
        ? 'चारित्रिक प्रमाणपत्र'
        : 'स्थानान्तरण प्रमाणपत्र';

    const titleEn =
      cert.certificateType === 'SLC'
        ? 'SCHOOL LEAVING CERTIFICATE'
        : cert.certificateType === 'CHARACTER'
        ? 'CHARACTER CERTIFICATE'
        : 'TRANSFER CERTIFICATE';

    const fatherName = cert.fatherNameNp || cert.fatherNameEn || '....................';
    const motherName = cert.motherNameNp || cert.motherNameEn || '....................';
    const fatherNameEn = cert.fatherNameEn || cert.fatherNameNp || '....................';
    const motherNameEn = cert.motherNameEn || cert.motherNameNp || '....................';

    // Build Student Photo HTML
    const photoHtml = cert.photoUrl
      ? `<div style="width: 110px; height: 130px; border: 2px solid #78350f; border-radius: 4px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
           <img src="${cert.photoUrl}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" />
         </div>`
      : `<div style="width: 110px; height: 130px; border: 2px dashed #78350f; border-radius: 4px; background: rgba(254, 243, 199, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4px; box-sizing: border-box;">
           <div style="font-size: 20px; color: #78350f; margin-bottom: 4px;">📷</div>
           <div style="font-size: 10px; font-weight: bold; color: #78350f; line-height: 1.2;">विद्यार्थीको PP फोटो टाँस्ने स्थान</div>
           <div style="font-size: 8.5px; color: #64748b; font-style: italic; margin-top: 2px;">(Affix PP Photo)</div>
         </div>`;

    // Duplicate banner: ONLY IF copyType === 'DUPLICATE'
    const isDuplicatePrint = copyType === 'DUPLICATE';
    const duplicateHtml = isDuplicatePrint
      ? `<div style="position: absolute; top: 16px; right: 16px; border: 2px dashed #dc2626; color: #dc2626; padding: 4px 12px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; background: rgba(254, 242, 242, 0.95); z-index: 10; border-radius: 4px; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);">
           प्रतिलिपि (DUPLICATE COPY ${cert.duplicateCount > 0 ? '#' + cert.duplicateCount : ''})
         </div>`
      : '';

    // Declaration paragraph based on mode
    let declarationHtml = '';

    if (mode === 'NEP' || mode === 'BI') {
      declarationHtml += `
        <p style="margin-bottom: 12px; font-size: 14.5px; line-height: 1.8; text-align: justify;">
          प्रमाणित गरिन्छ कि श्री / सुश्री <b style="color: #451a03; text-decoration: underline dotted #78350f; font-size: 16px; padding: 0 4px;">${cert.studentNameNp || cert.studentNameEn}</b> 
          (पिता श्री <b style="text-decoration: underline dotted #78350f; padding: 0 2px;">${fatherName}</b> 
          तथा माता श्रीमती <b style="text-decoration: underline dotted #78350f; padding: 0 2px;">${motherName}</b>) 
          जन्म मिति वि.सं. <b style="font-family: monospace; padding: 0 2px;">${cert.dobBs || '...........'}</b> 
          (ई.सं. <b style="font-family: monospace; padding: 0 2px;">${cert.dobAd || '...........'}</b>) 
          यस विद्यालयको कक्षा <b style="color: #451a03; padding: 0 2px;">${cert.classNameNp || cert.classNameEn}</b>${cert.streamNameNp ? ` (${cert.streamNameNp} संकाय)` : ''} 
          मा नियमित विद्यार्थीको रूपमा अध्ययनरत रहनुभएको थियो। निजले वि.सं. <b>${cert.passedAcademicYearBs}</b> को 
          माध्यमिक शिक्षा परीक्षा (SEE) मा सिम्बोल नम्बर <b style="font-family: monospace;">${cert.symbolNumber || 'N/A'}</b> 
          तथा दर्ता नम्बर <b style="font-family: monospace;">${cert.registrationNumber || 'N/A'}</b> बाट सहभागी भई 
          GPA <b style="color: #1e3a8a;">${cert.gpa || '3.60'}</b> (ग्रेड <b style="color: #1e3a8a;">${cert.divisionOrGrade || 'A'}</b>) प्राप्त गरी उत्तीर्ण हुनुभएको छ।
        </p>
        <p style="margin-bottom: ${mode === 'BI' ? '12px' : '20px'}; font-size: 14.5px; line-height: 1.8; text-align: justify;">
          यस विद्यालयमा अध्ययनरत रहँदा निजको चालचलन तथा चारित्रिक आचरण <b style="color: #451a03; text-decoration: underline dotted #78350f; padding: 0 2px;">${cert.characterRemarks}</b> रहेको पाइएको छ। 
          निजले <b style="text-decoration: underline dotted #78350f; padding: 0 2px;">${cert.reasonForLeaving}</b> कारणले यस विद्यालयबाट परित्याग लिनुभएको हो। 
          निजको उत्तरोत्तर शैक्षिक प्रगति तथा उज्ज्वल भविष्यको हार्दिक शुभकामना व्यक्त गर्दछौं।
        </p>
      `;
    }

    if (mode === 'ENG' || mode === 'BI') {
      declarationHtml += `
        <div style="margin-top: ${mode === 'BI' ? '14px' : '0'}; padding-top: ${mode === 'BI' ? '12px' : '0'}; border-top: ${mode === 'BI' ? '1px dashed #d97706' : 'none'}; font-family: 'Times New Roman', serif;">
          <p style="margin-bottom: 12px; font-size: ${mode === 'BI' ? '13px' : '15px'}; line-height: 1.7; text-align: justify; color: ${mode === 'BI' ? '#334155' : '#0f172a'}; font-style: ${mode === 'BI' ? 'italic' : 'normal'};">
            This is to certify that Mr. / Ms. <b style="color: #0f172a; font-style: normal; font-size: ${mode === 'BI' ? '14px' : '16px'}; text-decoration: underline dotted #78350f;">${cert.studentNameEn}</b>, 
            son / daughter of Mr. <b style="font-style: normal;">${fatherNameEn}</b> 
            and Mrs. <b style="font-style: normal;">${motherNameEn}</b>, 
            born on <b style="font-style: normal; font-family: monospace;">${cert.dobBs} BS</b> (<b style="font-style: normal; font-family: monospace;">${cert.dobAd} AD</b>), 
            was a bonafide student of this school in Class <b style="color: #0f172a; font-style: normal;">${cert.classNameEn}</b>${cert.streamNameEn ? ` (${cert.streamNameEn})` : ''}. 
            He / She successfully completed and passed the Secondary Education Examination (SEE) in year <b style="font-style: normal;">${cert.passedAcademicYearBs} BS</b> 
            under Symbol No: <b style="font-style: normal; font-family: monospace;">${cert.symbolNumber || 'N/A'}</b> and 
            Registration No: <b style="font-style: normal; font-family: monospace;">${cert.registrationNumber || 'N/A'}</b>, 
            securing Grade Point Average (GPA) <b style="color: #1e3a8a; font-style: normal;">${cert.gpa || '3.60'}</b> (Grade <b style="color: #1e3a8a; font-style: normal;">${cert.divisionOrGrade || 'A'}</b>).
          </p>
          <p style="margin-bottom: 16px; font-size: ${mode === 'BI' ? '13px' : '15px'}; line-height: 1.7; text-align: justify; color: ${mode === 'BI' ? '#334155' : '#0f172a'}; font-style: ${mode === 'BI' ? 'italic' : 'normal'};">
            During his / her period of study in this institution, his / her moral character and conduct was found to be <b style="color: #0f172a; font-style: normal;">${cert.characterRemarks}</b>. 
            He / She has left this school on account of <b style="font-style: normal;">${cert.reasonForLeaving}</b>. We wish him / her every success in future academic endeavors.
          </p>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate_${cert.certificateNo}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-family: 'Times New Roman', 'Kalimati', serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cert-outer {
            border: 5px double #78350f;
            padding: 16px;
            border-radius: 8px;
            height: 98vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
          }
          .cert-inner {
            border: 1.5px solid rgba(120, 53, 15, 0.4);
            padding: 20px;
            border-radius: 4px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
          }
          .academic-box {
            background: rgba(254, 243, 199, 0.45);
            border: 1px solid rgba(180, 83, 9, 0.3);
            border-radius: 6px;
            padding: 10px 16px;
            margin: 12px 0;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            font-family: sans-serif;
            font-size: 12px;
          }
          .academic-box .item-label {
            color: #64748b;
            font-size: 10.5px;
          }
          .academic-box .item-val {
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
          }
          .footer-signs {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(120, 53, 15, 0.3);
            text-align: center;
            font-family: sans-serif;
            font-size: 12px;
          }
          .sign-line {
            border-top: 1.5px solid #1e293b;
            width: 140px;
            margin: 0 auto 4px auto;
            padding-top: 4px;
            font-weight: bold;
          }
          .seal-stamp {
            width: 70px;
            height: 70px;
            border: 2px dashed rgba(180, 83, 9, 0.5);
            border-radius: 50%;
            margin: -36px auto 10px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: #b45309;
            text-transform: uppercase;
            transform: rotate(12deg);
          }
        </style>
      </head>
      <body>
        <div class="cert-outer">
          <div class="cert-inner">
            ${duplicateHtml}

            <!-- Header Grid: Left Logo / Emblem | Center School Info | Right PP Photo -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid rgba(120, 53, 15, 0.4); padding-bottom: 12px;">
              <!-- Left: School Logo (Only School Logo) -->
              <div style="width: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;">
                  ${schoolLogoHtml}
                </div>
                <div style="font-size: 8.5px; font-weight: bold; color: #1e3a8a; margin-top: 4px; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
                  विद्यालयको लोगो
                </div>
              </div>

              <!-- Center: School Information -->
              <div style="flex: 1; text-align: center; padding: 0 12px;">
                <div style="font-size: 10.5px; font-weight: bold; letter-spacing: 0.5px; color: #475569; text-transform: uppercase; font-family: sans-serif;">
                  पाठ्यक्रम विकास केन्द्र (CDC) को पाठ्यक्रम तथा मूल्याङ्कन ढाँचा अनुरूप
                </div>
                <h1 style="margin: 3px 0 1px 0; font-size: 26px; font-weight: 900; color: #451a03; font-family: 'Times New Roman', serif; letter-spacing: -0.5px;">
                  ${schoolNameNp}
                </h1>
                <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1e293b; font-family: sans-serif; letter-spacing: 0.5px;">
                  ${schoolNameEn}
                </h2>
                <div style="font-size: 11.5px; color: #475569; font-family: sans-serif;">
                  ${schoolAddressNp} | फोन: ${schoolPhone}
                </div>
                <div style="font-size: 10.5px; font-family: monospace; color: #64748b; margin-top: 2px;">
                  स्थापना: वि.सं. ${establishedBs} | IEMIS Code: <b>${iemisCode}</b>
                </div>
              </div>

              <!-- Right: Student PP Photo Box -->
              <div style="width: 110px; display: flex; justify-content: flex-end;">
                ${photoHtml}
              </div>
            </div>

            <!-- Certificate Serial & Date Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 4px; font-size: 12px; font-family: sans-serif; color: #334155; font-weight: 600;">
              <div>
                <span>प्रमाणपत्र नं (Cert No): </span>
                <span style="font-family: monospace; font-weight: bold; color: #451a03; font-size: 13px;">${cert.certificateNo}</span>
                ${isDuplicatePrint ? '<span style="display: inline-block; background: #fee2e2; color: #dc2626; border: 1px solid #f87171; padding: 1px 7px; border-radius: 3px; font-size: 10.5px; font-weight: bold; margin-left: 8px;">प्रतिलिपि (DUPLICATE)</span>' : ''}
              </div>
              <div>
                <span>जारी मिति (Issue Date): </span>
                <span style="font-family: monospace; font-weight: bold;">${cert.issueDateBs} BS</span>
              </div>
            </div>

            <!-- Main Certificate Title -->
            <div style="text-align: center; margin: 10px 0 16px 0;">
              <div style="display: inline-block;">
                ${
                  mode === 'NEP' || mode === 'BI'
                    ? `<div style="font-size: 26px; font-weight: 900; color: #451a03; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2.5px solid rgba(120, 53, 15, 0.7); padding-bottom: 3px;">
                        ${titleNp}
                      </div>`
                    : ''
                }
                ${
                  mode === 'ENG' || mode === 'BI'
                    ? `<div style="font-size: ${mode === 'ENG' ? '24px' : '12px'}; font-weight: bold; color: ${mode === 'ENG' ? '#451a03' : '#475569'}; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; font-family: sans-serif; ${mode === 'ENG' ? 'border-bottom: 2.5px solid rgba(120, 53, 15, 0.7); padding-bottom: 3px;' : ''}">
                        ${titleEn}
                      </div>`
                    : ''
                }
              </div>
            </div>

            <!-- Body Declaration -->
            <div>
              ${declarationHtml}
            </div>

            <!-- Academic Performance Box -->
            <div class="academic-box">
              <div>
                <div class="item-label">उत्तीर्ण सत्र (Passed Year)</div>
                <div class="item-val">वि.सं. ${cert.passedAcademicYearBs}</div>
              </div>
              <div>
                <div class="item-label">सिम्बोल नम्बर (Symbol No)</div>
                <div class="item-val" style="font-family: monospace;">${cert.symbolNumber || 'N/A'}</div>
              </div>
              <div>
                <div class="item-label">दर्ता नम्बर (Registration No)</div>
                <div class="item-val" style="font-family: monospace;">${cert.registrationNumber || 'N/A'}</div>
              </div>
              <div>
                <div class="item-label">प्राप्त GPA / ग्रेड (Final GPA)</div>
                <div class="item-val" style="color: #1e3a8a;">GPA ${cert.gpa || '3.60'} (${cert.divisionOrGrade || 'A'})</div>
              </div>
            </div>

            <!-- Signatures Footer -->
            <div class="footer-signs">
              <div>
                <div class="sign-line">तयार गर्ने / जाँच्ने</div>
                <div style="font-size: 10.5px; color: #64748b;">Prepared By</div>
              </div>
              <div>
                <div class="seal-stamp">विद्यालयको छाप</div>
                <div class="sign-line">परीक्षा संयोजक</div>
                <div style="font-size: 10.5px; color: #64748b;">Exam Coordinator</div>
              </div>
              <div>
                <div class="sign-line">प्रधानाध्यापक</div>
                <div style="font-size: 10.5px; color: #64748b;">Headmaster / Principal</div>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Computed metrics
  const stats = useMemo(() => {
    const total = certificates.length;
    const slcCount = certificates.filter((c) => c.certificateType === 'SLC').length;
    const charCount = certificates.filter((c) => c.certificateType === 'CHARACTER').length;
    const duplicateCount = certificates.filter((c) => c.isDuplicate || c.duplicateCount > 0).length;
    return { total, slcCount, charCount, duplicateCount };
  }, [certificates]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2 border border-blue-400/30">
              <Award className="w-3.5 h-3.5" />
              <span>कक्षा १० (SEE) तथा १२ (NEB) प्रमाणीकरण प्रणाली</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              {language === 'np'
                ? 'प्रमाणपत्र व्यवस्थापन पोर्टल (SLC & Character Certificate)'
                : 'School Leaving & Character Certificate Portal'}
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              {language === 'np'
                ? 'माध्यमिक शिक्षा परीक्षा (SEE) तथा राष्ट्रिय परीक्षा बोर्ड (NEB) उत्तीर्ण विद्यार्थीहरूको लागि आधिकारिक विद्यालय परित्याग, चारित्रिक तथा स्थानान्तरण प्रमाणपत्र जारी र मुद्रण गर्नुहोस्।'
                : 'Issue, track, and print official School Leaving Certificates (SLC), Character Certificates, and Transfer Certificates with verified serials and duplicate copy controls.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 border border-blue-400/50"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{language === 'np' ? 'नयाँ प्रमाणपत्र जारी गर्नुहोस्' : 'Issue New Certificate'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-800/60 text-slate-100">
          <div className="bg-white/5 rounded-xl p-3.5 backdrop-blur-sm border border-white/10">
            <div className="text-xs font-medium text-blue-200">कुल जारी प्रमाणपत्र</div>
            <div className="text-2xl font-black text-white mt-1">{formatNumber(stats.total)}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 backdrop-blur-sm border border-white/10">
            <div className="text-xs font-medium text-emerald-300">कक्षा १० SLC (SEE)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{formatNumber(stats.slcCount)}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 backdrop-blur-sm border border-white/10">
            <div className="text-xs font-medium text-purple-300">चारित्रिक प्रमाणपत्र</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{formatNumber(stats.charCount)}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 backdrop-blur-sm border border-white/10">
            <div className="text-xs font-medium text-amber-300">जारी प्रतिलिपि (Duplicate)</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{formatNumber(stats.duplicateCount)}</div>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">कक्षा:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">सबै कक्षाहरू (All Classes)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameNp || c.nameEn} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Certificate Type Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">प्रकार:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">सबै प्रकार (All Types)</option>
              <option value="SLC">विद्यालय परित्याग प्रमाणपत्र (SLC)</option>
              <option value="CHARACTER">चारित्रिक प्रमाणपत्र (Character)</option>
              <option value="TRANSFER">स्थानान्तरण प्रमाणपत्र (Transfer)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="विद्यार्थी नाम, सिम्बोल नं, प्रमाणपत्र नं..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Certificates Registry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-slate-800 dark:text-slate-200">
              प्रमाणपत्र दर्ता सूची (Certificate Registry)
            </h2>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            जम्मा: {formatNumber(certificates.length)} प्रमाणपत्रहरू
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-semibold">लोड हुँदैछ...</div>
        ) : certificates.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">कुनै प्रमाणपत्र भेटिएन।</p>
            <p className="text-xs text-slate-400 mt-1">
              माथि रहेको "नयाँ प्रमाणपत्र जारी गर्नुहोस्" बटन थिचेर नयाँ प्रमाणपत्र जारी गर्न सक्नुहुन्छ।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">प्रमाणपत्र नं.</th>
                  <th className="py-3 px-4">तस्बिर</th>
                  <th className="py-3 px-4">विद्यार्थीको नाम</th>
                  <th className="py-3 px-4">कक्षा / संकाय</th>
                  <th className="py-3 px-4">प्रकार</th>
                  <th className="py-3 px-4">सिम्बोल / दर्ता नं</th>
                  <th className="py-3 px-4 text-center">GPA / ग्रेड</th>
                  <th className="py-3 px-4">जारी मिति (BS)</th>
                  <th className="py-3 px-4 text-center">प्रतिलिपि</th>
                  <th className="py-3 px-4 text-right">कार्यहरू</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {certificates.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-medium text-slate-800 dark:text-slate-200"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {cert.certificateNo}
                    </td>
                    <td className="py-3.5 px-4">
                      {cert.photoUrl ? (
                        <div className="w-10 h-12 rounded border border-slate-300 overflow-hidden shadow-sm bg-white">
                          <img src={cert.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-12 rounded border border-dashed border-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[10px]">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {cert.studentNameNp || cert.studentNameEn}
                      </div>
                      <div className="text-xs text-slate-500 font-normal">
                        {cert.studentNameEn} {cert.rollNumber ? `• Roll: ${formatNumber(cert.rollNumber)}` : ''}
                      </div>
                      {(cert.fatherNameNp || cert.fatherNameEn) && (
                        <div className="text-[11px] text-slate-400">
                          बुबा: {cert.fatherNameNp || cert.fatherNameEn}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{cert.classNameNp || cert.classNameEn}</span>
                      {cert.streamNameNp && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {cert.streamNameNp}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {cert.certificateType === 'SLC' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          SLC (परित्याग)
                        </span>
                      )}
                      {cert.certificateType === 'CHARACTER' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          चारित्रिक (CC)
                        </span>
                      )}
                      {cert.certificateType === 'TRANSFER' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          स्थानान्तरण (TC)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold">
                        {cert.symbolNumber ? `Sym: ${cert.symbolNumber}` : '-'}
                      </div>
                      {cert.registrationNumber && (
                        <div className="font-mono text-[11px] text-slate-500">Reg: {cert.registrationNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs border border-blue-200 dark:border-blue-900">
                        {cert.gpa ? formatNumber(cert.gpa) : '-'} ({cert.divisionOrGrade || 'PASS'})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {formatNumber(cert.issueDateBs)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        {cert.duplicateCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                            प्रतिलिपि #{formatNumber(cert.duplicateCount)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">मूल प्रति (Original)</span>
                        )}
                        {(cert.printCount || 0) > 0 && (
                          <span className="text-[10px] text-slate-400">
                            प्रिन्ट: {formatNumber(cert.printCount || 0)} पटक
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setActivePrintCert(cert);
                            setSelectedCopyType(cert.isDuplicate || cert.duplicateCount > 0 ? 'DUPLICATE' : 'ORIGINAL');
                            setIsPrintModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition flex items-center space-x-1"
                          title="प्रमाणपत्र हेर्नुहोस् र छाप्नुहोस्"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>पूर्वावलोकन</span>
                        </button>
                        <button
                          onClick={() => handleDirectPrint(cert, printLanguage, cert.isDuplicate || cert.duplicateCount > 0 ? 'DUPLICATE' : 'ORIGINAL')}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center space-x-1"
                          title="प्रिन्टर छनोट गरी सिधै प्रिन्ट गर्नुहोस्"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>प्रिन्ट</span>
                        </button>
                        {cert.duplicateCount > 0 && (
                          <button
                            onClick={() => handleResetDuplicate(cert.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-transparent hover:border-blue-200 transition text-xs font-semibold"
                            title="मूल प्रति (Original) मा रिसेट गर्नुहोस्"
                          >
                            रिसेट
                          </button>
                        )}
                        <button
                          onClick={() => handleIssueDuplicate(cert.id)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg border border-transparent hover:border-amber-200 transition"
                          title="प्रतिलिपि (Duplicate Copy) जारी गर्नुहोस्"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-transparent hover:border-rose-200 transition"
                          title="रद्द/मेटाउनुहोस्"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: GENERATE CERTIFICATE ================= */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">नयाँ प्रमाणपत्र जारी (Issue Certificate)</h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateCertificate} className="p-6 space-y-5">
              {/* Type and Class Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    प्रमाणपत्रको प्रकार (Type) *
                  </label>
                  <select
                    value={formData.certificateType}
                    onChange={(e: any) =>
                      setFormData({
                        ...formData,
                        certificateType: e.target.value,
                        reasonForLeaving:
                          e.target.value === 'SLC'
                            ? 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण'
                            : e.target.value === 'CHARACTER'
                            ? 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण'
                            : 'अन्य विद्यालयमा स्थानान्तरण',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    required
                  >
                    <option value="SLC">विद्यालय परित्याग प्रमाणपत्र (School Leaving Certificate)</option>
                    <option value="CHARACTER">चारित्रिक प्रमाणपत्र (Character Certificate)</option>
                    <option value="TRANSFER">स्थानान्तरण प्रमाणपत्र (Transfer Certificate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    कक्षा (Class) *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value, studentId: '' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    required
                  >
                    <option value="">कक्षा छनोट गर्नुहोस्</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameNp || c.nameEn} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  विद्यार्थी (Select Student) *
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">विद्यार्थी छनोट गर्नुहोस् ({filteredStudentsForModal.length} विद्यार्थी उपलब्ध)</option>
                  {filteredStudentsForModal.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstNameNp} {st.lastNameNp || ''} ({st.firstNameEn} {st.lastNameEn || ''})
                      {st.currentRollNumber ? ` - Roll: ${st.currentRollNumber}` : ''} [ID: {st.studentId}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Quick Dossier & Photo Upload */}
              {selectedStudentDetail && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs flex flex-col sm:flex-row gap-4 border border-slate-200 dark:border-slate-700">
                  {/* Photo Preview / Upload */}
                  <div className="flex flex-col items-center shrink-0">
                    {formData.photoUrl ? (
                      <div className="w-20 h-24 rounded-lg border-2 border-blue-500 overflow-hidden shadow-sm bg-white mb-2 relative group">
                        <img src={formData.photoUrl} alt="Student PP Photo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-24 rounded-lg border-2 border-dashed border-slate-400 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-1 text-center mb-2">
                        <User className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[9px] text-slate-500 font-bold">फोटो छैन</span>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={photoInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{formData.photoUrl ? 'तस्बिर फेर्नुहोस्' : 'फोटो अपलोड'}</span>
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {selectedStudentDetail.firstNameNp} {selectedStudentDetail.lastNameNp} ({selectedStudentDetail.firstNameEn} {selectedStudentDetail.lastNameEn})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>जन्म मिति (वि.सं.): <b>{selectedStudentDetail.dobBs || '-'}</b></div>
                      <div>DOB (AD): <b>{selectedStudentDetail.dobAd || '-'}</b></div>
                      <div>बुबा: <b>{selectedStudentDetail.fatherNameNp || selectedStudentDetail.fatherNameEn || '-'}</b></div>
                      <div>आमा: <b>{selectedStudentDetail.motherNameNp || selectedStudentDetail.motherNameEn || '-'}</b></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Details (Year, Symbol, Reg No) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    उत्तीर्ण वर्ष (BS)
                  </label>
                  <input
                    type="number"
                    value={formData.passedAcademicYearBs}
                    onChange={(e) => setFormData({ ...formData, passedAcademicYearBs: parseInt(e.target.value) || 2082 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    सिम्बोल नम्बर (Symbol No)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: 02819420A"
                    value={formData.symbolNumber}
                    onChange={(e) => setFormData({ ...formData, symbolNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    दर्ता नम्बर (Registration No)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: 78-01-27001-001"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              {/* GPA and Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    प्राप्त GPA (Final GPA)
                  </label>
                  <input
                    type="text"
                    placeholder="3.80"
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ग्रेड / श्रेणी (Grade)
                  </label>
                  <select
                    value={formData.divisionOrGrade}
                    onChange={(e) => setFormData({ ...formData, divisionOrGrade: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="A+">A+ (विशिष्ट / Outstanding)</option>
                    <option value="A">A (उत्कृष्ट / Excellent)</option>
                    <option value="B+">B+ (धेरै राम्रो / Very Good)</option>
                    <option value="B">B (राम्रो / Good)</option>
                    <option value="C+">C+ (सन्तोषजनक / Satisfactory)</option>
                    <option value="C">C (स्वीकार्य / Acceptable)</option>
                    <option value="D">D (आधारभूत / Basic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    चारित्रिक आचरण (Character)
                  </label>
                  <select
                    value={formData.characterRemarks}
                    onChange={(e) => setFormData({ ...formData, characterRemarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="उत्तम (Excellent)">उत्तम (Excellent)</option>
                    <option value="सर्वोत्कृष्ट (Outstanding)">सर्वोत्कृष्ट (Outstanding)</option>
                    <option value="धेरै राम्रो (Very Good)">धेरै राम्रो (Very Good)</option>
                    <option value="सन्तोषजनक (Satisfactory)">सन्तोषजनक (Satisfactory)</option>
                  </select>
                </div>
              </div>

              {/* Leaving Reason and Conduct Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    विद्यालय छोड्नुको कारण (Reason for Leaving)
                  </label>
                  <input
                    type="text"
                    value={formData.reasonForLeaving}
                    onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    जारी मिति (Issue Date BS)
                  </label>
                  <input
                    type="text"
                    value={formData.issueDateBs}
                    onChange={(e) => setFormData({ ...formData, issueDateBs: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  चारित्रिक विशेष टिप्पणी (Conduct Notes)
                </label>
                <textarea
                  rows={2}
                  value={formData.conductNotes}
                  onChange={(e) => setFormData({ ...formData, conductNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Status transition checkbox */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="markGraduated"
                  checked={formData.markAsGraduated}
                  onChange={(e) => setFormData({ ...formData, markAsGraduated: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="markGraduated" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  विद्यार्थी स्थितिलाई 'स्थानान्तरित/उत्तीर्ण' (Transferred) मा बदल्नुहोस् (दैनिक हाजिरीबाट स्वतः अलग हुनेछ)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-2"
                >
                  <Award className="w-4 h-4" />
                  <span>प्रमाणपत्र जारी गर्नुहोस्</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: OFFICIAL CERTIFICATE PRINT VIEW ================= */}
      {isPrintModalOpen && activePrintCert && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div
            className="bg-white text-slate-950 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 shadow-sm"
                  title="सूचीमा फर्कनुहोस् (Back to Certificate List)"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-400" />
                  <span>पछाडि फर्कनुहोस् (Back)</span>
                </button>
                <div className="h-5 w-px bg-slate-700 hidden sm:block" />
                <div className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs sm:text-sm text-slate-200 font-mono">
                    {activePrintCert.certificateNo}
                  </span>
                </div>
              </div>

              {/* Copy Type Mode Toggle (Original vs Duplicate) */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
                <button
                  onClick={() => setSelectedCopyType('ORIGINAL')}
                  className={`px-3 py-1 rounded font-bold transition flex items-center space-x-1 ${
                    selectedCopyType === 'ORIGINAL'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="कुनै प्रतिलिपि छाप नभएको मूल प्रमाणपत्र"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>मूल प्रति (Original)</span>
                </button>
                <button
                  onClick={() => setSelectedCopyType('DUPLICATE')}
                  className={`px-3 py-1 rounded font-bold transition flex items-center space-x-1 ${
                    selectedCopyType === 'DUPLICATE'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="प्रतिलिपि छाप अंकित गरी छाप्नुहोस्"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>प्रतिलिपि (Duplicate)</span>
                </button>
              </div>

              {/* Language Mode Toggle */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
                <button
                  onClick={() => setPrintLanguage('NEP')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    printLanguage === 'NEP' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🇳🇵 नेपाली
                </button>
                <button
                  onClick={() => setPrintLanguage('ENG')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    printLanguage === 'ENG' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => setPrintLanguage('BI')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    printLanguage === 'BI' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🌐 दुवै (Bilingual)
                </button>
              </div>

              {/* Print Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDirectPrint(activePrintCert, printLanguage, selectedCopyType)}
                  className={`px-4 py-1.5 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow ${
                    selectedCopyType === 'DUPLICATE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title="प्रिन्टर छनोट गरी सफा A4 पानामा प्रिन्ट गर्नुहोस्"
                >
                  <Printer className="w-4 h-4" />
                  <span>प्रिन्टर छनोट गरी छाप्नुहोस् ({selectedCopyType === 'ORIGINAL' ? 'मूल प्रति' : 'प्रतिलिपि'})</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Count Alert Banner if previously printed */}
            {(activePrintCert.printCount || 0) > 0 && (
              <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>
                    यो प्रमाणपत्र यसअघि <b>{formatNumber(activePrintCert.printCount || 0)}</b> पटक प्रिन्ट भइसकेको छ।
                    (पहिलो प्रिन्ट: {activePrintCert.firstPrintedAt ? new Date(activePrintCert.firstPrintedAt).toLocaleDateString() : 'पहिले'})
                  </span>
                </div>
                <div className="text-[11px] font-semibold">
                  {selectedCopyType === 'ORIGINAL' ? 'मूल प्रति पुनर्मुद्रण मोड' : 'प्रतिलिपि (Duplicate) मोड'}
                </div>
              </div>
            )}

            {/* Print Content Frame */}
            <div id="printable-certificate" className="p-6 lg:p-10 relative bg-amber-50/20 font-serif text-slate-900 select-text">
              {/* Outer Decorative Border */}
              <div className="border-4 border-double border-amber-800/80 p-5 lg:p-7 rounded-lg relative">
                {/* Inner Thin Border */}
                <div className="border border-amber-900/40 p-5 lg:p-7 rounded relative">
                  {/* Duplicate Watermark / Stamp: ONLY when selectedCopyType === 'DUPLICATE' */}
                  {selectedCopyType === 'DUPLICATE' && (
                    <div className="absolute top-4 right-4 border-2 border-dashed border-rose-600 text-rose-600 px-3 py-1 text-xs font-black tracking-widest uppercase bg-rose-50/95 z-10 rounded shadow-sm">
                      प्रतिलिपि (DUPLICATE COPY {activePrintCert.duplicateCount > 0 ? '#' + activePrintCert.duplicateCount : ''})
                    </div>
                  )}

                  {/* Header: School Logo, School Info & PP Photo */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-amber-900/40 gap-4">
                    {/* Left: School Logo ONLY (NO Nepal Government Emblem) */}
                    <div className="w-24 shrink-0 flex flex-col items-center justify-center">
                      {school?.logoUrl ? (
                        <img src={school.logoUrl} alt="School Logo" className="w-16 h-16 object-contain" />
                      ) : (
                        <SchoolSealSvg schoolName={school?.nameEn} />
                      )}
                      <div className="text-[8.5px] font-bold text-blue-900 uppercase tracking-wider mt-1 text-center font-sans">
                        विद्यालयको लोगो
                      </div>
                    </div>

                    {/* Center: School Info */}
                    <div className="flex-1 text-center space-y-0.5">
                      <div className="text-xs font-bold tracking-widest text-slate-600 uppercase font-sans">
                        पाठ्यक्रम विकास केन्द्र (CDC) को पाठ्यक्रम तथा मूल्याङ्कन ढाँचा अनुरूप
                      </div>
                      <h1 className="text-2xl lg:text-3xl font-black text-amber-950 font-serif tracking-tight">
                        {school?.nameNp || 'श्री राजेश्वर निधि माध्यमिक विद्यालय'}
                      </h1>
                      <h2 className="text-base lg:text-lg font-bold text-slate-800 tracking-wide font-sans">
                        {school?.nameEn || 'Shree Rajeshwar Nidhi Secondary School'}
                      </h2>
                      <p className="text-xs text-slate-600 font-sans">
                        {school?.addressNp || 'टोखा-०४, काठमाडौं, बागमती प्रदेश, नेपाल'} | फोन: {school?.phone || '०१-४३५१२३४'}
                      </p>
                      <div className="text-[11px] font-mono text-slate-500 font-sans pt-0.5">
                        स्थापना: वि.सं. {school?.establishedBsYear || 2028} | IEMIS Code: <b>{school?.iemisCode || '170720001'}</b>
                      </div>
                    </div>

                    {/* Right: Student PP Size Photo Box */}
                    <div className="w-24 shrink-0 flex justify-end">
                      {activePrintCert.photoUrl ? (
                        <div className="w-24 h-28 border-2 border-amber-900/70 rounded bg-white overflow-hidden shadow-sm">
                          <img
                            src={activePrintCert.photoUrl}
                            alt="Student PP Photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-28 border-2 border-dashed border-amber-900/60 rounded bg-amber-50/40 p-1 flex flex-col items-center justify-center text-center">
                          <User className="w-6 h-6 text-amber-900/60 mb-1" />
                          <span className="text-[9.5px] font-bold text-amber-950 leading-tight">
                            विद्यार्थीको PP फोटो टाँस्ने स्थान
                          </span>
                          <span className="text-[8.5px] text-slate-500 italic mt-0.5 leading-tight">
                            (Affix PP Photo)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Serial and Date Bar */}
                  <div className="flex justify-between items-center py-3 text-xs font-sans text-slate-700 font-medium">
                    <div>
                      <span className="font-bold">प्रमाणपत्र नं (Cert No): </span>
                      <span className="font-mono font-bold text-amber-950 text-sm">
                        {activePrintCert.certificateNo}
                      </span>
                      {selectedCopyType === 'DUPLICATE' && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-300 uppercase">
                          प्रतिलिपि (DUPLICATE)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold">जारी मिति (Issue Date): </span>
                      <span className="font-mono font-bold">{activePrintCert.issueDateBs} BS</span>
                    </div>
                  </div>

                  {/* Title of the Certificate */}
                  <div className="text-center my-4">
                    <div className="inline-block relative">
                      {(printLanguage === 'NEP' || printLanguage === 'BI') && (
                        <div className="text-2xl lg:text-3xl font-black text-amber-950 tracking-wider uppercase border-b-2 border-amber-900/60 pb-1">
                          {activePrintCert.certificateType === 'SLC' && 'विद्यालय परित्याग प्रमाणपत्र'}
                          {activePrintCert.certificateType === 'CHARACTER' && 'चारित्रिक प्रमाणपत्र'}
                          {activePrintCert.certificateType === 'TRANSFER' && 'स्थानान्तरण प्रमाणपत्र'}
                        </div>
                      )}
                      {(printLanguage === 'ENG' || printLanguage === 'BI') && (
                        <div
                          className={`font-bold tracking-widest mt-1 font-sans uppercase ${
                            printLanguage === 'ENG'
                              ? 'text-2xl lg:text-3xl text-amber-950 border-b-2 border-amber-900/60 pb-1'
                              : 'text-xs text-slate-600'
                          }`}
                        >
                          {activePrintCert.certificateType === 'SLC' && 'SCHOOL LEAVING CERTIFICATE'}
                          {activePrintCert.certificateType === 'CHARACTER' && 'CHARACTER CERTIFICATE'}
                          {activePrintCert.certificateType === 'TRANSFER' && 'TRANSFER CERTIFICATE'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formal Declaration Text */}
                  <div className="space-y-3 text-justify leading-relaxed text-sm lg:text-base text-slate-900 px-2 lg:px-4">
                    {/* Nepali Paragraph */}
                    {(printLanguage === 'NEP' || printLanguage === 'BI') && (
                      <p>
                        प्रमाणित गरिन्छ कि श्री / सुश्री{' '}
                        <span className="font-bold text-amber-950 underline decoration-dotted decoration-amber-700 underline-offset-4 px-1 text-base lg:text-lg">
                          {activePrintCert.studentNameNp || activePrintCert.studentNameEn}
                        </span>{' '}
                        (पिता श्री{' '}
                        <span className="font-semibold underline decoration-dotted underline-offset-2 px-1">
                          {activePrintCert.fatherNameNp || activePrintCert.fatherNameEn || '....................'}
                        </span>{' '}
                        तथा माता श्रीमती{' '}
                        <span className="font-semibold underline decoration-dotted underline-offset-2 px-1">
                          {activePrintCert.motherNameNp || activePrintCert.motherNameEn || '....................'}
                        </span>
                        ) जन्म मिति वि.सं.{' '}
                        <span className="font-mono font-semibold px-1">
                          {activePrintCert.dobBs || '...........'}
                        </span>{' '}
                        (ई.सं.{' '}
                        <span className="font-mono font-semibold px-1">
                          {activePrintCert.dobAd || '...........'}
                        </span>
                        ) यस विद्यालयको कक्षा{' '}
                        <span className="font-bold text-amber-950 px-1">
                          {activePrintCert.classNameNp || activePrintCert.classNameEn}
                        </span>
                        {activePrintCert.streamNameNp ? ` (${activePrintCert.streamNameNp} संकाय)` : ''} मा नियमित
                        विद्यार्थीको रूपमा अध्ययनरत रहनुभएको थियो। निजले वि.सं.{' '}
                        <b>{activePrintCert.passedAcademicYearBs}</b> को माध्यमिक शिक्षा परीक्षा (SEE) मा सिम्बोल नम्बर{' '}
                        <span className="font-mono font-bold">{activePrintCert.symbolNumber || 'N/A'}</span> तथा दर्ता
                        नम्बर{' '}
                        <span className="font-mono font-bold">{activePrintCert.registrationNumber || 'N/A'}</span> बाट
                        सहभागी भई GPA <span className="font-bold text-blue-900">{activePrintCert.gpa || '3.60'}</span>{' '}
                        (ग्रेड{' '}
                        <span className="font-bold text-blue-900">{activePrintCert.divisionOrGrade || 'A'}</span>) प्राप्त
                        गरी उत्तीर्ण हुनुभएको छ।
                      </p>
                    )}

                    {/* English Paragraph */}
                    {(printLanguage === 'ENG' || printLanguage === 'BI') && (
                      <p
                        className={`font-sans ${
                          printLanguage === 'BI'
                            ? 'text-xs lg:text-sm text-slate-700 italic pt-1 border-t border-amber-900/20'
                            : 'text-sm lg:text-base text-slate-900'
                        }`}
                      >
                        This is to certify that Mr. / Ms.{' '}
                        <span className="font-bold text-slate-900 not-italic">
                          {activePrintCert.studentNameEn}
                        </span>
                        , son / daughter of Mr.{' '}
                        <span className="font-semibold not-italic">
                          {activePrintCert.fatherNameEn || activePrintCert.fatherNameNp || '....................'}
                        </span>{' '}
                        and Mrs.{' '}
                        <span className="font-semibold not-italic">
                          {activePrintCert.motherNameEn || activePrintCert.motherNameNp || '....................'}
                        </span>
                        , born on{' '}
                        <span className="font-mono font-semibold not-italic">
                          {activePrintCert.dobBs} BS
                        </span>{' '}
                        ({activePrintCert.dobAd} AD), was a bonafide student of this institution in Class{' '}
                        <span className="font-bold not-italic">
                          {activePrintCert.classNameEn}
                        </span>
                        {activePrintCert.streamNameEn ? ` (${activePrintCert.streamNameEn})` : ''}. He / She appeared in
                        the Secondary Education Examination (SEE) in year{' '}
                        <span className="font-bold not-italic">{activePrintCert.passedAcademicYearBs} BS</span> under
                        Symbol No:{' '}
                        <span className="font-mono font-bold not-italic">
                          {activePrintCert.symbolNumber || 'N/A'}
                        </span>{' '}
                        and Registration No:{' '}
                        <span className="font-mono font-bold not-italic">
                          {activePrintCert.registrationNumber || 'N/A'}
                        </span>
                        , securing Grade Point Average (GPA){' '}
                        <span className="font-bold not-italic text-blue-900">{activePrintCert.gpa || '3.60'}</span>{' '}
                        (Grade{' '}
                        <span className="font-bold not-italic text-blue-900">
                          {activePrintCert.divisionOrGrade || 'A'}
                        </span>
                        ).
                      </p>
                    )}

                    {/* Academic Performance Grid */}
                    <div className="bg-amber-100/40 p-3 rounded-lg border border-amber-900/20 my-3 font-sans text-xs lg:text-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-slate-500 text-[11px]">उत्तीर्ण शैक्षिक सत्र (Passed Year)</div>
                          <div className="font-bold text-amber-950 text-sm mt-0.5">
                            वि.सं. {activePrintCert.passedAcademicYearBs}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[11px]">सिम्बोल नम्बर (Symbol No)</div>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                            {activePrintCert.symbolNumber || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[11px]">दर्ता नम्बर (Registration No)</div>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                            {activePrintCert.registrationNumber || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[11px]">प्राप्त GPA / ग्रेड (Final GPA)</div>
                          <div className="font-bold text-blue-900 text-sm mt-0.5">
                            GPA {activePrintCert.gpa || '3.60'} ({activePrintCert.divisionOrGrade || 'A'})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conduct & Reason in Nepali */}
                    {(printLanguage === 'NEP' || printLanguage === 'BI') && (
                      <p>
                        यस विद्यालयमा अध्ययनरत रहँदा निजको चालचलन तथा आचरण{' '}
                        <span className="font-bold text-amber-950 underline decoration-dotted underline-offset-2 px-1">
                          {activePrintCert.characterRemarks}
                        </span>{' '}
                        रहेको पाइएको छ। निजले{' '}
                        <span className="font-semibold underline decoration-dotted underline-offset-2 px-1">
                          {activePrintCert.reasonForLeaving}
                        </span>{' '}
                        कारणले यस विद्यालयबाट परित्याग लिनुभएको हो। निजको उत्तरोत्तर शैक्षिक प्रगति तथा उज्ज्वल भविष्यको
                        हार्दिक शुभकामना व्यक्त गर्दछौं।
                      </p>
                    )}

                    {/* Conduct & Reason in English */}
                    {(printLanguage === 'ENG' || printLanguage === 'BI') && (
                      <p
                        className={`font-sans ${
                          printLanguage === 'BI'
                            ? 'text-xs lg:text-sm text-slate-700 italic'
                            : 'text-sm lg:text-base text-slate-900'
                        }`}
                      >
                        During his / her period of study in this school, his / her moral character and conduct was found to
                        be{' '}
                        <span className="font-bold not-italic text-slate-900">
                          {activePrintCert.characterRemarks}
                        </span>
                        . He / She has left this school on account of{' '}
                        <span className="font-medium not-italic">{activePrintCert.reasonForLeaving}</span>. We wish him /
                        her every success in future endeavors.
                      </p>
                    )}
                  </div>

                  {/* Signatures Footer */}
                  <div className="grid grid-cols-3 gap-6 pt-12 mt-8 text-center font-sans text-xs border-t border-amber-900/30">
                    <div>
                      <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold text-slate-800">
                        तयार गर्ने / जाँच्ने
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Prepared By</div>
                    </div>

                    <div className="relative">
                      {/* School Seal Placeholder */}
                      <div className="w-16 h-16 border-2 border-dashed border-amber-800/40 rounded-full mx-auto -mt-10 flex items-center justify-center text-[10px] text-amber-800 font-bold uppercase rotate-12">
                        विद्यालयको छाप
                      </div>
                      <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold text-slate-800 mt-4">
                        परीक्षा संयोजक
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Exam Coordinator</div>
                    </div>

                    <div>
                      <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold text-slate-950">
                        प्रधानाध्यापक
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">Headmaster / Principal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Actions with Back Button */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-2 border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>पछाडि फर्कनुहोस् (Back to Certificate List)</span>
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 hidden sm:inline font-medium">
                  मोड: <b>{selectedCopyType === 'ORIGINAL' ? 'मूल प्रति (Original)' : 'प्रतिलिपि (Duplicate)'}</b> •{' '}
                  {printLanguage === 'NEP' ? 'नेपाली' : printLanguage === 'ENG' ? 'English' : 'दुवै (Bilingual)'}
                </span>
                <button
                  onClick={() => handleDirectPrint(activePrintCert, printLanguage, selectedCopyType)}
                  className={`px-5 py-2 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-md active:scale-95 ${
                    selectedCopyType === 'DUPLICATE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>प्रिन्टर छनोट गरी छाप्नुहोस् ({selectedCopyType === 'ORIGINAL' ? 'मूल प्रति' : 'प्रतिलिपि'})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
