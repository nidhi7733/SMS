import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, like, or } from 'drizzle-orm';
import crypto from 'crypto';
import bs from 'bikram-sambat';

const { toBik } = (bs as any).default || bs;

export default async function certificateRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // 1. Get All Issued Certificates
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, certificateType, search } = request.query as {
      classId?: string;
      certificateType?: string;
      search?: string;
    };

    const certs = await db.query.studentCertificates.findMany({
      where: (t: any, { eq, and }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId)];
        if (classId) conds.push(eq(t.classId, classId));
        if (certificateType) conds.push(eq(t.certificateType, certificateType));
        return and(...conds);
      },
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    // Lookup metadata: students, classes, streams, guardians
    const [allStudents, allClasses, allStreams, allGuardians] = await Promise.all([
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.streams.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.guardians.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const studentMap = new Map<string, any>(allStudents.map((s: any) => [s.id, s]));
    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));
    const streamMap = new Map<string, any>(allStreams.map((st: any) => [st.id, st]));

    const enriched = certs.map((c: any) => {
      const student = studentMap.get(c.studentId);
      const cls = classMap.get(c.classId);
      const stream = streamMap.get(c.streamId);
      const father = allGuardians.find((g: any) => g.studentId === c.studentId && (g.relationship === 'FATHER' || g.isPrimaryContact));
      const mother = allGuardians.find((g: any) => g.studentId === c.studentId && g.relationship === 'MOTHER');

      return {
        ...c,
        studentNameEn: student ? `${student.firstNameEn} ${student.lastNameEn || ''}`.trim() : 'Student',
        studentNameNp: student ? `${student.firstNameNp} ${student.lastNameNp || ''}`.trim() : 'विद्यार्थी',
        admissionNo: student?.admissionNo,
        rollNumber: student?.currentRollNumber,
        dobBs: student?.dobBs,
        dobAd: student?.dobAd,
        gender: student?.gender,
        photoUrl: student?.photoUrl || null,
        fatherNameEn: father?.fullNameEn || student?.fatherNameEn || '',
        fatherNameNp: father?.fullNameNp || student?.fatherNameNp || '',
        motherNameEn: mother?.fullNameEn || student?.motherNameEn || '',
        motherNameNp: mother?.fullNameNp || student?.motherNameNp || '',
        classNameEn: cls?.nameEn || 'Class',
        classNameNp: cls?.nameNp || 'कक्षा',
        classCode: cls?.code,
        streamNameEn: stream?.nameEn,
        streamNameNp: stream?.nameNp,
      };
    });

    // Filter by search if provided
    let results = enriched;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = enriched.filter(
        (item: any) =>
          item.certificateNo.toLowerCase().includes(q) ||
          item.studentNameEn.toLowerCase().includes(q) ||
          item.studentNameNp.includes(q) ||
          (item.symbolNumber && item.symbolNumber.toLowerCase().includes(q)) ||
          (item.registrationNumber && item.registrationNumber.toLowerCase().includes(q))
      );
    }

    return reply.send({ certificates: results, total: results.length });
  });

  // 2. Generate a New Certificate (SLC, Character Certificate, Transfer Certificate)
  fastify.post('/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as {
      studentId: string;
      certificateType: 'SLC' | 'CHARACTER' | 'TRANSFER' | 'TESTIMONIAL';
      classId: string;
      streamId?: string;
      passedAcademicYearBs: number;
      symbolNumber?: string;
      registrationNumber?: string;
      gpa?: string;
      divisionOrGrade?: string;
      characterRemarks?: string;
      reasonForLeaving?: string;
      conductNotes?: string;
      remarks?: string;
      issueDateBs?: string;
      updateStudentStatus?: boolean;
    };

    if (!body.studentId || !body.certificateType || !body.classId || !body.passedAcademicYearBs) {
      return reply.status(400).send({
        message: 'studentId, certificateType, classId, and passedAcademicYearBs are required',
      });
    }

    const todayBik = toBik(new Date());
    const issueDateBs =
      body.issueDateBs ||
      (todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-04-15');

    // Generate unique serial certificate number: e.g. SLC-2083-0001 or CC-2083-0001
    const prefix = body.certificateType === 'CHARACTER' ? 'CC' : body.certificateType === 'TRANSFER' ? 'TC' : 'SLC';
    const yearPart = body.passedAcademicYearBs;

    const existingCount = await db.query.studentCertificates.findMany({
      where: (t: any, { and, eq }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          eq(t.certificateType, body.certificateType),
          eq(t.passedAcademicYearBs, yearPart)
        ),
    });

    const serial = String(existingCount.length + 1).padStart(4, '0');
    const certificateNo = `${prefix}-${yearPart}-${serial}`;

    const newCertId = crypto.randomUUID();

    await db.insert(schema.studentCertificates).values({
      id: newCertId,
      schoolId: currentUser.schoolId,
      studentId: body.studentId,
      certificateType: body.certificateType,
      certificateNo,
      classId: body.classId,
      streamId: body.streamId || null,
      passedAcademicYearBs: body.passedAcademicYearBs,
      symbolNumber: body.symbolNumber || null,
      registrationNumber: body.registrationNumber || null,
      gpa: body.gpa || null,
      divisionOrGrade: body.divisionOrGrade || null,
      characterRemarks: body.characterRemarks || 'उत्तम (Excellent)',
      issueDateBs,
      isDuplicate: false,
      duplicateCount: 0,
      reasonForLeaving: body.reasonForLeaving || 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण भई उच्च शिक्षा अध्ययनका लागि',
      conductNotes: body.conductNotes || null,
      remarks: body.remarks || null,
      issuedById: currentUser.id,
    });

    // If updateStudentStatus is requested, set student status to PASSED_OUT or ALUMNI
    if (body.updateStudentStatus) {
      await db
        .update(schema.students)
        .set({
          status: 'TRANSFERRED',
        })
        .where(eq(schema.students.id, body.studentId));
    }

    return reply.status(201).send({
      message: 'प्रमाणपत्र सफलतापूर्वक जारी गरियो (Certificate issued successfully)',
      certificateId: newCertId,
      certificateNo,
    });
  });

  // 3. Get Single Certificate Details for Printing
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const cert = await db.query.studentCertificates.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!cert) {
      return reply.status(404).send({ message: 'प्रमाणपत्र फेला परेन (Certificate not found)' });
    }

    const [school, student, cls, stream, issuer, guardians] = await Promise.all([
      db.query.schools.findFirst({ where: (t: any, { eq }: any) => eq(t.id, currentUser.schoolId) }),
      db.query.students.findFirst({ where: (t: any, { eq }: any) => eq(t.id, cert.studentId) }),
      db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, cert.classId) }),
      cert.streamId
        ? db.query.streams.findFirst({ where: (t: any, { eq }: any) => eq(t.id, cert.streamId) })
        : null,
      cert.issuedById
        ? db.query.users.findFirst({ where: (t: any, { eq }: any) => eq(t.id, cert.issuedById) })
        : null,
      db.query.guardians.findMany({ where: (t: any, { eq }: any) => eq(t.studentId, cert.studentId) }),
    ]);

    const father = guardians.find((g: any) => g.relationship === 'FATHER' || g.isPrimaryContact);
    const mother = guardians.find((g: any) => g.relationship === 'MOTHER');

    const enrichedStudent = student
      ? {
          ...student,
          fatherNameEn: father?.fullNameEn || '',
          fatherNameNp: father?.fullNameNp || '',
          motherNameEn: mother?.fullNameEn || '',
          motherNameNp: mother?.fullNameNp || '',
          photoUrl: student.photoUrl || null,
        }
      : null;

    return reply.send({
      certificate: cert,
      school,
      student: enrichedStudent,
      classInfo: cls,
      streamInfo: stream,
      issuedBy: issuer ? { id: issuer.id, fullNameEn: issuer.fullNameEn, fullNameNp: issuer.fullNameNp } : null,
    });
  });

  // 4. Issue Duplicate Copy (प्रतिलिपि)
  fastify.post('/:id/duplicate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string }) || {};
    const reason = body.reason;

    const cert = await db.query.studentCertificates.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!cert) {
      return reply.status(404).send({ message: 'प्रमाणपत्र फेला परेन' });
    }

    const newDuplicateCount = (cert.duplicateCount || 0) + 1;
    let todayBsStr = '';
    try {
      const bik = toBik(new Date());
      if (bik) {
        todayBsStr = `${bik.year}-${String(bik.month).padStart(2, '0')}-${String(bik.day).padStart(2, '0')}`;
      }
    } catch {
      todayBsStr = '2083-04-15';
    }

    const updatedRemarks = `${cert.remarks || ''}\n[प्रतिलिपि ${newDuplicateCount} जारी मिति: ${todayBsStr}, कारण: ${reason || 'माग अनुसार'}]`.trim();

    await db
      .update(schema.studentCertificates)
      .set({
        isDuplicate: true,
        duplicateCount: newDuplicateCount,
        remarks: updatedRemarks,
      })
      .where(eq(schema.studentCertificates.id, id));

    const updatedCert = await db.query.studentCertificates.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    return reply.send({
      message: 'प्रतिलिपि प्रमाणपत्र सफलतापूर्वक रेकर्ड भयो (Duplicate certificate recorded successfully)',
      duplicateCount: newDuplicateCount,
      certificate: updatedCert,
    });
  });

  // 4a. Record Certificate Print (First-Time vs Repeat Print)
  fastify.post('/:id/record-print', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = (request.body as { isDuplicate?: boolean; reason?: string }) || {};

    const cert = await db.query.studentCertificates.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!cert) {
      return reply.status(404).send({ message: 'प्रमाणपत्र फेला परेन' });
    }

    const newPrintCount = (cert.printCount || 0) + 1;
    const now = new Date();
    const firstPrintedAt = cert.firstPrintedAt || now;

    let isDuplicate = cert.isDuplicate;
    let duplicateCount = cert.duplicateCount || 0;

    if (body.isDuplicate) {
      isDuplicate = true;
      duplicateCount = duplicateCount + 1;
    }

    await db
      .update(schema.studentCertificates)
      .set({
        printCount: newPrintCount,
        firstPrintedAt,
        lastPrintedAt: now,
        isDuplicate,
        duplicateCount,
      })
      .where(eq(schema.studentCertificates.id, id));

    return reply.send({
      success: true,
      printCount: newPrintCount,
      isDuplicate,
      duplicateCount,
      firstPrintedAt,
    });
  });

  // 4b. Reset Duplicate Status (Revert to Original Copy)
  fastify.post('/:id/reset-duplicate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const cert = await db.query.studentCertificates.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!cert) {
      return reply.status(404).send({ message: 'प्रमाणपत्र फेला परेन' });
    }

    await db
      .update(schema.studentCertificates)
      .set({
        isDuplicate: false,
        duplicateCount: 0,
      })
      .where(eq(schema.studentCertificates.id, id));

    return reply.send({
      success: true,
      message: 'प्रमाणपत्रलाई मूल प्रति (Original) मा सफलतापूर्वक परिवर्तन गरियो',
    });
  });

  // 5. Delete Certificate
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const cert = await db.query.studentCertificates.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!cert) {
      return reply.status(404).send({ message: 'प्रमाणपत्र फेला परेन' });
    }

    await db.delete(schema.studentCertificates).where(eq(schema.studentCertificates.id, id));
    return reply.send({ message: 'प्रमाणपत्र रेकर्ड खारेज गरियो (Certificate deleted)', id });
  });
}
