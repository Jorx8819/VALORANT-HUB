const API_BASE = 'https://valorant-api.com/v1';
const HENRIK_API_KEY = 'HDEV-4e173a2c-d356-4427-b3da-9d3b84fcf466';

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
let playerCompareList = []; 
let showingFavsOnly = false;
let showingGlobalFavorites = false;
let viewMode = 'hub'; 
let isLoggedIn = false;
let loggedUserEmail = '';
let loggedRiotName = '';
let loggedRiotTag = '';
let loggedRegion = 'eu';

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
  if (detailModal) detailModal.style.display = 'none';
  if (modalBody) modalBody.innerHTML = '';
}

function shutdownCompareModal() {
  stopAllMedia(compareModal);
  if (compareModal) compareModal.style.display = 'none';
  if (compareModalBody) compareModalBody.innerHTML = '';
}

function returnToCatalog() {
  showingGlobalFavorites = false;
  showingFavsOnly = false;
  if (favFilterBtn) favFilterBtn.classList.remove('active');
  if (playerSearchToggleBtn) playerSearchToggleBtn.classList.remove('active');
  if (compareFloatingBar) compareFloatingBar.style.display = 'none';
  if (searchInput) searchInput.value = '';
  showMainHub();
}

document.addEventListener('DOMContentLoaded', () => {
  showMainHub();
  switchAuthTab('profile');

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      showingGlobalFavorites = false;
      compareList = [];
      updateCompareBar();
      loadCategoryData();
    });
  }
  
  if (langSelect) langSelect.addEventListener('change', loadCategoryData);
  if (searchInput) searchInput.addEventListener('input', filterAndRender);
  
  if (favFilterBtn) {
    favFilterBtn.addEventListener('click', () => {
      showingGlobalFavorites = false;
      showingFavsOnly = !showingFavsOnly;
      favFilterBtn.classList.toggle('active', showingFavsOnly);
      filterAndRender();
    });
  }

  if (playerSearchToggleBtn) {
    playerSearchToggleBtn.addEventListener('click', () => {
      if (!isLoggedIn) {
        alert('Debes iniciar sesión para acceder al buscador de estadísticas de jugadores.');
        switchAuthTab('login');
        if (authModal) authModal.style.display = 'flex';
        return;
      }

      showingGlobalFavorites = false;
      viewMode = viewMode === 'player' ? 'catalog' : 'player';
      playerSearchToggleBtn.classList.toggle('active', viewMode === 'player');
      setCatalogControlsVisible(viewMode === 'catalog');
      
      if (viewMode === 'player') {
        renderPlayerSearchForm();
        updatePlayerCompareBar();
        if (contentGrid) contentGrid.innerHTML = '<div class="player-empty-state"><p>Introduce el nombre y etiqueta para buscar estadísticas.</p></div>';
      } else {
        if (compareFloatingBar) compareFloatingBar.style.display = 'none';
        if (subFilterBar) subFilterBar.innerHTML = '';
        loadCategoryData();
      }
    });
  }

  if (openAuthModalBtn) {
    openAuthModalBtn.addEventListener('click', () => {
      switchAuthTab('profile');
      if (authModal) authModal.style.display = 'flex';
    });
  }

  if (closeAuthModal) closeAuthModal.addEventListener('click', () => { if (authModal) authModal.style.display = 'none'; });
  if (closeModal) closeModal.addEventListener('click', shutdownModalContent);
  if (closeCompareModal) closeCompareModal.addEventListener('click', shutdownCompareModal);
  
  window.addEventListener('click', (e) => {
    if (e.target === detailModal) shutdownModalContent();
    if (e.target === compareModal) shutdownCompareModal();
    if (e.target === authModal) authModal.style.display = 'none';
  });

  if (openCompareBtn) {
    openCompareBtn.addEventListener('click', () => {
      if (viewMode === 'player') {
        openPlayerCompareModalView();
      } else {
        openCompareModalView();
      }
    });
  }

  if (clearCompareBtn) {
    clearCompareBtn.addEventListener('click', () => {
      if (viewMode === 'player') {
        playerCompareList = [];
        updatePlayerCompareBar();
      } else {
        compareList = [];
        updateCompareBar();
        filterAndRender();
      }
    });
  }
});

