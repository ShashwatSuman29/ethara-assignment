async function logActivity(db, { userId, userName, action, detail, projectId = null }) {
  try {
    await db.collection('activities').insertOne({
      userId,
      userName,
      action,
      detail,
      projectId: projectId || null,
      createdAt: new Date()
    });
  } catch (e) {
    console.error('Activity log failed:', e);
  }
}

module.exports = { logActivity };
