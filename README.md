# 🎯 VALORANT-HUB

Una aplicación web moderna, rápida y dinámica para explorar el catálogo completo de **Valorant** y consultar estadísticas detalladas de jugadores en tiempo real mediante un proxy serverless seguro.

<div align="center">

  <img src="https://img.shields.io/badge/VALORANT-HUB-ff4655?style=for-the-badge&logo=valorant&logoColor=white" alt="Valorant Hub" />
  <img src="https://img.shields.io/badge/STATUS-ONLINE-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/LICENSE-MIT-blue?style=for-the-badge" alt="License" />

</div>

<div align="center">

# ⚡ V A L O R A N T - H U B ⚡
### *Data & Tracker Platform*

</div>


</div>


## 🚀 Características Principales

* **🔍 Catálogo Completo**: Explora agentes, armas, mapas, tarjetas, graffitis y llaveros con datos en tiempo real.
* **🛡️ Proxy Serverless Seguro**: Oculta la clave de API de HenrikDev ejecutando peticiones desde una Serverless Function (`/api/player`), evitando la exposición de credenciales en el cliente.
* **⚡ Caching Avanzado**: Implementación de cabeceras HTTP `Cache-Control` (15 min) en CDN para reducir la latencia y optimizar el consumo de la API.
* **⚔️ Comparador de Armas**: Analiza y compara el daño, la cadencia, el tamaño del cargador y el precio de dos armas frente a frente.
* **📊 Tracker de Jugadores**: Consulta el rango actual, puntos de clasificación (RR), MMR/ELO, histórico máximo, ratio K/D, % de victorias y las últimas 5 partidas de cualquier jugador.
* **🎨 Interfaz 3D e Interactiva**: Efectos visuales estilo *pop-out* en 3D, soporte para vídeos de habilidades, vista táctica de mapas y previsualización de skins/variantes.
* **⭐ Favoritos**: Guarda tus elementos preferidos localmente mediante `localStorage`.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend**: HTML5, CSS3 (CSS Variables, Flexbox, Grid 3D), JavaScript Vanilla (ES6+).
* **Backend**: Vercel / Netlify Serverless Functions (Node.js).
* **APIs Externas**:
  * [Valorant-API](https://valorant-api.com/) *(Datos del catálogo e imágenes)*
  * [HenrikDev Valorant API](https://henrikdev.xyz/) *(Estadísticas de jugadores, MMR y partidas)*

---

## 📁 Estructura del Proyecto

```text
├── api/
│   └── player.js      # Serverless Function (Proxy seguro & Cache)
├── index.html         # Estructura principal
├── styles.css         # Estilos visuales y animaciones 3D
├── script.js         # Lógica del cliente y consumo de endpoints
└── README.md          # Documentación del proyecto
