import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, or, sql } from 'drizzle-orm';
import crypto from 'crypto';
import bs from 'bikram-sambat';

const { toBik } = (bs as any).default || bs;

function getTodayBs(): string {
  try {
    const todayBik = toBik(new Date());
    if (todayBik && todayBik.year) {
      return `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`;
    }
  } catch (err) {
    console.error('Error calculating BS date:', err);
  }
  return '2083-06-22';
}

export default async function learningRoutes(fastify: FastifyInstance) {
  // Authentication helper
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get All LMS Assignments (गृहकार्य सूची)
  fastify.get('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, sectionId, subjectId, status, teacherId } = request.query as any;

    const conditions: any[] = [eq(schema.lmsAssignments.schoolId, currentUser.schoolId)];
    if (classId) conditions.push(eq(schema.lmsAssignments.classId, classId));
    if (sectionId) conditions.push(eq(schema.lmsAssignments.sectionId, sectionId));
    if (subjectId) conditions.push(eq(schema.lmsAssignments.subjectId, subjectId));
    if (status) conditions.push(eq(schema.lmsAssignments.status, status));
    if (teacherId) conditions.push(eq(schema.lmsAssignments.teacherId, teacherId));

    const assignments = await db
      .select({
        id: schema.lmsAssignments.id,
        schoolId: schema.lmsAssignments.schoolId,
        academicYearId: schema.lmsAssignments.academicYearId,
        classId: schema.lmsAssignments.classId,
        sectionId: schema.lmsAssignments.sectionId,
        subjectId: schema.lmsAssignments.subjectId,
        teacherId: schema.lmsAssignments.teacherId,
        title: schema.lmsAssignments.title,
        description: schema.lmsAssignments.description,
        attachmentUrl: schema.lmsAssignments.attachmentUrl,
        attachmentName: schema.lmsAssignments.attachmentName,
        assignedDateBs: schema.lmsAssignments.assignedDateBs,
        dueDateBs: schema.lmsAssignments.dueDateBs,
        totalMarks: schema.lmsAssignments.totalMarks,
        status: schema.lmsAssignments.status,
        createdAt: schema.lmsAssignments.createdAt,
        className: schema.classes.nameNp,
        classNameEn: schema.classes.nameEn,
        sectionName: schema.sections.nameNp,
        sectionNameEn: schema.sections.nameEn,
        subjectName: schema.subjects.nameNp,
        subjectNameEn: schema.subjects.nameEn,
        teacherFullNameNp: schema.staff.fullNameNp,
        teacherFullNameEn: schema.staff.fullNameEn,
      })
      .from(schema.lmsAssignments)
      .leftJoin(schema.classes, eq(schema.lmsAssignments.classId, schema.classes.id))
      .leftJoin(schema.sections, eq(schema.lmsAssignments.sectionId, schema.sections.id))
      .leftJoin(schema.subjects, eq(schema.lmsAssignments.subjectId, schema.subjects.id))
      .leftJoin(schema.staff, eq(schema.lmsAssignments.teacherId, schema.staff.id))
      .where(and(...conditions))
      .orderBy(desc(schema.lmsAssignments.createdAt));

    // Fetch submission counts for each assignment
    const allSubmissions = await db
      .select({
        assignmentId: schema.lmsSubmissions.assignmentId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.lmsSubmissions)
      .groupBy(schema.lmsSubmissions.assignmentId);

    const submissionCountMap = new Map<string, number>();
    for (const sub of allSubmissions) {
      submissionCountMap.set(sub.assignmentId, Number(sub.count) || 0);
    }

    const assignmentsWithDetails = assignments.map((a: any) => ({
      ...a,
      teacherName: a.teacherFullNameNp || a.teacherFullNameEn || 'विषय शिक्षक',
      submissionsCount: submissionCountMap.get(a.id) || 0,
    }));

    return reply.send({ assignments: assignmentsWithDetails });
  });

  // 2. Create Assignment (नयाँ गृहकार्य सिर्जना)
  fastify.post('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.classId || !body.subjectId || !body.title) {
      return reply.status(400).send({ message: 'कक्षा, विषय, र शीर्षक अनिवार्य छन्।' });
    }

    const id = crypto.randomUUID();
    const assignedDateBs = body.assignedDateBs || getTodayBs();
    const dueDateBs = body.dueDateBs || assignedDateBs;

    const newAssignment = {
      id,
      schoolId: currentUser.schoolId,
      academicYearId: body.academicYearId || null,
      classId: body.classId,
      sectionId: body.sectionId || null,
      subjectId: body.subjectId,
      teacherId: body.teacherId || null,
      title: body.title.trim(),
      description: (body.description || '').trim(),
      attachmentUrl: body.attachmentUrl || null,
      attachmentName: body.attachmentName || null,
      assignedDateBs,
      dueDateBs,
      totalMarks: body.totalMarks ? Number(body.totalMarks) : null,
      status: body.status || 'ACTIVE',
    };

    await db.insert(schema.lmsAssignments).values(newAssignment);

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'CREATE_LMS_ASSIGNMENT',
      entity: 'LmsAssignment',
      entityId: id,
      newValues: newAssignment,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(201).send({
      message: 'नयाँ गृहकार्य सफलतापूर्वक सिर्जना गरियो।',
      assignment: newAssignment,
    });
  });

  // 3. Get Assignment Details with Submissions (गृहकार्य र बुझाएका समाधानहरू)
  fastify.get('/assignments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const assignment = await db.query.lmsAssignments.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!assignment) {
      return reply.status(404).send({ message: 'Assignment not found' });
    }

    // Get submissions with student details
    const submissions = await db
      .select({
        id: schema.lmsSubmissions.id,
        assignmentId: schema.lmsSubmissions.assignmentId,
        studentId: schema.lmsSubmissions.studentId,
        submittedAt: schema.lmsSubmissions.submittedAt,
        content: schema.lmsSubmissions.content,
        attachmentUrl: schema.lmsSubmissions.attachmentUrl,
        attachmentName: schema.lmsSubmissions.attachmentName,
        status: schema.lmsSubmissions.status,
        marksObtained: schema.lmsSubmissions.marksObtained,
        teacherFeedback: schema.lmsSubmissions.teacherFeedback,
        evaluatedAt: schema.lmsSubmissions.evaluatedAt,
        evaluatedById: schema.lmsSubmissions.evaluatedById,
        studentNameNp: schema.students.firstNameNp,
        studentLastNameNp: schema.students.lastNameNp,
        studentNameEn: schema.students.firstNameEn,
        studentLastNameEn: schema.students.lastNameEn,
        studentCode: schema.students.studentId,
      })
      .from(schema.lmsSubmissions)
      .leftJoin(schema.students, eq(schema.lmsSubmissions.studentId, schema.students.id))
      .where(eq(schema.lmsSubmissions.assignmentId, id))
      .orderBy(desc(schema.lmsSubmissions.submittedAt));

    const formattedSubmissions = submissions.map((s: any) => ({
      ...s,
      studentName: `${s.studentNameNp || s.studentNameEn || ''} ${s.studentLastNameNp || s.studentLastNameEn || ''}`.trim() || 'विद्यार्थी',
      studentNameNp: `${s.studentNameNp || ''} ${s.studentLastNameNp || ''}`.trim() || undefined,
      studentNameEn: `${s.studentNameEn || ''} ${s.studentLastNameEn || ''}`.trim() || undefined,
    }));

    return reply.send({
      assignment,
      submissions: formattedSubmissions,
    });
  });

  // 4. Update Assignment (गृहकार्य अद्यावधिक)
  fastify.put('/assignments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.lmsAssignments.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Assignment not found' });
    }

    const updates: any = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.dueDateBs !== undefined) updates.dueDateBs = body.dueDateBs;
    if (body.totalMarks !== undefined) updates.totalMarks = body.totalMarks ? Number(body.totalMarks) : null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.attachmentUrl !== undefined) updates.attachmentUrl = body.attachmentUrl;
    if (body.attachmentName !== undefined) updates.attachmentName = body.attachmentName;

    await db.update(schema.lmsAssignments).set(updates).where(eq(schema.lmsAssignments.id, id));

    return reply.send({ message: 'गृहकार्य सफलतापूर्वक अद्यावधिक भयो।' });
  });

  // 5. Delete Assignment (गृहकार्य हटाउने)
  fastify.delete('/assignments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db.delete(schema.lmsAssignments).where(
      and(eq(schema.lmsAssignments.id, id), eq(schema.lmsAssignments.schoolId, currentUser.schoolId))
    );

    return reply.send({ message: 'गृहकार्य सफलतापूर्वक हटाइयो।' });
  });

  // 6. Submit Assignment by Student (विद्यार्थीद्वारा समाधान बुझाउने)
  fastify.post('/assignments/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id: assignmentId } = request.params as { id: string };
    const body = request.body as any;

    let studentId = body.studentId;
    if (!studentId) {
      // Find default student if studentId omitted
      const firstStudent = await db.query.students.findFirst({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      });
      studentId = firstStudent?.id;
    }

    if (!studentId) {
      return reply.status(400).send({ message: 'Student ID is required' });
    }

    const assignment = await db.query.lmsAssignments.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, assignmentId), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!assignment) {
      return reply.status(404).send({ message: 'Assignment not found' });
    }

    // Check if submission already exists
    const existingSubmission = await db.query.lmsSubmissions.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.assignmentId, assignmentId), eq(table.studentId, studentId)),
    });

    const isLate = assignment.dueDateBs && getTodayBs() > assignment.dueDateBs;
    const status = isLate ? 'LATE' : 'SUBMITTED';

    if (existingSubmission) {
      await db
        .update(schema.lmsSubmissions)
        .set({
          content: body.content || existingSubmission.content,
          attachmentUrl: body.attachmentUrl !== undefined ? body.attachmentUrl : existingSubmission.attachmentUrl,
          attachmentName: body.attachmentName !== undefined ? body.attachmentName : existingSubmission.attachmentName,
          status,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.lmsSubmissions.id, existingSubmission.id));

      return reply.send({
        message: 'गृहकार्य समाधान पुनः बुझाइयो (Resubmitted)।',
        submissionId: existingSubmission.id,
      });
    }

    const submissionId = crypto.randomUUID();
    const newSubmission = {
      id: submissionId,
      assignmentId,
      studentId,
      content: body.content || 'गृहकार्य समाधान बुझाइएको छ।',
      attachmentUrl: body.attachmentUrl || null,
      attachmentName: body.attachmentName || null,
      status,
      marksObtained: null,
      teacherFeedback: null,
    };

    await db.insert(schema.lmsSubmissions).values(newSubmission);

    return reply.status(201).send({
      message: 'गृहकार्य समाधान सफलतापूर्वक बुझाइयो।',
      submission: newSubmission,
    });
  });

  // 7. Teacher Evaluate & Grade Submission (शिक्षकद्वारा जाँच, अंक प्रदान र फिडब्याक)
  fastify.put('/submissions/:id/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.lmsSubmissions.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Submission not found' });
    }

    const marksObtained = body.marksObtained !== undefined && body.marksObtained !== null && body.marksObtained !== ''
      ? Number(body.marksObtained)
      : null;

    const status = body.status || 'CHECKED';
    const teacherFeedback = body.teacherFeedback ? body.teacherFeedback.trim() : null;

    await db
      .update(schema.lmsSubmissions)
      .set({
        marksObtained,
        teacherFeedback,
        status,
        evaluatedAt: new Date(),
        evaluatedById: currentUser.userId,
        updatedAt: new Date(),
      })
      .where(eq(schema.lmsSubmissions.id, id));

    return reply.send({
      message: 'गृहकार्य सफलतापूर्वक जाँचियो र पृष्ठपोषण सुरक्षित भयो।',
    });
  });

  // 8. Get Study Materials (पाठ्य सामग्री, नोट तथा भिडियो लिङ्कहरू)
  fastify.get('/materials', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, subjectId } = request.query as any;

    const conditions: any[] = [eq(schema.lmsStudyMaterials.schoolId, currentUser.schoolId)];
    if (classId) conditions.push(eq(schema.lmsStudyMaterials.classId, classId));
    if (subjectId) conditions.push(eq(schema.lmsStudyMaterials.subjectId, subjectId));

    const materials = await db
      .select({
        id: schema.lmsStudyMaterials.id,
        schoolId: schema.lmsStudyMaterials.schoolId,
        classId: schema.lmsStudyMaterials.classId,
        subjectId: schema.lmsStudyMaterials.subjectId,
        unitName: schema.lmsStudyMaterials.unitName,
        title: schema.lmsStudyMaterials.title,
        resourceType: schema.lmsStudyMaterials.resourceType,
        fileUrl: schema.lmsStudyMaterials.fileUrl,
        fileName: schema.lmsStudyMaterials.fileName,
        description: schema.lmsStudyMaterials.description,
        uploadedById: schema.lmsStudyMaterials.uploadedById,
        createdAt: schema.lmsStudyMaterials.createdAt,
        className: schema.classes.nameNp,
        classNameEn: schema.classes.nameEn,
        subjectName: schema.subjects.nameNp,
        subjectNameEn: schema.subjects.nameEn,
        uploadedByName: schema.users.fullNameNp,
        uploadedByNameEn: schema.users.fullNameEn,
      })
      .from(schema.lmsStudyMaterials)
      .leftJoin(schema.classes, eq(schema.lmsStudyMaterials.classId, schema.classes.id))
      .leftJoin(schema.subjects, eq(schema.lmsStudyMaterials.subjectId, schema.subjects.id))
      .leftJoin(schema.users, eq(schema.lmsStudyMaterials.uploadedById, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.lmsStudyMaterials.createdAt));

    return reply.send({ materials });
  });

  // 9. Add Study Material (नयाँ पाठ्य सामग्री अपलोड/दर्ता)
  fastify.post('/materials', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.classId || !body.subjectId || !body.title || !body.fileUrl) {
      return reply.status(400).send({ message: 'कक्षा, विषय, शीर्षक, र फाइल लिङ्क अनिवार्य छन्।' });
    }

    const id = crypto.randomUUID();
    const newMaterial = {
      id,
      schoolId: currentUser.schoolId,
      classId: body.classId,
      subjectId: body.subjectId,
      unitName: (body.unitName || 'एकाइ १').trim(),
      title: body.title.trim(),
      resourceType: body.resourceType || 'PDF',
      fileUrl: body.fileUrl.trim(),
      fileName: body.fileName || null,
      description: body.description ? body.description.trim() : null,
      uploadedById: currentUser.userId,
    };

    await db.insert(schema.lmsStudyMaterials).values(newMaterial);

    return reply.status(201).send({
      message: 'पाठ्य सामग्री सफलतापूर्वक थपियो।',
      material: newMaterial,
    });
  });

  // 10. Delete Study Material (पाठ्य सामग्री हटाउने)
  fastify.delete('/materials/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db.delete(schema.lmsStudyMaterials).where(
      and(eq(schema.lmsStudyMaterials.id, id), eq(schema.lmsStudyMaterials.schoolId, currentUser.schoolId))
    );

    return reply.send({ message: 'सामग्री सफलतापूर्वक हटाइयो।' });
  });

  // 11. Student Learning Progress & Remedial Summary (विद्यार्थी सिकाइ प्रगति तथा उपचारात्मक सारांश)
  fastify.get('/students/:studentId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { studentId } = request.params as { id: string; studentId: string };

    const student = await db.query.students.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, studentId), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    // Get active enrolment to know class
    const enrolment = await db.query.studentEnrollments.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.studentId, studentId), eq(table.status, 'ACTIVE')),
    });

    const classId = enrolment?.classId;

    // Total assignments for this class
    const classAssignments = classId
      ? await db.query.lmsAssignments.findMany({
          where: (table: any, { eq, and }: any) =>
            and(eq(table.schoolId, currentUser.schoolId), eq(table.classId, classId)),
        })
      : [];

    const totalAssignments = classAssignments.length;

    // Submissions by this student
    const studentSubmissions = await db.query.lmsSubmissions.findMany({
      where: (table: any, { eq }: any) => eq(table.studentId, studentId),
    });

    const submittedCount = studentSubmissions.length;
    const checkedCount = studentSubmissions.filter((s: any) => s.status === 'CHECKED').length;
    const pendingCount = Math.max(0, totalAssignments - submittedCount);
    const submissionRate = totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 100;

    // Marks calculation
    const gradedSubmissions = studentSubmissions.filter((s: any) => s.marksObtained !== null && s.marksObtained !== undefined);
    const averageMarks =
      gradedSubmissions.length > 0
        ? Number(
            (
              gradedSubmissions.reduce((acc: number, curr: any) => acc + Number(curr.marksObtained), 0) /
              gradedSubmissions.length
            ).toFixed(1)
          )
        : null;

    // Remedial remarks
    const remedialRemarks = studentSubmissions
      .filter((s: any) => s.teacherFeedback && s.teacherFeedback.trim().length > 0)
      .map((s: any) => s.teacherFeedback);

    const studentNameNp = `${student.firstNameNp || ''} ${student.lastNameNp || ''}`.trim();
    const studentNameEn = `${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim();
    const studentName = studentNameNp || studentNameEn;

    return reply.send({
      summary: {
        studentId,
        studentName,
        studentNameNp,
        studentNameEn,
        studentCode: student.studentId,
        totalAssignments,
        submittedCount,
        checkedCount,
        pendingCount,
        submissionRate,
        averageMarks,
        remedialRemarks,
      },
    });
  });
}
