import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, password } = request.body as any;

    if (!username || !password) {
      return reply.status(400).send({ message: 'Username and password are required' });
    }

    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.username, username.trim()),
    });

    if (!user) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    if (user.status !== 'ACTIVE') {
      return reply.status(403).send({ message: 'Your account is deactivated or suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    // Fetch user roles and permissions
    const userRoleRecords = await db.query.userRoles.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, user.id),
    });

    const roleIds = userRoleRecords.map((ur: any) => ur.roleId);
    let roles: any[] = [];
    let permissionCodes: string[] = [];

    if (roleIds.length > 0) {
      roles = await db.query.roles.findMany({
        where: (table: any, { inArray }: any) => inArray(table.id, roleIds),
      });

      const rolePerms = await db.query.rolePermissions.findMany({
        where: (table: any, { inArray }: any) => inArray(table.roleId, roleIds),
      });

      const permIds = rolePerms.map((rp: any) => rp.permissionId);
      if (permIds.length > 0) {
        const perms = await db.query.permissions.findMany({
          where: (table: any, { inArray }: any) => inArray(table.id, permIds),
        });
        permissionCodes = Array.from(new Set(perms.map((p: any) => p.code)));
      }
    }

    const payload = {
      userId: user.id,
      schoolId: user.schoolId,
      username: user.username,
      roles: roles.map((r) => r.name),
    };

    const token = (fastify as any).jwt.sign(payload, { expiresIn: '7d' });

    // Record audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullNameEn: user.fullNameEn,
        fullNameNp: user.fullNameNp,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayNameEn: r.displayNameEn,
          displayNameNp: r.displayNameNp,
        })),
        permissions: permissionCodes,
      },
    });
  });

  // Me / Session
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized session' });
    }

    const decoded = (request as any).user;
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, decoded.userId),
    });

    if (!user || user.status !== 'ACTIVE') {
      return reply.status(401).send({ message: 'User session not found or inactive' });
    }

    const userRoleRecords = await db.query.userRoles.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, user.id),
    });

    const roleIds = userRoleRecords.map((ur: any) => ur.roleId);
    let roles: any[] = [];
    let permissionCodes: string[] = [];

    if (roleIds.length > 0) {
      roles = await db.query.roles.findMany({
        where: (table: any, { inArray }: any) => inArray(table.id, roleIds),
      });

      const rolePerms = await db.query.rolePermissions.findMany({
        where: (table: any, { inArray }: any) => inArray(table.roleId, roleIds),
      });

      const permIds = rolePerms.map((rp: any) => rp.permissionId);
      if (permIds.length > 0) {
        const perms = await db.query.permissions.findMany({
          where: (table: any, { inArray }: any) => inArray(table.id, permIds),
        });
        permissionCodes = Array.from(new Set(perms.map((p: any) => p.code)));
      }
    }

    return reply.send({
      user: {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullNameEn: user.fullNameEn,
        fullNameNp: user.fullNameNp,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayNameEn: r.displayNameEn,
          displayNameNp: r.displayNameNp,
        })),
        permissions: permissionCodes,
      },
    });
  });

  // Logout
  fastify.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, message: 'Logged out successfully' });
  });
}
