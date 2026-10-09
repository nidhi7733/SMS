import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
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

export default async function documentRoutes(fastify: FastifyInstance) {
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
  // 1. Dashboard / Summary Statistics
  // ==========================================
  fastify.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const schoolId = currentUser.schoolId;

    const [inward, outward, templates, issued, archives] = await Promise.all([
      db.query.inwardDocuments.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.outwardDocuments.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.letterTemplates.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.issuedOfficialLetters.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.institutionalArchives.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
    ]);

    const pendingInward = inward.filter((i: any) => i.status === 'PENDING').length;
    const actionTakenInward = inward.filter((i: any) => i.status === 'ACTION_TAKEN' || i.status === 'FILED').length;

    return reply.send({
      totalInward: inward.length,
      pendingInward,
      actionTakenInward,
      totalOutward: outward.length,
      totalTemplates: templates.length,
      totalIssued: issued.length,
      totalArchives: archives.length,
    });
  });

  // ==========================================
  // 2. Inward Documents (दर्ता किताब)
  // ==========================================
  fastify.get('/inward', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { fiscalYear, category, status, search } = request.query as {
      fiscalYear?: string;
      category?: string;
      status?: string;
      search?: string;
    };

    const [items, allStaff] = await Promise.all([
      db.query.inwardDocuments.findMany({
        where: (t: any, { eq, and }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId)];
          if (fiscalYear) conds.push(eq(t.fiscalYear, fiscalYear));
          if (category && category !== 'ALL') conds.push(eq(t.category, category));
          if (status && status !== 'ALL') conds.push(eq(t.status, status));
          return and(...conds);
        },
        orderBy: (t: any, { desc }: any) => [desc(t.dartaNo), desc(t.createdAt)],
      }),
      db.query.staff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const staffMap = new Map(allStaff.map((s: any) => [s.id, s.fullNameNp || s.fullNameEn || 'कर्मचारी']));

    let results = items.map((item: any) => ({
      ...item,
      receiverStaffName: item.receiverStaffId ? staffMap.get(item.receiverStaffId) || null : null,
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((i: any) =>
        i.subject.toLowerCase().includes(q) ||
        i.senderOrganization.toLowerCase().includes(q) ||
        (i.senderLetterNo && i.senderLetterNo.toLowerCase().includes(q)) ||
        String(i.dartaNo).includes(q)
      );
    }

    return reply.send(results);
  });

  fastify.post('/inward', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.senderOrganization || !body.subject) {
      return reply.status(400).send({ message: 'पठाउने कार्यालय र विषय अनिवार्य छन् (Sender organization and subject required)' });
    }

    const fiscalYear = body.fiscalYear || '2082/083';

    // Calculate sequential Darta No if not explicitly provided
    let dartaNo = Number(body.dartaNo);
    if (!dartaNo || isNaN(dartaNo)) {
      const latest = await db.query.inwardDocuments.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.fiscalYear, fiscalYear)),
        orderBy: (t: any, { desc }: any) => [desc(t.dartaNo)],
      });
      dartaNo = (latest?.dartaNo || 0) + 1;
    }

    const newInward = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      dartaNo,
      fiscalYear,
      registeredDateBs: body.registeredDateBs || getTodayBs(),
      senderOrganization: body.senderOrganization.trim(),
      senderLetterNo: body.senderLetterNo?.trim() || null,
      senderLetterDateBs: body.senderLetterDateBs?.trim() || null,
      subject: body.subject.trim(),
      category: body.category || 'GOVERNMENT',
      priority: body.priority || 'NORMAL',
      status: body.status || 'PENDING',
      scannedFileUrl: body.scannedFileUrl?.trim() || null,
      receiverStaffId: body.receiverStaffId || null,
      remarks: body.remarks?.trim() || null,
    };

    await db.insert(schema.inwardDocuments).values(newInward);
    return reply.status(201).send(newInward);
  });

  fastify.put('/inward/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.inwardDocuments.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'दर्ता अभिलेख भेटिएन (Record not found)' });
    }

    await db
      .update(schema.inwardDocuments)
      .set({
        registeredDateBs: body.registeredDateBs ?? existing.registeredDateBs,
        senderOrganization: body.senderOrganization ? body.senderOrganization.trim() : existing.senderOrganization,
        senderLetterNo: body.senderLetterNo !== undefined ? (body.senderLetterNo ? body.senderLetterNo.trim() : null) : existing.senderLetterNo,
        senderLetterDateBs: body.senderLetterDateBs !== undefined ? (body.senderLetterDateBs ? body.senderLetterDateBs.trim() : null) : existing.senderLetterDateBs,
        subject: body.subject ? body.subject.trim() : existing.subject,
        category: body.category ?? existing.category,
        priority: body.priority ?? existing.priority,
        status: body.status ?? existing.status,
        scannedFileUrl: body.scannedFileUrl !== undefined ? (body.scannedFileUrl ? body.scannedFileUrl.trim() : null) : existing.scannedFileUrl,
        receiverStaffId: body.receiverStaffId !== undefined ? body.receiverStaffId : existing.receiverStaffId,
        remarks: body.remarks !== undefined ? (body.remarks ? body.remarks.trim() : null) : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(schema.inwardDocuments.id, id));

    return reply.send({ message: 'दर्ता विवरण सफलतापूर्वक अद्यावधिक गरियो' });
  });

  fastify.delete('/inward/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.inwardDocuments)
      .where(and(eq(schema.inwardDocuments.id, id), eq(schema.inwardDocuments.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'दर्ता अभिलेख हटाइयो' });
  });

  // ==========================================
  // 3. Outward Documents (चलानी किताब)
  // ==========================================
  fastify.get('/outward', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { fiscalYear, category, search } = request.query as {
      fiscalYear?: string;
      category?: string;
      search?: string;
    };

    const [items, allStaff] = await Promise.all([
      db.query.outwardDocuments.findMany({
        where: (t: any, { eq, and }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId)];
          if (fiscalYear) conds.push(eq(t.fiscalYear, fiscalYear));
          if (category && category !== 'ALL') conds.push(eq(t.category, category));
          return and(...conds);
        },
        orderBy: (t: any, { desc }: any) => [desc(t.chalaniNo), desc(t.createdAt)],
      }),
      db.query.staff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const staffMap = new Map(allStaff.map((s: any) => [s.id, s.fullNameNp || s.fullNameEn || 'कर्मचारी']));

    let results = items.map((item: any) => ({
      ...item,
      signatoryStaffName: item.signatoryStaffId ? staffMap.get(item.signatoryStaffId) || null : null,
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((i: any) =>
        i.subject.toLowerCase().includes(q) ||
        i.recipientOrganization.toLowerCase().includes(q) ||
        String(i.chalaniNo).includes(q)
      );
    }

    return reply.send(results);
  });

  fastify.post('/outward', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.recipientOrganization || !body.subject) {
      return reply.status(400).send({ message: 'प्राप्त गर्ने कार्यालय र विषय अनिवार्य छन् (Recipient and subject required)' });
    }

    const fiscalYear = body.fiscalYear || '2082/083';

    // Calculate sequential Chalani No if not provided
    let chalaniNo = Number(body.chalaniNo);
    if (!chalaniNo || isNaN(chalaniNo)) {
      const latest = await db.query.outwardDocuments.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.fiscalYear, fiscalYear)),
        orderBy: (t: any, { desc }: any) => [desc(t.chalaniNo)],
      });
      chalaniNo = (latest?.chalaniNo || 0) + 1;
    }

    const newOutward = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      chalaniNo,
      fiscalYear,
      dispatchDateBs: body.dispatchDateBs || getTodayBs(),
      recipientOrganization: body.recipientOrganization.trim(),
      subject: body.subject.trim(),
      category: body.category || 'RECOMMENDATION',
      dispatchMode: body.dispatchMode || 'HAND_DELIVERY',
      signatoryStaffId: body.signatoryStaffId || null,
      scannedFileUrl: body.scannedFileUrl?.trim() || null,
      remarks: body.remarks?.trim() || null,
    };

    await db.insert(schema.outwardDocuments).values(newOutward);
    return reply.status(201).send(newOutward);
  });

  fastify.put('/outward/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.outwardDocuments.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'चलानी अभिलेख भेटिएन' });
    }

    await db
      .update(schema.outwardDocuments)
      .set({
        dispatchDateBs: body.dispatchDateBs ?? existing.dispatchDateBs,
        recipientOrganization: body.recipientOrganization ? body.recipientOrganization.trim() : existing.recipientOrganization,
        subject: body.subject ? body.subject.trim() : existing.subject,
        category: body.category ?? existing.category,
        dispatchMode: body.dispatchMode ?? existing.dispatchMode,
        signatoryStaffId: body.signatoryStaffId !== undefined ? body.signatoryStaffId : existing.signatoryStaffId,
        scannedFileUrl: body.scannedFileUrl !== undefined ? (body.scannedFileUrl ? body.scannedFileUrl.trim() : null) : existing.scannedFileUrl,
        remarks: body.remarks !== undefined ? (body.remarks ? body.remarks.trim() : null) : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(schema.outwardDocuments.id, id));

    return reply.send({ message: 'चलानी विवरण अद्यावधिक गरियो' });
  });

  fastify.delete('/outward/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.outwardDocuments)
      .where(and(eq(schema.outwardDocuments.id, id), eq(schema.outwardDocuments.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'चलानी अभिलेख हटाइयो' });
  });

  // ==========================================
  // 4. Letter Templates (सिफारिस तथा आधिकारिक ढाँचाहरू)
  // ==========================================
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const templates = await db.query.letterTemplates.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.titleEn)],
    });

    return reply.send(templates);
  });

  fastify.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.code || !body.titleEn || !body.titleNp || !body.templateBodyHtml) {
      return reply.status(400).send({ message: 'कोड, शीर्षक र ढाँचा (template content) अनिवार्य छन्' });
    }

    const newTemplate = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      code: body.code.trim().toUpperCase(),
      titleEn: body.titleEn.trim(),
      titleNp: body.titleNp.trim(),
      templateBodyHtml: body.templateBodyHtml.trim(),
      category: body.category || 'GENERAL',
      isActive: body.isActive !== false,
    };

    await db.insert(schema.letterTemplates).values(newTemplate);
    return reply.status(201).send(newTemplate);
  });

  fastify.put('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.letterTemplates)
      .set({
        code: body.code ? body.code.trim().toUpperCase() : undefined,
        titleEn: body.titleEn ? body.titleEn.trim() : undefined,
        titleNp: body.titleNp ? body.titleNp.trim() : undefined,
        templateBodyHtml: body.templateBodyHtml ? body.templateBodyHtml.trim() : undefined,
        category: body.category,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.letterTemplates.id, id), eq(schema.letterTemplates.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'ढाँचा अद्यावधिक गरियो' });
  });

  fastify.delete('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.letterTemplates)
      .where(and(eq(schema.letterTemplates.id, id), eq(schema.letterTemplates.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'ढाँचा हटाइयो' });
  });

  // ==========================================
  // 5. Issued Letters (जारी गरिएका सिफारिस पत्रहरू)
  // ==========================================
  fastify.get('/issued', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { search } = request.query as { search?: string };

    const [letters, templates, staffList] = await Promise.all([
      db.query.issuedOfficialLetters.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      }),
      db.query.letterTemplates.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.staff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const templateMap = new Map(templates.map((tpl: any) => [tpl.id, tpl.titleNp || tpl.titleEn]));
    const staffMap = new Map(staffList.map((s: any) => [s.id, s.fullNameNp || s.fullNameEn || 'कर्मचारी']));

    let results = letters.map((l: any) => ({
      ...l,
      templateTitle: templateMap.get(l.templateId) || 'आधिकारिक पत्र',
      signatoryStaffName: l.signatoryStaffId ? staffMap.get(l.signatoryStaffId) || null : null,
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((r: any) =>
        r.letterNo.toLowerCase().includes(q) ||
        (r.targetName && r.targetName.toLowerCase().includes(q))
      );
    }

    return reply.send(results);
  });

  fastify.post('/issue', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.templateId) {
      return reply.status(400).send({ message: 'ढाँचा (Template) छनोट गर्नुहोस्' });
    }

    const template = await db.query.letterTemplates.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, body.templateId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!template) {
      return reply.status(404).send({ message: 'ढाँचा फेला परेन' });
    }

    const issueDateBs = body.issueDateBs || getTodayBs();
    const targetType = body.targetType || 'STUDENT';
    let targetName = body.targetName?.trim() || '';
    let html = template.templateBodyHtml;

    // Token substitution
    if (targetType === 'STUDENT' && body.targetId) {
      const student = await db.query.students.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.id, body.targetId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (student) {
        targetName = student.firstNameNp ? `${student.firstNameNp} ${student.lastNameNp || ''}`.trim() : `${student.firstNameEn} ${student.lastNameEn || ''}`.trim();
        const cls = await db.query.classes.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentClassId) });
        const sec = student.currentSectionId ? await db.query.sections.findFirst({ where: (t: any, { eq }: any) => eq(t.id, student.currentSectionId) }) : null;

        html = html
          .replace(/{{studentName}}/g, targetName)
          .replace(/{{admissionNo}}/g, student.admissionNo || '')
          .replace(/{{rollNo}}/g, String(student.currentRollNumber || ''))
          .replace(/{{class}}/g, cls?.nameNp || cls?.nameEn || '')
          .replace(/{{section}}/g, sec?.name || '')
          .replace(/{{dobBs}}/g, student.dobBs || '')
          .replace(/{{fatherName}}/g, student.fatherNameNp || student.fatherNameEn || '')
          .replace(/{{motherName}}/g, student.motherNameNp || student.motherNameEn || '');
      }
    } else if (targetType === 'STAFF' && body.targetId) {
      const stf = await db.query.staff.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.id, body.targetId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (stf) {
        targetName = stf.fullNameNp || stf.fullNameEn || 'शिक्षक/कर्मचारी';
        html = html
          .replace(/{{staffName}}/g, targetName)
          .replace(/{{designation}}/g, stf.designation || '')
          .replace(/{{startDateBs}}/g, stf.joiningDateBs || '')
          .replace(/{{phone}}/g, stf.phone || '');
      }
    }

    html = html.replace(/{{date}}/g, issueDateBs);

    // If custom body provided, use custom
    if (body.customContentHtml && body.customContentHtml.trim()) {
      html = body.customContentHtml.trim();
    }

    // Generate unique letter number
    const yearBs = issueDateBs.split('-')[0] || '2083';
    const totalIssuedThisYear = await db.query.issuedOfficialLetters.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const seq = totalIssuedThisYear.length + 1;
    const letterNo = body.letterNo || `LET-${yearBs}-${String(seq).padStart(4, '0')}`;

    const newIssued = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      letterNo,
      templateId: template.id,
      targetType,
      targetId: body.targetId || null,
      targetName: targetName || 'सामान्य नागरिक',
      issueDateBs,
      generatedContentHtml: html,
      signatoryStaffId: body.signatoryStaffId || null,
      remarks: body.remarks?.trim() || null,
    };

    await db.insert(schema.issuedOfficialLetters).values(newIssued);

    // Optionally auto-register in Chalani book if requested
    if (body.autoRegisterChalani) {
      const fiscalYear = '2082/083';
      const latestChalani = await db.query.outwardDocuments.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.fiscalYear, fiscalYear)),
        orderBy: (t: any, { desc }: any) => [desc(t.chalaniNo)],
      });
      const chalaniNo = (latestChalani?.chalaniNo || 0) + 1;

      await db.insert(schema.outwardDocuments).values({
        id: crypto.randomUUID(),
        schoolId: currentUser.schoolId,
        chalaniNo,
        fiscalYear,
        dispatchDateBs: issueDateBs,
        recipientOrganization: targetName,
        subject: `${template.titleNp || template.titleEn} (पत्र सं: ${letterNo})`,
        category: 'RECOMMENDATION',
        dispatchMode: 'HAND_DELIVERY',
        signatoryStaffId: body.signatoryStaffId || null,
        remarks: `जारी गरिएको आधिकारिक सिफारिस पत्र #${letterNo}`,
      });
    }

    return reply.status(201).send(newIssued);
  });

  fastify.delete('/issued/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.issuedOfficialLetters)
      .where(and(eq(schema.issuedOfficialLetters.id, id), eq(schema.issuedOfficialLetters.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'जारी गरिएको पत्र हटाइयो' });
  });

  // ==========================================
  // 6. Institutional Archives (संस्थागत अभिलेखालय)
  // ==========================================
  fastify.get('/archives', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { category, search } = request.query as { category?: string; search?: string };

    const items = await db.query.institutionalArchives.findMany({
      where: (t: any, { eq, and }: any) => {
        const conds = [eq(t.schoolId, currentUser.schoolId)];
        if (category && category !== 'ALL') conds.push(eq(t.category, category));
        return and(...conds);
      },
      orderBy: (t: any, { desc }: any) => [desc(t.documentYearBs), desc(t.createdAt)],
    });

    let results = items;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((a: any) =>
        a.title.toLowerCase().includes(q) ||
        (a.tags && Array.isArray(a.tags) && a.tags.some((tag: string) => tag.toLowerCase().includes(q)))
      );
    }

    return reply.send(results);
  });

  fastify.post('/archives', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.title || !body.fileUrl) {
      return reply.status(400).send({ message: 'शीर्षक र कागजातको फाइल लिङ्क अनिवार्य छन्' });
    }

    const newArchive = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      title: body.title.trim(),
      category: body.category || 'MISCELLANEOUS',
      documentYearBs: body.documentYearBs ? Number(body.documentYearBs) : 2083,
      fileUrl: body.fileUrl.trim(),
      fileType: body.fileType || 'application/pdf',
      fileSizeBytes: body.fileSizeBytes ? Number(body.fileSizeBytes) : null,
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map((t: string) => t.trim()) : []),
      confidentialityLevel: body.confidentialityLevel || 'RESTRICTED',
    };

    await db.insert(schema.institutionalArchives).values(newArchive);
    return reply.status(201).send(newArchive);
  });

  fastify.put('/archives/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.institutionalArchives)
      .set({
        title: body.title ? body.title.trim() : undefined,
        category: body.category,
        documentYearBs: body.documentYearBs ? Number(body.documentYearBs) : undefined,
        fileUrl: body.fileUrl ? body.fileUrl.trim() : undefined,
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map((t: string) => t.trim()) : undefined),
        confidentialityLevel: body.confidentialityLevel,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.institutionalArchives.id, id), eq(schema.institutionalArchives.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'अभिलेख अद्यावधिक गरियो' });
  });

  fastify.delete('/archives/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.institutionalArchives)
      .where(and(eq(schema.institutionalArchives.id, id), eq(schema.institutionalArchives.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'अभिलेख हटाइयो' });
  });
}
