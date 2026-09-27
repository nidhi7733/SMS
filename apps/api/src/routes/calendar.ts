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

  // 1. List Calendar Events
  fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { monthBs, yearBs = '2083' } = request.query as {
      monthBs?: string;
      yearBs?: string;
    };

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

    return reply.send(filtered);
  });

  // 2. Create Calendar Event / Holiday (Principal & Admin only)
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
      isTeachingDay: body.isTeachingDay !== undefined ? body.isTeachingDay : (body.eventType !== 'PUBLIC_HOLIDAY' && body.eventType !== 'SCHOOL_HOLIDAY'),
      createdAt: new Date(),
    };

    await db.insert(schema.schoolCalendarEvents).values(newEvent);

    return reply.status(201).send(newEvent);
  });

  // 3. Update Calendar Event (Principal & Admin only)
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
    if (body.isTeachingDay !== undefined) updates.isTeachingDay = body.isTeachingDay;

    await db.update(schema.schoolCalendarEvents).set(updates).where(eq(schema.schoolCalendarEvents.id, id));

    return reply.send({ message: 'Calendar event updated successfully', id });
  });

  // 4. Delete Calendar Event (Principal & Admin only)
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

  // 4. Calendar & Teaching Days Stats
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

    // Minimum teaching days required by Ministry of Education: 190 days; School open days: 220 days
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
