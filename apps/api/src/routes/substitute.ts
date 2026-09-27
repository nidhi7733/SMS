import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, or, sql, desc, asc, inArray, ne } from 'drizzle-orm';
import crypto from 'crypto';
import bs from 'bikram-sambat';

const { toBik, toGreg } = (bs as any).default || bs;

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function getDayOfWeekFromBs(dateBs: string): string {
  try {
    const parts = dateBs.split('-').map(Number);
    if (parts.length === 3) {
      const greg = toGreg(parts[0], parts[1], parts[2]);
      if (greg && greg.year) {
        const d = new Date(greg.year, greg.month - 1, greg.day);
        const dayIdx = d.getDay();
        return DAYS[dayIdx] || 'SUNDAY';
      }
    }
  } catch {
    // Fallback below
  }
  const dayIdx = new Date().getDay();
  return DAYS[dayIdx] || 'SUNDAY';
}

export default async function substituteRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get Today's Substitution Overview & Affected Periods
  fastify.get('/today', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs, dayOfWeek } = request.query as { dateBs?: string; dayOfWeek?: string };

    const todayBik = toBik(new Date());
    const targetDateBs =
      dateBs ||
      (todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-05-31');

    const targetDayOfWeek = dayOfWeek || getDayOfWeekFromBs(targetDateBs);

    // 1. Get all active staff in this school
    const allStaff = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.status, 'ACTIVE')),
    });

    const staffMap = new Map<string, any>(allStaff.map((s: any) => [s.id, s]));

    // 2. Get today's staff attendance records
    const attendanceRecords = await db.query.staffAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, targetDateBs)),
    });

    const attMap = new Map<string, any>(attendanceRecords.map((a: any) => [a.staffId, a]));

    // 3. Filter teaching staff who are ABSENT, ON_LEAVE, or OFFICIAL_DUTY today
    const absentOrDutyTeachers = allStaff.filter((s: any) => {
      if (s.category !== 'TEACHING') return false;
      const att = attMap.get(s.id);
      return att && (att.status === 'ABSENT' || att.status === 'ON_LEAVE' || att.status === 'OFFICIAL_DUTY');
    });

    const affectedTeacherIds = absentOrDutyTeachers.map((t: any) => t.id);

    // 4. Fetch all timetables for this school on the target day of week
    const allDayTimetables = await db.query.timetables.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.dayOfWeek, targetDayOfWeek)),
      orderBy: (table: any, { asc }: any) => [asc(table.periodNumber)],
    });

    // 5. Filter affected timetable slots (where teacher is absent / leave / OD)
    const affectedTimetableSlots = allDayTimetables.filter(
      (slot: any) => slot.teacherId && affectedTeacherIds.includes(slot.teacherId)
    );

    // 6. Fetch existing substitute assignments for today
    const existingAssignments = await db.query.substituteAssignments.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.dateBs, targetDateBs)),
    });

    // Map existing assignments by timetableId or by composite key (classId_sectionId_periodNumber)
    const assignmentMap = new Map<string, any>();
    for (const a of existingAssignments) {
      if (a.timetableId) assignmentMap.set(`tt_${a.timetableId}`, a);
      assignmentMap.set(`slot_${a.classId}_${a.sectionId}_${a.periodNumber}`, a);
    }

    // 7. Lookup metadata: classes, sections, subjects
    const [allClasses, allSections, allSubjects] = await Promise.all([
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.sections.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.subjects.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(allSections.map((s: any) => [s.id, s]));
    const subjectMap = new Map<string, any>(allSubjects.map((sub: any) => [sub.id, sub]));

    // 8. Compute free teachers for each period
    // A teacher is available if:
    // a. category === 'TEACHING'
    // b. NOT absent / on leave / on OD today
    // c. Does NOT have a regular class on targetDayOfWeek at periodNumber
    // d. Is NOT already assigned as a substitute at periodNumber today (unless CANCELLED)
    const teachingStaff = allStaff.filter((s: any) => s.category === 'TEACHING');
    const getFreeTeachersForPeriod = (periodNumber: number) => {
      // Find busy teachers in regular timetable for this period
      const busyInTimetable = new Set<string>();
      for (const t of allDayTimetables) {
        if (t.periodNumber === periodNumber && t.teacherId) {
          busyInTimetable.add(t.teacherId);
        }
      }

      // Find busy teachers already assigned as substitute in this period today
      const busyInSubstitutes = new Set<string>();
      for (const a of existingAssignments) {
        if (a.periodNumber === periodNumber && a.status !== 'CANCELLED' && a.substituteTeacherId) {
          busyInSubstitutes.add(a.substituteTeacherId);
        }
      }

      return teachingStaff
        .filter((teacher: any) => {
          // Cannot be absent, leave or OD
          const att = attMap.get(teacher.id);
          if (att && (att.status === 'ABSENT' || att.status === 'ON_LEAVE' || att.status === 'OFFICIAL_DUTY')) {
            return false;
          }
          // Cannot be busy with regular class
          if (busyInTimetable.has(teacher.id)) return false;
          // Cannot be busy with another substitution
          if (busyInSubstitutes.has(teacher.id)) return false;
          return true;
        })
        .map((teacher: any) => ({
          id: teacher.id,
          staffCode: teacher.staffCode,
          fullNameEn: teacher.fullNameEn,
          fullNameNp: teacher.fullNameNp,
          designation: teacher.designation,
          phone: teacher.phone,
        }));
    };

    // 9. Build list of affected periods
    const periodsList = affectedTimetableSlots.map((slot: any) => {
      const cls = classMap.get(slot.classId);
      const sec = sectionMap.get(slot.sectionId);
      const sub = subjectMap.get(slot.subjectId);
      const origTeacher = staffMap.get(slot.teacherId);
      const origAtt = origTeacher ? attMap.get(origTeacher.id) : null;

      const assignment =
        assignmentMap.get(`tt_${slot.id}`) ||
        assignmentMap.get(`slot_${slot.classId}_${slot.sectionId}_${slot.periodNumber}`);

      const subTeacher =
        assignment && assignment.substituteTeacherId ? staffMap.get(assignment.substituteTeacherId) : null;

      const availableTeachers = getFreeTeachersForPeriod(slot.periodNumber);

      return {
        id: slot.id,
        timetableId: slot.id,
        classId: slot.classId,
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        sectionId: slot.sectionId,
        sectionCode: sec?.code || 'A',
        sectionNameNp: sec?.nameNp || 'खण्ड क',
        subjectId: slot.subjectId,
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameNp: sub?.nameNp || 'विषय',
        periodNumber: slot.periodNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNumber: slot.roomNumber,
        originalTeacher: origTeacher
          ? {
              id: origTeacher.id,
              staffCode: origTeacher.staffCode,
              fullNameEn: origTeacher.fullNameEn,
              fullNameNp: origTeacher.fullNameNp,
              phone: origTeacher.phone,
              attendanceStatus: origAtt?.status || 'ABSENT',
              remarks: origAtt?.remarks || null,
            }
          : null,
        isAssigned: !!assignment && assignment.status !== 'CANCELLED',
        assignment: assignment && assignment.status !== 'CANCELLED'
          ? {
              id: assignment.id,
              status: assignment.status,
              remarks: assignment.remarks,
              substituteTeacher: subTeacher
                ? {
                    id: subTeacher.id,
                    staffCode: subTeacher.staffCode,
                    fullNameEn: subTeacher.fullNameEn,
                    fullNameNp: subTeacher.fullNameNp,
                    designation: subTeacher.designation,
                    phone: subTeacher.phone,
                  }
                : null,
            }
          : null,
        availableTeachers,
      };
    });

    // Also include any standalone assignments not linked to an affected timetable slot
    // (e.g. if created manually)
    for (const a of existingAssignments) {
      if (a.status === 'CANCELLED') continue;
      const alreadyInList = periodsList.some(
        (p: any) =>
          p.timetableId === a.timetableId ||
          (p.classId === a.classId && p.sectionId === a.sectionId && p.periodNumber === a.periodNumber)
      );
      if (!alreadyInList) {
        const cls = classMap.get(a.classId);
        const sec = sectionMap.get(a.sectionId);
        const sub = subjectMap.get(a.subjectId);
        const origTeacher = staffMap.get(a.originalTeacherId);
        const origAtt = origTeacher ? attMap.get(origTeacher.id) : null;
        const subTeacher = staffMap.get(a.substituteTeacherId);
        const availableTeachers = getFreeTeachersForPeriod(a.periodNumber);

        periodsList.push({
          id: a.id,
          timetableId: a.timetableId || a.id,
          classId: a.classId,
          classNameEn: cls?.nameEn || 'Class',
          classNameNp: cls?.nameNp || 'कक्षा',
          sectionId: a.sectionId,
          sectionCode: sec?.code || 'A',
          sectionNameNp: sec?.nameNp || 'खण्ड क',
          subjectId: a.subjectId,
          subjectNameEn: sub?.nameEn || 'Subject',
          subjectNameNp: sub?.nameNp || 'विषय',
          periodNumber: a.periodNumber,
          startTime: a.startTime || '—',
          endTime: a.endTime || '—',
          roomNumber: null,
          originalTeacher: origTeacher
            ? {
                id: origTeacher.id,
                staffCode: origTeacher.staffCode,
                fullNameEn: origTeacher.fullNameEn,
                fullNameNp: origTeacher.fullNameNp,
                phone: origTeacher.phone,
                attendanceStatus: origAtt?.status || 'ABSENT',
                remarks: origAtt?.remarks || null,
              }
            : null,
          isAssigned: true,
          assignment: {
            id: a.id,
            status: a.status,
            remarks: a.remarks,
            substituteTeacher: subTeacher
              ? {
                  id: subTeacher.id,
                  staffCode: subTeacher.staffCode,
                  fullNameEn: subTeacher.fullNameEn,
                  fullNameNp: subTeacher.fullNameNp,
                  designation: subTeacher.designation,
                  phone: subTeacher.phone,
                }
              : null,
          },
          availableTeachers,
        });
      }
    }

    periodsList.sort((a: any, b: any) => a.periodNumber - b.periodNumber);

    const vacantCount = periodsList.filter((p: any) => !p.isAssigned).length;
    const assignedCount = periodsList.filter((p: any) => p.isAssigned).length;
    const totalAffected = periodsList.length;

    return reply.send({
      dateBs: targetDateBs,
      dayOfWeek: targetDayOfWeek,
      vacantCount,
      assignedCount,
      totalAffected,
      periods: periodsList,
    });
  });

  // 2. Assign Substitute Teacher (with Period Collision Guard)
  fastify.post('/assign', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as {
      dateBs: string;
      timetableId?: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      originalTeacherId: string;
      substituteTeacherId: string;
      periodNumber: number;
      startTime?: string;
      endTime?: string;
      remarks?: string;
    };

    if (
      !body.dateBs ||
      !body.classId ||
      !body.sectionId ||
      !body.subjectId ||
      !body.originalTeacherId ||
      !body.substituteTeacherId ||
      !body.periodNumber
    ) {
      return reply.status(400).send({
        message:
          'आवश्यक विवरण अपुग छ (dateBs, classId, sectionId, subjectId, originalTeacherId, substituteTeacherId, periodNumber are required)',
      });
    }

    const targetDayOfWeek = getDayOfWeekFromBs(body.dateBs);

    // Collision Check 1: Does the substitute teacher already have a regular timetable slot during this period?
    const regularConflict = await db.query.timetables.findFirst({
      where: (t: any, { and, eq }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          eq(t.dayOfWeek, targetDayOfWeek),
          eq(t.periodNumber, body.periodNumber),
          eq(t.teacherId, body.substituteTeacherId)
        ),
    });

    if (regularConflict) {
      return reply.status(400).send({
        message: `यस शिक्षकको ${body.periodNumber} घण्टीमा आफ्नै नियमित कक्षा रहेकोले सट्टा तोक्न मिल्दैन। कृपया खाली शिक्षक छनोट गर्नुहोस्।`,
      });
    }

    // Collision Check 2: Has this teacher already been assigned as substitute for another class during this period?
    const subConflict = await db.query.substituteAssignments.findFirst({
      where: (t: any, { and, eq, ne }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          eq(t.dateBs, body.dateBs),
          eq(t.periodNumber, body.periodNumber),
          eq(t.substituteTeacherId, body.substituteTeacherId),
          ne(t.status, 'CANCELLED')
        ),
    });

    if (subConflict) {
      return reply.status(400).send({
        message: `यस शिक्षकलाई आज ${body.periodNumber} घण्टीमा पहिले नै अर्को कक्षाको सट्टा तोकिसकिएको छ।`,
      });
    }

    // Check if an assignment already exists for this exact class, section, period
    const existingSlot = await db.query.substituteAssignments.findFirst({
      where: (t: any, { and, eq, ne }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          eq(t.dateBs, body.dateBs),
          eq(t.classId, body.classId),
          eq(t.sectionId, body.sectionId),
          eq(t.periodNumber, body.periodNumber),
          ne(t.status, 'CANCELLED')
        ),
    });

    const assignmentId = existingSlot ? existingSlot.id : crypto.randomUUID();

    if (existingSlot) {
      await db
        .update(schema.substituteAssignments)
        .set({
          substituteTeacherId: body.substituteTeacherId,
          remarks: body.remarks || null,
          assignedById: currentUser.id,
          status: 'ASSIGNED',
        })
        .where(eq(schema.substituteAssignments.id, existingSlot.id));
    } else {
      await db.insert(schema.substituteAssignments).values({
        id: assignmentId,
        schoolId: currentUser.schoolId,
        dateBs: body.dateBs,
        timetableId: body.timetableId || null,
        classId: body.classId,
        sectionId: body.sectionId,
        subjectId: body.subjectId,
        originalTeacherId: body.originalTeacherId,
        substituteTeacherId: body.substituteTeacherId,
        periodNumber: body.periodNumber,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        status: 'ASSIGNED',
        remarks: body.remarks || null,
        assignedById: currentUser.id,
      });
    }

    return reply.send({
      message: 'सट्टा शिक्षक सफलतापूर्वक तोकियो (Substitute teacher assigned successfully)',
      id: assignmentId,
    });
  });

  // 3. Cancel / Delete Substitution Assignment
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.substituteAssignments.findFirst({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'सट्टा रेकर्ड फेला परेन' });
    }

    await db.delete(schema.substituteAssignments).where(eq(schema.substituteAssignments.id, id));
    return reply.send({ message: 'सट्टा कक्षा रद्द गरियो (Substitution cancelled successfully)', id });
  });

  // 4. Get Current User's Assigned Substitute Classes Today (Teacher Notice Banner)
  fastify.get('/my-today', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs } = request.query as { dateBs?: string };

    const todayBik = toBik(new Date());
    const targetDateBs =
      dateBs ||
      (todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-05-31');

    // Find staff record associated with this user
    const staffRecord = await db.query.staff.findFirst({
      where: (t: any, { and, eq, or }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          or(
            eq(t.userId, currentUser.id),
            eq(t.email, currentUser.email || '___no_email___'),
            eq(t.phone, currentUser.phone || '___no_phone___')
          )
        ),
    });

    if (!staffRecord) {
      return reply.send({ hasAssignments: false, assignments: [] });
    }

    const myAssignments = await db.query.substituteAssignments.findMany({
      where: (t: any, { and, eq, ne }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          eq(t.dateBs, targetDateBs),
          eq(t.substituteTeacherId, staffRecord.id),
          ne(t.status, 'CANCELLED')
        ),
      orderBy: (t: any, { asc }: any) => [asc(t.periodNumber)],
    });

    if (myAssignments.length === 0) {
      return reply.send({ hasAssignments: false, assignments: [] });
    }

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

    const enriched = myAssignments.map((a: any) => {
      const cls = classMap.get(a.classId);
      const sec = sectionMap.get(a.sectionId);
      const sub = subjectMap.get(a.subjectId);
      const origTeacher = staffMap.get(a.originalTeacherId);

      return {
        id: a.id,
        dateBs: a.dateBs,
        periodNumber: a.periodNumber,
        startTime: a.startTime,
        endTime: a.endTime,
        remarks: a.remarks,
        status: a.status,
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        sectionCode: sec?.code || 'A',
        sectionNameNp: sec?.nameNp || 'खण्ड क',
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameNp: sub?.nameNp || 'विषय',
        originalTeacherNameEn: origTeacher?.fullNameEn || 'Teacher',
        originalTeacherNameNp: origTeacher?.fullNameNp || 'शिक्षक',
      };
    });

    return reply.send({
      hasAssignments: true,
      staffNameEn: staffRecord.fullNameEn,
      staffNameNp: staffRecord.fullNameNp,
      assignments: enriched,
    });
  });

  // 5. Get Substitution History / Logs
  fastify.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs, teacherId, limit = 50 } = request.query as {
      dateBs?: string;
      teacherId?: string;
      limit?: number;
    };

    const conds = [eq(schema.substituteAssignments.schoolId, currentUser.schoolId)];
    if (dateBs) conds.push(eq(schema.substituteAssignments.dateBs, dateBs));
    if (teacherId) {
      conds.push(
        or(
          eq(schema.substituteAssignments.substituteTeacherId, teacherId),
          eq(schema.substituteAssignments.originalTeacherId, teacherId)
        )!
      );
    }

    const assignments = await db.query.substituteAssignments.findMany({
      where: and(...conds),
      orderBy: (t: any, { desc }: any) => [desc(t.dateBs), desc(t.periodNumber)],
      limit: Number(limit) || 50,
    });

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

    const records = assignments.map((a: any) => {
      const cls = classMap.get(a.classId);
      const sec = sectionMap.get(a.sectionId);
      const sub = subjectMap.get(a.subjectId);
      const origTeacher = staffMap.get(a.originalTeacherId);
      const subTeacher = staffMap.get(a.substituteTeacherId);

      return {
        id: a.id,
        dateBs: a.dateBs,
        periodNumber: a.periodNumber,
        startTime: a.startTime,
        endTime: a.endTime,
        remarks: a.remarks,
        status: a.status,
        createdAt: a.createdAt,
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        sectionCode: sec?.code || 'A',
        sectionNameNp: sec?.nameNp || 'खण्ड क',
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameNp: sub?.nameNp || 'विषय',
        originalTeacherNameEn: origTeacher?.fullNameEn || 'Teacher',
        originalTeacherNameNp: origTeacher?.fullNameNp || 'शिक्षक',
        substituteTeacherNameEn: subTeacher?.fullNameEn || 'Substitute',
        substituteTeacherNameNp: subTeacher?.fullNameNp || 'सट्टा शिक्षक',
      };
    });

    return reply.send({ records, count: records.length });
  });
}
