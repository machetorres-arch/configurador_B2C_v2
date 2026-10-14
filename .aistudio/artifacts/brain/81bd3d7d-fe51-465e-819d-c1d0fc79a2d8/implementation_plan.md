# Plan de Implementación: Frontend Responsive (Móvil y Tablet) con Pantalla Dividida

Propuesta integral de adaptación visual y táctil para teléfonos móviles y tablets, implementando un diseño de pantalla dividida ergonómica (visor 3D interactivo en la mitad superior y controles/menús desplegables en la mitad inferior) y optimización en tablets y desktop, bajo estricto aislamiento de motores de cálculo y almacenes globales.

---

## Decisiones Críticas y Aprobación del Usuario

> [!IMPORTANT]
> **Decisión confirmada por el usuario:** En teléfonos móviles, el configurador 3D/2D ocupará la **mitad superior** de la pantalla fija (~42vh - 50vh) permitiendo rotar, orbitar y visualizar la cocina sin obstrucciones, mientras que los paneles de herramientas, catálogo de módulos, propiedades paramétricas, acabados y herrajes se organizarán y desplegarán en la **mitad inferior** mediante un sistema de pestañas deslizables y hojas de control táctil con scroll independiente.

- **Diseño Móvil (Smartphones < 768px)**: Distribución vertical `flex-col` en altura total (`100dvh`):
  - **Zona Superior**: Topbar compacta + Lienzo 3D/2D interactivo con botones flotantes táctiles (Plano 2D / Vista 3D, Cotas, Pantalla Completa, Deshacer/Rehacer).
  - **Zona Inferior**: Barra de navegación por pestañas ergonómica (*Módulos*, *Propiedades*, *Acabados*, *Herrajes*, *MEP*, *Escena*) con área scrollable táctil para interactuar con cajones, repisas, frentes, cotas y materiales.
- **Diseño Tablet (768px – 1024px)**: 
  - En vertical (Portrait): Split adaptativo 50/50 o 55/45 con área de trabajo optimizada para dedos (touch targets $\ge 44\text{px}$).
  - En horizontal (Landscape): Panel lateral colapsable o barra lateral compacta que maximiza el área 3D con accesos rápidos.
- **Scope Lock & Aislamiento Quirúrgico**:
  - Cero cambios en `kitchenStore.ts`, `closetStore.ts`, motores de nesting/corte (`kitchenManufacturing.ts`, `countertopNesting.ts`, `nesting.ts`).
  - Cero cambios en generadores de reportes (`kitchenExcelGenerator.ts`, `kitchenPdfGenerator.ts`, `cadBimExport.ts`).
  - Intervención 100% circunscrita a la capa de presentación React/Tailwind (`KitchenConfigurator.tsx`, `Home.tsx` y modales asociados).

---

## 1. Visión General y Experiencia de Usuario

### 1.1 Objetivo
Permitir a arquitectos, proyectistas, fabricantes y clientes finales configurar cocinas en terreno, talleres o visitas técnicas directamente desde su smartphone o tablet con la misma potencia técnica que en desktop, sin botones solapados ni desplazamientos horizontales rotos.

