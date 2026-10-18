import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  LogIn,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Bell,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  GraduationCap,
  Users,
  Building,
  Award,
  Send,
  ExternalLink,
  Menu,
  X,
  FileText,
  Pin,
  Share2,
} from 'lucide-react';
import {
  PublicWebsiteOverview,
  WebsiteNotice,
  WebsiteEvent,
  WebsiteGalleryAlbum,
  WebsiteDownload,
  WebsiteNavItem,
  WebsiteAcademicProgram,
} from '@sms/shared';

const academicThemes = [
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

const renderAcademicIcon = (iconName?: string | null) => {
  switch (iconName) {
    case 'GraduationCap':
      return <GraduationCap className="w-6 h-6" />;
    case 'Award':
      return <Award className="w-6 h-6" />;
    case 'Users':
      return <Users className="w-6 h-6" />;
    case 'Building':
      return <Building className="w-6 h-6" />;
    case 'BookOpen':
    default:
      return <BookOpen className="w-6 h-6" />;
  }
};

export const App: React.FC = () => {
  const [lang, setLang] = useState<'np' | 'en'>('np');
  const isNp = lang === 'np';

  const [overview, setOverview] = useState<PublicWebsiteOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Slider state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Filter for notices
  const [noticeCategory, setNoticeCategory] = useState<string>('ALL');

  // Contact / Inquiry Form
  const [inquiryForm, setInquiryForm] = useState({
    senderName: '',
    senderPhone: '',
    senderEmail: '',
    subject: '',
    message: '',
  });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  // Modals
  const [selectedNotice, setSelectedNotice] = useState<WebsiteNotice | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<WebsiteGalleryAlbum | null>(null);

  useEffect(() => {
    fetch('/api/public/overview')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load website overview');
        return res.json();
      })
      .then((data: PublicWebsiteOverview) => {
        setOverview(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching public overview:', err);
        setIsLoading(false);
      });
  }, []);

  // Auto-advance hero slider
  useEffect(() => {
    if (!overview?.heroSlides || overview.heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % overview.heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [overview?.heroSlides]);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);
    setIsSubmittingInquiry(true);
    try {
      const res = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Submission failed');
      }
      setInquirySubmitted(true);
      setInquiryForm({ senderName: '', senderPhone: '', senderEmail: '', subject: '', message: '' });
      setTimeout(() => setInquirySubmitted(false), 6000);
    } catch (err: any) {
      setInquiryError(err.message || 'Submission failed');
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const school = overview?.school;
  const settings = overview?.settings;
  const slides = overview?.heroSlides || [];
  const notices = overview?.latestNotices || [];
  const events = overview?.upcomingEvents || [];
  const albums = overview?.featuredAlbums || [];
  const downloads = overview?.downloads || [];
  const stats = overview?.stats;

  const defaultNavItems: WebsiteNavItem[] = [
    { id: '1', schoolId: '', titleNp: 'गृहपृष्ठ', titleEn: 'Home', url: '#home', isExternal: false, sortOrder: 1, isVisible: true },
    { id: '2', schoolId: '', titleNp: 'हाम्रो बारेमा', titleEn: 'About', url: '#about', isExternal: false, sortOrder: 2, isVisible: true },
    { id: '3', schoolId: '', titleNp: 'शैक्षिक कार्यक्रम', titleEn: 'Academics', url: '#academics', isExternal: false, sortOrder: 3, isVisible: true },
    { id: '4', schoolId: '', titleNp: 'सूचनाहरू', titleEn: 'Notices', url: '#notices', isExternal: false, sortOrder: 4, isVisible: true },
    { id: '5', schoolId: '', titleNp: 'कार्यक्रम', titleEn: 'Events', url: '#events', isExternal: false, sortOrder: 5, isVisible: true },
    { id: '6', schoolId: '', titleNp: 'ग्यालरी', titleEn: 'Gallery', url: '#gallery', isExternal: false, sortOrder: 6, isVisible: true },
    { id: '7', schoolId: '', titleNp: 'डाउनलोड', titleEn: 'Downloads', url: '#downloads', isExternal: false, sortOrder: 7, isVisible: true },
    { id: '8', schoolId: '', titleNp: 'सम्पर्क', titleEn: 'Contact', url: '#contact', isExternal: false, sortOrder: 8, isVisible: true },
  ];
  const navItems = overview?.navItems && overview.navItems.length > 0 ? overview.navItems : defaultNavItems;

  const defaultPrograms: WebsiteAcademicProgram[] = [
    { id: '1', schoolId: '', titleNp: 'आधारभूत तह (कक्षा १–८)', titleEn: 'Basic Level (Grades 1-8)', descriptionNp: 'बालमैत्री शिक्षण, प्रयोगात्मक परियोजना कार्य, अंग्रेजी तथा नेपाली माध्यम, र आधारभूत कम्प्युटर शिक्षा।', descriptionEn: 'Holistic child-friendly teaching, experiential learning, and introductory IT literacy.', icon: 'BookOpen', badgeNp: 'कक्षा १-८', badgeEn: 'Grades 1-8', sortOrder: 1, isActive: true },
    { id: '2', schoolId: '', titleNp: 'माध्यमिक तह (कक्षा ९–१०, SEE)', titleEn: 'Secondary Level (Grades 9-10)', descriptionNp: 'एसईई परीक्षाको गहन तयारी, विज्ञान र कम्प्युटर प्रयोगात्मक कक्षा, नियमित मूल्याङ्कन तथा परामर्श।', descriptionEn: 'Rigorous SEE board preparation, science lab experiments, and continuous assessment.', icon: 'GraduationCap', badgeNp: 'एसईई तयारी', badgeEn: 'SEE Prep', sortOrder: 2, isActive: true },
    { id: '3', schoolId: '', titleNp: 'उच्च माध्यमिक (कक्षा ११–१२)', titleEn: 'Higher Secondary (Grades 11-12)', descriptionNp: 'विज्ञान (Science), व्यवस्थापन (Management), तथा शिक्षा (Education) संकायमा छात्रवृत्ति सहित उत्कृष्ट अध्यापन।', descriptionEn: 'Science, Management, and Education streams with scholarships for deserving students.', icon: 'Award', badgeNp: 'विज्ञान, व्यवस्थापन, शिक्षा', badgeEn: 'Science, Mgmt, Edu', sortOrder: 3, isActive: true },
  ];
  const academicPrograms = overview?.academicPrograms && overview.academicPrograms.length > 0 ? overview.academicPrograms : defaultPrograms;

  const filteredNotices =
    noticeCategory === 'ALL' ? notices : notices.filter((n) => n.category === noticeCategory);

  const schoolName = isNp ? (school?.nameNp || settings?.schoolNameNp || 'श्री शान्ति माध्यमिक विद्यालय') : (school?.nameEn || settings?.schoolNameEn || 'Shree Shanti Secondary School');
  const schoolMotto = isNp ? (school?.mottoNp || settings?.mottoNp || 'सत्य र ज्ञानका लागि शिक्षा | स्थापना: २०२८ वि.सं.') : (school?.mottoEn || settings?.mottoEn || 'Education for Truth and Enlightenment | Estd. 2028 BS');
  const schoolLogo = school?.logoUrl || settings?.logoUrl;
  const schoolAddress = isNp ? (school?.addressNp || settings?.contactAddressNp || 'गोदावरी-१४, ललितपुर') : (school?.addressEn || settings?.contactAddressEn || 'Godawari-14, Lalitpur');
  const schoolPhone = school?.phone || settings?.contactPhone || '+977-01-5250000';
  const schoolEmail = school?.email || settings?.contactEmail || 'info@shreeshanti.edu.np';
  const schoolIemis = school?.iemisCode || settings?.iemisCode || '270010001';
  const schoolEstd = school?.establishedBsYear || settings?.establishedYearBs || 2028;
  const portalUrl = settings?.portalUrl || 'http://localhost:5173/login';
  const portalBtnLabel = isNp ? (settings?.portalButtonTextNp || 'पोर्टल लगइन (SMS Login)') : (settings?.portalButtonTextEn || 'Portal Login (SMS)');

  // Dynamically update browser tab title and favicon to school branding
  useEffect(() => {
    if (schoolName) {
      document.title = `${schoolName} | ${isNp ? 'आधिकारिक वेबसाइट' : 'Official Website'}`;
    }
    if (schoolLogo) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = schoolLogo;
    }
  }, [schoolName, schoolLogo, isNp]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* ========================================================= */}
      {/* STICKY TOP CONTAINER (ANNOUNCEMENT BAR + HEADER) */}
      {/* ========================================================= */}
      <div className="sticky top-0 z-40 w-full shadow-sm">
        {/* 1. TOP ANNOUNCEMENT BAR & PORTAL LINK */}
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          {/* Contact snippets */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{schoolAddress}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{schoolPhone}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{schoolEmail}</span>
            </div>
          </div>

          {/* Controls: Language toggle + PORTAL LOGIN BUTTON */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'np' ? 'en' : 'np')}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md font-semibold text-slate-200 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'np' ? 'English' : 'नेपाली'}</span>
            </button>

            {/* PROMINENT SMS PORTAL LOGIN BUTTON */}
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-md font-bold shadow-sm transition transform hover:scale-[1.02]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{portalBtnLabel}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN HEADER & LOGO BRANDING */}
      {/* ========================================================= */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          {/* Logo & School Name */}
          <a href="#" className="flex items-center gap-3.5 group">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="w-12 h-12 rounded-xl object-contain shadow-md bg-white p-1 border border-slate-100 group-hover:scale-105 transition"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md font-bold text-xl group-hover:scale-105 transition">
                🏛️
              </div>
            )}
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                {schoolName}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {schoolMotto}
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-700">
            {navItems
              .filter((item) => item.isVisible !== false)
              .map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target={item.isExternal ? '_blank' : undefined}
                  rel={item.isExternal ? 'noreferrer' : undefined}
                  className="hover:text-indigo-600 transition"
                >
                  {isNp ? item.titleNp : item.titleEn}
                </a>
              ))}

            {/* In-Nav Portal Pill */}
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>SMS Portal</span>
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-3">
            {navItems
              .filter((item) => item.isVisible !== false)
              .map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.isExternal ? '_blank' : undefined}
                  rel={link.isExternal ? 'noreferrer' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-slate-700 hover:text-indigo-600 py-1"
                >
                  {isNp ? link.titleNp : link.titleEn}
                </a>
              ))}
            <div className="pt-2 border-t border-slate-100">
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>{portalBtnLabel}</span>
              </a>
            </div>
          </div>
        )}
      </header>
    </div>

      {/* ========================================================= */}
      {/* 3. LATEST NOTICES TICKER */}
      {/* ========================================================= */}
      {notices.length > 0 && (
        <div className="bg-amber-500 text-slate-950 text-xs py-2 px-4 flex items-center shadow-xs overflow-hidden">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-3">
            <span className="font-extrabold uppercase shrink-0 px-2.5 py-0.5 bg-slate-950 text-amber-400 rounded-full text-[11px] flex items-center gap-1 shadow-xs">
              <Bell className="w-3.5 h-3.5 animate-pulse" />
              {isNp ? 'ताजा सूचना' : 'Latest News'}
            </span>
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <div className="inline-block animate-ticker cursor-pointer">
                {notices.map((n, i) => (
                  <span
                    key={n.id}
                    onClick={() => setSelectedNotice(n)}
                    className="inline-block mr-12 hover:underline font-bold"
                  >
                    📌 [{n.publishDateBs}] {isNp ? n.titleNp : n.titleEn}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. HERO SLIDER */}
      {/* ========================================================= */}
      <section id="home" className="relative h-[480px] sm:h-[540px] lg:h-[600px] bg-slate-950 overflow-hidden">
        {slides.length > 0 ? (
          slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {/* Image & Dark Gradient Overlay */}
              <img src={slide.imageUrl} alt={slide.titleNp} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />

              {/* Text Content */}
              <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-600/80 backdrop-blur-xs text-white text-xs font-bold rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isNp ? 'नेपाल सरकार | CEHRD मान्यता प्राप्त' : 'Govt. of Nepal | CEHRD Aligned'}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                    {isNp ? slide.titleNp : slide.titleEn}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                    {isNp ? slide.subtitleNp : slide.subtitleEn}
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 pt-2">
                    <a
                      href={slide.buttonLink || '#about'}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-extrabold shadow-lg transition flex items-center gap-2"
                    >
                      <span>{isNp ? (slide.buttonTextNp || 'हाम्रो बारेमा') : (slide.buttonTextEn || 'Learn More')}</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                    <a
                      href="#contact"
                      className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white border border-white/30 rounded-xl text-sm font-extrabold transition"
                    >
                      {isNp ? 'भर्ना सोधपुछ' : 'Admission Inquiry'}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-white">Loading Hero Slider...</div>
        )}

        {/* Slide Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlideIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlideIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 5. ADMISSION BANNER CALLOUT */}
      {/* ========================================================= */}
      {settings?.admissionOpen !== false && (
        <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white py-4 px-4 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="p-2 bg-white/20 rounded-lg shrink-0">
                <GraduationCap className="w-6 h-6 text-amber-300" />
              </span>
              <div>
                <div className="text-sm font-extrabold">
                  {isNp
                    ? (settings?.admissionBannerTextNp || 'शैक्षिक सत्र २०८३ का लागि नयाँ भर्ना खुल्यो!')
                    : (settings?.admissionBannerTextEn || 'Admissions Open for Academic Session 2083 BS!')}
                </div>
                <div className="text-xs text-blue-200">
                  {isNp ? 'प्रारम्भिक बाल विकास (ECD) देखि कक्षा ९ तथा ११ (विज्ञान, व्यवस्थापन, शिक्षा)' : 'From ECD to Grade 9 and Grade 11'}
                </div>
              </div>
            </div>

            <a
              href="#contact"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black shadow-md transition"
            >
              {isNp ? 'अहिले नै आवेदन दिनुहोस्' : 'Apply Online Today'}
            </a>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 6. KEY STATS (तथ्याङ्कमा हाम्रो विद्यालय) */}
      {/* ========================================================= */}
      <section className="bg-white py-10 border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-3xl sm:text-4xl font-black text-indigo-600">
                {settings?.customTotalStudents || stats?.totalStudents || 450}+
              </div>
              <div className="text-xs font-bold text-slate-600 mt-1">{isNp ? 'अध्ययनरत विद्यार्थीहरू' : 'Total Students'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                {settings?.customTotalTeachers || stats?.totalTeachers || 28}+
              </div>
              <div className="text-xs font-bold text-slate-600 mt-1">{isNp ? 'दक्ष शिक्षक तथा कर्मचारी' : 'Qualified Educators'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-3xl sm:text-4xl font-black text-amber-600">
                {settings?.customTotalClassrooms || stats?.totalClassrooms || 16}+
              </div>
              <div className="text-xs font-bold text-slate-600 mt-1">{isNp ? 'प्रविधिमैत्री कक्षाकोठा' : 'Smart Classrooms'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-3xl sm:text-4xl font-black text-rose-600">
                {settings?.establishedYearBs || stats?.establishedYearBs || 2028}
              </div>
              <div className="text-xs font-bold text-slate-600 mt-1">{isNp ? 'स्थापना वर्ष (वि.सं.)' : 'Established Year (BS)'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. ABOUT US & LEADERSHIP MESSAGES */}
      {/* ========================================================= */}
      <section id="about" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Main About Intro */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                {isNp ? 'हाम्रो गौरवमय इतिहास' : 'Our Legacy & Vision'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {isNp ? (settings?.aboutTitleNp || `${schoolName}को संक्षिप्त परिचय`) : (settings?.aboutTitleEn || `About ${schoolName}`)}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {isNp
                  ? (settings?.aboutContentNp ||
                      `${schoolName} वि.सं. ${schoolEstd || 2028} सालमा स्थापना भई गुणस्तरीय, जीवनोपयोगी तथा प्रविधिमैत्री शिक्षा प्रदान गर्दै आएको छ।`)
                  : (settings?.aboutContentEn ||
                      `Established in ${schoolEstd || 2028} BS, ${schoolName} is dedicated to holistic and high-standard schooling.`)}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {(settings?.aboutFeaturesList && settings.aboutFeaturesList.length > 0
                  ? settings.aboutFeaturesList
                  : [
                      { textNp: 'आधुनिक कम्प्युटर तथा विज्ञान ल्याब', textEn: 'Advanced ICT & Science Labs' },
                      { textNp: 'सुरक्षित विद्यालय बस यातायात सेवा', textEn: 'Safe School Transport Fleet' },
                      { textNp: 'ई-पुस्तकालय तथा अतिरिक्त क्रियाकलाप', textEn: 'Digital Library & Sports ECA' },
                      { textNp: 'अनुभवी तथा तालिमप्राप्त शिक्षक वर्ग', textEn: 'Certified & Passionate Educators' },
                    ]
                ).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-slate-700">
                      {isNp ? feat.textNp : feat.textEn}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-slate-950 relative h-80 sm:h-96">
                <img
                  src={
                    settings?.aboutImageUrl ||
                    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&auto=format&fit=crop&q=80'
                  }
                  alt="School Campus"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white">
                    <div className="text-lg font-bold">
                      {isNp
                        ? (settings?.aboutImageCaptionNp || 'शान्त तथा बालमैत्री परिसर')
                        : (settings?.aboutImageCaptionEn || 'Lush Green Campus')}
                    </div>
                    <div className="text-xs text-slate-300">
                      {isNp ? 'सिकाइका लागि उपयुक्त वातावरण' : 'Optimal child-centered atmosphere'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leadership Messages: Principal & SMC Chair */}
          {(settings?.principalVisible !== false || settings?.smcChairVisible !== false) && (
            <div className={`grid grid-cols-1 ${settings?.principalVisible !== false && settings?.smcChairVisible !== false ? 'md:grid-cols-2' : 'max-w-2xl mx-auto'} gap-8 pt-4`}>
              {/* Principal Card */}
              {settings?.principalVisible !== false && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        settings?.principalPhotoUrl ||
                        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'
                      }
                      alt={isNp ? (settings?.principalNameNp || 'Principal') : (settings?.principalNameEn || 'Principal')}
                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                    />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {isNp ? (settings?.principalNameNp || 'श्री रामेश्वर शर्मा') : (settings?.principalNameEn || 'Mr. Rameshwar Sharma')}
                      </h3>
                      <div className="text-xs font-semibold text-indigo-600">
                        {isNp ? (settings?.principalDesignationNp || 'प्रधानाध्यापक (Principal)') : (settings?.principalDesignationEn || 'Principal')}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                    "{isNp ? (settings?.principalMessageNp || '...') : (settings?.principalMessageEn || '...')}"
                  </p>
                </div>
              )}

              {/* SMC Chair Card */}
              {settings?.smcChairVisible !== false && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        settings?.smcChairPhotoUrl ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
                      }
                      alt={isNp ? (settings?.smcChairNameNp || 'SMC Chair') : (settings?.smcChairNameEn || 'SMC Chair')}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-sm"
                    />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {isNp ? (settings?.smcChairNameNp || 'श्री कृष्णप्रसाद दाहाल') : (settings?.smcChairNameEn || 'Mr. Krishna Prasad Dahal')}
                      </h3>
                      <div className="text-xs font-semibold text-amber-600">
                        {isNp ? (settings?.smcChairDesignationNp || 'अध्यक्ष, विद्यालय व्यवस्थापन समिति') : (settings?.smcChairDesignationEn || 'SMC Chairperson')}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-amber-500 pl-3">
                    "{isNp ? (settings?.smcChairMessageNp || '...') : (settings?.smcChairMessageEn || '...')}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. ACADEMIC PROGRAMS */}
      {/* ========================================================= */}
      <section id="academics" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
              {isNp ? 'पाठ्यक्रम तथा संकाय' : 'Academic Offerings'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {isNp ? 'प्रारम्भिक बाल विकास देखि कक्षा १२ सम्म' : 'Comprehensive Schooling from ECD to Grade 12'}
            </h2>
            <p className="text-xs text-slate-500">
              {isNp
                ? (settings?.affiliationTextNp || 'नेपाल सरकार पाठ्यक्रम विकास केन्द्र (CDC) द्वारा निर्धारित नवीनतम राष्ट्रिय पाठ्यक्रम अनुरूप')
                : (settings?.affiliationTextEn || 'Aligned with Nepal CDC & National Education Board (NEB)')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {academicPrograms
              .filter((p) => p.isActive !== false)
              .map((p, idx) => {
                const theme = academicThemes[idx % academicThemes.length];
                const badge = isNp ? p.badgeNp : (p.badgeEn || p.badgeNp);
                return (
                  <div
                    key={p.id || idx}
                    className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition space-y-3 bg-slate-50 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl w-fit ${theme}`}>
                          {renderAcademicIcon(p.icon)}
                        </div>
                        {badge && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            {badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {isNp ? p.titleNp : (p.titleEn || p.titleNp)}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {isNp ? p.descriptionNp : (p.descriptionEn || p.descriptionNp)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. NOTICES & ANNOUNCEMENTS */}
      {/* ========================================================= */}
      <section id="notices" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                {isNp ? 'सूचना तथा परिपत्र' : 'Official Notices'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {isNp ? 'विद्यालयका सार्वजनिक सूचनाहरू' : 'School Notices & Bulletins'}
              </h2>
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {['ALL', 'EXAM', 'ADMISSION', 'HOLIDAY', 'GENERAL'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNoticeCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    noticeCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? (isNp ? 'सबै' : 'All') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotices.map((n) => (
              <div
                key={n.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {n.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{n.publishDateBs}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {n.isPinned && <span className="text-amber-500 mr-1.5">📌</span>}
                    {isNp ? n.titleNp : n.titleEn}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {isNp ? n.contentNp : n.contentEn}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                  <button
                    onClick={() => setSelectedNotice(n)}
                    className="text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <span>{isNp ? 'विस्तृत विवरण' : 'Read Full'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {n.fileUrl && (
                    <a
                      href={n.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. EVENTS & PHOTO GALLERY */}
      {/* ========================================================= */}
      <section id="events" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Upcoming Events */}
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                {isNp ? 'क्यालेन्डर तथा गतिविधि' : 'Calendar & Activities'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {isNp ? 'आगामी विद्यालय कार्यक्रमहरू' : 'Upcoming School Events'}
              </h2>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500 text-sm">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                {isNp ? 'हाल कुनै आगामी सार्वजनिक कार्यक्रम तय गरिएको छैन।' : 'No upcoming public events scheduled at this moment.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-md transition space-y-3 bg-slate-50 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-indigo-700 px-2.5 py-1 bg-indigo-100 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5" />
                          {ev.eventDateBs}
                        </span>
                        {(ev.categoryNameNp || ev.categoryNameEn) && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: ev.categoryColor || '#4f46e5' }}
                          >
                            {isNp ? (ev.categoryNameNp || 'कार्यक्रम') : (ev.categoryNameEn || 'Event')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {isNp ? ev.titleNp : ev.titleEn}
                      </h3>
                      {(ev.descriptionNp || ev.descriptionEn) && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {isNp ? ev.descriptionNp : ev.descriptionEn}
                        </p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{isNp ? (ev.venueNp || 'विद्यालय प्राङ्गण') : (ev.venueEn || 'School Premises')}</span>
                      </div>
                      {ev.eventTime && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{ev.eventTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo Gallery Albums */}
          <div id="gallery" className="pt-8 border-t border-slate-100 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                  {isNp ? 'स्मरण र तस्बिरहरू' : 'Campus Moments'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  {isNp ? 'फोटो तथा मिडिया ग्यालरी' : 'Photo Gallery'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((alb) => (
                <div
                  key={alb.id}
                  onClick={() => setSelectedAlbum(alb)}
                  className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 relative h-64 shadow-md"
                >
                  <img
                    src={alb.coverImageUrl}
                    alt={alb.titleNp}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 w-fit rounded-full mb-1">
                      {alb.category} ({alb.images?.length || 0} Photos)
                    </span>
                    <h3 className="text-sm font-bold group-hover:text-amber-300 transition">
                      {isNp ? alb.titleNp : alb.titleEn}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 11. DOWNLOADS SECTION */}
      {/* ========================================================= */}
      <section id="downloads" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
              {isNp ? 'उपयोगी कागजातहरू' : 'Public Resources'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {isNp ? 'डाउनलोड फाराम तथा पाठ्यक्रम' : 'Download Forms & Documents'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {downloads.map((dl) => (
              <div
                key={dl.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-400 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{isNp ? dl.titleNp : dl.titleEn}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">{dl.fileSize || '1.0 MB'}</span>
                  </div>
                </div>

                <a
                  href={dl.fileUrl}
                  download
                  className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-lg text-slate-700 transition"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 12. CONTACT & ONLINE ADMISSION INQUIRY */}
      {/* ========================================================= */}
      <section id="contact" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Contact Info */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                  {isNp ? 'हामीलाई सम्पर्क गर्नुहोस्' : 'Get in Touch'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  {isNp ? 'सोधपुछ वा विद्यालय भ्रमण' : 'Admissions & Campus Visit'}
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {isNp
                    ? 'कुनै पनि जानकारी, भर्ना प्रक्रिया वा सल्लाहका लागि कार्यालय समयमा सिधै सम्पर्क गर्न वा तलको फाराम भर्न सक्नुहुन्छ।'
                    : 'Feel free to reach out during school hours or submit the inquiry form.'}
                </p>
              </div>

              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{isNp ? 'कार्यालय ठेगाना' : 'Campus Location'}</div>
                    <div>{schoolAddress}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{isNp ? 'सम्पर्क फोन' : 'Telephone / Mobile'}</div>
                    <div>{schoolPhone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{isNp ? 'आधिकारिक इमेल' : 'Email Address'}</div>
                    <div>{schoolEmail}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{isNp ? 'कार्यालय समय' : 'Office Hours'}</div>
                    <div>
                      {isNp
                        ? (settings?.officeHoursNp || 'आइतबार – शुक्रबार: बिहान १०:०० देखि साँझ ४:०० बजेसम्म')
                        : (settings?.officeHoursEn || 'Sun – Fri: 10:00 AM – 4:00 PM')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Inquiry Form */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {isNp ? 'अनलाइन सोधपुछ तथा सन्देश पठाउनुहोस्' : 'Send an Online Inquiry'}
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                {isNp
                  ? 'तपाईंको प्रश्न विद्यालय प्रशासन शाखामा स्वतः दर्ता हुनेछ र हामी चाँडै सम्पर्क गर्नेछौँ।'
                  : 'Your query will directly reach our school administration.'}
              </p>

              {inquirySubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-emerald-800">
                    {isNp ? 'तपाईंको सन्देश सफलतापूर्वक पठाइयो!' : 'Inquiry Submitted Successfully!'}
                  </div>
                  <div className="text-xs text-emerald-700">
                    {isNp ? 'हाम्रो विद्यालय प्रशासनले तपाईंलाई छिट्टै सम्पर्क गर्नेछ।' : 'Our school administration will contact you shortly.'}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  {inquiryError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                      {inquiryError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        {isNp ? 'तपाईंको पूरा नाम *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={inquiryForm.senderName}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, senderName: e.target.value })}
                        className="w-full text-sm mt-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        placeholder="उदा: सुमन श्रेष्ठ"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        {isNp ? 'सम्पर्क मोबाइल नं *' : 'Mobile Number *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={inquiryForm.senderPhone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, senderPhone: e.target.value })}
                        className="w-full text-sm mt-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        placeholder="98xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        {isNp ? 'इमेल (वैकल्पिक)' : 'Email (Optional)'}
                      </label>
                      <input
                        type="email"
                        value={inquiryForm.senderEmail}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, senderEmail: e.target.value })}
                        className="w-full text-sm mt-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        placeholder="name@example.com"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        {isNp ? 'विषय (Subject) *' : 'Subject *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={inquiryForm.subject}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                        className="w-full text-sm mt-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        placeholder="उदा: कक्षा ११ विज्ञान भर्ना सम्बन्धी"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      {isNp ? 'तपाईंको सन्देश / सोधपुछ *' : 'Your Message / Inquiry *'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full text-sm mt-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="विस्तृत सन्देश यहाँ लेख्नुहोस्..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingInquiry}
                    className="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingInquiry ? (isNp ? 'पठाउँदै...' : 'Submitting...') : (isNp ? 'सन्देश पठाउनुहोस्' : 'Send Inquiry')}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 13. FOOTER */}
      {/* ========================================================= */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-3 text-white">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700 shadow-xs"
                />
              ) : (
                <span className="text-2xl">🏛️</span>
              )}
              <div>
                <div className="font-black text-base">
                  {schoolName}
                </div>
                <div className="text-[11px] text-slate-400">CEHRD IEMIS Code: {settings?.iemisCode || school?.iemisCode || '270010001'}</div>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              {isNp
                ? (settings?.affiliationTextNp || 'नेपाल सरकारको कार्यालय कार्यविधि तथा शिक्षा तथा मानव स्रोत विकास केन्द्र (CEHRD) को मापदण्ड अनुरूप सञ्चालित आदर्श सामुदायिक शैक्षिक संस्था।')
                : (settings?.affiliationTextEn || 'A model public school operating under CEHRD regulations and Nepal Ministry of Education standards.')}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">{isNp ? 'छिटो लिङ्कहरू' : 'Quick Links'}</h4>
            <ul className="space-y-1.5">
              {navItems.filter(item => item.isVisible !== false).slice(0, 5).map(item => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target={item.isExternal ? '_blank' : undefined}
                    rel={item.isExternal ? 'noreferrer' : undefined}
                    className="hover:text-white transition"
                  >
                    {isNp ? item.titleNp : item.titleEn}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">{isNp ? 'आन्तरिक पोर्टल' : 'Administrative'}</h4>
            <p className="text-[11px] text-slate-400">
              {isNp ? 'शिक्षक, कर्मचारी, विद्यार्थी र अभिभावकका लागि आधिकारिक SMS व्यवस्थापन पोर्टल:' : 'Access the internal SMS management portal:'}
            </p>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{portalBtnLabel}</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-800 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            © {new Date().getFullYear()} {schoolName}. All rights reserved.
          </div>
          <div>Bilingual Nepal Government School Management System (Local-First PWA)</div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL: NOTICE DETAILS */}
      {/* ========================================================= */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  {selectedNotice.category}
                </span>
                <span className="ml-2 text-xs text-slate-400 font-semibold">{selectedNotice.publishDateBs}</span>
              </div>
              <button onClick={() => setSelectedNotice(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {isNp ? selectedNotice.titleNp : selectedNotice.titleEn}
            </h3>

            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {isNp ? selectedNotice.contentNp : selectedNotice.contentEn}
            </div>

            {selectedNotice.fileUrl && (
              <div className="pt-2">
                <a
                  href={selectedNotice.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100"
                >
                  <Download className="w-4 h-4" />
                  <span>{isNp ? 'संलग्न फाइल डाउनलोड गर्नुहोस्' : 'Download Attached Document'}</span>
                </a>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                {isNp ? 'बन्द गर्नुहोस्' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: GALLERY ALBUM PREVIEW */}
      {/* ========================================================= */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isNp ? selectedAlbum.titleNp : selectedAlbum.titleEn}
                </h3>
                <span className="text-xs text-slate-500 font-medium">{selectedAlbum.category}</span>
              </div>
              <button onClick={() => setSelectedAlbum(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-600">{isNp ? selectedAlbum.descriptionNp : selectedAlbum.descriptionEn}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100">
                <img src={selectedAlbum.coverImageUrl} alt="Cover" className="w-full h-48 object-cover" />
                <div className="p-2 text-[11px] font-bold text-slate-700">कभर तस्बिर (Main Cover)</div>
              </div>
              {selectedAlbum.images?.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={img.imageUrl} alt={img.titleNp || ''} className="w-full h-48 object-cover" />
                  <div className="p-2 text-[11px] font-bold text-slate-700">{isNp ? img.titleNp : img.titleEn}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                {isNp ? 'बन्द गर्नुहोस्' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
