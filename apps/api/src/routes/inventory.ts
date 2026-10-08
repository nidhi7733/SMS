import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, schema } from '../db/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';
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

export default async function inventoryRoutes(fastify: FastifyInstance) {
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
  // 1. Categories (जिन्सी वर्गीकरण)
  // ==========================================
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const categories = await db.query.inventoryCategories.findMany({
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
      return reply.status(400).send({ message: 'कोड र नाम अनिवार्य छन् (Category code and name required)' });
    }

    const newCategory = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      code: body.code.toUpperCase().trim(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      description: body.description || null,
    };

    await db.insert(schema.inventoryCategories).values(newCategory);
    return reply.status(201).send(newCategory);
  });

  // ==========================================
  // 2. Inventory Items (जिन्सी सामग्री सूची)
  // ==========================================
  fastify.get('/items', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const items = await db.query.inventoryItems.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.itemCode)],
    });

    const categories = await db.query.inventoryCategories.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const catMap = new Map<string, any>(categories.map((c: any) => [c.id, c]));

    const result = items.map((item: any) => ({
      ...item,
      category: catMap.get(item.categoryId) || null,
      isLowStock: Number(item.currentStock) <= Number(item.reorderLevel),
    }));

    return reply.send(result);
  });

  fastify.post('/items', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.itemCode || !body.nameEn || !body.nameNp || !body.categoryId) {
      return reply.status(400).send({ message: 'सामग्री कोड, नाम र वर्ग अनिवार्य छन् (Required fields missing)' });
    }

    const existing = await db.query.inventoryItems.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.itemCode, body.itemCode)),
    });
    if (existing) {
      return reply.status(400).send({ message: 'यो सामग्री कोड पहिल्यै दर्ता छ (Item code already exists)' });
    }

    const newItem = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      categoryId: body.categoryId,
      itemCode: body.itemCode.trim(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      itemType: body.itemType || 'CONSUMABLE',
      unit: body.unit || 'PCS',
      reorderLevel: Number(body.reorderLevel) || 5,
      currentStock: Number(body.currentStock) || 0,
      lastPurchasePrice: Number(body.lastPurchasePrice) || 0,
      description: body.description || null,
      isActive: true,
    };

    await db.insert(schema.inventoryItems).values(newItem);
    return reply.status(201).send(newItem);
  });

  // ==========================================
  // 3. Purchases & GRN (जिन्सी खरिद तथा दाखिला)
  // ==========================================
  fastify.get('/purchases', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const purchases = await db.query.inventoryPurchases.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.purchaseDateBs), desc(t.createdAt)],
    });

    const purchaseIds = purchases.map((p: any) => p.id);
    let items: any[] = [];
    if (purchaseIds.length > 0) {
      items = await db.query.inventoryPurchaseItems.findMany();
    }

    const invItems = await db.query.inventoryItems.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const itemMap = new Map<string, any>(invItems.map((i: any) => [i.id, i]));

    const itemsByPurchase: Record<string, any[]> = {};
    for (const it of items) {
      if (!itemsByPurchase[it.purchaseId]) itemsByPurchase[it.purchaseId] = [];
      const itemInfo = itemMap.get(it.itemId);
      itemsByPurchase[it.purchaseId].push({
        ...it,
        item: itemInfo || null,
      });
    }

    const result = purchases.map((p: any) => ({
      ...p,
      items: itemsByPurchase[p.id] || [],
    }));

    return reply.send(result);
  });

  fastify.post('/purchases', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return reply.status(400).send({ message: 'खरिद गरिएका सामानहरू सूचीकृत गर्नुहोस् (Purchase items required)' });
    }

    const payDateBs = body.purchaseDateBs || getTodayBs();
    const payDateAd = new Date().toISOString().split('T')[0];

    // Calculate totals
    let subTotal = 0;
    for (const it of items) {
      subTotal += (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    }
    const discount = Number(body.discountAmount) || 0;
    const vat = Number(body.vatAmount) || 0;
    const totalAmount = Math.max(0, subTotal - discount + vat);

    // Generate GRN Number
    const allPurchases = await db.query.inventoryPurchases.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const seq = allPurchases.length + 1;
    const yearPrefix = payDateBs.slice(0, 4) || '2083';
    const grnNumber = `GRN-${yearPrefix}-${String(seq).padStart(4, '0')}`;

    const purchaseId = crypto.randomUUID();

    // -------------------------------------------------------------
    // Automatic Double Entry Journal Voucher
    // Dr: Inventory Stock Account (1301)
    // Cr: Cash (1001) / Bank (1002) / Accounts Payable (2001)
    // -------------------------------------------------------------
    let autoVoucherId: string | null = null;
    try {
      const coaList = await db.query.chartOfAccounts.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      });

      const invStockAcc = coaList.find((a: any) => a.code === '1301') || coaList.find((a: any) => a.code.startsWith('13')) || coaList[0];

      let creditAcc = null;
      if (body.creditAccountId) {
        creditAcc = coaList.find((a: any) => a.id === body.creditAccountId);
      }
      if (!creditAcc) {
        if (body.paymentType === 'BANK') {
          creditAcc = coaList.find((a: any) => a.code === '1002') || coaList.find((a: any) => a.code === '1001');
        } else if (body.paymentType === 'CREDIT') {
          creditAcc = coaList.find((a: any) => a.code === '2001'); // Accounts Payable
        } else {
          creditAcc = coaList.find((a: any) => a.code === '1001'); // Cash in Hand
        }
      }

      if (invStockAcc && creditAcc && totalAmount > 0) {
        const vouchers = await db.query.journalVouchers.findMany({
          where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        });
        const vSeq = vouchers.length + 1;
        const vType = body.paymentType === 'BANK' ? 'BP' : body.paymentType === 'CREDIT' ? 'JV' : 'CP';
        const vNum = `${vType}-${yearPrefix}-${String(vSeq).padStart(4, '0')}`;

        autoVoucherId = crypto.randomUUID();
        await db.insert(schema.journalVouchers).values({
          id: autoVoucherId,
          schoolId: currentUser.schoolId,
          voucherNumber: vNum,
          voucherType: vType,
          voucherDateBs: payDateBs,
          voucherDateAd: payDateAd,
          fiscalYearBs: '2082/083',
          narration: `जिन्सी खरिद दाखिला ${grnNumber} (${body.vendorName}) - बिल नं: ${body.billNumber}`,
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          status: 'POSTED',
          referenceModule: 'INVENTORY_PURCHASE',
          referenceId: purchaseId,
          createdById: currentUser.userId || currentUser.id,
          approvedById: currentUser.userId || currentUser.id,
        });

        // Debit Inventory Stock
        await db.insert(schema.journalVoucherItems).values({
          id: crypto.randomUUID(),
          voucherId: autoVoucherId,
          accountId: invStockAcc.id,
          particulars: `To Inventory Stock Purchase (${body.vendorName})`,
          debitAmount: totalAmount,
          creditAmount: 0,
          displayOrder: 1,
        });

        // Credit Cash / Bank / Vendor Payable
        await db.insert(schema.journalVoucherItems).values({
          id: crypto.randomUUID(),
          voucherId: autoVoucherId,
          accountId: creditAcc.id,
          particulars: `By Payment/Payable to ${body.vendorName}`,
          debitAmount: 0,
          creditAmount: totalAmount,
          displayOrder: 2,
        });

        // Update running balances
        await db.update(schema.chartOfAccounts).set({
          currentBalanceDr: (invStockAcc.currentBalanceDr || 0) + totalAmount,
        }).where(eq(schema.chartOfAccounts.id, invStockAcc.id));

        await db.update(schema.chartOfAccounts).set({
          currentBalanceCr: (creditAcc.currentBalanceCr || 0) + totalAmount,
        }).where(eq(schema.chartOfAccounts.id, creditAcc.id));
      }
    } catch (jvErr) {
      console.error('[Inventory Auto-JV Error]', jvErr);
    }

    // Insert Purchase Record
    await db.insert(schema.inventoryPurchases).values({
      id: purchaseId,
      schoolId: currentUser.schoolId,
      grnNumber,
      vendorName: body.vendorName || '',
      vendorPan: body.vendorPan || null,
      billNumber: body.billNumber || '',
      purchaseDateBs: payDateBs,
      purchaseDateAd: payDateAd,
      subTotal,
      discountAmount: discount,
      vatAmount: vat,
      totalAmount,
      paymentType: body.paymentType || 'CASH',
      creditAccountId: body.creditAccountId || null,
      voucherId: autoVoucherId,
      remarks: body.remarks || null,
      status: 'RECEIVED',
      receivedById: currentUser.userId || currentUser.id,
    });

    // Insert items & increment stock
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const rate = Number(it.unitPrice) || 0;
      const tPrice = q * rate;

      await db.insert(schema.inventoryPurchaseItems).values({
        id: crypto.randomUUID(),
        purchaseId,
        itemId: it.itemId,
        quantity: q,
        unitPrice: rate,
        totalPrice: tPrice,
        remarks: it.remarks || null,
      });

      // Update item current stock & last purchase price
      const existingItem = await db.query.inventoryItems.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, it.itemId),
      });

      if (existingItem) {
        await db.update(schema.inventoryItems).set({
          currentStock: (existingItem.currentStock || 0) + q,
          lastPurchasePrice: rate,
          updatedAt: new Date(),
        }).where(eq(schema.inventoryItems.id, it.itemId));
      }
    }

    const created = await db.query.inventoryPurchases.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, purchaseId),
    });

    return reply.status(201).send({
      success: true,
      purchase: created,
      grnNumber,
      message: `दाखिला ${grnNumber} मौज्दातमा सफलतापूर्वक प्रविष्टि भयो (Purchase GRN recorded successfully)`,
    });
  });

  // ==========================================
  // 4. Issues & Requisition (जिन्सी निकासी तथा माग फारम)
  // ==========================================
  fastify.get('/issues', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const issues = await db.query.inventoryIssues.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.issueDateBs), desc(t.createdAt)],
    });

    const issueIds = issues.map((i: any) => i.id);
    let items: any[] = [];
    if (issueIds.length > 0) {
      items = await db.query.inventoryIssueItems.findMany();
    }

    const invItems = await db.query.inventoryItems.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const itemMap = new Map<string, any>(invItems.map((i: any) => [i.id, i]));

    const itemsByIssue: Record<string, any[]> = {};
    for (const it of items) {
      if (!itemsByIssue[it.issueId]) itemsByIssue[it.issueId] = [];
      const itemInfo = itemMap.get(it.itemId);
      itemsByIssue[it.issueId].push({
        ...it,
        item: itemInfo || null,
      });
    }

    const result = issues.map((i: any) => ({
      ...i,
      items: itemsByIssue[i.id] || [],
    }));

    return reply.send(result);
  });

  fastify.post('/issues', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return reply.status(400).send({ message: 'निकासी गरिने सामानहरू खुलाउनुहोस् (Issue items required)' });
    }

    // Edge-case check: Verify that every requested item has enough stock
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const invItem = await db.query.inventoryItems.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, it.itemId),
      });

      if (!invItem) {
        return reply.status(404).send({ message: 'सामग्री फेला परेन (Item not found)' });
      }

      if ((invItem.currentStock || 0) < q) {
        return reply.status(400).send({
          message: `सामग्री '${invItem.nameNp}' को मौज्दात अपुग छ! हाल बाँकी: ${invItem.currentStock} ${invItem.unit}, माग गरिएको: ${q} ${invItem.unit} (Insufficient stock)`,
        });
      }
    }

    const issueDateBs = body.issueDateBs || getTodayBs();
    const issueDateAd = new Date().toISOString().split('T')[0];

    // Generate Issue Number
    const allIssues = await db.query.inventoryIssues.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const seq = allIssues.length + 1;
    const yearPrefix = issueDateBs.slice(0, 4) || '2083';
    const issueNumber = `ISS-${yearPrefix}-${String(seq).padStart(4, '0')}`;

    const issueId = crypto.randomUUID();

    // Calculate total issued consumable value for Auto-JV
    let totalConsumableValue = 0;
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const invItem = await db.query.inventoryItems.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, it.itemId),
      });
      if (invItem && invItem.itemType === 'CONSUMABLE') {
        totalConsumableValue += q * (invItem.lastPurchasePrice || 0);
      }
    }

    // Auto-Post Journal Voucher for consumable issuance:
    // Dr: Office Stationery Expense (5002)
    // Cr: Stationery Stock (1301)
    let autoVoucherId: string | null = null;
    if (totalConsumableValue > 0) {
      try {
        const coaList = await db.query.chartOfAccounts.findMany({
          where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        });

        const expenseAcc = coaList.find((a: any) => a.code === '5002') || coaList.find((a: any) => a.code.startsWith('50')) || coaList[0];
        const stockAcc = coaList.find((a: any) => a.code === '1301') || coaList.find((a: any) => a.code.startsWith('13')) || coaList[0];

        if (expenseAcc && stockAcc) {
          const vouchers = await db.query.journalVouchers.findMany({
            where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
          });
          const vSeq = vouchers.length + 1;
          const vNum = `JV-${yearPrefix}-${String(vSeq).padStart(4, '0')}`;

          autoVoucherId = crypto.randomUUID();
          await db.insert(schema.journalVouchers).values({
            id: autoVoucherId,
            schoolId: currentUser.schoolId,
            voucherNumber: vNum,
            voucherType: 'JV',
            voucherDateBs: issueDateBs,
            voucherDateAd: issueDateAd,
            fiscalYearBs: '2082/083',
            narration: `जिन्सी निकासी ${issueNumber} (${body.issuedToName} - ${body.purpose || 'शैक्षिक प्रयोजन'})`,
            totalDebit: totalConsumableValue,
            totalCredit: totalConsumableValue,
            status: 'POSTED',
            referenceModule: 'INVENTORY_ISSUE',
            referenceId: issueId,
            createdById: currentUser.userId || currentUser.id,
            approvedById: currentUser.userId || currentUser.id,
          });

          // Dr Expense
          await db.insert(schema.journalVoucherItems).values({
            id: crypto.randomUUID(),
            voucherId: autoVoucherId,
            accountId: expenseAcc.id,
            particulars: `To Stationery Expense for ${body.department || 'Office'}`,
            debitAmount: totalConsumableValue,
            creditAmount: 0,
            displayOrder: 1,
          });

          // Cr Stock
          await db.insert(schema.journalVoucherItems).values({
            id: crypto.randomUUID(),
            voucherId: autoVoucherId,
            accountId: stockAcc.id,
            particulars: `By Inventory Stock Issued to ${body.issuedToName}`,
            debitAmount: 0,
            creditAmount: totalConsumableValue,
            displayOrder: 2,
          });

          // Update running balances
          await db.update(schema.chartOfAccounts).set({
            currentBalanceDr: (expenseAcc.currentBalanceDr || 0) + totalConsumableValue,
          }).where(eq(schema.chartOfAccounts.id, expenseAcc.id));

          await db.update(schema.chartOfAccounts).set({
            currentBalanceCr: (stockAcc.currentBalanceCr || 0) + totalConsumableValue,
          }).where(eq(schema.chartOfAccounts.id, stockAcc.id));
        }
      } catch (jvErr) {
        console.error('[Issue Auto-JV Error]', jvErr);
      }
    }

    // Insert Issue record
    await db.insert(schema.inventoryIssues).values({
      id: issueId,
      schoolId: currentUser.schoolId,
      issueNumber,
      issueDateBs,
      issueDateAd,
      issuedToStaffId: body.issuedToStaffId || null,
      issuedToName: body.issuedToName || 'कर्मचारी',
      department: body.department || null,
      purpose: body.purpose || 'शैक्षिक प्रयोजन',
      voucherId: autoVoucherId,
      status: 'ISSUED',
      approvedById: currentUser.userId || currentUser.id,
    });

    // Insert issue items & decrement stock
    for (const it of items) {
      const q = Number(it.quantity) || 0;

      await db.insert(schema.inventoryIssueItems).values({
        id: crypto.randomUUID(),
        issueId,
        itemId: it.itemId,
        quantity: q,
        remarks: it.remarks || null,
      });

      const existingItem = await db.query.inventoryItems.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, it.itemId),
      });

      if (existingItem) {
        await db.update(schema.inventoryItems).set({
          currentStock: Math.max(0, (existingItem.currentStock || 0) - q),
          updatedAt: new Date(),
        }).where(eq(schema.inventoryItems.id, it.itemId));
      }
    }

    const created = await db.query.inventoryIssues.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, issueId),
    });

    return reply.status(201).send({
      success: true,
      issue: created,
      issueNumber,
      message: `निकासी फारम ${issueNumber} जारी गरियो (Stock issue recorded successfully)`,
    });
  });

  // ==========================================
  // 5. Fixed Assets Register & Valuation (स्थिर सम्पत्ति दर्ता)
  // ==========================================
  fastify.get('/assets', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const assets = await db.query.fixedAssets.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.assetTag)],
    });

    const items = await db.query.inventoryItems.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const itemMap = new Map<string, any>(items.map((i: any) => [i.id, i]));

    const result = assets.map((a: any) => ({
      ...a,
      item: a.itemId ? itemMap.get(a.itemId) || null : null,
    }));

    return reply.send(result);
  });

  fastify.post('/assets', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.assetTag || !body.nameEn || !body.nameNp || !body.originalCost) {
      return reply.status(400).send({ message: 'सम्पत्ति ट्याग, नाम र खरिद मूल्य अनिवार्य छन् (Required fields missing)' });
    }

    const cost = Number(body.originalCost) || 0;
    const pDateBs = body.purchaseDateBs || getTodayBs();
    const pDateAd = new Date().toISOString().split('T')[0];

    const newAsset = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      assetTag: body.assetTag.trim().toUpperCase(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      itemId: body.itemId || null,
      purchaseDateBs: pDateBs,
      purchaseDateAd: pDateAd,
      originalCost: cost,
      salvageValue: Number(body.salvageValue) || 0,
      usefulLifeYears: Number(body.usefulLifeYears) || 5,
      depreciationMethod: body.depreciationMethod || 'STRAIGHT_LINE',
      depreciationRate: Number(body.depreciationRate) || 20,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      location: body.location || 'कक्षाकोठा / शाखा',
      custodianStaffId: body.custodianStaffId || null,
      conditionStatus: body.conditionStatus || 'GOOD',
      remarks: body.remarks || null,
    };

    await db.insert(schema.fixedAssets).values(newAsset);
    return reply.status(201).send(newAsset);
  });

  // ==========================================
  // 6. Depreciation Batch Runner (ह्रासकट्टी गणना तथा लेखा प्रविष्टि)
  // ==========================================
  fastify.post('/assets/depreciate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const assets = await db.query.fixedAssets.findMany({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.schoolId, currentUser.schoolId), eq(t.conditionStatus, 'GOOD')),
    });

    let totalDepreciation = 0;
    const processed: any[] = [];

    for (const a of assets) {
      const orig = Number(a.originalCost) || 0;
      const salvage = Number(a.salvageValue) || 0;
      const rate = (Number(a.depreciationRate) || 20) / 100;
      const currentBook = Number(a.currentBookValue) || orig;

      let annualDep = 0;
      if (a.depreciationMethod === 'WDV') {
        annualDep = currentBook * rate;
      } else {
        // STRAIGHT_LINE
        annualDep = (orig - salvage) * rate;
      }

      // Cannot depreciate below salvage value
      const maxPossible = Math.max(0, currentBook - salvage);
      const actualDep = Math.min(annualDep, maxPossible);

      if (actualDep > 0) {
        const newAccum = (Number(a.accumulatedDepreciation) || 0) + actualDep;
        const newBook = orig - newAccum;

        await db.update(schema.fixedAssets).set({
          accumulatedDepreciation: Math.round(newAccum * 100) / 100,
          currentBookValue: Math.round(newBook * 100) / 100,
          updatedAt: new Date(),
        }).where(eq(schema.fixedAssets.id, a.id));

        totalDepreciation += actualDep;
        processed.push({
          assetTag: a.assetTag,
          nameNp: a.nameNp,
          depreciationAmount: Math.round(actualDep * 100) / 100,
          newBookValue: Math.round(newBook * 100) / 100,
        });
      }
    }

    totalDepreciation = Math.round(totalDepreciation * 100) / 100;

    // Auto-Post JV for Depreciation:
    // Dr: Fixed Asset Depreciation Expense (5101)
    // Cr: Furniture & Computer Asset Accounts (1201)
    let voucherNumber = null;
    if (totalDepreciation > 0) {
      try {
        const coaList = await db.query.chartOfAccounts.findMany({
          where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        });

        const depExpenseAcc = coaList.find((c: any) => c.code === '5101') || coaList.find((c: any) => c.code.startsWith('51')) || coaList[0];
        const assetAcc = coaList.find((c: any) => c.code === '1201') || coaList.find((c: any) => c.code.startsWith('12')) || coaList[0];

        if (depExpenseAcc && assetAcc) {
          const vouchers = await db.query.journalVouchers.findMany({
            where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
          });
          const seq = vouchers.length + 1;
          const todayBs = getTodayBs();
          const todayAd = new Date().toISOString().split('T')[0];
          voucherNumber = `JV-2083-${String(seq).padStart(4, '0')}`;

          const vId = crypto.randomUUID();
          await db.insert(schema.journalVouchers).values({
            id: vId,
            schoolId: currentUser.schoolId,
            voucherNumber,
            voucherType: 'JV',
            voucherDateBs: todayBs,
            voucherDateAd: todayAd,
            fiscalYearBs: '2082/083',
            narration: `स्थिर सम्पत्तिहरूको वार्षिक ह्रासकट्टी समायोजन भौचर (Annual Fixed Asset Depreciation)`,
            totalDebit: totalDepreciation,
            totalCredit: totalDepreciation,
            status: 'POSTED',
            referenceModule: 'DEPRECIATION',
            createdById: currentUser.userId || currentUser.id,
            approvedById: currentUser.userId || currentUser.id,
          });

          await db.insert(schema.journalVoucherItems).values({
            id: crypto.randomUUID(),
            voucherId: vId,
            accountId: depExpenseAcc.id,
            particulars: 'To Annual Depreciation Expense Account',
            debitAmount: totalDepreciation,
            creditAmount: 0,
            displayOrder: 1,
          });

          await db.insert(schema.journalVoucherItems).values({
            id: crypto.randomUUID(),
            voucherId: vId,
            accountId: assetAcc.id,
            particulars: 'By Accumulated Depreciation on Fixed Assets',
            debitAmount: 0,
            creditAmount: totalDepreciation,
            displayOrder: 2,
          });

          await db.update(schema.chartOfAccounts).set({
            currentBalanceDr: (depExpenseAcc.currentBalanceDr || 0) + totalDepreciation,
          }).where(eq(schema.chartOfAccounts.id, depExpenseAcc.id));

          await db.update(schema.chartOfAccounts).set({
            currentBalanceCr: (assetAcc.currentBalanceCr || 0) + totalDepreciation,
          }).where(eq(schema.chartOfAccounts.id, assetAcc.id));
        }
      } catch (depErr) {
        console.error('[Depreciation Auto-JV Error]', depErr);
      }
    }

    return reply.send({
      success: true,
      totalAssetsDepreciated: processed.length,
      totalDepreciation,
      voucherNumber,
      assets: processed,
      message: `कुल रू. ${totalDepreciation} ह्रासकट्टी गणना भई लेखा भौचर ${voucherNumber || ''} मा प्रविष्टि भयो!`,
    });
  });

  // ==========================================
  // 7. Stock Ledger & Reorder Alerts (जिन्सी मौज्दात प्रतिवेदन)
  // ==========================================
  fastify.get('/reports/stock-ledger', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const items = await db.query.inventoryItems.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.itemCode)],
    });

    const report = items.map((it: any) => {
      const stock = Number(it.currentStock) || 0;
      const rate = Number(it.lastPurchasePrice) || 0;
      const reorder = Number(it.reorderLevel) || 5;
      return {
        itemId: it.id,
        itemCode: it.itemCode,
        nameEn: it.nameEn,
        nameNp: it.nameNp,
        unit: it.unit,
        itemType: it.itemType,
        reorderLevel: reorder,
        currentStock: stock,
        lastPurchasePrice: rate,
        stockValue: Math.round(stock * rate * 100) / 100,
        isLowStock: stock <= reorder,
      };
    });

    return reply.send(report);
  });
}
