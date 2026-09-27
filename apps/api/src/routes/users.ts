import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function usersRoutes(fastify: FastifyInstance) {
  // Helper to verify System Administrator privilege
  const verifySystemAdmin = (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const isSysAdmin = user?.roles?.includes('SYSTEM_ADMIN') || user?.isSuperAdmin;
    if (!isSysAdmin) {
      reply.status(403).send({
        message: 'Access Denied: This operation is restricted exclusively to System Administrators.',
      });
      return false;
    }
    return true;
  };

  // 1. List all users
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const db = await getDb();
    const userList = await db.query.users.findMany({
      columns: {
        passwordHash: false,
      },
    });

    // Populate user roles
    const userRoleRecords = await db.query.userRoles.findMany();
    const allRoles = await db.query.roles.findMany();
    const roleMap = new Map(allRoles.map((r: any) => [r.id, r]));

    const usersWithRoles = userList.map((u: any) => {
      const uRoles = userRoleRecords
        .filter((ur: any) => ur.userId === u.id)
        .map((ur: any) => roleMap.get(ur.roleId))
        .filter(Boolean);

      return {
        ...u,
        roles: uRoles,
      };
    });

    return reply.send({ users: usersWithRoles });
  });

  // 2. Create new user (System Admin or users with USERS_MANAGE)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    if (!verifySystemAdmin(request, reply)) return;

    const body = request.body as any;
    const { username, password, fullNameEn, fullNameNp, email, phone, roleId } = body;

    if (!username || !password || !fullNameEn || !fullNameNp || !roleId) {
      return reply.status(400).send({ message: 'Missing required fields' });
    }

    const db = await getDb();
    const existing = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.username, username.trim()),
    });

    if (existing) {
      return reply.status(400).send({ message: 'Username already taken' });
    }

    const school = await db.query.schools.findFirst();
    if (!school) {
      return reply.status(500).send({ message: 'School not configured' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await db.insert(schema.users).values({
      id: userId,
      schoolId: school.id,
      username: username.trim(),
      passwordHash,
      email: email || null,
      phone: phone || null,
      fullNameEn,
      fullNameNp,
      status: 'ACTIVE',
      isSuperAdmin: false,
    });

    await db.insert(schema.userRoles).values({
      userId,
      roleId,
    });

    const currentUser = (request as any).user;
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: school.id,
      userId: currentUser.userId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: userId,
      newValues: { username: username.trim(), fullNameEn, roleId },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(201).send({
      message: 'User created successfully',
      userId,
    });
  });

  // 3. Edit User (Exclusively for System Administrator)
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    if (!verifySystemAdmin(request, reply)) return;

    const { id } = request.params as { id: string };
    const body = request.body as any;
    const db = await getDb();

    const existing = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const updateData: Record<string, any> = {
      fullNameEn: body.fullNameEn ?? existing.fullNameEn,
      fullNameNp: body.fullNameNp ?? existing.fullNameNp,
      email: body.email !== undefined ? body.email : existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      status: body.status ?? existing.status,
      updatedAt: new Date(),
    };

    // If new password provided, hash it
    if (body.password && body.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(body.password.trim(), 10);
    }

    await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id));

    // Update role if changed
    if (body.roleId) {
      await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, id));
      await db.insert(schema.userRoles).values({
        userId: id,
        roleId: body.roleId,
      });
    }

    // Record audit log
    const currentUser = (request as any).user;
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: existing.schoolId,
      userId: currentUser.userId,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      oldValues: { fullNameEn: existing.fullNameEn, status: existing.status },
      newValues: { fullNameEn: updateData.fullNameEn, status: updateData.status, roleId: body.roleId },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({ message: 'User updated successfully' });
  });

  // 4. Delete User (Exclusively for System Administrator)
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    if (!verifySystemAdmin(request, reply)) return;

    const { id } = request.params as { id: string };
    const currentUser = (request as any).user;

    // Safeguard: Prevent system admin from deleting their own active account
    if (id === currentUser.userId) {
      return reply.status(400).send({
        message: 'Security Precaution: You cannot delete your own active administrator account.',
      });
    }

    const db = await getDb();
    const existing = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, id),
    });

    if (!existing) {
      return reply.status(404).send({ message: 'User not found' });
    }

    // Delete role assignments and user
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, id));
    await db.delete(schema.users).where(eq(schema.users.id, id));

    // Record audit log
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: existing.schoolId,
      userId: currentUser.userId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      oldValues: { username: existing.username, fullNameEn: existing.fullNameEn },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({ message: 'User deleted successfully' });
  });

  // 5. List all roles with their assigned permissions
  fastify.get('/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const db = await getDb();
    const allRoles = await db.query.roles.findMany();
    const allRolePerms = await db.query.rolePermissions.findMany();
    const allPerms = await db.query.permissions.findMany();
    const permMap = new Map(allPerms.map((p: any) => [p.id, p]));

    const rolesWithPermissions = allRoles.map((role: any) => {
      const perms = allRolePerms
        .filter((rp: any) => rp.roleId === role.id)
        .map((rp: any) => permMap.get(rp.permissionId))
        .filter(Boolean);

      return {
        ...role,
        permissions: perms,
      };
    });

    return reply.send({ roles: rolesWithPermissions });
  });

  // Create new role
  fastify.post('/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    if (!verifySystemAdmin(request, reply)) return;

    const { name, displayNameEn, displayNameNp, description, permissionCodes, permissionIds } = request.body as any;
    if (!name || !displayNameEn || !displayNameNp) {
      return reply.status(400).send({ message: 'Missing required role name or display names' });
    }

    const db = await getDb();
    const school = await db.query.schools.findFirst();
    if (!school) return reply.status(500).send({ message: 'School not configured' });

    const existingRole = await db.query.roles.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, school.id), eq(table.name, name.trim().toUpperCase())),
    });

    if (existingRole) {
      return reply.status(400).send({ message: 'Role with this name already exists' });
    }

    const roleId = crypto.randomUUID();
    const newRole = {
      id: roleId,
      schoolId: school.id,
      name: name.trim().toUpperCase(),
      displayNameEn,
      displayNameNp,
      description: description || null,
      isSystemRole: false,
    };

    await db.insert(schema.roles).values(newRole);

    const allPerms = await db.query.permissions.findMany();
    let targetPerms: any[] = [];
    if (permissionCodes && Array.isArray(permissionCodes)) {
      targetPerms = allPerms.filter((p: any) => permissionCodes.includes(p.code));
    } else if (permissionIds && Array.isArray(permissionIds)) {
      targetPerms = allPerms.filter((p: any) => permissionIds.includes(p.id));
    }

    for (const p of targetPerms) {
      await db.insert(schema.rolePermissions).values({
        roleId,
        permissionId: p.id,
      });
    }

    return reply.status(201).send({
      message: 'Role created successfully',
      role: {
        ...newRole,
        permissions: targetPerms,
      },
    });
  });

  // 6. List all available system permissions (grouped master list)
  fastify.get('/permissions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const db = await getDb();
    const allPerms = await db.query.permissions.findMany();
    return reply.send({ permissions: allPerms });
  });

  // 7. Update Permissions for a Role (Exclusively for System Administrator)
  fastify.put('/roles/:roleId/permissions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    if (!verifySystemAdmin(request, reply)) return;

    const { roleId } = request.params as { roleId: string };
    const body = request.body as { permissionCodes?: string[]; permissionIds?: string[] };
    const db = await getDb();

    const role = await db.query.roles.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, roleId),
    });

    if (!role) {
      return reply.status(404).send({ message: 'Role not found' });
    }

    const allPerms = await db.query.permissions.findMany();
    let targetPerms: any[] = [];

    if (body.permissionCodes && Array.isArray(body.permissionCodes)) {
      targetPerms = allPerms.filter((p: any) => body.permissionCodes?.includes(p.code));
    } else if (body.permissionIds && Array.isArray(body.permissionIds)) {
      targetPerms = allPerms.filter((p: any) => body.permissionIds?.includes(p.id));
    }

    // Delete existing mappings
    await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));

    // Insert new mappings
    for (const p of targetPerms) {
      await db.insert(schema.rolePermissions).values({
        roleId,
        permissionId: p.id,
      });
    }

    // Record audit log
    const currentUser = (request as any).user;
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: role.schoolId,
      userId: currentUser.userId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entity: 'Role',
      entityId: roleId,
      newValues: {
        roleName: role.name,
        permissionCount: targetPerms.length,
        permissionCodes: targetPerms.map((p: any) => p.code),
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.send({
      message: `Permissions updated successfully for role ${role.displayNameEn} (${role.name})`,
      roleId,
      permissions: targetPerms,
    });
  });
}
