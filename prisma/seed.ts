import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const organizerEmail = process.env.ORGANIZER_EMAIL ?? 'organizer@campus.local';
  const organizerPassword = process.env.ORGANIZER_PASSWORD ?? 'ChangeThisPassword123!';

  const organizer = await prisma.organizer.upsert({
    where: { email: organizerEmail },
    update: {},
    create: {
      email: organizerEmail,
      name: 'Campus Operations',
      passwordHash: await bcrypt.hash(organizerPassword, 10)
    }
  });

  const now = new Date();
  const sampleEvents = [
    {
      organizerId: organizer.id,
      name: 'Innovation Forum',
      description: 'A flagship event for student founders, startups, and technology leaders.',
      venue: 'South Hall',
      startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 3),
      capacity: 240,
      bannerUrl: 'https://images.unsplash.com/'
    },
    {
      organizerId: organizer.id,
      name: 'Open Mic Night',
      description: 'An evening of student performances, poetry, music, and campus culture.',
      venue: 'Riverside Auditorium',
      startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 12),
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 12 + 1000 * 60 * 60 * 2.5),
      capacity: 180,
      bannerUrl: 'https://images.unsplash.com/'
    },
    {
      organizerId: organizer.id,
      name: 'Career Readiness Expo',
      description: 'Meet recruiters, alumni, and employers focused on student career outcomes.',
      venue: 'East Multipurpose Center',
      startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 16),
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 16 + 1000 * 60 * 60 * 4),
      capacity: 320,
      bannerUrl: 'https://images.unsplash.com/'
    }
  ];

  for (const event of sampleEvents) {
    const existingEvent = await prisma.event.findFirst({ where: { name: event.name } });
    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: event
      });
    } else {
      await prisma.event.create({ data: event });
    }
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
