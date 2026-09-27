import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
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

    const [exam, cls, subject, studentsList] = await Promise.all([
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
      entries,
      students: entries,
    });
  });

  // 4. Save/Submit Marks (Single or Bulk, with CAS sub-components)
  fastify.post('/:id/marks', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
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

    for (const item of marks) {
      const effSubId = item.subjectId || topSubjectId;
      if (!effSubId) continue;

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
            eq(t.subjectId, effSubId)
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
            remarks: item.remarks || null,
            recordedById: currentUser.id,
          })
          .where(eq(schema.examMarks.id, existing.id));
      } else {
        await db.insert(schema.examMarks).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          examId,
          studentId: item.studentId,
          subjectId: effSubId,
          theoryMarks: parsedTheory,
          practicalMarks: parsedPractical,
          casParticipation: parsedParticipation,
          casProjectPractical: parsedProject,
          casDiscipline: parsedDiscipline,
          casTerminalExam: parsedTerminal,
          isAbsent: item.isAbsent ?? false,
          remarks: item.remarks || null,
          recordedById: currentUser.id,
        });
      }
    }

    return reply.send({ message: 'अंकहरू तथा CAS उप-शीर्षकहरू सफलतापूर्वक सुरक्षित गरियो', count: marks.length });
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

    const [exam, cls, allSubjects, allStudents] = await Promise.all([
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
        levelRating: rec?.levelRating ?? 3, // Default to 3 (राम्रो)
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
    });
  });

  // 4c. Class 1-3 Continuous Assessment System (CAS) - Save Theme Ratings (Levels 1-4)
  fastify.post('/:id/cas-1-3', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
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

    for (const item of ratings) {
      const effSubId = item.subjectId || topSubjectId;
      if (!effSubId) continue;

      const validLevel = [1, 2, 3, 4].includes(Number(item.levelRating)) ? Number(item.levelRating) : 3;

      const existing = await db.query.class1To3CasRatings.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.schoolId, currentUser.schoolId),
            eq(t.examId, examId),
            eq(t.studentId, item.studentId),
            eq(t.subjectId, effSubId)
          ),
      });

      if (existing) {
        await db
          .update(schema.class1To3CasRatings)
          .set({
            levelRating: validLevel,
            achievementRemarks: item.achievementRemarks || null,
            themeName: item.themeName || null,
            recordedById: currentUser.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.class1To3CasRatings.id, existing.id));
      } else {
        await db.insert(schema.class1To3CasRatings).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          examId,
          studentId: item.studentId,
          subjectId: effSubId,
          levelRating: validLevel,
          achievementRemarks: item.achievementRemarks || null,
          themeName: item.themeName || null,
          recordedById: currentUser.id,
        });
      }
    }

    return reply.send({ message: 'कक्षा १-३ को मूल्याङ्कन सफलतापूर्वक सुरक्षित गरियो', count: ratings.length });
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
}
