(function () {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) { window.location.replace('/index.html'); return; }

  document.getElementById('nav-user').textContent = `${user.name} · ${user.role}`;
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/index.html');
  });

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

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMemberCard(member) {
    const color = avatarColor(member.name);
    const ini = initials(member.name);
    const { total, done, completionRate } = member.taskStats;
    const projectNames = member.projects.length
      ? member.projects.map((p) => escapeHtml(p.name)).join(', ')
      : '<span class="none">No projects assigned</span>';
    const roleBadgeClass = member.role === 'ADMIN' ? 'badge-DONE' : 'badge-TODO';

    const card = document.createElement('div');
    card.className = 'member-card';
    card.innerHTML = `
      <div class="member-card-top">
        <div class="avatar" style="background:${color}">${ini}</div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-email">${escapeHtml(member.email)}</div>
        </div>
        <span class="badge ${roleBadgeClass}">${member.role}</span>
      </div>
      <div class="member-section-label">Projects</div>
      <div class="member-projects">${projectNames}</div>
      <div class="member-section-label">Task completion</div>
      <div class="progress-wrap">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${completionRate}%"></div>
        </div>
        <div class="progress-labels">
          <span>${done} / ${total} tasks done</span>
          <span>${completionRate}%</span>
        </div>
      </div>
    `;
    return card;
  }

  async function loadTeam() {
    const errorEl = document.getElementById('team-error');
    const grid = document.getElementById('team-grid');
    const empty = document.getElementById('team-empty');
    errorEl.textContent = '';
    try {
      const res = await fetch('/api/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { window.location.replace('/index.html'); return; }
      const data = await res.json();
      if (!res.ok) { errorEl.textContent = data.error || 'Failed to load team'; return; }
      grid.innerHTML = '';
      if (!data.length) { empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');
      data.forEach((m) => grid.appendChild(renderMemberCard(m)));
    } catch (err) {
      errorEl.textContent = 'Network error';
    }
  }

  loadTeam();
})();
