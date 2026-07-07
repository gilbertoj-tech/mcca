/* =============================================
   ADMIN.JS — Admin Panel Logic
   Usinagem e Solda de Precisão
   ============================================= */

import { db, storage, auth } from './firebase-config.js';
import { requireAuth, logout } from './auth.js';
import {
  doc, getDoc, setDoc, collection,
  getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ─── Utility ────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

function formatDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Toast Notification ───────────────────────────────────────────────── */
function showToast(title, message, type = 'info', duration = 4000) {
  const container = $('#admin-toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="admin-toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="admin-toast-content">
      <div class="admin-toast-title">${title}</div>
      <div class="admin-toast-message">${message}</div>
    </div>
    <button class="admin-toast-close" aria-label="Fechar">✕</button>
    <div class="admin-toast-bar" style="animation-duration:${duration}ms"></div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const close = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  };

  toast.querySelector('.admin-toast-close').addEventListener('click', close);
  setTimeout(close, duration);
}

/* ─── Custom Confirm Dialog ────────────────────────────────────────────── */
function showConfirm(message, icon = '⚠️') {
  return new Promise(resolve => {
    const dialog = $('#confirm-dialog');
    const iconEl = $('#confirm-icon');
    const msgEl = $('#confirm-message');
    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');

    if (!dialog) { resolve(confirm(message)); return; }

    if (iconEl) iconEl.textContent = icon;
    if (msgEl) msgEl.textContent = message;

    const cleanup = () => {
      dialog.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onOverlay = (e) => { if (e.target === dialog) onCancel(); };
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onOk(); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    dialog.classList.add('open');
    cancelBtn.focus();
  });
}

/* ─── Upload Image to Firebase Storage ──────────────────────────────────── */
async function uploadImage(file, path, progressEl) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    if (progressEl) {
      progressEl.style.display = 'block';
      const fill = progressEl.querySelector('.progress-bar-fill');
      task.on('state_changed',
        snap => { if (fill) fill.style.width = (snap.bytesTransferred / snap.totalBytes * 100) + '%'; },
        reject,
        async () => { resolve(await getDownloadURL(task.snapshot.ref)); progressEl.style.display = 'none'; }
      );
    } else {
      task.on('state_changed', null, reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    }
  });
}

/* ─── Sidebar Navigation ─────────────────────────────────────────────────── */
function setupNav() {
  $$('.sidebar-link[data-panel]').forEach(link => {
    link.addEventListener('click', () => {
      $$('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const panelId = link.dataset.panel;
      $$('.admin-panel').forEach(p => p.classList.remove('active'));
      $(`#panel-${panelId}`)?.classList.add('active');
      // Update topbar title
      const topTitle = $('#topbar-title');
      const topSub   = $('#topbar-sub');
      if (topTitle) topTitle.textContent = link.querySelector('.link-text')?.textContent || '';
      if (topSub)   topSub.textContent   = link.dataset.sub || '';
    });
  });
}

/* ─── Dashboard Stats ────────────────────────────────────────────────────── */
async function loadStats() {
  const collections = ['services', 'testimonials', 'clients', 'contacts'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      const el = $(`#stat-${col}`);
      if (el) el.textContent = snap.size;
    } catch {}
  }
}

/* ════════════════════════════════════════════════════════════════════
   EMPRESA
   ════════════════════════════════════════════════════════════════════ */
async function loadCompanyForm() {
  try {
    const snap = await getDoc(doc(db, 'company', 'main'));
    if (!snap.exists()) return;
    const d = snap.data();
    const fields = ['name','slogan','cnpj','phone','email','whatsapp','address','about'];
    fields.forEach(f => {
      const el = $(`#empresa-${f}`);
      if (el) el.value = d[f] || '';
    });
    if (d.logoUrl) {
      const prev = $('#empresa-logo-preview');
      if (prev) { prev.src = d.logoUrl; prev.style.display = 'block'; }
    }
    if (d.heroImage) {
      const prev = $('#empresa-hero-preview');
      if (prev) { prev.src = d.heroImage; prev.style.display = 'block'; }
    }
  } catch (e) { console.warn('Empresa load:', e.message); }
}

