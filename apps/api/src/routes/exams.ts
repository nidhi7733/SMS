import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, inArray, or, sql } from 'drizzle-orm';
import crypto from 'crypto';
import bs from 'bikram-sambat';

const { toBik } = (bs as any).default || bs;

// National Letter Grading System 2078 (CDC Nepal)
export function calculateGrade2078(percentage: number): { grade: string; gradePoint: number; remark: string } {
  if (percentage >= 90) return { grade: 'A+', gradePoint: 4.0, remark: 'Outstanding' };
  if (percentage >= 80) return { grade: 'A', gradePoint: 3.6, remark: 'Excellent' };
  if (percentage >= 70) return { grade: 'B+', gradePoint: 3.2, remark: 'Very Good' };
  if (percentage >= 60) return { grade: 'B', gradePoint: 2.8, remark: 'Good' };
  if (percentage >= 50) return { grade: 'C+', gradePoint: 2.4, remark: 'Satisfactory' };
  if (percentage >= 40) return { grade: 'C', gradePoint: 2.0, remark: 'Acceptable' };
  if (percentage >= 35) return { grade: 'D', gradePoint: 1.6, remark: 'Basic' };
  return { grade: 'NG', gradePoint: 0.0, remark: 'Non-Graded' };
}

// User Role & Subject Allotment Context Helper
export async function getUserRoleAndAllotments(db: any, currentUser: any) {
  const currentUserId = currentUser.userId || currentUser.id;
  const roles = Array.isArray(currentUser.roles)
    ? currentUser.roles.map((r: any) => (typeof r === 'string' ? r : r.name))
    : [];

  const isAdmin =
    Boolean(currentUser.isSuperAdmin) ||
    roles.includes('SYSTEM_ADMIN') ||
    roles.includes('PRINCIPAL') ||
    roles.includes('ADMINISTRATIVE_STAFF');

  if (isAdmin) {
    return {
      isAdmin: true,
      isAllAllowed: true,
      staffId: null,
      teacherName: 'विद्यालय प्रशासन / व्यवस्थापक',
      allotments: [] as Array<{ classId: string; sectionId: string | null; subjectId: string }>,
    };
  }

  // Find linked staff member
  const staffMember = await db.query.staff.findFirst({
    where: (t: any, { and, eq, or }: any) => {
      const conds = [eq(t.schoolId, currentUser.schoolId)];
      const matchUserId = eq(t.userId, currentUserId);
      if (currentUser.phone) {
        conds.push(or(matchUserId, eq(t.phone, currentUser.phone)));
      } else {
        conds.push(matchUserId);
      }
      return and(...conds);
    },
  });

  if (!staffMember) {
    return {
      isAdmin: false,
      isAllAllowed: false,
      staffId: null,
      teacherName: currentUser.username || 'Teacher',
      allotments: [] as Array<{ classId: string; sectionId: string | null; subjectId: string }>,
    };
  }

  // 1. Allotments from Timetables routine
  const timetableRecords = await db.query.timetables.findMany({
    where: (t: any, { and, eq }: any) =>
      and(eq(t.schoolId, currentUser.schoolId), eq(t.teacherId, staffMember.id)),
  });

  // 2. Direct Subject assignments (subjects.teacherId == staffMember.id)
  const subjectRecords = await db.query.subjects.findMany({
    where: (t: any, { and, eq }: any) =>
      and(eq(t.schoolId, currentUser.schoolId), eq(t.teacherId, staffMember.id)),
  });

  const allotmentMap = new Map<string, { classId: string; sectionId: string | null; subjectId: string }>();

  for (const tt of timetableRecords) {
    if (tt.subjectId && tt.classId) {
      allotmentMap.set(`${tt.classId}_${tt.sectionId || 'ALL'}_${tt.subjectId}`, {
        classId: tt.classId,
        sectionId: tt.sectionId || null,
        subjectId: tt.subjectId,
      });
      allotmentMap.set(`${tt.classId}_ALL_${tt.subjectId}`, {
        classId: tt.classId,
        sectionId: null,
        subjectId: tt.subjectId,
      });
    }
  }

  for (const sub of subjectRecords) {
    allotmentMap.set(`${sub.classId}_${sub.sectionId || 'ALL'}_${sub.id}`, {
      classId: sub.classId,
      sectionId: sub.sectionId || null,
      subjectId: sub.id,
    });
    allotmentMap.set(`${sub.classId}_ALL_${sub.id}`, {
      classId: sub.classId,
      sectionId: null,
      subjectId: sub.id,
    });
  }

  return {
    isAdmin: false,
    isAllAllowed: false,
    staffId: staffMember.id,
    teacherName: staffMember.fullNameNp || staffMember.fullNameEn,
    allotments: Array.from(allotmentMap.values()),
  };
}

export function isSubjectAllottedToTeacher(
  allotments: Array<{ classId: string; sectionId: string | null; subjectId: string }>,
  classId: string,
  subjectId: string,
  sectionId?: string | null
): boolean {
  return allotments.some((a) => {
    if (a.subjectId !== subjectId) return false;
    if (a.classId !== classId) return false;
    if (!sectionId || sectionId === 'ALL' || !a.sectionId || a.sectionId === 'ALL') return true;
    return a.sectionId === sectionId;
  });
}

