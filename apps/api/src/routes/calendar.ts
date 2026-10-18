import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export default async function calendarRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  const canManageCalendar = (user: any) => {
    if (user?.isSuperAdmin) return true;
    const roleNames = user?.roles || [];
    if (
      roleNames.includes('PRINCIPAL') ||
      roleNames.includes('SYSTEM_ADMIN') ||
      roleNames.includes('ADMIN') ||
      roleNames.includes('SUPERADMIN')
    ) {
      return true;
    }
    if (user?.permissions?.includes('CALENDAR_MANAGE')) return true;
    return false;
  };

  // Helper to ensure default categories exist for the school
  const ensureDefaultCategories = async (db: any, schoolId: string) => {
    const existing = await db.query.schoolCalendarEventCategories.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
    });

    if (existing.length === 0) {
      const defaults = [
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'PUBLIC_HOLIDAY',
          nameNp: 'सार्वजनिक बिदा',
          nameEn: 'Public Holiday',
          color: '#f43f5e',
          isHoliday: true,
          isSystem: true,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'SCHOOL_HOLIDAY',
          nameNp: 'स्थानीय / विद्यालय बिदा',
          nameEn: 'School Holiday',
          color: '#dc2626',
          isHoliday: true,
          isSystem: true,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'EXAM_DAY',
          nameNp: 'परीक्षा तालिका',
          nameEn: 'Exam Day',
          color: '#2563eb',
          isHoliday: false,
          isSystem: true,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'EVENT_SPORTS',
          nameNp: 'खेलकुद तथा अतिरिक्त',
          nameEn: 'Sports & Athletics',
          color: '#16a34a',
          isHoliday: false,
          isSystem: true,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'EVENT_CULTURAL',
          nameNp: 'सांस्कृतिक तथा उत्सव',
          nameEn: 'Cultural & Festival',
          color: '#9333ea',
          isHoliday: false,
          isSystem: true,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'MEETING',
          nameNp: 'बैठक तथा भेला',
          nameEn: 'Meeting & Assembly',
          color: '#d97706',
          isHoliday: false,
          isSystem: false,
        },
        {
          id: crypto.randomUUID(),
          schoolId,
          code: 'TRAINING',
          nameNp: 'शिक्षक तालिम',
          nameEn: 'Teacher Training',
          color: '#0d9488',
          isHoliday: false,
          isSystem: false,
        },
      ];
      await db.insert(schema.schoolCalendarEventCategories).values(defaults);
      return defaults;
    }
    return existing;
  };

  // =========================================================================
  // 1. EVENT CATEGORIES (CRUD for Admin/Principal)
  // =========================================================================

  // List all event categories
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const categories = await ensureDefaultCategories(db, currentUser.schoolId);
    return reply.send(categories);
  });

  // Create new category
  fastify.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({ message: 'Permission Denied: Only Administrator or Principal can manage categories.' });
    }

    const db = await getDb();
    const body = request.body as any;

    if (!body?.nameNp || !body?.nameEn) {
      return reply.status(400).send({ message: 'Nepali name and English name are required' });
    }

    let code = (body.code || body.nameEn || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');

    if (!code) {
      code = `CAT_${Date.now()}`;
    }

    // Check code uniqueness within school
    const existingCode = await db.query.schoolCalendarEventCategories.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.code, code)),
    });

    if (existingCode) {
      code = `${code}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const newCategory = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      code,
      nameNp: body.nameNp.trim(),
      nameEn: body.nameEn.trim(),
      color: body.color || '#3b82f6',
      isHoliday: Boolean(body.isHoliday),
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.schoolCalendarEventCategories).values(newCategory);

    return reply.status(201).send(newCategory);
  });

  // Update category
  fastify.put('/categories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({ message: 'Permission Denied: Only Administrator or Principal can manage categories.' });
    }

    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.schoolCalendarEventCategories.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Category not found' });
    }

    const updates: any = {
      nameNp: body.nameNp ? body.nameNp.trim() : existing.nameNp,
      nameEn: body.nameEn ? body.nameEn.trim() : existing.nameEn,
      color: body.color ? body.color.trim() : existing.color,
      isHoliday: body.isHoliday !== undefined ? Boolean(body.isHoliday) : existing.isHoliday,
      updatedAt: new Date(),
    };

    await db
      .update(schema.schoolCalendarEventCategories)
      .set(updates)
      .where(eq(schema.schoolCalendarEventCategories.id, id));

    const updated = await db.query.schoolCalendarEventCategories.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    return reply.send(updated);
  });

  // Delete category
  fastify.delete('/categories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({ message: 'Permission Denied: Only Administrator or Principal can manage categories.' });
    }

    const db = await getDb();
    const { id } = request.params as { id: string };

    const existing = await db.query.schoolCalendarEventCategories.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Category not found' });
    }

    if (existing.isSystem) {
      return reply.status(400).send({
        message: 'Cannot delete system default categories (सार्वजनिक बिदा, परीक्षा आदि हटाउन मिल्दैन)। तपाईंले यसको नाम वा रङ सम्पादन गर्न सक्नुहुन्छ।',
      });
    }

    // Check if any events use this category
    const eventUsingCategory = await db.query.schoolCalendarEvents.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.eventType, existing.code)),
    });

    if (eventUsingCategory) {
      return reply.status(400).send({
        message: `यो विधा हाल क्यालेन्डरका कार्यक्रमहरूमा प्रयोग भइरहेको छ। पहिले सम्बन्धित कार्यक्रमहरूलाई अर्को विधामा सार्नुहोस् वा मेटाउनुहोस्।`,
      });
    }

    await db
      .delete(schema.schoolCalendarEventCategories)
      .where(eq(schema.schoolCalendarEventCategories.id, id));

    return reply.send({ message: 'Category deleted successfully', id });
  });

  // =========================================================================
  // 2. CALENDAR EVENTS
  // =========================================================================

  // List Calendar Events
  fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { monthBs, yearBs = '2083' } = request.query as {
      monthBs?: string;
      yearBs?: string;
    };

    const categories = await ensureDefaultCategories(db, currentUser.schoolId);
    const categoryMap = new Map(categories.map((c: any) => [c.code, c]));

    const events = await db.query.schoolCalendarEvents.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.startDateBs)],
    });

    let filtered = events;
    if (monthBs) {
      const monthPrefix = `${yearBs}-${String(monthBs).padStart(2, '0')}-`;
      filtered = events.filter(
        (e: any) =>
          e.startDateBs?.startsWith(monthPrefix) ||
          e.endDateBs?.startsWith(monthPrefix)
      );
    }

    const enriched = filtered.map((e: any) => ({
      ...e,
      category: categoryMap.get(e.eventType) || null,
    }));

    return reply.send(enriched);
  });

  // Create Calendar Event / Holiday
  fastify.post('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({
        message: 'Permission Denied: Only the Principal or Administrator can create calendar events.',
      });
    }

    const db = await getDb();
    const body = request.body as any;

    if (!body.titleEn || !body.startDateBs || !body.eventType) {
      return reply.status(400).send({ message: 'titleEn, startDateBs, and eventType are required' });
    }

    const activeYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.isCurrent, true)),
    });

    const isTeachingDay =
      body.isTeachingDay !== undefined
        ? Boolean(body.isTeachingDay)
        : (body.eventType !== 'PUBLIC_HOLIDAY' && body.eventType !== 'SCHOOL_HOLIDAY');

    const newEvent = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      academicYearId: activeYear ? activeYear.id : '2083-default',
      titleEn: body.titleEn.trim(),
      titleNp: body.titleNp?.trim() || body.titleEn.trim(),
      description: body.description?.trim() || null,
      eventType: body.eventType,
      startDateBs: body.startDateBs.trim(),
      endDateBs: body.endDateBs?.trim() || body.startDateBs.trim(),
      startDateAd: body.startDateAd || '2026-04-14',
      endDateAd: body.endDateAd || body.startDateAd || '2026-04-14',
      isTeachingDay,
      showOnWebsite: Boolean(body.showOnWebsite),
      eventTime: body.eventTime?.trim() || null,
      venueNp: body.venueNp?.trim() || null,
      venueEn: body.venueEn?.trim() || null,
      createdAt: new Date(),
    };

    await db.insert(schema.schoolCalendarEvents).values(newEvent);

    return reply.status(201).send(newEvent);
  });

  // Update Calendar Event
  fastify.put('/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({
        message: 'Permission Denied: Only the Principal or Administrator can edit calendar events.',
      });
    }

    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.schoolCalendarEvents.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Event not found' });
    }

    const updates: any = {};
    if (body.titleEn) updates.titleEn = body.titleEn.trim();
    if (body.titleNp) updates.titleNp = body.titleNp.trim();
    if (body.eventType) updates.eventType = body.eventType;
    if (body.startDateBs) updates.startDateBs = body.startDateBs.trim();
    if (body.endDateBs) updates.endDateBs = body.endDateBs.trim();
    if (body.description !== undefined) updates.description = body.description ? body.description.trim() : null;
    if (body.isTeachingDay !== undefined) updates.isTeachingDay = Boolean(body.isTeachingDay);
    if (body.showOnWebsite !== undefined) updates.showOnWebsite = Boolean(body.showOnWebsite);
    if (body.eventTime !== undefined) updates.eventTime = body.eventTime ? body.eventTime.trim() : null;
    if (body.venueNp !== undefined) updates.venueNp = body.venueNp ? body.venueNp.trim() : null;
    if (body.venueEn !== undefined) updates.venueEn = body.venueEn ? body.venueEn.trim() : null;

    await db.update(schema.schoolCalendarEvents).set(updates).where(eq(schema.schoolCalendarEvents.id, id));

    return reply.send({ message: 'Calendar event updated successfully', id });
  });

  // Delete Calendar Event
  fastify.delete('/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const currentUser = (request as any).user;

    if (!canManageCalendar(currentUser)) {
      return reply.status(403).send({
        message: 'Permission Denied: Only the Principal or Administrator can delete calendar events.',
      });
    }

    const db = await getDb();
    const { id } = request.params as { id: string };

    const existing = await db.query.schoolCalendarEvents.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Event not found' });
    }

    await db.delete(schema.schoolCalendarEvents).where(eq(schema.schoolCalendarEvents.id, id));

    return reply.send({ message: 'Event deleted successfully', id });
  });

  // Calendar & Teaching Days Stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const allEvents = await db.query.schoolCalendarEvents.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const holidayCount = allEvents.filter(
      (e: any) => e.eventType === 'PUBLIC_HOLIDAY' || e.eventType === 'SCHOOL_HOLIDAY'
    ).length;
    const examCount = allEvents.filter((e: any) => e.eventType === 'EXAM_DAY').length;
    const sportsEventsCount = allEvents.filter(
      (e: any) => e.eventType === 'EVENT_SPORTS' || e.eventType === 'EVENT_CULTURAL'
    ).length;

    return reply.send({
      totalEvents: allEvents.length,
      holidayCount,
      examCount,
      sportsEventsCount,
      targetTeachingDays: 190,
      targetOpenDays: 220,
    });
  });
}
