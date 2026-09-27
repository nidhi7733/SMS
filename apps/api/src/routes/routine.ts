import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export default async function routineRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get Timetable Entries (By Class/Section or By Teacher)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId, teacherId } = request.query as {
      classId?: string;
      sectionId?: string;
      teacherId?: string;
    };

    const entries = await db.query.timetables.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [eq(table.schoolId, currentUser.schoolId)];
        if (classId) conditions.push(eq(table.classId, classId));
        if (sectionId) conditions.push(eq(table.sectionId, sectionId));
        if (teacherId) conditions.push(eq(table.teacherId, teacherId));
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [
        asc(table.dayOfWeek),
        asc(table.periodNumber),
      ],
    });

    // Lookup metadata: classes, sections, subjects, staff
    const [allClasses, allSections, allSubjects, allStaff] = await Promise.all([
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.sections.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.subjects.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.staff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(allSections.map((s: any) => [s.id, s]));
    const subjectMap = new Map<string, any>(allSubjects.map((sub: any) => [sub.id, sub]));
    const staffMap = new Map<string, any>(allStaff.map((st: any) => [st.id, st]));

    const enriched = entries.map((entry: any) => {
      const cls = classMap.get(entry.classId);
      const sec = sectionMap.get(entry.sectionId);
      const sub = subjectMap.get(entry.subjectId);
      const st = staffMap.get(entry.teacherId);

      return {
        ...entry,
        classNameEn: cls?.nameEn || '',
        classNameNp: cls?.nameNp || '',
        sectionCode: sec?.code || '',
        subjectNameEn: sub?.nameEn || '',
        subjectNameNp: sub?.nameNp || '',
        subjectCode: sub?.code || '',
        teacherNameEn: st?.fullNameEn || '',
        teacherNameNp: st?.fullNameNp || '',
      };
    });

    return reply.send(enriched);
  });

  // 2. Create or Update a Timetable Period (with Teacher Conflict Detection)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.classId || !body.sectionId || !body.subjectId || !body.dayOfWeek || !body.periodNumber) {
      return reply.status(400).send({
        message: 'classId, sectionId, subjectId, dayOfWeek, and periodNumber are required',
      });
    }

    const { classId, sectionId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime, roomNumber, id } = body;

    // TEACHER CONFLICT DETECTION GUARD
    if (teacherId) {
      const conflictingEntries = await db.query.timetables.findMany({
        where: (table: any, { eq, and, ne }: any) => {
          const conditions = [
            eq(table.schoolId, currentUser.schoolId),
            eq(table.teacherId, teacherId),
            eq(table.dayOfWeek, dayOfWeek),
            eq(table.periodNumber, periodNumber),
          ];
          if (id) {
            conditions.push(ne(table.id, id));
          }
          return and(...conditions);
        },
      });

      if (conflictingEntries.length > 0) {
        const conflict = conflictingEntries[0];
        // If conflict is in a DIFFERENT class or section
        if (conflict.classId !== classId || conflict.sectionId !== sectionId) {
          const [teacher, confClass, confSec] = await Promise.all([
            db.query.staff.findFirst({ where: (t: any, { eq }: any) => eq(t.id, teacherId) }),
            db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, conflict.classId) }),
            db.query.sections.findFirst({ where: (t: any, { eq }: any) => eq(t.id, conflict.sectionId) }),
          ]);

          const teacherName = teacher?.fullNameEn || 'Selected Teacher';
          const className = confClass?.nameEn || 'another class';
          const secCode = confSec?.code || '';

          return reply.status(409).send({
            message: `Teacher Conflict: ${teacherName} is already assigned to ${className} Section ${secCode} on ${dayOfWeek} during Period ${periodNumber}! Cannot assign the same teacher to two different classes at the same time.`,
            conflict: {
              teacherName,
              className,
              sectionCode: secCode,
              periodNumber,
              dayOfWeek,
            },
          });
        }
      }
    }

    // Check if slot in this class & section already exists
    const existingSlot = await db.query.timetables.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(
          eq(table.schoolId, currentUser.schoolId),
          eq(table.classId, classId),
          eq(table.sectionId, sectionId),
          eq(table.dayOfWeek, dayOfWeek),
          eq(table.periodNumber, periodNumber)
        ),
    });

    if (existingSlot) {
      // Update existing slot
      await db.update(schema.timetables)
        .set({
          subjectId,
          teacherId: teacherId || null,
          startTime: startTime || existingSlot.startTime || '10:00',
          endTime: endTime || existingSlot.endTime || '10:45',
          roomNumber: roomNumber || null,
        })
        .where(eq(schema.timetables.id, existingSlot.id));

      return reply.send({ message: 'Timetable period updated', id: existingSlot.id });
    } else {
      // Create new slot
      const newId = crypto.randomUUID();
      await db.insert(schema.timetables).values({
        id: newId,
        schoolId: currentUser.schoolId,
        classId,
        sectionId,
        subjectId,
        teacherId: teacherId || null,
        dayOfWeek,
        periodNumber,
        startTime: startTime || '10:00',
        endTime: endTime || '10:45',
        roomNumber: roomNumber || null,
        createdAt: new Date(),
      });

      return reply.status(201).send({ message: 'Timetable period created', id: newId });
    }
  });

  // 3. Delete Timetable Entry
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.timetables.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Timetable entry not found' });
    }

    await db.delete(schema.timetables).where(eq(schema.timetables.id, id));

    return reply.send({ message: 'Timetable entry removed successfully', id });
  });
}
