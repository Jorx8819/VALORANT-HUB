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
let viewMode = 'catalog'; // 'catalog' | 'player' | 'profile'
let isLoggedIn = false;
let loggedUserEmail = '';

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
  switchAuthTab('profile');

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

  openAuthModalBtn.addEventListener('click', () => {
    switchAuthTab('profile');
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

function returnToCatalog() {
  viewMode = 'catalog';
  playerSearchToggleBtn.classList.remove('active');
  setCatalogControlsVisible(true);
  loadCategoryData();
}

// ============ GESTIÓN DE PERFIL Y AUTENTICACIÓN ============
function switchAuthTab(tab, event) {
  if (event) event.preventDefault();
  const container = document.getElementById('authFormContainer');
  const subtitle = document.getElementById('authSubtitle');
  
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelectorAll('.auth-tab-btn')[tab === 'profile' ? 0 : tab === 'login' ? 1 : 2];
  if (activeBtn) activeBtn.classList.add('active');

  if (tab === 'profile') {
    subtitle.textContent = 'Panel de cuenta y elementos guardados';
    container.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; gap: 15px;">
        <div style="background: #0f1923; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
          <p style="font-size: 13px; color: #888;">Estado de la Sesión</p>
          <strong style="font-size: 15px; color: ${isLoggedIn ? '#2ecc71' : 'var(--accent-red)'};">
            ${isLoggedIn ? `Conectado como (${loggedUserEmail})` : 'Modo Invitado / Local'}
          </strong>
        </div>
        
        <div style="background: #0f1923; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="margin-bottom: 8px; color: #fff;">Mis Favoritos Seleccionados</h4>
          <p style="font-size: 22px; font-weight: bold; color: var(--accent-red);">${favorites.length} <span style="font-size: 12px; color: #aaa;">elementos en total</span></p>
          <button onclick="openFavoritesDashboard()" class="role-btn active" style="margin-top: 12px; width: 100%; padding: 8px;">Ver Mis Favoritos en Pantalla</button>
        </div>

        ${isLoggedIn ? `
          <button onclick="handleLogout()" class="level-btn" style="background: var(--accent-red); color: #fff; width: 100%;">Cerrar Sesión</button>
        ` : ''}
      </div>
    `;
  } else if (tab === 'login') {
    subtitle.textContent = 'Introduce tus credenciales de acceso';
    container.innerHTML = `
      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="email" id="loginEmail" placeholder="Correo electrónico" required class="styled-input" />
        <input type="password" id="loginPassword" placeholder="Contraseña" required class="styled-input" />
        <button type="submit" class="role-btn active" style="margin-top: 10px; width: 100%; padding: 10px;">Iniciar Sesión</button>
      </form>
    `;
  } else if (tab === 'register') {
    subtitle.textContent = 'Crea tu cuenta de acceso';
    container.innerHTML = `
      <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="regUsername" placeholder="Nombre de usuario" required class="styled-input" />
        <input type="email" id="regEmail" placeholder="Correo electrónico" required class="styled-input" />
        <input type="password" id="regPassword" placeholder="Contraseña" required class="styled-input" />
        <button type="submit" class="role-btn active" style="margin-top: 10px; width: 100%; padding: 10px;">Crear Cuenta</button>
      </form>
    `;
  }
}

function openFavoritesDashboard() {
  authModal.style.display = 'none';
  viewMode = 'catalog';
  setCatalogControlsVisible(true);
  subFilterBar.innerHTML = `<div style="padding: 8px; font-size: 13px; color: var(--accent-red); font-weight: bold;">Mostrando Todos tus Elementos Favoritos (${favorites.length})</div>`;
  
  // Buscar en todas las categorías cargadas o filtrar las actuales con los favs
  showingFavsOnly = true;
  favFilterBtn.classList.add('active');
  filterAndRender();
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const username = document.getElementById('regUsername').value;
  isLoggedIn = true;
  loggedUserEmail = email;
  document.getElementById('authButtonText').textContent = username;
  alert(`¡Cuenta creada y sesión iniciada correctamente, ${username}!`);
  authModal.style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  isLoggedIn = true;
  loggedUserEmail = email;
  document.getElementById('authButtonText').textContent = email.split('@')[0];
  alert('¡Bienvenido de nuevo, Agente!');
  authModal.style.display = 'none';
}

function handleLogout() {
  isLoggedIn = false;
  loggedUserEmail = '';
  document.getElementById('authButtonText').textContent = 'Mi Cuenta';
  switchAuthTab('profile');
  alert('Sesión cerrada correctamente.');
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

// Detalle Modal Completo Restaurado
function openDetailModal(uuid) {
  const item = currentData.find(i => i.uuid === uuid);
  if (!item) return;

  const category = categorySelect.value;
  modalBody.innerHTML = '';

  switch (category) {
    case 'agents':
      renderAgentDetail(item);
      break;
    case 'weapons':
      renderWeaponDetail(item);
      break;
    case 'maps':
      renderMapDetail(item);
      break;
    case 'playercards':
      renderPlayerCardDetail(item);
      break;
    case 'sprays':
      renderSprayDetail(item);
      break;
    case 'buddies':
      renderBuddyDetail(item);
      break;
    default:
      renderGenericDetail(item);
      break;
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

      ${map.displayIcon ? `
        <h3>Esquema Táctico del Mapa</h3>
        <div style="position: relative; display: inline-block; margin-top: 10px; max-width: 100%; width: 100%; background: #0f1923; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <img src="${map.displayIcon}" alt="Esquema ${map.displayName}" style="width: 100%; height: auto; display: block;" />
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            ${callouts.map(callout => {
              if (!callout.location) return '';
              const left = callout.location.x * 100;
              const top = callout.location.y * 100;
              const text = callout.regionName.toUpperCase();

              return `
                <div style="
                  position: absolute;
                  left: ${left}%;
                  top: ${top}%;
                  transform: translate(-50%, -50%);
                  background: rgba(15, 25, 35, 0.9);
                  border: 1px solid #ff4655;
                  color: #ffffff;
                  font-size: 9px;
                  font-weight: bold;
                  padding: 2px 5px;
                  border-radius: 3px;
                  white-space: nowrap;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                ">
                  ${text}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : '<p>Esquema no disponible</p>'}
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
    
    <h3>Habilidades</h3>
    <div class="abilities-grid">
      ${(agent.abilities || []).map(ability => `
        <div class="ability-card" onclick="playAbilityVideo('${ability.video || ''}', '${ability.displayName}')" style="cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            ${ability.displayIcon ? `<img src="${ability.displayIcon}" style="width: 24px; height: 24px;">` : ''}
            <strong>${ability.displayName}</strong>
            ${ability.video ? '<span style="font-size: 10px; background: var(--accent-red); padding: 2px 6px; border-radius: 4px; margin-left: auto;">VÍDEO ▶</span>' : ''}
          </div>
          <p style="font-size: 12px; color: #aaa;">${ability.description || ''}</p>
        </div>
      `).join('')}
    </div>
    <div id="agentVideoPreview" style="margin-top: 15px;"></div>
  `;
}

function playAbilityVideo(url, name) {
  const container = document.getElementById('agentVideoPreview');
  if (!container) return;

  if (!url) {
    container.innerHTML = '<p style="color: #888; text-align: center; font-size: 12px;">No hay vídeo de demostración disponible.</p>';
    return;
  }

  container.innerHTML = `
    <h4 style="margin-bottom: 8px;">Demostración: ${name}</h4>
    <video src="${url}" controls autoplay loop style="width: 100%; border-radius: 6px; border: 1px solid var(--border-color);"></video>
  `;
}

function renderPlayerCardDetail(card) {
  const videoUrl = card.animationMp4;

  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${card.displayName}</h2>
      <div class="skin-media-preview" style="margin-top: 15px;">
        ${videoUrl ? `
          <video src="${videoUrl}" controls autoplay loop style="max-width: 100%; max-height: 350px; border-radius: 6px;"></video>
        ` : `
          <img src="${card.largeArt || card.wideArt || card.displayIcon}" style="max-width: 100%; max-height: 350px; object-fit: contain;">
        `}
      </div>
      ${card.wideArt ? `
        <h4 style="margin-top: 15px;">Banner Horizontal</h4>
        <img src="${card.wideArt}" style="width: 100%; border-radius: 6px; margin-top: 5px;">
      ` : ''}
    </div>
  `;
}

function renderSprayDetail(spray) {
  const animatedSrc = spray.animationPng || spray.animationGif || spray.fullTransparentIcon || spray.displayIcon;

  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${spray.displayName}</h2>
      <div class="skin-media-preview" style="margin-top: 15px;">
        <img src="${animatedSrc}" style="max-width: 250px; max-height: 250px; object-fit: contain;">
      </div>
    </div>
  `;
}

function renderBuddyDetail(buddy) {
  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${buddy.displayName}</h2>
      <div class="skin-media-preview" id="buddyMediaPreview" style="margin-top: 15px;">
        <img src="${buddy.displayIcon}" style="max-width: 200px; max-height: 200px; object-fit: contain;">
      </div>
      ${buddy.levels && buddy.levels.length > 1 ? `
        <h4 style="margin-top: 15px;">Niveles del Llavero</h4>
        <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
          ${buddy.levels.map((level, i) => `
            <button class="level-btn" onclick="updateBuddyMedia('${level.displayIcon}')">
              ${level.displayName || `Nivel ${i + 1}`}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function updateBuddyMedia(url) {
  const container = document.getElementById('buddyMediaPreview');
  if (container) {
    container.innerHTML = `<img src="${url}" style="max-width: 200px; max-height: 200px; object-fit: contain;">`;
  }
}

function renderWeaponDetail(weapon) {
  const stats = weapon.weaponStats;
  
  modalBody.innerHTML = `
    <div class="modal-header">
      <img src="${weapon.displayIcon}" alt="${weapon.displayName}" style="width: 120px; height: auto;">
      <div>
        <h2>${weapon.displayName}</h2>
        <p style="color: #888;">${weapon.shopData ? weapon.shopData.categoryText : ''} - ¤${weapon.shopData ? weapon.shopData.cost : '0'}</p>
      </div>
    </div>

    ${stats ? `
      <div class="weapon-stats-box">
        <div class="stat-item"><h4>Cargador</h4><p>${stats.magazineSize}</p></div>
        <div class="stat-item"><h4>Cadencia</h4><p>${stats.fireRate}/s</p></div>
        <div class="stat-item"><h4>Recarga</h4><p>${stats.reloadTimeSeconds}s</p></div>
        <div class="stat-item"><h4>Velocidad Equipar</h4><p>${stats.equipTimeSeconds}s</p></div>
      </div>
    ` : ''}

    <h3 style="margin-top: 20px;">Skins Disponibles</h3>
    <div class="skins-grid">
      ${(weapon.skins || []).map(skin => {
        const icon = skin.displayIcon || skin.chromas?.[0]?.fullRender;
        if (!icon) return '';
        return `
          <div class="skin-card" onclick="viewSkinDetail('${weapon.uuid}', '${skin.uuid}')">
            <img src="${icon}" alt="${skin.displayName}">
            <p style="font-size: 11px; margin-top: 5px;">${skin.displayName}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function viewSkinDetail(weaponUuid, skinUuid) {
  const weapon = currentData.find(w => w.uuid === weaponUuid);
  if (!weapon) return;

  const skin = weapon.skins.find(s => s.uuid === skinUuid);
  if (!skin) return;

  const defaultMedia = skin.levels?.find(l => l.streamedVideo)?.streamedVideo || skin.chromas?.[0]?.fullRender || skin.displayIcon;

  modalBody.innerHTML = `
    <button class="level-btn" onclick="openDetailModal('${weaponUuid}')" style="margin-bottom: 15px;">← Volver a Skins</button>
    <h2>${skin.displayName}</h2>
    <div class="skin-detail-container" style="margin-top: 15px;">
      <div class="skin-media-preview" id="skinMediaPreview">
        ${renderMediaTag(defaultMedia)}
      </div>

      ${skin.chromas && skin.chromas.length > 1 ? `
        <h4>Variantes / Chromas</h4>
        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
          ${skin.chromas.map(chroma => `
            <button class="swatch-btn" onclick="updateSkinMedia('${chroma.streamedVideo || chroma.fullRender || chroma.displayIcon}')">
              <img src="${chroma.swatch || chroma.displayIcon}" alt="${chroma.displayName}">
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${skin.levels && skin.levels.length > 1 ? `
        <h4>Niveles y Animaciones</h4>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${skin.levels.map((level, i) => `
            <button class="level-btn" onclick="updateSkinMedia('${level.streamedVideo || skin.chromas[0].fullRender}')">
              Nivel ${i + 1}: ${level.displayName || ''}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderMediaTag(url) {
  if (!url) return '<p>Sin vista previa disponible.</p>';
  if (url.endsWith('.mp4')) {
    return `<video src="${url}" controls autoplay loop style="width: 100%; max-height: 280px; border-radius: 6px;"></video>`;
  }
  return `<img src="${url}" style="max-width: 100%; max-height: 280px; object-fit: contain;">`;
}

function updateSkinMedia(url) {
  const container = document.getElementById('skinMediaPreview');
  if (container) {
    container.innerHTML = renderMediaTag(url);
  }
}

function renderGenericDetail(item) {
  const img = item.largeArt || item.splash || item.displayIcon;
  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${item.displayName}</h2>
      <img src="${img}" style="max-width: 100%; max-height: 350px; border-radius: 8px; margin-top: 15px; object-fit: contain;">
    </div>
  `;
}

// Subfiltros de Categoría
function renderSubFilters(category) {
  if (category !== 'agents') return;

  const uniqueRoles = ['Todos', ...new Set(currentData.map(a => a.role ? a.role.displayName : '').filter(Boolean))];

  subFilterBar.innerHTML = uniqueRoles.map(role => `
    <button class="role-btn ${role === 'Todos' ? 'active' : ''}" onclick="filterByRole('${role}', this)">
      ${role}
    </button>
  `).join('');
}

function filterByRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (role === 'Todos') {
    filterAndRender();
    return;
  }

  const query = searchInput.value.toLowerCase().trim();
  const filtered = currentData.filter(item => {
    const matchesRole = item.role && item.role.displayName === role;
    const matchesSearch = item.displayName.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

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

  const w1 = currentData.find(w => w.uuid === compareList[0]);
  const w2 = currentData.find(w => w.uuid === compareList[1]);

  if (!w1 || !w2) return;

  compareModalBody.innerHTML = `
    <h2>Comparación de Armas</h2>
    <div class="compare-grid" style="margin-top: 15px;">
      ${renderCompareColumn(w1)}
      ${renderCompareColumn(w2)}
    </div>
  `;

  compareModal.style.display = 'flex';
}

function renderCompareColumn(weapon) {
  const stats = weapon.weaponStats;
  return `
    <div class="compare-column">
      <h3>${weapon.displayName}</h3>
      <img src="${weapon.displayIcon}" alt="${weapon.displayName}" style="margin: 10px 0;">
      <p style="color: var(--accent-red);">¤${weapon.shopData ? weapon.shopData.cost : 'N/A'}</p>

      ${stats ? `
        <div class="weapon-stats-box">
          <div class="stat-item"><h4>Cargador</h4><p>${stats.magazineSize}</p></div>
          <div class="stat-item"><h4>Cadencia</h4><p>${stats.fireRate}/s</p></div>
          <div class="stat-item"><h4>Recarga</h4><p>${stats.reloadTimeSeconds}s</p></div>
          <div class="stat-item"><h4>Primer Disparo</h4><p>${stats.firstBulletAccuracy}</p></div>
        </div>

        <h4 style="margin-top: 15px;">Tabla de Daño</h4>
        <table class="damage-table">
          <thead>
            <tr><th>Rango</th><th>Cabeza</th><th>Cuerpo</th><th>Piernas</th></tr>
          </thead>
          <tbody>
            ${(stats.damageRanges || []).map(r => `
              <tr>
                <td>${r.rangeStartMeters}-${r.rangeEndMeters}m</td>
                <td>${Math.round(r.headDamage)}</td>
                <td>${Math.round(r.bodyDamage)}</td>
                <td>${Math.round(r.legDamage)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="margin-top: 15px;">Sin estadísticas disponibles.</p>'}
    </div>
  `;
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