function setupCompanyForm() {
  // Logo preview
  $('#empresa-logo-file')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      const prev = $('#empresa-logo-preview');
      if (prev) { prev.src = url; prev.style.display = 'block'; }
    }
  });

  // Hero preview
  $('#empresa-hero-file')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      const prev = $('#empresa-hero-preview');
      if (prev) { prev.src = url; prev.style.display = 'block'; }
    }
  });

  $('#empresa-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#btn-save-empresa');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
      const data = {
        name:     $('#empresa-name').value.trim(),
        slogan:   $('#empresa-slogan').value.trim(),
        cnpj:     $('#empresa-cnpj').value.trim(),
        phone:    $('#empresa-phone').value.trim(),
        email:    $('#empresa-email').value.trim(),
        whatsapp: $('#empresa-whatsapp').value.trim(),
        address:  $('#empresa-address').value.trim(),
        about:    $('#empresa-about').value.trim(),
        updatedAt: serverTimestamp()
      };

      // Upload logo
      const logoFile = $('#empresa-logo-file')?.files[0];
      if (logoFile) {
        data.logoUrl = await uploadImage(logoFile, `company/logo_${Date.now()}`, $('#logo-progress'));
      }

      // Upload hero image
      const heroFile = $('#empresa-hero-file')?.files[0];
      if (heroFile) {
        data.heroImage = await uploadImage(heroFile, `company/hero_${Date.now()}`, $('#hero-progress'));
      }

      await setDoc(doc(db, 'company', 'main'), data, { merge: true });
      showToast('Empresa salva', 'Dados atualizados com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar', err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = '💾 Salvar Empresa';
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   SERVIÇOS
   ════════════════════════════════════════════════════════════════════ */
let servicesData = [];

async function loadServicesList() {
  const list = $('#services-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Carregando...</div>';

  try {
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    servicesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderServicesList(list);
    $(`#stat-services`).textContent = servicesData.length;
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>${e.message}</div>`;
  }
}

function renderServicesList(list) {
  if (!servicesData.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚙️</div>Nenhum serviço cadastrado ainda. Clique em "Adicionar Serviço".</div>';
    return;
  }
  list.innerHTML = servicesData.map(s => `
    <div class="item-row fade-in">
      <div class="item-row-icon">${s.icon || '⚙️'}</div>
      <div class="item-row-info">
        <div class="item-row-title">${s.title || 'Sem título'}</div>
        <div class="item-row-sub">${(s.description || '').slice(0, 80)}${s.description?.length > 80 ? '...' : ''}</div>
      </div>
      <div class="item-row-actions">
        <button class="btn btn-edit" onclick="editService('${s.id}')">✏️ Editar</button>
        <button class="btn btn-delete" onclick="deleteService('${s.id}', '${(s.title || '').replace(/'/g,'\\'')}')">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

window.editService = function(id) {
  const s = servicesData.find(x => x.id === id);
  if (!s) return;
  $('#svc-modal-title').textContent = 'Editar Serviço';
  $('#svc-id').value   = id;
  $('#svc-icon').value = s.icon || '';
  $('#svc-title').value = s.title || '';
  $('#svc-desc').value  = s.description || '';
  $('#svc-order').value = s.order ?? '';
  openModal('modal-service');
};

window.deleteService = async function(id, name) {
  if (!(await showConfirm(`Excluir o serviço "${name}"?`, '🗑️'))) return;
  try {
    await deleteDoc(doc(db, 'services', id));
    showToast('Serviço excluído', 'O serviço foi removido com sucesso.', 'success');
    loadServicesList();
  } catch (e) {
    showToast('Erro ao excluir', e.message, 'error');
  }
};

function setupServicesModal() {
  $('#btn-add-service')?.addEventListener('click', () => {
    $('#svc-modal-title').textContent = 'Adicionar Serviço';
    $('#svc-id').value   = '';
    $('#svc-icon').value = '';
    $('#svc-title').value = '';
    $('#svc-desc').value  = '';
    $('#svc-order').value = servicesData.length;
    openModal('modal-service');
  });

  $('#svc-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#btn-save-service');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

    const id   = $('#svc-id').value;
    const data = {
      icon:        $('#svc-icon').value.trim() || '⚙️',
      title:       $('#svc-title').value.trim(),
      description: $('#svc-desc').value.trim(),
      order:       parseInt($('#svc-order').value) || 0,
      updatedAt:   serverTimestamp()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'services', id), data);
      } else {
        await addDoc(collection(db, 'services'), { ...data, createdAt: serverTimestamp() });
      }
      closeModal('modal-service');
      showToast('Serviço salvo', `Serviço ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
      loadServicesList();
    } catch (err) {
      showToast('Erro ao salvar serviço', err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Salvar';
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   DEPOIMENTOS
   ════════════════════════════════════════════════════════════════════ */
let testimonialsData = [];

async function loadTestimonialsList() {
  const list = $('#testimonials-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Carregando...</div>';

  try {
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    testimonialsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTestimonialsList(list);
    $(`#stat-testimonials`).textContent = testimonialsData.length;
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>${e.message}</div>`;
  }
}

function renderTestimonialsList(list) {
  if (!testimonialsData.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div>Nenhum depoimento cadastrado. Clique em "Adicionar Depoimento".</div>';
    return;
  }
  list.innerHTML = testimonialsData.map(t => `
    <div class="item-row fade-in">
      <div class="item-row-icon">⭐</div>
      <div class="item-row-info">
        <div class="item-row-title">${t.name || ''} — ${t.company || ''}</div>
        <div class="item-row-sub">${(t.text || '').slice(0, 90)}...</div>
      </div>
      <div class="item-row-actions">
        <button class="btn btn-edit" onclick="editTestimonial('${t.id}')">✏️ Editar</button>
        <button class="btn btn-delete" onclick="deleteTestimonial('${t.id}', '${(t.name || '').replace(/'/g,'\\'')}')">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

window.editTestimonial = function(id) {
  const t = testimonialsData.find(x => x.id === id);
  if (!t) return;
  $('#test-modal-title').textContent = 'Editar Depoimento';
  $('#test-id').value      = id;
  $('#test-name').value    = t.name || '';
  $('#test-role').value    = t.role || '';
  $('#test-company').value = t.company || '';
  $('#test-stars').value   = t.stars || 5;
  $('#test-text').value    = t.text || '';
  const prev = $('#test-photo-preview');
  if (prev) { prev.src = t.photoUrl || ''; prev.style.display = t.photoUrl ? 'block' : 'none'; }
  openModal('modal-testimonial');
};

window.deleteTestimonial = async function(id, name) {
  if (!(await showConfirm(`Excluir o depoimento de "${name}"?`, '🗑️'))) return;
  try {
    await deleteDoc(doc(db, 'testimonials', id));
    showToast('Depoimento excluído', 'O depoimento foi removido com sucesso.', 'success');
    loadTestimonialsList();
  } catch (e) {
    showToast('Erro ao excluir', e.message, 'error');
  }
};

function setupTestimonialsModal() {
  $('#btn-add-testimonial')?.addEventListener('click', () => {
    $('#test-modal-title').textContent = 'Adicionar Depoimento';
    $('#test-id').value      = '';
    $('#test-name').value    = '';
    $('#test-role').value    = '';
    $('#test-company').value = '';
    $('#test-stars').value   = 5;
    $('#test-text').value    = '';
    const prev = $('#test-photo-preview');
    if (prev) prev.style.display = 'none';
    openModal('modal-testimonial');
  });

  // Photo preview
  $('#test-photo-file')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      const prev = $('#test-photo-preview');
      if (prev) { prev.src = URL.createObjectURL(f); prev.style.display = 'block'; }
    }
  });

  $('#test-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#btn-save-testimonial');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

    const id = $('#test-id').value;
    const data = {
      name:      $('#test-name').value.trim(),
      role:      $('#test-role').value.trim(),
      company:   $('#test-company').value.trim(),
      stars:     parseInt($('#test-stars').value) || 5,
      text:      $('#test-text').value.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      const photoFile = $('#test-photo-file')?.files[0];
      if (photoFile) {
        data.photoUrl = await uploadImage(photoFile, `testimonials/photo_${Date.now()}`);
      } else if (id) {
        const existing = testimonialsData.find(x => x.id === id);
        if (existing?.photoUrl) data.photoUrl = existing.photoUrl;
      }

      if (id) {
        await updateDoc(doc(db, 'testimonials', id), data);
      } else {
        await addDoc(collection(db, 'testimonials'), { ...data, createdAt: serverTimestamp() });
      }
      closeModal('modal-testimonial');
      showToast('Depoimento salvo', `Depoimento ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
      loadTestimonialsList();
    } catch (err) {
      showToast('Erro ao salvar depoimento', err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Salvar';
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   CLIENTES
   ════════════════════════════════════════════════════════════════════ */
let clientsData = [];

async function loadClientsList() {
  const list = $('#clients-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Carregando...</div>';

  try {
    const q = query(collection(db, 'clients'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientsList(list);
    $(`#stat-clients`).textContent = clientsData.length;
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>${e.message}</div>`;
  }
}

function renderClientsList(list) {
  if (!clientsData.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏭</div>Nenhum cliente cadastrado. Clique em "Adicionar Cliente".</div>';
    return;
  }
  list.innerHTML = clientsData.map(c => `
    <div class="item-row fade-in">
      ${c.logoUrl
        ? `<img class="item-row-img" src="${c.logoUrl}" alt="${c.name}">`
        : `<div class="item-row-icon">🏭</div>`}
      <div class="item-row-info">
        <div class="item-row-title">${c.name || ''}</div>
        <div class="item-row-sub">Ordem: ${c.order ?? '-'}</div>
      </div>
      <div class="item-row-actions">
        <button class="btn btn-edit" onclick="editClient('${c.id}')">✏️ Editar</button>
        <button class="btn btn-delete" onclick="deleteClient('${c.id}', '${(c.name || '').replace(/'/g,'\\'')}')">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

window.editClient = function(id) {
  const c = clientsData.find(x => x.id === id);
  if (!c) return;
  $('#cli-modal-title').textContent = 'Editar Cliente';
  $('#cli-id').value    = id;
  $('#cli-name').value  = c.name || '';
  $('#cli-order').value = c.order ?? '';
  const prev = $('#cli-logo-preview');
  if (prev) { prev.src = c.logoUrl || ''; prev.style.display = c.logoUrl ? 'block' : 'none'; }
  openModal('modal-client');
};

window.deleteClient = async function(id, name) {
  if (!(await showConfirm(`Excluir o cliente "${name}"?`, '🗑️'))) return;
  try {
    await deleteDoc(doc(db, 'clients', id));
    showToast('Cliente excluído', 'O cliente foi removido com sucesso.', 'success');
    loadClientsList();
  } catch (e) {
    showToast('Erro ao excluir', e.message, 'error');
  }
};

function setupClientsModal() {
  $('#btn-add-client')?.addEventListener('click', () => {
    $('#cli-modal-title').textContent = 'Adicionar Cliente';
    $('#cli-id').value    = '';
    $('#cli-name').value  = '';
    $('#cli-order').value = clientsData.length;
    const prev = $('#cli-logo-preview');
    if (prev) prev.style.display = 'none';
    openModal('modal-client');
  });

  $('#cli-logo-file')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      const prev = $('#cli-logo-preview');
      if (prev) { prev.src = URL.createObjectURL(f); prev.style.display = 'block'; }
    }
  });

  $('#cli-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#btn-save-client');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

    const id   = $('#cli-id').value;
    const data = {
      name:      $('#cli-name').value.trim(),
      order:     parseInt($('#cli-order').value) || 0,
      updatedAt: serverTimestamp()
    };

    try {
      const logoFile = $('#cli-logo-file')?.files[0];
      if (logoFile) {
        data.logoUrl = await uploadImage(logoFile, `clients/logo_${Date.now()}`);
      } else if (id) {
        const existing = clientsData.find(x => x.id === id);
        if (existing?.logoUrl) data.logoUrl = existing.logoUrl;
      }

      if (id) {
        await updateDoc(doc(db, 'clients', id), data);
      } else {
        await addDoc(collection(db, 'clients'), { ...data, createdAt: serverTimestamp() });
      }
      closeModal('modal-client');
      showToast('Cliente salvo', `Cliente ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
      loadClientsList();
    } catch (err) {
      showToast('Erro ao salvar cliente', err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Salvar';
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   CONTATOS (Mensagens recebidas)
   ════════════════════════════════════════════════════════════════════ */
async function loadContacts() {
  const tbody = $('#contacts-tbody');
  if (!tbody) return;

  try {
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $(`#stat-contacts`).textContent = contacts.length;

    if (!contacts.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">Nenhuma mensagem recebida ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--bright)">${c.name || '-'}</div>
          <div style="font-size:12px;color:var(--muted)">${c.email || ''}</div>
        </td>
        <td><div style="font-size:12px;color:var(--on-surface-var)">${c.phone || '-'}</div></td>
        <td><div style="font-weight:500">${c.subject || '-'}</div><div class="contact-msg">${c.message || ''}</div></td>
        <td style="font-size:12px;white-space:nowrap">${formatDate(c.createdAt)}</td>
        <td>
          ${!c.read ? '<span class="badge-new">Novo</span>' : ''}
          ${c.email ? `<a href="mailto:${c.email}" class="btn btn-edit" style="margin-top:4px">📧 Responder</a>` : ''}
        </td>
      </tr>
    `).join('');

    // Mark all as read
    for (const c of contacts.filter(x => !x.read)) {
      updateDoc(doc(db, 'contacts', c.id), { read: true }).catch(() => {});
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--error)">${e.message}</td></tr>`;
  }
}

/* ─── Modal Helpers ──────────────────────────────────────────────────────── */
function openModal(id) {
  $(`#${id}`)?.classList.add('open');
  // Focus trap: focus first input
  const modal = $(`#${id}`);
  const firstInput = modal?.querySelector('input, textarea, select, button');
  setTimeout(() => firstInput?.focus(), 100);
}

function closeModal(id) {
  $(`#${id}`)?.classList.remove('open');
}
window.closeModal = closeModal;

function setupModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    // Close on Escape
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') overlay.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay')?.classList.remove('open'));
  });
}

/* ─── Sidebar Overlay ──────────────────────────────────────────────────── */
function setupSidebarOverlay() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  const toggle = $('#btn-sidebar-toggle');
  if (!sidebar || !overlay) return;

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    }
  });
}

/* ─── Logout ─────────────────────────────────────────────────────────────── */
function setupLogout() {
  $('#btn-logout')?.addEventListener('click', async () => {
    if (await showConfirm('Deseja sair do painel administrativo?', '🚪')) await logout();
  });
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
requireAuth(async (user) => {
  // Show user email in sidebar
  const userEl = $('#sidebar-user');
  if (userEl) userEl.textContent = user.email;

  setupNav();
  setupModals();
  setupSidebarOverlay();
  setupLogout();
  setupCompanyForm();
  setupServicesModal();
  setupTestimonialsModal();
  setupClientsModal();

  // Load all data
  await Promise.all([
    loadStats(),
    loadCompanyForm(),
    loadServicesList(),
    loadTestimonialsList(),
    loadClientsList(),
    loadContacts()
  ]);
});
