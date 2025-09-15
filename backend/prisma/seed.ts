import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create users
  const passwordHash = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.create({
    data: { name: "Ishan", email: "ishan@example.com", password: passwordHash },
  });

  const user2 = await prisma.user.create({
    data: { name: "Pia", email: "pia@example.com", password: passwordHash },
  });

  const user3 = await prisma.user.create({
    data: { name: "Amit", email: "amit@example.com", password: passwordHash },
  });

  // Create a group with members
  const group = await prisma.group.create({
    data: {
      name: "Test Trip",
      members: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
          { userId: user3.id },
        ],
      },
    },
    include: { members: true },
  });

  // Add an expense in that group
await prisma.expense.create({
  data: {
    description: "Lunch",
    amount: 500,
    groupId: group.id,
    paidById: user1.id, // ✅ now valid
    // updatedAt is auto-handled by @updatedAt, no need to set
  },
});

  console.log("🌱 Seed data created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
