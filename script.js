const API_BASE = 'https://valorant-api.com/v1';

// ---- Buscador de jugadores (Ruta interna mediante Proxy Serverless) ----
const PROXY_BASE = '/api/player';
const VALORANT_REGIONS = [
  { value: 'eu', label: 'Europa' },
  { value: 'na', label: 'Norteamérica' },
  { value: 'latam', label: 'Latinoamérica' },
  { value: 'br', label: 'Brasil' },
  { value: 'ap', label: 'Asia-Pacífico' },
  { value: 'kr', label: 'Corea' },
];

// Estado global
let currentData = [];
let favorites = JSON.parse(localStorage.getItem('valorant_favs')) || [];
let compareList = [];
let showingFavsOnly = false;
let viewMode = 'catalog'; // 'catalog' | 'player'
let currentUserId = 'usuario_demo_123'; // Cambiará al loguearse con Supabase Auth

// Elementos del DOM
const categorySelect = document.getElementById('categorySelect');
const langSelect = document.getElementById('langSelect');
const searchInput = document.getElementById('searchInput');
const favFilterBtn = document.getElementById('favFilterBtn');
const playerSearchToggleBtn = document.getElementById('playerSearchToggleBtn');
const subFilterBar = document.getElementById('subFilterBar');
const contentGrid = document.getElementById('contentGrid');

// Modales
const detailModal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeModal');
const modalBody = document.getElementById('modalBody');

const compareModal = document.getElementById('compareModal');
const closeCompareModal = document.getElementById('closeCompareModal');
const compareModalBody = document.getElementById('compareModalBody');
const compareFloatingBar = document.getElementById('compareFloatingBar');
const compareCountText = document.getElementById('compareCountText');
const openCompareBtn = document.getElementById('openCompareBtn');
const clearCompareBtn = document.getElementById('clearCompareBtn');

// Elementos Auth DOM
const authModal = document.getElementById('authModal');
const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const closeAuthModal = document.getElementById('closeAuthModal');

// Pausar y cortar audios/vídeos al cerrar modales
function stopAllMedia(container) {
  if (!container) return;
  const videos = container.querySelectorAll('video');
  videos.forEach(v => {
    v.pause();
    v.currentTime = 0;
    v.src = '';
  });
  const audios = container.querySelectorAll('audio');
  audios.forEach(a => {
    a.pause();
    a.currentTime = 0;
    a.src = '';
  });
}

function shutdownModalContent() {
  stopAllMedia(detailModal);
  detailModal.style.display = 'none';
  modalBody.innerHTML = '';
}

function shutdownCompareModal() {
  stopAllMedia(compareModal);
  compareModal.style.display = 'none';
  compareModalBody.innerHTML = '';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCategoryData();
  switchAuthTab('login'); // Inicializar pestaña por defecto

  categorySelect.addEventListener('change', () => {
    compareList = [];
    updateCompareBar();
    loadCategoryData();
  });
  
  langSelect.addEventListener('change', loadCategoryData);
  searchInput.addEventListener('input', filterAndRender);
  
  favFilterBtn.addEventListener('click', () => {
    showingFavsOnly = !showingFavsOnly;
    favFilterBtn.classList.toggle('active', showingFavsOnly);
    filterAndRender();
  });

  playerSearchToggleBtn.addEventListener('click', () => {
    viewMode = viewMode === 'catalog' ? 'player' : 'catalog';
    playerSearchToggleBtn.classList.toggle('active', viewMode === 'player');
    setCatalogControlsVisible(viewMode === 'catalog');
    compareFloatingBar.style.display = 'none';

    if (viewMode === 'player') {
      renderPlayerSearchForm();
      contentGrid.innerHTML = '<div class="player-empty-state"><p>Introduce el nombre y etiqueta para buscar las estadísticas del jugador.</p></div>';
    } else {
      subFilterBar.innerHTML = '';
      loadCategoryData();
    }
  });

  // Eventos de Autenticación Modal
  openAuthModalBtn.addEventListener('click', () => {
    authModal.style.display = 'flex';
  });

  closeAuthModal.addEventListener('click', () => {
    authModal.style.display = 'none';
  });

  closeModal.addEventListener('click', shutdownModalContent);
  closeCompareModal.addEventListener('click', shutdownCompareModal);
  
  window.addEventListener('click', (e) => {
    if (e.target === detailModal) shutdownModalContent();
    if (e.target === compareModal) shutdownCompareModal();
    if (e.target === authModal) authModal.style.display = 'none';
  });

  openCompareBtn.addEventListener('click', openCompareModalView);
  clearCompareBtn.addEventListener('click', () => {
    compareList = [];
    updateCompareBar();
    filterAndRender();
  });
});

