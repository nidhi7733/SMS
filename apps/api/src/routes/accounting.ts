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

export default async function accountingRoutes(fastify: FastifyInstance) {
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
  // 1. Account Groups (लेखा समूहहरू)
  // ==========================================
  fastify.get('/groups', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const groups = await db.query.accountGroups.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.displayOrder), asc(t.code)],
    });

    return reply.send(groups);
  });

  // ==========================================
  // 2. Chart of Accounts - COA (खाता सूची)
  // ==========================================
  fastify.get('/coa', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const accounts = await db.query.chartOfAccounts.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.code)],
    });

    const groups = await db.query.accountGroups.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const groupMap = new Map<string, any>(groups.map((g: any) => [g.id, g]));

    const result = accounts.map((acc: any) => ({
      ...acc,
      group: groupMap.get(acc.groupId) || null,
    }));

    return reply.send(result);
  });

  fastify.post('/coa', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    if (!body.code || !body.nameEn || !body.nameNp || !body.groupId) {
      return reply.status(400).send({ message: 'खाता कोड, नाम र समूह अनिवार्य छन् (Missing required fields)' });
    }

    const existing = await db.query.chartOfAccounts.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, currentUser.schoolId), eq(t.code, body.code)),
    });
    if (existing) {
      return reply.status(400).send({ message: 'यो कोड भएको खाता पहिल्यै दर्ता छ (Account code already exists)' });
    }

    const openingDr = Number(body.openingBalanceDr) || 0;
    const openingCr = Number(body.openingBalanceCr) || 0;

    const newAccount = {
      id: crypto.randomUUID(),
      schoolId: currentUser.schoolId,
      code: body.code.trim(),
      nameEn: body.nameEn.trim(),
      nameNp: body.nameNp.trim(),
      groupId: body.groupId,
      openingBalanceDr: openingDr,
      openingBalanceCr: openingCr,
      currentBalanceDr: openingDr,
      currentBalanceCr: openingCr,
      isSystemAccount: false,
      isActive: true,
      description: body.description || null,
    };

    await db.insert(schema.chartOfAccounts).values(newAccount);

    return reply.status(201).send(newAccount);
  });

  // ==========================================
  // 3. Journal Vouchers - JV (गोश्वारा भौचर व्यवस्थापन)
  // ==========================================
  fastify.get('/vouchers', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const query = request.query as any;

    const vouchers = await db.query.journalVouchers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { desc }: any) => [desc(t.voucherDateBs), desc(t.createdAt)],
      limit: query.limit ? Number(query.limit) : 100,
    });

    const voucherIds = vouchers.map((v: any) => v.id);
    let items: any[] = [];
    if (voucherIds.length > 0) {
      items = await db.query.journalVoucherItems.findMany({
        orderBy: (t: any, { asc }: any) => [asc(t.displayOrder)],
      });
    }

    const accounts = await db.query.chartOfAccounts.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const accountMap = new Map<string, any>(accounts.map((a: any) => [a.id, a]));

    const itemsByVoucher: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsByVoucher[item.voucherId]) itemsByVoucher[item.voucherId] = [];
      const acc = accountMap.get(item.accountId);
      itemsByVoucher[item.voucherId].push({
        ...item,
        accountCode: acc?.code,
        accountNameEn: acc?.nameEn,
        accountNameNp: acc?.nameNp,
      });
    }

    const response = vouchers.map((v: any) => ({
      ...v,
      items: itemsByVoucher[v.id] || [],
    }));

    return reply.send(response);
  });

  fastify.post('/vouchers', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const body = request.body as any;

    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (items.length < 2) {
      return reply.status(400).send({
        message: 'दोहोरो लेखाका लागि कम्तिमा २ वटा खाता पंक्ति (डेबिट र क्रेडिट) हुनुपर्छ (Minimum 2 voucher lines required)',
      });
    }

    // Double Entry Check: sum(Dr) == sum(Cr)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const it of items) {
      totalDebit += Number(it.debitAmount) || 0;
      totalCredit += Number(it.creditAmount) || 0;
    }

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit <= 0) {
      return reply.status(400).send({
        message: `डेबिट र क्रेडिट रकम ठ्याक्कै बराबर हुनुपर्छ! (Debit: रू. ${totalDebit}, Credit: रू. ${totalCredit}) - Total Debit must equal Total Credit`,
      });
    }

    const vType = body.voucherType || 'JV';
    const vDateBs = body.voucherDateBs || getTodayBs();
    const vDateAd = new Date().toISOString().split('T')[0];

    // Generate sequential voucher number
    const countRes = await db.query.journalVouchers.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const seq = countRes.length + 1;
    const yearPrefix = vDateBs.slice(0, 4) || '2083';
    const voucherNumber = `${vType}-${yearPrefix}-${String(seq).padStart(4, '0')}`;

    const voucherId = crypto.randomUUID();

    await db.insert(schema.journalVouchers).values({
      id: voucherId,
      schoolId: currentUser.schoolId,
      voucherNumber,
      voucherType: vType,
      voucherDateBs: vDateBs,
      voucherDateAd: vDateAd,
      fiscalYearBs: '2082/083',
      narration: body.narration || '',
      totalDebit,
      totalCredit,
      status: 'POSTED',
      attachmentUrl: body.attachmentUrl || null,
      referenceModule: body.referenceModule || 'MANUAL',
      referenceId: body.referenceId || null,
      createdById: currentUser.userId || currentUser.id,
      approvedById: currentUser.userId || currentUser.id,
    });

    // Insert items & update account balances
    let order = 1;
    for (const it of items) {
      const dr = Number(it.debitAmount) || 0;
      const cr = Number(it.creditAmount) || 0;

      await db.insert(schema.journalVoucherItems).values({
        id: crypto.randomUUID(),
        voucherId,
        accountId: it.accountId,
        particulars: it.particulars || null,
        debitAmount: dr,
        creditAmount: cr,
        displayOrder: order++,
      });

      // Update account running balance
      const acc = await db.query.chartOfAccounts.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, it.accountId),
      });

      if (acc) {
        await db
          .update(schema.chartOfAccounts)
          .set({
            currentBalanceDr: (acc.currentBalanceDr || 0) + dr,
            currentBalanceCr: (acc.currentBalanceCr || 0) + cr,
            updatedAt: new Date(),
          })
          .where(eq(schema.chartOfAccounts.id, it.accountId));
      }
    }

    const created = await db.query.journalVouchers.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, voucherId),
    });

    return reply.status(201).send({
      success: true,
      voucher: created,
      message: `भौचर ${voucherNumber} सफलतापूर्वक दर्ता भयो (Voucher posted successfully)`,
    });
  });

  // ==========================================
  // 4. Reports: General Ledger (खाता पाना)
  // ==========================================
  fastify.get('/reports/ledger/:accountId', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;
    const { accountId } = request.params as { accountId: string };

    const account = await db.query.chartOfAccounts.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.id, accountId), eq(t.schoolId, currentUser.schoolId)),
    });

    if (!account) {
      return reply.status(404).send({ message: 'खाता फेला परेन (Account not found)' });
    }

    const group = await db.query.accountGroups.findFirst({
      where: (t: any, { eq }: any) => eq(t.id, account.groupId),
    });

    const vItems = await db.query.journalVoucherItems.findMany({
      where: (t: any, { eq }: any) => eq(t.accountId, accountId),
    });

    const voucherIds = vItems.map((vi: any) => vi.voucherId);
    let vouchers: any[] = [];
    if (voucherIds.length > 0) {
      vouchers = await db.query.journalVouchers.findMany({
        where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
        orderBy: (t: any, { asc }: any) => [asc(t.voucherDateBs), asc(t.createdAt)],
      });
    }

    const voucherMap = new Map(vouchers.map((v: any) => [v.id, v]));

    // Determine normal balance side based on Nature:
    // ASSET & EXPENSE -> Normal Dr
    // LIABILITY, EQUITY, REVENUE -> Normal Cr
    const isNormalDr = group?.nature === 'ASSET' || group?.nature === 'EXPENSE';

    const openingNet = isNormalDr
      ? (account.openingBalanceDr || 0) - (account.openingBalanceCr || 0)
      : (account.openingBalanceCr || 0) - (account.openingBalanceDr || 0);

    let runningBalance = openingNet;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: any[] = [];
    for (const vi of vItems) {
      const v = voucherMap.get(vi.voucherId);
      if (!v) continue;

      const dr = Number(vi.debitAmount) || 0;
      const cr = Number(vi.creditAmount) || 0;
      totalDebit += dr;
      totalCredit += cr;

      if (isNormalDr) {
        runningBalance += dr - cr;
      } else {
        runningBalance += cr - dr;
      }

      entries.push({
        dateBs: v.voucherDateBs,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        narration: v.narration,
        particulars: vi.particulars || '',
        debit: dr,
        credit: cr,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? (isNormalDr ? 'Dr' : 'Cr') : (isNormalDr ? 'Cr' : 'Dr'),
      });
    }

    // Sort chronologically by date
    entries.sort((a, b) => a.dateBs.localeCompare(b.dateBs));

    return reply.send({
      account: { ...account, group },
      openingBalance: Math.abs(openingNet),
      openingBalanceType: openingNet >= 0 ? (isNormalDr ? 'Dr' : 'Cr') : (isNormalDr ? 'Cr' : 'Dr'),
      entries,
      totalDebit,
      totalCredit,
      closingBalance: Math.abs(runningBalance),
      closingBalanceType: runningBalance >= 0 ? (isNormalDr ? 'Dr' : 'Cr') : (isNormalDr ? 'Cr' : 'Dr'),
    });
  });

  // ==========================================
  // 5. Reports: Trial Balance (सन्तुलन परीक्षण)
  // ==========================================
  fastify.get('/reports/trial-balance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const accounts = await db.query.chartOfAccounts.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
      orderBy: (t: any, { asc }: any) => [asc(t.code)],
    });

    const groups = await db.query.accountGroups.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const groupMap = new Map<string, any>(groups.map((g: any) => [g.id, g]));

    let totalDr = 0;
    let totalCr = 0;

    const items = accounts.map((acc: any) => {
      const g = groupMap.get(acc.groupId);
      const isNormalDr = g?.nature === 'ASSET' || g?.nature === 'EXPENSE';

      const totalAccountDr = (acc.openingBalanceDr || 0) + (acc.currentBalanceDr || 0);
      const totalAccountCr = (acc.openingBalanceCr || 0) + (acc.currentBalanceCr || 0);

      const net = totalAccountDr - totalAccountCr;
      let dr = 0;
      let cr = 0;

      if (net > 0) {
        dr = net;
      } else if (net < 0) {
        cr = Math.abs(net);
      } else {
        // Zero net balance
      }

      totalDr += dr;
      totalCr += cr;

      return {
        accountId: acc.id,
        accountCode: acc.code,
        accountNameEn: acc.nameEn,
        accountNameNp: acc.nameNp,
        nature: g?.nature || 'ASSET',
        debit: Math.round(dr * 100) / 100,
        credit: Math.round(cr * 100) / 100,
      };
    });

    totalDr = Math.round(totalDr * 100) / 100;
    totalCr = Math.round(totalCr * 100) / 100;

    return reply.send({
      items,
      totalDebit: totalDr,
      totalCredit: totalCr,
      isBalanced: Math.abs(totalDr - totalCr) < 0.05,
    });
  });

  // ==========================================
  // 6. Reports: Income & Expenditure / Profit & Loss (आय-व्यय विवरण)
  // ==========================================
  fastify.get('/reports/profit-loss', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const accounts = await db.query.chartOfAccounts.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const groups = await db.query.accountGroups.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const groupMap = new Map<string, any>(groups.map((g: any) => [g.id, g]));

    const revenues: any[] = [];
    const expenses: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      const g = groupMap.get(acc.groupId);
      if (!g) continue;

      if (g.nature === 'REVENUE') {
        const net = (acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0) - ((acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0));
        const amt = Math.max(0, net);
        totalRevenue += amt;
        revenues.push({
          accountId: acc.id,
          code: acc.code,
          nameEn: acc.nameEn,
          nameNp: acc.nameNp,
          amount: Math.round(amt * 100) / 100,
        });
      } else if (g.nature === 'EXPENSE') {
        const net = (acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0) - ((acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0));
        const amt = Math.max(0, net);
        totalExpense += amt;
        expenses.push({
          accountId: acc.id,
          code: acc.code,
          nameEn: acc.nameEn,
          nameNp: acc.nameNp,
          amount: Math.round(amt * 100) / 100,
        });
      }
    }

    const netSurplus = Math.round((totalRevenue - totalExpense) * 100) / 100;

    return reply.send({
      revenues,
      expenses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netSurplus,
    });
  });

  // ==========================================
  // 7. Reports: Balance Sheet (वासलात)
  // ==========================================
  fastify.get('/reports/balance-sheet', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await authenticate(request, reply))) return;
    const db = await getDb();
    const currentUser = (request as any).user;

    const accounts = await db.query.chartOfAccounts.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });

    const groups = await db.query.accountGroups.findMany({
      where: (t: any, { eq }: any) => eq(t.schoolId, currentUser.schoolId),
    });
    const groupMap = new Map<string, any>(groups.map((g: any) => [g.id, g]));

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      const g = groupMap.get(acc.groupId);
      if (!g) continue;

      if (g.nature === 'ASSET') {
        const net = (acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0) - ((acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0));
        const amt = Math.max(0, net);
        totalAssets += amt;
        assets.push({
          accountId: acc.id,
          code: acc.code,
          nameEn: acc.nameEn,
          nameNp: acc.nameNp,
          amount: Math.round(amt * 100) / 100,
        });
      } else if (g.nature === 'LIABILITY') {
        const net = (acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0) - ((acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0));
        const amt = Math.max(0, net);
        totalLiabilities += amt;
        liabilities.push({
          accountId: acc.id,
          code: acc.code,
          nameEn: acc.nameEn,
          nameNp: acc.nameNp,
          amount: Math.round(amt * 100) / 100,
        });
      } else if (g.nature === 'EQUITY') {
        const net = (acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0) - ((acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0));
        const amt = Math.max(0, net);
        totalEquity += amt;
        equity.push({
          accountId: acc.id,
          code: acc.code,
          nameEn: acc.nameEn,
          nameNp: acc.nameNp,
          amount: Math.round(amt * 100) / 100,
        });
      } else if (g.nature === 'REVENUE') {
        const net = (acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0) - ((acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0));
        totalRevenue += Math.max(0, net);
      } else if (g.nature === 'EXPENSE') {
        const net = (acc.currentBalanceDr || 0) + (acc.openingBalanceDr || 0) - ((acc.currentBalanceCr || 0) + (acc.openingBalanceCr || 0));
        totalExpense += Math.max(0, net);
      }
    }

    const netSurplus = Math.round((totalRevenue - totalExpense) * 100) / 100;
    const totalLiabilitiesAndEquity = Math.round((totalLiabilities + totalEquity + netSurplus) * 100) / 100;
    totalAssets = Math.round(totalAssets * 100) / 100;

    return reply.send({
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      netSurplus,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0,
    });
  });
}
