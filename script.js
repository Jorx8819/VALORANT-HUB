const API_BASE = 'https://valorant-api.com/v1';

const PROXY_BASE = '/api/player';
const VALORANT_REGIONS = [
  { value: 'eu', label: 'Europa' },
  { value: 'na', label: 'Norteamérica' },
  { value: 'latam', label: 'Latinoamérica' },
  { value: 'br', label: 'Brasil' },
  { value: 'ap', label: 'Asia-Pacífico' },
  { value: 'kr', label: 'Corea' },
];

let currentData = [];
let favorites = JSON.parse(localStorage.getItem('valorant_favs')) || [];
let compareList = [];
let showingFavsOnly = false;
let showingGlobalFavorites = false;
let viewMode = 'catalog'; 
let isLoggedIn = false;
let loggedUserEmail = '';

const categorySelect = document.getElementById('categorySelect');
const langSelect = document.getElementById('langSelect');
const searchInput = document.getElementById('searchInput');
const favFilterBtn = document.getElementById('favFilterBtn');
const playerSearchToggleBtn = document.getElementById('playerSearchToggleBtn');
const subFilterBar = document.getElementById('subFilterBar');
const contentGrid = document.getElementById('contentGrid');

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

const authModal = document.getElementById('authModal');
const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const closeAuthModal = document.getElementById('closeAuthModal');

function stopAllMedia(container) {
  if (!container) return;
  container.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; v.src = ''; });
  container.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; a.src = ''; });
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

