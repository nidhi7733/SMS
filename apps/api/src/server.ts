import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { runMigrationsAndSeed } from './db/seed.js';
import { authRoutes } from './routes/auth.js';
import { schoolRoutes } from './routes/school.js';
import { usersRoutes } from './routes/users.js';
import academicRoutes from './routes/academic.js';
import studentRoutes from './routes/students.js';
import staffRoutes from './routes/staff.js';
import attendanceRoutes from './routes/attendance.js';
import staffAttendanceRoutes from './routes/staffAttendance.js';
import calendarRoutes from './routes/calendar.js';
import routineRoutes from './routes/routine.js';
import substituteRoutes from './routes/substitute.js';
import examRoutes from './routes/exams.js';
import certificateRoutes from './routes/certificates.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
  bodyLimit: 15 * 1024 * 1024, // 15MB
});

// Allow empty body with application/json (e.g. for DELETE requests)
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  if (!body || (typeof body === 'string' && body.trim() === '')) {
    return done(null, {});
  }
  try {
    return done(null, JSON.parse(body as string));
  } catch (err: any) {
    err.statusCode = 400;
    return done(err, undefined);
  }
});

async function main() {
  try {
    // 1. Plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await fastify.register(cookie);

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'sms_dev_jwt_secret_nepal_2083_super_secure',
    });

    // 2. Health check
    fastify.get('/api/health', async () => {
      return {
        status: 'ok',
        service: 'SMS Backend API (Nepal)',
        timestamp: new Date().toISOString(),
      };
    });

    // 3. Register Feature Routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(schoolRoutes, { prefix: '/api/school' });
    await fastify.register(usersRoutes, { prefix: '/api/users' });
    await fastify.register(academicRoutes, { prefix: '/api/academic' });
    await fastify.register(studentRoutes, { prefix: '/api/students' });
    await fastify.register(staffRoutes, { prefix: '/api/staff' });
    await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
    await fastify.register(staffAttendanceRoutes, { prefix: '/api/staff-attendance' });
    await fastify.register(calendarRoutes, { prefix: '/api/calendar' });
    await fastify.register(routineRoutes, { prefix: '/api/routine' });
    await fastify.register(substituteRoutes, { prefix: '/api/substitute' });
    await fastify.register(examRoutes, { prefix: '/api/exams' });
    await fastify.register(certificateRoutes, { prefix: '/api/certificates' });

    // 4. Auto-run database seed and migration
    console.log('[Server] Checking and initializing database...');
    await runMigrationsAndSeed();

    // 5. Start listening
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`[Server] SMS API is actively listening at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
