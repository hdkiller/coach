# Strategic Plan: Advanced Custom Analytics & Modular Dashboards

## 1. Executive Summary & Vision
The goal is to build a "Business Intelligence (BI) grade" analytics engine tailored for endurance sports coaching. The system must transition from static, hard-coded charts to a dynamic, configuration-driven **Widget Engine**. 

It must support:
- **System Charts:** High-value, pre-configured charts ready for immediate use.
- **User-Defined Charts:** A UI-driven chart builder for custom insights.
- **User-Defined Fields (Custom Metrics):** The ability for coaches/athletes to track arbitrary data (e.g., "Morning Hydration", "Knee Pain", "Perceived Exertion") and immediately chart it alongside core system metrics (HR, Power, TSS).
- **Modular Dashboards:** Drag-and-drop grids where these widgets can be placed, resized, and shared across a coaching team.

---

## 2. Core Architecture: The Chart Engine

To support user-defined charting, the frontend cannot be tightly coupled to specific API endpoints. Instead, we need an **Analytics Query Language (AQL)** handled by a single, powerful API endpoint (`POST /api/analytics/query`).

### 2.1 The Widget Definition Schema
Every chart is stored as a JSON configuration. This allows charts to be saved, shared, and rendered dynamically.

```json
{
  "id": "uuid",
  "name": "Volume vs. Intensity (Last 90 Days)",
  "type": "combo", // line, bar, scatter, radial, heatmap, combo
  "source": "workouts", // workouts, wellness, nutrition
  "scope": {
    "target": "athlete_group", // self, athlete, athlete_group, team
    "targetId": "group-uuid"
  },
  "timeRange": {
    "type": "rolling", // fixed, rolling, ytd
    "value": "90d"
  },
  "xAxis": {
    "field": "date",
    "grouping": "weekly" // daily, weekly, monthly
  },
  "yAxes": [
    {
      "id": "y-volume",
      "field": "durationSec",
      "aggregation": "sum", // sum, avg, max, min, count
      "type": "bar",
      "color": "#3b82f6"
    },
    {
      "id": "y-intensity",
      "field": "custom.perceived_exertion", // Accessing a user-defined field
      "aggregation": "avg",
      "type": "line",
      "color": "#ef4444",
      "axisPosition": "right"
    }
  ],
  "filters": [
    { "field": "type", "operator": "in", "value": ["Ride", "VirtualRide"] }
  ]
}
```

### 2.2 The Frontend Charting Wrapper
We will abstract the underlying chart library (currently Chart.js / `vue-chartjs`) behind a generic `<BaseWidget :config="widgetConfig" />` component. 
- This component is responsible for taking the JSON config, making the request to `/api/analytics/query`, translating the returned data into the chart library's format, and rendering it.
- **Future-proofing:** If we outgrow Chart.js (e.g., needing complex scatter plots with millions of points where ECharts or D3 is better), we only rewrite the `<BaseWidget>` adapter.

---

## 3. Data Architecture: User-Defined Fields

To allow users to chart arbitrary metrics without altering the SQL schema for every new metric, we will utilize **PostgreSQL JSONB columns**.

### 3.1 Database Schema Updates
We will add a `customMetrics` JSONB column to our core time-series tables:

```prisma
model Wellness {
  // ... existing fields (ctl, hrv, rhr, etc.)
  customMetrics Json?  @default("{}") // e.g., {"sleep_quality": 8, "soreness": 3}
  
  @@index([customMetrics], type: Gin) // GIN index for fast JSON querying
}

model Workout {
  // ... existing fields (durationSec, tss, etc.)
  customMetrics Json?  @default("{}") // e.g., {"coach_rating": "A", "weather": "hot"}
  
  @@index([customMetrics], type: Gin)
}

// Meta-table to define what custom fields exist for a Coach/Team
model CustomFieldDefinition {
  id          String   @id @default(uuid())
  ownerId     String   // Coach or Team ID
  entityType  String   // "Wellness" | "Workout"
  fieldKey    String   // "sleep_quality"
  label       String   // "Sleep Quality"
  dataType    String   // "number" | "boolean" | "string"
  unit        String?  // "/10", "kg"
  createdAt   DateTime @default(now())
}
```

