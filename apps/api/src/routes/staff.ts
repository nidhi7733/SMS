import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc, ilike, or } from 'drizzle-orm';
import crypto from 'crypto';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

export default async function staffRoutes(fastify: FastifyInstance) {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Unauthorized' });
      return false;
    }
    return true;
  };

  // Helper to generate next sequential staff code: T-2083-001 or S-2083-001
  const generateStaffCode = async (db: any, schoolId: string, category: string, yearBs: number = 2083) => {
    const prefix = category === 'TEACHING' ? 'T' : 'S';
    const existing = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, schoolId), eq(table.category, category)),
      orderBy: (table: any, { desc }: any) => [desc(table.staffCode)],
    });

    let nextSeq = 1;
    if (existing.length > 0) {
      for (const s of existing) {
        const match = s.staffCode?.match(new RegExp(`^${prefix}-${yearBs}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextSeq) nextSeq = num + 1;
        }
      }
      if (nextSeq === 1) nextSeq = existing.length + 1;
    }

    return `${prefix}-${yearBs}-${String(nextSeq).padStart(3, '0')}`;
  };

  // 1. List Staff (with search & filters)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const query = request.query as {
      q?: string;
      category?: string;
      designation?: string;
      appointmentType?: string;
      status?: string;
    };

    const allStaff = await db.query.staff.findMany({
      where: (table: any, { eq, and }: any) => {
        const conditions = [eq(table.schoolId, currentUser.schoolId)];
        if (query.category && query.category !== 'ALL') {
          conditions.push(eq(table.category, query.category));
        }
        if (query.designation && query.designation !== 'ALL') {
          conditions.push(eq(table.designation, query.designation));
        }
        if (query.appointmentType && query.appointmentType !== 'ALL') {
          conditions.push(eq(table.appointmentType, query.appointmentType));
        }
        if (query.status && query.status !== 'ALL') {
          conditions.push(eq(table.status, query.status));
        }
        return and(...conditions);
      },
      orderBy: (table: any, { asc }: any) => [asc(table.staffCode), asc(table.fullNameEn)],
    });

    // In-memory text search if q is provided
    let results = allStaff;
    if (query.q && query.q.trim()) {
      const term = query.q.trim().toLowerCase();
      results = allStaff.filter(
        (s: any) =>
          s.fullNameEn?.toLowerCase().includes(term) ||
          s.fullNameNp?.toLowerCase().includes(term) ||
          s.staffCode?.toLowerCase().includes(term) ||
          s.phone?.includes(term) ||
          s.majorSubject?.toLowerCase().includes(term)
      );
    }

    // Summary counts
    const totalStaff = allStaff.length;
    const teachingCount = allStaff.filter((s: any) => s.category === 'TEACHING').length;
    const nonTeachingCount = allStaff.filter((s: any) => s.category === 'NON_TEACHING').length;

    return reply.send({
      staff: results,
      total: results.length,
      counts: {
        total: totalStaff,
        teaching: teachingCount,
        nonTeaching: nonTeachingCount,
      },
    });
  });

  // 2. Get Single Staff
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const record = await db.query.staff.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!record) {
      return reply.status(404).send({ message: 'Staff member not found' });
    }

    // If linked to a user account, get user details
    let linkedUser = null;
    if (record.userId) {
      linkedUser = await db.query.users.findFirst({
        where: (table: any, { eq }: any) => eq(table.id, record.userId),
        columns: {
          id: true,
          username: true,
          email: true,
          phone: true,
          status: true,
        },
      });
    }

    return reply.send({ ...record, linkedUser });
  });

  // 3. Create Staff
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.fullNameEn || !body.phone || !body.dobBs) {
      return reply.status(400).send({ message: 'Full name, phone, and date of birth (BS) are required' });
    }

    const category = body.category || 'TEACHING';
    const staffCode = body.staffCode || (await generateStaffCode(db, currentUser.schoolId, category));

    const newStaff = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      staffCode,
      category,
      fullNameEn: body.fullNameEn.trim(),
      fullNameNp: body.fullNameNp?.trim() || body.fullNameEn.trim(),
      dobBs: body.dobBs.trim(),
      dobAd: body.dobAd || null,
      gender: body.gender || 'MALE',
      bloodGroup: body.bloodGroup || null,
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      citizenshipNo: body.citizenshipNo?.trim() || null,
      nationalIdNo: body.nationalIdNo?.trim() || null,
      panNumber: body.panNumber?.trim() || null,
      appointmentType: body.appointmentType || 'PERMANENT',
      designation: body.designation || (category === 'TEACHING' ? 'TEACHER' : 'OFFICE_ASSISTANT'),
      teachingLicenseNo: body.teachingLicenseNo?.trim() || null,
      qualification: body.qualification || 'BACHELOR',
      majorSubject: body.majorSubject?.trim() || null,
      training: body.training?.trim() || null,
      bankName: body.bankName?.trim() || null,
      bankAccountNo: body.bankAccountNo?.trim() || null,
      permanentAddress: body.permanentAddress?.trim() || null,
      currentAddress: body.currentAddress?.trim() || null,
      status: body.status || 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.staff).values(newStaff);

    return reply.status(201).send(newStaff);
  });

  // 4. Update Staff
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db.query.staff.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Staff member not found' });
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (body.fullNameEn) updates.fullNameEn = body.fullNameEn.trim();
    if (body.fullNameNp) updates.fullNameNp = body.fullNameNp.trim();
    if (body.dobBs) updates.dobBs = body.dobBs.trim();
    if (body.dobAd !== undefined) updates.dobAd = body.dobAd;
    if (body.gender) updates.gender = body.gender;
    if (body.bloodGroup !== undefined) updates.bloodGroup = body.bloodGroup;
    if (body.phone) updates.phone = body.phone.trim();
    if (body.email !== undefined) updates.email = body.email ? body.email.trim() : null;
    if (body.citizenshipNo !== undefined) updates.citizenshipNo = body.citizenshipNo ? body.citizenshipNo.trim() : null;
    if (body.nationalIdNo !== undefined) updates.nationalIdNo = body.nationalIdNo ? body.nationalIdNo.trim() : null;
    if (body.panNumber !== undefined) updates.panNumber = body.panNumber ? body.panNumber.trim() : null;
    if (body.category) updates.category = body.category;
    if (body.appointmentType) updates.appointmentType = body.appointmentType;
    if (body.designation) updates.designation = body.designation;
    if (body.teachingLicenseNo !== undefined) updates.teachingLicenseNo = body.teachingLicenseNo ? body.teachingLicenseNo.trim() : null;
    if (body.qualification) updates.qualification = body.qualification;
    if (body.majorSubject !== undefined) updates.majorSubject = body.majorSubject ? body.majorSubject.trim() : null;
    if (body.training !== undefined) updates.training = body.training ? body.training.trim() : null;
    if (body.bankName !== undefined) updates.bankName = body.bankName ? body.bankName.trim() : null;
    if (body.bankAccountNo !== undefined) updates.bankAccountNo = body.bankAccountNo ? body.bankAccountNo.trim() : null;
    if (body.permanentAddress !== undefined) updates.permanentAddress = body.permanentAddress ? body.permanentAddress.trim() : null;
    if (body.currentAddress !== undefined) updates.currentAddress = body.currentAddress ? body.currentAddress.trim() : null;
    if (body.status) updates.status = body.status;

    await db.update(schema.staff).set(updates).where(eq(schema.staff.id, id));

    return reply.send({ message: 'Staff member updated successfully', id });
  });

  // 5. Delete Staff
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    const existing = await db.query.staff.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.id, id), eq(table.schoolId, currentUser.schoolId)),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Staff member not found' });
    }

    await db.delete(schema.staff).where(eq(schema.staff.id, id));

    return reply.send({ message: 'Staff member deleted successfully', id });
  });

  // 6. Preview IEMIS Staff/Teacher Excel File
  fastify.post('/preview-iemis', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { fileData, defaultCategory = 'TEACHING' } = request.body as {
      fileData: string; // Base64 encoded excel
      defaultCategory?: 'TEACHING' | 'NON_TEACHING';
    };

    if (!fileData) {
      return reply.status(400).send({ message: 'No file data provided' });
    }

    try {
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = xlsx.utils.sheet_to_json<any>(worksheet);

      if (rawRows.length === 0) {
        return reply.status(400).send({ message: 'The uploaded file contains no data rows' });
      }

      // Existing staff to detect duplicates
      const existingStaff = await db.query.staff.findMany({
        where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
      });

      const existingPhoneMap = new Map<string, any>();
      const existingNameDobMap = new Map<string, any>();
      for (const s of existingStaff) {
        if (s.phone) existingPhoneMap.set(s.phone.trim(), s);
        if (s.fullNameEn && s.dobBs) {
          const key = `${s.fullNameEn.trim().toLowerCase()}_${s.dobBs.trim()}`;
          existingNameDobMap.set(key, s);
        }
      }

      // Auto-detect category from sheet name or file name if possible
      let detectedCategory = defaultCategory;
      if (firstSheetName.toLowerCase().includes('teacher')) {
        detectedCategory = 'TEACHING';
      } else if (firstSheetName.toLowerCase().includes('staff')) {
        detectedCategory = 'NON_TEACHING';
      }

      const rows: any[] = [];
      let readyCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < rawRows.length; i++) {
        const r = rawRows[i];
        const sn = r['S.N'] || r['SN'] || (i + 1);
        const orgCode = String(r['Organization Code'] || r['School Code'] || '').trim();
        const orgName = String(r['Organization Name'] || r['School Name'] || '').trim();
        const fullName = String(r['Full Name'] || r['FullName'] || r['Name'] || '').trim();
        const contactNumber = String(r['Contact Number'] || r['Phone'] || r['Mobile'] || '').trim();
        const training = r['Training'] ? String(r['Training']).trim() : null;
        const dobBs = String(r['Date Of Birth'] || r['DOB'] || '').trim();

        if (!fullName) continue;

        let isDuplicate = false;
        let duplicateReason = '';

        if (contactNumber && existingPhoneMap.has(contactNumber)) {
          isDuplicate = true;
          duplicateReason = `Duplicate phone (${contactNumber}) already registered with ${existingPhoneMap.get(contactNumber).fullNameEn}`;
        } else if (fullName && dobBs && existingNameDobMap.has(`${fullName.toLowerCase()}_${dobBs}`)) {
          isDuplicate = true;
          duplicateReason = `Duplicate name & DOB (${fullName}, ${dobBs}) already registered`;
        }

        if (isDuplicate) {
          duplicateCount++;
        } else {
          readyCount++;
        }

        rows.push({
          sn,
          orgCode,
          orgName,
          fullName,
          contactNumber,
          training,
          dobBs,
          category: detectedCategory,
          isDuplicate,
          duplicateReason,
        });
      }

      return reply.send({
        totalRows: rows.length,
        readyCount,
        duplicateCount,
        detectedCategory,
        sheetName: firstSheetName,
        rows,
      });
    } catch (err: any) {
      return reply.status(400).send({ message: `Failed to parse Excel file: ${err.message}` });
    }
  });

  // 7. Bulk Import IEMIS Staff/Teachers
  fastify.post('/bulk-import-iemis', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { rows, category = 'TEACHING', createUserAccounts = false } = request.body as {
      rows: any[];
      category?: 'TEACHING' | 'NON_TEACHING';
      createUserAccounts?: boolean;
    };

    if (!rows || rows.length === 0) {
      return reply.status(400).send({ message: 'No rows provided for import' });
    }

    // Existing staff to prevent duplicate insertion
    const existingStaff = await db.query.staff.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, currentUser.schoolId),
    });
    const existingPhones = new Set(existingStaff.map((s: any) => s.phone?.trim()).filter(Boolean));
    const existingKeys = new Set(
      existingStaff.map((s: any) => `${s.fullNameEn?.trim().toLowerCase()}_${s.dobBs?.trim()}`)
    );

    let importedCount = 0;
    let skippedCount = 0;
    const createdStaffList: any[] = [];

    // Get starting sequence
    const yearBs = 2083;
    const prefix = category === 'TEACHING' ? 'T' : 'S';
    let currentSeq = 1;
    for (const s of existingStaff) {
      if (s.category === category && s.staffCode) {
        const match = s.staffCode.match(new RegExp(`^${prefix}-${yearBs}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= currentSeq) currentSeq = num + 1;
        }
      }
    }

    // Role for user accounts
    let userRoleId: string | null = null;
    if (createUserAccounts) {
      const targetRoleName = category === 'TEACHING' ? 'TEACHER' : 'ADMIN_STAFF';
      const roleRecord = await db.query.roles.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.schoolId, currentUser.schoolId), eq(table.name, targetRoleName)),
      });
      if (roleRecord) userRoleId = roleRecord.id;
    }

    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    for (const r of rows) {
      const fullName = (r.fullName || '').trim();
      const phone = (r.contactNumber || '').trim();
      const dobBs = (r.dobBs || '').trim();
      const training = r.training ? String(r.training).trim() : null;

      if (!fullName) {
        skippedCount++;
        continue;
      }

      // Check duplicates
      const nameKey = `${fullName.toLowerCase()}_${dobBs}`;
      if ((phone && existingPhones.has(phone)) || existingKeys.has(nameKey)) {
        skippedCount++;
        continue;
      }

      const staffCode = `${prefix}-${yearBs}-${String(currentSeq++).padStart(3, '0')}`;
      const staffId = crypto.randomUUID();

      let createdUserId: string | null = null;

      // Create linked user login account if requested
      if (createUserAccounts && phone) {
        try {
          const username = phone;
          const existingUser = await db.query.users.findFirst({
            where: (table: any, { eq }: any) => eq(table.username, username),
          });

          if (!existingUser) {
            createdUserId = crypto.randomUUID();
            await db.insert(schema.users).values({
              id: createdUserId,
              schoolId: currentUser.schoolId,
              username,
              passwordHash: defaultPasswordHash,
              phone,
              fullNameEn: fullName,
              fullNameNp: fullName,
              status: 'ACTIVE',
              isSuperAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            if (userRoleId) {
              await db.insert(schema.userRoles).values({
                userId: createdUserId,
                roleId: userRoleId,
              });
            }
          } else {
            createdUserId = existingUser.id;
          }
        } catch {
          // ignore user account creation errors to keep staff import safe
        }
      }

      const newRecord = {
        id: staffId,
        schoolId: currentUser.schoolId,
        staffCode,
        category,
        fullNameEn: fullName,
        fullNameNp: fullName, // will be displayed or edited
        dobBs: dobBs || '2040-01-01',
        dobAd: null,
        gender: 'MALE',
        phone: phone || '9800000000',
        appointmentType: category === 'TEACHING' ? 'PERMANENT' : 'OFFICE_SUPPORT',
        designation: category === 'TEACHING' ? 'TEACHER' : 'OFFICE_ASSISTANT',
        qualification: category === 'TEACHING' ? 'BACHELOR' : 'SLC_SEE',
        training,
        userId: createdUserId,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(schema.staff).values(newRecord);

      if (phone) existingPhones.add(phone);
      existingKeys.add(nameKey);
      createdStaffList.push(newRecord);
      importedCount++;
    }

    return reply.send({
      message: `Successfully imported ${importedCount} staff members (${skippedCount} duplicates skipped)`,
      importedCount,
      skippedCount,
      staff: createdStaffList,
    });
  });

  // 8. Download IEMIS Teacher & Staff Template (.xlsx)
  fastify.get('/template', async (request: FastifyRequest, reply: FastifyReply) => {
    const wb = xlsx.utils.book_new();

    // Headers conforming to CEHRD IEMIS report
    const headers = [
      'S.N',
      'Organization Code',
      'Organization Name',
      'Full Name',
      'Contact Number',
      'Training',
      'Date Of Birth',
    ];

    const sampleTeacherRows = [
      [1, '170720001', 'Rajeshwar Nidhi Secondary School', 'Suresh Kumar Yadav', '9844260152', '10-day TPD', '2032-06-08'],
      [2, '170720001', 'Rajeshwar Nidhi Secondary School', 'Manohar Kumar Sah', '9844116295', '', '2038-05-25'],
      [3, '170720001', 'Rajeshwar Nidhi Secondary School', 'Sabnam Kumari Yadav', '9844283386', '', '2045-10-17'],
    ];

    const wsData = [headers, ...sampleTeacherRows];
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 35 },
      { wch: 28 },
      { wch: 16 },
      { wch: 15 },
      { wch: 15 },
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Teacher_Staff_List');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="CEHRD_Teacher_Staff_Template.xlsx"')
      .send(buffer);
  });
}
