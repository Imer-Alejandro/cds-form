import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, pbkdf2Sync } from "crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Mismo formato que src/lib/auth.ts: salt(16 bytes hex):derivedKey(sha512, 100000 iter, 64 bytes hex)
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];
  const role = (process.argv[5] ?? "VIEWER").toUpperCase() as
    | "ADMIN"
    | "MANAGER"
    | "VIEWER";

  if (!email || !password || !name || !["ADMIN", "MANAGER", "VIEWER"].includes(role)) {
    console.error(
      "Uso: npx tsx scripts/create-user.ts <email> <password> <name> [ADMIN|MANAGER|VIEWER]"
    );
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      passwordHash: hashPassword(password),
    },
    create: {
      email,
      name,
      role,
      passwordHash: hashPassword(password),
    },
  });

  console.log("✅ Usuario creado/actualizado:", {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });