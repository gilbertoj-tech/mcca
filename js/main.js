/* =============================================
   MAIN.JS — Public Site Logic
   Usinagem e Solda de Precisão
   ============================================= */

import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, addDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── Default / Fallback Data ────────────────────────────────────────────── */
const DEFAULTS = {
  name:     'Usinagem e Solda de Precisão',
  slogan:   'Precisão que transforma metal em excelência',
  phone:    '(00) 0000-0000',
  email:    'contato@empresa.com.br',
  whatsapp: '5500000000000',
  address:  'Seu endereço, Cidade - Estado',
  about:    'Somos especializados em usinagem CNC e soldagem de precisão, atendendo indústrias que exigem o mais alto padrão de qualidade e tolerância.',
  logoUrl:  'assets/placeholder-logo.svg',
  heroImage: ''
};

/* ─── Utility ────────────────────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function safeSet(sel, value, attr = 'textContent') {
  const el = $(sel);
  if (el && value) el[attr] = value;
}

function formatPhone(phone) {
  return phone || '';
}

/* ─── Toast Notification ───────────────────────────────────────────────── */
function showToast(title, message, type = 'info', duration = 4000) {
  const container = $('#toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Fechar">✕</button>
    <div class="toast-bar" style="animation-duration:${duration}ms"></div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const close = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  setTimeout(close, duration);
}

/* ─── Scroll Progress Bar ──────────────────────────────────────────────── */
function setupScrollProgress() {
  const bar = $('#scroll-progress');
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ─── Form Validation ──────────────────────────────────────────────────── */
function setupFormValidation() {
  $$('form').forEach(form => {
    const fields = form.querySelectorAll('input[required], textarea[required], input[type="email"]');
    fields.forEach(field => {
      const errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      field.parentNode.appendChild(errorEl);

      field.addEventListener('blur', () => validateField(field, errorEl));
      field.addEventListener('input', () => {
        if (field.classList.contains('error') || field.classList.contains('valid')) {
          validateField(field, errorEl);
        }
      });
    });
  });
}

function validateField(field, errorEl) {
  field.classList.remove('error', 'valid');
  errorEl.classList.remove('show');

  if (field.hasAttribute('required') && !field.value.trim()) {
    field.classList.add('error');
    errorEl.textContent = 'Este campo é obrigatório.';
    errorEl.classList.add('show');
    return false;
  }

  if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value.trim())) {
      field.classList.add('error');
      errorEl.textContent = 'Insira um e-mail válido.';
      errorEl.classList.add('show');
      return false;
    }
  }

  field.classList.add('valid');
  return true;
}

