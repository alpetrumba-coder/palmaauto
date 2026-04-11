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
          url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1200&q=80",
          alt: "Toyota Camry",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80",
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
          url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200&q=80",
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
          url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80",
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
          url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80",
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
