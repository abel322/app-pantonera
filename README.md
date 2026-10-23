# Pantonera Pro 🎨⚖️

**Pantonera Pro** es una aplicación web progresiva (PWA) móvil de alto rendimiento diseñada para operarios de taller y plantas de impresión (serigrafía, offset, flexografía). Permite buscar colores tipo Pantone (Solid Coated) al instante y calcular en tiempo real la dosificación exacta de tintas base para cualquier volumen o lote de preparación.

---

## 🌟 Características Principales

- **Arquitectura en Memoria (Zero-DB / Zero-Latency):** Todo el catálogo de colores, códigos HEX y porcentajes de formulación reside en memoria estática de TypeScript (`src/data/pantoneColors.ts`).
- **Búsqueda Predictiva Inteligente (Fuse.js):** Indexación en tiempo real por número de código (ej: `285`, `101`), nombre completo (`PANTONE 285 C`) o nombre de tinta base (`Pro. Blue`, `PY12`).
- **Filtros Cromáticos por Familia:** Chips táctiles deslizables (`Todos`, `Favoritos`, `Amarillos`, `Azules`, `Naranjas`, `Rojos`, `Verdes`, `Violetas`, `Neutros`).
- **Calculadora Interactiva de Balanza (BottomSheet Móvil):**
  - Selector de peso total con soporte para **Gramos (g)** y **Kilogramos (kg)**.
  - Preajustes rápidos de taller (`100 g`, `250 g`, `500 g`, `1 kg`, `2.5 kg`, `5 kg`).
  - Cálculo reactivo inmediato con precisión a 2 decimales sin errores de coma flotante.
  - **Checklist de Pesaje:** Casilla de verificación por tinta para tachar y controlar en cubeta las tintas ya añadidas.
- **Favoritos con Persistencia Local:** Guarda colores frecuentes en `localStorage` sincronizado de forma reactiva y a prueba de SSR.
- **PWA Offline-Ready:** Instalable en la pantalla de inicio del teléfono móvil (`manifest.json` y `sw.js`), funcional sin conexión a internet en planta.

---

## 🛠️ Stack Técnico

- **Framework:** Next.js (App Router, React 19)
- **Lenguaje:** TypeScript (Tipado estricto, 0 `any`)
- **Estilos:** Tailwind CSS v4 (Paleta de alto contraste para visibilidad en planta)
- **Motor de Búsqueda:** Fuse.js
- **Iconografía:** Lucide React
- **PWA:** Service Worker propio + Manifest PWA

---

## 🚀 Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/abel322/app-pantonera.git
cd app-pantonera

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:3000
```

---

## 📦 Construcción para Producción

```bash
npm run build
npm run start
```

---

## 📄 Estructura del Proyecto

```text
├── public/
│   ├── manifest.json            # Configuración PWA
│   ├── sw.js                    # Service Worker Offline
│   └── icon-192.png / 512.png   # Iconografía de alta resolución
├── src/
│   ├── types/
│   │   └── pantone.ts           # Interfaces de datos estrictas
│   ├── data/
│   │   └── pantoneColors.ts     # Catálogo en memoria al 100.00%
│   ├── lib/
│   │   ├── calculator.ts        # Precisión de dosificación y unidades
│   │   └── utils.ts             # Utilidades de clases (cn)
│   ├── components/
│   │   ├── SearchBar.tsx        # Búsqueda difusa con Fuse.js
│   │   ├── ColorCard.tsx        # Tarjeta mobile con desglose visual
│   │   ├── DosingModal.tsx      # Sheet interactivo y checklist
│   │   └── ServiceWorkerRegister.tsx
│   └── app/
│       ├── layout.tsx           # Metadatos PWA y Viewport
│       ├── page.tsx             # Catálogo, filtros y favoritos
│       └── globals.css          # Estilos base industriales
```
