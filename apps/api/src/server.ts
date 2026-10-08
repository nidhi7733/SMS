import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import path from 'path';
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
import feeRoutes from './routes/fees.js';
import accountingRoutes from './routes/accounting.js';
import inventoryRoutes from './routes/inventory.js';


// Load environment variables from cwd or parent directories
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const bodyLimitMb = Number(process.env.BODY_LIMIT_MB) || 15;

const fastify = Fastify({
  logger: isProd ? { level: 'info' } : true,
  bodyLimit: bodyLimitMb * 1024 * 1024,
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
    // 1. Security Headers (Helmet)
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disabled to allow internal SVG/data URIs and inline printing templates
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    // 2. CORS Configuration
    const corsEnv = process.env.CORS_ORIGIN;
    let allowedOrigins: any = true;

    if (corsEnv && corsEnv.trim() !== '*' && corsEnv.trim() !== '') {
      allowedOrigins = corsEnv.includes(',')
        ? corsEnv.split(',').map((o) => o.trim())
        : corsEnv.trim();
    } else if (isProd && !corsEnv) {
      // In production without explicit CORS_ORIGIN, default to false or same-origin
      console.warn('[SECURITY] CORS_ORIGIN not specified in production. Defaulting to same-origin / local dev.');
      allowedOrigins = true;
    }

    await fastify.register(cors, {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    });

    // 3. Rate Limiting (DDoS & Brute-force protection)
    const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 200;
    await fastify.register(rateLimit, {
      max: rateLimitMax,
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    });

    // 4. Cookies
    await fastify.register(cookie, {
      secret: process.env.COOKIE_SECRET || 'sms_dev_cookie_secret_salt_2083',
    });

    // 5. JWT Authentication
    const jwtSecret = process.env.JWT_SECRET || 'sms_dev_jwt_secret_nepal_2083_super_secure';
    if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'sms_dev_jwt_secret_nepal_2083_super_secure')) {
      console.warn('⚠️ [CRITICAL SECURITY WARNING] Running in production with default/missing JWT_SECRET. Set JWT_SECRET in environment variables before public deployment!');
    }

    await fastify.register(jwt, {
      secret: jwtSecret,
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });

    // 6. Health Check
    fastify.get('/api/health', async () => {
      return {
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        service: 'Hamro SMS Backend API (Nepal)',
        timestamp: new Date().toISOString(),
      };
    });

    // 7. Register Feature Routes
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
    await fastify.register(feeRoutes, { prefix: '/api/fees' });
    await fastify.register(accountingRoutes, { prefix: '/api/accounting' });
    await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });


    // 8. Auto-run database seed and migration
    console.log('[Server] Checking and initializing database schema...');
    await runMigrationsAndSeed();

    // 9. Start listening
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`[Server] SMS API is actively listening at http://${host}:${port} (${process.env.NODE_ENV || 'development'})`);

    // 10. Graceful Shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n[Server] Received ${signal}. Gracefully closing Fastify server...`);
        try {
          await fastify.close();
          console.log('[Server] Server closed successfully.');
          process.exit(0);
        } catch (closeErr) {
          console.error('[Server] Error while closing server:', closeErr);
          process.exit(1);
        }
      });
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
