import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { savePersistentCmsSettings, savePersistentSchoolProfile } from '../db/persistentStorage.js';

export default async function websiteRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // Helper to get schoolId from user or fallback to first school for public routes
  const getPublicSchoolId = async () => {
    const db = await getDb();
    const school = await db.query.schools.findFirst();
    return school?.id || 'default-school';
  };

  const getPublicEvents = async (db: any, schoolId: string, limit?: number) => {
    const syncedCalendarEvents = await db.query.schoolCalendarEvents.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, schoolId), eq(table.showOnWebsite, true)),
      orderBy: (table: any, { asc }: any) => [asc(table.startDateBs)],
      limit: limit || undefined,
    });

    if (syncedCalendarEvents.length > 0) {
      const categories = await db.query.schoolCalendarEventCategories.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      });
      const catMap = new Map<string, any>(categories.map((c: any) => [c.code, c]));

      return syncedCalendarEvents.map((ev: any) => {
        const cat: any = catMap.get(ev.eventType);
        const dateDisplay =
          ev.startDateBs === ev.endDateBs || !ev.endDateBs
            ? ev.startDateBs
            : `${ev.startDateBs} - ${ev.endDateBs}`;
        return {
          id: ev.id,
          schoolId: ev.schoolId,
          titleNp: ev.titleNp,
          titleEn: ev.titleEn,
          descriptionNp: ev.description || '',
          descriptionEn: ev.description || '',
          eventDateBs: dateDisplay,
          eventTime: ev.eventTime || null,
          venueNp: ev.venueNp || 'विद्यालय प्राङ्गण',
          venueEn: ev.venueEn || 'School Premises',
          categoryCode: ev.eventType,
          categoryNameNp: cat?.nameNp || 'कार्यक्रम',
          categoryNameEn: cat?.nameEn || 'Event',
          categoryColor: cat?.color || '#3b82f6',
          status: 'UPCOMING',
          createdAt: ev.createdAt,
        };
      });
    }

    return await db.query.websiteEvents.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.eventDateBs)],
      limit: limit || undefined,
    });
  };

  // =========================================================================
  // PUBLIC WEBSITE ENDPOINTS (Unauthenticated, for public school website)
  // =========================================================================

  // 1. Full Public Overview
  fastify.get('/public/overview', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const school = await db.query.schools.findFirst();
    if (!school) {
      return reply.status(404).send({ message: 'School profile not found' });
    }
    const schoolId = school.id;

    // Fetch settings
    let settings = await db.query.websiteSettings.findFirst({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    if (!settings) {
      // Fallback empty settings
      settings = {
        id: crypto.randomUUID(),
        schoolId,
        heroTitleNp: school.nameNp,
        heroTitleEn: school.nameEn,
        admissionOpen: true,
      };
    }

    // Fetch active hero slides
    const heroSlides = await db.query.websiteHeroSlides.findMany({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.isActive, true)),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    // Fetch active public notices
    const latestNotices = await db.query.websiteNotices.findMany({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.isActive, true)),
      orderBy: (table: any, { desc }: any) => [desc(table.isPinned), desc(table.createdAt)],
      limit: 10,
    });

    // Fetch upcoming events (from calendar events if showOnWebsite = true, fallback to website_events)
    const upcomingEvents = await getPublicEvents(db, schoolId, 6);

    // Fetch featured gallery albums with images
    const albums = await db.query.websiteGalleryAlbums.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
      limit: 6,
    });

    const albumIds = albums.map((a: any) => a.id);
    let allImages: any[] = [];
    if (albumIds.length > 0) {
      allImages = await db.query.websiteGalleryImages.findMany({
        where: (table: any, { inArray }: any) => inArray(table.albumId, albumIds),
        orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
      });
    }

    const featuredAlbums = albums.map((alb: any) => ({
      ...alb,
      images: allImages.filter((img: any) => img.albumId === alb.id),
    }));

    // Fetch downloads
    const downloads = await db.query.websiteDownloads.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
      limit: 10,
    });

    // Fetch navigation menu items
    const navItems = await db.query.websiteNavItems.findMany({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.isVisible, true)),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    // Fetch academic programs
    const academicPrograms = await db.query.websiteAcademicPrograms.findMany({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.isActive, true)),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    // Real stats from SMS
    const totalStudents = await db.select({ count: sql`count(*)` }).from(schema.students).where(eq(schema.students.schoolId, schoolId));
    const totalTeachers = await db.select({ count: sql`count(*)` }).from(schema.staff).where(eq(schema.staff.schoolId, schoolId));
    const totalClassrooms = await db.select({ count: sql`count(*)` }).from(schema.sections);

    // Fetch houses & ECA activities for public display
    const [allHouses, allStudentsList, allActivities] = await Promise.all([
      db.query.houses.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.houseActivities.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, schoolId),
        orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      }),
    ]);

    const housesWithStats = allHouses.map((h: any) => {
      let totalPoints = 0;
      let goldMedals = 0;
      let silverMedals = 0;
      let bronzeMedals = 0;

      for (const act of allActivities) {
        if (act.firstHouseId === h.id) {
          totalPoints += act.firstPoints || 100;
          goldMedals += 1;
        }
        if (act.secondHouseId === h.id) {
          totalPoints += act.secondPoints || 60;
          silverMedals += 1;
        }
        if (act.thirdHouseId === h.id) {
          totalPoints += act.thirdPoints || 40;
          bronzeMedals += 1;
        }
      }

      return {
        ...h,
        memberCount: allStudentsList.filter((s: any) => s.houseId === h.id).length,
        totalPoints,
        goldMedals,
        silverMedals,
        bronzeMedals,
        totalEvents: goldMedals + silverMedals + bronzeMedals,
      };
    });

    housesWithStats.sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.goldMedals - a.goldMedals);
    const houseStandings = housesWithStats.map((h: any, idx: number) => ({
      ...h,
      rank: idx + 1,
    }));

    const houseMap = new Map<string, any>(allHouses.map((h: any) => [h.id, h]));
    const recentHouseActivities = allActivities.slice(0, 6).map((act: any) => ({
      ...act,
      firstHouse: act.firstHouseId ? houseMap.get(act.firstHouseId) : null,
      secondHouse: act.secondHouseId ? houseMap.get(act.secondHouseId) : null,
      thirdHouse: act.thirdHouseId ? houseMap.get(act.thirdHouseId) : null,
    }));

    return reply.send({
      school: {
        id: school.id,
        code: school.code,
        nameEn: school.nameEn,
        nameNp: school.nameNp,
        mottoEn: school.mottoEn,
        mottoNp: school.mottoNp,
        logoUrl: school.logoUrl,
        iemisCode: school.iemisCode,
        phone: school.phone,
        email: school.email,
        addressNp: school.addressNp,
        addressEn: school.addressEn,
        establishedBsYear: school.establishedBsYear,
      },
      settings,
      navItems,
      academicPrograms,
      heroSlides,
      latestNotices,
      upcomingEvents,
      featuredAlbums,
      downloads,
      houseStandings,
      recentHouseActivities,
      stats: {
        totalStudents: settings.customTotalStudents || Number(totalStudents[0]?.count) || 450,
        totalTeachers: settings.customTotalTeachers || Number(totalTeachers[0]?.count) || 28,
        totalClassrooms: settings.customTotalClassrooms || Number(totalClassrooms[0]?.count) || 16,
        establishedYearBs: settings.establishedYearBs || school.establishedBsYear || 2028,
      },
    });
  });

  // 2. Public Notices List
  fastify.get('/public/notices', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();
    const query = request.query as any;

    let notices = await db.query.websiteNotices.findMany({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.isActive, true)),
      orderBy: (table: any, { desc }: any) => [desc(table.isPinned), desc(table.createdAt)],
    });

    if (query?.category && query.category !== 'ALL') {
      notices = notices.filter((n: any) => n.category === query.category);
    }

    return reply.send({ notices });
  });

  // 3. Public Events List
  fastify.get('/public/events', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();

    const events = await getPublicEvents(db, schoolId);

    return reply.send({ events });
  });

  // 3.1 Public House Standings & ECA Championship
  fastify.get('/public/houses', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();

    const [allHouses, allStudentsList, allActivities] = await Promise.all([
      db.query.houses.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.houseActivities.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, schoolId),
        orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      }),
    ]);

    const housesWithStats = allHouses.map((h: any) => {
      let totalPoints = 0;
      let goldMedals = 0;
      let silverMedals = 0;
      let bronzeMedals = 0;

      for (const act of allActivities) {
        if (act.firstHouseId === h.id) {
          totalPoints += act.firstPoints || 100;
          goldMedals += 1;
        }
        if (act.secondHouseId === h.id) {
          totalPoints += act.secondPoints || 60;
          silverMedals += 1;
        }
        if (act.thirdHouseId === h.id) {
          totalPoints += act.thirdPoints || 40;
          bronzeMedals += 1;
        }
      }

      return {
        ...h,
        memberCount: allStudentsList.filter((s: any) => s.houseId === h.id).length,
        totalPoints,
        goldMedals,
        silverMedals,
        bronzeMedals,
        totalEvents: goldMedals + silverMedals + bronzeMedals,
      };
    });

    housesWithStats.sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.goldMedals - a.goldMedals);
    const houseStandings = housesWithStats.map((h: any, idx: number) => ({
      ...h,
      rank: idx + 1,
    }));

    const houseMap = new Map<string, any>(allHouses.map((h: any) => [h.id, h]));
    const recentHouseActivities = allActivities.slice(0, 10).map((act: any) => ({
      ...act,
      firstHouse: act.firstHouseId ? houseMap.get(act.firstHouseId) : null,
      secondHouse: act.secondHouseId ? houseMap.get(act.secondHouseId) : null,
      thirdHouse: act.thirdHouseId ? houseMap.get(act.thirdHouseId) : null,
    }));

    return reply.send({ houses: houseStandings, activities: recentHouseActivities });
  });

  // 4. Public Gallery Albums with Images
  fastify.get('/public/gallery', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();

    const albums = await db.query.websiteGalleryAlbums.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const albumIds = albums.map((a: any) => a.id);
    let allImages: any[] = [];
    if (albumIds.length > 0) {
      allImages = await db.query.websiteGalleryImages.findMany({
        where: (table: any, { inArray }: any) => inArray(table.albumId, albumIds),
        orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
      });
    }

    const albumsWithImages = albums.map((alb: any) => ({
      ...alb,
      images: allImages.filter((img: any) => img.albumId === alb.id),
    }));

    return reply.send({ albums: albumsWithImages });
  });

  // 5. Public Downloads List
  fastify.get('/public/downloads', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();

    const downloads = await db.query.websiteDownloads.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    return reply.send({ downloads });
  });

  // 6. Public Visitor Inquiry Submission (Contact / Admission Form)
  fastify.post('/public/inquiries', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const schoolId = await getPublicSchoolId();
    const body = request.body as any;

    if (!body?.senderName || !body?.senderPhone || !body?.subject || !body?.message) {
      return reply.status(400).send({ message: 'Name, phone number, subject, and message are required' });
    }

    const newInquiry = {
      id: crypto.randomUUID(),
      schoolId,
      senderName: body.senderName.trim(),
      senderPhone: body.senderPhone.trim(),
      senderEmail: body.senderEmail?.trim() || null,
      subject: body.subject.trim(),
      message: body.message.trim(),
      status: 'PENDING',
      responseNotes: null,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteInquiries).values(newInquiry);

    return reply.status(201).send({
      message: 'Inquiry submitted successfully. Our school administration will contact you shortly.',
      inquiry: newInquiry,
    });
  });

  // =========================================================================
  // AUTHENTICATED CMS MANAGEMENT ENDPOINTS (For SMS Admin / Principal)
  // =========================================================================

  // 7. Full CMS Overview for Admin Panel
  fastify.get('/cms/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;

    let settings = await db.query.websiteSettings.findFirst({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    const slides = await db.query.websiteHeroSlides.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    const notices = await db.query.websiteNotices.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const events = await getPublicEvents(db, schoolId);

    const albums = await db.query.websiteGalleryAlbums.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const albumIds = albums.map((a: any) => a.id);
    let allImages: any[] = [];
    if (albumIds.length > 0) {
      allImages = await db.query.websiteGalleryImages.findMany({
        where: (table: any, { inArray }: any) => inArray(table.albumId, albumIds),
        orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
      });
    }

    const albumsWithImages = albums.map((alb: any) => ({
      ...alb,
      images: allImages.filter((img: any) => img.albumId === alb.id),
    }));

    const downloads = await db.query.websiteDownloads.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const inquiries = await db.query.websiteInquiries.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const navItems = await db.query.websiteNavItems.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    const academicPrograms = await db.query.websiteAcademicPrograms.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.sortOrder)],
    });

    return reply.send({
      settings,
      navItems,
      academicPrograms,
      slides,
      notices,
      events,
      albums: albumsWithImages,
      downloads,
      inquiries,
    });
  });

  // 8. Update Website Settings & Messages
  fastify.put('/cms/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    const existing = await db.query.websiteSettings.findFirst({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    const settingsData = {
      // Header & School Identity
      logoUrl: body.logoUrl,
      schoolNameNp: body.schoolNameNp,
      schoolNameEn: body.schoolNameEn,
      mottoNp: body.mottoNp,
      mottoEn: body.mottoEn,
      iemisCode: body.iemisCode,
      establishedYearBs: body.establishedYearBs ? Number(body.establishedYearBs) : null,
      affiliationTextNp: body.affiliationTextNp,
      affiliationTextEn: body.affiliationTextEn,

      // Hero
      heroTitleNp: body.heroTitleNp,
      heroTitleEn: body.heroTitleEn,
      heroSubtitleNp: body.heroSubtitleNp,
      heroSubtitleEn: body.heroSubtitleEn,

      // About
      aboutTitleNp: body.aboutTitleNp,
      aboutTitleEn: body.aboutTitleEn,
      aboutContentNp: body.aboutContentNp,
      aboutContentEn: body.aboutContentEn,
      aboutImageUrl: body.aboutImageUrl,
      aboutImageCaptionNp: body.aboutImageCaptionNp,
      aboutImageCaptionEn: body.aboutImageCaptionEn,
      aboutFeaturesList: body.aboutFeaturesList,

      // Leadership Messages
      principalNameNp: body.principalNameNp,
      principalNameEn: body.principalNameEn,
      principalDesignationNp: body.principalDesignationNp,
      principalDesignationEn: body.principalDesignationEn,
      principalMessageNp: body.principalMessageNp,
      principalMessageEn: body.principalMessageEn,
      principalPhotoUrl: body.principalPhotoUrl,
      principalVisible: body.principalVisible !== undefined ? Boolean(body.principalVisible) : true,

      smcChairNameNp: body.smcChairNameNp,
      smcChairNameEn: body.smcChairNameEn,
      smcChairDesignationNp: body.smcChairDesignationNp,
      smcChairDesignationEn: body.smcChairDesignationEn,
      smcChairMessageNp: body.smcChairMessageNp,
      smcChairMessageEn: body.smcChairMessageEn,
      smcChairPhotoUrl: body.smcChairPhotoUrl,
      smcChairVisible: body.smcChairVisible !== undefined ? Boolean(body.smcChairVisible) : true,

      // Contact & Office Hours
      contactAddressNp: body.contactAddressNp,
      contactAddressEn: body.contactAddressEn,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      officeHoursNp: body.officeHoursNp,
      officeHoursEn: body.officeHoursEn,
      facebookUrl: body.facebookUrl,
      youtubeUrl: body.youtubeUrl,

      // Admissions & Portal Links
      admissionOpen: body.admissionOpen !== undefined ? Boolean(body.admissionOpen) : true,
      admissionBannerTextNp: body.admissionBannerTextNp,
      admissionBannerTextEn: body.admissionBannerTextEn,
      portalButtonTextNp: body.portalButtonTextNp,
      portalButtonTextEn: body.portalButtonTextEn,
      portalUrl: body.portalUrl,

      // Custom Stats Overrides
      customTotalStudents: body.customTotalStudents ? Number(body.customTotalStudents) : null,
      customTotalTeachers: body.customTotalTeachers ? Number(body.customTotalTeachers) : null,
      customTotalClassrooms: body.customTotalClassrooms ? Number(body.customTotalClassrooms) : null,

      // 3. Latest News / Notice Marquee Ticker (ताजा सूचना मार्की)
      tickerVisible: body.tickerVisible !== undefined ? Boolean(body.tickerVisible) : true,
      tickerTitleNp: body.tickerTitleNp !== undefined ? body.tickerTitleNp : 'ताजा सूचना',
      tickerTitleEn: body.tickerTitleEn !== undefined ? body.tickerTitleEn : 'Latest News',
      tickerMode: body.tickerMode || 'NOTICES',
      tickerCustomTextNp: body.tickerCustomTextNp || null,
      tickerCustomTextEn: body.tickerCustomTextEn || null,

      // Footer
      footerCopyrightTextNp: body.footerCopyrightTextNp,
      footerCopyrightTextEn: body.footerCopyrightTextEn,

      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(schema.websiteSettings)
        .set(settingsData)
        .where(eq(schema.websiteSettings.id, existing.id));
    } else {
      await db.insert(schema.websiteSettings).values({
        id: crypto.randomUUID(),
        schoolId,
        ...settingsData,
      });
    }

    // Optionally sync basic school info in schools table as well
    if (body.schoolNameNp || body.schoolNameEn || body.logoUrl) {
      await db
        .update(schema.schools)
        .set({
          nameNp: body.schoolNameNp || undefined,
          nameEn: body.schoolNameEn || undefined,
          logoUrl: body.logoUrl || undefined,
          mottoNp: body.mottoNp || undefined,
          mottoEn: body.mottoEn || undefined,
          phone: body.contactPhone || undefined,
          email: body.contactEmail || undefined,
        })
        .where(eq(schema.schools.id, schoolId));
    }

    const updated = await db.query.websiteSettings.findFirst({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    if (updated) {
      savePersistentCmsSettings(updated);
    }

    const currentSchool = await db.query.schools.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, schoolId),
    });
    if (currentSchool) {
      savePersistentSchoolProfile(currentSchool);
    }

    return reply.send({ message: 'Website settings updated successfully', settings: updated });
  });

  // 9. Hero Slides (Add, Edit, Delete)
  fastify.post('/cms/slides', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.imageUrl) {
      return reply.status(400).send({ message: 'Title and image URL are required' });
    }

    const newSlide = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp,
      titleEn: body.titleEn || body.titleNp,
      subtitleNp: body.subtitleNp || null,
      subtitleEn: body.subtitleEn || null,
      imageUrl: body.imageUrl,
      buttonTextNp: body.buttonTextNp || null,
      buttonTextEn: body.buttonTextEn || null,
      buttonLink: body.buttonLink || null,
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteHeroSlides).values(newSlide);
    return reply.status(201).send({ message: 'Slide added successfully', slide: newSlide });
  });

  fastify.put('/cms/slides/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteHeroSlides)
      .set({
        titleNp: body.titleNp,
        titleEn: body.titleEn,
        subtitleNp: body.subtitleNp,
        subtitleEn: body.subtitleEn,
        imageUrl: body.imageUrl,
        buttonTextNp: body.buttonTextNp,
        buttonTextEn: body.buttonTextEn,
        buttonLink: body.buttonLink,
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      })
      .where(eq(schema.websiteHeroSlides.id, id));

    return reply.send({ message: 'Slide updated successfully' });
  });

  fastify.delete('/cms/slides/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteHeroSlides).where(eq(schema.websiteHeroSlides.id, id));
    return reply.send({ message: 'Slide deleted successfully' });
  });

  // 10. Notices (Add, Edit, Delete)
  fastify.post('/cms/notices', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.contentNp || !body?.publishDateBs) {
      return reply.status(400).send({ message: 'Title, content and publication date are required' });
    }

    const newNotice = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp,
      titleEn: body.titleEn || body.titleNp,
      contentNp: body.contentNp,
      contentEn: body.contentEn || body.contentNp,
      category: body.category || 'GENERAL',
      publishDateBs: body.publishDateBs,
      expireDateBs: body.expireDateBs || null,
      fileUrl: body.fileUrl || null,
      isPinned: Boolean(body.isPinned),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.websiteNotices).values(newNotice);
    return reply.status(201).send({ message: 'Notice added successfully', notice: newNotice });
  });

  fastify.put('/cms/notices/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteNotices)
      .set({
        titleNp: body.titleNp,
        titleEn: body.titleEn,
        contentNp: body.contentNp,
        contentEn: body.contentEn,
        category: body.category,
        publishDateBs: body.publishDateBs,
        expireDateBs: body.expireDateBs,
        fileUrl: body.fileUrl,
        isPinned: Boolean(body.isPinned),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        updatedAt: new Date(),
      })
      .where(eq(schema.websiteNotices.id, id));

    return reply.send({ message: 'Notice updated successfully' });
  });

  fastify.delete('/cms/notices/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteNotices).where(eq(schema.websiteNotices.id, id));
    return reply.send({ message: 'Notice deleted successfully' });
  });

  // 11. Events (Add, Edit, Delete) - Synced with schoolCalendarEvents
  fastify.post('/cms/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.eventDateBs) {
      return reply.status(400).send({ message: 'Title and event date are required' });
    }

    const activeYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, schoolId), eq(table.isCurrent, true)),
    });
    const currentAcademicYearId =
      activeYear?.id ||
      (await db.query.academicYears.findFirst({ where: (table: any, { eq }: any) => eq(table.schoolId, schoolId) }))?.id;

    const defaultCategory = await db.query.schoolCalendarEventCategories.findFirst({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    const newCalendarEvent = {
      id: crypto.randomUUID(),
      schoolId,
      academicYearId: currentAcademicYearId || '2083-default',
      titleEn: body.titleEn?.trim() || body.titleNp.trim(),
      titleNp: body.titleNp.trim(),
      description: body.descriptionNp?.trim() || body.descriptionEn?.trim() || null,
      eventType: body.categoryCode || defaultCategory?.code || 'EVENT_SPORTS',
      startDateBs: body.eventDateBs.trim(),
      endDateBs: body.endDateBs?.trim() || body.eventDateBs.trim(),
      startDateAd: '2026-04-14',
      endDateAd: '2026-04-14',
      isTeachingDay: true,
      showOnWebsite: true,
      eventTime: body.eventTime?.trim() || null,
      venueNp: body.venueNp?.trim() || null,
      venueEn: body.venueEn?.trim() || null,
      createdAt: new Date(),
    };

    await db.insert(schema.schoolCalendarEvents).values(newCalendarEvent);
    return reply.status(201).send({ message: 'Event added successfully', event: newCalendarEvent });
  });

  fastify.put('/cms/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    const existingCal = await db.query.schoolCalendarEvents.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    if (existingCal) {
      const updates: any = {};
      if (body.titleNp) updates.titleNp = body.titleNp.trim();
      if (body.titleEn) updates.titleEn = body.titleEn.trim();
      if (body.descriptionNp !== undefined) updates.description = body.descriptionNp?.trim() || null;
      if (body.eventDateBs) {
        updates.startDateBs = body.eventDateBs.trim();
        updates.endDateBs = body.endDateBs?.trim() || body.eventDateBs.trim();
      }
      if (body.eventTime !== undefined) updates.eventTime = body.eventTime?.trim() || null;
      if (body.venueNp !== undefined) updates.venueNp = body.venueNp?.trim() || null;
      if (body.venueEn !== undefined) updates.venueEn = body.venueEn?.trim() || null;
      if (body.categoryCode !== undefined) updates.eventType = body.categoryCode;
      if (body.status !== undefined) updates.showOnWebsite = body.status !== 'CANCELLED';

      await db.update(schema.schoolCalendarEvents).set(updates).where(eq(schema.schoolCalendarEvents.id, id));
      return reply.send({ message: 'Event updated successfully' });
    }

    await db
      .update(schema.websiteEvents)
      .set({
        titleNp: body.titleNp,
        titleEn: body.titleEn,
        descriptionNp: body.descriptionNp,
        descriptionEn: body.descriptionEn,
        eventDateBs: body.eventDateBs,
        eventTime: body.eventTime,
        venueNp: body.venueNp,
        venueEn: body.venueEn,
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.websiteEvents.id, id));

    return reply.send({ message: 'Event updated successfully' });
  });

  fastify.delete('/cms/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.schoolCalendarEvents).where(eq(schema.schoolCalendarEvents.id, id));
    await db.delete(schema.websiteEvents).where(eq(schema.websiteEvents.id, id));
    return reply.send({ message: 'Event deleted successfully' });
  });

  // 12. Gallery Albums & Photos (Add, Edit, Delete)
  fastify.post('/cms/albums', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.coverImageUrl) {
      return reply.status(400).send({ message: 'Album title and cover image URL are required' });
    }

    const newAlbum = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp,
      titleEn: body.titleEn || body.titleNp,
      category: body.category || 'CAMPUS',
      coverImageUrl: body.coverImageUrl,
      descriptionNp: body.descriptionNp || null,
      descriptionEn: body.descriptionEn || null,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteGalleryAlbums).values(newAlbum);
    return reply.status(201).send({ message: 'Album created successfully', album: newAlbum });
  });

  fastify.put('/cms/albums/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteGalleryAlbums)
      .set({
        titleNp: body.titleNp,
        titleEn: body.titleEn,
        category: body.category,
        coverImageUrl: body.coverImageUrl,
        descriptionNp: body.descriptionNp,
        descriptionEn: body.descriptionEn,
      })
      .where(eq(schema.websiteGalleryAlbums.id, id));

    return reply.send({ message: 'Album updated successfully' });
  });

  fastify.delete('/cms/albums/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteGalleryAlbums).where(eq(schema.websiteGalleryAlbums.id, id));
    return reply.send({ message: 'Album deleted successfully' });
  });

  fastify.post('/cms/albums/:albumId/images', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { albumId } = request.params as any;
    const body = request.body as any;

    if (!body?.imageUrl) {
      return reply.status(400).send({ message: 'Image URL is required' });
    }

    const newImage = {
      id: crypto.randomUUID(),
      albumId,
      titleNp: body.titleNp || null,
      titleEn: body.titleEn || null,
      imageUrl: body.imageUrl,
      sortOrder: Number(body.sortOrder) || 0,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteGalleryImages).values(newImage);
    return reply.status(201).send({ message: 'Image added to album', image: newImage });
  });

  fastify.delete('/cms/images/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteGalleryImages).where(eq(schema.websiteGalleryImages.id, id));
    return reply.send({ message: 'Image removed from album' });
  });

  // 13. Downloads (Add, Edit, Delete)
  fastify.post('/cms/downloads', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.fileUrl) {
      return reply.status(400).send({ message: 'Title and file URL are required' });
    }

    const newDownload = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp,
      titleEn: body.titleEn || body.titleNp,
      category: body.category || 'OTHER',
      fileUrl: body.fileUrl,
      fileSize: body.fileSize || '1.0 MB',
      downloadCount: 0,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteDownloads).values(newDownload);
    return reply.status(201).send({ message: 'Download resource added successfully', download: newDownload });
  });

  fastify.put('/cms/downloads/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteDownloads)
      .set({
        titleNp: body.titleNp,
        titleEn: body.titleEn,
        category: body.category,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
      })
      .where(eq(schema.websiteDownloads.id, id));

    return reply.send({ message: 'Download updated successfully' });
  });

  fastify.delete('/cms/downloads/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteDownloads).where(eq(schema.websiteDownloads.id, id));
    return reply.send({ message: 'Download deleted successfully' });
  });

  // 14. Inquiries (View, Update Status, Delete)
  fastify.get('/cms/inquiries', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;

    const inquiries = await db.query.websiteInquiries.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    return reply.send({ inquiries });
  });

  fastify.put('/cms/inquiries/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteInquiries)
      .set({
        status: body.status,
        responseNotes: body.responseNotes,
      })
      .where(eq(schema.websiteInquiries.id, id));

    return reply.send({ message: 'Inquiry status updated successfully' });
  });

  fastify.delete('/cms/inquiries/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteInquiries).where(eq(schema.websiteInquiries.id, id));
    return reply.send({ message: 'Inquiry deleted successfully' });
  });

  // 15. Navigation Menu CMS (Add, Edit, Delete)
  fastify.post('/cms/nav-items', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.titleEn || !body?.url) {
      return reply.status(400).send({ message: 'Nepali title, English title, and URL are required' });
    }

    const newItem = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp.trim(),
      titleEn: body.titleEn.trim(),
      url: body.url.trim(),
      isExternal: Boolean(body.isExternal),
      sortOrder: Number(body.sortOrder) || 0,
      isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteNavItems).values(newItem);
    return reply.status(201).send({ message: 'Menu item created successfully', item: newItem });
  });

  fastify.put('/cms/nav-items/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteNavItems)
      .set({
        titleNp: body.titleNp?.trim(),
        titleEn: body.titleEn?.trim(),
        url: body.url?.trim(),
        isExternal: body.isExternal !== undefined ? Boolean(body.isExternal) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : undefined,
      })
      .where(eq(schema.websiteNavItems.id, id));

    return reply.send({ message: 'Menu item updated successfully' });
  });

  fastify.delete('/cms/nav-items/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteNavItems).where(eq(schema.websiteNavItems.id, id));
    return reply.send({ message: 'Menu item deleted successfully' });
  });

  // 16. Academic Programs CMS (Add, Edit, Delete)
  fastify.post('/cms/academic-programs', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const schoolId = (request as any).user.schoolId;
    const body = request.body as any;

    if (!body?.titleNp || !body?.titleEn || !body?.descriptionNp || !body?.descriptionEn) {
      return reply.status(400).send({ message: 'Title and description in both languages are required' });
    }

    const newProgram = {
      id: crypto.randomUUID(),
      schoolId,
      titleNp: body.titleNp.trim(),
      titleEn: body.titleEn.trim(),
      descriptionNp: body.descriptionNp.trim(),
      descriptionEn: body.descriptionEn.trim(),
      icon: body.icon || 'BookOpen',
      badgeNp: body.badgeNp?.trim() || null,
      badgeEn: body.badgeEn?.trim() || null,
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      createdAt: new Date(),
    };

    await db.insert(schema.websiteAcademicPrograms).values(newProgram);
    return reply.status(201).send({ message: 'Academic program created successfully', program: newProgram });
  });

  fastify.put('/cms/academic-programs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;
    const body = request.body as any;

    await db
      .update(schema.websiteAcademicPrograms)
      .set({
        titleNp: body.titleNp?.trim(),
        titleEn: body.titleEn?.trim(),
        descriptionNp: body.descriptionNp?.trim(),
        descriptionEn: body.descriptionEn?.trim(),
        icon: body.icon || undefined,
        badgeNp: body.badgeNp !== undefined ? body.badgeNp?.trim() : undefined,
        badgeEn: body.badgeEn !== undefined ? body.badgeEn?.trim() : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      })
      .where(eq(schema.websiteAcademicPrograms.id, id));

    return reply.send({ message: 'Academic program updated successfully' });
  });

  fastify.delete('/cms/academic-programs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as any;

    await db.delete(schema.websiteAcademicPrograms).where(eq(schema.websiteAcademicPrograms.id, id));
    return reply.send({ message: 'Academic program deleted successfully' });
  });
}
