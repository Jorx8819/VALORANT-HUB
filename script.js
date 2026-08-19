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
let currentCategory = 'agents'; // Guardamos la categoría activa actual
let isLoggedIn = false;
let loggedUserEmail = '';
let loggedRiotName = '';
let loggedRiotTag = '';
let loggedRegion = 'eu';

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

// Volver al Hub principal de 2 filas x 3 columnas centrado
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

// Muestra el Hub de las 6 tarjetas de forma simétrica (3x2) y oculta el contenido secundario
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
  currentCategory = categoryName;
  compareList = [];
  updateCompareBar();
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

    renderSubFilters(currentCategory);
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

  renderCards(filtered, currentCategory);
}

function setCatalogControlsVisible(visible) {
  const display = visible ? '' : 'none';
  if (langSelect) langSelect.style.display = display;
  if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = display;
  if (favFilterBtn) favFilterBtn.style.display = display;
}

// (Resto de tus funciones auxiliares, modales, renderCards y perfiles de jugadores se mantienen exactamente igual que en tu script original).
