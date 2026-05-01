(function () {
  if (localStorage.getItem('token')) {
    window.location.replace('/dashboard.html');
    return;
  }

  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      if (target === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
      loginError.textContent = '';
      signupError.textContent = '';
    });
  });

  function persist(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/dashboard.html';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const fd = new FormData(loginForm);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fd.get('email'),
          password: fd.get('password')
        })
      });
      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || 'Login failed';
        return;
      }
      persist(data);
    } catch (err) {
      loginError.textContent = 'Network error';
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    const fd = new FormData(signupForm);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          password: fd.get('password'),
          role: fd.get('role')
        })
      });
      const data = await res.json();
      if (!res.ok) {
        signupError.textContent = data.error || 'Sign up failed';
        return;
      }
      persist(data);
    } catch (err) {
      signupError.textContent = 'Network error';
    }
  });
})();