/* ─── Counter Animation ────────────────────────────────────────────────── */
function setupCounterAnimation() {
  const metrics = $$('.metric');
  if (!metrics.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  metrics.forEach(m => observer.observe(m));
}

/* ─── Reveal Animations ────────────────────────────────────────────────── */
function setupRevealAnimations() {
  const els = $$('.reveal, .reveal-left, .reveal-right, .fade-in');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach(el => observer.observe(el));
}

/* ─── Load Company Data ──────────────────────────────────────────────────── */
async function loadCompany() {
  let data = { ...DEFAULTS };

  try {
    const snap = await getDoc(doc(db, 'company', 'main'));
    if (snap.exists()) Object.assign(data, snap.data());
  } catch (e) {
    console.warn('Firebase não configurado ou sem dados. Usando padrões.', e.message);
  }

  /* Populate meta */
  document.title = data.name + ' | Usinagem e Soldagem de Precisão';
  $('meta[name="description"]')?.setAttribute('content', data.slogan);

  /* Navbar */
  safeSet('#nav-name', data.name);
  const navLogo = $('#nav-logo');
  if (navLogo) navLogo.src = data.logoUrl || DEFAULTS.logoUrl;

  /* Hero */
  safeSet('#hero-name', data.name);
  safeSet('#hero-slogan', data.slogan);
  if (data.heroImage) {
    const heroBg = $('#hero-bg-img');
    if (heroBg) heroBg.src = data.heroImage;
  }

  /* About */
  safeSet('#about-text', data.about);

  /* Contact info */
  safeSet('#contact-phone', formatPhone(data.phone));
  safeSet('#contact-email', data.email);
  safeSet('#contact-address', data.address);

  /* Footer */
  safeSet('#footer-name', data.name);
  safeSet('#footer-slogan', data.slogan);
  safeSet('#footer-phone', formatPhone(data.phone));
  safeSet('#footer-email', data.email);
  const footerLogo = $('#footer-logo');
  if (footerLogo) footerLogo.src = data.logoUrl || DEFAULTS.logoUrl;

  /* WhatsApp button */
  const waBtn = $('#whatsapp-btn');
  if (waBtn && data.whatsapp) {
    const number = data.whatsapp.replace(/\D/g, '');
    waBtn.href = `https://wa.me/${number}`;
    waBtn.setAttribute('aria-label', `Contato via WhatsApp: ${data.phone || ''}`);
  }

  /* WhatsApp in contact section */
  const waLink = $('#contact-whatsapp-link');
  if (waLink && data.whatsapp) {
    const number = data.whatsapp.replace(/\D/g, '');
    waLink.href = `https://wa.me/${number}`;
    waLink.textContent = formatPhone(data.whatsapp) || data.whatsapp;
  }
}

/* ─── Load Services ──────────────────────────────────────────────────────── */
async function loadServices() {
  const grid = $('#services-grid');
  if (!grid) return;

  const DEMO_SERVICES = [
    { icon: '⚙️', title: 'Usinagem CNC', description: 'Usinagem de alta precisão com máquinas CNC de última geração, garantindo tolerâncias de até ±0,005mm.' },
    { icon: '🔧', title: 'Soldagem de Precisão', description: 'Soldagem MIG, TIG e eletrodo revestido por profissionais certificados com controle total do processo.' },
    { icon: '📐', title: 'Corte e Dobramento', description: 'Corte a laser, plasma e guilhotina, com dobramento em prensa hidráulica de alta capacidade.' },
    { icon: '🔩', title: 'Tratamento de Superfície', description: 'Processos de jateamento, galvanização, pintura eletrostática e passivação para maior durabilidade.' },
  ];

  try {
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    const services = snap.empty ? DEMO_SERVICES : snap.docs.map(d => d.data());
    renderServices(grid, services);
  } catch {
    renderServices(grid, DEMO_SERVICES);
  }
}

function renderServices(grid, services) {
  if (!services.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado ainda.</div>';
    return;
  }
  grid.innerHTML = services.map((s, i) => `
    <article class="service-card fade-in">
      <span class="service-card-coord">SRV-${String(i + 1).padStart(3, '0')}</span>
      <div class="service-icon">${s.icon || '⚙️'}</div>
      <h3 class="service-title">${s.title || ''}</h3>
      <p class="service-desc">${s.description || ''}</p>
    </article>
  `).join('');
  observeFadeIn(grid.querySelectorAll('.fade-in'));
}

/* ─── Load Testimonials ──────────────────────────────────────────────────── */
async function loadTestimonials() {
  const track = $('#testimonials-track');
  const dotsWrap = $('#testimonials-dots');
  if (!track) return;

  const DEMO = [
    { name: 'João Ferreira', role: 'Engenheiro de Produção', company: 'Metalúrgica Alfa', text: 'Qualidade excepcional nas peças usinadas. Os prazos são sempre cumpridos e o acabamento supera as especificações técnicas. Recomendo sem ressalvas.', stars: 5 },
    { name: 'Ana Costa', role: 'Gerente de Compras', company: 'Indústria Beta S.A.', text: 'Parceiro confiável há 3 anos. Atendimento técnico diferenciado e capacidade de resolver problemas complexos rapidamente. Profissionalismo de alto nível.', stars: 5 },
    { name: 'Pedro Alves', role: 'Diretor Industrial', company: 'Maquinário Gama', text: 'As soldagens entregues têm qualidade impecável, com laudos de controle de qualidade que nos dão total confiança para usar nas nossas máquinas.', stars: 5 },
  ];

  let testimonials = DEMO;
  try {
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) testimonials = snap.docs.map(d => d.data());
  } catch {}

  renderTestimonials(track, dotsWrap, testimonials);
}

