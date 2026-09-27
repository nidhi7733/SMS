import { getDb, schema } from '../db/index.js';

async function main() {
  const db = await getDb();
  console.log('[Clear] Connecting to embedded database at data/sms_pg...');

  const beforeStudents = await db.query.students.findMany();
  const beforeGuardians = await db.query.guardians.findMany();
  const beforeHealth = await db.query.studentHealthRecords.findMany();
  const beforeEnrollments = await db.query.studentEnrollments.findMany();
  const beforeAdmissions = await db.query.studentAdmissions.findMany();

  console.log(`[Before Clear] Records found:`);
  console.log(`  - Students: ${beforeStudents.length}`);
  console.log(`  - Guardians: ${beforeGuardians.length}`);
  console.log(`  - Health Records: ${beforeHealth.length}`);
  console.log(`  - Enrollments: ${beforeEnrollments.length}`);
  console.log(`  - Admissions: ${beforeAdmissions.length}`);

  // Delete in proper foreign key dependency order
  await db.delete(schema.guardians);
  await db.delete(schema.studentHealthRecords);
  await db.delete(schema.studentEnrollments);
  await db.delete(schema.studentAdmissions);
  await db.delete(schema.students);

  const afterStudents = await db.query.students.findMany();
  const afterGuardians = await db.query.guardians.findMany();
  const afterHealth = await db.query.studentHealthRecords.findMany();
  const afterEnrollments = await db.query.studentEnrollments.findMany();
  const afterAdmissions = await db.query.studentAdmissions.findMany();

  console.log(`\n[After Clear] Remaining records:`);
  console.log(`  - Students: ${afterStudents.length}`);
  console.log(`  - Guardians: ${afterGuardians.length}`);
  console.log(`  - Health Records: ${afterHealth.length}`);
  console.log(`  - Enrollments: ${afterEnrollments.length}`);
  console.log(`  - Admissions: ${afterAdmissions.length}`);

  if (afterStudents.length === 0 && afterGuardians.length === 0) {
    console.log('\n>>> SUCCESS: All student records have been completely wiped from database! <<<');
  } else {
    throw new Error('Some student records still remain!');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[Error during clear]', err);
  process.exit(1);
});
