const API_BASE = 'https://valorant-api.com/v1';

// ---- Buscador de jugadores (HenrikDev API) ----
const HENRIK_API_KEY = 'HDEV-4e173a2c-d356-4427-b3da-9d3b84fcf466';
const HENRIK_BASE = 'https://api.henrikdev.xyz/valorant';
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

// CORRECCIÓN CRÍTICA: Pausar y cortar audios/vídeos al cerrar modales
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

  closeModal.addEventListener('click', shutdownModalContent);
  closeCompareModal.addEventListener('click', shutdownCompareModal);
  
  window.addEventListener('click', (e) => {
    if (e.target === detailModal) shutdownModalContent();
    if (e.target === compareModal) shutdownCompareModal();
  });

  openCompareBtn.addEventListener('click', openCompareModalView);
  clearCompareBtn.addEventListener('click', () => {
    compareList = [];
    updateCompareBar();
    filterAndRender();
  });
});

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
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
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

// ============ BUSCADOR DE JUGADORES (HENRIKDEV API) ============

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
      <input type="text" id="playerTagLine" placeholder="Tag (ej. 1234 o ESP)" />
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
    alert('Por favor, ingresa un nombre de usuario y un tag válidos.');
    return;
  }

  contentGrid.innerHTML = `<div class="player-empty-state"><p>Buscando datos avanzados de <strong>${name}#${tag}</strong>...</p></div>`;

  const requestHeaders = {
    'Authorization': HENRIK_API_KEY,
    'Accept': 'application/json'
  };

  try {
    const accountUrl = `${HENRIK_BASE}/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const accountRes = await fetch(accountUrl, { headers: requestHeaders });
    const accountData = await accountRes.json();

    if (!accountRes.ok || !accountData.data) {
      throw new Error(accountData.errors?.[0]?.message || 'Jugador no encontrado o perfil privado');
    }

    const player = accountData.data;

    const mmrPromise = fetch(`${HENRIK_BASE}/v2/by-puuid/mmr/${region}/${player.puuid}`, { headers: requestHeaders })
      .then(r => r.json()).catch(() => null);

    const matchesPromise = fetch(`${HENRIK_BASE}/v3/by-puuid/matches/${region}/${player.puuid}?size=5`, { headers: requestHeaders })
      .then(r => r.json()).catch(() => null);

    const [mmrData, matchesData] = await Promise.all([mmrPromise, matchesPromise]);

    let rankName = 'Sin Rango';
    let rankImg = '';
    let rr = 0;
    let elo = 'N/A';
    let highestRank = 'N/A';

    if (mmrData && mmrData.data) {
      const cur = mmrData.data.current_data || mmrData.data;
      rankName = cur.currenttierpatched || mmrData.data.currenttierpatched || 'Sin Rango';
      rankImg = cur.images?.large || cur.images?.small || mmrData.data.images?.large || '';
      rr = cur.ranking_in_tier ?? mmrData.data.ranking_in_tier ?? 0;
      elo = cur.elo ?? mmrData.data.elo ?? 'N/A';
      if (mmrData.data.highest_rank) {
        highestRank = mmrData.data.highest_rank.patched_tier || 'N/A';
      }
    }

    let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
    let playedMatches = 0;
    const agentCounts = {};
    let matchesListHtml = '';

    if (matchesData && matchesData.data && matchesData.data.length > 0) {
      playedMatches = matchesData.data.length;

      matchesListHtml = matchesData.data.map(m => {
        const playerStats = m.players?.all_players?.find(p => p.puuid === player.puuid);
        const team = playerStats?.team?.toLowerCase();
        const won = m.teams?.[team]?.has_won;
        const mode = m.metadata?.mode || 'Normal';
        const map = m.metadata?.map || 'Mapa';

        if (playerStats) {
          const stats = playerStats.stats || {};
          totalKills += stats.kills || 0;
          totalDeaths += stats.deaths || 0;
          totalAssists += stats.assists || 0;

          const agent = playerStats.character || 'Desconocido';
          agentCounts[agent] = (agentCounts[agent] || 0) + 1;
        }

        if (won) wins++;

        const resultText = won ? 'Victoria' : 'Derrota';
        const resultColor = won ? '#2ecc71' : '#ff4655';
        const kdaString = playerStats ? `${playerStats.stats?.kills || 0}/${playerStats.stats?.deaths || 0}/${playerStats.stats?.assists || 0}` : '-';

        return `
          <div class="match-item">
            <div>
              <strong>${mode}</strong> <span style="color: #aaa; font-size: 11px;">(${map})</span>
              <div style="font-size: 11px; color: #888;">Agente: ${playerStats?.character || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <span style="color: ${resultColor}; font-weight: bold; font-size: 13px;">${resultText}</span>
              <div style="font-size: 12px; font-weight: 500; color: #ddd;">${kdaString}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills;
    const winrate = playedMatches > 0 ? Math.round((wins / playedMatches) * 100) : 0;
    const mostPlayedAgent = Object.keys(agentCounts).length > 0 
      ? Object.keys(agentCounts).reduce((a, b) => agentCounts[a] > agentCounts[b] ? a : b) 
      : 'N/A';

    const largeCardArt = player.card?.large || player.card?.wide || player.card?.small || 'https://via.placeholder.com/200x400';
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.name)}%23${encodeURIComponent(player.tag)}/overview`;

    contentGrid.innerHTML = `
      <div class="player-dashboard">
        <div class="player-card-sidebar">
          <img class="player-card-full" src="${largeCardArt}" alt="Player Card" />
          <div class="player-card-info">
            <h3>${player.name}</h3>
            <span class="player-tag">#${player.tag}</span>
            <div class="player-badge">Nivel ${player.account_level || 'N/A'}</div>
          </div>
        </div>

        <div class="player-stats-content">
          <div class="rank-grid">
            <div class="rank-box">
              <h4>RANGO ACTUAL</h4>
              ${rankImg ? `<img src="${rankImg}" style="width:40px; height:40px; margin: 4px auto; display:block;" alt="${rankName}" />` : ''}
              <p style="font-size:12px; font-weight:bold;">${rankName}</p>
            </div>
            <div class="rank-box">
              <h4>PUNTOS (RR)</h4>
              <p style="font-size:18px; font-weight:bold; color: #ff4655; margin-top:8px;">${rr} <span style="font-size: 12px; color: #888;">/ 100</span></p>
            </div>
            <div class="rank-box">
              <h4>MMR / ELO</h4>
              <p style="font-size:18px; font-weight:bold; margin-top:8px;">${elo}</p>
            </div>
            <div class="rank-box">
              <h4>MÁXIMO HISTÓRICO</h4>
              <p style="font-size:13px; font-weight:bold; color:#ffd700; margin-top:10px;">${highestRank}</p>
            </div>
          </div>

          ${playedMatches > 0 ? `
            <div class="metrics-grid">
              <div class="metric-card">
                <span>Ratio K/D</span>
                <strong>${kdRatio}</strong>
              </div>
              <div class="metric-card">
                <span>% Victorias</span>
                <strong>${winrate}%</strong>
              </div>
              <div class="metric-card">
                <span>Agente Top</span>
                <strong style="font-size: 14px; color: #ff4655;">${mostPlayedAgent}</strong>
              </div>
            </div>
          ` : ''}

          ${matchesListHtml ? `
            <div class="matches-container">
              <h4>Historial Reciente</h4>
              <div class="matches-list">
                ${matchesListHtml}
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 15px; text-align: right;">
            <a class="external-tracker-link" href="${trackerUrl}" target="_blank" rel="noopener noreferrer">Perfil Completo en Tracker.gg ↗</a>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(name)}%23${encodeURIComponent(tag)}/overview`;
    contentGrid.innerHTML = `
      <div class="player-error-state">
        <p><strong>Error:</strong> ${err.message || 'No se pudieron obtener las estadísticas.'}</p>
        <a class="external-tracker-link" href="${trackerUrl}" target="_blank" rel="noopener noreferrer" style="margin-top:10px; display:inline-block;">Ver en Tracker.gg ↗</a>
      </div>
    `;
  }
}
