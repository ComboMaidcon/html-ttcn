/* ── Page init (call once per page) ── */
function initPage() {
  /* Nav scroll */
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () =>
      nav.classList.toggle('scrolled', window.scrollY > 60), { passive:true });
    const path = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
  }
  /* Scroll reveal */
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.rev').forEach(el => obs.observe(el));
}

/* Re-observe .rev elements added dynamically (call after render) */
function reObserve() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.rev:not(.on)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) e.classList.add('on');
    else obs.observe(el);
  });
}
