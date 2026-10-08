import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Plus,
  Search,
  BookMarked,
  ArrowRightLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  DollarSign,
  Tag,
  ShieldCheck,
  Calendar,
  Barcode,
  Check,
  X,
  Edit3,
} from 'lucide-react';
import {
  LibraryBook,
  LibraryBookWithDetails,
  LibraryBookCopy,
  LibraryCategory,
  LibraryMemberWithDetails,
  LibraryCirculationWithDetails,
  LibraryFine,
} from '@sms/shared';

export const LibraryManagement: React.FC = () => {
  const { language, formatNumber } = useLanguage();
  const isNp = language === 'np';
  const { token, user, hasRole } = useAuth();
  const canEdit = hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('PRINCIPAL') || Boolean(user?.isSuperAdmin);

  const [activeTab, setActiveTab] = useState<'catalog' | 'circulation' | 'members' | 'fines' | 'categories'>('catalog');

  // Data states
  const [books, setBooks] = useState<LibraryBookWithDetails[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [members, setMembers] = useState<LibraryMemberWithDetails[]>([]);
  const [circulations, setCirculations] = useState<LibraryCirculationWithDetails[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [circulationFilter, setCirculationFilter] = useState<'ALL' | 'ISSUED' | 'OVERDUE' | 'RETURNED'>('ALL');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookForDrawer, setSelectedBookForDrawer] = useState<LibraryBookWithDetails | null>(null);
  const [isAddCopyModalOpen, setIsAddCopyModalOpen] = useState(false);
  const [addCopyCount, setAddCopyCount] = useState(1);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedCirculationForReturn, setSelectedCirculationForReturn] = useState<LibraryCirculationWithDetails | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'FAIR' | 'DAMAGED'>('GOOD');
  const [returnFinePaid, setReturnFinePaid] = useState(true);
  const [returnRemarks, setReturnRemarks] = useState('');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [newCategoryNameNp, setNewCategoryNameNp] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // New Book Form State
  const [newBookTitleEn, setNewBookTitleEn] = useState('');
  const [newBookTitleNp, setNewBookTitleNp] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookPublisher, setNewBookPublisher] = useState('');
  const [newBookEdition, setNewBookEdition] = useState('');
  const [newBookYear, setNewBookYear] = useState('2081');
  const [newBookLanguage, setNewBookLanguage] = useState('NEPALI');
  const [newBookCategoryId, setNewBookCategoryId] = useState('');
  const [newBookRackLocation, setNewBookRackLocation] = useState('Rack 1, Shelf A');
  const [newBookPrice, setNewBookPrice] = useState(200);
  const [newBookInitialCopies, setNewBookInitialCopies] = useState(3);
  const [newBookAccPrefix, setNewBookAccPrefix] = useState('ACC-2083');
  const [newBookIsbn, setNewBookIsbn] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');

  // Quick Issue Form State
  const [issueMemberCardNo, setIssueMemberCardNo] = useState('');
  const [issueAccessionNo, setIssueAccessionNo] = useState('');
  const [issueDateBs, setIssueDateBs] = useState('2083-01-20');
  const [issueDueDateBs, setIssueDueDateBs] = useState('2083-02-04');
  const [issueRemarks, setIssueRemarks] = useState('');

  // New Member Form State
  const [newMemberType, setNewMemberType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [newMemberStudentId, setNewMemberStudentId] = useState('');
  const [newMemberStaffId, setNewMemberStaffId] = useState('');

  // Edit Book State
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBookWithDetails | null>(null);
  const [editBookTitleNp, setEditBookTitleNp] = useState('');
  const [editBookTitleEn, setEditBookTitleEn] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookPublisher, setEditBookPublisher] = useState('');
  const [editBookEdition, setEditBookEdition] = useState('');
  const [editBookYear, setEditBookYear] = useState('2081');
  const [editBookLanguage, setEditBookLanguage] = useState('NEPALI');
  const [editBookCategoryId, setEditBookCategoryId] = useState('');
  const [editBookRackLocation, setEditBookRackLocation] = useState('');
  const [editBookPrice, setEditBookPrice] = useState(200);
  const [editBookIsbn, setEditBookIsbn] = useState('');
  const [editBookDesc, setEditBookDesc] = useState('');

  // Edit Category State
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LibraryCategory | null>(null);
  const [editCategoryCode, setEditCategoryCode] = useState('');
  const [editCategoryNameEn, setEditCategoryNameEn] = useState('');
  const [editCategoryNameNp, setEditCategoryNameNp] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

  // Edit Member Limits State
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<LibraryMemberWithDetails | null>(null);
  const [editMemberMaxBooks, setEditMemberMaxBooks] = useState(2);
  const [editMemberMaxDays, setEditMemberMaxDays] = useState(14);
  const [editMemberStatus, setEditMemberStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, mRes, cirRes, fRes, sRes, stuRes, stfRes] = await Promise.all([
        fetch('/api/library/books', { headers }),
        fetch('/api/library/categories', { headers }),
        fetch('/api/library/members', { headers }),
        fetch('/api/library/circulations', { headers }),
        fetch('/api/library/fines', { headers }),
        fetch('/api/library/reports/summary', { headers }),
        fetch('/api/students', { headers }),
        fetch('/api/staff', { headers }),
      ]);

      if (bRes.ok) setBooks(await bRes.json());
      if (cRes.ok) {
        const catData = await cRes.json();
        setCategories(catData);
        if (catData.length > 0 && !newBookCategoryId) {
          setNewBookCategoryId(catData[0].id);
        }
      }
      if (mRes.ok) setMembers(await mRes.json());
      if (cirRes.ok) setCirculations(await cirRes.json());
      if (fRes.ok) setFines(await fRes.json());
      if (sRes.ok) setSummary(await sRes.json());
      if (stuRes.ok) {
        const data = await stuRes.json();
        setStudents(Array.isArray(data) ? data : data.students || []);
      }
      if (stfRes.ok) {
        const data = await stfRes.json();
        setStaffList(Array.isArray(data) ? data : data.staff || []);
      }
    } catch (err: any) {
      showFeedback('error', 'डाटा लोड गर्न सकिएन: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Handle Add Book
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitleEn || !newBookTitleNp || !newBookAuthor || !newBookCategoryId) {
      showFeedback('error', isNp ? 'कृपया शीर्षक, लेखक र विधा अनिवार्य भर्नुहोस्।' : 'Title, Author, and Category are required.');
      return;
    }

    try {
      const res = await fetch('/api/library/books', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titleEn: newBookTitleEn,
          titleNp: newBookTitleNp,
          author: newBookAuthor,
          publisher: newBookPublisher,
          edition: newBookEdition,
          publicationYear: newBookYear,
          language: newBookLanguage,
          categoryId: newBookCategoryId,
          rackLocation: newBookRackLocation,
          price: Number(newBookPrice) || 0,
          initialCopiesCount: Number(newBookInitialCopies) || 1,
          accessionPrefix: newBookAccPrefix,
          isbn: newBookIsbn,
          description: newBookDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add book');
      }

      showFeedback('success', isNp ? 'नयाँ पुस्तक र भौतिक प्रतिहरू सफलतापूर्वक दर्ता भए।' : 'Book and copies registered successfully.');
      setIsBookModalOpen(false);
      // Reset
      setNewBookTitleEn('');
      setNewBookTitleNp('');
      setNewBookAuthor('');
      setNewBookPublisher('');
      setNewBookIsbn('');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Add Extra Copies
  const handleAddCopies = async () => {
    if (!selectedBookForDrawer) return;
    try {
      const res = await fetch(`/api/library/books/${selectedBookForDrawer.id}/copies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          count: addCopyCount,
          accessionPrefix: 'ACC-2083',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add copies');
      }

      showFeedback('success', isNp ? 'थप प्रतिहरू सफलतापूर्वक दर्ता भए।' : 'Additional copies added.');
      setIsAddCopyModalOpen(false);
      loadData();

      // Refresh drawer book
      const bookRes = await fetch(`/api/library/books/${selectedBookForDrawer.id}`, { headers });
      if (bookRes.ok) {
        setSelectedBookForDrawer(await bookRes.json());
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Quick Issue Book
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueMemberCardNo || !issueAccessionNo) {
      showFeedback('error', isNp ? 'कृपया सदस्य कार्ड र पुस्तक दर्ता नम्बर चयन गर्नुहोस्।' : 'Select Member Card and Book Accession No.');
      return;
    }

    try {
      const res = await fetch('/api/library/issue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cardNumber: issueMemberCardNo.trim(),
          accessionNumber: issueAccessionNo.trim(),
          issueDateBs,
          dueDateBs: issueDueDateBs,
          remarks: issueRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to issue book');
      }

      showFeedback('success', isNp ? `पुस्तक सफलतापूर्वक जारी गरियो (कारोबार नं: ${data.circulationNumber})` : `Book issued successfully (${data.circulationNumber})`);
      setIssueAccessionNo('');
      setIssueRemarks('');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Return Book
  const handleReturnBook = async () => {
    if (!selectedCirculationForReturn) return;

    try {
      const res = await fetch('/api/library/return', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          circulationId: selectedCirculationForReturn.id,
          returnDateBs: '2083-01-20',
          condition: returnCondition,
          finePaid: returnFinePaid,
          remarks: returnRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to return book');
      }

      showFeedback(
        'success',
        isNp
          ? `पुस्तक सफलतापूर्वक फिर्ता दर्ता भयो। ${data.fineAmount > 0 ? `(विलम्ब शुल्क: रु ${data.fineAmount})` : ''}`
          : `Book returned successfully. ${data.fineAmount > 0 ? `(Fine: NPR ${data.fineAmount})` : ''}`
      );
      setIsReturnModalOpen(false);
      setSelectedCirculationForReturn(null);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Renew Book
  const handleRenewBook = async (cirId: string) => {
    try {
      const res = await fetch('/api/library/renew', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          circulationId: cirId,
          days: 14,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to renew');
      }

      showFeedback('success', isNp ? `पुस्तक म्याद थप भयो (नयाँ मिति: ${data.newDueDateBs})` : `Book renewed until ${data.newDueDateBs}`);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Open Member Modal & Auto-select unassigned candidate
  const handleOpenMemberModal = () => {
    setIsMemberModalOpen(true);
    const unassignedStu = students.find((s) => !members.some((m) => m.studentId === s.id));
    if (unassignedStu) {
      setNewMemberStudentId(unassignedStu.id);
    } else if (students.length > 0) {
      setNewMemberStudentId(students[0].id);
    }
    const unassignedStf = staffList.find((st) => !members.some((m) => m.staffId === st.id));
    if (unassignedStf) {
      setNewMemberStaffId(unassignedStf.id);
    } else if (staffList.length > 0) {
      setNewMemberStaffId(staffList[0].id);
    }
  };

  const handleMemberTypeChange = (type: 'STUDENT' | 'STAFF') => {
    setNewMemberType(type);
    if (type === 'STUDENT') {
      const unassignedStu = students.find((s) => !members.some((m) => m.studentId === s.id));
      if (unassignedStu) {
        setNewMemberStudentId(unassignedStu.id);
      } else if (students.length > 0) {
        setNewMemberStudentId(students[0].id);
      }
    } else {
      const unassignedStf = staffList.find((st) => !members.some((m) => m.staffId === st.id));
      if (unassignedStf) {
        setNewMemberStaffId(unassignedStf.id);
      } else if (staffList.length > 0) {
        setNewMemberStaffId(staffList[0].id);
      }
    }
  };

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberType === 'STUDENT' && !newMemberStudentId) {
      showFeedback('error', isNp ? 'कृपया विद्यार्थी छनोट गर्नुहोस्।' : 'Select a student');
      return;
    }
    if (newMemberType === 'STAFF' && !newMemberStaffId) {
      showFeedback('error', isNp ? 'कृपया शिक्षक/कर्मचारी छनोट गर्नुहोस्।' : 'Select a staff member');
      return;
    }

    try {
      const res = await fetch('/api/library/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memberType: newMemberType,
          studentId: newMemberType === 'STUDENT' ? newMemberStudentId : null,
          staffId: newMemberType === 'STAFF' ? newMemberStaffId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create member');
      }

      showFeedback(
        'success',
        isNp
          ? `नयाँ पुस्तकालय सदस्यता कार्ड जारी गरियो (${data.cardNumber || ''})।`
          : `Library membership card issued successfully (${data.cardNumber || ''}).`
      );
      setIsMemberModalOpen(false);
      setNewMemberStudentId('');
      setNewMemberStaffId('');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryCode || !newCategoryNameEn || !newCategoryNameNp) {
      showFeedback('error', isNp ? 'कोड र विधाको नाम अनिवार्य छन्।' : 'Code and name are required.');
      return;
    }

    try {
      const res = await fetch('/api/library/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: newCategoryCode,
          nameEn: newCategoryNameEn,
          nameNp: newCategoryNameNp,
          description: newCategoryDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add category');
      }

      showFeedback('success', isNp ? 'नयाँ विधा (DDC Category) थपियो।' : 'Category added successfully.');
      setIsCategoryModalOpen(false);
      setNewCategoryCode('');
      setNewCategoryNameEn('');
      setNewCategoryNameNp('');
      setNewCategoryDesc('');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Pay Fine
  const handlePayFine = async (fineId: string) => {
    try {
      const res = await fetch(`/api/library/fines/${fineId}/pay`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentDateBs: '2083-01-20',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to pay fine');
      }

      showFeedback('success', isNp ? 'जरिवाना भुक्तानी दर्ता गरियो।' : 'Fine payment recorded.');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers for Member Limits Edit ---
  const handleOpenEditMember = (mem: LibraryMemberWithDetails) => {
    setEditingMember(mem);
    setEditMemberMaxBooks(mem.maxAllowedBooks);
    setEditMemberMaxDays(mem.maxIssueDays);
    setEditMemberStatus(mem.status as 'ACTIVE' | 'SUSPENDED');
    setIsEditMemberModalOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      const res = await fetch(`/api/library/members/${editingMember.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          maxAllowedBooks: Number(editMemberMaxBooks),
          maxIssueDays: Number(editMemberMaxDays),
          status: editMemberStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update member');

      const cardNum = data.member?.cardNumber || editingMember.cardNumber;
      showFeedback(
        'success',
        isNp
          ? `सदस्यको पुस्तक कोटा र नीति सफलतापूर्वक अद्यावधिक गरियो (${cardNum})।`
          : `Member borrowing limit and policy updated successfully (${cardNum}).`
      );
      setIsEditMemberModalOpen(false);
      setEditingMember(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers for Category Edit ---
  const handleOpenEditCategory = (cat: LibraryCategory) => {
    setEditingCategory(cat);
    setEditCategoryCode(cat.code);
    setEditCategoryNameEn(cat.nameEn);
    setEditCategoryNameNp(cat.nameNp);
    setEditCategoryDesc(cat.description || '');
    setIsEditCategoryModalOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      const res = await fetch(`/api/library/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          code: editCategoryCode.trim(),
          nameEn: editCategoryNameEn.trim(),
          nameNp: editCategoryNameNp.trim(),
          description: editCategoryDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update category');

      showFeedback('success', isNp ? 'विधा (DDC Category) विवरण सम्पादन गरियो।' : 'Category updated successfully.');
      setIsEditCategoryModalOpen(false);
      setEditingCategory(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers for Book Catalog Edit ---
  const handleOpenEditBook = (book: LibraryBookWithDetails) => {
    setEditingBook(book);
    setEditBookTitleNp(book.titleNp);
    setEditBookTitleEn(book.titleEn);
    setEditBookAuthor(book.author);
    setEditBookPublisher(book.publisher || '');
    setEditBookEdition(book.edition || '');
    setEditBookYear(book.publicationYear || '2081');
    setEditBookLanguage(book.language || 'NEPALI');
    setEditBookCategoryId(book.categoryId);
    setEditBookRackLocation(book.rackLocation || '');
    setEditBookPrice(book.price || 0);
    setEditBookIsbn(book.isbn || '');
    setEditBookDesc(book.description || '');
    setIsEditBookModalOpen(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      const res = await fetch(`/api/library/books/${editingBook.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          titleEn: editBookTitleEn.trim(),
          titleNp: editBookTitleNp.trim(),
          author: editBookAuthor.trim(),
          publisher: editBookPublisher.trim() || undefined,
          edition: editBookEdition.trim() || undefined,
          publicationYear: editBookYear.trim() || undefined,
          language: editBookLanguage,
          categoryId: editBookCategoryId,
          rackLocation: editBookRackLocation.trim() || undefined,
          price: Number(editBookPrice) || 0,
          isbn: editBookIsbn.trim() || undefined,
          description: editBookDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update book');

      showFeedback(
        'success',
        isNp ? 'पुस्तक क्याटलग विवरण सफलतापूर्वक अद्यावधिक गरियो।' : 'Book catalog updated successfully.'
      );
      setIsEditBookModalOpen(false);
      // Refresh drawer book if open
      if (selectedBookForDrawer && selectedBookForDrawer.id === editingBook.id) {
        const bookRes = await fetch(`/api/library/books/${editingBook.id}`, { headers });
        if (bookRes.ok) setSelectedBookForDrawer(await bookRes.json());
      }
      setEditingBook(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Find currently selected member in quick issue for quota feedback
  const selectedMemberObj = members.find((m) => m.cardNumber === issueMemberCardNo);
  const isMemberQuotaExceeded =
    selectedMemberObj && selectedMemberObj.activeIssuesCount >= selectedMemberObj.maxAllowedBooks;

  // Filtered books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.titleEn.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.titleNp.includes(catalogSearch) ||
      b.author.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (b.isbn && b.isbn.includes(catalogSearch)) ||
      (b.category?.nameNp && b.category.nameNp.includes(catalogSearch));

    const matchesCategory = selectedCategoryFilter ? b.categoryId === selectedCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  // Available copies for quick issue
  const allAvailableCopies = books
    .flatMap((b) => (b.copies || []).map((c) => ({ ...c, bookTitle: isNp ? b.titleNp : b.titleEn, author: b.author })))
    .filter((c) => c.status === 'AVAILABLE');

  // Filtered circulations
  const filteredCirculations = circulations.filter((c) => {
    if (circulationFilter === 'ALL') return true;
    return c.status === circulationFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {isNp ? 'पुस्तकालय व्यवस्थापन प्रणाली' : 'Library Management System'}
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                DDC / Barcode Aligned
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isNp
                ? 'पुस्तक क्याटलग, भौतिक प्रति दर्ता (Accession), सर्कुलेसन, विद्यार्थी/शिक्षक कोटा र विलम्ब शुल्क व्यवस्थापन'
                : 'Book cataloging, Dewey Decimal classification, multi-copy accessions, quota limits, and circulation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isNp ? 'नयाँ पुस्तक दर्ता' : 'Add New Book'}</span>
          </button>
          <button
            onClick={handleOpenMemberModal}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all"
          >
            <Users className="w-4 h-4" />
            <span>{isNp ? 'नयाँ सदस्यता' : 'Add Member'}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-sm">{feedback.message}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'कुल पुस्तक शीर्षक' : 'Total Titles'}
          </span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {formatNumber(summary?.totalTitles ?? books.length)}
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">DDC Catalog</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'जम्मा प्रतिहरू' : 'Total Volumes'}
          </span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {formatNumber(summary?.totalCopies ?? books.reduce((acc, b) => acc + b.totalCopies, 0))}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Physical Copies</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'र्याकमा उपलब्ध' : 'Available On Shelf'}
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNumber(summary?.availableCopies ?? books.reduce((acc, b) => acc + b.availableCopies, 0))}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ready to Issue</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'हाल जारी' : 'Active Issued'}
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatNumber(summary?.issuedCopies ?? circulations.filter((c) => c.status === 'ISSUED').length)}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Under Borrowers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'म्याद नाघेका' : 'Overdue Loans'}
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatNumber(summary?.overdueLoans ?? circulations.filter((c) => c.status === 'OVERDUE' || (c.overdueDays || 0) > 0).length)}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Fine Incurring</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isNp ? 'सक्रिय सदस्यहरू' : 'Active Members'}
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {formatNumber(summary?.activeMembers ?? members.length)}
          </div>
          <span className="text-[11px] text-purple-600 font-medium">Students & Staff</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto space-x-1">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>{isNp ? '१. पुस्तक क्याटलग र दर्ता' : '1. Catalog & Accessions'}</span>
        </button>

        <button
          onClick={() => setActiveTab('circulation')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'circulation'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{isNp ? '२. सर्कुलेसन काउन्टर (जारी/फिर्ता)' : '2. Circulation Counter'}</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isNp ? '३. पुस्तकालय सदस्यता' : '3. Library Members'}</span>
        </button>

        <button
          onClick={() => setActiveTab('fines')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'fines'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isNp ? '४. विलम्ब शुल्क र जरिवाना' : '4. Overdue & Fines'}</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isNp ? '५. विधा (DDC) र र्याकहरू' : '5. Categories & Racks'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CATALOG & ACCESSIONS */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 flex gap-2 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={isNp ? 'पुस्तकको नाम, लेखक, ISBN वा विधा खोज्नुहोस्...' : 'Search by title, author, ISBN...'}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
              >
                <option value="">{isNp ? 'सबै विधाहरू (All Categories)' : 'All Categories'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {isNp ? c.nameNp : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Book Catalog Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">{isNp ? 'पुस्तक विवरण (शीर्षक / लेखक)' : 'Book Title & Author'}</th>
                    <th className="py-3 px-4">{isNp ? 'विधा (DDC Category)' : 'Category'}</th>
                    <th className="py-3 px-4">{isNp ? 'र्याक / स्थान' : 'Rack Location'}</th>
                    <th className="py-3 px-4">{isNp ? 'भाषा / प्रकाशन' : 'Language & Edition'}</th>
                    <th className="py-3 px-4">{isNp ? 'मौज्दात प्रतिहरू' : 'Copies (Avail/Total)'}</th>
                    <th className="py-3 px-4">{isNp ? 'मूल्य (रु)' : 'Price (NPR)'}</th>
                    <th className="py-3 px-4 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {isNp ? 'कुनै पुस्तक भेटिएन।' : 'No books found in catalog.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-base">
                            {isNp ? book.titleNp : book.titleEn}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isNp ? book.titleEn : book.titleNp} • {isNp ? 'लेखक:' : 'Author:'} <span className="font-medium text-slate-700 dark:text-slate-300">{book.author}</span>
                          </div>
                          {book.isbn && <div className="text-[11px] text-slate-400 font-mono">ISBN: {book.isbn}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {book.category?.code} - {isNp ? book.category?.nameNp : book.category?.nameEn}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {book.rackLocation}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          <div>{book.language}</div>
                          <div className="text-slate-400">{book.publisher || '-'} ({book.publicationYear || '-'})</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                book.availableCopies > 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {formatNumber(book.availableCopies)} / {formatNumber(book.totalCopies)} {isNp ? 'उपलब्ध' : 'Avail'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                          रु. {formatNumber(book.price)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setSelectedBookForDrawer(book)}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition"
                            >
                              {isNp ? 'प्रतिहरू' : 'Copies'} ({book.copies?.length || 0})
                            </button>
                            {canEdit && (
                              <button
                                data-testid={`edit-book-${book.id}`}
                                onClick={() => handleOpenEditBook(book)}
                                className="px-2 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition inline-flex items-center gap-1"
                                title={isNp ? 'पुस्तक विवरण सम्पादन' : 'Edit Book Catalog'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isNp ? 'सम्पादन' : 'Edit'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CIRCULATION COUNTER (ISSUE / RETURN) */}
      {/* ======================================================== */}
      {activeTab === 'circulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Book Issue Panel (Left 1 col) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'द्रुत पुस्तक जारी (Quick Issue)' : 'Quick Book Issue'}</span>
              </h2>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                Borrow Counter
              </span>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4 text-sm">
              {/* Member Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'पुस्तकालय सदस्य (Member Card No.) *' : 'Member Card No. *'}
                </label>
                <select
                  value={issueMemberCardNo}
                  onChange={(e) => {
                    setIssueMemberCardNo(e.target.value);
                    const mem = members.find((m) => m.cardNumber === e.target.value);
                    if (mem) {
                      const days = mem.memberType === 'STUDENT' ? 14 : 30;
                      setIssueDueDateBs(`2083-02-04`); // defaults
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">{isNp ? '-- सदस्य छनोट गर्नुहोस् --' : '-- Select Member --'}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.cardNumber}>
                      {m.cardNumber} - {isNp ? m.fullNameNp : m.fullNameEn} ({m.memberType === 'STUDENT' ? 'विद्यार्थी' : 'शिक्षक'})
                    </option>
                  ))}
                </select>

                {/* Quota Limit Feedback Badge */}
                {selectedMemberObj && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                      isMemberQuotaExceeded
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{isNp ? selectedMemberObj.fullNameNp : selectedMemberObj.fullNameEn}</span>
                      <div className="text-[11px]">
                        {selectedMemberObj.memberType === 'STUDENT' ? 'विद्यार्थी कोटा: २ पुस्तक (१४ दिन)' : 'कर्मचारी कोटा: ५ पुस्तक (३० दिन)'}
                      </div>
                    </div>
                    <span className="font-bold px-2 py-1 rounded bg-white dark:bg-slate-900 border text-xs">
                      {selectedMemberObj.activeIssuesCount} / {selectedMemberObj.maxAllowedBooks} {isNp ? 'लिइएको' : 'Used'}
                    </span>
                  </div>
                )}
              </div>

              {/* Book Copy Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'उपलब्ध पुस्तक प्रति (Accession No.) *' : 'Available Book Copy (Accession No.) *'}
                </label>
                <select
                  value={issueAccessionNo}
                  onChange={(e) => setIssueAccessionNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">{isNp ? '-- उपलब्ध प्रति छनोट गर्नुहोस् --' : '-- Select Available Copy --'}</option>
                  {allAvailableCopies.map((c) => (
                    <option key={c.id} value={c.accessionNumber}>
                      {c.accessionNumber} : {c.bookTitle} ({c.author})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date pickers (BS) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'जारी मिति (वि.सं.)' : 'Issue Date (BS)'}
                  </label>
                  <input
                    type="text"
                    value={issueDateBs}
                    onChange={(e) => setIssueDateBs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'फिर्ता म्याद (वि.सं.)' : 'Due Date (BS)'}
                  </label>
                  <input
                    type="text"
                    value={issueDueDateBs}
                    onChange={(e) => setIssueDueDateBs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'कैफियत (Remarks)' : 'Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={isNp ? 'विषय सन्दर्भ, परियोजना कार्य...' : 'Reference, course reading...'}
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={Boolean(isMemberQuotaExceeded)}
                className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                  isMemberQuotaExceeded
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {isMemberQuotaExceeded
                    ? isNp
                      ? 'कोटा पूर्ण - जारी गर्न मिल्दैन'
                      : 'Quota Exceeded'
                    : isNp
                    ? 'पुस्तक जारी गर्नुहोस्'
                    : 'Confirm Issue'}
                </span>
              </button>
            </form>
          </div>

          {/* Active Circulations Table (Right 2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'सर्कुलेसन लगत तथा ऋण रेकर्ड' : 'Circulation & Loan Records'}</span>
              </h2>

              {/* Status Filter */}
              <div className="flex items-center space-x-1.5 text-xs">
                {(['ALL', 'ISSUED', 'OVERDUE', 'RETURNED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCirculationFilter(filter)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      circulationFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'ALL'
                      ? isNp
                        ? 'सबै'
                        : 'All'
                      : filter === 'ISSUED'
                      ? isNp
                        ? 'जारी'
                        : 'Issued'
                      : filter === 'OVERDUE'
                      ? isNp
                        ? 'म्याद नाघेको'
                        : 'Overdue'
                      : isNp
                      ? 'फिर्ता'
                      : 'Returned'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-3">{isNp ? 'कारोबार नं' : 'Circulation No'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'सदस्य विवरण' : 'Member'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'पुस्तक / दर्ता नं' : 'Book & Acc No'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'जारी / म्याद मिति' : 'Dates (BS)'}</th>
                    <th className="py-2.5 px-3">{isNp ? 'स्थिति' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCirculations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {isNp ? 'कुनै कारोबार रेकर्ड भेटिएन।' : 'No circulations found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCirculations.map((cir) => {
                      const isOverdue = cir.status === 'OVERDUE' || (cir.overdueDays || 0) > 0;
                      return (
                        <tr key={cir.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {cir.circulationNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {isNp ? cir.memberNameNp : cir.memberNameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {cir.memberCardNumber} • {cir.memberType}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {isNp ? cir.bookTitleNp : cir.bookTitleEn}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {cir.accessionNumber}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <div className="text-slate-600 dark:text-slate-300">
                              {isNp ? 'जारी:' : 'Issued:'} {cir.issueDateBs}
                            </div>
                            <div className={`font-medium ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                              {isNp ? 'म्याद:' : 'Due:'} {cir.dueDateBs}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {cir.status === 'RETURNED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {isNp ? 'फिर्ता भएको' : 'Returned'}
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                {isNp ? `म्याद नाघेको (${cir.overdueDays} दिन)` : `Overdue (${cir.overdueDays}d)`}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {isNp ? 'सक्रिय जारी' : 'Active'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {cir.status !== 'RETURNED' && (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  data-testid={`return-circulation-${cir.id}`}
                                  onClick={() => {
                                    setSelectedCirculationForReturn(cir);
                                    setIsReturnModalOpen(true);
                                  }}
                                  className="circulation-return-btn px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                                >
                                  {isNp ? 'फिर्ता' : 'Return'}
                                </button>
                                <button
                                  onClick={() => handleRenewBook(cir.id)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition"
                                  title="Renew 14 days"
                                >
                                  {isNp ? 'नविकरण' : 'Renew'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MEMBERSHIP DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {isNp ? 'पुस्तकालय सदस्य कार्ड लगत' : 'Library Membership Register'}
              </h2>
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'विद्यार्थी (अधिकतम २ पुस्तक, १४ दिन) र शिक्षक/कर्मचारी (अधिकतम ५ पुस्तक, ३० दिन) को कोटा नीति'
                  : 'Student borrowing limit: 2 books (14 days); Staff limit: 5 books (30 days)'}
              </p>
            </div>
            <button
              onClick={handleOpenMemberModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isNp ? 'नयाँ कार्ड जारी' : 'Issue Member Card'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">{isNp ? 'कार्ड नम्बर (Card No.)' : 'Card Number'}</th>
                    <th className="py-3 px-4">{isNp ? 'सदस्यको नाम' : 'Member Name'}</th>
                    <th className="py-3 px-4">{isNp ? 'प्रकार / कक्षा / पद' : 'Type / Class'}</th>
                    <th className="py-3 px-4">{isNp ? 'सम्पर्क फोन' : 'Phone'}</th>
                    <th className="py-3 px-4">{isNp ? 'कोटा उपयोग' : 'Quota Usage'}</th>
                    <th className="py-3 px-4">{isNp ? 'स्थिति' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((mem) => {
                    const isFull = mem.activeIssuesCount >= mem.maxAllowedBooks;
                    return (
                      <tr key={mem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {mem.cardNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {isNp ? (mem.fullNameNp || mem.fullNameEn) : (mem.fullNameEn || mem.fullNameNp)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {isNp ? (mem.fullNameEn || mem.fullNameNp) : (mem.fullNameNp || mem.fullNameEn)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              mem.memberType === 'STUDENT'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {mem.memberType === 'STUDENT' ? 'विद्यार्थी' : 'शिक्षक/कर्मचारी'}
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">{mem.detailsLabel}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {mem.phone || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                isFull
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {mem.activeIssuesCount} / {mem.maxAllowedBooks} {isNp ? 'पुस्तक' : 'Books'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isNp ? `म्याद: ${mem.maxIssueDays} दिन` : `Limit: ${mem.maxIssueDays}d`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            mem.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {mem.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canEdit && (
                            <button
                              data-testid={`edit-member-${mem.id}`}
                              onClick={() => handleOpenEditMember(mem)}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition inline-flex items-center gap-1"
                              title={isNp ? 'कोटा तथा स्थिति सम्पादन' : 'Edit Member Limits'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isNp ? 'सम्पादन' : 'Edit'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: OVERDUE FINES & SETTLEMENT */}
      {/* ======================================================== */}
      {activeTab === 'fines' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {isNp ? 'विलम्ब शुल्क तथा जरिवाना लगत' : 'Overdue Fines Register'}
              </h2>
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'तोकिएको म्याद नाघेमा प्रति दिन रु. २ का दरले जरिवाना असुल तथा मिनाहा प्रणाली'
                  : 'Overdue fine calculated automatically at NPR 2 / day.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">{isNp ? 'तिर्न बाँकी कुल रकम:' : 'Total Unpaid:'}</span>
              <div className="text-xl font-black text-rose-600">
                रु. {formatNumber(fines.filter((f) => f.paymentStatus === 'UNPAID').reduce((acc, f) => acc + f.fineAmount, 0))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">{isNp ? 'सदस्य विवरण' : 'Member Details'}</th>
                    <th className="py-3 px-4">{isNp ? 'पुस्तक शीर्षक / प्रति' : 'Book & Copy'}</th>
                    <th className="py-3 px-4">{isNp ? 'विलम्ब दिन' : 'Overdue Days'}</th>
                    <th className="py-3 px-4">{isNp ? 'दर / रकम' : 'Rate / Fine'}</th>
                    <th className="py-3 px-4">{isNp ? 'भुक्तानी स्थिति' : 'Payment Status'}</th>
                    <th className="py-3 px-4">{isNp ? 'रसिद नम्बर' : 'Receipt No'}</th>
                    <th className="py-3 px-4 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {isNp ? 'कुनै जरिवाना रेकर्ड छैन।' : 'No fines recorded.'}
                      </td>
                    </tr>
                  ) : (
                    fines.map((fine) => (
                      <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {isNp ? fine.memberNameNp : fine.memberNameEn}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{fine.memberCardNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                            {isNp ? fine.bookTitleNp : fine.bookTitleEn}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{fine.accessionNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-600">
                          {formatNumber(fine.overdueDays)} {isNp ? 'दिन' : 'days'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          रु. {formatNumber(fine.fineAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              fine.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : fine.paymentStatus === 'WAIVED'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {fine.paymentStatus === 'PAID'
                              ? isNp
                                ? 'भुक्तान भयो'
                                : 'Paid'
                              : fine.paymentStatus === 'WAIVED'
                              ? isNp
                                ? 'मिनाहा'
                                : 'Waived'
                              : isNp
                              ? 'बाँकी (Unpaid)'
                              : 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">
                          <div>{fine.receiptNumber || '-'}</div>
                          {fine.voucherNumber && (
                            <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {isNp ? `भौचर: ${fine.voucherNumber}` : `Voucher: ${fine.voucherNumber}`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {fine.paymentStatus === 'UNPAID' && (
                            <button
                              onClick={() => handlePayFine(fine.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition"
                            >
                              {isNp ? 'रसिद जारी / असुल' : 'Collect Fine'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CATEGORIES (DDC) & RACKS */}
      {/* ======================================================== */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {isNp ? 'विधा वर्गीकरण (Dewey Decimal Classification) तथा र्याकहरू' : 'Dewey Decimal Categories & Racks'}
              </h2>
              <p className="text-xs text-slate-500">
                {isNp
                  ? 'अन्तर्राष्ट्रिय DDC मापदण्ड अनुसार पाठ्यक्रम, सन्दर्भ, साहित्य र विज्ञान वर्गीकरण'
                  : 'International standard classification for school curriculum and literature.'}
              </p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isNp ? 'नयाँ विधा थप्नुहोस्' : 'Add Category'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((c) => {
              const bookCount = books.filter((b) => b.categoryId === c.id).length;
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs rounded border border-indigo-200 dark:border-indigo-800">
                      DDC {c.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {formatNumber(bookCount)} {isNp ? 'शीर्षक' : 'Titles'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isNp ? c.nameNp : c.nameEn}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {isNp ? c.nameEn : c.nameNp}
                  </div>
                  {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>}
                  {canEdit && (
                    <button
                      data-testid={`edit-category-${c.id}`}
                      onClick={() => handleOpenEditCategory(c)}
                      className="mt-2 w-full py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isNp ? 'विधा सम्पादन' : 'Edit Category'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD NEW BOOK */}
      {/* ======================================================== */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'नयाँ पुस्तक क्याटलग र प्रतिहरू दर्ता' : 'Register New Book Catalog'}</span>
              </h2>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'पुस्तकको नाम (नेपाली) *' : 'Book Title (Nepali) *'}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: मुना मदन"
                    value={newBookTitleNp}
                    onChange={(e) => setNewBookTitleNp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'पुस्तकको नाम (अंग्रेजी) *' : 'Book Title (English) *'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Muna Madan"
                    value={newBookTitleEn}
                    onChange={(e) => setNewBookTitleEn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'लेखक (Author) *' : 'Author *'}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: लक्ष्मीप्रसाद देवकोटा"
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'विधा (DDC Category) *' : 'DDC Category *'}
                  </label>
                  <select
                    value={newBookCategoryId}
                    onChange={(e) => setNewBookCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {isNp ? c.nameNp : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्रकाशन (Publisher)' : 'Publisher'}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: साझा प्रकाशन"
                    value={newBookPublisher}
                    onChange={(e) => setNewBookPublisher(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'संस्करण (Edition)' : 'Edition'}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: २५औं वा 25th"
                    value={newBookEdition}
                    onChange={(e) => setNewBookEdition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्रकाशन वर्ष (BS)' : 'Year (BS)'}
                  </label>
                  <input
                    type="text"
                    value={newBookYear}
                    onChange={(e) => setNewBookYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'भाषा (Language)' : 'Language'}
                  </label>
                  <select
                    value={newBookLanguage}
                    onChange={(e) => setNewBookLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  >
                    <option value="NEPALI">नेपाली (Nepali)</option>
                    <option value="ENGLISH">English</option>
                    <option value="SANSKRIT">संस्कृत (Sanskrit)</option>
                    <option value="MAITHILI">मैथिली (Maithili)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'र्याक / स्थान (Rack)' : 'Rack Location'}
                  </label>
                  <input
                    type="text"
                    value={newBookRackLocation}
                    onChange={(e) => setNewBookRackLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'मूल्य प्रति प्रति (रु)' : 'Price per Copy (NPR)'}
                  </label>
                  <input
                    type="number"
                    value={newBookPrice}
                    onChange={(e) => setNewBookPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Multi-Copy Accession Generation Configuration */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {isNp ? 'भौतिक प्रति तथा दर्ता नम्बर (Accession Setup)' : 'Physical Copies Setup'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isNp ? 'सुरुवाती प्रति संख्या (Initial Copies) *' : 'Initial Copies Count *'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={newBookInitialCopies}
                      onChange={(e) => setNewBookInitialCopies(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700"
                      required
                    />
                    <span className="text-[11px] text-slate-500">
                      {isNp ? 'प्रत्येक प्रतिको छुट्टै बारकोड/दर्ता नम्बर सिर्जना हुनेछ।' : 'Each copy will have unique accession number.'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isNp ? 'दर्ता उपसर्ग (Accession Prefix)' : 'Accession Prefix'}
                    </label>
                    <input
                      type="text"
                      value={newBookAccPrefix}
                      onChange={(e) => setNewBookAccPrefix(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 font-mono"
                    />
                    <span className="text-[11px] text-slate-500 font-mono">
                      e.g. {newBookAccPrefix}-0001, {newBookAccPrefix}-0002...
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isNp ? 'पुस्तक दर्ता गर्नुहोस्' : 'Save Book & Copies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: VIEW COPIES OF SELECTED BOOK */}
      {/* ======================================================== */}
      {selectedBookForDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                  {isNp ? selectedBookForDrawer.titleNp : selectedBookForDrawer.titleEn}
                </h2>
                <span className="text-xs text-slate-500">
                  {selectedBookForDrawer.author} • {selectedBookForDrawer.rackLocation}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {canEdit && (
                  <button
                    data-testid="drawer-edit-book-btn"
                    onClick={() => handleOpenEditBook(selectedBookForDrawer)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isNp ? 'विवरण सम्पादन' : 'Edit Book'}</span>
                  </button>
                )}
                <button
                  data-testid="close-copies-drawer"
                  onClick={() => setSelectedBookForDrawer(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isNp ? 'भौतिक प्रतिहरूको सूची' : 'Physical Accession Copies'} (
                  {selectedBookForDrawer.copies?.length || 0})
                </span>
                <button
                  onClick={() => setIsAddCopyModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isNp ? 'थप प्रति थप्नुहोस्' : 'Add Copy'}</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">{isNp ? 'दर्ता नं (Accession No)' : 'Accession No'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'बारकोड' : 'Barcode'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'अवस्था' : 'Condition'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'ऋण स्थिति' : 'Loan Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedBookForDrawer.copies?.map((copy) => (
                      <tr key={copy.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {copy.accessionNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {copy.barcode || copy.accessionNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              copy.condition === 'GOOD'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : copy.condition === 'FAIR'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {copy.condition}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              copy.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : copy.status === 'ISSUED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {copy.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD EXTRA COPIES */}
      {/* ======================================================== */}
      {isAddCopyModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isNp ? 'थप प्रतिहरू दर्ता' : 'Add Extra Copies'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'थप्ने प्रति संख्या (Count)' : 'Copies Count'}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={addCopyCount}
                onChange={(e) => setAddCopyCount(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddCopyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddCopies}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                {isNp ? 'थप्नुहोस्' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RETURN BOOK WITH OVERDUE FINE CALCULATOR */}
      {/* ======================================================== */}
      {isReturnModalOpen && selectedCirculationForReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>{isNp ? 'पुस्तक फिर्ता दर्ता' : 'Return Book Confirmation'}</span>
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-xs text-slate-500">{isNp ? 'पुस्तक:' : 'Book:'}</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {isNp ? selectedCirculationForReturn.bookTitleNp : selectedCirculationForReturn.bookTitleEn}
                </div>
                <div className="text-xs text-indigo-600 font-mono">
                  {selectedCirculationForReturn.accessionNumber}
                </div>
                <div className="text-xs text-slate-500 pt-1">
                  {isNp ? 'ऋणी सदस्य:' : 'Borrower:'}{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isNp ? selectedCirculationForReturn.memberNameNp : selectedCirculationForReturn.memberNameEn} (
                    {selectedCirculationForReturn.memberCardNumber})
                  </span>
                </div>
              </div>

              {/* Overdue Fine Notice */}
              {selectedCirculationForReturn.overdueDays && selectedCirculationForReturn.overdueDays > 0 ? (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-rose-800 dark:text-rose-200 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      {isNp ? 'म्याद नाघेको जरिवाना (Overdue Fine)' : 'Overdue Fine Due'}
                    </span>
                    <span className="text-base font-black">
                      रु. {formatNumber(selectedCirculationForReturn.calculatedFine || 0)}
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300">
                    {isNp
                      ? `म्याद मिति ${selectedCirculationForReturn.dueDateBs} बाट ${selectedCirculationForReturn.overdueDays} दिन ढिला भएको छ (रु २/दिन)।`
                      : `Late by ${selectedCirculationForReturn.overdueDays} days since ${selectedCirculationForReturn.dueDateBs} (NPR 2/day).`}
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-rose-900 dark:text-rose-200 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnFinePaid}
                      onChange={(e) => setReturnFinePaid(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{isNp ? 'विलम्ब शुल्क नगद असुल भयो (Fine Collected)' : 'Fine Collected & Settled'}</span>
                  </label>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                  {isNp ? 'समयमै फिर्ता भएको (कुनै जरिवाना लाग्दैन)' : 'Returned on time (Zero overdue fine).'}
                </div>
              )}

              {/* Book Physical Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'फिर्ता गर्दा पुस्तकको अवस्था' : 'Physical Condition'}
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                >
                  <option value="GOOD">{isNp ? 'राम्रो (Good)' : 'Good'}</option>
                  <option value="FAIR">{isNp ? 'सामान्य (Fair)' : 'Fair'}</option>
                  <option value="DAMAGED">{isNp ? 'च्यातिएको/क्षतिग्रस्त (Damaged)' : 'Damaged'}</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'कैफियत (Remarks)' : 'Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={isNp ? 'फिर्ता सम्बन्धमा कुनै कैफियत...' : 'Notes...'}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleReturnBook}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {isNp ? 'फिर्ता दर्ता गर्नुहोस्' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW MEMBER */}
      {/* ======================================================== */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'नयाँ पुस्तकालय सदस्यता कार्ड' : 'Issue Library Membership Card'}</span>
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'सदस्यको प्रकार *' : 'Member Type *'}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="mType"
                      checked={newMemberType === 'STUDENT'}
                      onChange={() => handleMemberTypeChange('STUDENT')}
                    />
                    <span>{isNp ? 'विद्यार्थी (२ पुस्तक, १४ दिन)' : 'Student (2 Books, 14d)'}</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="mType"
                      checked={newMemberType === 'STAFF'}
                      onChange={() => handleMemberTypeChange('STAFF')}
                    />
                    <span>{isNp ? 'शिक्षक/कर्मचारी (५ पुस्तक, ३० दिन)' : 'Staff (5 Books, 30d)'}</span>
                  </label>
                </div>
              </div>

              {newMemberType === 'STUDENT' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'विद्यार्थी छनोट *' : 'Select Student *'}
                  </label>
                  <select
                    value={newMemberStudentId}
                    onChange={(e) => setNewMemberStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                    required
                  >
                    <option value="">{isNp ? '-- विद्यार्थी छनोट गर्नुहोस् --' : '-- Select Student --'}</option>
                    {students.map((s) => {
                      const existingCard = members.find((m) => m.studentId === s.id);
                      const name = isNp
                        ? [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ') || [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ')
                        : [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ') || [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ');
                      const classLabel = s.classNameNp || s.classNameEn || (s.currentClass ? `${isNp ? 'कक्षा ' : 'Class '}${s.currentClass}` : '');
                      const rollLabel = s.rollNumber ? `${isNp ? 'रोल: ' : 'Roll: '}${s.rollNumber}` : '';
                      const meta = [classLabel, rollLabel].filter(Boolean).join(', ');
                      return (
                        <option key={s.id} value={s.id} disabled={Boolean(existingCard)}>
                          {name || 'Unknown'} {meta ? `(${meta})` : ''} {existingCard ? `[कार्ड: ${existingCard.cardNumber}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {members.some((m) => m.studentId === newMemberStudentId) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      {isNp ? 'यो विद्यार्थीको कार्ड पहिले नै जारी भइसकेको छ।' : 'This student already has an active library card.'}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'शिक्षक/कर्मचारी छनोट *' : 'Select Staff *'}
                  </label>
                  <select
                    value={newMemberStaffId}
                    onChange={(e) => setNewMemberStaffId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                    required
                  >
                    <option value="">{isNp ? '-- शिक्षक/कर्मचारी छनोट गर्नुहोस् --' : '-- Select Staff --'}</option>
                    {staffList.map((st) => {
                      const existingCard = members.find((m) => m.staffId === st.id);
                      const name = isNp
                        ? st.fullNameNp || st.fullNameEn || [st.firstNameNp, st.lastNameNp].filter(Boolean).join(' ')
                        : st.fullNameEn || st.fullNameNp || [st.firstNameEn, st.lastNameEn].filter(Boolean).join(' ');
                      const code = st.staffCode ? `[${st.staffCode}]` : '';
                      const dept = st.department || st.designation || 'Academic';
                      return (
                        <option key={st.id} value={st.id} disabled={Boolean(existingCard)}>
                          {code ? `${code} ` : ''}{name || 'Staff Member'} ({dept}) {existingCard ? `[कार्ड: ${existingCard.cardNumber}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {members.some((m) => m.staffId === newMemberStaffId) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      {isNp ? 'यो शिक्षक/कर्मचारीको कार्ड पहिले नै जारी भइसकेको छ।' : 'This staff member already has an active library card.'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isNp ? 'कार्ड जारी गर्नुहोस्' : 'Issue Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD DDC CATEGORY */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isNp ? 'नयाँ विधा (DDC Category) थप्नुहोस्' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'DDC कोड * (e.g. 700)' : 'DDC Code *'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 700"
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विधाको नाम (नेपाली) *' : 'Name (Nepali) *'}
                </label>
                <input
                  type="text"
                  placeholder="उदा: कला तथा संगीत"
                  value={newCategoryNameNp}
                  onChange={(e) => setNewCategoryNameNp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विधाको नाम (अंग्रेजी) *' : 'Name (English) *'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arts & Recreation"
                  value={newCategoryNameEn}
                  onChange={(e) => setNewCategoryNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विवरण' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT MEMBER LIMITS & POLICY */}
      {/* ======================================================== */}
      {isEditMemberModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'पुस्तकालय सदस्य कोटा तथा नीति सम्पादन' : 'Edit Member Quota & Policy'}</span>
              </h3>
              <button
                onClick={() => setIsEditMemberModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Summary Pill */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {isNp ? editingMember.fullNameNp || editingMember.fullNameEn : editingMember.fullNameEn || editingMember.fullNameNp}
              </div>
              <div className="text-slate-500 font-mono mt-0.5">
                {editingMember.cardNumber} • {editingMember.memberType === 'STUDENT' ? 'विद्यार्थी' : 'शिक्षक/कर्मचारी'}
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'अधिकतम पुस्तक संख्या (Max Allowed Books) *' : 'Max Allowed Books *'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editMemberMaxBooks}
                  onChange={(e) => setEditMemberMaxBooks(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
                <span className="text-[11px] text-slate-500">
                  {isNp ? 'प्रशासन वा प्रधानाध्यापकले १ देखि ५० सम्म कोटा तोक्न सक्ने' : 'Allowed range: 1 to 50 books'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'अधिकतम ऋण म्याद (दिन) *' : 'Max Borrow Days *'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={editMemberMaxDays}
                  onChange={(e) => setEditMemberMaxDays(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
                <span className="text-[11px] text-slate-500">
                  {isNp ? 'दिन (उदा: १४, २१, ३०, ६० दिन)' : 'Max days per loan (1 to 180 days)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'सदस्यता स्थिति (Membership Status) *' : 'Membership Status *'}
                </label>
                <select
                  value={editMemberStatus}
                  onChange={(e) => setEditMemberStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                >
                  <option value="ACTIVE">{isNp ? 'सक्रिय (ACTIVE)' : 'Active'}</option>
                  <option value="SUSPENDED">{isNp ? 'निलम्बित (SUSPENDED)' : 'Suspended'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditMemberModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT DDC CATEGORY */}
      {/* ======================================================== */}
      {isEditCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'विधा (DDC Category) सम्पादन' : 'Edit Category'}</span>
              </h3>
              <button
                onClick={() => setIsEditCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'DDC कोड * (e.g. 700)' : 'DDC Code *'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 700"
                  value={editCategoryCode}
                  onChange={(e) => setEditCategoryCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विधाको नाम (नेपाली) *' : 'Name (Nepali) *'}
                </label>
                <input
                  type="text"
                  placeholder="उदा: कला तथा मनोरञ्जन"
                  value={editCategoryNameNp}
                  onChange={(e) => setEditCategoryNameNp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विधाको नाम (अंग्रेजी) *' : 'Name (English) *'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arts & Recreation"
                  value={editCategoryNameEn}
                  onChange={(e) => setEditCategoryNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विवरण' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editCategoryDesc}
                  onChange={(e) => setEditCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT BOOK CATALOG */}
      {/* ======================================================== */}
      {isEditBookModalOpen && editingBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'पुस्तक क्याटलग सम्पादन' : 'Edit Book Catalog'}</span>
              </h2>
              <button
                onClick={() => setIsEditBookModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'पुस्तकको नाम (नेपाली) *' : 'Book Title (Nepali) *'}
                  </label>
                  <input
                    type="text"
                    value={editBookTitleNp}
                    onChange={(e) => setEditBookTitleNp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'पुस्तकको नाम (अंग्रेजी) *' : 'Book Title (English) *'}
                  </label>
                  <input
                    type="text"
                    value={editBookTitleEn}
                    onChange={(e) => setEditBookTitleEn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'लेखक (Author) *' : 'Author *'}
                  </label>
                  <input
                    type="text"
                    value={editBookAuthor}
                    onChange={(e) => setEditBookAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'विधा (DDC Category) *' : 'DDC Category *'}
                  </label>
                  <select
                    value={editBookCategoryId}
                    onChange={(e) => setEditBookCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {isNp ? c.nameNp : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्रकाशन (Publisher)' : 'Publisher'}
                  </label>
                  <input
                    type="text"
                    value={editBookPublisher}
                    onChange={(e) => setEditBookPublisher(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'संस्करण (Edition)' : 'Edition'}
                  </label>
                  <input
                    type="text"
                    value={editBookEdition}
                    onChange={(e) => setEditBookEdition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्रकाशन वर्ष (BS)' : 'Year (BS)'}
                  </label>
                  <input
                    type="text"
                    value={editBookYear}
                    onChange={(e) => setEditBookYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'भाषा (Language)' : 'Language'}
                  </label>
                  <select
                    value={editBookLanguage}
                    onChange={(e) => setEditBookLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  >
                    <option value="NEPALI">नेपाली (Nepali)</option>
                    <option value="ENGLISH">English</option>
                    <option value="SANSKRIT">संस्कृत (Sanskrit)</option>
                    <option value="MAITHILI">मैथिली (Maithili)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'र्याक / स्थान (Rack)' : 'Rack Location'}
                  </label>
                  <input
                    type="text"
                    value={editBookRackLocation}
                    onChange={(e) => setEditBookRackLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'मूल्य प्रति प्रति (रु)' : 'Price per Copy (NPR)'}
                  </label>
                  <input
                    type="number"
                    value={editBookPrice}
                    onChange={(e) => setEditBookPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'ISBN नम्बर' : 'ISBN Number'}
                  </label>
                  <input
                    type="text"
                    value={editBookIsbn}
                    onChange={(e) => setEditBookIsbn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'संक्षिप्त विवरण (Description)' : 'Description'}
                  </label>
                  <input
                    type="text"
                    value={editBookDesc}
                    onChange={(e) => setEditBookDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isNp ? 'विवरण अद्यावधिक गर्नुहोस्' : 'Update Book Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
