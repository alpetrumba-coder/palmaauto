import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const cars = [
    {
      slug: "toyota-camry",
      make: "Toyota",
      model: "Camry",
      description:
        "Седан бизнес-класса: тихий салон, климат-контроль, подходит для поездок по городу и трассе.",
      pricePerDayRub: 4500,
      images: [
        {
          url: "/cars/toyota-camry/1.svg",
          alt: "Toyota Camry",
          sortOrder: 0,
        },
        {
          url: "/cars/toyota-camry/2.svg",
          alt: "Салон автомобиля",
          sortOrder: 1,
        },
      ],
    },
    {
      slug: "kia-sportage",
      make: "Kia",
      model: "Sportage",
      description:
        "Кроссовер с высоким клиренсом и вместительным багажником — удобно для семьи и загорода.",
      pricePerDayRub: 5200,
      images: [
        {
          url: "/cars/kia-sportage/1.svg",
          alt: "Kia Sportage",
          sortOrder: 0,
        },
      ],
    },
    {
      slug: "mercedes-e-class",
      make: "Mercedes-Benz",
      model: "E-Class",
      description:
        "Представительский седан: комфорт задних пассажиров, идеален для деловых встреч.",
      pricePerDayRub: 8900,
      active: true,
      images: [
        {
          url: "/cars/mercedes-e-class/1.svg",
          alt: "Mercedes-Benz E-Class",
          sortOrder: 0,
        },
      ],
    },
    {
      slug: "skoda-octavia-hidden",
      make: "Škoda",
      model: "Octavia",
      description: "Тестовая запись: неактивна и не должна попадать на витрину.",
      pricePerDayRub: 3200,
      active: false,
      images: [
        {
          url: "/cars/skoda-octavia-hidden/1.svg",
          alt: "Škoda Octavia",
          sortOrder: 0,
        },
      ],
    },
  ];

  for (const { images, ...carData } of cars) {
    await prisma.car.upsert({
      where: { slug: carData.slug },
      create: {
        ...carData,
        images: { create: images },
      },
      update: {
        make: carData.make,
        model: carData.model,
        description: carData.description,
        pricePerDayRub: carData.pricePerDayRub,
        active: carData.active ?? true,
        images: {
          deleteMany: {},
          create: images,
        },
      },
    });
  }

  console.log("Seed: cars upserted.");

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, passwordHash, role: "ADMIN" },
      update: { passwordHash, role: "ADMIN" },
    });
    console.log("Seed: initial admin upserted.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