document.addEventListener('DOMContentLoaded', () => {
  loadCategoryData();
  switchAuthTab('profile');

  categorySelect.addEventListener('change', () => {
    showingGlobalFavorites = false;
    compareList = [];
    updateCompareBar();
    loadCategoryData();
  });
  
  langSelect.addEventListener('change', loadCategoryData);
  searchInput.addEventListener('input', filterAndRender);
  
  favFilterBtn.addEventListener('click', () => {
    showingGlobalFavorites = false;
    showingFavsOnly = !showingFavsOnly;
    favFilterBtn.classList.toggle('active', showingFavsOnly);
    filterAndRender();
  });

  playerSearchToggleBtn.addEventListener('click', () => {
    showingGlobalFavorites = false;
    viewMode = viewMode === 'catalog' ? 'player' : 'catalog';
    playerSearchToggleBtn.classList.toggle('active', viewMode === 'player');
    setCatalogControlsVisible(viewMode === 'catalog');
    compareFloatingBar.style.display = 'none';

    if (viewMode === 'player') {
      renderPlayerSearchForm();
      contentGrid.innerHTML = '<div class="player-empty-state"><p>Introduce el nombre y etiqueta para buscar estadísticas.</p></div>';
    } else {
      subFilterBar.innerHTML = '';
      loadCategoryData();
    }
  });

  openAuthModalBtn.addEventListener('click', () => {
    switchAuthTab('profile');
    authModal.style.display = 'flex';
  });

  closeAuthModal.addEventListener('click', () => { authModal.style.display = 'none'; });
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
  showingGlobalFavorites = false;
  viewMode = 'catalog';
  playerSearchToggleBtn.classList.remove('active');
  setCatalogControlsVisible(true);
  loadCategoryData();
}

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
        <div style="background: #111e2e; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
          <p style="font-size: 13px; color: #888;">Estado de la Sesión</p>
          <strong style="font-size: 15px; color: ${isLoggedIn ? '#2ecc71' : 'var(--accent-red)'};">
            ${isLoggedIn ? `Conectado (${loggedUserEmail})` : 'Modo Invitado / Local'}
          </strong>
        </div>
        
        <div style="background: #111e2e; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="margin-bottom: 8px; color: #fff;">Favoritos Totales en la App</h4>
          <p style="font-size: 22px; font-weight: bold; color: var(--accent-red);">${favorites.length} <span style="font-size: 12px; color: #aaa;">registrados</span></p>
          <button onclick="openGlobalFavoritesDashboard()" class="role-btn active" style="margin-top: 12px; width: 100%; padding: 10px;">Ver Todos Mis Favoritos</button>
        </div>

        ${isLoggedIn ? `
          <button onclick="handleLogout()" class="level-btn" style="background: var(--accent-red); color: #fff; width: 100%; padding: 8px;">Cerrar Sesión</button>
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

async function openGlobalFavoritesDashboard() {
  authModal.style.display = 'none';
  showingGlobalFavorites = true;
  subFilterBar.innerHTML = `<div style="padding: 8px; font-size: 13px; color: var(--accent-red); font-weight: bold;">Mostrando tus ${favorites.length} favoritos globales de todas las categorías</div>`;
  contentGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(6);

  const categories = ['agents', 'weapons', 'playercards', 'maps', 'sprays', 'buddies'];
  const lang = langSelect.value;
  let allFavItems = [];

  try {
    const promises = categories.map(cat => 
      fetch(`${API_BASE}/${cat}?language=${lang}`).then(res => res.json()).catch(() => ({ data: [] }))
    );
    const results = await Promise.all(promises);

    results.forEach((res, index) => {
      const catName = categories[index];
      if (res && res.data) {
        const matches = res.data.filter(item => favorites.includes(item.uuid));
        // Etiquetamos la categoría de origen para que el renderizado de tarjetas sepa tratarla bien
        matches.forEach(item => { item._inferredCategory = catName; });
        allFavItems.push(...matches);
      }
    });

    currentData = allFavItems;
    renderCards(currentData, 'global');
  } catch (err) {
    console.error('Error cargando favoritos globales:', err);
    contentGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Error al recuperar los favoritos globales.</p>';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const username = document.getElementById('regUsername').value;
  isLoggedIn = true;
  loggedUserEmail = email;
  document.getElementById('authButtonText').textContent = username;
  alert(`¡Cuenta creada con éxito, ${username}!`);
  authModal.style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  isLoggedIn = true;
  loggedUserEmail = email;
  document.getElementById('authButtonText').textContent = email.split('@')[0];
  alert('¡Bienvenido de nuevo!');
  authModal.style.display = 'none';
}

function handleLogout() {
  isLoggedIn = false;
  loggedUserEmail = '';
  document.getElementById('authButtonText').textContent = 'Mi Cuenta';
  switchAuthTab('profile');
  alert('Sesión cerrada.');
}

async function loadCategoryData() {
  if (showingGlobalFavorites) return;
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
    currentData.forEach(item => { item._inferredCategory = category; });

    renderSubFilters(category);
    filterAndRender();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    contentGrid.innerHTML = '<p>Error al cargar el contenido.</p>';
  }
}

function filterAndRender() {
  if (showingGlobalFavorites) return;
  const query = searchInput.value.toLowerCase().trim();

  const filtered = currentData.filter(item => {
    const nameMatches = item.displayName ? item.displayName.toLowerCase().includes(query) : false;
    const favMatches = showingFavsOnly ? favorites.includes(item.uuid) : true;
    return nameMatches && favMatches;
  });

  renderCards(filtered, categorySelect.value);
}

function renderCards(data, category) {
  contentGrid.innerHTML = '';

  if (data.length === 0) {
    contentGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No se encontraron elementos favoritos o coincidentes.</p>';
    return;
  }

  data.forEach(item => {
    let primaryImg = item.displayIcon || '';
    let hoverImg = item.displayIcon || '';
    let subtitle = '';
    const activeCategory = item._inferredCategory || category;

    if (activeCategory === 'agents') {
      primaryImg = item.displayIcon;
      hoverImg = item.fullPortrait || item.fullPortraitV2 || item.displayIcon;
      subtitle = item.role ? item.role.displayName : 'Agente';
    } else if (activeCategory === 'weapons') {
      primaryImg = item.displayIcon;
      hoverImg = item.skins?.[0]?.chromas?.[0]?.fullRender || item.displayIcon;
      subtitle = item.shopData?.categoryText || 'Arma';
    } else if (activeCategory === 'playercards') {
      primaryImg = item.displayIcon || item.smallArt;
      hoverImg = item.largeArt || item.wideArt;
      subtitle = 'Tarjeta de Jugador';
    } else if (activeCategory === 'maps') {
      primaryImg = item.listViewIcon || item.splash;
      hoverImg = item.displayIcon || item.splash;
      subtitle = item.coordinates || 'Mapa';
    } else if (activeCategory === 'sprays') {
      primaryImg = item.displayIcon;
      hoverImg = item.animationPng || item.animationGif || item.fullTransparentIcon || item.displayIcon;
      subtitle = 'Graffiti';
    } else if (activeCategory === 'buddies') {
      primaryImg = item.displayIcon;
      hoverImg = item.levels?.[0]?.displayIcon || item.displayIcon;
      subtitle = 'Llavero';
    } else {
      // Fallback genérico inteligente por si viene de favoritos globales sin tipar
      if (item.role) {
        subtitle = item.role.displayName || 'Agente';
        hoverImg = item.fullPortrait || item.displayIcon;
      } else if (item.weaponStats) {
        subtitle = 'Arma';
        hoverImg = item.skins?.[0]?.displayIcon || item.displayIcon;
      } else if (item.levels) {
        subtitle = 'Llavero';
      } else {
        subtitle = 'Elemento';
      }
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
          ${activeCategory === 'weapons' ? `
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

function openDetailModal(uuid) {
  const item = currentData.find(i => i.uuid === uuid);
  if (!item) return;

  const activeCategory = item._inferredCategory || categorySelect.value;
  modalBody.innerHTML = '';

  if (activeCategory === 'agents') renderAgentDetail(item);
  else if (activeCategory === 'weapons') renderWeaponDetail(item);
  else if (activeCategory === 'maps') renderMapDetail(item);
  else if (activeCategory === 'playercards') renderPlayerCardDetail(item);
  else if (activeCategory === 'sprays') renderSprayDetail(item);
  else if (activeCategory === 'buddies') renderBuddyDetail(item);
  else {
    if (item.role) renderAgentDetail(item);
    else if (item.weaponStats) renderWeaponDetail(item);
    else if (item.coordinates) renderMapDetail(item);
    else renderGenericDetail(item);
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
        <div style="position: relative; display: inline-block; margin-top: 10px; width: 100%; background: #0f1923; border-radius: 8px; overflow: hidden;">
          <img src="${map.displayIcon}" style="width: 100%; display: block;" />
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            ${callouts.map(c => {
              if (!c.location) return '';
              return `<div style="position: absolute; left: ${c.location.x * 100}%; top: ${c.location.y * 100}%; transform: translate(-50%, -50%); background: rgba(15, 25, 35, 0.9); border: 1px solid #ff4655; color: #fff; font-size: 9px; padding: 2px 5px; border-radius: 3px;">${c.regionName.toUpperCase()}</div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
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
      ${(agent.abilities || []).map(a => `
        <div class="ability-card" onclick="playAbilityVideo('${a.video || ''}', '${a.displayName}')" style="cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            ${a.displayIcon ? `<img src="${a.displayIcon}" style="width: 24px; height: 24px;">` : ''}
            <strong>${a.displayName}</strong>
          </div>
          <p style="font-size: 12px; color: #aaa;">${a.description || ''}</p>
        </div>
      `).join('')}
    </div>
    <div id="agentVideoPreview" style="margin-top: 15px;"></div>
  `;
}

function playAbilityVideo(url, name) {
  const container = document.getElementById('agentVideoPreview');
  if (!container) return;
  if (!url) { container.innerHTML = '<p style="color: #888; text-align: center; font-size: 12px;">Sin vídeo de demostración.</p>'; return; }
  container.innerHTML = `<h4 style="margin-bottom: 8px;">Demostración: ${name}</h4><video src="${url}" controls autoplay loop style="width: 100%; border-radius: 6px;"></video>`;
}

function renderPlayerCardDetail(card) {
  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h2>${card.displayName}</h2>
      <div class="skin-media-preview" style="margin-top: 15px;">
        ${card.animationMp4 ? `<video src="${card.animationMp4}" controls autoplay loop style="max-width: 100%; max-height: 350px;"></video>` : `<img src="${card.largeArt || card.displayIcon}" style="max-width: 100%; max-height: 350px; object-fit: contain;">`}
      </div>
    </div>
  `;
}

function renderSprayDetail(spray) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${spray.displayName}</h2><div class="skin-media-preview" style="margin-top: 15px;"><img src="${spray.animationPng || spray.displayIcon}" style="max-width: 250px; object-fit: contain;"></div></div>`;
}

function renderBuddyDetail(buddy) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${buddy.displayName}</h2><div class="skin-media-preview" style="margin-top: 15px;"><img src="${buddy.displayIcon}" style="max-width: 200px; object-fit: contain;"></div></div>`;
}

function renderWeaponDetail(weapon) {
  const stats = weapon.weaponStats;
  modalBody.innerHTML = `
    <div class="modal-header">
      <img src="${weapon.displayIcon}" alt="${weapon.displayName}" style="width: 120px; height: auto;">
      <div>
        <h2>${weapon.displayName}</h2>
        <p style="color: #888;">${weapon.shopData ? weapon.shopData.categoryText : ''}</p>
      </div>
    </div>
    ${stats ? `<div class="weapon-stats-box" style="display:flex; gap:15px; margin: 15px 0;"><div class="stat-item"><h4>Cargador</h4><p>${stats.magazineSize}</p></div><div class="stat-item"><h4>Cadencia</h4><p>${stats.fireRate}/s</p></div><div class="stat-item"><h4>Recarga</h4><p>${stats.reloadTimeSeconds}s</p></div></div>` : ''}
    
    <div id="skinMediaPreviewContainer" class="skin-media-preview" style="margin: 15px 0; display: none;">
      <h4 id="selectedSkinTitle" style="margin-bottom: 8px;"></h4>
      <div id="skinPreviewContent"></div>
    </div>

    <h3 style="margin-top: 20px;">Skins Disponibles</h3>
    <div class="skins-grid">
      ${(weapon.skins || []).map(skin => {
        const icon = skin.displayIcon || skin.chromas?.[0]?.fullRender;
        if (!icon) return '';
        // Buscamos nivel con vídeo o chroma con render
        const streamLevel = skin.levels?.find(l => l.streamedVideo) || skin.levels?.[0];
        const videoUrl = streamLevel ? streamLevel.streamedVideo : '';
        const renderImg = skin.chromas?.[0]?.fullRender || icon;
        return `
          <div class="skin-card" onclick="playSkinMedia('${encodeURIComponent(videoUrl || '')}', '${encodeURIComponent(renderImg)}', '${skin.displayName.replace(/'/g, "\\'")}')">
            <img src="${icon}" loading="lazy">
            <p style="font-size: 11px; margin-top: 5px;">${skin.displayName}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function playSkinMedia(encodedVideoUrl, encodedImgUrl, skinName) {
  const videoUrl = decodeURIComponent(encodedVideoUrl);
  const imgUrl = decodeURIComponent(encodedImgUrl);
  const container = document.getElementById('skinMediaPreviewContainer');
  const titleEl = document.getElementById('selectedSkinTitle');
  const contentEl = document.getElementById('skinPreviewContent');

  if (!container || !contentEl) return;
  container.style.display = 'block';
  titleEl.textContent = skinName;

  if (videoUrl && videoUrl !== 'null' && videoUrl !== 'undefined') {
    contentEl.innerHTML = `<video src="${videoUrl}" controls autoplay loop style="max-width: 100%; max-height: 250px; border-radius: 6px;"></video>`;
  } else {
    contentEl.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 220px; object-fit: contain; border-radius: 6px;" />`;
  }
}

function renderGenericDetail(item) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${item.displayName}</h2><img src="${item.displayIcon}" style="max-width: 100%; max-height: 350px; margin-top: 15px; object-fit: contain;"></div>`;
}

function renderSubFilters(category) {
  if (category !== 'agents') return;
  const uniqueRoles = ['Todos', ...new Set(currentData.map(a => a.role ? a.role.displayName : '').filter(Boolean))];
  subFilterBar.innerHTML = uniqueRoles.map(role => `<button class="role-btn ${role === 'Todos' ? 'active' : ''}" onclick="filterByRole('${role}', this)">${role}</button>`).join('');
}

function filterByRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (role === 'Todos') { filterAndRender(); return; }
  const query = searchInput.value.toLowerCase().trim();
  const filtered = currentData.filter(item => item.role && item.role.displayName === role && item.displayName.toLowerCase().includes(query));
  renderCards(filtered, categorySelect.value);
}

function toggleFavorite(uuid, event) {
  event.stopPropagation();
  if (favorites.includes(uuid)) {
    favorites = favorites.filter(id => id !== uuid);
  } else {
    favorites.push(uuid);
  }
  localStorage.setItem('valorant_favs', JSON.stringify(favorites));
  if (showingGlobalFavorites) {
    openGlobalFavoritesDashboard();
  } else {
    filterAndRender();
  }
}

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
  compareModalBody.innerHTML = `<h2>Comparación de Armas</h2><div class="compare-grid" style="display: flex; gap: 20px; justify-content: space-around; margin-top: 15px;">${renderCompareColumn(w1)}${renderCompareColumn(w2)}</div>`;
  compareModal.style.display = 'flex';
}

function renderCompareColumn(weapon) {
  const stats = weapon.weaponStats;
  return `
    <div class="compare-column" style="text-align: center; flex: 1; background: #111e2e; padding: 15px; border-radius: 8px;">
      <h3>${weapon.displayName}</h3>
      <img src="${weapon.displayIcon}" style="max-width: 150px; margin: 10px 0;">
      ${stats ? `<div class="weapon-stats-box"><div class="stat-item"><h4>Cargador</h4><p>${stats.magazineSize}</p></div><div class="stat-item"><h4>Cadencia</h4><p>${stats.fireRate}/s</p></div></div>` : ''}
    </div>
  `;
}

function setCatalogControlsVisible(visible) {
  const display = visible ? '' : 'none';
  categorySelect.style.display = display;
  langSelect.style.display = display;
  searchInput.parentElement.style.display = display;
  favFilterBtn.style.display = display;
}

function renderPlayerSearchForm() {
  subFilterBar.innerHTML = `
    <div class="player-search-bar" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center;">
      <input type="text" id="playerGameName" placeholder="Nombre (ej. Mixwell)" class="styled-input" />
      <input type="text" id="playerTagLine" placeholder="Tag (ej. 1234)" class="styled-input" />
      <select id="playerRegion" class="styled-select">
        ${VALORANT_REGIONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
      </select>
      <button onclick="fetchPlayerData()" class="role-btn active" style="padding: 10px 16px;">Buscar Estadísticas</button>
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
  if (!name || !tag) { alert('Ingresa nombre y tag.'); return; }

  contentGrid.innerHTML = `<div class="player-empty-state" style="grid-column: 1/-1; text-align: center;"><p>Buscando datos de <strong>${name}#${tag}</strong> en región <strong>${region.toUpperCase()}</strong>...</p></div>`;
  
  try {
    const res = await fetch(`${PROXY_BASE}?region=${region}&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
    
    // Verificamos si la respuesta del servidor es correcta en formato JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('El servidor proxy no está configurado o devolvió una respuesta HTML (Error 404/500). Asegúrate de disponer de un backend operativo para la ruta /api/player.');
    }

    const data = await res.json();
    if (!res.ok || !data.data) throw new Error(data.message || 'Jugador no encontrado');
    
    contentGrid.innerHTML = `<div class="player-empty-state" style="grid-column: 1/-1; text-align: center;"><p>¡Estadísticas encontradas para ${name}#${tag}!</p></div>`;
  } catch (err) {
    contentGrid.innerHTML = `<div class="player-error-state" style="grid-column: 1/-1; text-align: center; color: var(--accent-red);"><p><strong>Error:</strong> ${err.message}</p></div>`;
  }
}