### 3.2 Querying JSONB in Prisma
The `/api/analytics/query` endpoint will construct raw SQL or utilize Prisma's advanced JSON filtering to aggregate these dynamic fields.
*Example SQL generated under the hood:* 
`SELECT date_trunc('week', date), AVG((customMetrics->>'sleep_quality')::numeric) FROM Wellness GROUP BY 1;`

---

## 4. Phase 1: The System Charts Library

Before building the UI for user-defined charts, we will validate the engine by shipping high-value system presets. These are hardcoded JSON configurations passed to the `<BaseWidget>`.

| Category | System Chart Name | Data Logic (Aggregation) | Visual Type |
| :--- | :--- | :--- | :--- |
| **Performance** | Performance Management (PMC) | Daily CTL, ATL, TSB | Line (Dual Axis) |
| **Performance** | Power Duration Curve (MMP) | Max power over time intervals | Scatter/Line (Log Axis) |
| **Compliance** | 12-Week Adherence Trend | Sum of Completed vs Planned duration/TSS | Stacked Bar |
| **Health** | Recovery Correlation | Avg HRV vs Avg Readiness Score over time | Scatter |
| **Volume** | Load Distribution | Sum duration grouped by Heart Rate/Power Zones | Horizontal Bar |
| **Team (Coach)** | Roster Fatigue Heatmap | TSB grouped by Athlete (Y) and Date (X) | Heatmap |
| **Team (Coach)** | Cohort Load Comparison | Avg CTL grouped by Athlete Group over time | Multi-line |

---

## 5. Phase 2: The Chart Builder (User-Defined Charts)

Once the engine is stable, we expose the configuration object to the user via a UI.

### 5.1 The Builder Interface
A multi-step modal or drawer:
1. **Data Source:** Select `Workouts`, `Wellness`, or `Nutrition`.
2. **Metrics (Y-Axis):** Select fields (including `CustomFieldDefinitions`). Choose aggregation (Sum, Avg, Max).
3. **Dimension (X-Axis):** Usually `Time` (grouped by Day, Week, Month), but could be categorical (e.g., Group by `Sport Type`).
4. **Filters:** Add rules (e.g., `Sport = Cycling`, `Duration > 60m`).
5. **Display:** Choose chart type, colors, and axis positions.

### 5.2 Interactive Previews
The builder will have a live-preview pane that executes the AQL against the backend as the user tweaks settings.

---

## 6. Phase 3: Modular Dashboards

With charts defined as standalone entities (Widgets), we can place them on a flexible grid.

### 6.1 Dashboard Infrastructure
- **Grid System:** Use a library like `vue-grid-layout` or a native CSS Grid implementation for drag-and-drop, resizable widgets.
- **Dashboard Model:**
```prisma
model Dashboard {
  id        String   @id @default(uuid())
  ownerId   String   // User or Team ID
  name      String
  layout    Json     // [{ widgetId: "uuid", x: 0, y: 0, w: 4, h: 2 }]
  widgets   Widget[] // Relation to saved Chart Configurations
}
```

### 6.2 Coaching Context: Global vs. Scoped Dashboards
- **Global Dashboards:** View aggregated data across an entire team (e.g., "Team Health Overview").
- **Scoped Dashboards:** A coach creates an "Athlete Profile" template. When they click on Athlete A, the dashboard populates the widgets specifically with Athlete A's data via the `targetId` context.

---

## 7. Execution Roadmap & Sequence

1. **Track 1: Database & Engine Core (MVP)**
   - Implement `CustomFieldDefinition` and JSONB columns.
   - Build `/api/analytics/query` capable of securely fetching and aggregating standard + JSONB fields.
2. **Track 2: Component Library & System Presets**
   - Build `<BaseWidget />` wrapping Chart.js.
   - Implement the 5-7 System Charts listed in Phase 1.
   - Replace static charts on the current Athlete Profile with these dynamic widgets.
