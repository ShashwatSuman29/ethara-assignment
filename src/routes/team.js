const express = require('express');
const { getDb } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection('users')
      .find({})
      .project({ password: 0 })
      .sort({ name: 1 })
      .toArray();

    const result = await Promise.all(users.map(async (u) => {
      const projects = await db.collection('projects')
        .find({ memberIds: u._id })
        .project({ name: 1 })
        .toArray();

      const [total, done] = await Promise.all([
        db.collection('tasks').countDocuments({ assignedToId: u._id }),
        db.collection('tasks').countDocuments({ assignedToId: u._id, status: 'DONE' })
      ]);

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        projects: projects.map((p) => ({ _id: p._id, name: p.name })),
        taskStats: {
          total,
          done,
          completionRate: total === 0 ? 0 : Math.round((done / total) * 100)
        }
      };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

module.exports = router;
