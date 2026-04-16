// run this once after migrations to set up the admin user and default data
// npm run seed

require('dotenv').config();
const prisma = require('./src/prismaClient');

async function main() {
  console.log('🌱 Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@calendly.local';
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  const adminTimezone = process.env.ADMIN_TIMEZONE || 'Asia/Kolkata';

  // using upsert so we can run this script more than once without duplicating data
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, timezone: adminTimezone },
    create: { email: adminEmail, name: adminName, timezone: adminTimezone },
  });

  console.log(`✅ Admin user ready: [ID=${user.id}] ${user.name} <${user.email}>`);

  // default schedule is just mon-fri 9 to 5, can be changed later in the dashboard
  const defaultDays = [1, 2, 3, 4, 5]; // 1=monday, 5=friday
  for (const day of defaultDays) {
    await prisma.availability.upsert({
      where: {
        userId_dayOfWeek_startTime_endTime: {
          userId: user.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      },
      update: {},
      create: {
        userId: user.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        timezone: adminTimezone,
      },
    });
  }
  console.log('✅ Default availability seeded: Mon–Fri, 09:00–17:00');

  // create a basic event type so there's something to show on first load
  const sampleSlug = '30-min-meeting';
  await prisma.eventType.upsert({
    where: { slug: sampleSlug },
    update: {},
    create: {
      userId: user.id,
      title: '30-Minute Meeting',
      duration: 30,
      slug: sampleSlug,
    },
  });
  console.log(`✅ Sample event type seeded: "${sampleSlug}"`);

  console.log('\n🚀 Database seeded successfully. You can now start the server.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