// ============ CONTROL DE PESTAÑAS DE AUTENTICACIÓN ============
function switchAuthTab(tab, event) {
  if (event) event.preventDefault();
  const container = document.getElementById('authFormContainer');
  const subtitle = document.getElementById('authSubtitle');
  
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelectorAll('.auth-tab-btn')[tab === 'login' ? 0 : tab === 'register' ? 1 : 2];
  if (activeBtn) activeBtn.classList.add('active');

  if (tab === 'login') {
    subtitle.textContent = 'Introduce tus credenciales de acceso';
    container.innerHTML = `
      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="email" id="loginEmail" placeholder="Correo electrónico" required class="styled-input" />
        <input type="password" id="loginPassword" placeholder="Contraseña" required class="styled-input" />
        <button type="submit" class="role-btn active" style="margin-top: 10px; width: 100%; padding: 10px;">Iniciar Sesión</button>
      </form>
    `;
  } else if (tab === 'register') {
    subtitle.textContent = 'Crea tu cuenta y verifica con tu correo';
    container.innerHTML = `
      <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="regUsername" placeholder="Nombre de usuario" required class="styled-input" />
        <input type="email" id="regEmail" placeholder="Correo electrónico personal" required class="styled-input" />
        <input type="password" id="regPassword" placeholder="Contraseña (mínimo 6 caracteres)" required class="styled-input" />
        <button type="submit" class="role-btn active" style="margin-top: 10px; width: 100%; padding: 10px;">Registrarse y Enviar Verificación</button>
      </form>
    `;
  } else if (tab === 'recovery') {
    subtitle.textContent = 'Te enviaremos un enlace de restablecimiento';
    container.innerHTML = `
      <form onsubmit="handleRecovery(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="email" id="recEmail" placeholder="Correo electrónico de tu cuenta" required class="styled-input" />
        <button type="submit" class="role-btn active" style="margin-top: 10px; width: 100%; padding: 10px;">Enviar Enlace de Recuperación</button>
      </form>
    `;
  }
}

// Lógica simulada conectable a Supabase Auth
async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const username = document.getElementById('regUsername').value;

  const btn = e.target.querySelector('button');
  btn.textContent = '⚡ SINCRONIZANDO CON PROTOCOLO...';
  btn.disabled = true;

  try {
    // Aquí invocarías tu cliente: await supabase.auth.signUp({ email, password, options: { data: { username } } })
    setTimeout(() => {
      alert(`¡Cuenta creada con éxito, ${username}! Te hemos enviado un correo de verificación a ${email}.`);
      switchAuthTab('login');
    }, 1500);
  } catch (err) {
    alert('Error en el registro: ' + err.message);
    btn.textContent = 'Registrarse y Enviar Verificación';
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    // Aquí invocarías tu cliente: const { data } = await supabase.auth.signInWithPassword({ email, password })
    setTimeout(() => {
      authModal.style.display = 'none';
      document.getElementById('authButtonText').textContent = 'Mi Cuenta';
      alert('¡Acceso concedido, Agente!');
    }, 800);
  } catch (err) {
    alert('Credenciales incorrectas.');
  }
}

async function handleRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('recEmail').value;
  
  try {
    // Aquí invocarías tu cliente: await supabase.auth.resetPasswordForEmail(email)
    alert(`Se ha enviado un enlace de recuperación seguro a ${email}. Revisa tu bandeja de entrada.`);
    switchAuthTab('login');
  } catch (err) {
    alert('Error al procesar la recuperación.');
  }
}

// Carga de Datos desde API Oficial
async function loadCategoryData() {
  const category = categorySelect.value;
  const lang = langSelect.value;

  contentGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
  subFilterBar.innerHTML = '';

  let endpoint = `${API_BASE}/${category}?language=${lang}`;
  if (category === 'agents') endpoint += '&isPlayableCharacter=true';

  try {
    const response = await fetch(endpoint);
    const result = await response.json();
    currentData = result.data || [];

    renderSubFilters(category);
    filterAndRender();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    contentGrid.innerHTML = '<p>Error al cargar el contenido.</p>';
  }
}

// Filtro de Búsqueda
function filterAndRender() {
  const query = searchInput.value.toLowerCase().trim();

  const filtered = currentData.filter(item => {
    const nameMatches = item.displayName ? item.displayName.toLowerCase().includes(query) : false;
    const favMatches = showingFavsOnly ? favorites.includes(item.uuid) : true;
    return nameMatches && favMatches;
  });

  renderCards(filtered, categorySelect.value);
}