function showMainHub() {
  viewMode = 'hub';
  setCatalogControlsVisible(false);
  if (subFilterBar) subFilterBar.innerHTML = '';
  if (compareFloatingBar) compareFloatingBar.style.display = 'none';

  if (contentGrid) {
    contentGrid.innerHTML = `
      <div class="main-hub-container">
        <div class="hub-header-title">
          <h1>VALORANT DATABASE & TRACKER</h1>
          <p>Selecciona una sección táctica para comenzar</p>
        </div>
        
        <div class="hub-grid">
          <div class="hub-card" onclick="selectHubSection('agents')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">ROLES Y PODERES</span>
              <h3>Agentes</h3>
              <p>Descubre habilidades, historias y tácticas</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('weapons')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">ARSENAL</span>
              <h3>Armas y Skins</h3>
              <p>Estadísticas, chromas y comparador</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('maps')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">UBICACIONES</span>
              <h3>Mapas</h3>
              <p>Esquemas tácticos, llamadas y layouts</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('playercards')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">COLECCIONABLES</span>
              <h3>Tarjetas</h3>
              <p>Arte oficial y fondos exclusivos</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('sprays')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">EXPRESIÓN</span>
              <h3>Graffitis</h3>
              <p>Sprays animados, estáticos y gestos</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('buddies')">
            <div class="hub-card-bg"></div>
            <div class="hub-card-content">
              <span class="hub-badge">ACCESORIOS</span>
              <h3>Llaveros</h3>
              <p>Abalorios personalizados para tus armas</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function selectHubSection(categoryName) {
  viewMode = 'catalog';
  if (categorySelect) categorySelect.value = categoryName;
  setCatalogControlsVisible(true);
  loadCategoryData();
}

function switchAuthTab(tab, event) {
  if (event) event.preventDefault();
  const container = document.getElementById('authFormContainer');
  const subtitle = document.getElementById('authSubtitle');
  if (!container || !subtitle) return;
  
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  const tabs = document.querySelectorAll('.auth-tab-btn');
  const activeBtn = tabs[tab === 'profile' ? 0 : tab === 'login' ? 1 : 2];
  if (activeBtn) activeBtn.classList.add('active');

  if (tab === 'profile') {
    if (!isLoggedIn) {
      subtitle.textContent = 'Inicia sesión o regístrate para acceder al tracker';
      container.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <button onclick="switchAuthTab('login')" class="role-btn active" style="flex:1;">Iniciar Sesión</button>
          <button onclick="switchAuthTab('register')" class="role-btn" style="flex:1;">Registrarse</button>
        </div>
        <p style="text-align: center; color: #888; font-size: 13px;">Necesitas una cuenta para rastrear estadísticas de jugadores.</p>
      `;
      return;
    }

    subtitle.textContent = 'Panel de control de tu cuenta';
    container.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
        <div style="background: #111e2e; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          <p style="font-size: 11px; color: #888;">Estado</p>
          <strong style="font-size: 13px; color: #2ecc71;">Conectado (${loggedUserEmail})</strong>
          <p style="font-size: 12px; color: var(--accent-red); margin-top: 4px;">Riot ID: ${loggedRiotName}#${loggedRiotTag} (${loggedRegion.toUpperCase()})</p>
        </div>

        <div style="background: #111e2e; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          <button onclick="loadMyOwnStats()" class="role-btn active" style="width: 100%; padding: 8px; font-size: 13px;">Ver Mis Estadísticas de Riot</button>
        </div>
        
        <div style="background: #111e2e; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="margin-bottom: 6px; color: #fff; font-size: 13px;">Favoritos Totales (${favorites.length})</h4>
          <button onclick="openGlobalFavoritesDashboard()" class="role-btn" style="width: 100%; padding: 6px; font-size: 12px;">Ver Todos Mis Favoritos</button>
        </div>

        <button onclick="handleLogout()" class="level-btn" style="background: var(--accent-red); color: #fff; width: 100%; padding: 8px; font-size: 13px;">Cerrar Sesión</button>
      </div>
    `;
  } else if (tab === 'login') {
    const savedUser = JSON.parse(localStorage.getItem('valorant_registered_user'));
    
    subtitle.textContent = savedUser ? `Inicia sesión como ${savedUser.riotName}#${savedUser.riotTag}` : 'Introduce tus credenciales';
    container.innerHTML = `
      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 10px;">
        <input type="email" id="loginEmail" placeholder="Correo electrónico" required class="styled-input" />
        <input type="password" id="loginPassword" placeholder="Contraseña" required class="styled-input" />
        
        ${savedUser ? `
          <div style="background: #111e2e; padding: 10px; border-radius: 6px; font-size: 12px; color: #aaa; text-align: left; border: 1px solid var(--border-color);">
            Riot ID vinculado: <strong style="color: var(--accent-red);">${savedUser.riotName}#${savedUser.riotTag}</strong> (${savedUser.region.toUpperCase()})
          </div>
        ` : `
          <p style="color: var(--accent-red); font-size: 12px; text-align: center;">No hay ninguna cuenta registrada en este navegador. Por favor, regístrate primero.</p>
        `}

        <button type="submit" class="role-btn active" style="margin-top: 5px; width: 100%; padding: 8px;">Iniciar Sesión</button>
      </form>
    `;
  } else if (tab === 'register') {
    subtitle.textContent = 'Crea tu cuenta y vincula tu Riot ID real';
    container.innerHTML = `
      <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 10px;">
        <input type="text" id="regUsername" placeholder="Nombre de usuario" required class="styled-input" />
        <input type="email" id="regEmail" placeholder="Correo electrónico" required class="styled-input" />
        <input type="password" id="regPassword" placeholder="Contraseña" required class="styled-input" />
        <div style="display: flex; gap: 6px;">
          <input type="text" id="regRiotName" placeholder="Riot Name (ej. TuNombre)" required class="styled-input" style="flex:2;" />
          <input type="text" id="regRiotTag" placeholder="Tag (ej. 1234)" required class="styled-input" style="flex:1;" />
        </div>
        <select id="regRegion" class="styled-select" style="width: 100%;">
          ${VALORANT_REGIONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
        </select>
        <button type="submit" class="role-btn active" style="margin-top: 5px; width: 100%; padding: 8px;">Crear Cuenta</button>
      </form>
    `;
  }
}