3. **Track 3: The Chart Builder UI**
   - Build the UI for creating and saving custom configurations.
   - Allow adding these custom charts to a single, vertical "Custom Reports" list.
4. **Track 4: The Grid Layout System**
   - Introduce the drag-and-drop dashboard canvas.
   - Allow pinning system charts and custom charts to distinct dashboard pages.

---

## 8. UI/UX & Routing Architecture

To ensure a seamless user experience, the analytics features will be deeply integrated into the platform's layout structure using our established Nuxt UI v4 patterns (`UDashboardPanel`, `UDashboardNavbar`, etc.) and consistent form styling.

### 8.1 Routes & Navigation Structure
- `/analytics`: The main analytics hub. 
  - Uses `UDashboardPage` and `UDashboardPanel`.
  - For athletes, this shows their personal dashboard. 
  - For coaches, it defaults to a global/team view with a toggle (via `UTabs` or a custom `USelect` in the `UDashboardNavbar` `#right` slot) to switch between context scopes (e.g., "My Data" vs. "Team Data").
- `/analytics/builder`: The dedicated interface for creating and saving user-defined charts. Available to all users. Uses a full-screen or split-pane `UDashboardPanel` layout.
- `/coaching/teams/[id]/analytics`: The team-specific dashboard view (Coach/Admin only). Integrated as a new tab (`<template #analytics>`) within the existing `UTabs` structure on the `app/pages/coaching/teams/[id].vue` page.
- `/coaching/athletes/[id]/analytics`: The athlete-specific analytics view for coaches. Integrated as a tab within the athlete detail page (`app/pages/coaching/athletes/[id]/index.vue`).

### 8.2 UI Components & Layout Definition
- **Dashboard Canvas (`<DashboardGrid />`)**: 
  - Resides within the `<template #body>` of a `UDashboardPanel`.
  - A fluid, responsive grid utilizing a grid library (e.g., `vue-grid-layout`) or native CSS Grid.
  - Allows widgets to be dragged, dropped, and resized freely.
- **Widget Container (`<WidgetCard />`)**: 
  - Wraps the generic `<BaseWidget />` with a standardized `UCard`.
  - Header styling must match our standard cards: `flex items-center justify-between` with a title and a contextual dropdown menu (`UDropdown` with a `ghost` `neutral` button) for actions like "Edit", "Expand/Fullscreen", and "Remove from Dashboard".
- **Chart Builder UI (`<ChartBuilderWizard />`)**:
  - A split-pane layout utilizing the full width of the screen.
  - **Left Pane (Controls):** 
    - Must follow our strict form styling: Wrapped in `UFormField` with `label` and `help` text.
    - All inputs (`UInput`, `USelect`, `UTextarea`) must use `class="w-full"`.
    - Utilizes `USelect` (with `items` prop for v4 compatibility) for selecting data sources, metrics, and grouping.
  - **Right Pane (Preview):** A large, live-updating instance of `<BaseWidget />` within a `UCard` that reflects the changes made in the left pane in real-time.

### 8.3 UX Workflows & Modals
- **Creating a Custom Chart:** A user navigates to `/analytics/builder`. They use the left-hand controls to select "Workouts" -> "Duration" -> "Weekly Sum". The right-hand preview fetches data and updates instantly. Once satisfied, they click a `primary` `solid` "Save Chart" button.
- **Adding a Widget to a Dashboard:** 
  - On any dashboard view (e.g., `/analytics`), the user clicks an "Add Widget" button (styled as `color="neutral" variant="outline"`). 
  - A modal (`<WidgetLibraryModal />`) appears, using `UModal` with standard `title` and `description` props.
  - The modal body presents a searchable, categorized grid of both System Charts and saved User-Defined Charts. Selecting a chart immediately places it onto the grid canvas.
- **Editing an Existing Widget:** A user clicks the "Settings" action on a `<WidgetCard />`. This opens a slide-over (`<USlideover />`) on the right side of the screen containing the standardized `UFormField` builder controls, allowing them to tweak the configuration without leaving the dashboard context.
