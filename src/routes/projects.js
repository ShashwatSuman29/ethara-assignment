const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../activity');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const filter = req.user.role === 'ADMIN'
      ? {}
      : { memberIds: new ObjectId(req.user.id) };
    const projects = await db.collection('projects').find(filter).sort({ createdAt: -1 }).toArray();
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', auth.isAdmin, async (req, res) => {
  try {
    const { name, memberIds } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const ids = Array.isArray(memberIds) ? memberIds : [];
    let memberObjectIds;
    try {
      memberObjectIds = ids.map((id) => new ObjectId(id));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid memberIds' });
    }
    const db = getDb();
    const doc = {
      name,
      memberIds: memberObjectIds,
      createdAt: new Date()
    };
    const result = await db.collection('projects').insertOne(doc);
    logActivity(db, {
      userId: new ObjectId(req.user.id),
      userName: req.user.name,
      action: 'PROJECT_CREATED',
      detail: `created project '${name}'`,
      projectId: result.insertedId
    });
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let projectId;
    try { projectId = new ObjectId(req.params.id); } catch (e) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const db = getDb();
    const project = await db.collection('projects').findOne({ _id: projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (req.user.role !== 'ADMIN') {
      const isMember = (project.memberIds || []).some(
        (mid) => mid.toString() === req.user.id
      );
      if (!isMember) return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await db.collection('tasks').find({ projectId }).sort({ createdAt: -1 }).toArray();
    const memberIds = project.memberIds || [];
    const members = memberIds.length
      ? await db.collection('users')
          .find({ _id: { $in: memberIds } })
          .project({ password: 0 })
          .toArray()
      : [];

    res.json({ ...project, tasks, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.delete('/:id', auth.isAdmin, async (req, res) => {
  try {
    let projectId;
    try { projectId = new ObjectId(req.params.id); } catch (e) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const db = getDb();
    const project = await db.collection('projects').findOne({ _id: projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await db.collection('projects').deleteOne({ _id: projectId });
    await db.collection('tasks').deleteMany({ projectId });
    logActivity(db, {
      userId: new ObjectId(req.user.id),
      userName: req.user.name,
      action: 'PROJECT_DELETED',
      detail: `deleted project '${project.name}'`
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
