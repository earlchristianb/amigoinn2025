import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // --- Room Types ---
  console.log('📦 Creating room types...');
  const soloAircon = await prisma.roomType.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: "Airconditioned Solo Room",
      description: "Single bed with air conditioning",
      basePrice: new Decimal(799),
    },
  });

  const soloFan = await prisma.roomType.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      name: "Fan Solo Room",
      description: "Single bed with fan",
      basePrice: new Decimal(599),
    },
  });

  const coupleAircon = await prisma.roomType.upsert({
    where: { id: BigInt(3) },
    update: {},
    create: {
      name: "Airconditioned Couple Room",
      description: "Couple room with air conditioning",
      basePrice: new Decimal(1020),
    },
  });

  const familyAircon = await prisma.roomType.upsert({
    where: { id: BigInt(4) },
    update: {},
    create: {
      name: "Airconditioned Family Room",
      description: "Family room with air conditioning",
      basePrice: new Decimal(1200),
    },
  });

  console.log('✅ Room types created');

  // --- Rooms ---
  console.log('🏠 Creating rooms...');
  const rooms = [
    // Solo Aircon (799)
    { roomNumber: "100", roomTypeId: soloAircon.id },
    { roomNumber: "101", roomTypeId: soloAircon.id },
    { roomNumber: "102", roomTypeId: soloAircon.id },
    { roomNumber: "104", roomTypeId: soloAircon.id },
    { roomNumber: "105", roomTypeId: soloAircon.id },
    { roomNumber: "106", roomTypeId: soloAircon.id },
    { roomNumber: "108", roomTypeId: soloAircon.id },

    // Solo Fan (599)
    { roomNumber: "103", roomTypeId: soloFan.id },
    { roomNumber: "107", roomTypeId: soloFan.id },

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
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: room,
    });
  }

  console.log(`✅ ${rooms.length} rooms created`);

  // --- Extras (Tours & Services) ---
  console.log('🎯 Creating extras...');
  const extras = [
    {
      name: "3 Island Tours + Secret Beach",
      description: "Daku, Guyam, Naked + Secret Beach and Coral Garden. Includes boat, guide, docking fees, entrance fees, and boodle lunch.",
      price: new Decimal(1500),
    },
    {
      name: "Sohoton Cove Bucas Grande Adventure",
      description: "Sohoton Cove, Bucas Grande, Haguekan Cove, Magcucuob Cove, Jellyfish Sanctuary, Cliff Diving, Viewing Lagoon, Tiktikan Lagoon and Bolitas Cave. Includes guide, permits, entrances, and lunch.",
      price: new Decimal(2800),
    },
    {
      name: "South Land Tour",
      description: "Maasin River, Magpupungko Rock Formation, Coconut Road, Coconut View, Sugba Lagoon. Includes guide, van transfers, permits, entrances, and lunch.",
      price: new Decimal(1900),
    },
  ];

  for (const extra of extras) {
    await prisma.extra.upsert({
      where: { 
        // Use a combination of name to find existing
        id: BigInt(0) // This will fail on where, so it will always create
      },
      update: {},
      create: extra,
    }).catch(async () => {
      // If upsert fails (no match), just create
      const existing = await prisma.extra.findFirst({
        where: { name: extra.name }
      });
      if (!existing) {
        await prisma.extra.create({ data: extra });
      }
    });
  }

  console.log(`✅ ${extras.length} extras created`);

  // --- Sample Admin Profile ---
  console.log('👤 Creating admin profiles...');
  await prisma.profile.upsert({
    where: { email: 'earlcristianb@gmail.com' },
    update: {},
    create: {
      name: 'Earl Admin',
      email: 'earlcristianb@gmail.com',
      role: 'admin',
    },
  });
  await prisma.profile.upsert({
    where: { email: 'meowmeow2025@maildrop.cc' },
    update: {},
    create: {
      name: 'Assistant User',
      email: 'meowmeow2025@maildrop.cc',
      role: 'assistant',
    },
  });

  console.log('✅ Admin profile created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log('   - Room Types: 4');
  console.log('   - Rooms: 18');
  console.log('   - Extras: 3');
  console.log('   - Admin Profiles: 1');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    prisma.$disconnect();
    process.exit(1);
  });
