import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, or } from 'drizzle-orm';
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
  return '2083-01-01';
}

function getFullNameEn(s: any): string {
  if (!s) return '';
  return [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
}

function getFullNameNp(s: any): string {
  if (!s) return '';
  return [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ');
}

export default async function feeRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // ==========================================
  // 1. Fee Heads (शुल्कका शीर्षकहरू)
  // ==========================================
  fastify.get('/heads', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const heads = await db.query.feeHeads.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.displayOrder), asc(t.createdAt)],
    });

    return reply.send(heads);
  });

  fastify.post('/heads', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.code || !body.nameEn || !body.nameNp) {
      return reply.status(400).send({ message: 'code, nameEn, and nameNp are required' });
    }

    if (body.id) {
      // Update existing
      await db
        .update(schema.feeHeads)
        .set({
          code: body.code.toUpperCase().trim(),
          nameEn: body.nameEn.trim(),
          nameNp: body.nameNp.trim(),
          feeType: body.feeType || 'MONTHLY',
          description: body.description || null,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
          displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
        })
        .where(and(eq(schema.feeHeads.id, body.id), eq(schema.feeHeads.schoolId, currentUser.schoolId)));

      const updated = await db.query.feeHeads.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, body.id),
      });
      return reply.send(updated);
    }

    // Create new
    const newId = crypto.randomUUID();
    await db.insert(schema.feeHeads).values({
      id: newId,
      schoolId: currentUser.schoolId,
      code: body.code.toUpperCase().trim(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      feeType: body.feeType || 'MONTHLY',
      description: body.description || null,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
    });

    const created = await db.query.feeHeads.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, newId),
    });
    return reply.status(201).send(created);
  });

  fastify.delete('/heads/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    // Check if in use
    const usedInStructures = await db.query.feeStructures.findFirst({
      where: (t: any, { eq }: any) => eq(t.feeHeadId, id),
    });
    if (usedInStructures) {
      return reply.status(400).send({ message: 'यस शीर्षकमा कक्षागत शुल्क दर तय गरिएको हुनाले मेटाउन सकिँदैन।' });
    }

    await db
      .delete(schema.feeHeads)
      .where(and(eq(schema.feeHeads.id, id), eq(schema.feeHeads.schoolId, currentUser.schoolId)));

    return reply.send({ success: true, message: 'Fee Head deleted successfully' });
  });

  // ==========================================
  // 2. Fee Structures (कक्षागत शुल्क दर तालिका)
  // ==========================================
  fastify.get('/structures', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { academicYearId, classId } = request.query as {
      academicYearId?: string;
      classId?: string;
    };

    const structures = await db.query.feeStructures.findMany({
      where: (t: any, { eq, and }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId)];
        if (academicYearId) conds.push(eq(t.academicYearId, academicYearId));
        if (classId) conds.push(eq(t.classId, classId));
        return and(...conds);
      },
    });

    // Enrich with FeeHeads, Classes, Streams
    const [heads, classes, streams] = await Promise.all([
      db.query.feeHeads.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.streams.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const headMap = new Map<string, any>(heads.map((h: any) => [h.id, h]));
    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));
    const streamMap = new Map<string, any>(streams.map((s: any) => [s.id, s]));

    const enriched = structures.map((st: any) => {
      const h = headMap.get(st.feeHeadId);
      const c = classMap.get(st.classId);
      const stream = streamMap.get(st.streamId);
      return {
        ...st,
        feeHead: h,
        headCode: h?.code,
        headNameEn: h?.nameEn,
        headNameNp: h?.nameNp,
        feeType: h?.feeType,
        classNameEn: c?.nameEn,
        classNameNp: c?.nameNp,
        streamNameEn: stream?.nameEn,
      };
    });

    return reply.send(enriched);
  });

  fastify.post('/structures', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      if (!item.academicYearId || !item.classId || !item.feeHeadId) continue;
      const amount = Number(item.amount) || 0;

      const existing = await db.query.feeStructures.findFirst({
        where: (t: any, { eq, and }: any) =>
          and(
            eq(t.academicYearId, item.academicYearId),
            eq(t.classId, item.classId),
            eq(t.feeHeadId, item.feeHeadId),
            eq(t.schoolId, currentUser.schoolId)
          ),
      });

      if (existing) {
        await db
          .update(schema.feeStructures)
          .set({
            amount,
            streamId: item.streamId || null,
          })
          .where(eq(schema.feeStructures.id, existing.id));
      } else {
        await db.insert(schema.feeStructures).values({
          id: crypto.randomUUID(),
          schoolId: currentUser.schoolId,
          academicYearId: item.academicYearId,
          classId: item.classId,
          streamId: item.streamId || null,
          feeHeadId: item.feeHeadId,
          amount,
        });
      }
    }

    return reply.send({ success: true, count: items.length });
  });

  // ==========================================
  // 3. Student Discounts & Scholarships with Document Upload
  // ==========================================
  fastify.get('/discounts', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId, studentId, academicYearId } = request.query as {
      classId?: string;
      studentId?: string;
      academicYearId?: string;
    };

    const discounts = await db.query.studentFeeDiscounts.findMany({
      where: (t: any, { eq, and }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId)];
        if (studentId) conds.push(eq(t.studentId, studentId));
        if (academicYearId) conds.push(eq(t.academicYearId, academicYearId));
        return and(...conds);
      },
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    const [students, classes, heads] = await Promise.all([
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.feeHeads.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));
    const headMap = new Map<string, any>(heads.map((h: any) => [h.id, h]));

    let filtered = discounts;
    if (classId) {
      filtered = discounts.filter((d: any) => {
        const s = studentMap.get(d.studentId);
        return s && s.currentClassId === classId;
      });
    }

    const enriched = filtered.map((d: any) => {
      const s = studentMap.get(d.studentId);
      const c = s ? classMap.get(s.currentClassId) : null;
      const h = d.feeHeadId ? headMap.get(d.feeHeadId) : null;
      return {
        ...d,
        studentNameEn: getFullNameEn(s),
        studentNameNp: getFullNameNp(s),
        admissionNumber: s?.studentId,
        rollNumber: s?.currentRollNumber,
        classId: s?.currentClassId,
        classNameEn: c?.nameEn,
        classNameNp: c?.nameNp,
        headNameEn: h ? h.nameEn : 'All Fees / Tuition',
        headNameNp: h ? h.nameNp : 'सम्पूर्ण शुल्क / पढाइ शुल्क',
      };
    });

    return reply.send(enriched);
  });

  fastify.post('/discounts', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.studentId || !body.academicYearId || body.discountValue === undefined) {
      return reply.status(400).send({ message: 'studentId, academicYearId, and discountValue are required' });
    }

    const discountValue = Number(body.discountValue) || 0;
    const discountType = body.discountType || 'PERCENTAGE';
    const reason = body.reason || 'MERIT';
    const feeHeadId = body.feeHeadId || null;
    const documentUrl = body.documentUrl || null;
    const documentName = body.documentName || null;

    if (body.id) {
      // Update
      await db
        .update(schema.studentFeeDiscounts)
        .set({
          feeHeadId,
          discountType,
          discountValue,
          reason,
          documentUrl: documentUrl !== undefined ? documentUrl : undefined,
          documentName: documentName !== undefined ? documentName : undefined,
          uploadedAt: documentUrl ? new Date() : undefined,
          approvedById: currentUser.userId || currentUser.id,
        })
        .where(and(eq(schema.studentFeeDiscounts.id, body.id), eq(schema.studentFeeDiscounts.schoolId, currentUser.schoolId)));

      const updated = await db.query.studentFeeDiscounts.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, body.id),
      });
      return reply.send(updated);
    }

    // Create new
    const newId = crypto.randomUUID();
    await db.insert(schema.studentFeeDiscounts).values({
      id: newId,
      schoolId: currentUser.schoolId,
      studentId: body.studentId,
      academicYearId: body.academicYearId,
      feeHeadId,
      discountType,
      discountValue,
      reason,
      documentUrl,
      documentName,
      uploadedAt: documentUrl ? new Date() : null,
      approvedById: currentUser.userId || currentUser.id,
    });

    const created = await db.query.studentFeeDiscounts.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, newId),
    });
    return reply.status(201).send(created);
  });

  fastify.delete('/discounts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.studentFeeDiscounts)
      .where(and(eq(schema.studentFeeDiscounts.id, id), eq(schema.studentFeeDiscounts.schoolId, currentUser.schoolId)));

    return reply.send({ success: true, message: 'Discount deleted successfully' });
  });

  // ==========================================
  // 4. Generate Monthly Fee Bills (मासिक बिल उत्पादन)
  // ==========================================
  const NEPALI_MONTH_NAMES = [
    { bs: 1, en: 'Baisakh', np: 'बैशाख' },
    { bs: 2, en: 'Jestha', np: 'जेठ' },
    { bs: 3, en: 'Ashadh', np: 'असार' },
    { bs: 4, en: 'Shrawan', np: 'साउन' },
    { bs: 5, en: 'Bhadra', np: 'भदौ' },
    { bs: 6, en: 'Ashwin', np: 'असोज' },
    { bs: 7, en: 'Kartik', np: 'कार्तिक' },
    { bs: 8, en: 'Mangsir', np: 'मंसिर' },
    { bs: 9, en: 'Poush', np: 'पुस' },
    { bs: 10, en: 'Magh', np: 'माघ' },
    { bs: 11, en: 'Falgun', np: 'फागुन' },
    { bs: 12, en: 'Chaitra', np: 'चैत' },
  ];

  fastify.post('/generate-monthly-bills', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { academicYearId, monthBs, yearBs, classId, dueDateBs } = request.body as {
      academicYearId: string;
      monthBs: number;
      yearBs?: number;
      classId?: string;
      dueDateBs?: string;
    };

    if (!academicYearId || !monthBs) {
      return reply.status(400).send({ message: 'academicYearId and monthBs are required' });
    }

    const currentYearBs = Number(yearBs) || 2083;
    const targetMonth = NEPALI_MONTH_NAMES.find((m) => m.bs === Number(monthBs)) || {
      bs: Number(monthBs),
      en: `Month ${monthBs}`,
      np: `महिना ${monthBs}`,
    };

    // 1. Get active students
    const studentConds = [
      eq(schema.students.schoolId, currentUser.schoolId),
      eq(schema.students.status, 'ACTIVE'),
    ];
    if (classId) {
      studentConds.push(eq(schema.students.currentClassId, classId));
    }
    const targetStudents = await db.query.students.findMany({
      where: (t: any, { and }: any) => and(...studentConds),
    });

    if (targetStudents.length === 0) {
      return reply.status(400).send({ message: 'कुनै सक्रिय विद्यार्थी फेला परेन (No active students found)' });
    }

    // 2. Fetch all fee structures, heads, and discounts
    const [allStructures, allHeads, allDiscounts] = await Promise.all([
      db.query.feeStructures.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.academicYearId, academicYearId)),
      }),
      db.query.feeHeads.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
      db.query.studentFeeDiscounts.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.academicYearId, academicYearId)),
      }),
    ]);

    const headMap = new Map<string, any>(allHeads.map((h: any) => [h.id, h]));
    const discountsByStudent = new Map<string, any[]>();
    for (const d of allDiscounts) {
      const list = discountsByStudent.get(d.studentId) || [];
      list.push(d);
      discountsByStudent.set(d.studentId, list);
    }

    let generatedCount = 0;
    let skippedCount = 0;

    for (const student of targetStudents) {
      // Check if bill already exists for this student, year and month
      const existingBill = await db.query.studentFeeBills.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.studentId, student.id),
            eq(t.academicYearId, academicYearId),
            eq(t.monthBs, Number(monthBs))
          ),
      });

      if (existingBill) {
        skippedCount++;
        continue;
      }

      // Applicable structures for student's class
      const classStructures = allStructures.filter((st: any) => {
        return st.classId === student.currentClassId;
      });

      const applicableStructures = classStructures.filter((st: any) => {
        const head = headMap.get(st.feeHeadId);
        if (!head || !head.isActive) return false;
        if (head.feeType === 'MONTHLY') return true;
        if (head.feeType === 'ANNUAL' && Number(monthBs) === 1) return true;
        if (head.feeType === 'TERM' && [3, 6, 9, 12].includes(Number(monthBs))) return true;
        return false;
      });

      const studentDiscounts = discountsByStudent.get(student.id) || [];

      // Calculate items
      let subTotal = 0;
      let totalDiscount = 0;
      const billItemsToInsert: any[] = [];

      for (const st of applicableStructures) {
        const head = headMap.get(st.feeHeadId);
        const itemAmount = Number(st.amount) || 0;
        let itemDiscount = 0;

        const disc = studentDiscounts.find(
          (d: any) => !d.feeHeadId || d.feeHeadId === st.feeHeadId
        );

        if (disc) {
          if (disc.discountType === 'PERCENTAGE') {
            itemDiscount = Math.round((itemAmount * (Number(disc.discountValue) || 0)) / 100);
          } else if (disc.discountType === 'FIXED_AMOUNT') {
            itemDiscount = Math.min(itemAmount, Number(disc.discountValue) || 0);
          } else if (disc.discountType === 'FULL_WAIVER') {
            itemDiscount = itemAmount;
          }
        }

        const netAmount = Math.max(0, itemAmount - itemDiscount);
        subTotal += itemAmount;
        totalDiscount += itemDiscount;

        billItemsToInsert.push({
          feeHeadId: st.feeHeadId,
          headNameEn: head?.nameEn || 'Fee Head',
          headNameNp: head?.nameNp || 'शुल्क शीर्षक',
          amount: itemAmount,
          discountAmount: itemDiscount,
          netAmount,
        });
      }

      // Check previous unpaid balance
      const pastBills = await db.query.studentFeeBills.findMany({
        where: (t: any, { and, eq }: any) =>
          and(
            eq(t.studentId, student.id),
            eq(t.schoolId, currentUser.schoolId)
          ),
      });

      const previousDue = pastBills.reduce((acc: number, b: any) => acc + (Number(b.dueAmount) || 0), 0);
      const totalAmount = Math.max(0, subTotal - totalDiscount) + previousDue;

      const rawCode = (student.studentId || student.id.slice(0, 4)).replace(/[^a-zA-Z0-9]/g, '');
      const billNumber = `INV-${currentYearBs}-${String(monthBs).padStart(2, '0')}-${rawCode}`;

      const billId = crypto.randomUUID();
      await db.insert(schema.studentFeeBills).values({
        id: billId,
        schoolId: currentUser.schoolId,
        billNumber,
        studentId: student.id,
        classId: student.currentClassId,
        sectionId: student.currentSectionId || null,
        academicYearId,
        monthBs: Number(monthBs),
        yearBs: currentYearBs,
        titleEn: `${targetMonth.en} ${currentYearBs} Monthly Fee`,
        titleNp: `${targetMonth.np} ${currentYearBs} मासिक शुल्क`,
        subTotal,
        discountAmount: totalDiscount,
        previousDue,
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        status: 'UNPAID',
        dueDateBs: dueDateBs || `${currentYearBs}-${String(monthBs).padStart(2, '0')}-25`,
        generatedById: currentUser.userId || currentUser.id,
      });

      for (const item of billItemsToInsert) {
        await db.insert(schema.studentFeeBillItems).values({
          id: crypto.randomUUID(),
          billId,
          ...item,
        });
      }

      generatedCount++;
    }

    return reply.send({
      success: true,
      generatedCount,
      skippedCount,
      totalStudents: targetStudents.length,
      message: `${generatedCount} वटा मासिक बिल सफलतापूर्वक तयार गरियो (${skippedCount} वटा पहिल्यै तयार भएकोले छोडियो)।`,
    });
  });

  // ==========================================
  // 5. Student Fee Dues Statement (विद्यार्थी बक्यौता स्टेटमेन्ट)
  // ==========================================
  fastify.get('/students/:studentId/due', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { studentId } = request.params as { studentId: string };

    const student = await db.query.students.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, studentId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!student) {
      return reply.status(404).send({ message: 'विद्यार्थी फेला परेन (Student not found)' });
    }

    const [cls, section, bills, payments, guardians] = await Promise.all([
      db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentClassId) }),
      student.currentSectionId
        ? db.query.sections.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentSectionId) })
        : null,
      db.query.studentFeeBills.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.studentId, studentId), eq(t.schoolId, currentUser.schoolId)),
        orderBy: (t: any, { desc }: any) => [desc(t.yearBs), desc(t.monthBs)],
      }),
      db.query.feePayments.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.studentId, studentId), eq(t.schoolId, currentUser.schoolId)),
        orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      }),
      db.query.guardians.findMany({ where: (t: any, { eq }: any) => eq(t.studentId, studentId) }),
    ]);

    const allBillIds = bills.map((b: any) => b.id);
    let allItems: any[] = [];
    if (allBillIds.length > 0) {
      allItems = await db.query.studentFeeBillItems.findMany();
    }
    const itemsByBill = new Map<string, any[]>();
    for (const it of allItems) {
      const list = itemsByBill.get(it.billId) || [];
      list.push(it);
      itemsByBill.set(it.billId, list);
    }

    const billsWithItems = bills.map((b: any) => ({
      ...b,
      items: itemsByBill.get(b.id) || [],
    }));

    const primaryGuardian =
      guardians.find((g: any) => g.isPrimaryContact || g.relationship === 'FATHER') || guardians[0];

    const totalCurrentBilled = bills.reduce((acc: number, b: any) => acc + (Number(b.totalAmount) || 0), 0);
    const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amountPaid) || 0), 0);
    const totalDue = bills.reduce((acc: number, b: any) => acc + (Number(b.dueAmount) || 0), 0);

    return reply.send({
      student: {
        id: student.id,
        admissionNumber: student.studentId,
        fullNameEn: getFullNameEn(student),
        fullNameNp: getFullNameNp(student),
        classId: student.currentClassId,
        classNameEn: cls?.nameEn || '',
        classNameNp: cls?.nameNp || '',
        sectionNameEn: section?.nameEn || '',
        rollNumber: student.currentRollNumber,
        fatherName: primaryGuardian?.fullNameNp || primaryGuardian?.fullNameEn || '',
        primaryPhone: primaryGuardian?.phone || '',
      },
      bills: billsWithItems,
      totalPreviousDue: 0,
      totalCurrentBilled,
      totalPaid,
      totalDue,
      recentPayments: payments,
    });
  });

  // ==========================================
  // 6. Fee Collection & Payment Recording (शुल्क संकलन तथा भुक्तानी)
  // Supports CASH, QR_CODE, BANK_TRANSFER, CHEQUE
  // ==========================================
  fastify.post('/collect', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as {
      studentId: string;
      billId?: string;
      amountPaid: number;
      paymentMode: 'CASH' | 'QR_CODE' | 'BANK_TRANSFER' | 'CHEQUE';
      transactionRef?: string;
      qrBankProvider?: string;
      paymentDateBs?: string;
      remarks?: string;
    };

    if (!body.studentId || !body.amountPaid || body.amountPaid <= 0) {
      return reply.status(400).send({ message: 'studentId and positive amountPaid are required' });
    }

    const student = await db.query.students.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, body.studentId), eq(t.schoolId, currentUser.schoolId)),
    });
    if (!student) {
      return reply.status(404).send({ message: 'विद्यार्थी फेला परेन' });
    }

    const payDateBs = body.paymentDateBs || getTodayBs();
    const payDateAd = new Date().toISOString().split('T')[0];

    const totalReceipts = await db.query.feePayments.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const seq = totalReceipts.length + 1;
    const yearPrefix = payDateBs.slice(0, 4) || '2083';
    const receiptNumber = `REC-${yearPrefix}-${String(seq).padStart(5, '0')}`;

    let remainingToDistribute = Number(body.amountPaid);
    let targetBillId = body.billId || null;

    if (targetBillId) {
      const bill = await db.query.studentFeeBills.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.id, targetBillId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (bill) {
        const newPaid = Number(bill.paidAmount) + remainingToDistribute;
        const newDue = Math.max(0, Number(bill.totalAmount) - newPaid);
        const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

        await db
          .update(schema.studentFeeBills)
          .set({
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(schema.studentFeeBills.id, bill.id));
      }
    } else {
      const unpaidBills = await db.query.studentFeeBills.findMany({
        where: (t: any, { and, eq, or }: any) =>
          and(
            eq(t.studentId, body.studentId),
            eq(t.schoolId, currentUser.schoolId),
            or(eq(t.status, 'UNPAID'), eq(t.status, 'PARTIAL'))
          ),
        orderBy: (t: any, { asc }: any) => [asc(t.yearBs), asc(t.monthBs)],
      });

      if (unpaidBills.length > 0) {
        targetBillId = unpaidBills[0].id;
        for (const b of unpaidBills) {
          if (remainingToDistribute <= 0) break;
          const billDue = Number(b.dueAmount) || 0;
          const payTowardsBill = Math.min(billDue, remainingToDistribute);
          const newPaid = Number(b.paidAmount) + payTowardsBill;
          const newDue = Math.max(0, Number(b.totalAmount) - newPaid);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

          await db
            .update(schema.studentFeeBills)
            .set({
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(schema.studentFeeBills.id, b.id));

          remainingToDistribute -= payTowardsBill;
        }
      }
    }

    const paymentId = crypto.randomUUID();
    await db.insert(schema.feePayments).values({
      id: paymentId,
      schoolId: currentUser.schoolId,
      receiptNumber,
      studentId: body.studentId,
      billId: targetBillId,
      amountPaid: Number(body.amountPaid),
      paymentMode: body.paymentMode || 'CASH',
      transactionRef: body.transactionRef || null,
      qrBankProvider: body.qrBankProvider || null,
      paymentDateBs: payDateBs,
      paymentDateAd: payDateAd,
      remarks: body.remarks || null,
      receivedById: currentUser.userId || currentUser.id,
      printedCount: 0,
    });

    const payment = await db.query.feePayments.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, paymentId),
    });

    return reply.status(201).send({
      success: true,
      receiptNumber,
      payment,
      message: 'शुल्क भुक्तानी सफलतापूर्वक प्रविष्टि गरियो।',
    });
  });

  // ==========================================
  // 7. Official Receipt Printable Payload (रसिद छपाइ डाटा)
  // ==========================================
  fastify.get('/receipts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const payment = await db.query.feePayments.findFirst({
      where: (t: any, { and, eq, or }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          or(eq(t.id, id), eq(t.receiptNumber, id))
        ),
    });

    if (!payment) {
      return reply.status(404).send({ message: 'रसिद फेला परेन (Receipt not found)' });
    }

    // Increment print count
    await db
      .update(schema.feePayments)
      .set({
        printedCount: (payment.printedCount || 0) + 1,
      })
      .where(eq(schema.feePayments.id, payment.id));

    const [school, student, bill, receiver] = await Promise.all([
      db.query.schools.findFirst({ where: (t: any, { eq }: any) => eq(t.id, currentUser.schoolId) }),
      db.query.students.findFirst({ where: (t: any, { eq }: any) => eq(t.id, payment.studentId) }),
      payment.billId
        ? db.query.studentFeeBills.findFirst({ where: (t: any, { eq }: any) => eq(t.id, payment.billId) })
        : null,
      payment.receivedById
        ? db.query.users.findFirst({ where: (t: any, { eq }: any) => eq(t.id, payment.receivedById) })
        : null,
    ]);

    let billItems: any[] = [];
    if (bill) {
      billItems = await db.query.studentFeeBillItems.findMany({
        where: (t: any, { eq }: any) => eq(t.billId, bill.id),
      });
    }

    const cls = student?.currentClassId
      ? await db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentClassId) })
      : null;

    const studentBills = await db.query.studentFeeBills.findMany({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.studentId, payment.studentId), eq(t.schoolId, currentUser.schoolId)),
    });
    const outstandingDueRemaining = studentBills.reduce((acc: number, b: any) => acc + (Number(b.dueAmount) || 0), 0);

    return reply.send({
      school: {
        nameEn: school?.nameEn || 'Hamro Model Secondary School',
        nameNp: school?.nameNp || 'हाम्रो नमूना माध्यमिक विद्यालय',
        addressEn: school?.addressEn || '',
        addressNp: school?.addressNp || '',
        phone: school?.phone || '',
        email: school?.email || '',
        logoUrl: school?.logoUrl || null,
        feeQrCodeUrl: school?.feeQrCodeUrl || null,
        feeMerchantName: school?.feeMerchantName || null,
        iemisCode: school?.iemisCode || null,
      },
      payment: {
        ...payment,
        studentNameEn: getFullNameEn(student),
        studentNameNp: getFullNameNp(student),
        admissionNumber: student?.studentId,
        rollNumber: student?.currentRollNumber,
        classNameEn: cls?.nameEn,
        classNameNp: cls?.nameNp,
        receivedByName: receiver?.fullNameNp || receiver?.fullNameEn || 'Cashier',
      },
      bill,
      billItems,
      outstandingDueRemaining,
    });
  });

  // ==========================================
  // 8. School QR Code Settings (क्युआर कोड सेटिङ)
  // ==========================================
  fastify.get('/qr-settings', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const school = await db.query.schools.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, currentUser.schoolId),
    });

    return reply.send({
      feeQrCodeUrl: school?.feeQrCodeUrl || null,
      feeMerchantName: school?.feeMerchantName || school?.nameNp || null,
    });
  });

  fastify.post('/qr-settings', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { feeQrCodeUrl, feeMerchantName } = request.body as {
      feeQrCodeUrl?: string;
      feeMerchantName?: string;
    };

    await db
      .update(schema.schools)
      .set({
        feeQrCodeUrl: feeQrCodeUrl || null,
        feeMerchantName: feeMerchantName || null,
      })
      .where(eq(schema.schools.id, currentUser.schoolId));

    return reply.send({
      success: true,
      feeQrCodeUrl,
      feeMerchantName,
      message: 'विद्यालयको क्युआर कोड र मर्चन्ट विवरण सुरक्षित गरियो।',
    });
  });

  // ==========================================
  // 9. Financial Reports: Daily Collection & Dues Defaulters
  // ==========================================
  fastify.get('/reports/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { dateBs } = request.query as { dateBs?: string };

    const targetDate = dateBs || getTodayBs();

    const payments = await db.query.feePayments.findMany({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.schoolId, currentUser.schoolId), eq(t.paymentDateBs, targetDate)),
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    const [students, classes] = await Promise.all([
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));

    let totalAmount = 0;
    let cashTotal = 0;
    let qrTotal = 0;
    let bankTotal = 0;
    let chequeTotal = 0;

    const enrichedPayments = payments.map((p: any) => {
      const s = studentMap.get(p.studentId);
      const c = s ? classMap.get(s.currentClassId) : null;
      const amt = Number(p.amountPaid) || 0;
      totalAmount += amt;

      if (p.paymentMode === 'CASH') cashTotal += amt;
      else if (p.paymentMode === 'QR_CODE') qrTotal += amt;
      else if (p.paymentMode === 'BANK_TRANSFER') bankTotal += amt;
      else if (p.paymentMode === 'CHEQUE') chequeTotal += amt;

      return {
        ...p,
        studentNameEn: getFullNameEn(s),
        studentNameNp: getFullNameNp(s),
        admissionNumber: s?.studentId,
        classNameEn: c?.nameEn,
        classNameNp: c?.nameNp,
      };
    });

    return reply.send({
      dateBs: targetDate,
      summary: {
        totalAmount,
        totalTransactions: payments.length,
        cashTotal,
        qrTotal,
        bankTotal,
        chequeTotal,
      },
      payments: enrichedPayments,
    });
  });

  fastify.get('/reports/dues', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { classId } = request.query as { classId?: string };

    const [classes, students, bills, guardians] = await Promise.all([
      db.query.classes.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.displayOrder)],
      }),
      db.query.students.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.schoolId, currentUser.schoolId), eq(t.status, 'ACTIVE')),
      }),
      db.query.studentFeeBills.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
      db.query.guardians.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      }),
    ]);

    const guardianMap = new Map<string, any>();
    for (const g of guardians) {
      if (!guardianMap.has(g.studentId) || g.isPrimaryContact) {
        guardianMap.set(g.studentId, g);
      }
    }

    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));

    const studentDueMap = new Map<string, { totalBilled: number; totalPaid: number; totalDue: number }>();
    for (const b of bills) {
      const cur = studentDueMap.get(b.studentId) || { totalBilled: 0, totalPaid: 0, totalDue: 0 };
      cur.totalBilled += Number(b.totalAmount) || 0;
      cur.totalPaid += Number(b.paidAmount) || 0;
      cur.totalDue += Number(b.dueAmount) || 0;
      studentDueMap.set(b.studentId, cur);
    }

    const classSummary = classes.map((c: any) => {
      const classStudents = students.filter((s: any) => s.currentClassId === c.id);
      let billed = 0;
      let paid = 0;
      let due = 0;
      let defaulterCount = 0;

      for (const s of classStudents) {
        const stats = studentDueMap.get(s.id);
        if (stats) {
          billed += stats.totalBilled;
          paid += stats.totalPaid;
          due += stats.totalDue;
          if (stats.totalDue > 0) defaulterCount++;
        }
      }

      const collectionRate = billed > 0 ? Math.round((paid / billed) * 100) : 100;

      return {
        classId: c.id,
        classNameEn: c.nameEn,
        classNameNp: c.nameNp,
        studentCount: classStudents.length,
        totalBilled: billed,
        totalPaid: paid,
        totalDue: due,
        defaulterCount,
        collectionRate,
      };
    });

    let defaulters = students
      .map((s: any) => {
        const stats = studentDueMap.get(s.id) || { totalBilled: 0, totalPaid: 0, totalDue: 0 };
        const g = guardianMap.get(s.id);
        const c = classMap.get(s.currentClassId);
        return {
          studentId: s.id,
          admissionNumber: s.studentId,
          fullNameEn: getFullNameEn(s),
          fullNameNp: getFullNameNp(s),
          classId: s.currentClassId,
          classNameEn: c?.nameEn || '',
          classNameNp: c?.nameNp || '',
          rollNumber: s.currentRollNumber,
          parentName: g?.fullNameNp || g?.fullNameEn || '',
          parentPhone: g?.phone || '',
          totalBilled: stats.totalBilled,
          totalPaid: stats.totalPaid,
          totalDue: stats.totalDue,
        };
      })
      .filter((s: any) => s.totalDue > 0);

    if (classId) {
      defaulters = defaulters.filter((d: any) => d.classId === classId);
    }

    defaulters.sort((a: any, b: any) => b.totalDue - a.totalDue);

    return reply.send({
      classSummary,
      defaulters,
    });
  });
}
