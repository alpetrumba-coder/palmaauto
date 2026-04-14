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
      modelYear: 2021,
      color: "серебристый",
      plateNumber: "A001AA77",
      registrationCertificate: "77 УН 111111, выдан ГИБДД",
      images: [
        {
          url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1400&q=85&auto=format&fit=crop",
          alt: "Toyota Camry",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&q=85&auto=format&fit=crop",
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
      modelYear: 2022,
      color: "белый",
      plateNumber: "B234CD77",
      registrationCertificate: "77 УН 222222, выдан ГИБДД",
      images: [
        {
          url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=1400&q=85&auto=format&fit=crop",
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
      modelYear: 2020,
      color: "чёрный",
      plateNumber: "C345EF77",
      registrationCertificate: "77 УН 333333, выдан ГИБДД",
      images: [
        {
          url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1400&q=85&auto=format&fit=crop",
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
      modelYear: 2019,
      color: "серый",
      plateNumber: "D456GH77",
      registrationCertificate: "77 УН 444444, выдан ГИБДД",
      images: [
        {
          url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1400&q=85&auto=format&fit=crop",
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
        modelYear: carData.modelYear,
        color: carData.color,
        plateNumber: carData.plateNumber,
        registrationCertificate: carData.registrationCertificate,
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

function isDbUnreachableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("P1001") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND")
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    if (isDbUnreachableError(e)) {
      console.error(`
----------------------------------------------------------------
Сид не выполнен: нет подключения к PostgreSQL.

Что проверить:
  • В .env переменная DATABASE_URL — скопируйте заново строку из Neon
    (Dashboard → ваш проект → Connection string → Pooled).
  • Проект Neon не в режиме сна / не удалён; пароль не меняли без обновления .env.
  • VPN/файрвол не режет доступ к хосту Neon на порту 5432.
----------------------------------------------------------------
`);
    }
    console.error(e);
    void prisma.$disconnect().finally(() => process.exit(1));
  });
