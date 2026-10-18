import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import {
  Globe,
  Sliders,
  Bell,
  Calendar,
  Image as ImageIcon,
  Download,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Pin,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  Navigation,
  GraduationCap,
  BookOpen,
  Award,
  Sparkles,
  Layers,
  Building,
} from 'lucide-react';
import {
  WebsiteSettings,
  WebsiteNavItem,
  WebsiteAcademicProgram,
  WebsiteHeroSlide,
  WebsiteNotice,
  WebsiteEvent,
  WebsiteGalleryAlbum,
  WebsiteDownload,
  WebsiteInquiry,
} from '@sms/shared';
import { ImageUploadField } from '../components/ImageUploadField';
import { FileUploadField } from '../components/FileUploadField';

export const WebsiteManagement: React.FC = () => {
  const { language } = useLanguage();
  const { school, setSchoolData, refreshSchool } = useSchool();
  const isNp = language === 'np';

  const [activeTab, setActiveTab] = useState<
    'settings' | 'nav_menu' | 'academics' | 'slides' | 'notices' | 'events' | 'gallery' | 'downloads' | 'inquiries'
  >('settings');

  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [settings, setSettings] = useState<Partial<WebsiteSettings>>({});
  const [navItems, setNavItems] = useState<WebsiteNavItem[]>([]);
  const [academicPrograms, setAcademicPrograms] = useState<WebsiteAcademicProgram[]>([]);
  const [slides, setSlides] = useState<WebsiteHeroSlide[]>([]);
  const [notices, setNotices] = useState<WebsiteNotice[]>([]);
  const [events, setEvents] = useState<WebsiteEvent[]>([]);
  const [albums, setAlbums] = useState<WebsiteGalleryAlbum[]>([]);
  const [downloads, setDownloads] = useState<WebsiteDownload[]>([]);
  const [inquiries, setInquiries] = useState<WebsiteInquiry[]>([]);

  // Navigation Menu Modals
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [editingNavItem, setEditingNavItem] = useState<WebsiteNavItem | null>(null);
  const [navForm, setNavForm] = useState({
    titleNp: '',
    titleEn: '',
    url: '#home',
    isExternal: false,
    sortOrder: 0,
    isVisible: true,
  });

  // Academic Programs Modals
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WebsiteAcademicProgram | null>(null);
  const [programForm, setProgramForm] = useState({
    titleNp: '',
    titleEn: '',
    descriptionNp: '',
    descriptionEn: '',
    icon: 'BookOpen',
    badgeNp: '',
    badgeEn: '',
    sortOrder: 0,
    isActive: true,
  });

  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<WebsiteHeroSlide | null>(null);
  const [slideForm, setSlideForm] = useState({
    titleNp: '',
    titleEn: '',
    subtitleNp: '',
    subtitleEn: '',
    imageUrl: '',
    buttonTextNp: '',
    buttonTextEn: '',
    buttonLink: '',
    sortOrder: 0,
    isActive: true,
  });

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<WebsiteNotice | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    titleNp: '',
    titleEn: '',
    contentNp: '',
    contentEn: '',
    category: 'GENERAL' as any,
    publishDateBs: '2083-04-20',
    expireDateBs: '',
    fileUrl: '',
    isPinned: false,
    isActive: true,
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WebsiteEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    titleNp: '',
    titleEn: '',
    descriptionNp: '',
    descriptionEn: '',
    eventDateBs: '2083-08-10',
    eventTime: '१०:०० AM - ४:०० PM',
    venueNp: '',
    venueEn: '',
    status: 'UPCOMING' as any,
  });

  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<WebsiteGalleryAlbum | null>(null);
  const [albumForm, setAlbumForm] = useState({
    titleNp: '',
    titleEn: '',
    category: 'CAMPUS',
    coverImageUrl: '',
    descriptionNp: '',
    descriptionEn: '',
  });

  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState({
    titleNp: '',
    titleEn: '',
    imageUrl: '',
    sortOrder: 1,
  });

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [editingDownload, setEditingDownload] = useState<WebsiteDownload | null>(null);
  const [downloadForm, setDownloadForm] = useState({
    titleNp: '',
    titleEn: '',
    category: 'OTHER' as any,
    fileUrl: '',
    fileSize: '1.5 MB',
  });

  const [viewingInquiry, setViewingInquiry] = useState<WebsiteInquiry | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('sms_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchCmsData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cms/overview', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch CMS overview');
      const data = await res.json();
      setSettings(data.settings || {});
      setNavItems(data.navItems || []);
      setAcademicPrograms(data.academicPrograms || []);
      setSlides(data.slides || []);
      setNotices(data.notices || []);
      setEvents(data.events || []);
      setAlbums(data.albums || []);
      setDownloads(data.downloads || []);
      setInquiries(data.inquiries || []);
    } catch (err: any) {
      console.error('Error loading CMS data:', err);
      showNotification(isNp ? 'डाटा लोड गर्न सकिएन' : 'Failed to load CMS data', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsData();
  }, []);

  // Handlers for Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cms/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      showNotification(isNp ? 'वेबसाइट सेटिङ सफलतापूर्वक सुरक्षित भयो!' : 'Website settings updated successfully!');
      fetchCmsData();
      if (refreshSchool) {
        await refreshSchool();
      }
    } catch (err: any) {
      showNotification(err.message || 'Error updating settings', true);
    }
  };

  // Handlers for Navigation Menu
  const openAddNavItem = () => {
    setEditingNavItem(null);
    setNavForm({
      titleNp: '',
      titleEn: '',
      url: '#home',
      isExternal: false,
      sortOrder: navItems.length + 1,
      isVisible: true,
    });
    setIsNavModalOpen(true);
  };

  const openEditNavItem = (item: WebsiteNavItem) => {
    setEditingNavItem(item);
    setNavForm({
      titleNp: item.titleNp,
      titleEn: item.titleEn,
      url: item.url,
      isExternal: item.isExternal,
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
    setIsNavModalOpen(true);
  };

  const handleSaveNavItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingNavItem ? `/api/cms/nav-items/${editingNavItem.id}` : '/api/cms/nav-items';
      const method = editingNavItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(navForm),
      });
      if (!res.ok) throw new Error('Failed to save menu item');
      setIsNavModalOpen(false);
      showNotification(isNp ? 'मेनु सफलतापूर्वक सुरक्षित गरियो!' : 'Menu item saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save menu item', true);
    }
  };

  const handleDeleteNavItem = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो मेनु हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this menu item?')) return;
    try {
      const res = await fetch(`/api/cms/nav-items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete menu item');
      showNotification(isNp ? 'मेनु मेटाइयो!' : 'Menu item deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleToggleNavVisibility = async (item: WebsiteNavItem) => {
    try {
      const res = await fetch(`/api/cms/nav-items/${item.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });
      if (!res.ok) throw new Error('Failed to toggle visibility');
      showNotification(
        isNp
          ? item.isVisible ? 'मेनु निष्कृय गरियो!' : 'मेनु सक्रिय गरियो!'
          : item.isVisible ? 'Menu hidden' : 'Menu visible'
      );
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Academic Programs
  const openAddProgram = () => {
    setEditingProgram(null);
    setProgramForm({
      titleNp: '',
      titleEn: '',
      descriptionNp: '',
      descriptionEn: '',
      icon: 'BookOpen',
      badgeNp: '',
      badgeEn: '',
      sortOrder: academicPrograms.length + 1,
      isActive: true,
    });
    setIsProgramModalOpen(true);
  };

  const openEditProgram = (prog: WebsiteAcademicProgram) => {
    setEditingProgram(prog);
    setProgramForm({
      titleNp: prog.titleNp,
      titleEn: prog.titleEn,
      descriptionNp: prog.descriptionNp,
      descriptionEn: prog.descriptionEn,
      icon: prog.icon || 'BookOpen',
      badgeNp: prog.badgeNp || '',
      badgeEn: prog.badgeEn || '',
      sortOrder: prog.sortOrder,
      isActive: prog.isActive,
    });
    setIsProgramModalOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProgram ? `/api/cms/academic-programs/${editingProgram.id}` : '/api/cms/academic-programs';
      const method = editingProgram ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(programForm),
      });
      if (!res.ok) throw new Error('Failed to save academic program');
      setIsProgramModalOpen(false);
      showNotification(isNp ? 'शैक्षिक कार्यक्रम सुरक्षित गरियो!' : 'Academic program saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save program', true);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो शैक्षिक कार्यक्रम हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this program?')) return;
    try {
      const res = await fetch(`/api/cms/academic-programs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete program');
      showNotification(isNp ? 'कार्यक्रम मेटाइयो!' : 'Program deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleToggleProgramActive = async (prog: WebsiteAcademicProgram) => {
    try {
      const res = await fetch(`/api/cms/academic-programs/${prog.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !prog.isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      showNotification(
        isNp
          ? prog.isActive ? 'कार्यक्रम निष्कृय गरियो!' : 'कार्यक्रम सक्रिय गरियो!'
          : prog.isActive ? 'Program deactivated' : 'Program activated'
      );
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Slides
  const openAddSlide = () => {
    setEditingSlide(null);
    setSlideForm({
      titleNp: '',
      titleEn: '',
      subtitleNp: '',
      subtitleEn: '',
      imageUrl: '',
      buttonTextNp: 'हाम्रो बारेमा',
      buttonTextEn: 'Discover More',
      buttonLink: '#about',
      sortOrder: slides.length + 1,
      isActive: true,
    });
    setIsSlideModalOpen(true);
  };

  const openEditSlide = (slide: WebsiteHeroSlide) => {
    setEditingSlide(slide);
    setSlideForm({
      titleNp: slide.titleNp,
      titleEn: slide.titleEn,
      subtitleNp: slide.subtitleNp || '',
      subtitleEn: slide.subtitleEn || '',
      imageUrl: slide.imageUrl,
      buttonTextNp: slide.buttonTextNp || '',
      buttonTextEn: slide.buttonTextEn || '',
      buttonLink: slide.buttonLink || '',
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
    });
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSlide ? `/api/cms/slides/${editingSlide.id}` : '/api/cms/slides';
      const method = editingSlide ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(slideForm),
      });
      if (!res.ok) throw new Error('Failed to save slide');
      setIsSlideModalOpen(false);
      showNotification(isNp ? 'स्लाइडर सुरक्षित गरियो!' : 'Slide saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save slide', true);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो ब्यानर हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this slide?')) return;
    try {
      const res = await fetch(`/api/cms/slides/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete slide');
      showNotification(isNp ? 'ब्यानर मेटाइयो!' : 'Slide deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Notices
  const openAddNotice = () => {
    setEditingNotice(null);
    setNoticeForm({
      titleNp: '',
      titleEn: '',
      contentNp: '',
      contentEn: '',
      category: 'GENERAL',
      publishDateBs: '2083-04-20',
      expireDateBs: '',
      fileUrl: '',
      isPinned: false,
      isActive: true,
    });
    setIsNoticeModalOpen(true);
  };

  const openEditNotice = (notice: WebsiteNotice) => {
    setEditingNotice(notice);
    setNoticeForm({
      titleNp: notice.titleNp,
      titleEn: notice.titleEn,
      contentNp: notice.contentNp,
      contentEn: notice.contentEn,
      category: notice.category,
      publishDateBs: notice.publishDateBs,
      expireDateBs: notice.expireDateBs || '',
      fileUrl: notice.fileUrl || '',
      isPinned: notice.isPinned,
      isActive: notice.isActive,
    });
    setIsNoticeModalOpen(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingNotice ? `/api/cms/notices/${editingNotice.id}` : '/api/cms/notices';
      const method = editingNotice ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(noticeForm),
      });
      if (!res.ok) throw new Error('Failed to save notice');
      setIsNoticeModalOpen(false);
      showNotification(isNp ? 'सूचना सुरक्षित गरियो!' : 'Notice saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save notice', true);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो सूचना हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this notice?')) return;
    try {
      const res = await fetch(`/api/cms/notices/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete notice');
      showNotification(isNp ? 'सूचना मेटाइयो!' : 'Notice deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Events
  const openAddEvent = () => {
    setEditingEvent(null);
    setEventForm({
      titleNp: '',
      titleEn: '',
      descriptionNp: '',
      descriptionEn: '',
      eventDateBs: '2083-08-10',
      eventTime: '१०:०० AM - ४:०० PM',
      venueNp: 'विद्यालय खेलमैदान',
      venueEn: 'School Grounds',
      status: 'UPCOMING',
    });
    setIsEventModalOpen(true);
  };

  const openEditEvent = (ev: WebsiteEvent) => {
    setEditingEvent(ev);
    setEventForm({
      titleNp: ev.titleNp,
      titleEn: ev.titleEn,
      descriptionNp: ev.descriptionNp || '',
      descriptionEn: ev.descriptionEn || '',
      eventDateBs: ev.eventDateBs,
      eventTime: ev.eventTime || '',
      venueNp: ev.venueNp || '',
      venueEn: ev.venueEn || '',
      status: ev.status,
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEvent ? `/api/cms/events/${editingEvent.id}` : '/api/cms/events';
      const method = editingEvent ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(eventForm),
      });
      if (!res.ok) throw new Error('Failed to save event');
      setIsEventModalOpen(false);
      showNotification(isNp ? 'कार्यक्रम सुरक्षित गरियो!' : 'Event saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो कार्यक्रम हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/cms/events/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete event');
      showNotification(isNp ? 'कार्यक्रम मेटाइयो!' : 'Event deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Albums
  const openAddAlbum = () => {
    setEditingAlbum(null);
    setAlbumForm({
      titleNp: '',
      titleEn: '',
      category: 'CAMPUS',
      coverImageUrl: '',
      descriptionNp: '',
      descriptionEn: '',
    });
    setIsAlbumModalOpen(true);
  };

  const openEditAlbum = (album: WebsiteGalleryAlbum) => {
    setEditingAlbum(album);
    setAlbumForm({
      titleNp: album.titleNp,
      titleEn: album.titleEn,
      category: album.category,
      coverImageUrl: album.coverImageUrl,
      descriptionNp: album.descriptionNp || '',
      descriptionEn: album.descriptionEn || '',
    });
    setIsAlbumModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAlbum ? `/api/cms/albums/${editingAlbum.id}` : '/api/cms/albums';
      const method = editingAlbum ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(albumForm),
      });
      if (!res.ok) throw new Error('Failed to save album');
      setIsAlbumModalOpen(false);
      showNotification(isNp ? 'एल्बम सुरक्षित गरियो!' : 'Album saved successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो एल्बम हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this album?')) return;
    try {
      const res = await fetch(`/api/cms/albums/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete album');
      showNotification(isNp ? 'एल्बम मेटाइयो!' : 'Album deleted successfully!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleAddPhotoToAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAlbumId) return;
    try {
      const res = await fetch(`/api/cms/albums/${targetAlbumId}/images`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(photoForm),
      });
      if (!res.ok) throw new Error('Failed to add photo');
      setIsAddPhotoModalOpen(false);
      showNotification(isNp ? 'तस्बिर एल्बममा थपियो!' : 'Photo added to album!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो तस्बिर हटाउन चाहनुहुन्छ?' : 'Delete this photo?')) return;
    try {
      const res = await fetch(`/api/cms/images/${photoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete image');
      showNotification(isNp ? 'तस्बिर हटाइयो!' : 'Photo removed!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Downloads
  const openAddDownload = () => {
    setEditingDownload(null);
    setDownloadForm({
      titleNp: '',
      titleEn: '',
      category: 'OTHER',
      fileUrl: '',
      fileSize: '1.2 MB',
    });
    setIsDownloadModalOpen(true);
  };

  const openEditDownload = (dl: WebsiteDownload) => {
    setEditingDownload(dl);
    setDownloadForm({
      titleNp: dl.titleNp,
      titleEn: dl.titleEn,
      category: dl.category,
      fileUrl: dl.fileUrl,
      fileSize: dl.fileSize || '1.0 MB',
    });
    setIsDownloadModalOpen(true);
  };

  const handleSaveDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDownload ? `/api/cms/downloads/${editingDownload.id}` : '/api/cms/downloads';
      const method = editingDownload ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(downloadForm),
      });
      if (!res.ok) throw new Error('Failed to save download');
      setIsDownloadModalOpen(false);
      showNotification(isNp ? 'डाउनलोड फाइल सुरक्षित भयो!' : 'Download item saved!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteDownload = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो फाइल हटाउन चाहनुहुन्छ?' : 'Delete this download?')) return;
    try {
      const res = await fetch(`/api/cms/downloads/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete download');
      showNotification(isNp ? 'फाइल हटाइयो!' : 'Download removed!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Handlers for Inquiries
  const handleUpdateInquiryStatus = async (id: string, status: string, notes?: string) => {
    try {
      const res = await fetch(`/api/cms/inquiries/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, responseNotes: notes }),
      });
      if (!res.ok) throw new Error('Failed to update inquiry status');
      showNotification(isNp ? 'सोधपुछ स्थिति अद्यावधिक भयो!' : 'Inquiry status updated!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो सन्देश हटाउन चाहनुहुन्छ?' : 'Delete this inquiry?')) return;
    try {
      const res = await fetch(`/api/cms/inquiries/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete inquiry');
      showNotification(isNp ? 'सन्देश हटाइयो!' : 'Inquiry deleted!');
      fetchCmsData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? 'विद्यालय वेबसाइट व्यवस्थापन (Website CMS)' : 'School Website Management (CMS)'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isNp
                  ? 'सार्वजनिक वेबसाइटका सूचना, ब्यानर, फोटो ग्यालरी, कार्यक्रम र मन्तव्यहरू थप्ने तथा सम्पादन गर्ने प्रणाली'
                  : 'Manage public website content, hero banners, notices, events, and visitor inquiries'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4" />
            {isNp ? 'सार्वजनिक वेबसाइट खोल्नुहोस्' : 'Preview Public Website'}
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 rounded-xl shadow-2xs gap-1">
        {[
          { id: 'settings', labelNp: 'सामान्य विवरण र मन्तव्य', labelEn: 'General & Messages', icon: Sliders },
          { id: 'nav_menu', labelNp: 'वेबसाइट मेनु', labelEn: 'Navigation Menu', icon: Navigation, count: navItems.length },
          { id: 'academics', labelNp: 'शैक्षिक कार्यक्रम', labelEn: 'Academic Programs', icon: GraduationCap, count: academicPrograms.length },
          { id: 'slides', labelNp: 'ब्यानर तथा स्लाइडहरू', labelEn: 'Hero Banners', icon: Sliders, count: slides.length },
          { id: 'notices', labelNp: 'सार्वजनिक सूचनाहरू', labelEn: 'Public Notices', icon: Bell, count: notices.length },
          { id: 'events', labelNp: 'कार्यक्रम तथा क्यालेन्डर', labelEn: 'Events', icon: Calendar, count: events.length },
          { id: 'gallery', labelNp: 'फोटो ग्यालरी', labelEn: 'Photo Gallery', icon: ImageIcon, count: albums.length },
          { id: 'downloads', labelNp: 'डाउनलोड फारामहरू', labelEn: 'Downloads', icon: Download, count: downloads.length },
          { id: 'inquiries', labelNp: 'अनलाइन सोधपुछ', labelEn: 'Inquiries', icon: MessageSquare, count: inquiries.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isNp ? tab.labelNp : tab.labelEn}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL SETTINGS, LOGO & MESSAGES */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Card 1: School Identity Synchronized from School Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {isNp ? 'विद्यालयको आधिकारिक पहिचान तथा सम्बद्धता' : 'Official School Identity & Affiliation'}
              </h2>
              <a
                href="/school_settings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
              >
                <span>{isNp ? 'विद्यालय सेटिङ सच्याउनुहोस्' : 'Edit School Settings'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* School Settings Live Sync Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl">🏛️</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {school?.nameNp || 'श्री शान्ति माध्यमिक विद्यालय'}
                  <span className="text-xs font-medium text-slate-500 ml-2">({school?.nameEn || 'Shree Shanti Secondary School'})</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {school?.mottoNp || 'सत्य र ज्ञानका लागि शिक्षा'}
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-3 pt-0.5 justify-center sm:justify-start">
                  <span>IEMIS: <strong className="text-slate-700 dark:text-slate-300">{school?.iemisCode || '270010001'}</strong></span>
                  <span>स्थापना: <strong className="text-slate-700 dark:text-slate-300">{school?.establishedBsYear || 2028} वि.सं.</strong></span>
                  <span>सम्पर्क: <strong className="text-slate-700 dark:text-slate-300">{school?.phone || '+977-01-5250000'}</strong></span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isNp ? 'SMS विद्यालय सेटिङबाट सिङ्क' : 'Synced from School Profile'}</span>
              </div>
            </div>

            {/* Direct Logo Upload in Website Management */}
            <div className="pt-2">
              <ImageUploadField
                label={isNp ? 'विद्यालयको आधिकारिक लोगो (Official School Logo)' : 'Official School Logo'}
                value={settings.logoUrl || school?.logoUrl || ''}
                onChange={async (url) => {
                  setSettings((prev) => ({ ...prev, logoUrl: url }));
                  try {
                    const token = localStorage.getItem('sms_token');
                    await fetch('/api/school/profile', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        ...school,
                        logoUrl: url,
                      }),
                    });
                    if (school) {
                      setSchoolData({ ...school, logoUrl: url });
                      await refreshSchool();
                    }
                    setSuccessMessage(isNp ? 'विद्यालयको नयाँ लोगो सफलतापूर्वक सुरक्षित भयो!' : 'School logo updated successfully!');
                  } catch (err) {
                    console.error('Failed to sync school logo:', err);
                  }
                }}
                folder="school"
                helpText={isNp ? 'यहाँ नयाँ लोगो अपलोड गर्दा SMS र वेबसाइट दुवैमा एकैसाथ तुरुन्त अपडेट हुन्छ।' : 'Uploading logo here immediately updates both SMS and Website.'}
              />
            </div>

            {/* Core School Name & Motto Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विद्यालयको आधिकारिक नाम (नेपाली) *' : 'School Official Name (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={settings.schoolNameNp || school?.nameNp || ''}
                  onChange={(e) => setSettings({ ...settings, schoolNameNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-bold"
                  placeholder="उदा: श्री राजेश्वर निधि माध्यमिक विद्यालय"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विद्यालयको आधिकारिक नाम (English) *' : 'School Official Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={settings.schoolNameEn || school?.nameEn || ''}
                  onChange={(e) => setSettings({ ...settings, schoolNameEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-bold"
                  placeholder="e.g. Shree Rajeshwar Nidhi Secondary School"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'मूल नारा (नेपाली)' : 'School Motto (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.mottoNp || school?.mottoNp || ''}
                  onChange={(e) => setSettings({ ...settings, mottoNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: सत्य र ज्ञानका लागि शिक्षा"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'मूल नारा (English)' : 'School Motto (English)'}
                </label>
                <input
                  type="text"
                  value={settings.mottoEn || school?.mottoEn || ''}
                  onChange={(e) => setSettings({ ...settings, mottoEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Education for Truth and Enlightenment"
                />
              </div>
            </div>

            {/* Website-specific affiliation badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'वेबसाइट सम्बद्धता / मान्यता ब्याड्ज (नेपाली)' : 'Website Affiliation Badge (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.affiliationTextNp || ''}
                  onChange={(e) => setSettings({ ...settings, affiliationTextNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="नेपाल सरकार | CEHRD मान्यता प्राप्त"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'वेबसाइट सम्बद्धता / मान्यता ब्याड्ज (English)' : 'Website Affiliation Badge (English)'}
                </label>
                <input
                  type="text"
                  value={settings.affiliationTextEn || ''}
                  onChange={(e) => setSettings({ ...settings, affiliationTextEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Govt. of Nepal | CEHRD Aligned"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Homepage Hero Titles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-indigo-600" />
              {isNp ? 'होमपेज ब्यानर शीर्षक तथा मुख्य नारा' : 'Homepage Hero Titles & Subtitle'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'मुख्य शीर्षक (नेपाली)' : 'Hero Title (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.heroTitleNp || ''}
                  onChange={(e) => setSettings({ ...settings, heroTitleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="ज्ञान, संस्कार र प्रविधिको त्रिवेणी"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'मुख्य शीर्षक (English)' : 'Hero Title (English)'}
                </label>
                <input
                  type="text"
                  value={settings.heroTitleEn || ''}
                  onChange={(e) => setSettings({ ...settings, heroTitleEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Center of Excellence in Modern Education"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'उप-शीर्षक / नारा (नेपाली)' : 'Hero Subtitle (Nepali)'}
                </label>
                <textarea
                  rows={2}
                  value={settings.heroSubtitleNp || ''}
                  onChange={(e) => setSettings({ ...settings, heroSubtitleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="ज्ञान र नवप्रवर्तनतर्फ अग्रसर..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'उप-शीर्षक / नारा (English)' : 'Hero Subtitle (English)'}
                </label>
                <textarea
                  rows={2}
                  value={settings.heroSubtitleEn || ''}
                  onChange={(e) => setSettings({ ...settings, heroSubtitleEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Pioneering excellence and character education..."
                />
              </div>
            </div>
          </div>

          {/* Card 3: About Us & Campus Photo */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              {isNp ? 'विद्यालयको विस्तृत परिचय तथा क्याम्पस फोटो (About Us)' : 'About School & Campus Photo'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'परिचय शीर्षक (नेपाली)' : 'About Title (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.aboutTitleNp || ''}
                  onChange={(e) => setSettings({ ...settings, aboutTitleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-semibold"
                  placeholder="श्री राजेश्वर निधि माध्यमिक विद्यालयको संक्षिप्त परिचय"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'परिचय शीर्षक (English)' : 'About Title (English)'}
                </label>
                <input
                  type="text"
                  value={settings.aboutTitleEn || ''}
                  onChange={(e) => setSettings({ ...settings, aboutTitleEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-semibold"
                  placeholder="About Shree Rajeshwar Nidhi Secondary School"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'परिचय विस्तृत विवरण (नेपाली)' : 'About Content (Nepali)'}
                </label>
                <textarea
                  rows={6}
                  value={settings.aboutContentNp || ''}
                  onChange={(e) => setSettings({ ...settings, aboutContentNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 leading-relaxed"
                  placeholder="विद्यालयको स्थापना, इतिहास, संकाय तथा पूर्वाधार सम्बन्धी विस्तृत परिचय..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'परिचय विस्तृत विवरण (English)' : 'About Content (English)'}
                </label>
                <textarea
                  rows={6}
                  value={settings.aboutContentEn || ''}
                  onChange={(e) => setSettings({ ...settings, aboutContentEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 leading-relaxed"
                  placeholder="Detailed background, history, academic streams, and modern facilities of the school..."
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploadField
                  label={isNp ? 'क्याम्पस तस्बिर (Campus Photo)' : 'Campus Photo'}
                  value={settings.aboutImageUrl || ''}
                  onChange={(url) => setSettings({ ...settings, aboutImageUrl: url })}
                  folder="campus"
                  helpText="विद्यालय परिसर तथा भवनको मुख्य तस्बिर (सिफारिस: 16:9 ल्याण्डस्केप तस्बिर)"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'फोटो क्याप्सन (नेपाली)' : 'Photo Caption (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.aboutImageCaptionNp || ''}
                  onChange={(e) => setSettings({ ...settings, aboutImageCaptionNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="शान्त तथा बालमैत्री परिसर"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'फोटो क्याप्सन (English)' : 'Photo Caption (English)'}
                </label>
                <input
                  type="text"
                  value={settings.aboutImageCaptionEn || ''}
                  onChange={(e) => setSettings({ ...settings, aboutImageCaptionEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Lush Green Child-friendly Campus"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Leadership Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Principal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  👨‍🏫 {isNp ? 'प्रधानाध्यापकको मन्तव्य (Principal)' : "Principal's Message"}
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.principalVisible !== false}
                    onChange={(e) => setSettings({ ...settings, principalVisible: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>{isNp ? 'देखाउनुहोस्' : 'Visible'}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'नाम (नेपाली)' : 'Name (Nepali)'}
                  </label>
                  <input
                    type="text"
                    value={settings.principalNameNp || ''}
                    onChange={(e) => setSettings({ ...settings, principalNameNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'नाम (English)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.principalNameEn || ''}
                    onChange={(e) => setSettings({ ...settings, principalNameEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पद / Designation (नेपाली)' : 'Designation (Nepali)'}
                  </label>
                  <input
                    type="text"
                    value={settings.principalDesignationNp || ''}
                    onChange={(e) => setSettings({ ...settings, principalDesignationNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="प्रधानाध्यापक"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पद / Designation (English)' : 'Designation (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.principalDesignationEn || ''}
                    onChange={(e) => setSettings({ ...settings, principalDesignationEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Principal"
                  />
                </div>
              </div>

              <ImageUploadField
                label={isNp ? 'प्रधानाध्यापकको तस्बिर (Principal Photo)' : 'Principal Photo'}
                value={settings.principalPhotoUrl || ''}
                onChange={(url) => setSettings({ ...settings, principalPhotoUrl: url })}
                folder="leadership"
                helpText="सिफारिस: पासपोर्ट आकार वा वर्गाकार फोटो (Square Photo)"
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'मन्तव्य सन्देश (नेपाली)' : 'Message (Nepali)'}
                </label>
                <textarea
                  rows={4}
                  value={settings.principalMessageNp || ''}
                  onChange={(e) => setSettings({ ...settings, principalMessageNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'मन्तव्य सन्देश (English)' : 'Message (English)'}
                </label>
                <textarea
                  rows={3}
                  value={settings.principalMessageEn || ''}
                  onChange={(e) => setSettings({ ...settings, principalMessageEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>

            {/* SMC Chairperson */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  🏛️ {isNp ? 'वि.व्य.स. अध्यक्षको मन्तव्य (SMC Chair)' : "SMC Chairperson's Message"}
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smcChairVisible !== false}
                    onChange={(e) => setSettings({ ...settings, smcChairVisible: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>{isNp ? 'देखाउनुहोस्' : 'Visible'}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'नाम (नेपाली)' : 'Name (Nepali)'}
                  </label>
                  <input
                    type="text"
                    value={settings.smcChairNameNp || ''}
                    onChange={(e) => setSettings({ ...settings, smcChairNameNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'नाम (English)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.smcChairNameEn || ''}
                    onChange={(e) => setSettings({ ...settings, smcChairNameEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पद / Designation (नेपाली)' : 'Designation (Nepali)'}
                  </label>
                  <input
                    type="text"
                    value={settings.smcChairDesignationNp || ''}
                    onChange={(e) => setSettings({ ...settings, smcChairDesignationNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="अध्यक्ष, विद्यालय व्यवस्थापन समिति"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पद / Designation (English)' : 'Designation (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.smcChairDesignationEn || ''}
                    onChange={(e) => setSettings({ ...settings, smcChairDesignationEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="SMC Chairperson"
                  />
                </div>
              </div>

              <ImageUploadField
                label={isNp ? 'वि.व्य.स. अध्यक्षको तस्बिर (SMC Chairperson Photo)' : 'SMC Chair Photo'}
                value={settings.smcChairPhotoUrl || ''}
                onChange={(url) => setSettings({ ...settings, smcChairPhotoUrl: url })}
                folder="leadership"
                helpText="सिफारिस: पासपोर्ट आकार वा वर्गाकार फोटो (Square Photo)"
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'मन्तव्य सन्देश (नेपाली)' : 'Message (Nepali)'}
                </label>
                <textarea
                  rows={4}
                  value={settings.smcChairMessageNp || ''}
                  onChange={(e) => setSettings({ ...settings, smcChairMessageNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'मन्तव्य सन्देश (English)' : 'Message (English)'}
                </label>
                <textarea
                  rows={3}
                  value={settings.smcChairMessageEn || ''}
                  onChange={(e) => setSettings({ ...settings, smcChairMessageEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Admission, Portal & Contact Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Phone className="w-5 h-5 text-indigo-600" />
              {isNp ? 'कार्यालय समय, सम्पर्क तथा भर्ना सेटिङ' : 'Office Hours, Contact & Admissions'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
                <input
                  type="checkbox"
                  id="admissionToggle"
                  checked={settings.admissionOpen !== false}
                  onChange={(e) => setSettings({ ...settings, admissionOpen: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="admissionToggle" className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  {isNp ? 'नयाँ भर्ना खुला भएको सूचना वेबसाइटमा सक्रिय गर्नुहोस् (Admission Open)' : 'Display Admission Open Banner on Website'}
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'भर्ना ब्यानर सन्देश (नेपाली)' : 'Admission Banner Text (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.admissionBannerTextNp || ''}
                  onChange={(e) => setSettings({ ...settings, admissionBannerTextNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="शैक्षिक सत्र २०८३ का लागि नयाँ भर्ना खुल्यो!"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'भर्ना ब्यानर सन्देश (English)' : 'Admission Banner Text (English)'}
                </label>
                <input
                  type="text"
                  value={settings.admissionBannerTextEn || ''}
                  onChange={(e) => setSettings({ ...settings, admissionBannerTextEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Admissions Open for Academic Session 2083 BS!"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पोर्टल लगइन बटन पाठ (नेपाली)' : 'Portal Button Text (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.portalButtonTextNp || ''}
                  onChange={(e) => setSettings({ ...settings, portalButtonTextNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="पोर्टल लगइन (SMS Login)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पोर्टल लगइन बटन पाठ (English)' : 'Portal Button Text (English)'}
                </label>
                <input
                  type="text"
                  value={settings.portalButtonTextEn || ''}
                  onChange={(e) => setSettings({ ...settings, portalButtonTextEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Portal Login (SMS)"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कार्यालय समय (नेपाली)' : 'Office Hours (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.officeHoursNp || ''}
                  onChange={(e) => setSettings({ ...settings, officeHoursNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="आइतबार – शुक्रबार: बिहान १०:०० देखि साँझ ४:००"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कार्यालय समय (English)' : 'Office Hours (English)'}
                </label>
                <input
                  type="text"
                  value={settings.officeHoursEn || ''}
                  onChange={(e) => setSettings({ ...settings, officeHoursEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Sun – Fri: 10:00 AM – 4:00 PM"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'सम्पर्क फोन (Phone)' : 'Contact Phone'}
                </label>
                <input
                  type="text"
                  value={settings.contactPhone || ''}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'सम्पर्क इमेल (Email)' : 'Contact Email'}
                </label>
                <input
                  type="email"
                  value={settings.contactEmail || ''}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'ठेगाना (नेपाली)' : 'Address (Nepali)'}
                </label>
                <input
                  type="text"
                  value={settings.contactAddressNp || ''}
                  onChange={(e) => setSettings({ ...settings, contactAddressNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'ठेगाना (English)' : 'Address (English)'}
                </label>
                <input
                  type="text"
                  value={settings.contactAddressEn || ''}
                  onChange={(e) => setSettings({ ...settings, contactAddressEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'फेसबुक पेज लिङ्क (Facebook URL)' : 'Facebook Page URL'}
                </label>
                <input
                  type="text"
                  value={settings.facebookUrl || ''}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'युट्युब च्यानल लिङ्क (YouTube URL)' : 'YouTube Channel URL'}
                </label>
                <input
                  type="text"
                  value={settings.youtubeUrl || ''}
                  onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Custom Key Stats Overrides */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Award className="w-5 h-5 text-indigo-600" />
              {isNp ? 'तथ्याङ्कमा हाम्रो विद्यालय (Key Stats Counter Overrides)' : 'Key Stats Overrides'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'विद्यार्थी सङ्ख्या (Total Students)' : 'Total Students'}
                </label>
                <input
                  type="number"
                  value={settings.customTotalStudents || ''}
                  onChange={(e) => setSettings({ ...settings, customTotalStudents: e.target.value ? Number(e.target.value) : null })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="४५०+ (स्वत: गणना खाली राखेमा)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'शिक्षक सङ्ख्या (Total Educators)' : 'Total Educators'}
                </label>
                <input
                  type="number"
                  value={settings.customTotalTeachers || ''}
                  onChange={(e) => setSettings({ ...settings, customTotalTeachers: e.target.value ? Number(e.target.value) : null })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="२८+ (स्वत: गणना खाली राखेमा)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कक्षाकोठा सङ्ख्या (Classrooms)' : 'Classrooms'}
                </label>
                <input
                  type="number"
                  value={settings.customTotalClassrooms || ''}
                  onChange={(e) => setSettings({ ...settings, customTotalClassrooms: e.target.value ? Number(e.target.value) : null })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="१६+ (स्वत: गणना खाली राखेमा)"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition"
            >
              <Save className="w-4 h-4" />
              {isNp ? 'सबै सेटिङ सुरक्षित गर्नुहोस्' : 'Save All Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: NAVIGATION MENU MANAGEMENT */}
      {activeTab === 'nav_menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                {isNp ? 'विद्यालय वेबसाइट नेभिगेसन मेनु' : 'Website Navigation Menu'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNp ? 'वेबसाइटको मुख्य हेडर तथा मोबाइल मेनुमा देखिने लिङ्कहरू थप्ने, मिलाउने र मेटाउने' : 'Manage top header and mobile navigation links'}
              </p>
            </div>
            <button
              onClick={openAddNavItem}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ मेनु थप्नुहोस्' : '+ Add Menu Item'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4 w-14">क्रम</th>
                  <th className="py-3 px-4">मेनु नाम (नेपाली)</th>
                  <th className="py-3 px-4">Menu Name (English)</th>
                  <th className="py-3 px-4">लिङ्क / सेक्सन (URL)</th>
                  <th className="py-3 px-4 w-28 text-center">प्रकार</th>
                  <th className="py-3 px-4 w-24 text-center">स्थिति</th>
                  <th className="py-3 px-4 w-24 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {navItems.length > 0 ? (
                  navItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{item.sortOrder}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{item.titleNp}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{item.titleEn}</td>
                      <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">{item.url}</td>
                      <td className="py-3 px-4 text-center">
                        {item.isExternal ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            External
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Section Anchor
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleNavVisibility(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 mx-auto ${
                            item.isVisible
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {item.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{item.isVisible ? (isNp ? 'सक्रिय' : 'Visible') : (isNp ? 'लुकाइएको' : 'Hidden')}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditNavItem(item)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md"
                          title="सम्पादन गर्नुहोस्"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNavItem(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                          title="हटाउनुहोस्"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {isNp ? 'कुनै मेनु प्रविष्टि गरिएको छैन।' : 'No navigation menu items found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC PROGRAMS MANAGEMENT */}
      {activeTab === 'academics' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                {isNp ? 'शैक्षिक कार्यक्रम तथा संकाय (Academic Programs)' : 'Academic Offerings & Programs'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNp ? 'वेबसाइटमा प्रदर्शन गरिने आधारभूत, माध्यमिक, तथा उच्च माध्यमिक संकायहरू' : 'Manage academic streams, basic to higher secondary levels'}
              </p>
            </div>
            <button
              onClick={openAddProgram}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ शैक्षिक कार्यक्रम थप्नुहोस्' : '+ Add Academic Program'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {academicPrograms.map((prog) => (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      {prog.icon === 'Award' ? <Award className="w-5 h-5" /> : prog.icon === 'GraduationCap' ? <GraduationCap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </span>
                    <button
                      onClick={() => handleToggleProgramActive(prog)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prog.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {prog.isActive ? (isNp ? 'सक्रिय' : 'Active') : (isNp ? 'निष्क्रिय' : 'Inactive')}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{prog.titleNp}</h3>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{prog.titleEn}</div>
                    {prog.badgeNp && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                        {prog.badgeNp}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {prog.descriptionNp}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-[11px] text-slate-400">क्रम: {prog.sortOrder}</span>
                  <div className="space-x-1">
                    <button
                      onClick={() => openEditProgram(prog)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(prog.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HERO SLIDES */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              {isNp ? 'होमपेज ब्यानर तथा मुख्य स्लाइडरहरू' : 'Homepage Hero Slides'}
            </h2>
            <button
              onClick={openAddSlide}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ स्लाइड थप्नुहोस्' : '+ Add Slide'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((sl) => (
              <div
                key={sl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 w-full bg-slate-100 relative">
                    <img src={sl.imageUrl} alt={sl.titleNp} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sl.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                        }`}
                      >
                        {sl.isActive ? (isNp ? 'सक्रिय' : 'Active') : isNp ? 'निष्क्रिय' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {isNp ? sl.titleNp : sl.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {isNp ? sl.subtitleNp : sl.subtitleEn}
                    </p>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[11px] text-slate-400 font-medium">क्रम: {sl.sortOrder}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditSlide(sl)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-md"
                      title={isNp ? 'सम्पादन' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlide(sl.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                      title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NOTICES */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              {isNp ? 'सार्वजनिक सूचना तथा समाचारहरू' : 'Public Notices & Announcements'}
            </h2>
            <button
              onClick={openAddNotice}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ सूचना थप्नुहोस्' : '+ Add Notice'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">शीर्षक (Title)</th>
                    <th className="p-3.5">विधा (Category)</th>
                    <th className="p-3.5">प्रकाशन मिति (Date BS)</th>
                    <th className="p-3.5">पिन (Pin)</th>
                    <th className="p-3.5">स्थिति</th>
                    <th className="p-3.5 text-right">कार्य (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notices.map((nt) => (
                    <tr key={nt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 max-w-md">
                        <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {isNp ? nt.titleNp : nt.titleEn}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{isNp ? nt.contentNp : nt.contentEn}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {nt.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">{nt.publishDateBs}</td>
                      <td className="p-3.5">
                        {nt.isPinned && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                            <Pin className="w-3 h-3" />
                            {isNp ? 'पिन' : 'Pinned'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            nt.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {nt.isActive ? (isNp ? 'सक्रिय' : 'Active') : isNp ? 'निष्क्रिय' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditNotice(nt)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title={isNp ? 'सम्पादन' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(nt.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"
                            title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {isNp ? 'सार्वजनिक विद्यालय कार्यक्रमहरू' : 'Upcoming & Past Events'}
            </h2>
            <button
              onClick={openAddEvent}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ कार्यक्रम थप्नुहोस्' : '+ Add Event'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                      {ev.status}
                    </span>
                    <span className="text-xs font-bold text-indigo-600">{ev.eventDateBs}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {isNp ? ev.titleNp : ev.titleEn}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{isNp ? ev.descriptionNp : ev.descriptionEn}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{isNp ? ev.venueNp : ev.venueEn}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1">
                  <button
                    onClick={() => openEditEvent(ev)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                    title={isNp ? 'सम्पादन' : 'Edit'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"
                    title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GALLERY */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              {isNp ? 'फोटो ग्यालरी एल्बमहरू' : 'Photo Gallery Albums'}
            </h2>
            <button
              onClick={openAddAlbum}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ एल्बम बनाउनुहोस्' : '+ Create Album'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {albums.map((alb) => (
              <div
                key={alb.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 w-full bg-slate-100 relative">
                    <img src={alb.coverImageUrl} alt={alb.titleNp} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-slate-950/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {alb.images?.length || 0} {isNp ? 'तस्बिरहरू' : 'Photos'}
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                      {alb.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isNp ? alb.titleNp : alb.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{isNp ? alb.descriptionNp : alb.descriptionEn}</p>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
                  <button
                    onClick={() => {
                      setTargetAlbumId(alb.id);
                      setPhotoForm({ titleNp: '', titleEn: '', imageUrl: '', sortOrder: (alb.images?.length || 0) + 1 });
                      setIsAddPhotoModalOpen(true);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isNp ? 'तस्बिर थप्नुहोस्' : 'Add Photo'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditAlbum(alb)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                      title={isNp ? 'सम्पादन' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlbum(alb.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"
                      title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: DOWNLOADS */}
      {activeTab === 'downloads' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              {isNp ? 'सार्वजनिक डाउनलोड फाइल तथा फारामहरू' : 'Downloadable Forms & Syllabi'}
            </h2>
            <button
              onClick={openAddDownload}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isNp ? '+ नयाँ फाइल थप्नुहोस्' : '+ Add Download'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">फाइल नाम (Title)</th>
                  <th className="p-3.5">विधा (Category)</th>
                  <th className="p-3.5">साइज</th>
                  <th className="p-3.5">डाउनलोड सङ्ख्या</th>
                  <th className="p-3.5 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {downloads.map((dl) => (
                  <tr key={dl.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {isNp ? dl.titleNp : dl.titleEn}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {dl.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{dl.fileSize || '1.0 MB'}</td>
                    <td className="p-3.5 text-slate-500">{dl.downloadCount || 0} पटक</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditDownload(dl)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDownload(dl.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: INQUIRIES */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            {isNp ? 'वेबसाइटबाट आएका अनलाइन सोधपुछ तथा सन्देशहरू' : 'Visitor Inquiries & Contact Submissions'}
          </h2>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">पठाउनेको नाम (Sender)</th>
                  <th className="p-3.5">सम्पर्क (Phone/Email)</th>
                  <th className="p-3.5">विषय (Subject)</th>
                  <th className="p-3.5">स्थिति (Status)</th>
                  <th className="p-3.5 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{inq.senderName}</td>
                    <td className="p-3.5">
                      <div>{inq.senderPhone}</div>
                      {inq.senderEmail && <div className="text-[11px] text-slate-400">{inq.senderEmail}</div>}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inq.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{inq.message}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inq.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : inq.status === 'CONTACTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingInquiry(inq)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold hover:bg-indigo-100"
                        >
                          {isNp ? 'हेर्नुहोस्' : 'View'}
                        </button>
                        <button
                          onClick={() => handleDeleteInquiry(inq.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-md"
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
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NAVIGATION MENU ITEM */}
      {/* ========================================================= */}
      {isNavModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingNavItem ? (isNp ? 'मेनु सम्पादन गर्नुहोस्' : 'Edit Menu Item') : isNp ? 'नयाँ मेनु थप्नुहोस्' : 'Add Menu Item'}
              </h3>
              <button onClick={() => setIsNavModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveNavItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'मेनु शीर्षक (नेपाली) *' : 'Menu Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={navForm.titleNp}
                  onChange={(e) => setNavForm({ ...navForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: हाम्रो बारेमा"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'Menu Title (English) *' : 'Menu Title (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={navForm.titleEn}
                  onChange={(e) => setNavForm({ ...navForm, titleEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. About Us"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'लिङ्क / सेक्सन यूआरएल (URL) *' : 'Target Link / Section URL *'}
                </label>
                <input
                  type="text"
                  required
                  value={navForm.url}
                  onChange={(e) => setNavForm({ ...navForm, url: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono text-xs"
                  placeholder="#home, #about वा https://..."
                />
                {/* Preset shortcuts */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-slate-400 self-center mr-1">{isNp ? 'छिटो छनोट:' : 'Quick:'}</span>
                  {['#home', '#about', '#academics', '#notices', '#events', '#gallery', '#downloads', '#contact'].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setNavForm({ ...navForm, url: sec })}
                      className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-mono"
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'क्रम (Sort Order)' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={navForm.sortOrder}
                    onChange={(e) => setNavForm({ ...navForm, sortOrder: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2 pb-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={navForm.isExternal}
                      onChange={(e) => setNavForm({ ...navForm, isExternal: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>{isNp ? 'बाह्य लिङ्क (External URL)' : 'External Link'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={navForm.isVisible}
                      onChange={(e) => setNavForm({ ...navForm, isVisible: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>{isNp ? 'सक्रिय / देखाउनुहोस्' : 'Visible'}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNavModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'मेनु सुरक्षित गर्नुहोस्' : 'Save Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ACADEMIC PROGRAM */}
      {/* ========================================================= */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingProgram ? (isNp ? 'कार्यक्रम सम्पादन गर्नुहोस्' : 'Edit Program') : isNp ? 'नयाँ शैक्षिक कार्यक्रम' : 'Add Academic Program'}
              </h3>
              <button onClick={() => setIsProgramModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'शीर्षक (नेपाली) *' : 'Title (Nepali) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={programForm.titleNp}
                    onChange={(e) => setProgramForm({ ...programForm, titleNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="आधारभूत तह (कक्षा १–८)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'Title (English) *' : 'Title (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={programForm.titleEn}
                    onChange={(e) => setProgramForm({ ...programForm, titleEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Basic Level (Grades 1-8)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'ब्याड्ज (नेपाली)' : 'Badge (Nepali)'}
                  </label>
                  <input
                    type="text"
                    value={programForm.badgeNp}
                    onChange={(e) => setProgramForm({ ...programForm, badgeNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="कक्षा १-८"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'Badge (English)' : 'Badge (English)'}
                  </label>
                  <input
                    type="text"
                    value={programForm.badgeEn}
                    onChange={(e) => setProgramForm({ ...programForm, badgeEn: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Grades 1-8"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'आइकन (Icon)' : 'Icon'}
                  </label>
                  <select
                    value={programForm.icon}
                    onChange={(e) => setProgramForm({ ...programForm, icon: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="BookOpen">BookOpen (पुस्तक)</option>
                    <option value="GraduationCap">GraduationCap (टोपी)</option>
                    <option value="Award">Award (पुरस्कार)</option>
                    <option value="Sparkles">Sparkles (तारा)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विवरण (नेपाली) *' : 'Description (Nepali) *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={programForm.descriptionNp}
                  onChange={(e) => setProgramForm({ ...programForm, descriptionNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="पाठ्यक्रम, शिक्षण विधि तथा विशेषताहरू..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'Description (English) *' : 'Description (English) *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={programForm.descriptionEn}
                  onChange={(e) => setProgramForm({ ...programForm, descriptionEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Program overview and learning objectives..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'क्रम (Sort Order)' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={programForm.sortOrder}
                    onChange={(e) => setProgramForm({ ...programForm, sortOrder: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={programForm.isActive}
                      onChange={(e) => setProgramForm({ ...programForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>{isNp ? 'सक्रिय स्थिति (Active)' : 'Active Program'}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProgramModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'कार्यक्रम सुरक्षित गर्नुहोस्' : 'Save Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: HERO SLIDE */}
      {/* ========================================================= */}
      {isSlideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingSlide ? (isNp ? 'स्लाइड सम्पादन गर्नुहोस्' : 'Edit Hero Slide') : isNp ? 'नयाँ स्लाइड थप्नुहोस्' : 'Add Hero Slide'}
              </h3>
              <button onClick={() => setIsSlideModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'शीर्षक (नेपाली) *' : 'Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={slideForm.titleNp}
                  onChange={(e) => setSlideForm({ ...slideForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'उप-शीर्षक (नेपाली)' : 'Subtitle (Nepali)'}
                </label>
                <input
                  type="text"
                  value={slideForm.subtitleNp}
                  onChange={(e) => setSlideForm({ ...slideForm, subtitleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <ImageUploadField
                label={isNp ? 'ब्यानर तस्बिर (Slide Image) *' : 'Slide Image *'}
                helpText={isNp ? 'ल्यान्डस्केप १६:९ वा १९२०x१०८० सिफारिस गरिन्छ' : '16:9 or 1920x1080 recommended'}
                value={slideForm.imageUrl}
                onChange={(url) => setSlideForm({ ...slideForm, imageUrl: url })}
                folder="slides"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'बटन टेक्स्ट' : 'Button Text'}
                  </label>
                  <input
                    type="text"
                    value={slideForm.buttonTextNp}
                    onChange={(e) => setSlideForm({ ...slideForm, buttonTextNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'बटन लिङ्क' : 'Button Link'}
                  </label>
                  <input
                    type="text"
                    value={slideForm.buttonLink}
                    onChange={(e) => setSlideForm({ ...slideForm, buttonLink: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="#about"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={slideForm.isActive}
                    onChange={(e) => setSlideForm({ ...slideForm, isActive: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  {isNp ? 'वेबसाइटमा सक्रिय राख्नुहोस्' : 'Active on Website'}
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSlideModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                  >
                    {isNp ? 'रद्द' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                  >
                    {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save Slide'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NOTICE */}
      {/* ========================================================= */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingNotice ? (isNp ? 'सूचना सम्पादन गर्नुहोस्' : 'Edit Notice') : isNp ? 'नयाँ सार्वजनिक सूचना' : 'Add Notice'}
              </h3>
              <button onClick={() => setIsNoticeModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'सूचनाको शीर्षक (नेपाली) *' : 'Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={noticeForm.titleNp}
                  onChange={(e) => setNoticeForm({ ...noticeForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'विधा (Category) *' : 'Category *'}
                  </label>
                  <select
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as any })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="GENERAL">सामान्य (General)</option>
                    <option value="ACADEMIC">शैक्षिक (Academic)</option>
                    <option value="EXAM">परीक्षा (Exam)</option>
                    <option value="ADMISSION">भर्ना (Admission)</option>
                    <option value="HOLIDAY">बिदा (Holiday)</option>
                    <option value="URGENT">अति जरूरी (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'प्रकाशन मिति (वि.सं.) *' : 'Publish Date (BS) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={noticeForm.publishDateBs}
                    onChange={(e) => setNoticeForm({ ...noticeForm, publishDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="2083-04-20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'सूचनाको पूर्ण विवरण (नेपाली) *' : 'Content (Nepali) *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeForm.contentNp}
                  onChange={(e) => setNoticeForm({ ...noticeForm, contentNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <FileUploadField
                label={isNp ? 'संलग्न फाइल वा सूचनाको कागजात (वैकल्पिक)' : 'Attached Document/Notice File (Optional)'}
                helpText={isNp ? 'PDF, DOC, DOCX वा तस्बिर (अधिकतम १५ MB)' : 'PDF, DOC, DOCX or image (max 15MB)'}
                value={noticeForm.fileUrl || ''}
                onChange={(url) => setNoticeForm({ ...noticeForm, fileUrl: url })}
                folder="notices"
              />

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={noticeForm.isPinned}
                    onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  📌 {isNp ? 'शिरमा पिन गर्नुहोस्' : 'Pin to Top'}
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={noticeForm.isActive}
                    onChange={(e) => setNoticeForm({ ...noticeForm, isActive: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  {isNp ? 'सक्रिय' : 'Active'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'सूचना प्रकाशित गर्नुहोस्' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EVENT */}
      {/* ========================================================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingEvent ? (isNp ? 'कार्यक्रम सम्पादन' : 'Edit Event') : isNp ? 'नयाँ कार्यक्रम थप्नुहोस्' : 'Add Event'}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'कार्यक्रमको नाम (नेपाली) *' : 'Event Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.titleNp}
                  onChange={(e) => setEventForm({ ...eventForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'मिति (वि.सं.) *' : 'Event Date (BS) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.eventDateBs}
                    onChange={(e) => setEventForm({ ...eventForm, eventDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'समय (Time)' : 'Event Time'}
                  </label>
                  <input
                    type="text"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="१०:०० AM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'स्थान (Venue)' : 'Venue'}
                  </label>
                  <input
                    type="text"
                    value={eventForm.venueNp}
                    onChange={(e) => setEventForm({ ...eventForm, venueNp: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isNp ? 'स्थिति (Status)' : 'Status'}
                  </label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as any })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="UPCOMING">आगामी (Upcoming)</option>
                    <option value="ONGOING">चलिरहेको (Ongoing)</option>
                    <option value="COMPLETED">सम्पन्न (Completed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={eventForm.descriptionNp}
                  onChange={(e) => setEventForm({ ...eventForm, descriptionNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ALBUM */}
      {/* ========================================================= */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingAlbum ? (isNp ? 'एल्बम सम्पादन' : 'Edit Album') : isNp ? 'नयाँ फोटो एल्बम' : 'Create Album'}
              </h3>
              <button onClick={() => setIsAlbumModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveAlbum} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'एल्बमको नाम (नेपाली) *' : 'Album Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={albumForm.titleNp}
                  onChange={(e) => setAlbumForm({ ...albumForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विधा (Category)' : 'Category'}
                </label>
                <select
                  value={albumForm.category}
                  onChange={(e) => setAlbumForm({ ...albumForm, category: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="CAMPUS">विद्यालय परिसर (Campus)</option>
                  <option value="ACADEMIC">शैक्षिक तथा ल्याब (Academic)</option>
                  <option value="CULTURAL">सांस्कृतिक (Cultural)</option>
                  <option value="SPORTS">खेलकुद (Sports)</option>
                </select>
              </div>

              <ImageUploadField
                label={isNp ? 'कभर फोटो (Cover Image) *' : 'Cover Image *'}
                helpText={isNp ? 'एल्बमको मुख्य कभर तस्बिर' : 'Main album cover photo'}
                value={albumForm.coverImageUrl}
                onChange={(url) => setAlbumForm({ ...albumForm, coverImageUrl: url })}
                folder="gallery"
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'एल्बम बनाउनुहोस्' : 'Save Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PHOTO TO ALBUM */}
      {/* ========================================================= */}
      {isAddPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isNp ? 'एल्बममा तस्बिर थप्नुहोस्' : 'Add Photo to Album'}
              </h3>
              <button onClick={() => setIsAddPhotoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoToAlbum} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'तस्बिरको शीर्षक / क्याप्सन (नेपाली)' : 'Photo Title / Caption (Nepali)'}
                </label>
                <input
                  type="text"
                  value={photoForm.titleNp}
                  onChange={(e) => setPhotoForm({ ...photoForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <ImageUploadField
                label={isNp ? 'तस्बिर (Photo) *' : 'Photo *'}
                helpText={isNp ? 'एल्बममा थपिने तस्बिर अपलोड गर्नुहोस्' : 'Upload photo for the album'}
                value={photoForm.imageUrl}
                onChange={(url) => setPhotoForm({ ...photoForm, imageUrl: url })}
                folder="gallery"
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPhotoModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'तस्बिर थप्नुहोस्' : 'Add Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DOWNLOAD RESOURCE */}
      {/* ========================================================= */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingDownload ? (isNp ? 'डाउनलोड सम्पादन' : 'Edit Download') : isNp ? 'नयाँ डाउनलोड फाइल' : 'Add Download'}
              </h3>
              <button onClick={() => setIsDownloadModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveDownload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'फाइलको नाम (नेपाली) *' : 'Resource Title (Nepali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={downloadForm.titleNp}
                  onChange={(e) => setDownloadForm({ ...downloadForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'विधा (Category)' : 'Category'}
                </label>
                <select
                  value={downloadForm.category}
                  onChange={(e) => setDownloadForm({ ...downloadForm, category: e.target.value as any })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="ADMISSION">भर्ना फाराम (Admission)</option>
                  <option value="SYLLABUS">पाठ्यक्रम (Syllabus)</option>
                  <option value="CALENDAR">क्यालेन्डर (Calendar)</option>
                  <option value="RULES">नियम तथा आचारसंहिता (Rules)</option>
                  <option value="OTHER">अन्य (Other)</option>
                </select>
              </div>

              <FileUploadField
                label={isNp ? 'डाउनलोड फाइल (Download File) *' : 'Download File *'}
                helpText={isNp ? 'PDF, DOC, XLS, ZIP फाइल (अधिकतम १५ MB)' : 'PDF, DOC, XLS, ZIP file (max 15MB)'}
                value={downloadForm.fileUrl}
                onChange={(url) => setDownloadForm({ ...downloadForm, fileUrl: url })}
                folder="downloads"
                required
              />

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isNp ? 'फाइल साइज' : 'File Size'}
                </label>
                <input
                  type="text"
                  value={downloadForm.fileSize}
                  onChange={(e) => setDownloadForm({ ...downloadForm, fileSize: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: 1.2 MB"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {isNp ? 'फाइल सुरक्षित गर्नुहोस्' : 'Save Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW INQUIRY DETAILS */}
      {/* ========================================================= */}
      {viewingInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                {isNp ? 'अनलाइन सोधपुछ विवरण' : 'Inquiry Details'}
              </h3>
              <button onClick={() => setViewingInquiry(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500">पठाउने (Sender):</span>
                <span className="ml-2 font-bold text-slate-900 dark:text-slate-100">{viewingInquiry.senderName}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="font-semibold text-slate-500">फोन:</span>
                  <span className="ml-2 font-medium">{viewingInquiry.senderPhone}</span>
                </div>
                {viewingInquiry.senderEmail && (
                  <div>
                    <span className="font-semibold text-slate-500">इमेल:</span>
                    <span className="ml-2 font-medium">{viewingInquiry.senderEmail}</span>
                  </div>
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-500">विषय (Subject):</span>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  {viewingInquiry.subject}
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-500">सन्देश (Message):</span>
                <div className="mt-1 text-slate-800 dark:text-slate-200 p-3 bg-slate-50 dark:bg-slate-800 rounded whitespace-pre-wrap">
                  {viewingInquiry.message}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleUpdateInquiryStatus(viewingInquiry.id, 'CONTACTED');
                    setViewingInquiry(null);
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-bold hover:bg-blue-100"
                >
                  {isNp ? 'सम्पर्क गरियो (Contacted)' : 'Mark Contacted'}
                </button>
                <button
                  onClick={() => {
                    handleUpdateInquiryStatus(viewingInquiry.id, 'RESOLVED');
                    setViewingInquiry(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded text-xs font-bold hover:bg-emerald-100"
                >
                  {isNp ? 'समाधान भयो (Resolved)' : 'Mark Resolved'}
                </button>
              </div>

              <button
                onClick={() => setViewingInquiry(null)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                {isNp ? 'बन्द' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
