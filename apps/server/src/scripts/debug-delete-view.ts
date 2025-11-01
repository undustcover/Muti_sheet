import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const viewId = process.env.DEBUG_VIEW_ID;
  if (!viewId) {
    console.error('Please set DEBUG_VIEW_ID to the target view id');
    process.exit(1);
  }
  console.log('Debug: deleting view', viewId);
  try {
    const shares = await prisma.viewShare.findMany({ where: { viewId }, select: { id: true } });
    console.log('Found shares:', shares.length);
    const delShares = await prisma.viewShare.deleteMany({ where: { viewId } });
    console.log('Deleted shares count:', delShares.count);
  } catch (e) {
    console.error('Error deleting view shares:', e);
    process.exitCode = 1;
  }
  try {
    const delView = await prisma.view.delete({ where: { id: viewId } });
    console.log('Deleted view:', delView.id);
  } catch (e) {
    console.error('Error deleting view:', e);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exitCode = 1;
});