// Renderizado de Tarjetas con Inclinación 3D Pop-Out
function renderCards(data, category) {
  contentGrid.innerHTML = '';

  if (data.length === 0) {
    contentGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No se encontraron elementos.</p>';
    return;
  }

  data.forEach(item => {
    let primaryImg = item.displayIcon || '';
    let hoverImg = item.displayIcon || '';
    let subtitle = '';

    if (category === 'agents') {
      primaryImg = item.displayIcon;
      hoverImg = item.fullPortrait || item.fullPortraitV2 || item.displayIcon;
      subtitle = item.role ? item.role.displayName : 'Agente';
    } else if (category === 'weapons') {
      primaryImg = item.displayIcon;
      hoverImg = item.skins?.[0]?.chromas?.[0]?.fullRender || item.displayIcon;
      subtitle = item.shopData?.categoryText || 'Arma';
    } else if (category === 'playercards') {
      primaryImg = item.displayIcon || item.smallArt;
      hoverImg = item.largeArt || item.wideArt;
      subtitle = 'Tarjeta de Jugador';
    } else if (category === 'maps') {
      primaryImg = item.listViewIcon || item.splash;
      hoverImg = item.displayIcon || item.splash;
      subtitle = item.coordinates || 'Mapa';
    } else if (category === 'sprays') {
      primaryImg = item.displayIcon;
      hoverImg = item.animationPng || item.animationGif || item.fullTransparentIcon || item.displayIcon;
      subtitle = 'Graffiti';
    } else if (category === 'buddies') {
      primaryImg = item.displayIcon;
      hoverImg = item.levels?.[0]?.displayIcon || item.displayIcon;
      subtitle = 'Llavero';
    }

    const isFav = favorites.includes(item.uuid);
    const isComparing = compareList.includes(item.uuid);

    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    wrapper.innerHTML = `
      <div class="card">
        ${item.backgroundGradientColors ? `
          <div class="card-bg" style="background: linear-gradient(135deg, #${item.backgroundGradientColors[0]}, #${item.backgroundGradientColors[1]}); opacity: 0.25;"></div>
        ` : ''}

        <div class="card-action-btns">
          ${category === 'weapons' ? `
            <button class="card-btn ${isComparing ? 'is-comparing' : ''}" onclick="toggleCompare('${item.uuid}', event)">⚖</button>
          ` : ''}
          <button class="card-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite('${item.uuid}', event)">♥</button>
        </div>

        <div class="card-img-container" onclick="openDetailModal('${item.uuid}')">
          <img class="card-img primary-img" src="${primaryImg}" alt="${item.displayName}" loading="lazy" />
          <img class="card-img hover-img" src="${hoverImg}" alt="${item.displayName} 3D" loading="lazy" />
        </div>

        <div class="card-title" onclick="openDetailModal('${item.uuid}')">${item.displayName}</div>
        <div class="card-subtitle">${subtitle}</div>
      </div>
    `;

    contentGrid.appendChild(wrapper);
  });
}

// Detalle Modal
function openDetailModal(uuid) {
  const item = currentData.find(i => i.uuid === uuid);
  if (!item) return;

  const category = categorySelect.value;
  modalBody.innerHTML = '';

  switch (category) {
    case 'agents': renderAgentDetail(item); break;
    case 'weapons': renderWeaponDetail(item); break;
    case 'maps': renderMapDetail(item); break;
    case 'playercards': renderPlayerCardDetail(item); break;
    case 'sprays': renderSprayDetail(item); break;
    case 'buddies': renderBuddyDetail(item); break;
    default: renderGenericDetail(item); break;
  }

  detailModal.style.display = 'flex';
}

function renderMapDetail(map) {
  const callouts = map.callouts || [];
  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${map.displayName}</h2>
      <p style="color: #888; font-size: 13px; margin-bottom: 15px;">${map.coordinates || ''}</p>
      ${map.splash ? `<img src="${map.splash}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">` : ''}
    </div>
  `;
}

function renderAgentDetail(agent) {
  modalBody.innerHTML = `
    <div class="modal-header">
      <img src="${agent.displayIcon}" alt="${agent.displayName}">
      <div>
        <h2>${agent.displayName}</h2>
        <p style="color: var(--accent-red);">${agent.role ? agent.role.displayName : ''}</p>
      </div>
    </div>
    <p style="margin-bottom: 15px; color: #ccc; font-size: 14px;">${agent.description || ''}</p>
  `;
}

function renderPlayerCardDetail(card) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${card.displayName}</h2></div>`;
}

