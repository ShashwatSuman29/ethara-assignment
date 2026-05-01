(function () {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) {
    window.location.replace('/index.html');
    return;
  }

  const navUser = document.getElementById('nav-user');
  navUser.textContent = `${user.name} · ${user.role}`;
  document.getElementById('logout-btn').addEventListener('click', logout);

  const newProjectBtn = document.getElementById('new-project-btn');
  if (user.role === 'ADMIN') newProjectBtn.classList.remove('hidden');

  const modal = document.getElementById('project-modal');
  const projectForm = document.getElementById('project-form');
  const projectError = document.getElementById('project-error');
  const memberCheckboxes = document.getElementById('member-checkboxes');
  const projectCancel = document.getElementById('project-cancel');

  newProjectBtn.addEventListener('click', openProjectModal);
  projectCancel.addEventListener('click', closeProjectModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeProjectModal(); });
  projectForm.addEventListener('submit', submitProject);

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
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString();
  }

  async function loadDashboardStats() {
    try {
      const stats = await api('/api/tasks/dashboard');
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-todo').textContent = stats.todo;
      document.getElementById('stat-inprogress').textContent = stats.inProgress;
      document.getElementById('stat-done').textContent = stats.done;
      document.getElementById('stat-overdue').textContent = stats.overdue;
    } catch (err) { /* errors already redirect on 401 */ }
  }

  async function loadProjects() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('projects-empty');
    const errorEl = document.getElementById('projects-error');
    errorEl.textContent = '';
    try {
      const projects = await api('/api/projects');
      grid.innerHTML = '';
      if (!projects.length) {
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      projects.forEach((p) => {
        const a = document.createElement('a');
        a.className = 'project-card';
        a.href = `/project.html?id=${p._id}`;
        a.innerHTML = `
          <div class="project-card-title">${escapeHtml(p.name)}</div>
          <div class="project-card-meta">${(p.memberIds || []).length} member(s)</div>
        `;
        grid.appendChild(a);
      });
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  async function loadOverdue() {
    const tbody = document.getElementById('overdue-tbody');
    const empty = document.getElementById('overdue-empty');
    const errorEl = document.getElementById('overdue-error');
    errorEl.textContent = '';
    try {
      const tasks = await api('/api/tasks/overdue');
      tbody.innerHTML = '';
      if (!tasks.length) {
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      tasks.forEach((t) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(t.title)}</td>
          <td><span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span></td>
          <td>${formatDate(t.dueDate)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  async function openProjectModal() {
    projectError.textContent = '';
    projectForm.reset();
    memberCheckboxes.innerHTML = '<div class="muted">Loading members…</div>';
    modal.classList.remove('hidden');
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let users = [];
      if (res.ok) {
        users = await res.json();
      }
      if (!users.length) {
        memberCheckboxes.innerHTML = `
          <label><input type="checkbox" name="memberIds" value="${user.id}" checked /> ${escapeHtml(user.name)} (you)</label>
        `;
      } else {
        memberCheckboxes.innerHTML = users.map((u) => `
          <label>
            <input type="checkbox" name="memberIds" value="${u._id}" ${u._id === user.id ? 'checked' : ''} />
            ${escapeHtml(u.name)} <span class="muted">${escapeHtml(u.email)}</span>
          </label>
        `).join('');
      }
    } catch (err) {
      memberCheckboxes.innerHTML = `
        <label><input type="checkbox" name="memberIds" value="${user.id}" checked /> ${escapeHtml(user.name)} (you)</label>
      `;
    }
  }

  function closeProjectModal() {
    modal.classList.add('hidden');
  }

  async function submitProject(e) {
    e.preventDefault();
    projectError.textContent = '';
    const fd = new FormData(projectForm);
    const name = fd.get('name');
    const memberIds = Array.from(projectForm.querySelectorAll('input[name="memberIds"]:checked'))
      .map((el) => el.value);
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, memberIds })
      });
      closeProjectModal();
      await Promise.all([loadProjects(), loadDashboardStats()]);
    } catch (err) {
      projectError.textContent = err.message;
    }
  }

  const AVATAR_PALETTE = ['#92400E', '#065F46', '#7C2D12', '#6B21A8', '#9D174D', '#374151', '#B45309', '#0F766E'];
  function avatarColor(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  }
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(date).toLocaleDateString();
  }

  async function loadActivity() {
    const feed = document.getElementById('activity-feed');
    const empty = document.getElementById('activity-empty');
    try {
      const activities = await api('/api/activity');
      feed.innerHTML = '';
      if (!activities.length) { empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');
      activities.slice(0, 20).forEach((a) => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        const color = avatarColor(a.userName);
        const ini = initials(a.userName);
        item.innerHTML = `
          <div class="avatar avatar-sm" style="background:${color}">${ini}</div>
          <div class="activity-body">
            <span class="activity-name">${escapeHtml(a.userName)}</span>
            <span class="activity-detail"> ${escapeHtml(a.detail)}</span>
          </div>
          <div class="activity-time">${timeAgo(a.createdAt)}</div>
        `;
        feed.appendChild(item);
      });
    } catch (err) { /* silently skip */ }
  }

  loadDashboardStats();
  loadProjects();
  loadOverdue();
  loadActivity();
})();
