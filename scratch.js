const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const dates = await prisma.importantDate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent dates:");
  dates.forEach(d => {
    console.log(d.title, d.date, d.date.toISOString());
  });
  process.exit();
}
main();
