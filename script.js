const API_BASE = 'https://valorant-api.com/v1';

let currentData = [];
let favorites = JSON.parse(localStorage.getItem('valorant_favs')) || [];
let compareList = []; 
let playerCompareList = []; 
let showingFavsOnly = false;
let showingGlobalFavorites = false;
let viewMode = 'hub'; 
let currentCategory = 'agents'; 

// --- SISTEMA DE CUENTAS Y PERFIL LOCAL ---
let registeredUsers = JSON.parse(localStorage.getItem('valorant_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('valorant_current_user')) || null;

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
  updateAuthButtonUI();
  
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
            <div class="hub-card-content">
              <span class="hub-badge">ROLES Y PODERES</span>
              <h3>Agentes</h3>
              <p>Descubre habilidades, historias y tácticas</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('weapons')">
            <div class="hub-card-content">
              <span class="hub-badge">ARSENAL</span>
              <h3>Armas y Skins</h3>
              <p>Estadísticas, chromas y comparador</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('maps')">
            <div class="hub-card-content">
              <span class="hub-badge">UBICACIONES</span>
              <h3>Mapas</h3>
              <p>Esquemas tácticos, llamadas y layouts</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('playercards')">
            <div class="hub-card-content">
              <span class="hub-badge">COLECCIONABLES</span>
              <h3>Tarjetas</h3>
              <p>Arte oficial y fondos exclusivos</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('sprays')">
            <div class="hub-card-content">
              <span class="hub-badge">EXPRESIÓN</span>
              <h3>Graffitis</h3>
              <p>Sprays animados, estáticos y gestos</p>
            </div>
          </div>

          <div class="hub-card" onclick="selectHubSection('buddies')">
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
  currentCategory = categoryName;
  compareList = [];
  setCatalogControlsVisible(true);
  loadCategoryData();
}

async function loadCategoryData() {
  if (showingGlobalFavorites || viewMode === 'hub') return;
  const lang = langSelect ? langSelect.value : 'es-ES';

  if (contentGrid) contentGrid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
  if (subFilterBar) subFilterBar.innerHTML = '';

  let endpoint = `${API_BASE}/${currentCategory}?language=${lang}`;
  if (currentCategory === 'agents') endpoint += '&isPlayableCharacter=true';

  try {
    const response = await fetch(endpoint);
    const result = await response.json();
    currentData = result.data || [];
    currentData.forEach(item => { item._inferredCategory = currentCategory; });

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

  renderCards(filtered);
}

function setCatalogControlsVisible(visible) {
  const display = visible ? '' : 'none';
  if (langSelect) langSelect.style.display = display;
  if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = display;
  if (favFilterBtn) favFilterBtn.style.display = display;
}

function renderCards(items) {
  if (!contentGrid) return;
  if (items.length === 0) {
    contentGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #888;">No se encontraron elementos.</p>';
    return;
  }

  contentGrid.innerHTML = items.map(item => {
    const isFav = favorites.includes(item.uuid);
    const imgUrl = item.displayIcon || item.killStreamIcon || (item.levels && item.levels[0]?.displayIcon);
    
    return `
      <div class="card-wrapper">
        <div class="card">
          <div class="card-action-btns">
            <button class="card-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite('${item.uuid}')">♥</button>
          </div>
          <div class="card-img-container" onclick="openDetailModal('${item.uuid}')">
            ${imgUrl ? `<img src="${imgUrl}" class="card-img primary-img" alt="${item.displayName}" loading="lazy">` : ''}
          </div>
          <h3 class="card-title" onclick="openDetailModal('${item.uuid}')">${item.displayName || 'Sin Nombre'}</h3>
          <span class="card-subtitle">${item.developerName || currentCategory}</span>
        </div>
      </div>
    `;
  }).join('');
}

function toggleFavorite(uuid) {
  const index = favorites.indexOf(uuid);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(uuid);
  }
  localStorage.setItem('valorant_favs', JSON.stringify(favorites));
  filterAndRender();
}

function openDetailModal(uuid) {
  const item = currentData.find(i => i.uuid === uuid);
  if (!item || !detailModal || !modalBody) return;

  let mediaContent = '';
  if (item.streamedVideo) {
    mediaContent = `<video controls autoplay style="width:100%; border-radius:6px; margin-bottom:15px;"><source src="${item.streamedVideo}" type="video/webm">Tu navegador no soporta video.</video>`;
  } else if (item.displayIcon) {
    mediaContent = `<img src="${item.displayIcon}" style="max-height: 250px; display: block; margin: 0 auto 15px; object-fit: contain;">`;
  }

  modalBody.innerHTML = `
    <h2 style="color:var(--text-main); margin-bottom: 10px;">${item.displayName}</h2>
    ${mediaContent}
    <p style="color:var(--text-dim); font-size: 14px; line-height: 1.5;">${item.description || 'Sin descripción detallada disponible.'}</p>
  `;
  detailModal.style.display = 'flex';
}

// --- LOGICA DE AUTENTICACIÓN Y PERFIL LOCAL ---

function updateAuthButtonUI() {
  const btnText = document.getElementById('authButtonText');
  if (btnText) {
    if (currentUser) {
      btnText.textContent = currentUser.username;
    } else {
      btnText.textContent = "Mi Cuenta";
    }
  }
}

function switchAuthTab(tab, event) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    const buttons = document.querySelectorAll('.auth-tab-btn');
    buttons.forEach(b => {
      if ((tab === 'profile' && b.textContent.includes('Perfil')) ||
          (tab === 'login' && b.textContent.includes('Acceso')) ||
          (tab === 'register' && b.textContent.includes('Registro'))) {
        b.classList.add('active');
      }
    });
  }

  const container = document.getElementById('authFormContainer');
  if (!container) return;

  if (tab === 'profile') {
    if (currentUser) {
      container.innerHTML = `
        <div style="text-align: center; color: #fff;">
          <div style="font-size: 40px; margin-bottom: 10px;">👤</div>
          <h3 style="margin-bottom: 5px; color: var(--accent-red);">${currentUser.username}</h3>
          <p style="font-size: 12px; color: #888; margin-bottom: 20px;">${currentUser.email}</p>
          <div style="background: #0f1923; padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: left;">
            <p style="font-size: 13px; color: #ccc;"><strong>Favoritos guardados:</strong> ${favorites.length} elementos</p>
          </div>
          <button onclick="handleLogout()" class="action-icon-btn" style="width:100%; background: #ff4655; color:#fff; border:none; padding: 10px; border-radius: 4px; cursor:pointer; font-weight: bold;">Cerrar Sesión</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align: center; color: #888; padding: 20px 0;">
          <p style="margin-bottom: 15px; font-size: 14px;">No has iniciado sesión con ninguna cuenta.</p>
          <button onclick="switchAuthTab('login')" class="action-icon-btn" style="background: var(--accent-red); color: #fff; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer;">Iniciar Sesión</button>
        </div>
      `;
    }
  } else if (tab === 'login') {
    container.innerHTML = `
      <form onsubmit="handleLoginSubmit(event)">
        <input type="email" id="loginEmail" placeholder="Correo electrónico" class="styled-input" required>
        <input type="password" id="loginPassword" placeholder="Contraseña" class="styled-input" required>
        <button type="submit" class="action-icon-btn" style="width:100%; text-align:center; background:var(--accent-red); color:#fff; border:none; margin-top:10px; padding: 10px; font-weight: bold; cursor: pointer;">Entrar</button>
      </form>
    `;
  } else if (tab === 'register') {
    container.innerHTML = `
      <form onsubmit="handleRegisterSubmit(event)">
        <input type="text" id="regUsername" placeholder="Nombre de Agente (Usuario)" class="styled-input" required>
        <input type="email" id="regEmail" placeholder="Correo electrónico" class="styled-input" required>
        <input type="password" id="regPassword" placeholder="Contraseña" class="styled-input" required>
        <button type="submit" class="action-icon-btn" style="width:100%; text-align:center; background:var(--accent-red); color:#fff; border:none; margin-top:10px; padding: 10px; font-weight: bold; cursor: pointer;">Registrarse</button>
      </form>
    `;
  }
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  const existing = registeredUsers.find(u => u.email === email);
  if (existing) {
    alert('Este correo electrónico ya está registrado.');
    return;
  }

  const newUser = { username, email, password };
  registeredUsers.push(newUser);
  localStorage.setItem('valorant_users', JSON.stringify(registeredUsers));

  currentUser = newUser;
  localStorage.setItem('valorant_current_user', JSON.stringify(currentUser));

  updateAuthButtonUI();
  alert(`¡Bienvenido agente ${username}! Registro completado con éxito.`);
  if (authModal) authModal.style.display = 'none';
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const user = registeredUsers.find(u => u.email === email && u.password === password);
  if (!user) {
    alert('Correo o contraseña incorrectos.');
    return;
  }

  currentUser = user;
  localStorage.setItem('valorant_current_user', JSON.stringify(currentUser));

  updateAuthButtonUI();
  alert(`¡Hola de nuevo, ${user.username}! Sesión iniciada.`);
  if (authModal) authModal.style.display = 'none';
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('valorant_current_user');
  updateAuthButtonUI();
  switchAuthTab('profile');
  alert('Has cerrado sesión correctamente.');
}