### 1.2 Flujo en Teléfono Móvil
```
┌──────────────────────────────────────────────┐
│ [Logo arquify] [2D/3D] [Cotas] [Undo/Redo] [⋮] │  <- Topbar compacta (~48px)
├──────────────────────────────────────────────┤
│                                              │
│               VISOR 3D / 2D                  │  <- Mitad Superior (~45-50vh)
│          (OrbitControls, Zoom, Pan)          │     Controles flotantes discretos
│                                              │
├──────────────────────────────────────────────┤
│ [Módulos] [Módulo Activo] [Acabados] [Herrajes]│  <- Pestañas de categoría (Sticky)
├──────────────────────────────────────────────┤
│                                              │
│        OPCIONES Y CONTROLES DESPLEGADOS      │  <- Mitad Inferior (~50-55vh)
│      - Catálogo de Módulos (Bases/Torres...) │     Scroll vertical independiente
│      - Sliders de Ancho/Alto/Prof.           │     Touch targets >= 44px
│      - Paletas de Melaminas y Tiradores      │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 2. Estrategia de Diseño y Componentes

### 2.1 Topbar Compacta y Menú Secundario "Más Acciones"
- En pantallas móviles y tablets (`< lg:`), la barra superior colapsa los botones no esenciales (Cotización B2B, Exportar BIM, Guardar Proyecto, Partir de Cero, Modo Claro/Oscuro) en un botón de menú desplegable limpio (`⋮ Más`) o panel de acciones.
- Mantiene a la vista únicamente lo fundamental: Selector 2D/3D, botón de Cotas y botones Deshacer/Rehacer táctiles.

### 2.2 Visor 3D Superior
- Altura controlada mediante `h-[45vh] sm:h-[48vh] lg:h-full` con `relative w-full overflow-hidden`.
- Controles de vista (Plano 2D / 3D y Nivel de Cotas) como botones flotantes translúcidos (`backdrop-blur-md bg-black/40 text-white rounded-xl border border-white/10`) en las esquinas superiores, respetando la regla del 15% de superficie fija.
- Soporte táctil natural de OrbitControls (un dedo rotar, dos dedos pinch-to-zoom y paneo).

### 2.3 Panel Inferior de Configuración (Consola Táctil)
- Selector de pestañas horizontal con desplazamiento suave (`overflow-x-auto no-scrollbar`):
  1. **Módulos**: Listado por acordeones táctiles (1. Bases, 2. Torres & Despensas, 3. Murales & Aéreos, 4. Equipamiento & Islas).
  2. **Propiedades**: Controles del mueble o elemento seleccionado (Sliders táctiles de dimensiones, puertas, cajones, repisas y botón Eliminar/Girar).
  3. **Acabados**: Selección de melaminas, texturas y zócalos con muestras cuadradas visuales.
  4. **Herrajes & Gola**: Tiradores, sistemas Gola y bisagras.
  5. **MEP & Redes**: Trazado de gas, agua, desagüe y electricidad con alertas de interferencia.
  6. **Escena / Lista**: Listado ordenado de módulos colocados (MOD 1, MOD 2...) con botón de eliminación rápida y giro.
- Pestaña contextual automática: Al pulsar un mueble en el 3D, el panel inferior activa automáticamente la pestaña **Propiedades** para edición inmediata sin clicks extras.

### 2.4 Modales Responsivos
- Modales como *Planificador de Área (RoomPlannerModal)*, *Cubiertas Qstone (CountertopConfigModal)*, *Cotización B2B* y *Exportar BIM* adaptados con `max-h-[90dvh] w-[95vw] sm:max-w-xl md:max-w-2xl` y scroll interno, asegurando que nunca se corten en pantallas pequeñas.

---

## 3. Arquitectura y Plan de Modificación Quirúrgica

```
┌──────────────────────────────────────────────────────────────┐
│                      Página Principal                        │
│                 src/pages/KitchenConfigurator.tsx            │
├───────────────────────────────┬──────────────────────────────┤
│ Desktop / Landscape           │ Mobile / Tablet Portrait     │
│ (lg:flex-row)                 │ (< lg: flex-col h-[100dvh])  │
│ ├── Sidebar Izquierdo (72)    │ ├── Topbar Compacta          │
│ ├── Lienzo Central (flex-1)   │ ├── Visor 3D (Mitad Superior)│
│ └── Sidebar Derecho (96)      │ └── Consola (Mitad Inferior) │
└───────────────────────────────┴──────────────────────────────┘
```

### Archivos a Intervenir (Exclusivamente Frontend)
1. **`src/pages/KitchenConfigurator.tsx`**:
   - Ajustar el layout contenedor: `<main className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">`.
   - Contenedor del visor 3D: en móvil `h-[45vh] lg:h-full lg:flex-1`.
   - Sidebars izquierdo y derecho: en desktop se conservan como columnas fijas; en móvil/tablet se integran en una consola inferior multi-pestaña scrollable con pestañas touch-friendly.
   - Navegación superior: botones compactos + menú desplegable para exportación/guardado.
2. **`src/pages/Home.tsx`**:
   - Ajuste de espaciados, paddings y tamaños de tipografía para smartphones (`text-3xl sm:text-5xl`, `p-4 sm:p-8`).

---

## 4. Verificación y Criterios de Aceptación
1. **Simulación en móviles**: Probar en anchos 375px (iPhone SE/mini), 390px (iPhone 14/15) y 412px (Samsung/Pixel).
2. **Simulación en tablets**: Probar en 768px (iPad vertical) y 1024px (iPad horizontal).
3. **Cero Regresiones**:
   - Funcionalidad de inserción de muebles intacta.
   - Cotas y niveles de cota (1 al 6) funcionando.
   - Guardado, Cotización B2B y Exportación BIM 100% operativos.
   - Compilación exitosa con TypeScript (`compile_applet`).
