import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      department: "IT",
    },
  });

  console.log("✅ Created user:", user);

  const survey = await prisma.survey.create({
    data: {
      title: "Encuesta de Satisfacción - Ejemplo",
      description: "Esta es una encuesta de ejemplo para demostrar la plataforma",
      createdBy: user.id,
      status: "DRAFT",
      metadata: {
        create: {},
      },
      questions: {
        create: [
          {
            title: "¿Cómo valorarías nuestro servicio?",
            type: "RATING",
            required: true,
            order: 1,
            minValue: 1,
            maxValue: 5,
            minLabel: "Muy insatisfecho",
            maxLabel: "Muy satisfecho",
          },
          {
            title: "¿Cuál es tu comentario general?",
            type: "LONG_TEXT",
            required: false,
            order: 2,
          },
          {
            title: "¿Cuál es la probabilidad de que nos recomiendes?",
            type: "NET_PROMOTER_SCORE",
            required: true,
            order: 3,
          },
        ],
      },
    },
    include: {
      questions: true,
      metadata: true,
    },
  });

  console.log("✅ Created survey:", survey);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✨ Seeding completed!");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
