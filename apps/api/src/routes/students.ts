import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, sql, ilike, or } from 'drizzle-orm';
import crypto from 'crypto';

export default async function studentRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // Helper to generate next sequential student ID: [BSYear]-[0001]
  const generateStudentId = async (db: any, schoolId: string, yearBs: number) => {
    const existing = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, schoolId), eq(table.admissionYearBs, yearBs)),
      orderBy: (table: any, { desc }: any) => [desc(table.studentId)],
    });

    let nextSeq = 1;
    if (existing.length > 0) {
      const match = existing[0].studentId.match(/-(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      } else {
        nextSeq = existing.length + 1;
      }
    }

    const seqPadded = String(nextSeq).padStart(4, '0');
    return `${yearBs}-${seqPadded}`;
  };

  // 1. List Students (with filters & search)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const query = request.query as {
      q?: string;
      classId?: string;
      sectionId?: string;
      status?: string;
      gender?: string;
      bloodGroup?: string;
      inclusion?: string;
    };

    const allStudents = await db.query.students.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [eq(table.schoolId, currentUser.schoolId)];
        if (query.classId) conditions.push(eq(table.currentClassId, query.classId));
        if (query.sectionId) conditions.push(eq(table.currentSectionId, query.sectionId));
        if (query.status) conditions.push(eq(table.status, query.status));
        if (query.gender) conditions.push(eq(table.gender, query.gender));
        if (query.bloodGroup) conditions.push(eq(table.bloodGroup, query.bloodGroup));
        if (query.inclusion) conditions.push(eq(table.ethnicityInclusion, query.inclusion));
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [asc(table.currentRollNumber), asc(table.studentId)],
    });

    // Lookup mappings
    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const classMap = new Map<string, any>(allClasses.map((c: any) => [c.id, c]));

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const allStreams = await db.query.streams.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const streamMap = new Map<string, any>(allStreams.map((st: any) => [st.id, st]));

    const sectionMap = new Map<string, any>(
      allSections.map((s: any) => {
        const str = s.streamId ? streamMap.get(s.streamId) : null;
        return [
          s.id,
          {
            ...s,
            streamCode: str?.code || null,
            streamNameEn: str?.nameEn || null,
            streamNameNp: str?.nameNp || null,
          },
        ];
      })
    );

    const allHouses = await db.query.houses.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const houseMap = new Map<string, any>(allHouses.map((h: any) => [h.id, h]));

    const allGuardians = await db.query.guardians.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const allHealth = await db.query.studentHealthRecords.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const healthMap = new Map<string, any>(allHealth.map((h: any) => [h.studentId, h]));

    let filtered = allStudents.map((s: any) => {
      const cls = classMap.get(s.currentClassId);
      const sec = s.currentSectionId ? sectionMap.get(s.currentSectionId) : null;
      const house = s.houseId ? houseMap.get(s.houseId) : null;
      const primaryGuardian = allGuardians.find(
        (g: any) => g.studentId === s.id && (g.isPrimaryContact || g.relationship === 'FATHER')
      );
      const health = healthMap.get(s.id);

      return {
        ...s,
        classNameEn: cls?.nameEn,
        classNameNp: cls?.nameNp,
        classCode: cls?.code,
        sectionNameEn: sec?.nameEn,
        sectionNameNp: sec?.nameNp,
        sectionCode: sec?.code,
        streamNameEn: sec?.streamNameEn || null,
        streamNameNp: sec?.streamNameNp || null,
        houseNameEn: house?.nameEn,
        houseColor: house?.colorHex,
        guardianName: primaryGuardian ? primaryGuardian.fullNameEn : '—',
        guardianPhone: primaryGuardian ? primaryGuardian.phone : '—',
        healthRecord: health || null,
      };
    });

    if (query.q && query.q.trim().length > 0) {
      const term = query.q.toLowerCase().trim();
      filtered = filtered.filter(
        (s: any) =>
          s.studentId.toLowerCase().includes(term) ||
          (s.iemisCode && s.iemisCode.toLowerCase().includes(term)) ||
          s.firstNameEn.toLowerCase().includes(term) ||
          s.lastNameEn.toLowerCase().includes(term) ||
          s.firstNameNp.includes(term) ||
          s.lastNameNp.includes(term) ||
          (s.guardianPhone && s.guardianPhone.includes(term))
      );
    }

    return reply.send({ students: filtered, total: filtered.length });
  });

  // 2. Get Single Student Detail (Comprehensive Dossier)
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const student = await db.query.students.findFirst({
      where: (table: any, { eq, or, and }: any) =>
        and(or(eq(table.id, id), eq(table.studentId, id)), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    // Related data
    const guardians = await db.query.guardians.findMany({
      where: (table: any, { eq }: any) => eq(table.studentId, student.id),
    });

    const healthRecord = await db.query.studentHealthRecords.findFirst({
      where: (table: any, { eq }: any) => eq(table.studentId, student.id),
    });

    const enrollments = await db.query.studentEnrollments.findMany({
      where: (table: any, { eq }: any) => eq(table.studentId, student.id),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    const cls = await db.query.classes.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, student.currentClassId),
    });

    const sec = student.currentSectionId
      ? await db.query.sections.findFirst({
          where: (table: any, { eq }: any) => eq(table.id, student.currentSectionId),
        })
      : null;

    const stream = sec?.streamId
      ? await db.query.streams.findFirst({
          where: (table: any, { eq }: any) => eq(table.id, sec.streamId),
        })
      : null;

    const secWithStream = sec
      ? {
          ...sec,
          streamCode: stream?.code || null,
          streamNameEn: stream?.nameEn || null,
          streamNameNp: stream?.nameNp || null,
        }
      : null;

    const house = student.houseId
      ? await db.query.houses.findFirst({
          where: (table: any, { eq }: any) => eq(table.id, student.houseId),
        })
      : null;

    const optSub1 = student.optionalSubject1Id
      ? await db.query.subjects.findFirst({
          where: (table: any, { eq }: any) => eq(table.id, student.optionalSubject1Id),
        })
      : null;

    const optSub2 = student.optionalSubject2Id
      ? await db.query.subjects.findFirst({
          where: (table: any, { eq }: any) => eq(table.id, student.optionalSubject2Id),
        })
      : null;

    const allClassSubjects = await db.query.subjects.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.classId, student.currentClassId)),
    });

    const activeSubjects = allClassSubjects.filter((sub: any) => {
      if (sub.sectionId) {
        return student.currentSectionId && sub.sectionId === student.currentSectionId;
      }
      if (!sub.isOptional) {
        return true;
      }
      return sub.id === student.optionalSubject1Id || sub.id === student.optionalSubject2Id;
    });

    return reply.send({
      student: {
        ...student,
        currentClass: cls,
        currentSection: secWithStream,
        stream,
        house,
        guardians,
        healthRecord,
        enrollments,
        optionalSubject1: optSub1,
        optionalSubject2: optSub2,
        activeSubjects,
      },
    });
  });

  // 3. Admit / Register New Student
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (
      !body.firstNameEn ||
      !body.lastNameEn ||
      !body.firstNameNp ||
      !body.lastNameNp ||
      !body.dobBs ||
      !body.dobAd ||
      !body.gender ||
      !body.currentClassId
    ) {
      return reply.status(400).send({ message: 'Missing required student demographic fields' });
    }

    const school = await db.query.schools.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, currentUser.schoolId),
    });
    const admissionYearBs = body.admissionYearBs || school?.activeAcademicYearBs || 2083;

    // Check duplicate student
    const existingDup = await db.query.students.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(
          eq(table.schoolId, currentUser.schoolId),
          eq(table.firstNameEn, body.firstNameEn.trim()),
          eq(table.lastNameEn, body.lastNameEn.trim()),
          eq(table.dobBs, body.dobBs.trim())
        ),
    });

    if (existingDup) {
      return reply.status(400).send({
        message: `A student with name "${body.firstNameEn} ${body.lastNameEn}" and DOB "${body.dobBs}" already exists (Student ID: ${existingDup.studentId}).`,
      });
    }

    const studentUuid = crypto.randomUUID();
    const studentId = await generateStudentId(db, currentUser.schoolId, admissionYearBs);

    // 1. Insert Student Record
    await db.insert(schema.students).values({
      id: studentUuid,
      schoolId: currentUser.schoolId,
      studentId,
      iemisCode: body.iemisCode ? body.iemisCode.trim() : null,
      firstNameEn: body.firstNameEn.trim(),
      middleNameEn: body.middleNameEn ? body.middleNameEn.trim() : null,
      lastNameEn: body.lastNameEn.trim(),
      firstNameNp: body.firstNameNp.trim(),
      middleNameNp: body.middleNameNp ? body.middleNameNp.trim() : null,
      lastNameNp: body.lastNameNp.trim(),
      dobBs: body.dobBs.trim(),
      dobAd: body.dobAd.trim(),
      gender: body.gender,
      bloodGroup: body.bloodGroup || 'UNKNOWN',
      motherTongue: body.motherTongue || 'Nepali',
      nationality: body.nationality || 'Nepali',
      ethnicityInclusion: body.ethnicityInclusion || 'BRAHMIN_CHHETRI',
      disabilityStatus: body.disabilityStatus || 'NONE',
      scholarshipEligible: Boolean(body.scholarshipEligible),
      photoUrl: body.photoUrl || null,
      houseId: body.houseId || null,
      permProvince: body.permProvince || 'Bagmati Province',
      permDistrict: body.permDistrict || 'Kathmandu',
      permLocalLevel: body.permLocalLevel || 'Tokha Municipality',
      permWardNumber: body.permWardNumber ? Number(body.permWardNumber) : 4,
      permTole: body.permTole || null,
      currProvince: body.currProvince || 'Bagmati Province',
      currDistrict: body.currDistrict || 'Kathmandu',
      currLocalLevel: body.currLocalLevel || 'Tokha Municipality',
      currWardNumber: body.currWardNumber ? Number(body.currWardNumber) : 4,
      currTole: body.currTole || null,
      admissionYearBs,
      admissionDateBs: body.admissionDateBs || `${admissionYearBs}-01-01`,
      admissionDateAd: body.admissionDateAd || new Date().toISOString().split('T')[0],
      currentClassId: body.currentClassId,
      currentSectionId: body.currentSectionId || null,
      currentRollNumber: body.currentRollNumber ? Number(body.currentRollNumber) : null,
      optionalSubject1Id: body.optionalSubject1Id || null,
      optionalSubject2Id: body.optionalSubject2Id || null,
      status: 'ACTIVE',
    });

    // 2. Insert Health Records (Medical & Health Information Section)
    const health = body.healthInfo || {};
    await db.insert(schema.studentHealthRecords).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      studentId: studentUuid,
      bloodGroup: body.bloodGroup || health.bloodGroup || 'UNKNOWN',
      allergies: health.allergies || 'None',
      chronicConditions: health.chronicConditions || 'None',
      regularMedications: health.regularMedications || 'None',
      physicalAccommodations: health.physicalAccommodations || 'None',
      emergencyContactName: health.emergencyContactName || null,
      emergencyContactPhone: health.emergencyContactPhone || null,
      preferredHospital: health.preferredHospital || 'Local Primary Health Center',
      immunizationStatus: health.immunizationStatus || 'COMPLETE',
      medicalNotes: health.medicalNotes || null,
    });

    // 3. Insert Guardians
    if (body.guardians && Array.isArray(body.guardians)) {
      for (const g of body.guardians) {
        if (g.fullNameEn && g.phone) {
          await db.insert(schema.guardians).values({
            id: crypto.randomUUID(),
            schoolId: currentUser.schoolId,
            studentId: studentUuid,
            relationship: g.relationship || 'FATHER',
            fullNameEn: g.fullNameEn,
            fullNameNp: g.fullNameNp || g.fullNameEn,
            phone: g.phone,
            email: g.email || null,
            occupation: g.occupation || null,
            isPrimaryContact: Boolean(g.isPrimaryContact),
          });
        }
      }
    }

    // 4. Insert Active Academic Year Enrollment
    const currentYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, currentUser.schoolId), eq(table.yearBs, admissionYearBs)),
    });

    if (currentYear) {
      await db.insert(schema.studentEnrollments).values({
        id: crypto.randomUUID(),
        schoolId: currentUser.schoolId,
        studentId: studentUuid,
        academicYearId: currentYear.id,
        classId: body.currentClassId,
        sectionId: body.currentSectionId || null,
        rollNumber: body.currentRollNumber ? Number(body.currentRollNumber) : null,
        optionalSubject1Id: body.optionalSubject1Id || null,
        optionalSubject2Id: body.optionalSubject2Id || null,
        status: 'ENROLLED',
      });
    }

    // 5. Audit Log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'ADMIT_STUDENT',
      entity: 'Student',
      entityId: studentUuid,
      newValues: { studentId, fullNameEn: `${body.firstNameEn} ${body.lastNameEn}` },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(201).send({
      message: `Student admitted successfully with ID ${studentId}`,
      id: studentUuid,
      studentId,
    });
  });

  // 4. Update Student
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.students.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    await db.update(schema.students)
      .set({
        // IEMIS ID is immutable from regular edit
        firstNameEn: body.firstNameEn ?? existing.firstNameEn,
        middleNameEn: body.middleNameEn !== undefined ? body.middleNameEn : existing.middleNameEn,
        lastNameEn: body.lastNameEn ?? existing.lastNameEn,
        firstNameNp: body.firstNameNp !== undefined ? body.firstNameNp : existing.firstNameNp,
        middleNameNp: body.middleNameNp !== undefined ? body.middleNameNp : existing.middleNameNp,
        lastNameNp: body.lastNameNp !== undefined ? body.lastNameNp : existing.lastNameNp,
        dobBs: body.dobBs ?? existing.dobBs,
        dobAd: body.dobAd ?? existing.dobAd,
        gender: body.gender ?? existing.gender,
        bloodGroup: body.bloodGroup ?? existing.bloodGroup,
        ethnicityInclusion: body.ethnicityInclusion ?? existing.ethnicityInclusion,
        disabilityStatus: body.disabilityStatus ?? existing.disabilityStatus,
        scholarshipEligible: body.scholarshipEligible !== undefined ? Boolean(body.scholarshipEligible) : existing.scholarshipEligible,
        photoUrl: body.photoUrl !== undefined ? body.photoUrl : existing.photoUrl,
        houseId: body.houseId !== undefined ? body.houseId : existing.houseId,
        permProvince: body.permProvince ?? existing.permProvince,
        permDistrict: body.permDistrict ?? existing.permDistrict,
        permLocalLevel: body.permLocalLevel ?? existing.permLocalLevel,
        permWardNumber: body.permWardNumber !== undefined ? Number(body.permWardNumber) : existing.permWardNumber,
        permTole: body.permTole !== undefined ? body.permTole : existing.permTole,
        currProvince: body.currProvince ?? existing.currProvince,
        currDistrict: body.currDistrict ?? existing.currDistrict,
        currLocalLevel: body.currLocalLevel ?? existing.currLocalLevel,
        currWardNumber: body.currWardNumber !== undefined ? Number(body.currWardNumber) : existing.currWardNumber,
        currTole: body.currTole !== undefined ? body.currTole : existing.currTole,
        currentClassId: body.currentClassId ?? existing.currentClassId,
        currentSectionId: body.currentSectionId !== undefined ? body.currentSectionId : existing.currentSectionId,
        currentRollNumber: body.currentRollNumber !== undefined ? Number(body.currentRollNumber) : existing.currentRollNumber,
        optionalSubject1Id: body.optionalSubject1Id !== undefined ? (body.optionalSubject1Id || null) : existing.optionalSubject1Id,
        optionalSubject2Id: body.optionalSubject2Id !== undefined ? (body.optionalSubject2Id || null) : existing.optionalSubject2Id,
        status: body.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.students.id, id));

    // Update or insert Father guardian
    if (body.fatherNameEn !== undefined || body.fatherPhone !== undefined) {
      const existingFather = await db.query.guardians.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.studentId, existing.id), eq(table.relationship, 'FATHER')),
      });
      if (existingFather) {
        await db.update(schema.guardians)
          .set({
            fullNameEn: body.fatherNameEn !== undefined ? String(body.fatherNameEn).trim() : existingFather.fullNameEn,
            phone: body.fatherPhone !== undefined ? String(body.fatherPhone).trim() : existingFather.phone,
            occupation: body.fatherOccupation !== undefined ? String(body.fatherOccupation).trim() : existingFather.occupation,
          })
          .where(eq(schema.guardians.id, existingFather.id));
      } else if (body.fatherNameEn) {
        await db.insert(schema.guardians).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: existing.id,
          relationship: 'FATHER',
          fullNameEn: String(body.fatherNameEn).trim(),
          fullNameNp: body.fatherNameNp ? String(body.fatherNameNp).trim() : String(body.fatherNameEn).trim(),
          phone: body.fatherPhone ? String(body.fatherPhone).trim() : '',
          occupation: body.fatherOccupation || 'Agriculture',
          isPrimaryContact: true,
        });
      }
    }

    // Update or insert Mother guardian
    if (body.motherNameEn !== undefined || body.motherPhone !== undefined) {
      const existingMother = await db.query.guardians.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.studentId, existing.id), eq(table.relationship, 'MOTHER')),
      });
      if (existingMother) {
        await db.update(schema.guardians)
          .set({
            fullNameEn: body.motherNameEn !== undefined ? String(body.motherNameEn).trim() : existingMother.fullNameEn,
            phone: body.motherPhone !== undefined ? String(body.motherPhone).trim() : existingMother.phone,
            occupation: body.motherOccupation !== undefined ? String(body.motherOccupation).trim() : existingMother.occupation,
          })
          .where(eq(schema.guardians.id, existingMother.id));
      } else if (body.motherNameEn) {
        await db.insert(schema.guardians).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: existing.id,
          relationship: 'MOTHER',
          fullNameEn: String(body.motherNameEn).trim(),
          fullNameNp: body.motherNameNp ? String(body.motherNameNp).trim() : String(body.motherNameEn).trim(),
          phone: body.motherPhone ? String(body.motherPhone).trim() : '',
          occupation: body.motherOccupation || 'Homemaker',
          isPrimaryContact: false,
        });
      }
    }

    // Update or insert Health Record
    if (
      body.allergies !== undefined ||
      body.chronicConditions !== undefined ||
      body.regularMedications !== undefined ||
      body.preferredHospital !== undefined ||
      body.emergencyContactName !== undefined ||
      body.emergencyContactPhone !== undefined ||
      body.bloodGroup !== undefined
    ) {
      const existingHealth = await db.query.studentHealthRecords.findFirst({
        where: (table: any, { eq }: any) => eq(table.studentId, existing.id),
      });
      if (existingHealth) {
        await db.update(schema.studentHealthRecords)
          .set({
            bloodGroup: body.bloodGroup ?? existingHealth.bloodGroup,
            allergies: body.allergies ?? existingHealth.allergies,
            chronicConditions: body.chronicConditions ?? existingHealth.chronicConditions,
            regularMedications: body.regularMedications ?? existingHealth.regularMedications,
            preferredHospital: body.preferredHospital ?? existingHealth.preferredHospital,
            emergencyContactName: body.emergencyContactName ?? existingHealth.emergencyContactName,
            emergencyContactPhone: body.emergencyContactPhone ?? existingHealth.emergencyContactPhone,
            updatedAt: new Date(),
          })
          .where(eq(schema.studentHealthRecords.id, existingHealth.id));
      } else {
        await db.insert(schema.studentHealthRecords).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: existing.id,
          bloodGroup: body.bloodGroup || 'UNKNOWN',
          allergies: body.allergies || 'None',
          chronicConditions: body.chronicConditions || 'None',
          regularMedications: body.regularMedications || 'None',
          preferredHospital: body.preferredHospital || 'Local Health Post',
          emergencyContactName: body.emergencyContactName || null,
          emergencyContactPhone: body.emergencyContactPhone || null,
          immunizationStatus: 'COMPLETE',
        });
      }
    }

    return reply.send({ message: 'Student profile updated successfully' });
  });

  // 5. Update Health Information Specifically
  fastify.put('/:id/health', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const student = await db.query.students.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    const existingHealth = await db.query.studentHealthRecords.findFirst({
      where: (table: any, { eq }: any) => eq(table.studentId, id),
    });

    if (existingHealth) {
      await db.update(schema.studentHealthRecords)
        .set({
          bloodGroup: body.bloodGroup ?? existingHealth.bloodGroup,
          allergies: body.allergies ?? existingHealth.allergies,
          chronicConditions: body.chronicConditions ?? existingHealth.chronicConditions,
          regularMedications: body.regularMedications ?? existingHealth.regularMedications,
          physicalAccommodations: body.physicalAccommodations ?? existingHealth.physicalAccommodations,
          emergencyContactName: body.emergencyContactName ?? existingHealth.emergencyContactName,
          emergencyContactPhone: body.emergencyContactPhone ?? existingHealth.emergencyContactPhone,
          preferredHospital: body.preferredHospital ?? existingHealth.preferredHospital,
          immunizationStatus: body.immunizationStatus ?? existingHealth.immunizationStatus,
          medicalNotes: body.medicalNotes ?? existingHealth.medicalNotes,
          updatedAt: new Date(),
        })
        .where(eq(schema.studentHealthRecords.id, existingHealth.id));
    } else {
      await db.insert(schema.studentHealthRecords).values({
        id: crypto.randomUUID(),
        schoolId: currentUser.schoolId,
        studentId: id,
        bloodGroup: body.bloodGroup || 'UNKNOWN',
        allergies: body.allergies || 'None',
        chronicConditions: body.chronicConditions || 'None',
        regularMedications: body.regularMedications || 'None',
        physicalAccommodations: body.physicalAccommodations || 'None',
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        preferredHospital: body.preferredHospital || 'Local Health Post',
        immunizationStatus: body.immunizationStatus || 'COMPLETE',
        medicalNotes: body.medicalNotes || null,
      });
    }

    if (body.bloodGroup) {
      await db.update(schema.students)
        .set({ bloodGroup: body.bloodGroup })
        .where(eq(schema.students.id, id));
    }

    return reply.send({ message: 'Health records updated successfully' });
  });

  // Delete Student
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const student = await db.query.students.findFirst({
      where: (table: any, { eq, or, and }: any) =>
        and(or(eq(table.id, id), eq(table.studentId, id)), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    // Delete cascading records: guardians, health records, enrollments, then student
    await db.delete(schema.guardians).where(eq(schema.guardians.studentId, student.id));
    await db.delete(schema.studentHealthRecords).where(eq(schema.studentHealthRecords.studentId, student.id));
    await db.delete(schema.studentEnrollments).where(eq(schema.studentEnrollments.studentId, student.id));
    await db.delete(schema.students).where(eq(schema.students.id, student.id));

    return reply.send({ success: true, message: 'Student deleted successfully' });
  });

  // 6. Bulk Promote Students
  fastify.post('/bulk-promote', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as {
      targetAcademicYearId: string;
      targetClassId: string;
      targetSectionId?: string;
      promotions: {
        studentId: string;
        status: 'PROMOTED' | 'RETAINED' | 'TRANSFERRED' | 'GRADUATED';
        rollNumber?: number;
        remarks?: string;
        principalOverride?: boolean;
      }[];
    };

    if (!body.targetAcademicYearId || !body.targetClassId || !body.promotions || !Array.isArray(body.promotions)) {
      return reply.status(400).send({ message: 'Missing bulk promotion requirements' });
    }

    let processedCount = 0;
    for (const p of body.promotions) {
      const student = await db.query.students.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.id, p.studentId), eq(table.schoolId, currentUser.schoolId)),
      });

      if (student) {
        // Record enrollment in target academic year
        await db.insert(schema.studentEnrollments).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: student.id,
          academicYearId: body.targetAcademicYearId,
          classId: p.status === 'PROMOTED' ? body.targetClassId : student.currentClassId,
          sectionId: p.status === 'PROMOTED' ? (body.targetSectionId || null) : student.currentSectionId,
          rollNumber: p.rollNumber || null,
          status: p.status,
          promotionDate: new Date(),
          promotionRemarks: p.remarks || null,
          principalOverride: Boolean(p.principalOverride),
        });

        // Update student placement
        const newClassId = p.status === 'PROMOTED' ? body.targetClassId : student.currentClassId;
        const newSectionId = p.status === 'PROMOTED' ? (body.targetSectionId || null) : student.currentSectionId;
        const newStatus = p.status === 'PROMOTED' ? 'ACTIVE' : p.status;

        await db.update(schema.students)
          .set({
            currentClassId: newClassId,
            currentSectionId: newSectionId,
            currentRollNumber: p.rollNumber ?? student.currentRollNumber,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(schema.students.id, student.id));

        processedCount++;
      }
    }

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'BULK_PROMOTE_STUDENTS',
      entity: 'StudentEnrollment',
      entityId: body.targetClassId,
      newValues: { studentCount: processedCount, targetClassId: body.targetClassId },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({
      message: `Bulk promotion completed for ${processedCount} students successfully`,
      count: processedCount,
    });
  });

  // 7. Admissions Queue
  fastify.get('/admissions', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const admissions = await db.query.studentAdmissions.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      orderBy: (table: any, { desc }: any) => [desc(table.createdAt)],
    });

    return reply.send({ admissions });
  });

  fastify.post('/admissions', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const school = await db.query.schools.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, currentUser.schoolId),
    });
    const year = school?.activeAcademicYearBs || 2083;

    const count = (
      await db.query.studentAdmissions.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      })
    ).length;

    const appNumber = `APP-${year}-${String(count + 1).padStart(4, '0')}`;
    const id = crypto.randomUUID();

    await db.insert(schema.studentAdmissions).values({
      id,
      schoolId: currentUser.schoolId,
      applicationNumber: appNumber,
      academicYearId: body.academicYearId || school?.id,
      targetClassId: body.targetClassId,
      targetStreamId: body.targetStreamId || null,
      applicantNameEn: body.applicantNameEn,
      applicantNameNp: body.applicantNameNp || body.applicantNameEn,
      dobBs: body.dobBs,
      gender: body.gender || 'OTHER',
      guardianName: body.guardianName,
      guardianPhone: body.guardianPhone,
      quotaCategory: body.quotaCategory || 'GENERAL',
      entranceScore: body.entranceScore ? Number(body.entranceScore) : null,
      meritRank: body.meritRank ? Number(body.meritRank) : null,
      applicationStatus: 'SUBMITTED',
      reviewerRemarks: body.reviewerRemarks || null,
    });

    return reply.status(201).send({
      message: 'Admission application submitted successfully',
      id,
      applicationNumber: appNumber,
    });
  });

  fastify.put('/admissions/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const { status, remarks } = request.body as { status: string; remarks?: string };

    const app = await db.query.studentAdmissions.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!app) {
      return reply.status(404).send({ message: 'Application not found' });
    }

    await db.update(schema.studentAdmissions)
      .set({
        applicationStatus: status,
        reviewerRemarks: remarks || app.reviewerRemarks,
      })
      .where(eq(schema.studentAdmissions.id, id));

    return reply.send({ message: `Application status updated to ${status}` });
  });

  // 6. Bulk Import Students & Parents from IEMIS Excel Data
  fastify.post('/bulk-import', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as { students: any[] };

    if (!body || !Array.isArray(body.students) || body.students.length === 0) {
      return reply.status(400).send({ message: 'No student records provided for bulk import' });
    }

    const school = await db.query.schools.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, currentUser.schoolId),
    });

    const activeAcademicYear =
      (await db.query.academicYears.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.schoolId, currentUser.schoolId), eq(table.isCurrent, true)),
      })) ||
      (await db.query.academicYears.findFirst({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      }));

    const admissionYearBs = activeAcademicYear ? activeAcademicYear.yearBs : 2083;

    const allClasses = await db.query.classes.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const allSections = await db.query.sections.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    // Existing students for duplicate checking
    const existingStudents = await db.query.students.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });

    const existingIemisMap = new Map<string, any>();
    for (const st of existingStudents) {
      if (st.iemisCode) {
        existingIemisMap.set(st.iemisCode.trim().toLowerCase(), st);
      }
    }

    // Sequence calculation for permanent student ID: [yearBs]-[0001]
    const yearStudents = existingStudents.filter((s: any) => s.admissionYearBs === admissionYearBs);
    let currentSeq = 0;
    for (const s of yearStudents) {
      const match = s.studentId?.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > currentSeq) currentSeq = num;
      }
    }

    const seenInFileIemis = new Set<string>();
    const skippedDuplicates: Array<{ iemisCode: string; name: string; reason: string }> = [];
    const invalidRecords: Array<{ name: string; reason: string }> = [];
    const validRecords: any[] = [];

    // Stage 1: Validate & filter duplicates
    for (let idx = 0; idx < body.students.length; idx++) {
      const row = body.students[idx];
      const iemis = (
        row.iemisCode ||
        row['Student Id'] ||
        row.studentId ||
        row['IEMIS Code'] ||
        ''
      )
        ? String(row.iemisCode || row['Student Id'] || row.studentId || row['IEMIS Code']).trim()
        : '';

      // Extract names supporting both split and FullName
      let fNameEn = row.firstNameEn ? String(row.firstNameEn).trim() : '';
      let mNameEn = row.middleNameEn ? String(row.middleNameEn).trim() : '';
      let lNameEn = row.lastNameEn ? String(row.lastNameEn).trim() : '';

      const rawFullName = String(row.fullName || row.FullName || row['Full Name'] || '').trim();
      if ((!fNameEn || !lNameEn) && rawFullName) {
        const parts = rawFullName.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
          fNameEn = parts[0];
          lNameEn = parts[0];
        } else if (parts.length === 2) {
          fNameEn = parts[0];
          lNameEn = parts[1];
        } else if (parts.length > 2) {
          fNameEn = parts[0];
          mNameEn = parts.slice(1, -1).join(' ');
          lNameEn = parts[parts.length - 1];
        }
      }

      const rowName =
        `${fNameEn} ${lNameEn}`.trim() ||
        `${row.firstNameNp || ''} ${row.lastNameNp || ''}`.trim() ||
        rawFullName ||
        `Row #${idx + 1}`;

      // Duplicate Check 1: Existing in Database
      if (iemis && existingIemisMap.has(iemis.toLowerCase())) {
        const existing = existingIemisMap.get(iemis.toLowerCase());
        skippedDuplicates.push({
          iemisCode: iemis,
          name: rowName,
          reason: `IEMIS ID "${iemis}" is already registered in the system for student "${existing.firstNameEn} ${existing.lastNameEn}".`,
        });
        continue;
      }

      // Duplicate Check 2: Repeated within this Excel sheet
      if (iemis) {
        if (seenInFileIemis.has(iemis.toLowerCase())) {
          skippedDuplicates.push({
            iemisCode: iemis,
            name: rowName,
            reason: `Duplicate IEMIS ID "${iemis}" is repeated multiple times inside this Excel file.`,
          });
          continue;
        }
        seenInFileIemis.add(iemis.toLowerCase());
      }

      // Validate required names
      if (!fNameEn || !lNameEn) {
        invalidRecords.push({
          name: rowName,
          reason: 'Student Full Name (or First Name and Last Name) is required.',
        });
        continue;
      }

      // Resolve class
      const classInput = String(
        row.currentClass ||
        row['CurrentClass'] ||
        row.classCode ||
        row.className ||
        row.classId ||
        '10'
      ).trim();

      const normClassInput = classInput.toLowerCase().replace(/^(grade|class|कक्षा)\s*/i, '').trim();

      let targetClass = allClasses.find(
        (c: any) =>
          c.id === row.classId ||
          c.code?.toLowerCase() === classInput.toLowerCase() ||
          c.code?.toLowerCase() === normClassInput ||
          c.nameEn?.toLowerCase() === classInput.toLowerCase() ||
          c.nameEn?.toLowerCase() === `grade ${normClassInput}` ||
          c.nameEn?.toLowerCase() === `class ${normClassInput}` ||
          c.nameNp?.toLowerCase() === classInput.toLowerCase()
      );
      if (!targetClass) {
        targetClass = allClasses.find(
          (c: any) => c.nameEn?.toLowerCase().includes(classInput.toLowerCase())
        );
      }
      if (!targetClass && allClasses.length > 0) {
        targetClass = allClasses[0];
      }

      if (!targetClass) {
        invalidRecords.push({
          name: rowName,
          reason: `Target class "${classInput}" could not be resolved.`,
        });
        continue;
      }

      // Resolve section
      const sectionInput = String(
        row.section ||
        row['Section'] ||
        row.sectionCode ||
        row.sectionName ||
        row.sectionId ||
        'A'
      ).trim().toUpperCase();

      const normSectionInput = sectionInput.replace(/^SECTION\s*/i, '').trim();

      let targetSection = allSections.find(
        (s: any) =>
          s.classId === targetClass!.id &&
          (s.id === row.sectionId ||
            s.code?.toUpperCase() === normSectionInput ||
            s.nameEn?.toUpperCase() === `SECTION ${normSectionInput}` ||
            s.nameEn?.toUpperCase() === normSectionInput)
      );
      if (!targetSection) {
        targetSection = allSections.find((s: any) => s.classId === targetClass!.id);
      }

      // Address parsing
      let permLocalLevel = row.permLocalLevel;
      let permWardNumber = row.permWardNumber ? Number(row.permWardNumber) : undefined;
      let permDistrict = row.permDistrict;
      let permProvince = row.permProvince;

      const rawAddr = row.permanentAddress || row['Permanent Address'];
      if ((!permLocalLevel || !permDistrict) && rawAddr && typeof rawAddr === 'string') {
        const parts = rawAddr.split(',').map((s: string) => s.trim());
        const localPart = parts[0] || 'Nagarain-2';
        permDistrict = parts[1] || 'Dhanusha';
        permLocalLevel = localPart;
        const match = localPart.match(/^([a-zA-Z\s]+)-?(\d+)?$/);
        if (match) {
          permLocalLevel = match[1].trim();
          if (match[2]) permWardNumber = parseInt(match[2], 10);
        }
        if (permDistrict.toLowerCase().includes('dhanusha')) {
          permProvince = 'Madhesh Province';
        }
      }

      validRecords.push({
        ...row,
        fNameEn,
        mNameEn,
        lNameEn,
        resolvedIemisCode: iemis,
        resolvedClass: targetClass,
        resolvedSection: targetSection,
        permLocalLevel: permLocalLevel || school?.localLevel || 'Nagarain',
        permWardNumber: permWardNumber || Number(school?.wardNumber || 2),
        permDistrict: permDistrict || school?.district || 'Dhanusha',
        permProvince: permProvince || school?.province || 'Madhesh Province',
      });
    }

    // Stage 2: Database Insertions for all valid records
    const admittedStudents: any[] = [];
    const todayBs = '2083-01-01';
    const todayAd = new Date().toISOString().split('T')[0];

    for (const record of validRecords) {
      currentSeq++;
      const permanentStudentId = `${admissionYearBs}-${String(currentSeq).padStart(4, '0')}`;
      const studentUuid = crypto.randomUUID();

      const fNameEn = record.fNameEn;
      const lNameEn = record.lNameEn;
      const mNameEn = record.mNameEn || null;

      const fNameNp = record.firstNameNp ? String(record.firstNameNp).trim() : fNameEn;
      const lNameNp = record.lastNameNp ? String(record.lastNameNp).trim() : lNameEn;
      const mNameNp = record.middleNameNp ? String(record.middleNameNp).trim() : null;

      const dobBs = String(record.dobBs || record.DOB || record['DOB'] || '2067-01-01').trim();
      const dobAd = record.dobAd ? String(record.dobAd).trim() : '2010-04-14';
      const rawGender = String(record.gender || record.Gender || 'Male').toUpperCase().trim();
      const gender = rawGender.includes('F') ? 'FEMALE' : rawGender.includes('O') ? 'OTHER' : 'MALE';

      // Insert Student
      await db.insert(schema.students).values({
        id: studentUuid,
        schoolId: currentUser.schoolId,
        studentId: permanentStudentId,
        iemisCode: record.resolvedIemisCode || null,
        firstNameEn: fNameEn,
        middleNameEn: mNameEn,
        lastNameEn: lNameEn,
        firstNameNp: fNameNp,
        middleNameNp: mNameNp,
        lastNameNp: lNameNp,
        dobBs,
        dobAd,
        gender,
        bloodGroup: record.bloodGroup || 'UNKNOWN',
        motherTongue: record.motherTongue || record['Mother Tongue'] || 'Maithali',
        nationality: 'Nepali',
        ethnicityInclusion: record.ethnicityInclusion || 'BRAHMIN_CHHETRI',
        disabilityStatus: record.disabilityStatus || record['Disability Type'] || 'NONE',
        scholarshipEligible: Boolean(record.scholarshipEligible),
        houseId: record.houseId || null,

        permProvince: record.permProvince,
        permDistrict: record.permDistrict,
        permLocalLevel: record.permLocalLevel,
        permWardNumber: record.permWardNumber,
        permTole: record.permTole || record.permanentAddress || 'Tole',

        currProvince: record.permProvince,
        currDistrict: record.permDistrict,
        currLocalLevel: record.permLocalLevel,
        currWardNumber: record.permWardNumber,
        currTole: record.permTole || record.temporaryAddress || 'Tole',

        admissionYearBs,
        admissionDateBs: record.admissionDateBs || todayBs,
        admissionDateAd: record.admissionDateAd || todayAd,
        currentClassId: record.resolvedClass.id,
        currentSectionId: record.resolvedSection?.id || null,
        currentRollNumber: record.rollNumber ? Number(record.rollNumber) : null,
        status: 'ACTIVE',
      });

      // Insert Guardians: Father & Mother
      const fatherName =
        record.fatherNameEn ||
        record['Father Name'] ||
        record.fatherName ||
        record.guardianName ||
        record['Guardian Name'];

      const fatherPhone =
        record.fatherPhone ||
        record.guardianContactNumber ||
        record['Guardian Contact Number'] ||
        record.guardianPhone ||
        record.phone ||
        '9800000000';

      if (fatherName) {
        await db.insert(schema.guardians).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: studentUuid,
          relationship: 'FATHER',
          fullNameEn: String(fatherName).trim(),
          fullNameNp: record.fatherNameNp ? String(record.fatherNameNp).trim() : String(fatherName).trim(),
          phone: String(fatherPhone).trim(),
          occupation: record.fatherOccupation || 'Business',
          isPrimaryContact: true,
        });
      }

      const motherName = record.motherNameEn || record['Mother Name'] || record.motherName;
      if (motherName) {
        await db.insert(schema.guardians).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: studentUuid,
          relationship: 'MOTHER',
          fullNameEn: String(motherName).trim(),
          fullNameNp: record.motherNameNp ? String(record.motherNameNp).trim() : String(motherName).trim(),
          phone: record.motherPhone ? String(record.motherPhone).trim() : String(fatherPhone).trim(),
          occupation: record.motherOccupation || 'Homemaker',
          isPrimaryContact: !fatherName,
        });
      }

      // Insert Health Record
      await db.insert(schema.studentHealthRecords).values({
        id: crypto.randomUUID(),
        schoolId: currentUser.schoolId,
        studentId: studentUuid,
        bloodGroup: record.bloodGroup || 'UNKNOWN',
        allergies: record.allergies || 'None',
        chronicConditions: record.chronicConditions || 'None',
        regularMedications: record.regularMedications || 'None',
        emergencyContactName: fatherName || motherName || 'Guardian',
        emergencyContactPhone: fatherPhone || record.motherPhone || null,
        preferredHospital: 'Local Primary Health Center',
        immunizationStatus: 'COMPLETE',
      });

      // Insert Session Enrollment
      if (activeAcademicYear && record.resolvedClass) {
        await db.insert(schema.studentEnrollments).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          studentId: studentUuid,
          academicYearId: activeAcademicYear.id,
          classId: record.resolvedClass.id,
          sectionId: record.resolvedSection?.id || null,
          rollNumber: record.rollNumber ? Number(record.rollNumber) : null,
          status: 'ENROLLED',
        });
      }

      admittedStudents.push({
        id: studentUuid,
        studentId: permanentStudentId,
        iemisCode: record.iemisCode || null,
        name: `${fNameEn} ${lNameEn}`,
        class: record.resolvedClass.code,
        section: record.resolvedSection?.code || 'A',
      });
    }

    // Insert Audit Log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      userId: currentUser.userId,
      action: 'BULK_IMPORT_IEMIS_STUDENTS',
      entity: 'Student',
      entityId: currentUser.schoolId,
      newValues: {
        importedCount: validRecords.length,
        skippedDuplicateCount: skippedDuplicates.length,
        invalidCount: invalidRecords.length,
      },
    });

    return reply.status(200).send({
      success: true,
      message: `Bulk import completed: ${validRecords.length} student(s) imported. ${skippedDuplicates.length} duplicate(s) and ${invalidRecords.length} invalid record(s) were skipped.`,
      importedCount: validRecords.length,
      duplicateCount: skippedDuplicates.length,
      invalidCount: invalidRecords.length,
      duplicates: skippedDuplicates,
      invalids: invalidRecords,
      students: admittedStudents,
    });
  });

  // 12. Upload / Update Student Photo
  fastify.post('/:id/photo', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const { photoUrl } = request.body as { photoUrl: string };

    if (!photoUrl) {
      return reply.status(400).send({ message: 'photoUrl is required' });
    }

    const student = await db.query.students.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'Student not found' });
    }

    await db
      .update(schema.students)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(schema.students.id, id));

    return reply.send({ message: 'Student photo updated successfully', photoUrl });
  });
}
