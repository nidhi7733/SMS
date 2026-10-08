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

export default async function transportRoutes(fastify: FastifyInstance) {
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
  // 1. Transport Summary / Overview Dashboard
  // ==========================================
  fastify.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const schoolId = currentUser.schoolId;

    const [vehicles, staffList, routes, stops, allocations, maintenance] = await Promise.all([
      db.query.transportVehicles.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportStaff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportRoutes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportStops.findMany(),
      db.query.studentTransportAllocations.findMany({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, schoolId), eq(t.status, 'ACTIVE')),
      }),
      db.query.transportMaintenanceLogs.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
    ]);

    const totalCapacity = vehicles.reduce((acc: number, v: any) => acc + (v.capacity || 0), 0);
    const totalAllocatedStudents = allocations.length;
    const totalMaintenanceExpenses = maintenance.reduce((acc: number, m: any) => acc + (m.totalCost || 0), 0);

    // Stop fare calculation for monthly revenue projection
    const stopFareMap = new Map<string, number>(stops.map((s: any) => [s.id, Number(s.monthlyFare) || 0]));
    const estimatedMonthlyTransportRevenue = allocations.reduce((acc: number, a: any) => {
      const fare = Number(stopFareMap.get(a.stopId) || 0);
      return acc + fare;
    }, 0);

    return reply.send({
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v: any) => v.status === 'ACTIVE').length,
      totalCapacity,
      totalStaff: staffList.length,
      totalDrivers: staffList.filter((s: any) => s.role === 'DRIVER').length,
      totalRoutes: routes.length,
      activeRoutes: routes.filter((r: any) => r.isActive).length,
      totalAllocatedStudents,
      estimatedMonthlyTransportRevenue,
      totalMaintenanceExpenses,
    });
  });

  // ==========================================
  // 2. Vehicles (सवारी साधनहरू)
  // ==========================================
  fastify.get('/vehicles', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const [vehicles, routes, allocations] = await Promise.all([
      db.query.transportVehicles.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.vehicleNumber)],
      }),
      db.query.transportRoutes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
      db.query.studentTransportAllocations.findMany({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.status, 'ACTIVE')),
      }),
    ]);

    // Map route to vehicle
    const routeToVehicleMap = new Map<string, string | null>(routes.map((r: any) => [r.id, r.vehicleId || null]));

    const vehiclePassengerCount = new Map<string, number>();
    for (const alloc of allocations) {
      const vehicleId = routeToVehicleMap.get(alloc.routeId);
      if (vehicleId) {
        vehiclePassengerCount.set(vehicleId, (vehiclePassengerCount.get(vehicleId) || 0) + 1);
      }
    }

    const results = vehicles.map((v: any) => ({
      ...v,
      currentOccupancy: vehiclePassengerCount.get(v.id) || 0,
      occupancyPercentage: v.capacity > 0 ? Math.min(100, Math.round(((vehiclePassengerCount.get(v.id) || 0) / v.capacity) * 100)) : 0,
    }));

    return reply.send(results);
  });

  fastify.post('/vehicles', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.vehicleNumber || !body.bluebookExpiryBs || !body.insuranceExpiryBs) {
      return reply.status(400).send({ message: 'गाडी नम्बर, ब्लुबुक म्याद र बीमा म्याद अनिवार्य छन्' });
    }

    const newVehicle = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      vehicleNumber: body.vehicleNumber.trim(),
      vehicleType: body.vehicleType || 'BUS',
      capacity: Number(body.capacity) || 30,
      fuelType: body.fuelType || 'DIESEL',
      modelYear: body.modelYear?.trim() || null,
      bluebookExpiryBs: body.bluebookExpiryBs.trim(),
      insuranceExpiryBs: body.insuranceExpiryBs.trim(),
      pollutionExpiryBs: body.pollutionExpiryBs?.trim() || null,
      status: body.status || 'ACTIVE',
      notes: body.notes?.trim() || null,
    };

    await db.insert(schema.transportVehicles).values(newVehicle);
    return reply.status(201).send(newVehicle);
  });

  fastify.put('/vehicles/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.transportVehicles)
      .set({
        vehicleNumber: body.vehicleNumber ? body.vehicleNumber.trim() : undefined,
        vehicleType: body.vehicleType,
        capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
        fuelType: body.fuelType,
        modelYear: body.modelYear !== undefined ? body.modelYear : undefined,
        bluebookExpiryBs: body.bluebookExpiryBs ? body.bluebookExpiryBs.trim() : undefined,
        insuranceExpiryBs: body.insuranceExpiryBs ? body.insuranceExpiryBs.trim() : undefined,
        pollutionExpiryBs: body.pollutionExpiryBs !== undefined ? body.pollutionExpiryBs : undefined,
        status: body.status,
        notes: body.notes !== undefined ? body.notes : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.transportVehicles.id, id), eq(schema.transportVehicles.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'सवारी साधन विवरण अद्यावधिक गरियो' });
  });

  fastify.delete('/vehicles/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.transportVehicles)
      .where(and(eq(schema.transportVehicles.id, id), eq(schema.transportVehicles.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'सवारी साधन हटाइयो' });
  });

  // ==========================================
  // 3. Transport Staff (चालक तथा सह-चालक)
  // ==========================================
  fastify.get('/staff', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const staffList = await db.query.transportStaff.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.fullName)],
    });

    return reply.send(staffList);
  });

  fastify.post('/staff', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.fullName || !body.phone) {
      return reply.status(400).send({ message: 'कर्मचारीको पूरा नाम र फोन नम्बर अनिवार्य छन्' });
    }

    const newStaff = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      staffId: body.staffId || null,
      role: body.role || 'DRIVER',
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      licenseNo: body.licenseNo?.trim() || null,
      licenseCategory: body.licenseCategory?.trim() || null,
      licenseExpiryBs: body.licenseExpiryBs?.trim() || null,
      emergencyContact: body.emergencyContact?.trim() || null,
      isActive: body.isActive !== false,
    };

    await db.insert(schema.transportStaff).values(newStaff);
    return reply.status(201).send(newStaff);
  });

  fastify.put('/staff/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.transportStaff)
      .set({
        staffId: body.staffId !== undefined ? body.staffId : undefined,
        role: body.role,
        fullName: body.fullName ? body.fullName.trim() : undefined,
        phone: body.phone ? body.phone.trim() : undefined,
        licenseNo: body.licenseNo !== undefined ? body.licenseNo : undefined,
        licenseCategory: body.licenseCategory !== undefined ? body.licenseCategory : undefined,
        licenseExpiryBs: body.licenseExpiryBs !== undefined ? body.licenseExpiryBs : undefined,
        emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact : undefined,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.transportStaff.id, id), eq(schema.transportStaff.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'यातायात कर्मचारी विवरण अद्यावधिक गरियो' });
  });

  fastify.delete('/staff/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.transportStaff)
      .where(and(eq(schema.transportStaff.id, id), eq(schema.transportStaff.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'यातायात कर्मचारी हटाइयो' });
  });

  // ==========================================
  // 4. Transport Routes & Stops (रुट तथा बस स्टपहरू)
  // ==========================================
  fastify.get('/routes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const schoolId = currentUser.schoolId;

    const [routes, vehicles, staffList, allStops, allocations] = await Promise.all([
      db.query.transportRoutes.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.routeNameEn)],
      }),
      db.query.transportVehicles.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportStaff.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportStops.findMany({
        orderBy: (t: any, { asc }: any) => [asc(t.stopOrder)],
      }),
      db.query.studentTransportAllocations.findMany({
        where: (t: any, { eq, and }: any) => and(eq(t.schoolId, schoolId), eq(t.status, 'ACTIVE')),
      }),
    ]);

    const vehicleMap = new Map(vehicles.map((v: any) => [v.id, v]));
    const staffMap = new Map(staffList.map((s: any) => [s.id, s]));

    // Group stops by routeId
    const stopsByRoute = new Map<string, any[]>();
    for (const stop of allStops) {
      if (!stopsByRoute.has(stop.routeId)) {
        stopsByRoute.set(stop.routeId, []);
      }
      stopsByRoute.get(stop.routeId)!.push(stop);
    }

    // Allocation counts
    const routeAllocationCounts = new Map<string, number>();
    for (const alloc of allocations) {
      routeAllocationCounts.set(alloc.routeId, (routeAllocationCounts.get(alloc.routeId) || 0) + 1);
    }

    const results = routes.map((r: any) => ({
      ...r,
      vehicle: r.vehicleId ? vehicleMap.get(r.vehicleId) || null : null,
      driver: r.driverId ? staffMap.get(r.driverId) || null : null,
      helper: r.helperId ? staffMap.get(r.helperId) || null : null,
      stops: stopsByRoute.get(r.id) || [],
      totalAllocatedStudents: routeAllocationCounts.get(r.id) || 0,
    }));

    return reply.send(results);
  });

  fastify.post('/routes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.routeNameEn || !body.routeNameNp || !body.startPoint || !body.endPoint) {
      return reply.status(400).send({ message: 'रुटको नाम (नेपाली र अङ्ग्रेजी) र सुरु/अन्तिम विन्दु अनिवार्य छन्' });
    }

    const routeId = crypto.randomUUID();
    const newRoute = {
      id: routeId,
      schoolId: currentUser.schoolId,
      vehicleId: body.vehicleId || null,
      driverId: body.driverId || null,
      helperId: body.helperId || null,
      routeNameEn: body.routeNameEn.trim(),
      routeNameNp: body.routeNameNp.trim(),
      startPoint: body.startPoint.trim(),
      endPoint: body.endPoint.trim(),
      isActive: body.isActive !== false,
    };

    await db.insert(schema.transportRoutes).values(newRoute);

    // If initial stops provided in payload, insert them
    if (Array.isArray(body.stops) && body.stops.length > 0) {
      for (let i = 0; i < body.stops.length; i++) {
        const s = body.stops[i];
        if (s.stopNameEn && s.stopNameNp) {
          await db.insert(schema.transportStops).values({
            id: crypto.randomUUID(),
            routeId,
            stopOrder: s.stopOrder || i + 1,
            stopNameEn: s.stopNameEn.trim(),
            stopNameNp: s.stopNameNp.trim(),
            morningPickupTime: s.morningPickupTime || '07:30',
            eveningDropTime: s.eveningDropTime || '16:00',
            monthlyFare: Number(s.monthlyFare) || 0,
          });
        }
      }
    }

    return reply.status(201).send(newRoute);
  });

  fastify.put('/routes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.transportRoutes)
      .set({
        vehicleId: body.vehicleId !== undefined ? body.vehicleId : undefined,
        driverId: body.driverId !== undefined ? body.driverId : undefined,
        helperId: body.helperId !== undefined ? body.helperId : undefined,
        routeNameEn: body.routeNameEn ? body.routeNameEn.trim() : undefined,
        routeNameNp: body.routeNameNp ? body.routeNameNp.trim() : undefined,
        startPoint: body.startPoint ? body.startPoint.trim() : undefined,
        endPoint: body.endPoint ? body.endPoint.trim() : undefined,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.transportRoutes.id, id), eq(schema.transportRoutes.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'रुट सफलतापूर्वक अद्यावधिक गरियो' });
  });

  fastify.delete('/routes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.transportRoutes)
      .where(and(eq(schema.transportRoutes.id, id), eq(schema.transportRoutes.schoolId, currentUser.schoolId)));

    return reply.send({ message: 'रुट हटाइयो' });
  });

  // Stop management
  fastify.post('/stops', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const body = request.body as any;

    if (!body.routeId || !body.stopNameEn || !body.stopNameNp) {
      return reply.status(400).send({ message: 'रुट र बस स्टपको नाम अनिवार्य छन्' });
    }

    const newStop = {
      id: crypto.randomUUID(),
      routeId: body.routeId,
      stopOrder: Number(body.stopOrder) || 1,
      stopNameEn: body.stopNameEn.trim(),
      stopNameNp: body.stopNameNp.trim(),
      morningPickupTime: body.morningPickupTime?.trim() || '07:30',
      eveningDropTime: body.eveningDropTime?.trim() || '16:00',
      monthlyFare: Number(body.monthlyFare) || 0,
    };

    await db.insert(schema.transportStops).values(newStop);
    return reply.status(201).send(newStop);
  });

  fastify.put('/stops/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.transportStops)
      .set({
        stopOrder: body.stopOrder !== undefined ? Number(body.stopOrder) : undefined,
        stopNameEn: body.stopNameEn ? body.stopNameEn.trim() : undefined,
        stopNameNp: body.stopNameNp ? body.stopNameNp.trim() : undefined,
        morningPickupTime: body.morningPickupTime ? body.morningPickupTime.trim() : undefined,
        eveningDropTime: body.eveningDropTime ? body.eveningDropTime.trim() : undefined,
        monthlyFare: body.monthlyFare !== undefined ? Number(body.monthlyFare) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.transportStops.id, id));

    return reply.send({ message: 'बस स्टप अद्यावधिक गरियो' });
  });

  fastify.delete('/stops/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const { id } = request.params as { id: string };

    await db.delete(schema.transportStops).where(eq(schema.transportStops.id, id));
    return reply.send({ message: 'बस स्टप हटाइयो' });
  });

  // ==========================================
  // 5. Student Allocations (विद्यार्थी बस सिट बाँडफाँड)
  // ==========================================
  fastify.get('/allocations', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const schoolId = currentUser.schoolId;
    const { routeId, status, search } = request.query as {
      routeId?: string;
      status?: string;
      search?: string;
    };

    const [allocs, students, classes, sections, routes, stops, vehicles] = await Promise.all([
      db.query.studentTransportAllocations.findMany({
        where: (t: any, { eq, and }: any) => {
          const conds = [eq(t.schoolId, schoolId)];
          if (routeId) conds.push(eq(t.routeId, routeId));
          if (status && status !== 'ALL') conds.push(eq(t.status, status));
          return and(...conds);
        },
        orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      }),
      db.query.students.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.classes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.sections.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportRoutes.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
      db.query.transportStops.findMany(),
      db.query.transportVehicles.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, schoolId) }),
    ]);

    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const classMap = new Map<string, string>(classes.map((c: any) => [c.id, c.nameNp || c.nameEn]));
    const sectionMap = new Map<string, string>(sections.map((sec: any) => [sec.id, sec.name]));
    const routeMap = new Map<string, any>(routes.map((r: any) => [r.id, r]));
    const stopMap = new Map<string, any>(stops.map((st: any) => [st.id, st]));
    const vehicleMap = new Map<string, string>(vehicles.map((v: any) => [v.id, v.vehicleNumber]));

    let results = allocs.map((a: any) => {
      const student = studentMap.get(a.studentId) as any;
      const route = routeMap.get(a.routeId) as any;
      const stop = stopMap.get(a.stopId) as any;
      const vehicleNum = route?.vehicleId ? vehicleMap.get(route.vehicleId) : null;

      const studentNameNp = student ? `${student.firstNameNp || student.firstNameEn} ${student.lastNameNp || student.lastNameEn || ''}`.trim() : 'विद्यार्थी';
      const studentNameEn = student ? `${student.firstNameEn} ${student.lastNameEn || ''}`.trim() : 'Student';

      return {
        ...a,
        studentNameNp,
        studentNameEn,
        studentName: studentNameNp,
        admissionNo: student?.admissionNo,
        rollNumber: student?.currentRollNumber,
        className: student?.currentClassId ? classMap.get(student.currentClassId) : '',
        sectionName: student?.currentSectionId ? sectionMap.get(student.currentSectionId) : '',
        routeName: route?.routeNameNp || route?.routeNameEn || '',
        vehicleNumber: vehicleNum || '',
        stopNameNp: stop?.stopNameNp || '',
        stopNameEn: stop?.stopNameEn || '',
        stopName: stop?.stopNameNp || stop?.stopNameEn || '',
        morningPickupTime: stop?.morningPickupTime || '',
        eveningDropTime: stop?.eveningDropTime || '',
        monthlyFare: stop?.monthlyFare || 0,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((r: any) =>
        r.studentNameNp.toLowerCase().includes(q) ||
        r.studentNameEn.toLowerCase().includes(q) ||
        (r.admissionNo && r.admissionNo.toLowerCase().includes(q)) ||
        r.stopNameNp.toLowerCase().includes(q) ||
        r.routeName.toLowerCase().includes(q)
      );
    }

    return reply.send(results);
  });

  fastify.post('/allocations', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.studentId || !body.routeId || !body.stopId) {
      return reply.status(400).send({ message: 'विद्यार्थी, रुट र बस स्टप अनिवार्य छन्' });
    }

    // Check if student already has active allocation
    const existing = await db.query.studentTransportAllocations.findFirst({
      where: (t: any, { eq, and }: any) =>
        and(eq(t.studentId, body.studentId), eq(t.schoolId, currentUser.schoolId), eq(t.status, 'ACTIVE')),
    });

    if (existing) {
      return reply.status(400).send({ message: 'यो विद्यार्थी पहिले नै सक्रिय यातायात रुटमा बाँडफाँड भइसकेको छ।' });
    }

    const newAlloc = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      studentId: body.studentId,
      routeId: body.routeId,
      stopId: body.stopId,
      academicYearBs: Number(body.academicYearBs) || 2083,
      startDateBs: body.startDateBs || getTodayBs(),
      status: body.status || 'ACTIVE',
      remarks: body.remarks?.trim() || null,
    };

    await db.insert(schema.studentTransportAllocations).values(newAlloc);
    return reply.status(201).send(newAlloc);
  });

  fastify.put('/allocations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.studentTransportAllocations)
      .set({
        routeId: body.routeId,
        stopId: body.stopId,
        status: body.status,
        remarks: body.remarks !== undefined ? body.remarks : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.studentTransportAllocations.id, id), eq(schema.studentTransportAllocations.schoolId, currentUser.schoolId))
      );

    return reply.send({ message: 'विद्यार्थी सिट बाँडफाँड अद्यावधिक गरियो' });
  });

  fastify.delete('/allocations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.studentTransportAllocations)
      .where(
        and(eq(schema.studentTransportAllocations.id, id), eq(schema.studentTransportAllocations.schoolId, currentUser.schoolId))
      );

    return reply.send({ message: 'विद्यार्थी बस सेवा बाँडफाँड रद्द गरियो' });
  });

  // ==========================================
  // 6. Maintenance & Fuel Logs (सवारी मर्मत तथा इन्धन लगबुक)
  // ==========================================
  fastify.get('/maintenance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { vehicleId, logType } = request.query as { vehicleId?: string; logType?: string };

    const [logs, vehicles] = await Promise.all([
      db.query.transportMaintenanceLogs.findMany({
        where: (t: any, { eq, and }: any) => {
          const conds = [eq(t.schoolId, currentUser.schoolId)];
          if (vehicleId) conds.push(eq(t.vehicleId, vehicleId));
          if (logType && logType !== 'ALL') conds.push(eq(t.logType, logType));
          return and(...conds);
        },
        orderBy: (t: any, { desc }: any) => [desc(t.logDateBs), desc(t.createdAt)],
      }),
      db.query.transportVehicles.findMany({ where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId) }),
    ]);

    const vehicleMap = new Map(vehicles.map((v: any) => [v.id, v.vehicleNumber]));

    const results = logs.map((l: any) => ({
      ...l,
      vehicleNumber: vehicleMap.get(l.vehicleId) || 'Unknown Vehicle',
    }));

    return reply.send(results);
  });

  fastify.post('/maintenance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.vehicleId || !body.totalCost) {
      return reply.status(400).send({ message: 'सवारी साधन र कुल खर्च रकम अनिवार्य छन्' });
    }

    const newLog = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      vehicleId: body.vehicleId,
      logDateBs: body.logDateBs || getTodayBs(),
      logType: body.logType || 'FUEL',
      odometerKm: body.odometerKm ? Number(body.odometerKm) : null,
      fuelQuantityLiters: body.fuelQuantityLiters ? Number(body.fuelQuantityLiters) : null,
      totalCost: Number(body.totalCost) || 0,
      vendorName: body.vendorName?.trim() || null,
      invoiceNo: body.invoiceNo?.trim() || null,
      remarks: body.remarks?.trim() || null,
    };

    await db.insert(schema.transportMaintenanceLogs).values(newLog);
    return reply.status(201).send(newLog);
  });

  fastify.put('/maintenance/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    await db
      .update(schema.transportMaintenanceLogs)
      .set({
        vehicleId: body.vehicleId,
        logDateBs: body.logDateBs,
        logType: body.logType,
        odometerKm: body.odometerKm !== undefined ? Number(body.odometerKm) : undefined,
        fuelQuantityLiters: body.fuelQuantityLiters !== undefined ? Number(body.fuelQuantityLiters) : undefined,
        totalCost: body.totalCost !== undefined ? Number(body.totalCost) : undefined,
        vendorName: body.vendorName !== undefined ? body.vendorName : undefined,
        invoiceNo: body.invoiceNo !== undefined ? body.invoiceNo : undefined,
        remarks: body.remarks !== undefined ? body.remarks : undefined,
      })
      .where(
        and(eq(schema.transportMaintenanceLogs.id, id), eq(schema.transportMaintenanceLogs.schoolId, currentUser.schoolId))
      );

    return reply.send({ message: 'लग प्रविष्टि अद्यावधिक गरियो' });
  });

  fastify.delete('/maintenance/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { id } = request.params as { id: string };

    await db
      .delete(schema.transportMaintenanceLogs)
      .where(
        and(eq(schema.transportMaintenanceLogs.id, id), eq(schema.transportMaintenanceLogs.schoolId, currentUser.schoolId))
      );

    return reply.send({ message: 'लग प्रविष्टि हटाइयो' });
  });
}