export default async function examRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 0. Get My Subject Allotments & Role Context
  fastify.get('/my-allotments', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const roleContext = await getUserRoleAndAllotments(db, currentUser);
    return reply.send(roleContext);
  });

  // 1. Get All Exams for the School
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const examsList = await db.query.exams.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.startDateBs)],
    });

    return reply.send({ exams: examsList });
  });

  // 2. Create or Update an Examination
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as {
      id?: string;
      nameEn: string;
      nameNp: string;
      examType: string;
      startDateBs: string;
      endDateBs: string;
      description?: string;
      academicYearId?: string;
    };

    if (!body.nameEn || !body.nameNp || !body.examType || !body.startDateBs || !body.endDateBs) {
      return reply.status(400).send({ message: 'All exam details are required' });
    }

    let academicYearId = body.academicYearId;
    if (!academicYearId) {
      const curYear = await db.query.academicYears.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.isCurrent, true)),
      });
      academicYearId = curYear?.id;
    }

    if (!academicYearId) {
      const anyYear = await db.query.academicYears.findFirst({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      });
      academicYearId = anyYear?.id;
    }

    if (body.id) {
      await db
        .update(schema.exams)
        .set({
          nameEn: body.nameEn,
          nameNp: body.nameNp,
          examType: body.examType,
          startDateBs: body.startDateBs,
          endDateBs: body.endDateBs,
          description: body.description || null,
        })
        .where(and(eq(schema.exams.id, body.id), eq(schema.exams.schoolId, currentUser.schoolId)));

      return reply.send({ message: 'Exam updated successfully', id: body.id });
    }

    const newId = crypto.randomUUID();
    await db.insert(schema.exams).values({
      id: newId,
      schoolId: currentUser.schoolId,
      academicYearId: academicYearId!,
      nameEn: body.nameEn,
      nameNp: body.nameNp,
      examType: body.examType,
      startDateBs: body.startDateBs,
      endDateBs: body.endDateBs,
      description: body.description || null,
      isResultPublished: false,
      isMarksLocked: false,
    });

    return reply.status(201).send({ message: 'Exam created successfully', id: newId });
  });

  // 3. Get Marks for a Class, Section, and Subject in an Exam
  fastify.get('/:id/marks', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, sectionId, subjectId } = request.query as {
      classId: string;
      sectionId?: string;
      subjectId: string;
    };

    if (!classId || !subjectId) {
      return reply.status(400).send({ message: 'classId and subjectId are required' });
    }

    const [exam, cls, subject, studentsList, userContext] = await Promise.all([
      db.query.exams.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.classes.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, classId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.subjects.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, subjectId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.students.findMany({
        where: (t: any, { and, eq }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId), eq(t.currentClassId, classId)];
          if (sectionId && sectionId !== 'ALL') conds.push(eq(t.currentSectionId, sectionId));
          return and(...conds);
        },
        orderBy: (t: any, { asc }: any) => [asc(t.currentRollNumber), asc(t.firstNameEn)],
      }),
      getUserRoleAndAllotments(db, currentUser),
    ]);

    if (!exam) return reply.status(404).send({ message: 'Exam not found' });
    if (!subject) return reply.status(404).send({ message: 'Subject not found' });

    // Fetch existing marks
    const studentIds = studentsList.map((s: any) => s.id);
    const existingMarks = studentIds.length > 0
      ? await db.query.examMarks.findMany({
          where: (t: any, { and, eq, inArray }: any) =>
            and(
              eq(t.schoolId, currentUser.schoolId),
              eq(t.examId, examId),
              eq(t.subjectId, subjectId),
              inArray(t.studentId, studentIds)
            ),
        })
      : [];

    const isAllotted = userContext.isAllAllowed || isSubjectAllottedToTeacher(userContext.allotments, classId, subjectId, sectionId);
    const hasSubmitted = existingMarks.some((m: any) => m.entryStatus === 'SUBMITTED');
    const entryStatus = hasSubmitted ? 'SUBMITTED' : (existingMarks.length > 0 ? 'DRAFT' : 'NOT_ENTERED');
    const isLockedForUser = Boolean(exam.isMarksLocked) || (!userContext.isAllAllowed && (hasSubmitted || !isAllotted));
    const canUnlock = Boolean(userContext.isAdmin && hasSubmitted);

    const marksMap = new Map<string, any>(existingMarks.map((m: any) => [m.studentId, m]));

    const entries = studentsList.map((st: any) => {
      const rec = marksMap.get(st.id);
      return {
        id: st.id,
        studentId: st.id,
        studentCode: st.studentId,
        admissionNo: st.admissionNo,
        rollNumber: st.currentRollNumber,
        firstNameEn: st.firstNameEn,
        lastNameEn: st.lastNameEn,
        firstNameNp: st.firstNameNp,
        lastNameNp: st.lastNameNp,
        fullNameEn: `${st.firstNameEn} ${st.lastNameEn || ''}`.trim(),
        fullNameNp: `${st.firstNameNp} ${st.lastNameNp || ''}`.trim(),
        gender: st.gender,
        theoryMarks: rec?.theoryMarks ?? null,
        practicalMarks: rec?.practicalMarks ?? null,
        casParticipation: rec?.casParticipation ?? null,
        casProjectPractical: rec?.casProjectPractical ?? null,
        casDiscipline: rec?.casDiscipline ?? null,
        casTerminalExam: rec?.casTerminalExam ?? null,
        isAbsent: rec?.isAbsent ?? false,
        remarks: rec?.remarks ?? '',
      };
    });

    return reply.send({
      exam,
      classInfo: cls,
      subject: {
        id: subject.id,
        code: subject.code,
        nameEn: subject.nameEn,
        nameNp: subject.nameNp,
        creditHours: subject.creditHours,
        theoryFullMarks: subject.theoryFullMarks,
        practicalFullMarks: subject.practicalFullMarks,
        theoryPassMarks: subject.theoryPassMarks,
        practicalPassMarks: subject.practicalPassMarks,
      },
      isLocked: exam.isMarksLocked,
      entryStatus,
      isLockedForUser,
      canUnlock,
      isAllotted,
      userRole: userContext.isAdmin ? 'ADMIN' : 'TEACHER',
      teacherName: userContext.teacherName,
      entries,
      students: entries,
    });
  });

  // 4. Save/Submit Marks (Single or Bulk, with CAS sub-components)
  fastify.post('/:id/marks', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const currentUserId = currentUser.userId || currentUser.id;
    const { id: examId } = request.params as { id: string };
    const { marks, subjectId: topSubjectId } = request.body as {
      subjectId?: string;
      marks: Array<{
        studentId: string;
        subjectId?: string;
        theoryMarks: number | null;
        practicalMarks: number | null;
        casParticipation?: number | null;
        casProjectPractical?: number | null;
        casDiscipline?: number | null;
        casTerminalExam?: number | null;
        isAbsent?: boolean;
        remarks?: string;
      }>;
    };

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return reply.status(400).send({ message: 'Marks array is required' });
    }

    const exam = await db.query.exams.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!exam) return reply.status(404).send({ message: 'Exam not found' });
    if (exam.isMarksLocked) {
      return reply.status(400).send({ message: 'यस परीक्षाको अंक लक भइसकेको छ। परिमार्जन गर्न सकिँदैन।' });
    }

    const userContext = await getUserRoleAndAllotments(db, currentUser);
    const effSubId = topSubjectId || (marks[0] && marks[0].subjectId);

    if (!effSubId) {
      return reply.status(400).send({ message: 'Subject ID is required' });
    }

    // Role allotment check & lock check
    if (!userContext.isAllAllowed) {
      const subjectRecord = await db.query.subjects.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, effSubId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (!subjectRecord) {
        return reply.status(404).send({ message: 'Subject not found' });
      }

      const isAllotted = isSubjectAllottedToTeacher(
        userContext.allotments,
        subjectRecord.classId,
        subjectRecord.id,
        subjectRecord.sectionId
      );
      if (!isAllotted) {
        return reply.status(403).send({
          message: 'तपाईंलाई यो विषयको प्राप्ताङ्क प्रविष्टि गर्ने अनुमति छैन। शिक्षकले आफूलाई बाँडफाँड गरिएको विषयको मात्र अंक चढाउन सक्नुहुन्छ।',
        });
      }

      // Check if already submitted
      const existingRecords = await db.query.examMarks.findMany({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.schoolId, currentUser.schoolId),
            eq(t.examId, examId),
            eq(t.subjectId, effSubId)
          ),
      });
      const alreadySubmitted = existingRecords.some((m: any) => m.entryStatus === 'SUBMITTED');
      if (alreadySubmitted) {
        return reply.status(403).send({
          message: 'यो विषयको प्राप्ताङ्क प्रविष्टि गरी बुझाइसकिएको छ (SUBMITTED)। शिक्षकले फेरि सम्पादन गर्न सक्नुहुन्न। परिमार्जन गर्न परेमा विद्यालय प्रशासन वा प्रधानाध्यापकसँग सम्पर्क गरी अनलक गराउनुहोस्।',
        });
      }
    }

    for (const item of marks) {
      const curSubId = item.subjectId || effSubId;
      if (!curSubId) continue;

      let effectivePractical = item.practicalMarks;
      // Auto-calculate practical marks if any CAS sub-component is present
      const hasCasData =
        (item.casParticipation !== undefined && item.casParticipation !== null) ||
        (item.casProjectPractical !== undefined && item.casProjectPractical !== null) ||
        (item.casDiscipline !== undefined && item.casDiscipline !== null) ||
        (item.casTerminalExam !== undefined && item.casTerminalExam !== null);

      if (hasCasData) {
        const sum =
          (Number(item.casParticipation) || 0) +
          (Number(item.casProjectPractical) || 0) +
          (Number(item.casDiscipline) || 0) +
          (Number(item.casTerminalExam) || 0);
        effectivePractical = sum;
      }

      const existing = await db.query.examMarks.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.schoolId, currentUser.schoolId),
            eq(t.examId, examId),
            eq(t.studentId, item.studentId),
            eq(t.subjectId, curSubId)
          ),
      });

      const parsedTheory = item.theoryMarks !== null && item.theoryMarks !== undefined && item.theoryMarks !== ('' as any)
        ? Number(item.theoryMarks)
        : null;
      const parsedPractical = effectivePractical !== null && effectivePractical !== undefined && effectivePractical !== ('' as any)
        ? Number(effectivePractical)
        : null;
      const parsedParticipation = item.casParticipation !== null && item.casParticipation !== undefined && item.casParticipation !== ('' as any)
        ? Number(item.casParticipation)
        : null;
      const parsedProject = item.casProjectPractical !== null && item.casProjectPractical !== undefined && item.casProjectPractical !== ('' as any)
        ? Number(item.casProjectPractical)
        : null;
      const parsedDiscipline = item.casDiscipline !== null && item.casDiscipline !== undefined && item.casDiscipline !== ('' as any)
        ? Number(item.casDiscipline)
        : null;
      const parsedTerminal = item.casTerminalExam !== null && item.casTerminalExam !== undefined && item.casTerminalExam !== ('' as any)
        ? Number(item.casTerminalExam)
        : null;

      if (existing) {
        await db
          .update(schema.examMarks)
          .set({
            theoryMarks: parsedTheory,
            practicalMarks: parsedPractical,
            casParticipation: parsedParticipation,
            casProjectPractical: parsedProject,
            casDiscipline: parsedDiscipline,
            casTerminalExam: parsedTerminal,
            isAbsent: item.isAbsent ?? false,
            entryStatus: 'SUBMITTED',
            remarks: item.remarks || null,
            recordedById: currentUserId,
            updatedAt: new Date(),
          })
          .where(eq(schema.examMarks.id, existing.id));
      } else {
        await db.insert(schema.examMarks).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          examId,
          studentId: item.studentId,
          subjectId: curSubId,
          theoryMarks: parsedTheory,
          practicalMarks: parsedPractical,
          casParticipation: parsedParticipation,
          casProjectPractical: parsedProject,
          casDiscipline: parsedDiscipline,
          casTerminalExam: parsedTerminal,
          isAbsent: item.isAbsent ?? false,
          entryStatus: 'SUBMITTED',
          remarks: item.remarks || null,
          recordedById: currentUserId,
        });
      }
    }

    return reply.send({
      message: 'अंकहरू तथा CAS उप-शीर्षकहरू सफलतापूर्वक सुरक्षित गरी बुझाइयो (SUBMITTED)।',
      count: marks.length,
      entryStatus: 'SUBMITTED',
    });
  });

  // 4b. Class 1-3 Continuous Assessment System (CAS) - Get Theme Ratings (Levels 1-4)
  fastify.get('/:id/cas-1-3', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, sectionId, subjectId } = request.query as {
      classId: string;
      sectionId?: string;
      subjectId?: string;
    };

    if (!classId) return reply.status(400).send({ message: 'classId is required' });

    const [exam, cls, allSubjects, allStudents, userContext] = await Promise.all([
      db.query.exams.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.classes.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, classId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.subjects.findMany({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.classId, classId)),
        orderBy: (t: any, { asc }: any) => [asc(t.code)],
      }),
      db.query.students.findMany({
        where: (t: any, { and, eq }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId), eq(t.currentClassId, classId)];
          if (sectionId && sectionId !== 'ALL') conds.push(eq(t.currentSectionId, sectionId));
          return and(...conds);
        },
        orderBy: (t: any, { asc }: any) => [asc(t.currentRollNumber), asc(t.firstNameEn)],
      }),
      getUserRoleAndAllotments(db, currentUser),
    ]);

    if (!exam) return reply.status(404).send({ message: 'Exam not found' });
    if (!cls) return reply.status(404).send({ message: 'Class not found' });

    const studentIds = allStudents.map((s: any) => s.id);
    const existingRatings = studentIds.length > 0
      ? await db.query.class1To3CasRatings.findMany({
          where: (t: any, { and, eq, inArray }: any) => {
            const conds = [
              eq(t.schoolId, currentUser.schoolId),
              eq(t.examId, examId),
              inArray(t.studentId, studentIds),
            ];
            if (subjectId) conds.push(eq(t.subjectId, subjectId));
            return and(...conds);
          },
        })
      : [];

    const isAllotted = userContext.isAllAllowed || (subjectId ? isSubjectAllottedToTeacher(userContext.allotments, classId, subjectId, sectionId) : true);
    const hasSubmitted = existingRatings.some((r: any) => r.entryStatus === 'SUBMITTED');
    const entryStatus = hasSubmitted ? 'SUBMITTED' : (existingRatings.length > 0 ? 'DRAFT' : 'NOT_ENTERED');
    const isLockedForUser = Boolean(exam.isMarksLocked) || (!userContext.isAllAllowed && (hasSubmitted || !isAllotted));
    const canUnlock = Boolean(userContext.isAdmin && hasSubmitted);

    const ratingsMap = new Map<string, any>();
    for (const r of existingRatings) {
      ratingsMap.set(`${r.studentId}_${r.subjectId}`, r);
    }

    const entries = allStudents.map((st: any) => {
      const rec = subjectId ? ratingsMap.get(`${st.id}_${subjectId}`) : null;
      return {
        studentId: st.id,
        studentCode: st.studentId,
        admissionNo: st.admissionNo,
        rollNumber: st.currentRollNumber,
        firstNameEn: st.firstNameEn,
        lastNameEn: st.lastNameEn,
        firstNameNp: st.firstNameNp,
        lastNameNp: st.lastNameNp,
        fullNameEn: `${st.firstNameEn} ${st.lastNameEn || ''}`.trim(),
        fullNameNp: `${st.firstNameNp} ${st.lastNameNp || ''}`.trim(),
        gender: st.gender,
        levelRating: rec?.levelRating ?? 3,
        achievementRemarks: rec?.achievementRemarks ?? 'अपेक्षित सिकाइ उपलब्धि हासिल गरेको',
        themeName: rec?.themeName ?? '',
      };
    });

    return reply.send({
      exam,
      classInfo: cls,
      subjects: allSubjects,
      entries,
      students: entries,
      isLocked: exam.isMarksLocked,
      entryStatus,
      isLockedForUser,
      canUnlock,
      isAllotted,
      userRole: userContext.isAdmin ? 'ADMIN' : 'TEACHER',
      teacherName: userContext.teacherName,
    });
  });

  // 4c. Class 1-3 Continuous Assessment System (CAS) - Save Theme Ratings (Levels 1-4)
  fastify.post('/:id/cas-1-3', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const currentUserId = currentUser.userId || currentUser.id;
    const { id: examId } = request.params as { id: string };
    const { ratings, subjectId: topSubjectId } = request.body as {
      subjectId?: string;
      ratings: Array<{
        studentId: string;
        subjectId?: string;
        levelRating: number; // 1, 2, 3, 4
        achievementRemarks?: string;
        themeName?: string;
      }>;
    };

    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      return reply.status(400).send({ message: 'Ratings array is required' });
    }

    const exam = await db.query.exams.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!exam) return reply.status(404).send({ message: 'Exam not found' });
    if (exam.isMarksLocked) {
      return reply.status(400).send({ message: 'यस परीक्षाको मूल्याङ्कन लक भइसकेको छ। परिमार्जन गर्न सकिँदैन।' });
    }

    const userContext = await getUserRoleAndAllotments(db, currentUser);
    const effSubId = topSubjectId || (ratings[0] && ratings[0].subjectId);

    if (!effSubId) {
      return reply.status(400).send({ message: 'Subject ID is required' });
    }

    // Role allotment check & lock check
    if (!userContext.isAllAllowed) {
      const subjectRecord = await db.query.subjects.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, effSubId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (!subjectRecord) {
        return reply.status(404).send({ message: 'Subject not found' });
      }

      const isAllotted = isSubjectAllottedToTeacher(
        userContext.allotments,
        subjectRecord.classId,
        subjectRecord.id,
        subjectRecord.sectionId
      );
      if (!isAllotted) {
        return reply.status(403).send({
          message: 'तपाईंलाई यो विषयको मूल्याङ्कन प्रविष्टि गर्ने अनुमति छैन। केवल बाँडफाँड गरिएका विषयको मात्र मूल्याङ्कन गर्न पाइन्छ।',
        });
      }

      const existingRecords = await db.query.class1To3CasRatings.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.examId, examId), eq(t.subjectId, effSubId)),
      });
      const alreadySubmitted = existingRecords.some((r: any) => r.entryStatus === 'SUBMITTED');
      if (alreadySubmitted) {
        return reply.status(403).send({
          message: 'यो विषयको मूल्याङ्कन बुझाइसकिएको छ (SUBMITTED)। शिक्षकले फेरि सम्पादन गर्न सक्नुहुन्न। परिमार्जन गर्न परेमा विद्यालय प्रशासन वा प्रधानाध्यापकसँग सम्पर्क गर्नुहोस्।',
        });
      }
    }

    for (const item of ratings) {
      const curSubId = item.subjectId || effSubId;
      if (!curSubId) continue;

      const validLevel = [1, 2, 3, 4].includes(Number(item.levelRating)) ? Number(item.levelRating) : 3;

      const existing = await db.query.class1To3CasRatings.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.schoolId, currentUser.schoolId),
            eq(t.examId, examId),
            eq(t.studentId, item.studentId),
            eq(t.subjectId, curSubId)
          ),
      });

      if (existing) {
        await db
          .update(schema.class1To3CasRatings)
          .set({
            levelRating: validLevel,
            achievementRemarks: item.achievementRemarks || null,
            themeName: item.themeName || null,
            entryStatus: 'SUBMITTED',
            recordedById: currentUserId,
            updatedAt: new Date(),
          })
          .where(eq(schema.class1To3CasRatings.id, existing.id));
      } else {
        await db.insert(schema.class1To3CasRatings).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          examId,
          studentId: item.studentId,
          subjectId: curSubId,
          levelRating: validLevel,
          achievementRemarks: item.achievementRemarks || null,
          themeName: item.themeName || null,
          entryStatus: 'SUBMITTED',
          recordedById: currentUserId,
        });
      }
    }

    return reply.send({
      message: 'कक्षा १-३ को मूल्याङ्कन सफलतापूर्वक सुरक्षित गरी बुझाइयो (SUBMITTED)।',
      count: ratings.length,
      entryStatus: 'SUBMITTED',
    });
  });

  // 4d. Unlock Marks for Teacher Editing (Admin / Principal Only)
  fastify.post('/:id/marks/unlock', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { subjectId } = request.body as { subjectId: string };

    const userContext = await getUserRoleAndAllotments(db, currentUser);
    if (!userContext.isAdmin) {
      return reply.status(403).send({
        message: 'प्राप्ताङ्क अनलक गर्ने अधिकार विद्यालय प्रशासन वा प्रधानाध्यापकलाई मात्र छ।',
      });
    }

    if (!subjectId) {
      return reply.status(400).send({ message: 'subjectId is required' });
    }

    await db
      .update(schema.examMarks)
      .set({ entryStatus: 'DRAFT', updatedAt: new Date() })
      .where(
        and(
          eq(schema.examMarks.schoolId, currentUser.schoolId),
          eq(schema.examMarks.examId, examId),
          eq(schema.examMarks.subjectId, subjectId)
        )
      );

    await db
      .update(schema.class1To3CasRatings)
      .set({ entryStatus: 'DRAFT', updatedAt: new Date() })
      .where(
        and(
          eq(schema.class1To3CasRatings.schoolId, currentUser.schoolId),
          eq(schema.class1To3CasRatings.examId, examId),
          eq(schema.class1To3CasRatings.subjectId, subjectId)
        )
      );

    return reply.send({
      message: 'यो विषयको प्राप्ताङ्क पुनः सम्पादनका लागि शिक्षकलाई सफलतापूर्वक अनलक गरियो (Reset to DRAFT)।',
      entryStatus: 'DRAFT',
    });
  });

  // 5. Lock / Unlock Marks for an Exam
  fastify.post('/:id/lock', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const { isLocked } = request.body as { isLocked: boolean };

    await db
      .update(schema.exams)
      .set({ isMarksLocked: !!isLocked })
      .where(and(eq(schema.exams.id, id), eq(schema.exams.schoolId, currentUser.schoolId)));

    return reply.send({
      message: isLocked ? 'परीक्षाको अंक लक गरियो' : 'परीक्षाको अंक अनलक गरियो',
      isMarksLocked: !!isLocked,
    });
  });

  // 6. Generate Complete Evaluation Ledger (Tabulation Sheet) for Class & Section
  fastify.get('/:id/ledger', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, sectionId } = request.query as { classId: string; sectionId?: string };

    if (!classId) return reply.status(400).send({ message: 'classId is required' });

    const [exam, cls, sec, allSubjects, allStudents] = await Promise.all([
      db.query.exams.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.classes.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, classId), eq(t.schoolId, currentUser.schoolId)),
      }),
      sectionId && sectionId !== 'ALL'
        ? db.query.sections.findFirst({
            where: (t: any, { and, eq }: any) => and(eq(t.id, sectionId), eq(t.schoolId, currentUser.schoolId)),
          })
        : null,
      db.query.subjects.findMany({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.classId, classId)),
        orderBy: (t: any, { asc }: any) => [asc(t.code)],
      }),
      db.query.students.findMany({
        where: (t: any, { and, eq }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId), eq(t.currentClassId, classId)];
          if (sectionId && sectionId !== 'ALL') conds.push(eq(t.currentSectionId, sectionId));
          return and(...conds);
        },
        orderBy: (t: any, { asc }: any) => [asc(t.currentRollNumber), asc(t.firstNameEn)],
      }),
    ]);

    if (!exam) return reply.status(404).send({ message: 'Exam not found' });
    if (!cls) return reply.status(404).send({ message: 'Class not found' });

    const isClass1To3 = cls && ['ECD', '1', '2', '3'].includes(cls.code);

    // ================= CLASS 1-3 INTEGRATED CAS LEDGER =================
    if (isClass1To3) {
      const studentIds = allStudents.map((s: any) => s.id);
      const allRatings = studentIds.length > 0
        ? await db.query.class1To3CasRatings.findMany({
            where: (t: any, { and, eq, inArray }: any) =>
              and(
                eq(t.schoolId, currentUser.schoolId),
                eq(t.examId, examId),
                inArray(t.studentId, studentIds)
              ),
          })
        : [];

      const ratingLookup = new Map<string, any>();
      for (const r of allRatings) {
        ratingLookup.set(`${r.studentId}_${r.subjectId}`, r);
      }

      const rows = allStudents.map((st: any) => {
        const subjectBreakdown = allSubjects.map((sub: any) => {
          const rec = ratingLookup.get(`${st.id}_${sub.id}`);
          const lvl = rec?.levelRating ?? 3;
          const levelLabels: Record<number, string> = {
            4: 'स्तर ४ (धेरै राम्रो)',
            3: 'स्तर ३ (राम्रो)',
            2: 'स्तर २ (सामान्य)',
            1: 'स्तर १ (कमजोर)',
          };

          return {
            subjectId: sub.id,
            code: sub.code,
            nameEn: sub.nameEn,
            nameNp: sub.nameNp,
            creditHours: sub.creditHours || 4,
            levelRating: lvl,
            levelText: levelLabels[lvl] || 'स्तर ३ (राम्रो)',
            remarks: rec?.achievementRemarks || 'अपेक्षित सिकाइ उपलब्धि हासिल',
            themeName: rec?.themeName || '',
          };
        });

        return {
          studentId: st.id,
          admissionNo: st.admissionNo,
          rollNumber: st.currentRollNumber,
          fullNameEn: `${st.firstNameEn} ${st.lastNameEn || ''}`.trim(),
          fullNameNp: `${st.firstNameNp} ${st.lastNameNp || ''}`.trim(),
          studentNameNp: `${st.firstNameNp} ${st.lastNameNp || ''}`.trim(),
          studentNameEn: `${st.firstNameEn} ${st.lastNameEn || ''}`.trim(),
          gender: st.gender,
          subjects: subjectBreakdown,
          marks: Object.fromEntries(subjectBreakdown.map((s: any) => [s.subjectId, s])),
          totalMarks: '—',
          percentage: '—',
          status: 'PASSED',
          resultStatus: 'PASSED',
          gpa: '—',
          isIntegratedCas: true,
        };
      });

      return reply.send({
        exam,
        classInfo: cls,
        sectionInfo: sec,
        isIntegratedCas: true,
        subjects: allSubjects.map((s: any) => ({
          id: s.id,
          code: s.code,
          nameEn: s.nameEn,
          nameNp: s.nameNp,
          creditHours: s.creditHours || 4,
        })),
        statistics: {
          totalStudents: allStudents.length,
          passedCount: allStudents.length,
          ngCount: 0,
          averageGpa: 0,
          highestGpa: 0,
        },
        totalStudents: allStudents.length,
        passedCount: allStudents.length,
        ngCount: 0,
        averageGpa: 0,
        highestGpa: 0,
        rows,
        ledger: rows,
      });
    }

    // ================= CLASS 4-12 LETTER GRADING 2078 LEDGER =================
    // Fetch all marks for these students in this exam
    const studentIds = allStudents.map((s: any) => s.id);
    const allMarks = studentIds.length > 0
      ? await db.query.examMarks.findMany({
          where: (t: any, { and, eq, inArray }: any) =>
            and(
              eq(t.schoolId, currentUser.schoolId),
              eq(t.examId, examId),
              inArray(t.studentId, studentIds)
            ),
        })
      : [];

    const marksLookup = new Map<string, any>();
    for (const m of allMarks) {
      marksLookup.set(`${m.studentId}_${m.subjectId}`, m);
    }

    // Build Tabulation Rows for each student
    let totalClassGpa = 0;
    let passedCount = 0;
    let ngCount = 0;

    const rows = allStudents.map((st: any) => {
      let totalWeightedGp = 0;
      let totalCreditHours = 0;
      let hasNg = false;
      let totalObtainedMarks = 0;
      let totalFullMarks = 0;

      const subjectBreakdown = allSubjects.map((sub: any) => {
        const mark = marksLookup.get(`${st.id}_${sub.id}`);
        const thMarks = mark?.theoryMarks ?? null;
        const prMarks = mark?.practicalMarks ?? null;
        const isAbsent = mark?.isAbsent ?? false;

        const thFull = sub.theoryFullMarks || 75;
        const prFull = sub.practicalFullMarks || 25;
        const thPass = sub.theoryPassMarks || Math.round(thFull * 0.35);
        const prPass = sub.practicalPassMarks || Math.round(prFull * 0.4);

        let thGrade = 'NG';
        let prGrade = prFull > 0 ? 'NG' : '—';
        let subGrade = 'NG';
        let subGp = 0.0;

        if (isAbsent) {
          thGrade = 'ABS';
          prGrade = prFull > 0 ? 'ABS' : '—';
          subGrade = 'NG';
          hasNg = true;
        } else if (thMarks !== null) {
          const thPct = (thMarks / thFull) * 100;
          thGrade = thMarks >= thPass ? calculateGrade2078(thPct).grade : 'NG';

          let prPassed = true;
          if (prFull > 0) {
            if (prMarks !== null) {
              const prPct = (prMarks / prFull) * 100;
              prGrade = prMarks >= prPass ? calculateGrade2078(prPct).grade : 'NG';
              if (prMarks < prPass) prPassed = false;
            } else {
              prGrade = 'NG';
              prPassed = false;
            }
          }

          if (thMarks >= thPass && prPassed) {
            const totMarks = thMarks + (prMarks || 0);
            const totFull = thFull + prFull;
            const overallPct = (totMarks / totFull) * 100;
            const res = calculateGrade2078(overallPct);
            subGrade = res.grade;
            subGp = res.gradePoint;
            totalObtainedMarks += totMarks;
          } else {
            subGrade = 'NG';
            subGp = 0.0;
            hasNg = true;
          }
          totalFullMarks += thFull + prFull;
        } else {
          subGrade = '—';
        }

        const cr = sub.creditHours || 4;
        totalCreditHours += cr;
        totalWeightedGp += subGp * cr;

        return {
          subjectId: sub.id,
          code: sub.code,
          nameEn: sub.nameEn,
          nameNp: sub.nameNp,
          creditHours: cr,
          thMarks,
          prMarks,
          casParticipation: mark?.casParticipation ?? null,
          casProjectPractical: mark?.casProjectPractical ?? null,
          casDiscipline: mark?.casDiscipline ?? null,
          casTerminalExam: mark?.casTerminalExam ?? null,
          thGrade,
          prGrade,
          finalGrade: subGrade,
          gradePoint: subGp,
        };
      });

      const gpa = totalCreditHours > 0 ? Number((totalWeightedGp / totalCreditHours).toFixed(2)) : 0;
      const finalStatus = hasNg ? 'NG' : gpa >= 1.6 ? 'PASSED' : 'NG';

      if (finalStatus === 'PASSED') {
        passedCount++;
        totalClassGpa += gpa;
      } else {
        ngCount++;
      }

      return {
        studentId: st.id,
        admissionNo: st.admissionNo,
        rollNumber: st.currentRollNumber,
        fullNameEn: `${st.firstNameEn} ${st.lastNameEn || ''}`.trim(),
        fullNameNp: `${st.firstNameNp} ${st.lastNameNp || ''}`.trim(),
        gender: st.gender,
        subjects: subjectBreakdown,
        totalObtainedMarks,
        totalFullMarks,
        percentage: totalFullMarks > 0 ? Number(((totalObtainedMarks / totalFullMarks) * 100).toFixed(1)) : 0,
        gpa: hasNg ? 'NG' : gpa.toFixed(2),
        status: finalStatus,
      };
    });

    const averageGpa = passedCount > 0 ? Number((totalClassGpa / passedCount).toFixed(2)) : 0;
    const highestGpa = rows.reduce((max: number, r: any) => {
      const g = parseFloat(r.gpa);
      return !isNaN(g) && g > max ? g : max;
    }, 0);

    const statistics = {
      totalStudents: allStudents.length,
      passedCount,
      ngCount,
      averageGpa,
      highestGpa,
    };

    const ledger = rows.map((r: any) => ({
      ...r,
      studentNameNp: r.fullNameNp,
      studentNameEn: r.fullNameEn,
      totalMarks: r.totalObtainedMarks,
      resultStatus: r.status,
      marks: Object.fromEntries(
        r.subjects.map((s: any) => [
          s.subjectId,
          {
            theory: s.thMarks,
            practical: s.prMarks,
            total: (s.thMarks || 0) + (s.prMarks || 0),
            grade: s.finalGrade,
            point: s.gradePoint,
          },
        ])
      ),
    }));

    return reply.send({
      exam,
      classInfo: cls,
      sectionInfo: sec,
      subjects: allSubjects.map((s: any) => ({
        id: s.id,
        code: s.code,
        nameEn: s.nameEn,
        nameNp: s.nameNp,
        creditHours: s.creditHours,
        thFull: s.theoryFullMarks,
        prFull: s.practicalFullMarks,
      })),
      statistics,
      totalStudents: allStudents.length,
      passedCount,
      ngCount,
      averageGpa,
      highestGpa,
      rows,
      ledger,
    });
  });

  // 7. Get Official CDC Grade Sheet / Report Card for a Student
  fastify.get('/:id/gradesheet/:studentId', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId, studentId } = request.params as { id: string; studentId: string };

    const [exam, school, student] = await Promise.all([
      db.query.exams.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.schools.findFirst({ where: (t: any, { eq }: any) => eq(t.id, currentUser.schoolId) }),
      db.query.students.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, studentId), eq(t.schoolId, currentUser.schoolId)),
      }),
    ]);

    if (!exam || !student) {
      return reply.status(404).send({ message: 'Exam or student not found' });
    }

    const [cls, sec, allSubjects, marksList, attendanceRecords] = await Promise.all([
      db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentClassId) }),
      student.currentSectionId
        ? db.query.sections.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentSectionId) })
        : null,
      db.query.subjects.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.classId, student.currentClassId)),
        orderBy: (t: any, { asc }: any) => [asc(t.code)],
      }),
      db.query.examMarks.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.examId, examId), eq(t.studentId, studentId)),
      }),
      db.query.studentAttendance.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.studentId, studentId)),
      }),
    ]);

    const isClass1To3 = cls && ['ECD', '1', '2', '3'].includes(cls.code);

    // ================= CLASS 1-3 INTEGRATED CAS REPORT CARD =================
    if (isClass1To3) {
      const studentRatings = await db.query.class1To3CasRatings.findMany({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.schoolId, currentUser.schoolId),
            eq(t.examId, examId),
            eq(t.studentId, studentId)
          ),
      });

      const ratingMap = new Map<string, any>(studentRatings.map((r: any) => [r.subjectId, r]));

      const levelConfig: Record<number, { text: string; textNp: string; desc: string }> = {
        4: { text: 'Level 4 (Advanced)', textNp: 'स्तर ४ (धेरै राम्रो)', desc: 'उत्कृष्ट सिकाइ उपलब्धि हासिल गरेको' },
        3: { text: 'Level 3 (Proficient)', textNp: 'स्तर ३ (राम्रो)', desc: 'अपेक्षित सिकाइ उपलब्धि हासिल गरेको' },
        2: { text: 'Level 2 (Basic)', textNp: 'स्तर २ (सामान्य)', desc: 'आधारभूत उपलब्धि हासिल, सुधारको सम्भावना' },
        1: { text: 'Level 1 (Below Basic)', textNp: 'स्तर १ (कमजोर)', desc: 'विशेष सहयोग र थप अभ्यास आवश्यक' },
      };

      const integratedSubjects = allSubjects.map((sub: any) => {
        const rec = ratingMap.get(sub.id);
        const lvl = rec?.levelRating ?? 3;
        const meta = levelConfig[lvl] || levelConfig[3];
        return {
          code: sub.code,
          nameEn: sub.nameEn,
          nameNp: sub.nameNp,
          creditHours: sub.creditHours || 4,
          levelRating: lvl,
          levelTextEn: meta.text,
          levelTextNp: meta.textNp,
          achievementRemarks: rec?.achievementRemarks || meta.desc,
          themeName: rec?.themeName || '',
          finalGrade: `L${lvl}`,
          gradePoint: lvl,
        };
      });

      const totalWorkingDays = attendanceRecords.length || 65;
      const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length || totalWorkingDays;

      return reply.send({
        school,
        exam,
        student: {
          id: student.id,
          studentId: student.studentId,
          admissionNo: student.admissionNo,
          rollNumber: student.currentRollNumber,
          firstNameEn: student.firstNameEn,
          lastNameEn: student.lastNameEn,
          firstNameNp: student.firstNameNp,
          lastNameNp: student.lastNameNp,
          fullNameEn: `${student.firstNameEn} ${student.lastNameEn || ''}`.trim(),
          fullNameNp: `${student.firstNameNp} ${student.lastNameNp || ''}`.trim(),
          dobBs: student.dobBs,
          dobAd: student.dobAd,
          fatherNameEn: student.fatherNameEn,
          fatherNameNp: student.fatherNameNp,
          motherNameEn: student.motherNameEn,
          motherNameNp: student.motherNameNp,
          gender: student.gender,
          classNameEn: cls?.nameEn || 'Class',
          classNameNp: cls?.nameNp || 'कक्षा',
          sectionCode: sec?.code || 'A',
          sectionNameNp: sec?.nameNp || 'खण्ड क',
          photoUrl: student.photoUrl || null,
        },
        class: cls,
        section: sec,
        isIntegratedCas: true,
        attendance: {
          totalWorkingDays,
          presentDays,
          attendanceRate: Math.round((presentDays / totalWorkingDays) * 100),
        },
        subjects: integratedSubjects,
        subjectRecords: integratedSubjects.map((s: any) => ({
          ...s,
          subjectCode: s.code,
          subjectNameEn: s.nameEn,
          subjectNameNp: s.nameNp,
        })),
        totalCreditHours: allSubjects.reduce((sum: number, s: any) => sum + (s.creditHours || 4), 0),
        gpa: '—',
        isPassed: true,
        resultStatus: 'PASSED',
        resultRemarks: 'एकीकृत पाठ्यक्रम निरन्तर विद्यार्थी मूल्याङ्कन (CAS) अनुसार सफल',
      });
    }

    // ================= CLASS 4-12 LETTER GRADING 2078 REPORT CARD =================
    const marksMap = new Map<string, any>(marksList.map((m: any) => [m.subjectId, m]));

    let totalCreditHours = 0;
    let totalWeightedGp = 0;
    let hasNg = false;

    const subjectsReport = allSubjects.map((sub: any) => {
      const mark = marksMap.get(sub.id);
      const thMarks = mark?.theoryMarks ?? null;
      const prMarks = mark?.practicalMarks ?? null;
      const isAbsent = mark?.isAbsent ?? false;

      const thFull = sub.theoryFullMarks || 75;
      const prFull = sub.practicalFullMarks || 25;
      const thPass = sub.theoryPassMarks || Math.round(thFull * 0.35);
      const prPass = sub.practicalPassMarks || Math.round(prFull * 0.4);

      let thGrade = 'NG';
      let prGrade = prFull > 0 ? 'NG' : '—';
      let finalGrade = 'NG';
      let gradePoint = 0.0;
      let remark = 'Non-Graded';

      if (isAbsent) {
        thGrade = 'ABS';
        prGrade = prFull > 0 ? 'ABS' : '—';
        finalGrade = 'NG';
        hasNg = true;
      } else if (thMarks !== null) {
        const thPct = (thMarks / thFull) * 100;
        thGrade = thMarks >= thPass ? calculateGrade2078(thPct).grade : 'NG';

        let prPassed = true;
        if (prFull > 0) {
          if (prMarks !== null) {
            const prPct = (prMarks / prFull) * 100;
            prGrade = prMarks >= prPass ? calculateGrade2078(prPct).grade : 'NG';
            if (prMarks < prPass) prPassed = false;
          } else {
            prGrade = 'NG';
            prPassed = false;
          }
        }

        if (thMarks >= thPass && prPassed) {
          const totMarks = thMarks + (prMarks || 0);
          const totFull = thFull + prFull;
          const overallPct = (totMarks / totFull) * 100;
          const res = calculateGrade2078(overallPct);
          finalGrade = res.grade;
          gradePoint = res.gradePoint;
          remark = res.remark;
        } else {
          finalGrade = 'NG';
          gradePoint = 0.0;
          remark = 'Non-Graded';
          hasNg = true;
        }
      }

      const cr = sub.creditHours || 4;
      totalCreditHours += cr;
      totalWeightedGp += gradePoint * cr;

      return {
        code: sub.code,
        nameEn: sub.nameEn,
        nameNp: sub.nameNp,
        creditHours: cr,
        theoryMarks: thMarks,
        practicalMarks: prMarks,
        casParticipation: mark?.casParticipation ?? null,
        casProjectPractical: mark?.casProjectPractical ?? null,
        casDiscipline: mark?.casDiscipline ?? null,
        casTerminalExam: mark?.casTerminalExam ?? null,
        theoryGrade: thGrade,
        practicalGrade: prGrade,
        finalGrade,
        gradePoint,
        remark,
      };
    });

    const gpa = totalCreditHours > 0 ? Number((totalWeightedGp / totalCreditHours).toFixed(2)) : 0;
    const finalGpaString = hasNg ? 'NG' : gpa.toFixed(2);

    // Attendance stats
    const totalWorkingDays = attendanceRecords.length || 65;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length || totalWorkingDays;

    return reply.send({
      school,
      exam,
      student: {
        id: student.id,
        studentId: student.studentId,
        admissionNo: student.admissionNo,
        rollNumber: student.currentRollNumber,
        firstNameEn: student.firstNameEn,
        lastNameEn: student.lastNameEn,
        firstNameNp: student.firstNameNp,
        lastNameNp: student.lastNameNp,
        fullNameEn: `${student.firstNameEn} ${student.lastNameEn || ''}`.trim(),
        fullNameNp: `${student.firstNameNp} ${student.lastNameNp || ''}`.trim(),
        dobBs: student.dobBs,
        dobAd: student.dobAd,
        fatherNameEn: student.fatherNameEn,
        fatherNameNp: student.fatherNameNp,
        motherNameEn: student.motherNameEn,
        motherNameNp: student.motherNameNp,
        gender: student.gender,
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        sectionCode: sec?.code || 'A',
        sectionNameNp: sec?.nameNp || 'खण्ड क',
        photoUrl: student.photoUrl || null,
      },
      class: cls,
      section: sec,
      attendance: {
        totalWorkingDays,
        presentDays,
        attendanceRate: Math.round((presentDays / totalWorkingDays) * 100),
      },
      subjects: subjectsReport,
      subjectRecords: subjectsReport.map((s: any) => ({
        ...s,
        subjectCode: s.code,
        subjectNameEn: s.nameEn,
        subjectNameNp: s.nameNp,
      })),
      totalCreditHours,
      gpa: finalGpaString,
      isPassed: !hasNg,
      resultStatus: !hasNg ? 'PASSED' : 'NG',
      resultRemarks: hasNg
        ? 'अनुत्तीर्ण (Non-Graded): पुनः परीक्षा (Grade Increment Exam) मा सहभागी हुनुपर्नेछ।'
        : gpa >= 3.6
        ? 'उत्कृष्ट नतिजा (Outstanding Performance)'
        : gpa >= 2.8
        ? 'राम्रो नतिजा (Good Performance)'
        : 'सन्तोषजनक (Satisfactory)',
    });
  });

  // 10. Get Exam Applications List & Summary (Auto-syncs examinees)
  fastify.get('/:id/applications', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, sectionId, status, search } = request.query as {
      classId?: string;
      sectionId?: string;
      status?: string;
      search?: string;
    };

    const exam = await db.query.exams.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
    });
    if (!exam) return reply.status(404).send({ message: 'Exam not found' });

    const [allClasses, allSections] = await Promise.all([
      db.query.classes.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.displayOrder)],
      }),
      db.query.sections.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
    ]);

    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(allSections.map((s: any) => [s.id, s]));

    // Query active students in scope
    const studentsList = await db.query.students.findMany({
      where: (t: any, { and, eq }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId), eq(t.status, 'ACTIVE')];
        if (classId && classId !== 'ALL') conds.push(eq(t.currentClassId, classId));
        if (sectionId && sectionId !== 'ALL') conds.push(eq(t.currentSectionId, sectionId));
        return and(...conds);
      },
      orderBy: (t: any, { asc }: any) => [asc(t.currentRollNumber), asc(t.firstNameEn)],
    });

    // Query existing applications
    const existingApps = await db.query.examApplications.findMany({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.schoolId, currentUser.schoolId), eq(t.examId, examId)),
    });
    const appMap = new Map<string, any>(existingApps.map((a: any) => [a.studentId, a]));

    const examYearBs = exam.startDateBs ? exam.startDateBs.slice(0, 4) : '2083';

    // Auto-sync missing student applications
    for (const st of studentsList) {
      if (!appMap.has(st.id)) {
        const clsObj = classMap.get(st.currentClassId);
        const clsCode = clsObj?.code || '10';
        const rollStr = String(st.currentRollNumber || 1).padStart(3, '0');
        const defaultSymbol = `${examYearBs}-${clsCode}-${rollStr}`;
        const newAppId = crypto.randomUUID();

        await db.insert(schema.examApplications).values({
          id: newAppId,
          schoolId: currentUser.schoolId,
          examId,
          studentId: st.id,
          classId: st.currentClassId,
          sectionId: st.currentSectionId || null,
          rollNumber: st.currentRollNumber,
          symbolNumber: defaultSymbol,
          applicationStatus: 'APPROVED',
          admitCardPrintCount: 0,
        });

        appMap.set(st.id, {
          id: newAppId,
          schoolId: currentUser.schoolId,
          examId,
          studentId: st.id,
          classId: st.currentClassId,
          sectionId: st.currentSectionId || null,
          rollNumber: st.currentRollNumber,
          symbolNumber: defaultSymbol,
          applicationStatus: 'APPROVED',
          admitCardPrintCount: 0,
        });
      }
    }

    // Re-fetch all applications for accurate listing
    const allApps = await db.query.examApplications.findMany({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.schoolId, currentUser.schoolId), eq(t.examId, examId)),
    });

    const studentMap = new Map<string, any>(studentsList.map((s: any) => [s.id, s]));

    // Format examinees list
    let applications = allApps
      .map((app: any) => {
        const st = studentMap.get(app.studentId);
        if (!st && classId && classId !== 'ALL') return null; // Outside query filter
        const cls = classMap.get(app.classId || st?.currentClassId);
        const sec = sectionMap.get(app.sectionId || st?.currentSectionId);

        return {
          id: app.id,
          examId: app.examId,
          studentId: app.studentId,
          studentCode: st?.studentId || '',
          admissionNo: st?.admissionNo || '',
          rollNumber: app.rollNumber || st?.currentRollNumber || null,
          symbolNumber: app.symbolNumber || '',
          applicationStatus: app.applicationStatus || 'APPROVED',
          admitCardPrintCount: app.admitCardPrintCount || 0,
          approvedAt: app.approvedAt,
          remarks: app.remarks || '',
          fullNameEn: st ? `${st.firstNameEn} ${st.lastNameEn || ''}`.trim() : 'Unknown',
          fullNameNp: st ? `${st.firstNameNp} ${st.lastNameNp || ''}`.trim() : 'अज्ञात',
          gender: st?.gender || 'OTHER',
          dobBs: st?.dobBs || '',
          photoUrl: st?.photoUrl || null,
          classId: app.classId || st?.currentClassId,
          classNameEn: cls?.nameEn || 'Class',
          classNameNp: cls?.nameNp || 'कक्षा',
          classCode: cls?.code || '',
          sectionId: app.sectionId || st?.currentSectionId,
          sectionCode: sec?.code || 'A',
          sectionNameNp: sec?.nameNp || 'खण्ड क',
        };
      })
      .filter(Boolean);

    // Apply query filters
    if (classId && classId !== 'ALL') {
      applications = applications.filter((a: any) => a.classId === classId);
    }
    if (sectionId && sectionId !== 'ALL') {
      applications = applications.filter((a: any) => a.sectionId === sectionId);
    }
    if (status && status !== 'ALL') {
      applications = applications.filter((a: any) => a.applicationStatus === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      applications = applications.filter(
        (a: any) =>
          a.fullNameEn.toLowerCase().includes(q) ||
          a.fullNameNp.toLowerCase().includes(q) ||
          a.symbolNumber.toLowerCase().includes(q) ||
          (a.rollNumber && String(a.rollNumber).includes(q))
      );
    }

    // Sort by roll number, then name
    applications.sort((a: any, b: any) => {
      const rA = a.rollNumber || 9999;
      const rB = b.rollNumber || 9999;
      if (rA !== rB) return rA - rB;
      return a.fullNameEn.localeCompare(b.fullNameEn);
    });

    // Summary counts for this exam
    const totalCount = allApps.length;
    const approvedCount = allApps.filter((a: any) => a.applicationStatus === 'APPROVED').length;
    const pendingCount = allApps.filter((a: any) => a.applicationStatus === 'PENDING').length;
    const rejectedCount = allApps.filter((a: any) => a.applicationStatus === 'REJECTED').length;
    const printedCount = allApps.filter((a: any) => (a.admitCardPrintCount || 0) > 0).length;

    return reply.send({
      exam,
      applications,
      summary: {
        totalCount,
        approvedCount,
        pendingCount,
        rejectedCount,
        printedCount,
      },
    });
  });

  // 11. Update Application Status (Bulk or Single: APPROVED / PENDING / REJECTED)
  fastify.post('/:id/applications/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const currentUserId = currentUser.userId || currentUser.id;
    const { id: examId } = request.params as { id: string };
    const { applicationIds, status, remarks } = request.body as {
      applicationIds: string[];
      status: 'APPROVED' | 'PENDING' | 'REJECTED';
      remarks?: string;
    };

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return reply.status(400).send({ message: 'applicationIds array is required' });
    }
    if (!['APPROVED', 'PENDING', 'REJECTED'].includes(status)) {
      return reply.status(400).send({ message: 'Valid status (APPROVED, PENDING, REJECTED) is required' });
    }

    await db
      .update(schema.examApplications)
      .set({
        applicationStatus: status,
        approvedById: status === 'APPROVED' ? currentUserId : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        remarks: remarks || null,
      })
      .where(
        and(
          eq(schema.examApplications.schoolId, currentUser.schoolId),
          eq(schema.examApplications.examId, examId),
          inArray(schema.examApplications.id, applicationIds)
        )
      );

    return reply.send({
      message: `आवेदन फाराम स्थिति सफलतापूर्वक '${status}' मा अद्यावधिक गरियो।`,
      count: applicationIds.length,
      status,
    });
  });

  // 12. Auto-Generate Sequential Symbol Numbers for Examinees
  fastify.post('/:id/applications/generate-symbols', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, prefix, startFrom, padLength } = request.body as {
      classId?: string;
      prefix?: string;
      startFrom?: number;
      padLength?: number;
    };

    const exam = await db.query.exams.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
    });
    if (!exam) return reply.status(404).send({ message: 'Exam not found' });

    const apps = await db.query.examApplications.findMany({
      where: (t: any, { and, eq }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId), eq(t.examId, examId)];
        if (classId && classId !== 'ALL') conds.push(eq(t.classId, classId));
        return and(...conds);
      },
      orderBy: (t: any, { asc }: any) => [asc(t.rollNumber)],
    });

    const examYearBs = exam.startDateBs ? exam.startDateBs.slice(0, 4) : '2083';
    let seq = Number(startFrom) || 1001;
    const padding = Number(padLength) || 4;

    for (const app of apps) {
      const effPrefix = prefix || `${examYearBs}-`;
      const symbolNum = `${effPrefix}${String(seq).padStart(padding, '0')}`;

      await db
        .update(schema.examApplications)
        .set({ symbolNumber: symbolNum })
        .where(eq(schema.examApplications.id, app.id));

      seq++;
    }

    return reply.send({
      message: 'सिम्बोल नम्बरहरू सफलतापूर्वक क्रमबद्ध रूपमा जारी गरियो।',
      updatedCount: apps.length,
    });
  });

  // 13. Get Admit Cards Data (For Printing Approved Examinees)
  fastify.get('/:id/admit-cards', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { classId, sectionId, studentId } = request.query as {
      classId?: string;
      sectionId?: string;
      studentId?: string;
    };

    const [school, exam, allClasses, allSections, allSubjects] = await Promise.all([
      db.query.schools.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, currentUser.schoolId),
      }),
      db.query.exams.findFirst({
        where: (t: any, { and, eq }: any) => and(eq(t.id, examId), eq(t.schoolId, currentUser.schoolId)),
      }),
      db.query.classes.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
      db.query.sections.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
      db.query.subjects.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.code)],
      }),
    ]);

    if (!school) return reply.status(404).send({ message: 'School not found' });
    if (!exam) return reply.status(404).send({ message: 'Exam not found' });

    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(allSections.map((s: any) => [s.id, s]));

    // Query approved exam applications
    const apps = await db.query.examApplications.findMany({
      where: (t: any, { and, eq }: any) => {
        const conds = [
          eq(t.schoolId, currentUser.schoolId),
          eq(t.examId, examId),
          eq(t.applicationStatus, 'APPROVED'),
        ];
        if (classId && classId !== 'ALL') conds.push(eq(t.classId, classId));
        if (sectionId && sectionId !== 'ALL') conds.push(eq(t.sectionId, sectionId));
        if (studentId) conds.push(eq(t.studentId, studentId));
        return and(...conds);
      },
      orderBy: (t: any, { asc }: any) => [asc(t.rollNumber)],
    });

    const appStudentIds = apps.map((a: any) => a.studentId);
    const studentsList = appStudentIds.length > 0
      ? await db.query.students.findMany({
          where: (t: any, { and, eq, inArray }: any) =>
            and(eq(t.schoolId, currentUser.schoolId), inArray(t.id, appStudentIds)),
        })
      : [];

    const studentMap = new Map<string, any>(studentsList.map((s: any) => [s.id, s]));

    // CDC Standard Examinee instructions
    const instructionsNp = [
      '१. परीक्षा हलमा प्रवेश गर्न प्रवेश-पत्र (Admit Card) अनिवार्य रूपमा साथमा हुनुपर्दछ।',
      '२. परीक्षा सुरु हुनुभन्दा कम्तीमा १५ मिनेट अगावै परीक्षा हलमा आफ्नो सिटमा बसिसक्नुपर्नेछ।',
      '३. मोबाइल, स्मार्ट घडी वा कुनै पनि प्रकारका अनाधिकृत इलेक्ट्रोनिक उपकरण परीक्षा हलभित्र निषेध गरिएको छ।',
      '४. उत्तरपुस्तिकाको मुख्य पृष्ठमा आफ्नो नाम, सिम्बोल नं, कक्षा र विषय स्पष्ट अक्षरमा लेख्नुपर्दछ।',
      '५. परीक्षा हलमा अनुशासनहीन वा अमर्यादित गतिविधि गरेको पाइएमा परीक्षा रद्द गरिनेछ।',
    ];

    const examinees = apps.map((app: any) => {
      const st = studentMap.get(app.studentId);
      const cls = classMap.get(app.classId || st?.currentClassId);
      const sec = sectionMap.get(app.sectionId || st?.currentSectionId);
      const classSubjects = allSubjects.filter((sub: any) => sub.classId === (app.classId || st?.currentClassId));

      return {
        applicationId: app.id,
        studentId: app.studentId,
        studentCode: st?.studentId || '',
        admissionNo: st?.admissionNo || '',
        rollNumber: app.rollNumber || st?.currentRollNumber || 1,
        symbolNumber: app.symbolNumber || `${st?.currentRollNumber || 1}`,
        admitCardPrintCount: app.admitCardPrintCount || 0,
        fullNameEn: st ? `${st.firstNameEn} ${st.lastNameEn || ''}`.trim() : 'Unknown Examinee',
        fullNameNp: st ? `${st.firstNameNp} ${st.lastNameNp || ''}`.trim() : 'परीक्षार्थी',
        gender: st?.gender || 'OTHER',
        dobBs: st?.dobBs || '',
        dobAd: st?.dobAd || '',
        fatherNameEn: st?.fatherNameEn || '',
        fatherNameNp: st?.fatherNameNp || '',
        motherNameEn: st?.motherNameEn || '',
        motherNameNp: st?.motherNameNp || '',
        guardianName: st?.fatherNameNp || st?.fatherNameEn || st?.motherNameNp || st?.motherNameEn || '',
        phone: st?.emergencyContactPhone || '',
        photoUrl: st?.photoUrl || null,
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        classCode: cls?.code || '',
        sectionCode: sec?.code || 'A',
        sectionNameNp: sec?.nameNp || 'खण्ड क',
        subjects: classSubjects.map((sub: any, idx: number) => ({
          sn: idx + 1,
          code: sub.code,
          nameEn: sub.nameEn,
          nameNp: sub.nameNp,
          creditHours: sub.creditHours,
          theoryFullMarks: sub.theoryFullMarks,
          practicalFullMarks: sub.practicalFullMarks,
          examDateBs: exam.startDateBs,
          examTime: '10:00 AM - 01:00 PM',
        })),
        instructionsNp,
      };
    });

    return reply.send({
      school,
      exam,
      examinees,
      count: examinees.length,
    });
  });

  // 14. Record Admit Card Printing Event (Increments print count)
  fastify.post('/:id/admit-cards/record-print', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: examId } = request.params as { id: string };
    const { applicationIds, studentIds } = request.body as {
      applicationIds?: string[];
      studentIds?: string[];
    };

    if ((!applicationIds || applicationIds.length === 0) && (!studentIds || studentIds.length === 0)) {
      return reply.status(400).send({ message: 'applicationIds or studentIds are required' });
    }

    if (applicationIds && applicationIds.length > 0) {
      await db
        .update(schema.examApplications)
        .set({
          admitCardPrintCount: sql`COALESCE(admit_card_print_count, 0) + 1`,
        })
        .where(
          and(
            eq(schema.examApplications.schoolId, currentUser.schoolId),
            eq(schema.examApplications.examId, examId),
            inArray(schema.examApplications.id, applicationIds)
          )
        );
    } else if (studentIds && studentIds.length > 0) {
      await db
        .update(schema.examApplications)
        .set({
          admitCardPrintCount: sql`COALESCE(admit_card_print_count, 0) + 1`,
        })
        .where(
          and(
            eq(schema.examApplications.schoolId, currentUser.schoolId),
            eq(schema.examApplications.examId, examId),
            inArray(schema.examApplications.studentId, studentIds)
          )
        );
    }

    return reply.send({ message: 'प्रवेशपत्र प्रिन्ट गणना अभिलेख गरियो।' });
  });
}
