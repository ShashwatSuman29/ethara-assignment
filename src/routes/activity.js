const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const filter = req.user.role === 'ADMIN'
      ? {}
      : { userId: new ObjectId(req.user.id) };
    const activities = await db.collection('activities')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
