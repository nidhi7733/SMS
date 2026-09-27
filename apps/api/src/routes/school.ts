import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function schoolRoutes(fastify: FastifyInstance) {
  // Public school basic profile (no auth required for header/login branding)
  fastify.get('/public', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const school = await db.query.schools.findFirst();

    if (!school) {
      return reply.status(404).send({ message: 'School profile not configured' });
    }

    return reply.send({
      school: {
        id: school.id,
        code: school.code,
        nameEn: school.nameEn,
        nameNp: school.nameNp,
        mottoEn: school.mottoEn,
        mottoNp: school.mottoNp,
        logoUrl: school.logoUrl,
        iemisCode: school.iemisCode,
        activeAcademicYearBs: school.activeAcademicYearBs,
        fiscalYearBs: school.fiscalYearBs,
      },
    });
  });

  // Get active school profile
  fastify.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const db = await getDb();
    const school = await db.query.schools.findFirst();

    if (!school) {
      return reply.status(404).send({ message: 'School profile not configured' });
    }

    const currentYear = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, school.id), eq(table.isCurrent, true)),
    });

    return reply.send({
      school,
      currentYear,
    });
  });

  // Update school profile
  fastify.put('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const body = request.body as any;
    const db = await getDb();
    const school = await db.query.schools.findFirst();

    if (!school) {
      return reply.status(404).send({ message: 'School not found' });
    }

    const updated = await db.update(schema.schools)
      .set({
        nameEn: body.nameEn ?? school.nameEn,
        nameNp: body.nameNp ?? school.nameNp,
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : school.logoUrl,
        iemisCode: body.iemisCode !== undefined ? body.iemisCode : school.iemisCode,
        code: body.code !== undefined ? body.code : school.code,
        mottoEn: body.mottoEn ?? school.mottoEn,
        mottoNp: body.mottoNp ?? school.mottoNp,
        phone: body.phone ?? school.phone,
        email: body.email ?? school.email,
        website: body.website ?? school.website,
        addressEn: body.addressEn ?? school.addressEn,
        addressNp: body.addressNp ?? school.addressNp,
        province: body.province ?? school.province,
        district: body.district ?? school.district,
        localLevel: body.localLevel ?? school.localLevel,
        wardNumber: body.wardNumber ? parseInt(body.wardNumber, 10) : school.wardNumber,
        activeAcademicYearBs: body.activeAcademicYearBs ? parseInt(body.activeAcademicYearBs, 10) : school.activeAcademicYearBs,
        fiscalYearBs: body.fiscalYearBs ?? school.fiscalYearBs,
        updatedAt: new Date(),
      })
      .where(eq(schema.schools.id, school.id))
      .returning();

    // Record audit log
    const user = (request as any).user;
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: school.id,
      userId: user.userId,
      action: 'UPDATE_SCHOOL_PROFILE',
      entity: 'School',
      entityId: school.id,
      oldValues: school,
      newValues: updated[0],
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({ school: updated[0] });
  });
}