function renderSprayDetail(spray) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${spray.displayName}</h2></div>`;
}

function renderBuddyDetail(buddy) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${buddy.displayName}</h2></div>`;
}

function renderWeaponDetail(weapon) {
  modalBody.innerHTML = `<div class="modal-header"><h2>${weapon.displayName}</h2></div>`;
}

function renderGenericDetail(item) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${item.displayName}</h2></div>`;
}

// Subfiltros de Categoría
function renderSubFilters(category) {
  if (category !== 'agents') return;
  const uniqueRoles = ['Todos', ...new Set(currentData.map(a => a.role ? a.role.displayName : '').filter(Boolean))];
  subFilterBar.innerHTML = uniqueRoles.map(role => `
    <button class="role-btn ${role === 'Todos' ? 'active' : ''}" onclick="filterByRole('${role}', this)">${role}</button>
  `).join('');
}

function filterByRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (role === 'Todos') { filterAndRender(); return; }
  const query = searchInput.value.toLowerCase().trim();
  const filtered = currentData.filter(item => item.role && item.role.displayName === role && item.displayName.toLowerCase().includes(query));
  renderCards(filtered, categorySelect.value);
}

// Favoritos
function toggleFavorite(uuid, event) {
  event.stopPropagation();
  if (favorites.includes(uuid)) {
    favorites = favorites.filter(id => id !== uuid);
  } else {
    favorites.push(uuid);
  }
  localStorage.setItem('valorant_favs', JSON.stringify(favorites));
  filterAndRender();
}

// Comparador de Armas
function toggleCompare(uuid, event) {
  event.stopPropagation();
  if (compareList.includes(uuid)) {
    compareList = compareList.filter(id => id !== uuid);
  } else {
    if (compareList.length >= 2) compareList.shift();
    compareList.push(uuid);
  }
  updateCompareBar();
  filterAndRender();
}

function updateCompareBar() {
  if (compareList.length > 0 && categorySelect.value === 'weapons') {
    compareFloatingBar.style.display = 'flex';
    compareCountText.textContent = `${compareList.length}/2 armas seleccionadas`;
    openCompareBtn.disabled = compareList.length !== 2;
  } else {
    compareFloatingBar.style.display = 'none';
  }
}

function openCompareModalView() {
  if (compareList.length !== 2) return;
  compareModal.style.display = 'flex';
}

// Buscador de Jugadores (Proxy)
function setCatalogControlsVisible(visible) {
  const display = visible ? '' : 'none';
  categorySelect.style.display = display;
  langSelect.style.display = display;
  searchInput.parentElement.style.display = display;
  favFilterBtn.style.display = display;
}

function renderPlayerSearchForm() {
  subFilterBar.innerHTML = `
    <div class="player-search-bar">
      <input type="text" id="playerGameName" placeholder="Nombre (ej. Mixwell)" />
      <input type="text" id="playerTagLine" placeholder="Tag (ej. 1234)" />
      <select id="playerRegion" class="styled-select">
        ${VALORANT_REGIONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
      </select>
      <button onclick="fetchPlayerData()">Buscar Estadísticas</button>
    </div>
  `;
}

async function fetchPlayerData() {
  const nameInput = document.getElementById('playerGameName');
  const tagInput = document.getElementById('playerTagLine');
  const regionSelect = document.getElementById('playerRegion');
  if (!nameInput || !tagInput) return;

  const name = nameInput.value.trim();
  const tag = tagInput.value.trim().replace('#', '');
  const region = regionSelect ? regionSelect.value : 'eu';

  if (!name || !tag) {
    alert('Ingresa nombre y tag válidos.');
    return;
  }

  contentGrid.innerHTML = `<div class="player-empty-state"><p>Buscando datos de <strong>${name}#${tag}</strong>...</p></div>`;

  try {
    const accountRes = await fetch(`${PROXY_BASE}?type=account&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
    const accountData = await accountRes.json();
    if (!accountRes.ok || !accountData.data) throw new Error('Jugador no encontrado');
    
    contentGrid.innerHTML = `<div class="player-empty-state"><p>¡Jugador encontrado con éxito!</p></div>`;
  } catch (err) {
    contentGrid.innerHTML = `<div class="player-error-state"><p>Error: ${err.message}</p></div>`;
  }
}