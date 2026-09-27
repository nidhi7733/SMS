import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export default async function staffAttendanceRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get Daily Staff Attendance
  fastify.get('/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs, category } = request.query as {
      dateBs: string;
      category?: string;
    };

    if (!dateBs) {
      return reply.status(400).send({ message: 'dateBs is required' });
    }

    const staffList = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.status, 'ACTIVE'),
        ];
        if (category && category !== 'ALL') {
          conditions.push(eq(table.category, category));
        }
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [asc(table.staffCode), asc(table.fullNameEn)],
    });

    const records = await db.query.staffAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, dateBs)),
    });

    const map = new Map<string, any>();
    for (const r of records) map.set(r.staffId, r);

    const merged = staffList.map((s: any) => {
      const rec = map.get(s.id);
      return {
        staffId: s.id,
        staffCode: s.staffCode,
        fullNameEn: s.fullNameEn,
        fullNameNp: s.fullNameNp,
        category: s.category,
        designation: s.designation,
        phone: s.phone,
        status: rec ? rec.status : 'PRESENT',
        inTime: rec?.inTime || '10:00',
        outTime: rec?.outTime || '16:00',
        remarks: rec?.remarks || '',
        isRecorded: !!rec,
      };
    });

    return reply.send({
      dateBs,
      staff: merged,
      counts: {
        total: merged.length,
        present: merged.filter((m: any) => m.status === 'PRESENT' || m.status === 'LATE').length,
        absent: merged.filter((m: any) => m.status === 'ABSENT').length,
        onLeave: merged.filter((m: any) => m.status === 'ON_LEAVE').length,
        officialDuty: merged.filter((m: any) => m.status === 'OFFICIAL_DUTY').length,
      },
    });
  });

  // 2. Batch Save Staff Attendance
  fastify.post('/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { attendanceDateBs, attendanceDateAd, records } = request.body as {
      attendanceDateBs: string;
      attendanceDateAd?: string;
      records: Array<{
        staffId: string;
        status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'LATE' | 'OFFICIAL_DUTY';
        inTime?: string;
        outTime?: string;
        remarks?: string;
      }>;
    };

    if (!attendanceDateBs || !records) {
      return reply.status(400).send({ message: 'attendanceDateBs and records are required' });
    }

    const dateAd = attendanceDateAd || new Date().toISOString().split('T')[0];

    const existingRecords = await db.query.staffAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, attendanceDateBs)),
    });

    const map = new Map<string, any>();
    for (const er of existingRecords) map.set(er.staffId, er);

    let saved = 0;
    for (const r of records) {
      const ex = map.get(r.staffId);
      if (ex) {
        await db.update(schema.staffAttendance)
          .set({
            status: r.status,
            inTime: r.inTime || null,
            outTime: r.outTime || null,
            remarks: r.remarks || null,
            recordedById: currentUser.userId,
          })
          .where(eq(schema.staffAttendance.id, ex.id));
      } else {
        await db.insert(schema.staffAttendance).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          staffId: r.staffId,
          attendanceDateBs,
          attendanceDateAd: dateAd,
          status: r.status,
          inTime: r.inTime || null,
          outTime: r.outTime || null,
          remarks: r.remarks || null,
          recordedById: currentUser.userId,
          createdAt: new Date(),
        });
      }
      saved++;
    }

    return reply.send({ message: `Successfully saved attendance for ${saved} staff members` });
  });

  // 3. Get Monthly Staff Register (Days 1 to 32 Matrix for Teachers & Staff)
  fastify.get('/monthly-register', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { yearBs = '2083', monthBs = '1', category } = request.query as {
      yearBs?: string;
      monthBs?: string;
      category?: string;
    };

    const monthPadded = String(monthBs).padStart(2, '0');
    const datePrefix = `${yearBs}-${monthPadded}-`; // e.g. "2083-05-"

    const staffList = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.status, 'ACTIVE'),
        ];
        if (category && category !== 'ALL') {
          conditions.push(eq(table.category, category));
        }
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [asc(table.staffCode), asc(table.fullNameEn)],
    });

    const monthlyRecords = await db.query.staffAttendance.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const matchingRecords = monthlyRecords.filter((rec: any) =>
      rec.attendanceDateBs?.startsWith(datePrefix)
    );

    // Map: staffId -> day -> { status, inTime, outTime, remarks }
    const matrixMap = new Map<string, Record<number, any>>();
    const allDaysSet = new Set<number>();

    for (const rec of matchingRecords) {
      const parts = rec.attendanceDateBs.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        if (!isNaN(day)) {
          allDaysSet.add(day);
          if (!matrixMap.has(rec.staffId)) {
            matrixMap.set(rec.staffId, {});
          }
          matrixMap.get(rec.staffId)![day] = {
            status: rec.status,
            inTime: rec.inTime,
            outTime: rec.outTime,
            remarks: rec.remarks,
          };
        }
      }
    }

    const recordedDaysList = Array.from(allDaysSet).sort((a, b) => a - b);
    const recordedDaysCount = recordedDaysList.length;

    let totalPresentOverall = 0;
    let totalPossibleOverall = 0;

    const staffRows = staffList.map((s: any) => {
      const staffDays = matrixMap.get(s.id) || {};
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let officialDutyDays = 0;

      for (const day of recordedDaysList) {
        const rec = staffDays[day];
        if (rec) {
          if (rec.status === 'PRESENT' || rec.status === 'LATE') {
            presentDays++;
          } else if (rec.status === 'ABSENT') {
            absentDays++;
          } else if (rec.status === 'ON_LEAVE') {
            leaveDays++;
          } else if (rec.status === 'OFFICIAL_DUTY') {
            officialDutyDays++;
          }
        }
      }

      const workingDays = recordedDaysCount > 0 ? recordedDaysCount : 0;
      const effectivePresent = presentDays + officialDutyDays;
      const attendancePercentage = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 0;

      totalPresentOverall += effectivePresent;
      totalPossibleOverall += workingDays;

      return {
        staffId: s.id,
        staffCode: s.staffCode,
        fullNameEn: s.fullNameEn,
        fullNameNp: s.fullNameNp,
        category: s.category,
        designation: s.designation,
        phone: s.phone,
        attendanceByDay: staffDays,
        totalDays: workingDays,
        presentDays,
        absentDays,
        leaveDays,
        officialDutyDays,
        attendancePercentage,
      };
    });

    const overallRate = totalPossibleOverall > 0 ? Math.round((totalPresentOverall / totalPossibleOverall) * 100) : 100;

    return reply.send({
      yearBs,
      monthBs,
      category: category || 'ALL',
      recordedDays: recordedDaysList,
      totalRecordedDays: recordedDaysCount,
      staff: staffRows,
      summary: {
        totalStaff: staffList.length,
        teachingCount: staffList.filter((s: any) => s.category === 'TEACHING').length,
        nonTeachingCount: staffList.filter((s: any) => s.category === 'NON_TEACHING').length,
        totalRecordedDays: recordedDaysCount,
        overallAttendancePercentage: overallRate,
      },
    });
  });

  // 4. Staff Leaves List
  fastify.get('/leaves', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const leaves = await db.query.staffLeaves.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    // Join with staff names
    const staffMembers = await db.query.staff.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const staffMap = new Map<string, any>();
    for (const s of staffMembers) staffMap.set(s.id, s);

    const enriched = leaves.map((l: any) => {
      const s = staffMap.get(l.staffId);
      return {
        ...l,
        staffNameEn: s?.fullNameEn || 'Unknown',
        staffNameNp: s?.fullNameNp || 'अज्ञात',
        staffCode: s?.staffCode || '',
        category: s?.category || '',
      };
    });

    return reply.send(enriched);
  });

  // 4. Apply for Leave
  fastify.post('/leaves', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.staffId || !body.leaveType || !body.startDateBs || !body.endDateBs) {
      return reply.status(400).send({ message: 'staffId, leaveType, startDateBs, and endDateBs are required' });
    }

    const newLeave = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      staffId: body.staffId,
      leaveType: body.leaveType,
      startDateBs: body.startDateBs,
      endDateBs: body.endDateBs,
      totalDays: body.totalDays || 1,
      reason: body.reason || 'Personal',
      status: 'PENDING',
      createdAt: new Date(),
    };

    await db.insert(schema.staffLeaves).values(newLeave);

    return reply.status(201).send(newLeave);
  });

  // 5. Approve / Reject Leave (Principal / Admin)
  fastify.put('/leaves/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const { status, reviewRemarks } = request.body as { status: string; reviewRemarks?: string };

    const existing = await db.query.staffLeaves.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Leave application not found' });
    }

    await db.update(schema.staffLeaves)
      .set({
        status,
        approvedById: currentUser.userId,
        reviewRemarks: reviewRemarks || null,
      })
      .where(eq(schema.staffLeaves.id, id));

    return reply.send({ message: `Leave application marked as ${status}` });
  });
}