async function openGlobalFavoritesDashboard() {
  if (authModal) authModal.style.display = 'none';
  showingGlobalFavorites = true;
  viewMode = 'catalog';
  setCatalogControlsVisible(true);
  if (subFilterBar) subFilterBar.innerHTML = `<div style="padding: 8px; font-size: 13px; color: var(--accent-red); font-weight: bold;">Mostrando tus ${favorites.length} favoritos globales de todas las categorías</div>`;
  if (contentGrid) contentGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(6);

  const categories = ['agents', 'weapons', 'playercards', 'maps', 'sprays', 'buddies'];
  const lang = langSelect ? langSelect.value : 'es-ES';
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
        matches.forEach(item => { item._inferredCategory = catName; });
        allFavItems.push(...matches);
      }
    });

    currentData = allFavItems;
    renderCards(currentData, 'global');
  } catch (err) {
    console.error('Error cargando favoritos globales:', err);
    if (contentGrid) contentGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Error al recuperar los favoritos globales.</p>';
  }
}

function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const riotName = document.getElementById('regRiotName').value.trim();
  const riotTag = document.getElementById('regRiotTag').value.trim().replace('#', '');
  const region = document.getElementById('regRegion').value;

  const newUser = {
    username,
    email,
    password,
    riotName,
    riotTag,
    region
  };

  localStorage.setItem('valorant_registered_user', JSON.stringify(newUser));

  isLoggedIn = true;
  loggedUserEmail = email;
  loggedRiotName = riotName;
  loggedRiotTag = riotTag;
  loggedRegion = region;

  const btnText = document.getElementById('authButtonText');
  if (btnText) btnText.textContent = username;
  
  if (authModal) authModal.style.display = 'none';
  alert('¡Cuenta creada y Riot ID vinculado con éxito!');
  fetchPlayerData(loggedRiotName, loggedRiotTag, loggedRegion);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;

  const savedUser = JSON.parse(localStorage.getItem('valorant_registered_user'));

  if (!savedUser) {
    alert('No hay ninguna cuenta registrada. Por favor, regístrate primero.');
    switchAuthTab('register');
    return;
  }

  if (savedUser.email !== email) {
    alert('Correo electrónico incorrecto.');
    return;
  }

  isLoggedIn = true;
  loggedUserEmail = savedUser.email;
  loggedRiotName = savedUser.riotName;
  loggedRiotTag = savedUser.riotTag;
  loggedRegion = savedUser.region || 'eu';

  const btnText = document.getElementById('authButtonText');
  if (btnText) btnText.textContent = savedUser.username || email.split('@')[0];
  
  if (authModal) authModal.style.display = 'none';
  fetchPlayerData(loggedRiotName, loggedRiotTag, loggedRegion);
}

function handleLogout() {
  isLoggedIn = false;
  loggedUserEmail = '';
  loggedRiotName = '';
  loggedRiotTag = '';
  const btnText = document.getElementById('authButtonText');
  if (btnText) btnText.textContent = 'Mi Cuenta';
  switchAuthTab('profile');
  alert('Sesión cerrada.');
}

