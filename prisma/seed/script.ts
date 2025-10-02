import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  // --- Room Types ---
  const soloAircon = await prisma.roomType.create({
    data: {
      name: "Airconditioned Solo Room",
      description: "Single bed with air conditioning",
      basePrice: new Decimal(799),
    },
  });

  const soloFan = await prisma.roomType.create({
    data: {
      name: "Fan Solo Room",
      description: "Single bed with fan",
      basePrice: new Decimal(599),
    },
  });

  const coupleAircon = await prisma.roomType.create({
    data: {
      name: "Airconditioned Couple Room",
      description: "Couple room with air conditioning",
      basePrice: new Decimal(1020),
    },
  });

  const familyAircon = await prisma.roomType.create({
    data: {
      name: "Airconditioned Family Room",
      description: "Family room with air conditioning",
      basePrice: new Decimal(1200),
    },
  });

  // --- Rooms ---
  await prisma.room.createMany({
    data: [
      // Solo Aircon (799)
      { roomNumber: "100", roomTypeId: soloAircon.id },
      { roomNumber: "101", roomTypeId: soloAircon.id },
      { roomNumber: "102", roomTypeId: soloAircon.id },
      { roomNumber: "103", roomTypeId: soloAircon.id },
      { roomNumber: "105", roomTypeId: soloAircon.id },
      { roomNumber: "106", roomTypeId: soloAircon.id },
      { roomNumber: "107", roomTypeId: soloAircon.id },
      { roomNumber: "108", roomTypeId: soloAircon.id },

      // Solo Fan (599)
      { roomNumber: "104", roomTypeId: soloFan.id },

      // Couple Aircon (1020)
      { roomNumber: "200", roomTypeId: coupleAircon.id },
      { roomNumber: "201", roomTypeId: coupleAircon.id },
      { roomNumber: "202", roomTypeId: coupleAircon.id },
      { roomNumber: "203", roomTypeId: coupleAircon.id },
      { roomNumber: "205", roomTypeId: coupleAircon.id },
      { roomNumber: "206", roomTypeId: coupleAircon.id },
      { roomNumber: "207", roomTypeId: coupleAircon.id },
      { roomNumber: "208", roomTypeId: coupleAircon.id },

      // Family Aircon (1200)
      { roomNumber: "204", roomTypeId: familyAircon.id },
    ],
  });

  console.log("✅ Room types and rooms seeded successfully!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
