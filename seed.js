require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDb, getDb } = require('./src/db');

async function run() {
  await connectDb();
  const db = getDb();

  await db.collection('tasks').deleteMany({});
  await db.collection('projects').deleteMany({});
  await db.collection('users').deleteMany({});

  const adminHash = await bcrypt.hash('admin123', 10);
  const memberHash = await bcrypt.hash('member123', 10);
  const now = new Date();

  const usersInsert = await db.collection('users').insertMany([
    {
      name: 'Admin User',
      email: 'admin@test.com',
      password: adminHash,
      role: 'ADMIN',
      createdAt: now
    },
    {
      name: 'Member User',
      email: 'member@test.com',
      password: memberHash,
      role: 'MEMBER',
      createdAt: now
    }
  ]);

  const adminId = usersInsert.insertedIds[0];
  const memberId = usersInsert.insertedIds[1];

  const projectInsert = await db.collection('projects').insertOne({
    name: 'Website Redesign',
    memberIds: [adminId, memberId],
    createdAt: now
  });
  const projectId = projectInsert.insertedId;

  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  await db.collection('tasks').insertMany([
    {
      title: 'Set up repository',
      description: 'Initialize the codebase and CI pipeline.',
      status: 'DONE',
      dueDate: past,
      projectId,
      assignedToId: adminId,
      createdAt: now
    },
    {
      title: 'Design landing page',
      description: 'High-fidelity mockups in Figma.',
      status: 'IN_PROGRESS',
      dueDate: past,
      projectId,
      assignedToId: memberId,
      createdAt: now
    },
    {
      title: 'Write copy for hero section',
      description: 'Short, benefit-driven headline and subhead.',
      status: 'TODO',
      dueDate: future,
      projectId,
      assignedToId: memberId,
      createdAt: now
    }
  ]);

  console.log('Seed complete.');
  console.log('  ADMIN:  admin@test.com / admin123');
  console.log('  MEMBER: member@test.com / member123');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
