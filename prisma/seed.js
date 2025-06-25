const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      username: "testuser",
      email: "testuser@example.com",
      password: "password123", // In production, use hashed passwords!
      firstName: "Test",
      lastName: "User",
      isEmailVerified: true,
    },
  });
  console.log("Seeded test user!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