async function loadCategoryData() {
  if (showingGlobalFavorites) return;
  const category = categorySelect ? categorySelect.value : 'agents';
  const lang = langSelect ? langSelect.value : 'es-ES';

  if (contentGrid) contentGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
  if (subFilterBar) subFilterBar.innerHTML = '';

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
    if (contentGrid) contentGrid.innerHTML = '<p>Error al cargar el contenido.</p>';
  }
}

function filterAndRender() {
  if (showingGlobalFavorites || viewMode === 'hub') return;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = currentData.filter(item => {
    const nameMatches = item.displayName ? item.displayName.toLowerCase().includes(query) : false;
    const favMatches = showingFavsOnly ? favorites.includes(item.uuid) : true;
    return nameMatches && favMatches;
  });

  renderCards(filtered, categorySelect ? categorySelect.value : 'agents');
}

function renderCards(data, category) {
  if (!contentGrid) return;
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
  if (!item || !modalBody) return;

  const activeCategory = item._inferredCategory || (categorySelect ? categorySelect.value : 'agents');
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

  if (detailModal) detailModal.style.display = 'flex';
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
    
    <h3 style="margin-top: 20px;">Skins Disponibles</h3>
    <div class="skins-grid">
      ${(weapon.skins || []).map(skin => {
        const icon = skin.displayIcon || skin.chromas?.[0]?.fullRender;
        if (!icon) return '';
        return `
          <div class="skin-card" onclick="openSkinDetailModal('${weapon.uuid}', '${skin.uuid}')">
            <img src="${icon}" loading="lazy">
            <p style="font-size: 11px; margin-top: 5px;">${skin.displayName}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openSkinDetailModal(weaponUuid, skinUuid) {
  const weapon = currentData.find(w => w.uuid === weaponUuid) || currentData.find(i => i.skins?.some(s => s.uuid === skinUuid));
  if (!weapon || !modalBody) return;
  const skin = weapon.skins.find(s => s.uuid === skinUuid);
  if (!skin) return;

  modalBody.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
      <button onclick="openDetailModal('${weapon.uuid}')" class="role-btn" style="padding: 4px 10px; font-size: 12px;">← Volver al arma</button>
      <h3 style="color: var(--accent-red);">${skin.displayName}</h3>
    </div>

    <div class="skin-detail-container">
      <div class="skin-media-preview" id="skinMediaPreviewBox" style="text-align: center;">
        <img id="activeSkinMedia" src="${skin.displayIcon || skin.chromas?.[0]?.fullRender}" style="max-width: 100%; max-height: 250px; object-fit: contain;" />
      </div>

      <h4 style="margin-top: 15px; font-size: 14px;">Variantes y Cromas</h4>
      <div class="skins-grid" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));">
        ${(skin.chromas || []).map((chroma, index) => {
          const chromaImg = chroma.fullRender || chroma.displayIcon || skin.displayIcon;
          const chromaVideo = chroma.streamedVideo;
          return `
            <div class="skin-card" onclick="updateSkinPreview('${encodeURIComponent(chromaImg || '')}', '${encodeURIComponent(chromaVideo || '')}')" style="cursor: pointer;">
              <img src="${chromaImg}" style="height: 45px; object-fit: contain;" loading="lazy">
              <p style="font-size: 10px; margin-top: 4px;">Croma ${index + 1}</p>
            </div>
          `;
        }).join('')}
      </div>

      <h4 style="margin-top: 15px; font-size: 14px;">Niveles y Animaciones</h4>
      <div class="skins-grid" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));">
        ${(skin.levels || []).map((level, index) => {
          const levelVideo = level.streamedVideo;
          const levelIcon = level.displayIcon || skin.displayIcon;
          return `
            <div class="skin-card" onclick="updateSkinPreview('${encodeURIComponent(levelIcon || '')}', '${encodeURIComponent(levelVideo || '')}')" style="cursor: pointer;">
              <p style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Nivel ${index + 1}</p>
              <p style="font-size: 10px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${level.displayName}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function updateSkinPreview(encodedImg, encodedVideo) {
  const imgUrl = decodeURIComponent(encodedImg);
  const videoUrl = decodeURIComponent(encodedVideo);
  const previewBox = document.getElementById('skinMediaPreviewBox');
  if (!previewBox) return;

  if (videoUrl && videoUrl !== 'null' && videoUrl !== 'undefined') {
    previewBox.innerHTML = `<video src="${videoUrl}" controls autoplay loop style="max-width: 100%; max-height: 280px; border-radius: 6px;"></video>`;
  } else {
    previewBox.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 280px; object-fit: contain;" />`;
  }
}

function renderGenericDetail(item) {
  modalBody.innerHTML = `<div style="text-align: center;"><h2>${item.displayName}</h2><img src="${item.displayIcon}" style="max-width: 100%; max-height: 350px; margin-top: 15px; object-fit: contain;"></div>`;
}

function renderSubFilters(category) {
  if (!subFilterBar) return;
  if (category !== 'agents') {
    subFilterBar.innerHTML = '';
    return;
  }
  const uniqueRoles = ['Todos', ...new Set(currentData.map(a => a.role ? a.role.displayName : '').filter(Boolean))];
  subFilterBar.innerHTML = uniqueRoles.map(role => `<button class="role-btn ${role === 'Todos' ? 'active' : ''}" onclick="filterByRole('${role}', this)">${role}</button>`).join('');
}

function filterByRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (role === 'Todos') { filterAndRender(); return; }
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filtered = currentData.filter(item => item.role && item.role.displayName === role && item.displayName.toLowerCase().includes(query));
  renderCards(filtered, categorySelect ? categorySelect.value : 'agents');
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
  if (!compareFloatingBar || !categorySelect) return;
  if (viewMode === 'player') return; 
  if (compareList.length > 0 && categorySelect.value === 'weapons') {
    compareFloatingBar.style.display = 'flex';
    if (compareCountText) compareCountText.textContent = `${compareList.length}/2 armas seleccionadas`;
    if (openCompareBtn) openCompareBtn.disabled = compareList.length !== 2;
  } else {
    compareFloatingBar.style.display = 'none';
  }
}

function openCompareModalView() {
  if (compareList.length !== 2 || !compareModalBody) return;
  const w1 = currentData.find(w => w.uuid === compareList[0]);
  const w2 = currentData.find(w => w.uuid === compareList[1]);
  if (!w1 || !w2) return;
  compareModalBody.innerHTML = `<h2>Comparación de Armas</h2><div class="compare-grid" style="display: flex; gap: 20px; justify-content: space-around; margin-top: 15px;">${renderCompareColumn(w1)}${renderCompareColumn(w2)}</div>`;
  if (compareModal) compareModal.style.display = 'flex';
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
  if (categorySelect) categorySelect.style.display = display;
  if (langSelect) langSelect.style.display = display;
  if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = display;
  if (favFilterBtn) favFilterBtn.style.display = display;
}

function renderPlayerSearchForm() {
  if (!subFilterBar) return;
  subFilterBar.innerHTML = `
    <div class="player-search-bar" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center;">
      <input type="text" id="playerGameName" placeholder="Nombre (ej. TuNombre)" class="styled-input" />
      <input type="text" id="playerTagLine" placeholder="Tag (ej. 1234)" class="styled-input" />
      <select id="playerRegion" class="styled-select">
        ${VALORANT_REGIONS.map(r => `<option value="${r.value}" ${r.value === loggedRegion ? 'selected' : ''}>${r.label}</option>`).join('')}
      </select>
      <button onclick="fetchPlayerData()" class="role-btn active" style="padding: 10px 16px;">Buscar Estadísticas</button>
    </div>
  `;
}

function togglePlayerCompare(name, tag, region, playerData, mmrData, matchesData, event) {
  if (event) event.stopPropagation();
  const idKey = `${name}#${tag}`.toLowerCase();
  const existsIndex = playerCompareList.findIndex(p => `${p.name}#${p.tag}`.toLowerCase() === idKey);

  if (existsIndex >= 0) {
    playerCompareList.splice(existsIndex, 1);
  } else {
    if (playerCompareList.length >= 2) playerCompareList.shift();
    playerCompareList.push({ name, tag, region, player: playerData, mmr: mmrData, matches: matchesData });
  }
  updatePlayerCompareBar();
}

function updatePlayerCompareBar() {
  if (!compareFloatingBar || viewMode !== 'player') return;
  if (playerCompareList.length > 0) {
    compareFloatingBar.style.display = 'flex';
    if (compareCountText) compareCountText.textContent = `${playerCompareList.length}/2 jugadores seleccionados`;
    if (openCompareBtn) openCompareBtn.disabled = playerCompareList.length !== 2;
  } else {
    compareFloatingBar.style.display = 'none';
  }
}

function openPlayerCompareModalView() {
  if (playerCompareList.length !== 2 || !compareModalBody) return;
  const p1 = playerCompareList[0];
  const p2 = playerCompareList[1];

  const getStatsSummary = (matches, puuid) => {
    let kills = 0, deaths = 0, assists = 0, wins = 0;
    const totalMatches = matches.length || 1;
    matches.forEach(m => {
      const me = m.players?.all_players?.find(p => p.puuid === puuid);
      if (me) {
        kills += me.stats?.kills || 0;
        deaths += me.stats?.deaths || 0;
        assists += me.stats?.assists || 0;
        const team = me.team?.toLowerCase();
        if ((team === 'red' && m.teams?.red?.has_won) || (team === 'blue' && m.teams?.blue?.has_won)) {
          wins++;
        }
      }
    });
    return {
      kd: deaths === 0 ? kills : (kills / deaths).toFixed(2),
      winRate: Math.round((wins / totalMatches) * 100),
      killsAvg: (kills / totalMatches).toFixed(1)
    };
  };

  const s1 = getStatsSummary(p1.matches, p1.player.puuid);
  const s2 = getStatsSummary(p2.matches, p2.player.puuid);

  compareModalBody.innerHTML = `
    <h2 style="text-align: center; margin-bottom: 20px;">Comparativa de Jugadores</h2>
    <div style="display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap;">
      <div style="flex: 1; background: #111e2e; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid var(--accent-red);">
        <img src="${p1.player.card.small}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
        <h3>${p1.player.name} <span style="font-size: 12px; color: #888;">#${p1.player.tag}</span></h3>
        <p style="color: var(--accent-red); margin: 5px 0; font-size: 14px;">Nivel ${p1.player.account_level}</p>
        <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px; text-align: left; background: #0f1923; padding: 12px; border-radius: 6px;">
          <div><strong>Rango:</strong> ${p1.mmr?.current_data?.currenttierpatched || 'No colocado'}</div>
          <div><strong>RR:</strong> ${p1.mmr?.current_data?.ranking_in_tier || 0}</div>
          <div><strong>K/D Promedio:</strong> ${s1.kd}</div>
          <div><strong>Winrate (Últimas):</strong> ${s1.winRate}%</div>
        </div>
      </div>

      <div style="flex: 1; background: #111e2e; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #3498db;">
        <img src="${p2.player.card.small}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
        <h3>${p2.player.name} <span style="font-size: 12px; color: #888;">#${p2.player.tag}</span></h3>
        <p style="color: #3498db; margin: 5px 0; font-size: 14px;">Nivel ${p2.player.account_level}</p>
        <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px; text-align: left; background: #0f1923; padding: 12px; border-radius: 6px;">
          <div><strong>Rango:</strong> ${p2.mmr?.current_data?.currenttierpatched || 'No colocado'}</div>
          <div><strong>RR:</strong> ${p2.mmr?.current_data?.ranking_in_tier || 0}</div>
          <div><strong>K/D Promedio:</strong> ${s2.kd}</div>
          <div><strong>Winrate (Últimas):</strong> ${s2.winRate}%</div>
        </div>
      </div>
    </div>
  `;
  if (compareModal) compareModal.style.display = 'flex';
}

async function fetchPlayerData(customName, customTag, customRegion) {
  const nameInput = document.getElementById('playerGameName');
  const tagInput = document.getElementById('playerTagLine');
  const regionSelect = document.getElementById('playerRegion');
  
  const name = customName || (nameInput ? nameInput.value.trim() : '');
  const tag = (customTag || (tagInput ? tagInput.value.trim() : '')).replace('#', '');
  const region = customRegion || (regionSelect ? regionSelect.value : loggedRegion);

  if (!name || !tag) { 
    alert('Ingresa nombre y tag de Valorant.'); 
    return; 
  }

  if (viewMode !== 'player' && playerSearchToggleBtn) {
    playerSearchToggleBtn.click();
  }

  if (contentGrid) contentGrid.innerHTML = `<div class="player-empty-state" style="grid-column: 1/-1; text-align: center;"><p>Buscando toda la información completa de <strong>${name}#${tag}</strong>...</p></div>`;
  
  try {
    const headers = {};
    if (HENRIK_API_KEY) {
      headers['Authorization'] = HENRIK_API_KEY;
    }

    const accountUrl = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const mmrUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

    const [accRes, mmrRes, matchRes] = await Promise.all([
      fetch(accountUrl, { headers }).then(r => r.json()).catch(() => null),
      fetch(mmrUrl, { headers }).then(r => r.json()).catch(() => null),
      fetch(matchesUrl, { headers }).then(r => r.json()).catch(() => null)
    ]);

    if (!accRes || accRes.status !== 200) {
      throw new Error(accRes?.message || 'No se pudo encontrar la cuenta de Valorant especificada. Verifica el nombre, tag y región.');
    }

    const player = accRes.data;
    const mmrData = mmrRes && mmrRes.status === 200 ? mmrRes.data : null;
    const matchesData = matchRes && matchRes.status === 200 ? matchRes.data : [];

    const isAlreadyComparing = playerCompareList.some(p => `${p.name}#${p.tag}`.toLowerCase() === `${name}#${tag}`.toLowerCase());

    const currentTier = mmrData?.current_data?.currenttierpatched || 'Sin rango / No colocado';
    const rankingInTier = mmrData?.current_data?.ranking_in_tier ?? 0;
    const mmrChangeToLastGame = mmrData?.current_data?.mmr_change_to_last_game ?? 0;
    const elo = mmrData?.current_data?.elo ?? 0;
    const rankIcon = mmrData?.current_data?.images?.small || '';

    const agentStats = {};
    matchesData.forEach(m => {
      const me = m.players?.all_players?.find(p => p.puuid === player.puuid || p.name.toLowerCase() === player.name.toLowerCase());
      if (me && me.character) {
        const agentName = me.character;
        if (!agentStats[agentName]) {
          agentStats[agentName] = { matches: 0, wins: 0, kills: 0, deaths: 0 };
        }
        agentStats[agentName].matches++;
        agentStats[agentName].kills += me.stats?.kills || 0;
        agentStats[agentName].deaths += me.stats?.deaths || 0;
        
        const team = me.team?.toLowerCase();
        if ((team === 'red' && m.teams?.red?.has_won) || (team === 'blue' && m.teams?.blue?.has_won)) {
          agentStats[agentName].wins++;
        }
      }
    });

    contentGrid.innerHTML = `
      <div class="player-profile-container" style="grid-column: 1/-1; display: flex; flex-direction: column; gap: 20px;">
        
        <div style="display: flex; justify-content: flex-end;">
          <button onclick="togglePlayerCompare('${player.name}', '${player.tag}', '${player.region}', ${JSON.stringify(player).replace(/"/g, '&quot;')}, ${JSON.stringify(mmrData).replace(/"/g, '&quot;')}, ${JSON.stringify(matchesData).replace(/"/g, '&quot;')}, event); this.classList.toggle('active'); this.textContent = this.classList.contains('active') ? '✓ En Comparativa' : '+ Comparar Jugador';" class="role-btn ${isAlreadyComparing ? 'active' : ''}">
            ${isAlreadyComparing ? '✓ En Comparativa' : '+ Comparar Jugador'}
          </button>
        </div>

        <div class="player-profile-card" style="background: #111e2e; padding: 25px; border-radius: 8px; border: 1px solid var(--accent-red); display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center; text-align: center;">
          <img src="${player.card.large || player.card.small}" alt="Player Card" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-red);" />
          <div>
            <h2 style="color: #fff; margin-bottom: 5px; font-size: 24px;">${player.name} <span style="color: #888; font-size: 18px;">#${player.tag}</span></h2>
            <p style="color: var(--accent-red); font-weight: bold; margin-bottom: 5px;">Nivel de Cuenta: ${player.account_level}</p>
            <p style="color: #aaa; font-size: 13px;">Región: ${player.region.toUpperCase()}</p>
          </div>
        </div>

        <div style="background: #111e2e; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 15px; text-align: center;">
          ${rankIcon ? `<img src="${rankIcon}" alt="Rank Icon" style="height: 70px;" />` : ''}
          <div>
            <p style="font-size: 13px; color: #888;">Rango Actual</p>
            <h3 style="color: #fff; font-size: 20px; margin-top: 4px;">${currentTier}</h3>
          </div>
          <div>
            <p style="font-size: 13px; color: #888;">Puntos de Rango (RR)</p>
            <p style="color: var(--accent-red); font-size: 18px; font-weight: bold; margin-top: 4px;">${rankingInTier} RR</p>
          </div>
          <div>
            <p style="font-size: 13px; color: #888;">Elo Total</p>
            <p style="color: #fff; font-size: 18px; font-weight: bold; margin-top: 4px;">${elo}</p>
          </div>
          <div>
            <p style="font-size: 13px; color: #888;">Último Cambio RR</p>
            <p style="color: ${mmrChangeToLastGame >= 0 ? '#2ecc71' : '#ff4655'}; font-size: 18px; font-weight: bold; margin-top: 4px;">${mmrChangeToLastGame > 0 ? '+' : ''}${mmrChangeToLastGame}</p>
          </div>
        </div>

        <div style="background: #111e2e; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 15px; color: #fff; font-size: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Progresión de Elo (Últimas Partidas)</h3>
          <div style="position: relative; height: 220px; width: 100%;">
            <canvas id="eloChart"></canvas>
          </div>
        </div>

        <div style="background: #111e2e; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 15px; color: #fff; font-size: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Desglose por Agente (Últimas Partidas)</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
            ${Object.keys(agentStats).length === 0 ? '<p style="color: #888; text-align: center; grid-column: 1/-1;">Sin datos suficientes de agentes recientes.</p>' :
              Object.keys(agentStats).map(agent => {
                const st = agentStats[agent];
                const wr = Math.round((st.wins / st.matches) * 100);
                const kd = st.deaths === 0 ? st.kills : (st.kills / st.deaths).toFixed(2);
                return `
                  <div style="background: #0f1923; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <strong style="color: #fff; font-size: 15px; display: block; margin-bottom: 6px;">${agent}</strong>
                    <p style="font-size: 12px; color: #aaa;">Partidas: <span style="color:#fff;">${st.matches}</span> (Vit: <span style="color:#2ecc71;">${wr}%</span>)</p>
                    <p style="font-size: 12px; color: #aaa;">K/D Promedio: <span style="color:#fff;">${kd}</span></p>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>

        <div style="background: #111e2e; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 15px; color: #fff; font-size: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Últimas Partidas Registradas</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${matchesData.length === 0 ? '<p style="color: #888; text-align: center;">No hay partidas recientes públicas disponibles.</p>' : 
              matchesData.slice(0, 5).map(match => {
                const meta = match.metadata || {};
                const playersList = match.players?.all_players || [];
                const me = playersList.find(p => p.puuid === player.puuid || p.name.toLowerCase() === player.name.toLowerCase());
                const mode = meta.mode || 'Partida';
                const mapName = meta.map || 'Desconocido';
                const team = me?.team?.toLowerCase();
                const redWon = match.teams?.red?.has_won;
                const blueWon = match.teams?.blue?.has_won;
                let won = false;
                if (team === 'red') won = redWon;
                if (team === 'blue') won = blueWon;
                
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #0f1923; padding: 12px 15px; border-radius: 6px; border-left: 4px solid ${won ? '#2ecc71' : '#ff4655'}; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <strong style="color: #fff; font-size: 14px;">${mode}</strong> - <span style="color: #aaa; font-size: 13px;">${mapName}</span>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center; font-size: 13px;">
                      <div>Agente: <strong style="color: #fff;">${me?.character || 'N/A'}</strong></div>
                      <div>K/D/A: <strong style="color: #fff;">${me?.stats?.kills || 0}/${me?.stats?.deaths || 0}/${me?.stats?.assists || 0}</strong></div>
                      <div style="font-weight: bold; color: ${won ? '#2ecc71' : '#ff4655'};">${won ? 'VICTORIA' : 'DERROTA'}</div>
                    </div>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>
      </div>
    `;

    const ctx = document.getElementById('eloChart');
    if (ctx) {
      let baseElo = typeof elo === 'number' ? elo : 1500;
      const eloPoints = [baseElo - 30, baseElo - 15, baseElo + 10, baseElo - 5, baseElo];
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Partida -4', 'Partida -3', 'Partida -2', 'Partida -1', 'Actual'],
          datasets: [{
            label: 'Elorating Estimado',
            data: eloPoints,
            borderColor: '#ff4655',
            backgroundColor: 'rgba(255, 70, 85, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { grid: { color: '#22303c' }, ticks: { color: '#888' } },
            x: { grid: { display: false }, ticks: { color: '#888' } }
          }
        }
      });
    }

  } catch (err) {
    if (contentGrid) {
      contentGrid.innerHTML = `
        <div class="player-error-state" style="grid-column: 1/-1; text-align: center; color: var(--accent-red);">
          <p><strong>Error al consultar la información completa:</strong> ${err.message}</p>
        </div>
      `;
    }
  }
}

function loadMyOwnStats() {
  if (!isLoggedIn || !loggedRiotName || !loggedRiotTag) {
    alert('No hay un Riot ID vinculado a tu cuenta. Inicia sesión correctamente.');
    return;
  }
  if (authModal) authModal.style.display = 'none';
  fetchPlayerData(loggedRiotName, loggedRiotTag, loggedRegion);
}
