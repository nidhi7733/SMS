import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export default async function academicRoutes(fastify: FastifyInstance) {
  // Helper to authenticate
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get All Classes
  fastify.get('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.displayOrder)],
    });

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.code)],
    });

    const allSubjects = await db.query.subjects.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const classesWithDetails = allClasses.map((c: any) => ({
      ...c,
      sections: allSections.filter((s: any) => s.classId === c.id),
      subjects: allSubjects.filter((sub: any) => sub.classId === c.id),
    }));

    return reply.send({ classes: classesWithDetails });
  });

  // 2. Create Class
  fastify.post('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.code || !body.nameEn || !body.nameNp) {
      return reply.status(400).send({ message: 'Missing required class fields' });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.classes).values({
      id,
      schoolId: currentUser.schoolId,
      code: body.code,
      nameEn: body.nameEn,
      nameNp: body.nameNp,
      displayOrder: body.displayOrder ?? 99,
      stage: body.stage ?? 'PRIMARY',
      hasStreams: Boolean(body.hasStreams),
    });

    return reply.status(201).send({ message: 'Class created successfully', id });
  });

  // 2b. Update Class
  fastify.put('/classes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.classes.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Class not found' });
    }

    await db.update(schema.classes)
      .set({
        code: body.code ?? existing.code,
        nameEn: body.nameEn ?? existing.nameEn,
        nameNp: body.nameNp ?? existing.nameNp,
        stage: body.stage ?? existing.stage,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
        hasStreams: body.hasStreams !== undefined ? Boolean(body.hasStreams) : existing.hasStreams,
      })
      .where(eq(schema.classes.id, id));

    return reply.send({ message: 'Class updated successfully' });
  });

  // 2c. Delete Class
  fastify.delete('/classes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.classes.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Class not found' });
    }

    // Check if any students exist
    const studentsInClass = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.currentClassId, id), eq(table.schoolId, currentUser.schoolId)),
    });
    if (studentsInClass.length > 0) {
      return reply.status(400).send({
        message: `Cannot delete Class "${existing.nameEn}" because ${studentsInClass.length} student(s) are enrolled in it.`,
      });
    }

    // Check if any sections exist
    const sectionsInClass = await db.query.sections.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.classId, id), eq(table.schoolId, currentUser.schoolId)),
    });
    if (sectionsInClass.length > 0) {
      return reply.status(400).send({
        message: `Cannot delete Class "${existing.nameEn}" because it has ${sectionsInClass.length} section(s). Please delete or transfer sections first.`,
      });
    }

    await db.delete(schema.classes).where(eq(schema.classes.id, id));

    return reply.send({ message: `Class "${existing.nameEn}" deleted successfully.` });
  });

  // 3. Get All Sections
  fastify.get('/sections', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));

    const allStreams = await db.query.streams.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const streamMap = new Map<string, any>(allStreams.map((st: any) => [st.id, st]));

    const allUsers = await db.query.users.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const userMap = new Map<string, any>(allUsers.map((u: any) => [u.id, u]));

    const allStudents = await db.query.students.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const sectionsWithDetails = allSections.map((s: any) => {
      const cls = classMap.get(s.classId);
      const strm = s.streamId ? streamMap.get(s.streamId) : null;
      const teacher = s.classTeacherId ? userMap.get(s.classTeacherId) : null;
      const count = allStudents.filter((st: any) => st.currentSectionId === s.id && st.status === 'ACTIVE').length;

      return {
        ...s,
        classNameEn: cls?.nameEn,
        classNameNp: cls?.nameNp,
        classCode: cls?.code,
        streamCode: strm?.code || null,
        streamNameEn: strm?.nameEn || null,
        streamNameNp: strm?.nameNp || null,
        classTeacherName: teacher ? teacher.fullNameEn : null,
        studentCount: count,
      };
    });

    return reply.send({ sections: sectionsWithDetails });
  });

  // 4. Create Section
  fastify.post('/sections', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.classId || !body.code || !body.nameEn) {
      return reply.status(400).send({ message: 'Missing required section fields' });
    }

    const cleanCode = String(body.code).trim().toUpperCase();
    const targetStreamId = body.streamId || null;

    // Prevent duplicate section code in the same class (and stream if specified)
    const duplicate = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(
          eq(table.schoolId, currentUser.schoolId),
          eq(table.classId, body.classId),
          targetStreamId ? eq(table.streamId, targetStreamId) : eq(table.code, cleanCode),
          eq(table.code, cleanCode)
        ),
    });

    if (duplicate) {
      return reply.status(400).send({
        message: `Section "${cleanCode}" already exists for this class${targetStreamId ? ' and stream' : ''}. Cannot create duplicate section code.`,
      });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.sections).values({
      id,
      schoolId: currentUser.schoolId,
      classId: body.classId,
      streamId: targetStreamId,
      code: cleanCode,
      nameEn: body.nameEn,
      nameNp: body.nameNp || `खण्ड ${cleanCode}`,
      shift: body.shift || 'DAY',
      capacity: body.capacity ? Number(body.capacity) : 45,
      classTeacherId: body.classTeacherId || null,
      roomNumber: body.roomNumber || null,
    });

    return reply.status(201).send({ message: 'Section created successfully', id });
  });

  // 5. Update Section
  fastify.put('/sections/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Section not found' });
    }

    const newCode = body.code ? String(body.code).trim().toUpperCase() : existing.code;
    const newStreamId = body.streamId !== undefined ? (body.streamId || null) : existing.streamId;

    // Check code collision with other sections in same class and stream
    if (newCode !== existing.code || newStreamId !== existing.streamId) {
      const duplicate = await db.query.sections.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(
            eq(table.schoolId, currentUser.schoolId),
            eq(table.classId, existing.classId),
            newStreamId ? eq(table.streamId, newStreamId) : eq(table.code, newCode),
            eq(table.code, newCode)
          ),
      });
      if (duplicate && duplicate.id !== id) {
        return reply.status(400).send({
          message: `Section "${newCode}" already exists for this class${newStreamId ? ' and stream' : ''}.`,
        });
      }
    }

    await db.update(schema.sections)
      .set({
        code: newCode,
        streamId: newStreamId,
        nameEn: body.nameEn ?? existing.nameEn,
        nameNp: body.nameNp ?? existing.nameNp,
        shift: body.shift ?? existing.shift,
        capacity: body.capacity !== undefined ? Number(body.capacity) : existing.capacity,
        classTeacherId: body.classTeacherId !== undefined ? body.classTeacherId : existing.classTeacherId,
        roomNumber: body.roomNumber !== undefined ? body.roomNumber : existing.roomNumber,
      })
      .where(eq(schema.sections.id, id));

    return reply.send({ message: 'Section updated successfully' });
  });

  // 6. Delete Section (with enrollment check)
  fastify.delete('/sections/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Section not found' });
    }

    // Check if any active students are assigned to this section
    const assignedStudents = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.currentSectionId, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (assignedStudents.length > 0) {
      return reply.status(400).send({
        message: `Cannot delete Section "${existing.nameEn}" (${existing.code}) because ${assignedStudents.length} student(s) are currently assigned to it. Please reassign or transfer them before deleting.`,
      });
    }

    await db.delete(schema.sections).where(eq(schema.sections.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'DELETE_SECTION',
      entity: 'Section',
      entityId: id,
      oldValues: { nameEn: existing.nameEn, code: existing.code, classId: existing.classId },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({ message: `Section "${existing.nameEn}" deleted successfully.` });
  });

  // 7. Streams
  fastify.get('/streams', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const streams = await db.query.streams.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    return reply.send({ streams });
  });

  // 8. Subjects
  fastify.get('/subjects', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId } = request.query as { classId?: string; sectionId?: string };

    const rawSubjects = await db.query.subjects.findMany({
      where: (table: any, { eq, and }: any) => {
        if (classId) {
          return and(eq(table.schoolId, currentUser.schoolId), eq(table.classId, classId));
        }
        return eq(table.schoolId, currentUser.schoolId);
      },
      orderBy: (table: any, { asc }: any) => [asc(table.code)],
    });

    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const sectionMap = new Map<string, any>(allSections.map((s: any) => [s.id, s]));

    const allStreams = await db.query.streams.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const streamMap = new Map<string, any>(allStreams.map((st: any) => [st.id, st]));

    let enriched = rawSubjects.map((sub: any) => {
      const cls = classMap.get(sub.classId);
      const sec = sub.sectionId ? sectionMap.get(sub.sectionId) : null;
      const st = sub.streamId ? streamMap.get(sub.streamId) : null;
      return {
        ...sub,
        classNameEn: cls?.nameEn,
        classNameNp: cls?.nameNp,
        classCode: cls?.code,
        streamCode: st?.code || null,
        streamNameEn: st?.nameEn || null,
        streamNameNp: st?.nameNp || null,
        sectionCode: sec?.code || null,
        sectionNameEn: sec?.nameEn || null,
        sectionNameNp: sec?.nameNp || null,
      };
    });

    if (sectionId && sectionId !== 'all') {
      enriched = enriched.filter((s: any) => !s.sectionId || s.sectionId === sectionId);
    }

    return reply.send({ subjects: enriched });
  });

  fastify.post('/subjects', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.classId || !body.code || !body.nameEn || !body.nameNp) {
      return reply.status(400).send({ message: 'Missing required subject parameters' });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.subjects).values({
      id,
      schoolId: currentUser.schoolId,
      classId: body.classId,
      streamId: body.streamId || null,
      sectionId: body.sectionId || null,
      code: body.code,
      nameEn: body.nameEn,
      nameNp: body.nameNp,
      isOptional: Boolean(body.isOptional),
      optionalGroup: body.optionalGroup || null,
      creditHours: body.creditHours !== undefined ? Number(body.creditHours) : 4,
      theoryFullMarks: body.theoryFullMarks !== undefined ? Number(body.theoryFullMarks) : 75,
      practicalFullMarks: body.practicalFullMarks !== undefined ? Number(body.practicalFullMarks) : 25,
      theoryPassMarks: body.theoryPassMarks !== undefined ? Number(body.theoryPassMarks) : 27,
      practicalPassMarks: body.practicalPassMarks !== undefined ? Number(body.practicalPassMarks) : 10,
    });

    return reply.status(201).send({ message: 'Subject created successfully', id });
  });

  fastify.put('/subjects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.subjects.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Subject not found' });
    }

    await db.update(schema.subjects)
      .set({
        code: body.code ?? existing.code,
        nameEn: body.nameEn ?? existing.nameEn,
        nameNp: body.nameNp ?? existing.nameNp,
        classId: body.classId ?? existing.classId,
        sectionId: body.sectionId !== undefined ? (body.sectionId || null) : existing.sectionId,
        streamId: body.streamId !== undefined ? (body.streamId || null) : existing.streamId,
        isOptional: body.isOptional !== undefined ? Boolean(body.isOptional) : existing.isOptional,
        optionalGroup: body.optionalGroup !== undefined ? (body.optionalGroup || null) : existing.optionalGroup,
        creditHours: body.creditHours !== undefined ? Number(body.creditHours) : existing.creditHours,
        theoryFullMarks: body.theoryFullMarks !== undefined ? Number(body.theoryFullMarks) : existing.theoryFullMarks,
        practicalFullMarks: body.practicalFullMarks !== undefined ? Number(body.practicalFullMarks) : existing.practicalFullMarks,
        theoryPassMarks: body.theoryPassMarks !== undefined ? Number(body.theoryPassMarks) : existing.theoryPassMarks,
        practicalPassMarks: body.practicalPassMarks !== undefined ? Number(body.practicalPassMarks) : existing.practicalPassMarks,
      })
      .where(eq(schema.subjects.id, id));

    return reply.send({ message: 'Subject updated successfully' });
  });

  fastify.delete('/subjects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.subjects.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Subject not found' });
    }

    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));

    return reply.send({ message: `Subject "${existing.nameEn}" deleted successfully.` });
  });

  // 8. Houses & Activities Management (सदन तथा अतिरिक्त क्रियाकलाप)
  fastify.get('/houses', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const [houses, students, activities] = await Promise.all([
      db.query.houses.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      }),
      db.query.students.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      }),
      db.query.houseActivities.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      }),
    ]);

    const housesWithStats = houses.map((h: any) => {
      let totalPoints = 0;
      let goldMedals = 0;
      let silverMedals = 0;
      let bronzeMedals = 0;

      for (const act of activities) {
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
        memberCount: students.filter((s: any) => s.houseId === h.id).length,
        totalPoints,
        goldMedals,
        silverMedals,
        bronzeMedals,
        totalEvents: goldMedals + silverMedals + bronzeMedals,
      };
    });

    // Sort by totalPoints desc, then goldMedals desc
    housesWithStats.sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.goldMedals - a.goldMedals);

    const rankedHouses = housesWithStats.map((h: any, index: number) => ({
      ...h,
      rank: index + 1,
    }));

    return reply.send({ houses: rankedHouses, totalStudents: students.length });
  });

  // Get House Members
  fastify.get('/houses/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const house = await db.query.houses.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!house) {
      return reply.status(404).send({ message: 'House not found' });
    }

    const [students, classes, sections] = await Promise.all([
      db.query.students.findMany({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.houseId, id)),
        orderBy: (t: any, { asc }: any) => [asc(t.studentId)],
      }),
      db.query.classes.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
      db.query.sections.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
    ]);

    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(sections.map((s: any) => [s.id, s]));

    const members = students.map((s: any) => {
      const cls = classMap.get(s.currentClassId);
      const sec = s.currentSectionId ? sectionMap.get(s.currentSectionId) : null;
      return {
        id: s.id,
        studentId: s.studentId,
        iemisCode: s.iemisCode,
        firstNameEn: s.firstNameEn,
        lastNameEn: s.lastNameEn,
        firstNameNp: s.firstNameNp,
        lastNameNp: s.lastNameNp,
        fullNameEn: `${s.firstNameEn} ${s.lastNameEn}`,
        fullNameNp: `${s.firstNameNp} ${s.lastNameNp}`,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        photoUrl: s.photoUrl || null,
        classNameEn: cls?.nameEn || '',
        classNameNp: cls?.nameNp || '',
        classCode: cls?.code || '',
        sectionCode: sec?.code || '',
        rollNumber: s.currentRollNumber || null,
      };
    });

    return reply.send({ house, members });
  });

  // Assign Student to House
  fastify.post('/houses/assign', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { studentId, houseId } = request.body as { studentId: string; houseId: string | null };

    if (!studentId) {
      return reply.status(400).send({ message: 'studentId is required' });
    }

    const student = await db.query.students.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, studentId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    if (houseId) {
      const house = await db.query.houses.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, houseId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (!house) {
        return reply.status(404).send({ message: 'House not found' });
      }
    }

    await db
      .update(schema.students)
      .set({ houseId: houseId || null })
      .where(eq(schema.students.id, studentId));

    return reply.send({ message: 'Student house updated successfully', studentId, houseId });
  });

  // Auto-Assign Students to Houses (Balanced round-robin distribution)
  fastify.post('/houses/auto-assign', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, forceReassign } = (request.body as any) || {};

    const houses = await db.query.houses.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    if (houses.length === 0) {
      return reply.status(400).send({ message: 'No houses found to assign students to' });
    }

    let allStudents = await db.query.students.findMany({
      where: (t: any, { and, eq }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId)];
        if (classId) conds.push(eq(t.currentClassId, classId));
        return and(...conds);
      },
    });

    if (!forceReassign) {
      allStudents = allStudents.filter((s: any) => !s.houseId);
    }

    if (allStudents.length === 0) {
      return reply.send({ message: 'No eligible students to assign', count: 0 });
    }

    // Separate by gender for balanced distribution
    const males = allStudents.filter((s: any) => s.gender === 'MALE');
    const females = allStudents.filter((s: any) => s.gender === 'FEMALE');
    const others = allStudents.filter((s: any) => s.gender !== 'MALE' && s.gender !== 'FEMALE');

    let houseIdx = 0;
    let assignedCount = 0;

    const assignBatch = async (list: any[]) => {
      for (const st of list) {
        const targetHouse = houses[houseIdx % houses.length];
        await db
          .update(schema.students)
          .set({ houseId: targetHouse.id })
          .where(eq(schema.students.id, st.id));
        houseIdx++;
        assignedCount++;
      }
    };

    await assignBatch(males);
    await assignBatch(females);
    await assignBatch(others);

    return reply.send({
      message: `Successfully assigned ${assignedCount} students across ${houses.length} houses`,
      count: assignedCount,
    });
  });

  // Update House Leadership
  fastify.put('/houses/:id/leadership', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const { masterTeacherName, captainStudentName, viceCaptainStudentName } = request.body as any;

    const house = await db.query.houses.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!house) {
      return reply.status(404).send({ message: 'House not found' });
    }

    await db
      .update(schema.houses)
      .set({
        masterTeacherName: masterTeacherName !== undefined ? masterTeacherName : house.masterTeacherName,
        captainStudentName: captainStudentName !== undefined ? captainStudentName : house.captainStudentName,
        viceCaptainStudentName: viceCaptainStudentName !== undefined ? viceCaptainStudentName : house.viceCaptainStudentName,
      })
      .where(eq(schema.houses.id, id));

    return reply.send({ message: 'House leadership updated successfully' });
  });

  // House Activities (ECA Competitions)
  fastify.get('/houses/activities', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const [activities, houses] = await Promise.all([
      db.query.houseActivities.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { desc }: any) => [desc(t.eventDateBs), desc(t.createdAt)],
      }),
      db.query.houses.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
    ]);

    const houseMap = new Map<string, any>(houses.map((h: any) => [h.id, h]));

    const populated = activities.map((a: any) => {
      const first = a.firstHouseId ? houseMap.get(a.firstHouseId) : null;
      const second = a.secondHouseId ? houseMap.get(a.secondHouseId) : null;
      const third = a.thirdHouseId ? houseMap.get(a.thirdHouseId) : null;
      return {
        ...a,
        firstHouse: first ? { id: first.id, nameEn: first.nameEn, nameNp: first.nameNp, colorHex: first.colorHex } : null,
        secondHouse: second ? { id: second.id, nameEn: second.nameEn, nameNp: second.nameNp, colorHex: second.colorHex } : null,
        thirdHouse: third ? { id: third.id, nameEn: third.nameEn, nameNp: third.nameNp, colorHex: third.colorHex } : null,
      };
    });

    return reply.send({ activities: populated });
  });

  // Create House Activity
  fastify.post('/houses/activities', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.title || !body.eventDateBs) {
      return reply.status(400).send({ message: 'title and eventDateBs are required' });
    }

    const activityId = crypto.randomUUID();
    await db.insert(schema.houseActivities).values({
      id: activityId,
      schoolId: currentUser.schoolId,
      title: body.title,
      titleNp: body.titleNp || null,
      category: body.category || 'SPORTS',
      eventDateBs: body.eventDateBs,
      description: body.description || null,
      firstHouseId: body.firstHouseId || null,
      firstPoints: Number(body.firstPoints) || 100,
      secondHouseId: body.secondHouseId || null,
      secondPoints: Number(body.secondPoints) || 60,
      thirdHouseId: body.thirdHouseId || null,
      thirdPoints: Number(body.thirdPoints) || 40,
      participatingHouses: body.participatingHouses || 'All Houses (सबै सदनहरू)',
    });

    return reply.status(201).send({ message: 'Activity created successfully', id: activityId });
  });

  // Delete House Activity
  fastify.delete('/houses/activities/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const act = await db.query.houseActivities.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!act) {
      return reply.status(404).send({ message: 'Activity not found' });
    }

    await db.delete(schema.houseActivities).where(eq(schema.houseActivities.id, id));

    return reply.send({ message: 'Activity deleted successfully' });
  });

  // 9. Academic Years
  fastify.get('/years', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const years = await db.query.academicYears.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.yearBs)],
    });

    return reply.send({ academicYears: years });
  });

  fastify.post('/years', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const yearBs = Number(body.yearBs);
    if (!yearBs || isNaN(yearBs) || yearBs < 2000 || yearBs > 2200) {
      return reply.status(400).send({ message: 'Valid Bikram Sambat year (e.g. 2084) is required' });
    }

    // Check duplicate
    const existing = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.yearBs, yearBs)),
    });

    if (existing) {
      return reply.status(400).send({ message: `Academic Year ${yearBs} BS already exists.` });
    }

    const startDateBs = body.startDateBs || `${yearBs}-01-01`;
    const endDateBs = body.endDateBs || `${yearBs}-12-30`;
    const startDateAd = body.startDateAd || `${yearBs - 57}-04-14`;
    const endDateAd = body.endDateAd || `${yearBs - 56}-04-13`;
    const isCurrent = Boolean(body.isCurrent);

    if (isCurrent) {
      // Deactivate all others
      await db.update(schema.academicYears)
        .set({ isCurrent: false })
        .where(eq(schema.academicYears.schoolId, currentUser.schoolId));

      await db.update(schema.schools)
        .set({ activeAcademicYearBs: yearBs })
        .where(eq(schema.schools.id, currentUser.schoolId));
    }

    const id = crypto.randomUUID();
    const newYear = {
      id,
      schoolId: currentUser.schoolId,
      yearBs,
      startDateBs,
      endDateBs,
      startDateAd,
      endDateAd,
      isCurrent,
      isClosed: false,
    };

    await db.insert(schema.academicYears).values(newYear);

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'CREATE_ACADEMIC_YEAR',
      entity: 'AcademicYear',
      entityId: id,
      newValues: newYear,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(201).send({
      message: `Academic Year ${yearBs} BS created successfully`,
      academicYear: newYear,
    });
  });

  fastify.put('/years/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Academic year not found' });
    }

    const updates: any = {};
    if (body.startDateBs) updates.startDateBs = body.startDateBs;
    if (body.endDateBs) updates.endDateBs = body.endDateBs;
    if (body.startDateAd) updates.startDateAd = body.startDateAd;
    if (body.endDateAd) updates.endDateAd = body.endDateAd;
    if (body.isClosed !== undefined) updates.isClosed = Boolean(body.isClosed);

    await db.update(schema.academicYears)
      .set(updates)
      .where(eq(schema.academicYears.id, id));

    return reply.send({ message: 'Academic year updated successfully' });
  });

  fastify.post('/years/:id/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const targetYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    if (!targetYear) {
      return reply.status(404).send({ message: 'Academic year not found' });
    }

    // Set all to non-current then activate target
    await db.update(schema.academicYears)
      .set({ isCurrent: false })
      .where(eq(schema.academicYears.schoolId, currentUser.schoolId));

    await db.update(schema.academicYears)
      .set({ isCurrent: true })
      .where(eq(schema.academicYears.id, id));

    await db.update(schema.schools)
      .set({ activeAcademicYearBs: targetYear.yearBs })
      .where(eq(schema.schools.id, currentUser.schoolId));

    return reply.send({ message: `Academic Year ${targetYear.yearBs} BS activated successfully` });
  });
}

