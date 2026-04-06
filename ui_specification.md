# AirOne Studio UI Specification - Dashboard & Sidebar

This document describes the current UI architecture and design tokens for the AirOne Studio Dashboard, intended for use by design agents and developers to maintain visual consistency.

---

## 🎨 Global Design Tokens

### **Typography**
- **Main Font**: [Inter](https://rsms.me/inter/) (Google Variable Font).
- **Aesthetic**: Mimics the **Linear.app** design system.
- **Micro-adjustments** (applied in `globals.css`):
  - `letter-spacing: -0.011em` (Tight tracking for a premium "T3" feel).
  - `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` (Enabled single-story 'a' and other refined characters).
  - `-webkit-font-smoothing: antialiased` (Hyper-crisp text rendering).

### **Color Palette & Theme**
- **Theme**: Dark Mode by default.
- **Colors**: Uses `oklch` color spaces for modern, wide-gamut compatibility.
- **Radius**: `0.625rem` (10px) for general cards and inputs.

---

## 🗃️ Sidebar Architecture (`AppSidebar`)

The sidebar is built using the **shadcn/ui Sidebar** primitive and is highly optimized for a dense, professional look.

### **1. Branding Header**
- **Label**: "AirOne Studio" (`font-semibold`, `text-base`).
- **Icon**: `Sparkles` (`size-4`).
- **Container**: Rounded border (`border-2 border-border`), `h-14` header height.

### **2. Main Navigation Items**
- **Scale**: `size="sm"` (Reduced height and padding).
- **Text Style**: `text-sm` (14px) with `font-medium`.
- **Icon Size**: **`size-4`** (16px) overridden locally in `app-sidebar.tsx`.
- **Global SVG Class**: `[&_svg]:size-4.5` (18px) defined in the base `sidebar.tsx` variants.
- **Structure**: Supports standard links and **Collapsible** groups with `ChevronRight` indicator.

### **3. Collapsible / Sub-items**
- **Sub-item Labels**: `text-sm`.
- **Indentation**: Sub-items are nested with a subtle left border (`border-l`).
- **Icon**: `ChevronRight` (`size-4`).

### **4. Navigation Mapping**
- **Home**: `/dashboard` (`Home` icon)
- **Projects**: `/dashboard/projects` (`Folder` icon)
- **Assets**: `/dashboard/assets` (`ImageIcon`)
- **Create**: (Collapsible)
  - New Project: `/dashboard/projects/new`
  - New Asset: `/dashboard/assets/new`
- **Gallery**: `/dashboard/gallery` (`LayoutGrid` icon)

### **5. Footer**
- **Component**: `UserButton` from `@daveyplate/better-auth-ui`.
- **Padding**: `p-4`.

---

## 🍞 Breadcrumb System

The breadcrumbs are located in the sticky dashboard header and share the same proportions as the sidebar items for visual harmony.

- **Font**: `text-sm font-medium`.
- **Color**: `text-foreground`.
- **Spacing**: Integrated with the `SidebarTrigger` and `Separator` for clean layout hierarchy.

---

## 🛠️ Implementation References
- **Global Styles**: [globals.css](file:///c:/Users/mkhizecj/Desktop/Projectjune/aironeaistudio%20-%20Copy/aironestudio2/src/styles/globals.css)
- **Sidebar Structure**: [app-sidebar.tsx](file:///c:/Users/mkhizecj/Desktop/Projectjune/aironeaistudio%20-%20Copy/aironestudio2/src/components/app-sidebar.tsx)
- **Sidebar Variants**: [sidebar.tsx](file:///c:/Users/mkhizecj/Desktop/Projectjune/aironeaistudio%20-%20Copy/aironestudio2/src/components/ui/sidebar.tsx)
