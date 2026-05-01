(function () {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) {
    window.location.replace('/index.html');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  if (!projectId) {
    window.location.replace('/dashboard.html');
    return;
  }

  document.getElementById('nav-user').textContent = `${user.name} · ${user.role}`;
  document.getElementById('logout-btn').addEventListener('click', logout);

  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const taskError = document.getElementById('task-error');
  const taskCancel = document.getElementById('task-cancel');
  const newTaskBtn = document.getElementById('new-task-btn');

  if (user.role !== 'ADMIN') {
    newTaskBtn.classList.add('hidden');
  } else {
    newTaskBtn.addEventListener('click', () => {
      taskError.textContent = '';
      taskForm.reset();
      taskModal.classList.remove('hidden');
    });
    taskForm.addEventListener('submit', submitTask);
  }
  taskCancel.addEventListener('click', () => taskModal.classList.add('hidden'));
  taskModal.addEventListener('click', (e) => { if (e.target === taskModal) taskModal.classList.add('hidden'); });

  let projectMembers = [];

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/index.html');
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString();
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'DONE') return false;
    return new Date(task.dueDate).getTime() < Date.now();
  }

  function memberName(id) {
    if (!id) return 'Unassigned';
    const m = projectMembers.find((u) => u._id.toString() === id.toString());
    return m ? m.name : 'Unknown';
  }

  function renderTasks(tasks) {
    const cols = { TODO: [], IN_PROGRESS: [], DONE: [] };
    tasks.forEach((t) => { (cols[t.status] || cols.TODO).push(t); });

    Object.keys(cols).forEach((status) => {
      const list = document.getElementById(`col-${status}`);
      const count = document.getElementById(`count-${status}`);
      list.innerHTML = '';
      count.textContent = cols[status].length;
      cols[status].forEach((task) => list.appendChild(renderCard(task)));
    });
  }

  function renderCard(task) {
    const card = document.createElement('div');
    const priority = task.priority || 'LOW';
    card.className = `task-card priority-${priority}`;
    const overdue = isOverdue(task);
    const assignee = memberName(task.assignedToId);
    const desc = task.description
      ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>`
      : '';
    const due = task.dueDate
      ? `<span class="task-card-due ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue · ' : ''}${formatDate(task.dueDate)}</span>`
      : '<span class="task-card-due">No due date</span>';

    const isAdmin = user.role === 'ADMIN';
    const isAssignedToMe = task.assignedToId && task.assignedToId.toString() === user.id;
    const canChangeStatus = isAdmin || isAssignedToMe;

    const statusControl = canChangeStatus
      ? `<select data-action="status">
           <option value="TODO" ${task.status === 'TODO' ? 'selected' : ''}>TODO</option>
           <option value="IN_PROGRESS" ${task.status === 'IN_PROGRESS' ? 'selected' : ''}>IN PROGRESS</option>
           <option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>DONE</option>
         </select>`
      : `<span class="badge badge-${task.status}">${task.status.replace('_', ' ')}</span>`;

    const adminDelete = isAdmin
      ? '<button class="btn-danger" data-action="delete">Delete</button>'
      : '';

    card.innerHTML = `
      <div class="task-card-header">
        <div class="task-card-title">${escapeHtml(task.title)}</div>
        <span class="badge badge-priority-${priority}">${priority}</span>
      </div>
      ${desc}
      <div class="muted" style="margin-bottom:8px;">${escapeHtml(assignee)}</div>
      <div class="task-card-meta">
        ${due}
        <div class="task-card-actions">
          ${statusControl}
          ${adminDelete}
        </div>
      </div>
    `;

    if (canChangeStatus) {
      card.querySelector('select[data-action="status"]').addEventListener('change', async (e) => {
        const status = e.target.value;
        try {
          await api(`/api/tasks/${task._id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
          });
          await loadProject();
        } catch (err) {
          document.getElementById('project-error').textContent = err.message;
        }
      });
    }

    const delBtn = card.querySelector('button[data-action="delete"]');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        try {
          await api(`/api/tasks/${task._id}`, { method: 'DELETE' });
          await loadProject();
        } catch (err) {
          document.getElementById('project-error').textContent = err.message;
        }
      });
    }

    return card;
  }

  async function loadProject() {
    const errEl = document.getElementById('project-error');
    errEl.textContent = '';
    try {
      const data = await api(`/api/projects/${projectId}`);
      document.getElementById('project-name').textContent = data.name;
      projectMembers = data.members || [];
      const memberLabel = projectMembers.length
        ? projectMembers.map((m) => m.name).join(', ')
        : 'No members';
      document.getElementById('project-members').textContent = `Members: ${memberLabel}`;

      const select = document.getElementById('assignee-select');
      const current = select.value;
      select.innerHTML = '<option value="">— Unassigned —</option>' +
        projectMembers.map((m) => `<option value="${m._id}">${escapeHtml(m.name)}</option>`).join('');
      if (current) select.value = current;

      renderTasks(data.tasks || []);
    } catch (err) {
      errEl.textContent = err.message;
    }
  }

  async function submitTask(e) {
    e.preventDefault();
    taskError.textContent = '';
    const fd = new FormData(taskForm);
    const body = {
      title: fd.get('title'),
      description: fd.get('description') || '',
      priority: fd.get('priority') || 'LOW',
      projectId
    };
    const due = fd.get('dueDate');
    if (due) body.dueDate = due;
    const assignee = fd.get('assignedToId');
    if (assignee) body.assignedToId = assignee;

    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      taskModal.classList.add('hidden');
      await loadProject();
    } catch (err) {
      taskError.textContent = err.message;
    }
  }

  loadProject();
})();
