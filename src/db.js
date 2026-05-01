const { MongoClient } = require('mongodb');

let db = null;
let client = null;

async function connectDb() {
  if (db) return db;
  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error('DATABASE_URL (or MONGODB_URI) is not set');
  const dbName = process.env.DB_NAME || 'taskmanager';
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

module.exports = { connectDb, getDb };
