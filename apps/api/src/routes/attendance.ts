import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export default async function attendanceRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get Daily Attendance for a Class & Section on a Date
  fastify.get('/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId, dateBs } = request.query as {
      classId: string;
      sectionId?: string;
      dateBs: string;
    };

    if (!classId || !dateBs) {
      return reply.status(400).send({ message: 'classId and dateBs are required' });
    }

    // Get active students enrolled in this class/section
    const studentsList = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.currentClassId, classId),
          eq(table.status, 'ACTIVE'),
        ];
        if (sectionId && sectionId !== 'ALL') {
          conditions.push(eq(table.currentSectionId, sectionId));
        }
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [
        asc(table.currentRollNumber),
        asc(table.firstNameEn),
      ],
    });

    // Get existing attendance records for this date
    const attendanceRecords = await db.query.studentAttendance.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.classId, classId),
          eq(table.attendanceDateBs, dateBs),
        ];
        if (sectionId && sectionId !== 'ALL') {
          conditions.push(eq(table.sectionId, sectionId));
        }
        return and(...conditions);
      },
    });

    const attendanceMap = new Map<string, any>();
    for (const rec of attendanceRecords) {
      attendanceMap.set(rec.studentId, rec);
    }

    // Merge student info with their attendance status
    const result = studentsList.map((s: any) => {
      const existing = attendanceMap.get(s.id);
      return {
        studentId: s.id,
        studentCode: s.studentId,
        rollNumber: s.currentRollNumber || 0,
        fullNameEn: `${s.firstNameEn} ${s.lastNameEn}`,
        fullNameNp: `${s.firstNameNp} ${s.lastNameNp}`,
        gender: s.gender,
        photoUrl: s.photoUrl || null,
        status: existing ? existing.status : 'PRESENT', // default to PRESENT
        remarks: existing?.remarks || '',
        recordedAt: existing?.createdAt || null,
        isRecorded: !!existing,
      };
    });

    const summary = {
      total: result.length,
      present: result.filter((r: any) => r.status === 'PRESENT').length,
      absent: result.filter((r: any) => r.status === 'ABSENT').length,
      late: result.filter((r: any) => r.status === 'LATE').length,
      leave: result.filter((r: any) => r.status === 'SICK_LEAVE' || r.status === 'EXCUSED_LEAVE').length,
      halfDay: result.filter((r: any) => r.status === 'HALF_DAY').length,
    };

    return reply.send({
      classId,
      sectionId,
      dateBs,
      summary,
      students: result,
    });
  });

  // 2. Batch Save / Update Daily Attendance
  fastify.post('/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId, attendanceDateBs, attendanceDateAd, records } = request.body as {
      classId: string;
      sectionId?: string;
      attendanceDateBs: string;
      attendanceDateAd?: string;
      records: Array<{
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK_LEAVE' | 'EXCUSED_LEAVE' | 'HALF_DAY';
        remarks?: string;
      }>;
    };

    if (!classId || !attendanceDateBs || !records || records.length === 0) {
      return reply.status(400).send({ message: 'classId, attendanceDateBs, and records are required' });
    }

    // Get current active academic year
    const activeYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.isCurrent, true)),
    });

    const academicYearId = activeYear ? activeYear.id : '2083-default';
    const dateAd = attendanceDateAd || new Date().toISOString().split('T')[0];

    // Find existing records for this class, section, dateBs
    const existingRecords = await db.query.studentAttendance.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.classId, classId),
          eq(table.attendanceDateBs, attendanceDateBs),
        ];
        if (sectionId && sectionId !== 'ALL') {
          conditions.push(eq(table.sectionId, sectionId));
        }
        return and(...conditions);
      },
    });

    const existingMap = new Map<string, any>();
    for (const er of existingRecords) {
      existingMap.set(er.studentId, er);
    }

    let savedCount = 0;
    for (const r of records) {
      const existing = existingMap.get(r.studentId);
      if (existing) {
        // Update
        await db.update(schema.studentAttendance)
          .set({
            status: r.status,
            remarks: r.remarks || null,
            recordedById: currentUser.userId,
            updatedAt: new Date(),
          })
          .where(eq(schema.studentAttendance.id, existing.id));
      } else {
        // Insert
        await db.insert(schema.studentAttendance).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: r.studentId,
          classId,
          sectionId: sectionId && sectionId !== 'ALL' ? sectionId : null,
          academicYearId,
          attendanceDateBs,
          attendanceDateAd: dateAd,
          status: r.status,
          remarks: r.remarks || null,
          recordedById: currentUser.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      savedCount++;
    }

    return reply.send({
      message: `Successfully saved attendance for ${savedCount} students`,
      classId,
      sectionId,
      dateBs: attendanceDateBs,
      count: savedCount,
    });
  });

  // 3. Monthly Register / Haziri Khata (Days 1 to 32 Matrix with CDC 75% rule)
  fastify.get('/monthly-register', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId, yearBs = '2083', monthBs = '1' } = request.query as {
      classId: string;
      sectionId?: string;
      yearBs?: string;
      monthBs?: string;
    };

    if (!classId) {
      return reply.status(400).send({ message: 'classId is required' });
    }

    const monthPadded = String(monthBs).padStart(2, '0');
    const datePrefix = `${yearBs}-${monthPadded}-`; // e.g. "2083-01-"

    // Get active students
    const studentsList = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.currentClassId, classId),
          eq(table.status, 'ACTIVE'),
        ];
        if (sectionId && sectionId !== 'ALL') {
          conditions.push(eq(table.currentSectionId, sectionId));
        }
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [
        asc(table.currentRollNumber),
        asc(table.firstNameEn),
      ],
    });

    // Get all attendance records for this month
    const monthlyRecords = await db.query.studentAttendance.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [
          eq(table.schoolId, currentUser.schoolId),
          eq(table.classId, classId),
        ];
        if (sectionId && sectionId !== 'ALL') {
          conditions.push(eq(table.sectionId, sectionId));
        }
        return and(...conditions);
      },
    });

    // Filter by datePrefix
    const matchingRecords = monthlyRecords.filter((rec: any) =>
      rec.attendanceDateBs?.startsWith(datePrefix)
    );

    // Map: studentId -> day -> status
    const matrixMap = new Map<string, Record<number, string>>();
    const allDaysSet = new Set<number>();

    for (const rec of matchingRecords) {
      const parts = rec.attendanceDateBs.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        if (!isNaN(day)) {
          allDaysSet.add(day);
          if (!matrixMap.has(rec.studentId)) {
            matrixMap.set(rec.studentId, {});
          }
          matrixMap.get(rec.studentId)![day] = rec.status;
        }
      }
    }

    const recordedDaysCount = allDaysSet.size;

    // Build student register rows
    const registerRows = studentsList.map((s: any) => {
      const studentDays = matrixMap.get(s.id) || {};
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;

      for (const day of Array.from(allDaysSet)) {
        const st = studentDays[day];
        if (st === 'PRESENT' || st === 'LATE' || st === 'HALF_DAY') {
          presentDays++;
        } else if (st === 'ABSENT') {
          absentDays++;
        } else if (st === 'SICK_LEAVE' || st === 'EXCUSED_LEAVE') {
          leaveDays++;
        }
      }

      const totalRecordedDays = recordedDaysCount > 0 ? recordedDaysCount : 1;
      const attendancePercentage = Math.round((presentDays / totalRecordedDays) * 100);
      const belowThreshold = attendancePercentage < 75 && recordedDaysCount >= 5;

      return {
        studentId: s.id,
        studentCode: s.studentId,
        rollNumber: s.currentRollNumber || 0,
        fullNameEn: `${s.firstNameEn} ${s.lastNameEn}`,
        fullNameNp: `${s.firstNameNp} ${s.lastNameNp}`,
        gender: s.gender,
        photoUrl: s.photoUrl || null,
        attendanceByDay: studentDays,
        totalDays: recordedDaysCount,
        presentDays,
        absentDays,
        leaveDays,
        attendancePercentage,
        belowThreshold,
      };
    });

    return reply.send({
      classId,
      sectionId,
      yearBs,
      monthBs,
      recordedDays: Array.from(allDaysSet).sort((a, b) => a - b),
      totalRecordedDays: recordedDaysCount,
      students: registerRows,
    });
  });

  // 4. Overall Attendance Stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs } = request.query as { dateBs?: string };

    const todayBs = dateBs || '2083-01-15';

    const totalStudents = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.status, 'ACTIVE')),
    });

    const todayRecords = await db.query.studentAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, todayBs)),
    });

    const presentCount = todayRecords.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absentCount = todayRecords.filter((r: any) => r.status === 'ABSENT').length;
    const leaveCount = todayRecords.filter((r: any) => r.status === 'SICK_LEAVE' || r.status === 'EXCUSED_LEAVE').length;

    const rate = todayRecords.length > 0 ? Math.round((presentCount / todayRecords.length) * 100) : 0;

    return reply.send({
      dateBs: todayBs,
      totalStudents: totalStudents.length,
      markedStudents: todayRecords.length,
      presentCount,
      absentCount,
      leaveCount,
      attendanceRate: rate,
    });
  });

  // 5. Today's Attendance Dashboard Summary (for Principal & Class Teachers)
  fastify.get('/dashboard-summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs } = request.query as { dateBs?: string };

    const targetDateBs = dateBs || '2083-05-31';

    // 1. Staff and Teachers attendance today
    const allStaff = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.status, 'ACTIVE')),
    });

    const staffAttendanceToday = await db.query.staffAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, targetDateBs)),
    });

    const staffAttMap = new Map<string, any>();
    for (const sa of staffAttendanceToday) {
      staffAttMap.set(sa.staffId, sa);
    }

    const teachers = allStaff.filter((s: any) => s.category === 'TEACHING');
    const nonTeaching = allStaff.filter((s: any) => s.category === 'NON_TEACHING');

    const computeStaffCounts = (list: any[]) => {
      let present = 0;
      let absent = 0;
      let onLeave = 0;
      let officialDuty = 0;
      let late = 0;
      let unmarked = 0;
      for (const s of list) {
        const att = staffAttMap.get(s.id);
        if (!att) {
          unmarked++;
        } else if (att.status === 'OFFICIAL_DUTY') {
          officialDuty++;
        } else if (att.status === 'ON_LEAVE') {
          onLeave++;
        } else if (att.status === 'ABSENT') {
          absent++;
        } else if (att.status === 'PRESENT') {
          present++;
        } else if (att.status === 'LATE') {
          late++;
          present++;
        }
      }
      return {
        total: list.length,
        present,
        absent,
        onLeave,
        officialDuty,
        late,
        unmarked,
        attendanceRate: list.length > 0 ? Math.round(((present + officialDuty) / list.length) * 100) : 0,
      };
    };

    const teacherSummary = computeStaffCounts(teachers);
    const nonTeachingSummary = computeStaffCounts(nonTeaching);

    // Collect individual staff members who are ABSENT, ON_LEAVE, or on OFFICIAL_DUTY today
    const absentStaff: any[] = [];
    const onLeaveStaff: any[] = [];
    const officialDutyStaff: any[] = [];

    for (const s of allStaff) {
      const att = staffAttMap.get(s.id);
      if (att) {
        const item = {
          id: s.id,
          staffCode: s.staffCode,
          fullNameEn: s.fullNameEn,
          fullNameNp: s.fullNameNp || s.fullNameEn,
          category: s.category,
          designation: s.designation,
          phone: s.phone,
          status: att.status,
          remarks: att.remarks || null,
        };
        if (att.status === 'ABSENT') {
          absentStaff.push(item);
        } else if (att.status === 'ON_LEAVE') {
          onLeaveStaff.push(item);
        } else if (att.status === 'OFFICIAL_DUTY') {
          officialDutyStaff.push(item);
        }
      }
    }

    // 2. Class-wise students attendance today
    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.displayOrder)],
    });

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { asc }: any) => [asc(table.code)],
    });

    const allStudents = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.status, 'ACTIVE')),
    });

    const studentAttendanceToday = await db.query.studentAttendance.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.attendanceDateBs, targetDateBs)),
    });

    const studentAttMap = new Map<string, any>();
    for (const rec of studentAttendanceToday) {
      studentAttMap.set(rec.studentId, rec);
    }

    // Teacher name lookup for sections
    const staffUserMap = new Map<string, string>();
    for (const st of allStaff) {
      if (st.userId) staffUserMap.set(st.userId, st.fullNameEn);
      staffUserMap.set(st.id, st.fullNameEn);
    }

    const classWise = allClasses.map((cls: any) => {
      const classSections = allSections.filter((s: any) => s.classId === cls.id);
      const classStudents = allStudents.filter((st: any) => st.currentClassId === cls.id);

      let classPresent = 0;
      let classAbsent = 0;
      let classLeave = 0;
      let classUnmarked = 0;

      const sectionsSummary = classSections.map((sec: any) => {
        const secStudents = classStudents.filter((st: any) => st.currentSectionId === sec.id);
        let secPresent = 0;
        let secAbsent = 0;
        let secLeave = 0;
        let secUnmarked = 0;

        for (const st of secStudents) {
          const att = studentAttMap.get(st.id);
          if (!att) {
            secUnmarked++;
          } else if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'HALF_DAY') {
            secPresent++;
          } else if (att.status === 'ABSENT') {
            secAbsent++;
          } else if (att.status === 'SICK_LEAVE' || att.status === 'EXCUSED_LEAVE') {
            secLeave++;
          }
        }

        classPresent += secPresent;
        classAbsent += secAbsent;
        classLeave += secLeave;
        classUnmarked += secUnmarked;

        const teacherName = sec.classTeacherId ? staffUserMap.get(sec.classTeacherId) || 'Assigned' : null;

        return {
          sectionId: sec.id,
          code: sec.code,
          nameEn: sec.nameEn,
          nameNp: sec.nameNp,
          classTeacherId: sec.classTeacherId,
          classTeacherName: teacherName,
          totalStudents: secStudents.length,
          present: secPresent,
          absent: secAbsent,
          leave: secLeave,
          unmarked: secUnmarked,
          isMarkedToday: secStudents.length > 0 && secUnmarked < secStudents.length,
          attendanceRate: secStudents.length > 0 ? Math.round((secPresent / secStudents.length) * 100) : 0,
        };
      });

      // Students not assigned to any section if any
      const noSecStudents = classStudents.filter((st: any) => !st.currentSectionId);
      for (const st of noSecStudents) {
        const att = studentAttMap.get(st.id);
        if (!att) classUnmarked++;
        else if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'HALF_DAY') classPresent++;
        else if (att.status === 'ABSENT') classAbsent++;
        else if (att.status === 'SICK_LEAVE' || att.status === 'EXCUSED_LEAVE') classLeave++;
      }

      const totalStudents = classStudents.length;
      const rate = totalStudents > 0 ? Math.round((classPresent / totalStudents) * 100) : 0;

      return {
        classId: cls.id,
        code: cls.code,
        nameEn: cls.nameEn,
        nameNp: cls.nameNp,
        totalStudents,
        present: classPresent,
        absent: classAbsent,
        leave: classLeave,
        unmarked: classUnmarked,
        isMarkedToday: totalStudents > 0 && classUnmarked < totalStudents,
        attendanceRate: rate,
        sections: sectionsSummary,
      };
    });

    // 3. Find if current user is assigned as Class Teacher for any section
    const userStaff = allStaff.find((s: any) => s.userId === currentUser.userId);
    const mySection = allSections.find(
      (s: any) =>
        (s.classTeacherId && s.classTeacherId === currentUser.userId) ||
        (userStaff && s.classTeacherId && s.classTeacherId === userStaff.id)
    );

    let myClassTeacherAssignment = null;
    if (mySection) {
      const assignedClass = allClasses.find((c: any) => c.id === mySection.classId);
      const assignedStudents = allStudents.filter(
        (st: any) => st.currentClassId === mySection.classId && st.currentSectionId === mySection.id
      );

      let secPresent = 0;
      let secAbsent = 0;
      let secLeave = 0;
      let secUnmarked = 0;

      for (const st of assignedStudents) {
        const att = studentAttMap.get(st.id);
        if (!att) {
          secUnmarked++;
        } else if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'HALF_DAY') {
          secPresent++;
        } else if (att.status === 'ABSENT') {
          secAbsent++;
        } else if (att.status === 'SICK_LEAVE' || att.status === 'EXCUSED_LEAVE') {
          secLeave++;
        }
      }

      myClassTeacherAssignment = {
        isClassTeacher: true,
        classId: mySection.classId,
        classNameEn: assignedClass?.nameEn || 'Class',
        classNameNp: assignedClass?.nameNp || 'कक्षा',
        classCode: assignedClass?.code || '',
        sectionId: mySection.id,
        sectionCode: mySection.code,
        sectionNameEn: mySection.nameEn,
        sectionNameNp: mySection.nameNp,
        totalStudents: assignedStudents.length,
        present: secPresent,
        absent: secAbsent,
        leave: secLeave,
        unmarked: secUnmarked,
        isMarkedToday: assignedStudents.length > 0 && secUnmarked < assignedStudents.length,
        attendanceRate: assignedStudents.length > 0 ? Math.round((secPresent / assignedStudents.length) * 100) : 0,
      };
    }

    // Total student stats
    const totalStudentsCount = allStudents.length;
    let overallStudentPresent = 0;
    let overallStudentAbsent = 0;
    let overallStudentLeave = 0;
    for (const c of classWise) {
      overallStudentPresent += c.present;
      overallStudentAbsent += c.absent;
      overallStudentLeave += c.leave;
    }

    const totalStaffSummary = {
      total: allStaff.length,
      present: teacherSummary.present + nonTeachingSummary.present,
      absent: teacherSummary.absent + nonTeachingSummary.absent,
      onLeave: teacherSummary.onLeave + nonTeachingSummary.onLeave,
      officialDuty: teacherSummary.officialDuty + nonTeachingSummary.officialDuty,
      unmarked: teacherSummary.unmarked + nonTeachingSummary.unmarked,
      attendanceRate:
        allStaff.length > 0
          ? Math.round(
              ((teacherSummary.present +
                nonTeachingSummary.present +
                teacherSummary.officialDuty +
                nonTeachingSummary.officialDuty) /
                allStaff.length) *
                100
            )
          : 0,
    };

    const roleWise = [
      {
        roleKey: 'TEACHERS',
        titleEn: 'Teaching Staff (Teachers)',
        titleNp: 'शिक्षक (अध्यापन)',
        total: teacherSummary.total,
        present: teacherSummary.present,
        absent: teacherSummary.absent,
        onLeave: teacherSummary.onLeave,
        officialDuty: teacherSummary.officialDuty,
        attendanceRate: teacherSummary.attendanceRate,
      },
      {
        roleKey: 'NON_TEACHING',
        titleEn: 'Administrative & Support Staff',
        titleNp: 'प्रशासनिक तथा सहयोगी कर्मचारी',
        total: nonTeachingSummary.total,
        present: nonTeachingSummary.present,
        absent: nonTeachingSummary.absent,
        onLeave: nonTeachingSummary.onLeave,
        officialDuty: nonTeachingSummary.officialDuty,
        attendanceRate: nonTeachingSummary.attendanceRate,
      },
      {
        roleKey: 'TOTAL_STAFF',
        titleEn: 'Combined Staff & Teachers',
        titleNp: 'समग्र शिक्षक तथा कर्मचारी',
        total: totalStaffSummary.total,
        present: totalStaffSummary.present,
        absent: totalStaffSummary.absent,
        onLeave: totalStaffSummary.onLeave,
        officialDuty: totalStaffSummary.officialDuty,
        attendanceRate: totalStaffSummary.attendanceRate,
      },
      {
        roleKey: 'STUDENTS',
        titleEn: 'Students (Overall)',
        titleNp: 'विद्यार्थी (समग्र)',
        total: totalStudentsCount,
        present: overallStudentPresent,
        absent: overallStudentAbsent,
        onLeave: overallStudentLeave,
        officialDuty: 0,
        attendanceRate: totalStudentsCount > 0 ? Math.round((overallStudentPresent / totalStudentsCount) * 100) : 0,
      },
    ];

    return reply.send({
      dateBs: targetDateBs,
      teachers: teacherSummary,
      staff: nonTeachingSummary,
      totalStaff: totalStaffSummary,
      studentsOverall: {
        total: totalStudentsCount,
        present: overallStudentPresent,
        absent: overallStudentAbsent,
        onLeave: overallStudentLeave,
        attendanceRate: totalStudentsCount > 0 ? Math.round((overallStudentPresent / totalStudentsCount) * 100) : 0,
      },
      roleWise,
      notableStaff: {
        absent: absentStaff,
        onLeave: onLeaveStaff,
        officialDuty: officialDutyStaff,
        total: absentStaff.length + onLeaveStaff.length + officialDutyStaff.length,
      },
      classWise,
      myClassTeacherAssignment,
    });
  });
}