function renderTestimonials(track, dotsWrap, items) {
  if (!items.length) {
    track.parentElement.innerHTML = '<div class="empty-state">Nenhum depoimento cadastrado ainda.</div>';
    return;
  }

  track.innerHTML = items.map(t => {
    const initials = t.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
    const photoHtml = t.photoUrl
      ? `<img class="testimonial-photo" src="${t.photoUrl}" alt="${t.name}" loading="lazy">`
      : `<div class="testimonial-photo-placeholder">${initials}</div>`;
    const stars = '★'.repeat(Math.min(5, t.stars || 5));
    return `
      <div class="testimonial-card">
        <div class="testimonial-stars">${stars.split('').map(s => `<span class="star">${s}</span>`).join('')}</div>
        <p class="testimonial-text">${t.text || ''}</p>
        <div class="testimonial-author">
          ${photoHtml}
          <div>
            <div class="testimonial-name">${t.name || ''}</div>
            <div class="testimonial-role">${t.role || ''}${t.company ? ' · ' + t.company : ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Dots
  if (dotsWrap) {
    dotsWrap.innerHTML = items.map((_, i) =>
      `<div class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`
    ).join('');
  }

  // Carousel logic
  let current = 0;
  const cards = track.querySelectorAll('.testimonial-card');
  const cardW = 380 + 24; // width + gap

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, items.length - 1));
    track.style.transform = `translateX(-${current * cardW}px)`;
    dotsWrap?.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  $('#testimonials-prev')?.addEventListener('click', () => goTo(current - 1));
  $('#testimonials-next')?.addEventListener('click', () => goTo(current + 1));
  dotsWrap?.querySelectorAll('.dot').forEach(d =>
    d.addEventListener('click', () => goTo(+d.dataset.idx))
  );

  // Auto-play
  let timer = setInterval(() => goTo((current + 1) % items.length), 5000);
  track.closest('.testimonials-wrapper')?.addEventListener('mouseenter', () => clearInterval(timer));
  track.closest('.testimonials-wrapper')?.addEventListener('mouseleave', () => {
    clearInterval(timer);
    timer = setInterval(() => goTo((current + 1) % items.length), 5000);
  });
}

/* ─── Load Clients ───────────────────────────────────────────────────────── */
async function loadClients() {
  const grid = $('#clients-grid');
  if (!grid) return;

  const DEMO = [
    { name: 'Metalúrgica Alfa' },
    { name: 'Indústria Beta' },
    { name: 'Engenharia Gama' },
    { name: 'Construções Delta' },
  ];

  let clients = DEMO;
  try {
    const q = query(collection(db, 'clients'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) clients = snap.docs.map(d => d.data());
  } catch {}

  renderClients(grid, clients);
}

function renderClients(grid, clients) {
  if (!clients.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado ainda.</div>';
    return;
  }
  grid.innerHTML = clients.map(c => `
    <div class="client-card fade-in">
      ${c.logoUrl
        ? `<img class="client-logo" src="${c.logoUrl}" alt="${c.name}" loading="lazy">`
        : `<div style="font-size:28px;opacity:0.3">🏭</div>`}
      <span class="client-name">${c.name || ''}</span>
    </div>
  `).join('');
  observeFadeIn(grid.querySelectorAll('.fade-in'));
}

/* ─── Contact Form ───────────────────────────────────────────────────────── */
function setupContactForm() {
  const form = $('#contact-form');
  const feedback = $('#form-feedback');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    const fields = form.querySelectorAll('input[required], textarea[required], input[type="email"]');
    let valid = true;
    fields.forEach(f => {
      const err = f.parentNode.querySelector('.form-error');
      if (err && !validateField(f, err)) valid = false;
    });
    if (!valid) { showToast('Formulário inválido', 'Corrija os campos destacados antes de enviar.', 'error'); return; }

    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
    if (feedback) { feedback.className = 'form-feedback'; feedback.textContent = ''; }

    const data = {
      name:    form.name.value.trim(),
      email:   form.email.value.trim(),
      phone:   form.phone?.value?.trim() || '',
      subject: form.subject?.value?.trim() || '',
      message: form.message.value.trim(),
      createdAt: serverTimestamp(),
      read: false
    };

    try {
      await addDoc(collection(db, 'contacts'), data);
      form.reset();
      fields.forEach(f => f.classList.remove('valid'));
      showToast('Mensagem enviada!', 'Entraremos em contato em breve.', 'success');
    } catch (err) {
      showToast('Erro ao enviar', 'Tente via WhatsApp ou e-mail diretamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

/* ─── Scroll Animations (IntersectionObserver) ───────────────────────────── */
function observeFadeIn(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ─── Mobile Navbar ──────────────────────────────────────────────────────── */
function setupMobileNav() {
  const toggle = $('#mobile-toggle');
  const nav    = $('#mobile-nav');
  const close  = $('#mobile-nav-close');

  toggle?.addEventListener('click', () => nav?.classList.add('open'));
  close?.addEventListener('click', () => nav?.classList.remove('open'));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

/* ─── Smooth Quote Btn Scroll ────────────────────────────────────────────── */
function setupQuoteBtn() {
  $$('[data-scroll-to]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = $(el.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
async function init() {
  // Progress bar
  setupScrollProgress();

  // Counter animations
  setupCounterAnimation();

  // Reveal animations
  setupRevealAnimations();

  // Form validation
  setupFormValidation();

  // Setup interactions
  setupMobileNav();
  setupQuoteBtn();
  setupContactForm();

  // Load data (parallel)
  await Promise.all([
    loadCompany(),
    loadServices(),
    loadTestimonials(),
    loadClients()
  ]);
}

init();
