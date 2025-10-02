import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateRooms() {
  try {
    console.log('Starting room population...');

    // Create room types first
    const airconSolo = await prisma.roomType.upsert({
      where: { id: BigInt(1) },
      update: {},
      create: {
        name: 'Airconditioned Solo',
        description: 'Single occupancy air-conditioned room',
        basePrice: 799.00,
      },
    });

    const fanSolo = await prisma.roomType.upsert({
      where: { id: BigInt(2) },
      update: {},
      create: {
        name: 'Fan Solo',
        description: 'Single occupancy fan room',
        basePrice: 599.00,
      },
    });

    const coupleAircon = await prisma.roomType.upsert({
      where: { id: BigInt(3) },
      update: {},
      create: {
        name: 'Airconditioned Couple',
        description: 'Double occupancy air-conditioned room',
        basePrice: 1000.00,
      },
    });

    const familyAircon = await prisma.roomType.upsert({
      where: { id: BigInt(4) },
      update: {},
      create: {
        name: 'Airconditioned Family',
        description: 'Family room with air conditioning, capacity 4',
        basePrice: 1200.00,
      },
    });

    console.log('Room types created:', { airconSolo, fanSolo, coupleAircon, familyAircon });

    // Create rooms
    const rooms = [
      // Aircon Solo rooms (100, 101, 102, 103, 105, 106, 107, 108)
      { roomNumber: '100', roomTypeId: airconSolo.id },
      { roomNumber: '101', roomTypeId: airconSolo.id },
      { roomNumber: '102', roomTypeId: airconSolo.id },
      { roomNumber: '103', roomTypeId: airconSolo.id },
      { roomNumber: '105', roomTypeId: airconSolo.id },
      { roomNumber: '106', roomTypeId: airconSolo.id },
      { roomNumber: '107', roomTypeId: airconSolo.id },
      { roomNumber: '108', roomTypeId: airconSolo.id },
      
      // Fan Solo room (104)
      { roomNumber: '104', roomTypeId: fanSolo.id },
      
      // Couple Aircon rooms (200, 201, 202, 203, 205, 206, 207, 208)
      { roomNumber: '200', roomTypeId: coupleAircon.id },
      { roomNumber: '201', roomTypeId: coupleAircon.id },
      { roomNumber: '202', roomTypeId: coupleAircon.id },
      { roomNumber: '203', roomTypeId: coupleAircon.id },
      { roomNumber: '205', roomTypeId: coupleAircon.id },
      { roomNumber: '206', roomTypeId: coupleAircon.id },
      { roomNumber: '207', roomTypeId: coupleAircon.id },
      { roomNumber: '208', roomTypeId: coupleAircon.id },
      
      // Family Aircon room (204)
      { roomNumber: '204', roomTypeId: familyAircon.id },
    ];

    // Create rooms using createMany
    const createdRooms = await prisma.room.createMany({
      data: rooms,
      skipDuplicates: true,
    });

    console.log(`Created ${createdRooms.count} rooms`);

    // Verify the data
    const allRooms = await prisma.room.findMany({
      include: {
        roomType: true,
      },
      orderBy: {
        roomNumber: 'asc',
      },
    });

    console.log('\nAll rooms:');
    allRooms.forEach((room: any) => {
      console.log(`Room ${room.roomNumber}: ${room.roomType.name} - ₱${room.roomType.basePrice} (Available: ${room.isAvailable})`);
    });

    console.log('\nRoom population completed successfully!');
  } catch (error) {
    console.error('Error populating rooms:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateRooms();
