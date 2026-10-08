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
  return '2083-01-01';
}

function addDaysBs(bsDateStr: string, days: number): string {
  if (!bsDateStr) return '2083-01-15';
  const parts = bsDateStr.split('-').map(Number);
  let y = parts[0] || 2083;
  let m = parts[1] || 1;
  let d = (parts[2] || 1) + days;

  while (d > 30) {
    d -= 30;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function calculateDaysDifference(dateStr1: string, dateStr2: string): number {
  try {
    const [y1, m1, d1] = dateStr1.split('-').map(Number);
    const [y2, m2, d2] = dateStr2.split('-').map(Number);
    const totalDays1 = y1 * 365 + m1 * 30 + d1;
    const totalDays2 = y2 * 365 + m2 * 30 + d2;
    return totalDays1 - totalDays2;
  } catch {
    return 0;
  }
}

export default async function libraryRoutes(fastify: FastifyInstance) {
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
  // 1. Categories (वर्गीकरण / Dewey Decimal Classification)
  // ==========================================
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const categories = await db.query.libraryCategories.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.code)],
    });

    return reply.send(categories);
  });

  fastify.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.code || !body.nameEn || !body.nameNp) {
      return reply.status(400).send({ message: 'कोड र विधाको नाम अनिवार्य छन् (Category code and name required)' });
    }

    const newCategory = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      code: body.code.trim(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      description: body.description || null,
    };

    await db.insert(schema.libraryCategories).values(newCategory);
    return reply.status(201).send(newCategory);
  });

  // ==========================================
  // 2. Books & Accession Copies (पुस्तक तथा भौतिक प्रतिहरू)
  // ==========================================
  fastify.get('/books', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const books = await db.query.libraryBooks.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    // Fetch categories to join
    const categories = await db.query.libraryCategories.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const catMap = new Map(categories.map((c: any) => [c.id, c]));

    // Fetch copies
    const allCopies = await db.query.libraryBookCopies.findMany();
    const copiesByBookId = new Map<string, any[]>();
    for (const copy of allCopies) {
      if (!copiesByBookId.has(copy.bookId)) {
        copiesByBookId.set(copy.bookId, []);
      }
      copiesByBookId.get(copy.bookId)!.push(copy);
    }

    const result = books.map((b: any) => ({
      ...b,
      category: catMap.get(b.categoryId) || null,
      copies: copiesByBookId.get(b.id) || [],
    }));

    return reply.send(result);
  });

  fastify.get('/books/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };

    const book = await db.query.libraryBooks.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    if (!book) {
      return reply.status(404).send({ message: 'पुस्तक भेटिएन (Book not found)' });
    }

    const category = await db.query.libraryCategories.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, book.categoryId),
    });

    const copies = await db.query.libraryBookCopies.findMany({
      where: (t: any, { eq }: any) => eq(t.bookId, book.id),
      orderBy: (t: any, { asc }: any) => [asc(t.accessionNumber)],
    });

    return reply.send({
      ...book,
      category,
      copies,
    });
  });

  fastify.post('/books', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.titleEn || !body.titleNp || !body.author || !body.categoryId) {
      return reply.status(400).send({ message: 'पुस्तकको शीर्षक, लेखक र विधा अनिवार्य छन् (Title, author, and category are required)' });
    }

    const copiesCount = Math.max(1, Number(body.initialCopiesCount) || 1);
    const bookId = crypto.randomUUID();
    const todayBs = getTodayBs();

    const newBook = {
      id: bookId,
      schoolId: currentUser.schoolId,
      isbn: body.isbn?.trim() || null,
      titleEn: body.titleEn.trim(),
      titleNp: body.titleNp.trim(),
      author: body.author.trim(),
      publisher: body.publisher?.trim() || null,
      edition: body.edition?.trim() || null,
      publicationYear: body.publicationYear?.trim() || null,
      language: body.language || 'NEPALI',
      categoryId: body.categoryId,
      rackLocation: body.rackLocation?.trim() || 'Rack 1, Shelf A',
      price: Number(body.price) || 0,
      totalCopies: copiesCount,
      availableCopies: copiesCount,
      description: body.description?.trim() || null,
      coverImageUrl: body.coverImageUrl || null,
    };

    await db.insert(schema.libraryBooks).values(newBook);

    // Auto-generate Accession Numbers
    // Find highest accession count
    const prefix = body.accessionPrefix?.trim() || 'ACC-2083';
    const allCopies = await db.query.libraryBookCopies.findMany();
    let maxNum = 0;
    for (const c of allCopies) {
      if (c.accessionNumber && c.accessionNumber.startsWith(prefix)) {
        const parts = c.accessionNumber.split('-');
        const lastPart = Number(parts[parts.length - 1]);
        if (!isNaN(lastPart) && lastPart > maxNum) {
          maxNum = lastPart;
        }
      }
    }

    const createdCopies = [];
    for (let i = 1; i <= copiesCount; i++) {
      const nextNum = maxNum + i;
      const accNum = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      const copy = {
        id: crypto.randomUUID(),
        bookId,
        accessionNumber: accNum,
        barcode: accNum,
        condition: 'GOOD' as const,
        status: 'AVAILABLE' as const,
        addedDateBs: todayBs,
      };
      await db.insert(schema.libraryBookCopies).values(copy);
      createdCopies.push(copy);
    }

    return reply.status(201).send({
      ...newBook,
      copies: createdCopies,
    });
  });

  fastify.put('/books/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.libraryBooks.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'पुस्तक भेटिएन (Book not found)' });
    }

    await db.update(schema.libraryBooks).set({
      isbn: body.isbn?.trim() ?? existing.isbn,
      titleEn: body.titleEn?.trim() ?? existing.titleEn,
      titleNp: body.titleNp?.trim() ?? existing.titleNp,
      author: body.author?.trim() ?? existing.author,
      publisher: body.publisher?.trim() ?? existing.publisher,
      edition: body.edition?.trim() ?? existing.edition,
      publicationYear: body.publicationYear?.trim() ?? existing.publicationYear,
      language: body.language ?? existing.language,
      categoryId: body.categoryId ?? existing.categoryId,
      rackLocation: body.rackLocation?.trim() ?? existing.rackLocation,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      description: body.description?.trim() ?? existing.description,
      updatedAt: new Date(),
    }).where(eq(schema.libraryBooks.id, id));

    const updated = await db.query.libraryBooks.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    return reply.send(updated);
  });

  fastify.post('/books/:id/copies', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const book = await db.query.libraryBooks.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    if (!book) {
      return reply.status(404).send({ message: 'पुस्तक भेटिएन (Book not found)' });
    }

    const countToAdd = Math.max(1, Number(body.count) || 1);
    const prefix = body.accessionPrefix?.trim() || 'ACC-2083';
    const allCopies = await db.query.libraryBookCopies.findMany();
    let maxNum = 0;
    for (const c of allCopies) {
      if (c.accessionNumber && c.accessionNumber.startsWith(prefix)) {
        const parts = c.accessionNumber.split('-');
        const lastPart = Number(parts[parts.length - 1]);
        if (!isNaN(lastPart) && lastPart > maxNum) {
          maxNum = lastPart;
        }
      }
    }

    const todayBs = getTodayBs();
    const newCopies = [];
    for (let i = 1; i <= countToAdd; i++) {
      const nextNum = maxNum + i;
      const accNum = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      const copy = {
        id: crypto.randomUUID(),
        bookId: id,
        accessionNumber: accNum,
        barcode: accNum,
        condition: 'GOOD' as const,
        status: 'AVAILABLE' as const,
        addedDateBs: todayBs,
      };
      await db.insert(schema.libraryBookCopies).values(copy);
      newCopies.push(copy);
    }

    await db.update(schema.libraryBooks).set({
      totalCopies: book.totalCopies + countToAdd,
      availableCopies: book.availableCopies + countToAdd,
      updatedAt: new Date(),
    }).where(eq(schema.libraryBooks.id, id));

    return reply.status(201).send(newCopies);
  });

  // ==========================================
  // 3. Copies & Accession Register (दर्ता लगत)
  // ==========================================
  fastify.get('/copies', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const books = await db.query.libraryBooks.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const bookMap = new Map(books.map((b: any) => [b.id, b]));

    const copies = await db.query.libraryBookCopies.findMany({
      orderBy: (t: any, { asc }: any) => [asc(t.accessionNumber)],
    });

    const filteredCopies = copies
      .filter((c: any) => bookMap.has(c.bookId))
      .map((c: any) => ({
        ...c,
        book: bookMap.get(c.bookId),
      }));

    return reply.send(filteredCopies);
  });

  fastify.put('/copies/:id/condition', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const copy = await db.query.libraryBookCopies.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, id),
    });

    if (!copy) {
      return reply.status(404).send({ message: 'प्रति भेटिएन (Copy not found)' });
    }

    await db.update(schema.libraryBookCopies).set({
      condition: body.condition || copy.condition,
      status: body.status || copy.status,
    }).where(eq(schema.libraryBookCopies.id, id));

    return reply.send({ success: true, message: 'अवस्था अद्यावधिक गरियो' });
  });

  // ==========================================
  // 4. Library Members (सदस्यता नीति र विवरण)
  // ==========================================
  fastify.get('/members', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const members = await db.query.libraryMembers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.cardNumber)],
    });

    const students = await db.query.students.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const staffList = await db.query.staff.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const staffMap = new Map<string, any>(staffList.map((s: any) => [s.id, s]));

    // Fetch active circulations per member
    const activeCirculations = await db.query.libraryCirculations.findMany({
      where: (t: any, { and, inArray, eq }: any) =>
        and(
          eq(t.schoolId, currentUser.schoolId),
          inArray(t.status, ['ISSUED', 'OVERDUE'])
        ),
    });

    const activeCounts = new Map<string, number>();
    for (const c of activeCirculations) {
      activeCounts.set(c.memberId, (activeCounts.get(c.memberId) || 0) + 1);
    }

    const result = members.map((m: any) => {
      let fullNameEn = '';
      let fullNameNp = '';
      let email: string | null = null;
      let phone: string | null = null;
      let detailsLabel = '';

      if (m.memberType === 'STUDENT' && m.studentId) {
        const s = studentMap.get(m.studentId);
        if (s) {
          fullNameEn = [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
          fullNameNp = [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ');
          email = s.email;
          phone = s.phone;
          detailsLabel = `कक्षा ${s.currentClass || ''} (रोल: ${s.rollNumber || '-'})`;
        }
      } else if (m.memberType === 'STAFF' && m.staffId) {
        const st = staffMap.get(m.staffId);
        if (st) {
          fullNameEn = st.fullNameEn || [st.firstNameEn, st.middleNameEn, st.lastNameEn].filter(Boolean).join(' ');
          fullNameNp = st.fullNameNp || [st.firstNameNp, st.middleNameNp, st.lastNameNp].filter(Boolean).join(' ');
          email = st.email;
          phone = st.phone;
          detailsLabel = `${st.department || 'शिक्षक'} (${st.designation || 'Staff'})`;
        }
      }

      return {
        ...m,
        fullNameEn: fullNameEn || m.cardNumber,
        fullNameNp: fullNameNp || m.cardNumber,
        email,
        phone,
        detailsLabel,
        activeIssuesCount: activeCounts.get(m.id) || 0,
      };
    });

    return reply.send(result);
  });

  fastify.post('/members', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.memberType || (!body.studentId && !body.staffId)) {
      return reply.status(400).send({ message: 'सदस्यको प्रकार र विद्यार्थी वा कर्मचारी छनोट अनिवार्य छ' });
    }

    // Check if card is already issued
    if (body.memberType === 'STUDENT' && body.studentId) {
      const existing = await db.query.libraryMembers.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.studentId, body.studentId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (existing) {
        return reply.status(400).send({
          message: `यो विद्यार्थीको लागि पहिले नै कार्ड (${existing.cardNumber}) जारी भइसकेको छ। (Card ${existing.cardNumber} already issued for this student)`,
        });
      }
    }
    if (body.memberType === 'STAFF' && body.staffId) {
      const existing = await db.query.libraryMembers.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.staffId, body.staffId), eq(t.schoolId, currentUser.schoolId)),
      });
      if (existing) {
        return reply.status(400).send({
          message: `यो शिक्षक/कर्मचारीको लागि पहिले नै कार्ड (${existing.cardNumber}) जारी भइसकेको छ। (Card ${existing.cardNumber} already issued for this staff)`,
        });
      }
    }

    // Generate Card Number
    const prefix = body.memberType === 'STUDENT' ? 'LIB-STU' : 'LIB-STF';
    const existing = await db.query.libraryMembers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    let maxNum = 0;
    for (const m of existing) {
      if (m.cardNumber.startsWith(prefix)) {
        const parts = m.cardNumber.split('-');
        const n = Number(parts[parts.length - 1]);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    const cardNumber = `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
    const maxAllowedBooks = body.memberType === 'STUDENT' ? 2 : 5;
    const maxIssueDays = body.memberType === 'STUDENT' ? 14 : 30;

    const newMember = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      memberType: body.memberType,
      studentId: body.studentId || null,
      staffId: body.staffId || null,
      cardNumber,
      maxAllowedBooks,
      maxIssueDays,
      status: 'ACTIVE' as const,
    };

    await db.insert(schema.libraryMembers).values(newMember);
    return reply.status(201).send(newMember);
  });

  // ==========================================
  // 5. Circulation (पुस्तक जारी, फिर्ता र नविकरण)
  // ==========================================
  fastify.get('/circulations', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const query = request.query as any;

    const circulations = await db.query.libraryCirculations.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    const copies = await db.query.libraryBookCopies.findMany();
    const copyMap = new Map<string, any>(copies.map((c: any) => [c.id, c]));

    const books = await db.query.libraryBooks.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const bookMap = new Map<string, any>(books.map((b: any) => [b.id, b]));

    const members = await db.query.libraryMembers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const memberMap = new Map<string, any>(members.map((m: any) => [m.id, m]));

    const students = await db.query.students.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const staffList = await db.query.staff.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const staffMap = new Map<string, any>(staffList.map((s: any) => [s.id, s]));

    const todayBs = getTodayBs();

    const result = circulations.map((c: any) => {
      const copy = copyMap.get(c.copyId);
      const book = copy ? bookMap.get(copy.bookId) : null;
      const mem = memberMap.get(c.memberId);

      let memberNameEn = 'Member';
      let memberNameNp = 'सदस्य';

      if (mem?.memberType === 'STUDENT' && mem.studentId) {
        const s = studentMap.get(mem.studentId);
        if (s) {
          memberNameEn = [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
          memberNameNp = [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ');
        }
      } else if (mem?.memberType === 'STAFF' && mem.staffId) {
        const st = staffMap.get(mem.staffId);
        if (st) {
          memberNameEn = st.fullNameEn || [st.firstNameEn, st.middleNameEn, st.lastNameEn].filter(Boolean).join(' ');
          memberNameNp = st.fullNameNp || [st.firstNameNp, st.middleNameNp, st.lastNameNp].filter(Boolean).join(' ');
        }
      }

      // Calculate dynamic overdue
      let overdueDays = 0;
      let calculatedFine = c.fineAmount || 0;
      if (c.status === 'ISSUED' || c.status === 'OVERDUE') {
        const diff = calculateDaysDifference(todayBs, c.dueDateBs);
        if (diff > 0) {
          overdueDays = diff;
          calculatedFine = diff * 2; // NPR 2 per day
        }
      }

      return {
        ...c,
        bookTitleEn: book?.titleEn || 'Unknown Title',
        bookTitleNp: book?.titleNp || 'अज्ञात पुस्तक',
        author: book?.author || '',
        rackLocation: book?.rackLocation || '',
        accessionNumber: copy?.accessionNumber || '',
        memberCardNumber: mem?.cardNumber || '',
        memberType: mem?.memberType || 'STUDENT',
        memberNameEn,
        memberNameNp,
        overdueDays,
        calculatedFine,
      };
    });

    if (query?.status) {
      return reply.send(result.filter((r: any) => r.status === query.status));
    }

    return reply.send(result);
  });

  // Issue Book (पुस्तक जारी)
  fastify.post('/issue', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    // 1. Locate Copy
    let copy: any = null;
    if (body.copyId) {
      copy = await db.query.libraryBookCopies.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, body.copyId),
      });
    } else if (body.accessionNumber) {
      copy = await db.query.libraryBookCopies.findFirst({
        where: (t: any, { eq }: any) => eq(t.accessionNumber, body.accessionNumber.trim()),
      });
    }

    if (!copy) {
      return reply.status(404).send({ message: 'पुस्तक प्रति (Accession No.) फेला परेन' });
    }

    if (copy.status !== 'AVAILABLE') {
      return reply.status(400).send({
        message: `यो पुस्तक प्रति हाल उपलब्ध छैन (Status: ${copy.status}). कृपया अर्को प्रति छनोट गर्नुहोस्।`,
      });
    }

    // 2. Locate Member
    let member: any = null;
    if (body.memberId) {
      member = await db.query.libraryMembers.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.id, body.memberId), eq(t.schoolId, currentUser.schoolId)),
      });
    } else if (body.cardNumber) {
      member = await db.query.libraryMembers.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.cardNumber, body.cardNumber.trim()), eq(t.schoolId, currentUser.schoolId)),
      });
    }

    if (!member) {
      return reply.status(404).send({ message: 'पुस्तकालय सदस्य (Card No.) फेला परेन' });
    }

    if (member.status !== 'ACTIVE') {
      return reply.status(400).send({ message: 'सदस्यता निष्क्रिय वा निलम्बित गरिएको छ (Member is suspended)' });
    }

    // 3. Enforce Quota Policy
    const activeIssued = await db.query.libraryCirculations.findMany({
      where: (t: any, { and, eq, inArray }: any) =>
        and(
          eq(t.memberId, member.id),
          inArray(t.status, ['ISSUED', 'OVERDUE'])
        ),
    });

    if (activeIssued.length >= member.maxAllowedBooks) {
      return reply.status(400).send({
        message: `पुस्तकालय नीति उल्लंघन: ${member.memberType === 'STUDENT' ? 'विद्यार्थी' : 'कर्मचारी'}को अधिकतम सीमा (${member.maxAllowedBooks} वटा पुस्तक) पूरा भइसकेको छ। (Quota exceeded: max ${member.maxAllowedBooks} allowed).`,
      });
    }

    // 4. Generate Circulation Record
    const todayBs = body.issueDateBs || getTodayBs();
    const todayAd = new Date().toISOString().split('T')[0];
    const dueDateBs = body.dueDateBs || addDaysBs(todayBs, member.maxIssueDays || 14);

    // Circulation Number: CIR-2083-XXXX
    const allCir = await db.query.libraryCirculations.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    let maxNum = 0;
    for (const c of allCir) {
      if (c.circulationNumber?.startsWith('CIR-2083-')) {
        const num = Number(c.circulationNumber.replace('CIR-2083-', ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const circulationNumber = `CIR-2083-${String(maxNum + 1).padStart(4, '0')}`;

    const circulationId = crypto.randomUUID();
    await db.insert(schema.libraryCirculations).values({
      id: circulationId,
      schoolId: currentUser.schoolId,
      circulationNumber,
      copyId: copy.id,
      memberId: member.id,
      issueDateBs: todayBs,
      issueDateAd: todayAd,
      dueDateBs,
      status: 'ISSUED',
      fineAmount: 0,
      finePaid: false,
      remarks: body.remarks || null,
      issuedById: currentUser.userId || null,
    });

    // 5. Update Copy & Book Status
    await db.update(schema.libraryBookCopies).set({
      status: 'ISSUED',
    }).where(eq(schema.libraryBookCopies.id, copy.id));

    await db.execute(sql`
      UPDATE library_books 
      SET available_copies = GREATEST(0, available_copies - 1), updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${copy.bookId}
    `);

    return reply.status(201).send({
      success: true,
      circulationNumber,
      circulationId,
      message: 'पुस्तक सफलतापूर्वक जारी गरियो (Book issued successfully)',
    });
  });

  // Return Book (पुस्तक फिर्ता)
  fastify.post('/return', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.circulationId) {
      return reply.status(400).send({ message: 'कारोबार नम्बर (Circulation ID) अनिवार्य छ' });
    }

    const circulation = await db.query.libraryCirculations.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, body.circulationId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!circulation) {
      return reply.status(404).send({ message: 'कारोबार फेला परेन' });
    }

    if (circulation.status === 'RETURNED') {
      return reply.status(400).send({ message: 'यो पुस्तक पहिल्यै फिर्ता भइसकेको छ' });
    }

    const returnDateBs = body.returnDateBs || getTodayBs();
    const returnDateAd = new Date().toISOString().split('T')[0];

    // Calculate Fine
    const overdueDays = Math.max(0, calculateDaysDifference(returnDateBs, circulation.dueDateBs));
    const calculatedFine = overdueDays * 2; // NPR 2 per day
    const finePaid = Boolean(body.finePaid || calculatedFine === 0);

    // Update Circulation
    await db.update(schema.libraryCirculations).set({
      returnDateBs,
      returnDateAd,
      status: 'RETURNED',
      fineAmount: calculatedFine,
      finePaid,
      remarks: body.remarks || circulation.remarks,
      returnedById: currentUser.userId || null,
      updatedAt: new Date(),
    }).where(eq(schema.libraryCirculations.id, circulation.id));

    // Update Copy condition & status
    const newCondition = body.condition || 'GOOD';
    await db.update(schema.libraryBookCopies).set({
      status: 'AVAILABLE',
      condition: newCondition,
    }).where(eq(schema.libraryBookCopies.id, circulation.copyId));

    // Increment Book availableCopies
    const copy = await db.query.libraryBookCopies.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, circulation.copyId),
    });
    if (copy) {
      await db.execute(sql`
        UPDATE library_books 
        SET available_copies = LEAST(total_copies, available_copies + 1), updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${copy.bookId}
      `);
    }

    // Record Fine in library_fines if late
    let fineRecord = null;
    if (calculatedFine > 0) {
      fineRecord = {
        id: crypto.randomUUID(),
        schoolId: currentUser.schoolId,
        circulationId: circulation.id,
        memberId: circulation.memberId,
        overdueDays,
        ratePerDay: 2,
        fineAmount: calculatedFine,
        waivedAmount: 0,
        paidAmount: finePaid ? calculatedFine : 0,
        paymentStatus: finePaid ? 'PAID' : 'UNPAID',
        receiptNumber: finePaid ? `RCP-FINE-${Date.now().toString().slice(-6)}` : null,
        paymentDateBs: finePaid ? returnDateBs : null,
        collectedById: finePaid ? currentUser.userId : null,
      };
      await db.insert(schema.libraryFines).values(fineRecord);
    }

    return reply.send({
      success: true,
      message: 'पुस्तक फिर्ता दर्ता भयो (Book returned successfully)',
      overdueDays,
      fineAmount: calculatedFine,
      finePaid,
    });
  });

  // Renew Book (नविकरण)
  fastify.post('/renew', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.circulationId) {
      return reply.status(400).send({ message: 'कारोबार नम्बर अनिवार्य छ' });
    }

    const circulation = await db.query.libraryCirculations.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, body.circulationId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!circulation || circulation.status !== 'ISSUED') {
      return reply.status(400).send({ message: 'नविकरण गर्न मिल्ने सक्रिय कारोबार फेला परेन' });
    }

    const todayBs = getTodayBs();
    const extendedDays = Number(body.days) || 14;
    const newDueDateBs = addDaysBs(todayBs, extendedDays);

    await db.update(schema.libraryCirculations).set({
      dueDateBs: newDueDateBs,
      remarks: `${circulation.remarks || ''} [नविकरण मिति: ${todayBs}]`.trim(),
      updatedAt: new Date(),
    }).where(eq(schema.libraryCirculations.id, circulation.id));

    return reply.send({
      success: true,
      newDueDateBs,
      message: 'पुस्तक नविकरण भयो (Book renewed successfully)',
    });
  });

  // ==========================================
  // 6. Overdue Fines & Settlements (जरिवाना संकलन)
  // ==========================================
  fastify.get('/fines', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const fines = await db.query.libraryFines.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });

    const members = await db.query.libraryMembers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const memberMap = new Map<string, any>(members.map((m: any) => [m.id, m]));

    const students = await db.query.students.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const staffList = await db.query.staff.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const staffMap = new Map<string, any>(staffList.map((s: any) => [s.id, s]));

    const circulations = await db.query.libraryCirculations.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const cirMap = new Map<string, any>(circulations.map((c: any) => [c.id, c]));

    const copies = await db.query.libraryBookCopies.findMany();
    const copyMap = new Map<string, any>(copies.map((c: any) => [c.id, c]));

    const books = await db.query.libraryBooks.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const bookMap = new Map<string, any>(books.map((b: any) => [b.id, b]));

    const result = fines.map((f: any) => {
      const mem = memberMap.get(f.memberId);
      const cir = cirMap.get(f.circulationId);
      const copy = cir ? copyMap.get(cir.copyId) : null;
      const book = copy ? bookMap.get(copy.bookId) : null;

      let memberNameEn = 'Member';
      let memberNameNp = 'सदस्य';

      if (mem?.memberType === 'STUDENT' && mem.studentId) {
        const s = studentMap.get(mem.studentId);
        if (s) {
          memberNameEn = [s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
          memberNameNp = [s.firstNameNp, s.middleNameNp, s.lastNameNp].filter(Boolean).join(' ');
        }
      } else if (mem?.memberType === 'STAFF' && mem.staffId) {
        const st = staffMap.get(mem.staffId);
        if (st) {
          memberNameEn = st.fullNameEn || [st.firstNameEn, st.middleNameEn, st.lastNameEn].filter(Boolean).join(' ');
          memberNameNp = st.fullNameNp || [st.firstNameNp, st.middleNameNp, st.lastNameNp].filter(Boolean).join(' ');
        }
      }

      return {
        ...f,
        memberCardNumber: mem?.cardNumber || '',
        memberNameEn,
        memberNameNp,
        bookTitleEn: book?.titleEn || '',
        bookTitleNp: book?.titleNp || '',
        accessionNumber: copy?.accessionNumber || '',
      };
    });

    return reply.send(result);
  });

  fastify.post('/fines/:id/pay', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const fine = await db.query.libraryFines.findFirst({
      where: (t: any, { eq, and }: any) => and(eq(t.id, id), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!fine) {
      return reply.status(404).send({ message: 'जरिवाना लगत भेटिएन' });
    }

    const paidAmount = Number(body.paidAmount) || fine.fineAmount;
    const waivedAmount = Number(body.waivedAmount) || 0;
    const todayBs = body.paymentDateBs || getTodayBs();
    const receiptNumber = body.receiptNumber || `RCP-FINE-${Date.now().toString().slice(-6)}`;

    await db.update(schema.libraryFines).set({
      paidAmount,
      waivedAmount,
      paymentStatus: waivedAmount >= fine.fineAmount ? 'WAIVED' : 'PAID',
      paymentDateBs: todayBs,
      receiptNumber,
      collectedById: currentUser.userId || null,
    }).where(eq(schema.libraryFines.id, id));

    return reply.send({
      success: true,
      receiptNumber,
      message: 'जरिवाना भुक्तानी दर्ता गरियो',
    });
  });

  // ==========================================
  // 7. Dashboard & Analytics Summary
  // ==========================================
  fastify.get('/reports/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const books = await db.query.libraryBooks.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const members = await db.query.libraryMembers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const circulations = await db.query.libraryCirculations.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const fines = await db.query.libraryFines.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    let totalCopies = 0;
    let availableCopies = 0;
    for (const b of books) {
      totalCopies += b.totalCopies;
      availableCopies += b.availableCopies;
    }

    const activeLoans = circulations.filter((c: any) => c.status === 'ISSUED').length;
    const overdueLoans = circulations.filter((c: any) => c.status === 'OVERDUE').length;

    let totalFineCollected = 0;
    let totalFinePending = 0;
    for (const f of fines) {
      if (f.paymentStatus === 'PAID') {
        totalFineCollected += f.paidAmount;
      } else if (f.paymentStatus === 'UNPAID') {
        totalFinePending += f.fineAmount;
      }
    }

    return reply.send({
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      issuedCopies: totalCopies - availableCopies,
      activeLoans,
      overdueLoans,
      activeMembers: members.length,
      totalFineCollected,
      totalFinePending,
    });
  });
}
