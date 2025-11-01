import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const tableId = process.env.DEBUG_TABLE_ID;
  if (!tableId) {
    console.error('Please set DEBUG_TABLE_ID to the target table id');
    process.exit(1);
  }
  console.log('Debug: deleting table', tableId);
  try {
    const views = await prisma.view.findMany({ where: { tableId }, select: { id: true } });
    const viewIds = views.map((v) => v.id);
    console.log('Found views:', viewIds.length);
    if (viewIds.length) {
      const delShares = await prisma.viewShare.deleteMany({ where: { viewId: { in: viewIds } } });
      console.log('Deleted view shares count:', delShares.count);
      const delViews = await prisma.view.deleteMany({ where: { id: { in: viewIds } } });
      console.log('Deleted views count:', delViews.count);
    }
  } catch (e) {
    console.error('Error deleting views:', e);
    process.exitCode = 1;
  }
  try {
    const delFields = await prisma.field.deleteMany({ where: { tableId } });
    console.log('Deleted fields count:', delFields.count);
  } catch (e) {
    console.error('Error deleting fields:', e);
    process.exitCode = 1;
  }
  try {
    const records = await prisma.record.findMany({ where: { tableId }, select: { id: true } });
    const recordIds = records.map((r) => r.id);
    console.log('Found records:', recordIds.length);
    if (recordIds.length) {
      const delData = await prisma.recordsData.deleteMany({ where: { recordId: { in: recordIds } } });
      console.log('Deleted recordsData count:', delData.count);
      const delAtt = await prisma.attachment.deleteMany({ where: { recordId: { in: recordIds } } });
      console.log('Deleted record attachments count:', delAtt.count);
      const delRecords = await prisma.record.deleteMany({ where: { id: { in: recordIds } } });
      console.log('Deleted records count:', delRecords.count);
    }
  } catch (e) {
    console.error('Error deleting records:', e);
    process.exitCode = 1;
  }
  try {
    const delTableAtt = await prisma.attachment.deleteMany({ where: { tableId } });
    console.log('Deleted table attachments count:', delTableAtt.count);
  } catch (e) {
    console.error('Error deleting table attachments:', e);
    process.exitCode = 1;
  }
  try {
    const delTable = await prisma.table.delete({ where: { id: tableId } });
    console.log('Deleted table:', delTable.id);
  } catch (e) {
    console.error('Error deleting table:', e);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exitCode = 1;
});