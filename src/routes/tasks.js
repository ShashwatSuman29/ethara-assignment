const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const VALID_STATUS = ['TODO', 'IN_PROGRESS', 'DONE'];

router.use(auth);

async function userCanAccessProject(db, userId, role, projectId) {
  if (role === 'ADMIN') return true;
  const project = await db.collection('projects').findOne({ _id: projectId });
  if (!project) return false;
  return (project.memberIds || []).some((mid) => mid.toString() === userId);
}

router.post('/', async (req, res) => {
  try {
    const { title, description, dueDate, projectId, assignedToId } = req.body || {};
    if (!title || !projectId) {
      return res.status(400).json({ error: 'title and projectId are required' });
    }
    let projectObjectId, assignedObjectId = null;
    try { projectObjectId = new ObjectId(projectId); } catch (e) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    if (assignedToId) {
      try { assignedObjectId = new ObjectId(assignedToId); } catch (e) {
        return res.status(400).json({ error: 'Invalid assignedToId' });
      }
    }
    const db = getDb();
    const allowed = await userCanAccessProject(db, req.user.id, req.user.role, projectObjectId);
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    const doc = {
      title,
      description: description || '',
      status: 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: projectObjectId,
      assignedToId: assignedObjectId,
      createdAt: new Date()
    };
    const result = await db.collection('tasks').insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    let taskId;
    try { taskId = new ObjectId(req.params.id); } catch (e) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    const db = getDb();
    const task = await db.collection('tasks').findOne({ _id: taskId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const allowed = await userCanAccessProject(db, req.user.id, req.user.role, task.projectId);
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    await db.collection('tasks').updateOne({ _id: taskId }, { $set: { status } });
    const updated = await db.collection('tasks').findOne({ _id: taskId });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

router.delete('/:id', auth.isAdmin, async (req, res) => {
  try {
    let taskId;
    try { taskId = new ObjectId(req.params.id); } catch (e) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    const db = getDb();
    const result = await db.collection('tasks').deleteOne({ _id: taskId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

router.get('/overdue', async (req, res) => {
  try {
    const db = getDb();
    const now = new Date();
    const baseFilter = {
      dueDate: { $lt: now, $ne: null },
      status: { $ne: 'DONE' }
    };
    let filter = baseFilter;
    if (req.user.role !== 'ADMIN') {
      const userObjectId = new ObjectId(req.user.id);
      const projects = await db.collection('projects')
        .find({ memberIds: userObjectId })
        .project({ _id: 1 })
        .toArray();
      const projectIds = projects.map((p) => p._id);
      filter = { ...baseFilter, projectId: { $in: projectIds } };
    }
    const tasks = await db.collection('tasks').find(filter).sort({ dueDate: 1 }).toArray();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const db = getDb();
    const now = new Date();
    let scopeFilter = {};
    if (req.user.role !== 'ADMIN') {
      const userObjectId = new ObjectId(req.user.id);
      const projects = await db.collection('projects')
        .find({ memberIds: userObjectId })
        .project({ _id: 1 })
        .toArray();
      const projectIds = projects.map((p) => p._id);
      scopeFilter = { projectId: { $in: projectIds } };
    }

    const [total, todo, inProgress, done, overdue] = await Promise.all([
      db.collection('tasks').countDocuments(scopeFilter),
      db.collection('tasks').countDocuments({ ...scopeFilter, status: 'TODO' }),
      db.collection('tasks').countDocuments({ ...scopeFilter, status: 'IN_PROGRESS' }),
      db.collection('tasks').countDocuments({ ...scopeFilter, status: 'DONE' }),
      db.collection('tasks').countDocuments({
        ...scopeFilter,
        dueDate: { $lt: now, $ne: null },
        status: { $ne: 'DONE' }
      })
    ]);

    res.json({ total, todo, inProgress, done, overdue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
