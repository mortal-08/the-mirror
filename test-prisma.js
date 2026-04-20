const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const userId = "c1868f76-whatever-this-fails-first";
    const user = await prisma.user.findFirst();
    if (!user) return console.log("no user");
    
    console.log("Trying to create date...");
    await prisma.importantDate.create({
      data: {
        userId: user.id,
        title: "Test Event",
        date: new Date(),
      }
    });
    console.log("Create successful.");
  } catch(e) {
    console.error("Create error:", e.message);
  }
}
main();
