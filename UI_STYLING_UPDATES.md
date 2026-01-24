# Vault PWA - UI Styling & Theme Updates

## Overview
Comprehensive UI redesign focusing on mobile-first design, visual status indicators, and a modern Amanah-inspired aesthetic with theme switching capabilities.

---

## 1. Privacy & Relay Status Bar (`/components/privacy-status-bar.tsx`)

**Features:**
- Real-time connection status for Nostr and Blossom protocols
- Visual indicators (green check = connected, yellow alert = offline)
- End-to-end encryption badge with pulsing animation
- **Theme Toggle Button** (Light/Dark mode switcher)
- Uses localStorage to persist user preference
- Mobile-friendly with responsive spacing

**Status Indicators:**
- Shield icon with "End-to-End Encrypted" label
- Nostr connection status with checkmark or alert icon
- Blossom connection status with WiFi icons
- Smooth transitions between states

---

## 2. Bento Box Grid Layout (`/components/file-viewer.tsx`)

**Layout Transformation:**
- **Before:** Single-column list with horizontal cards
- **After:** Multi-column responsive grid (1 → 2 → 3 columns)
- Uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `auto-rows-max` for flexible card heights

**Card Features:**
- Compact header with file icon + action buttons (download, delete)
- File name with lock icon showing encryption status
- File size + upload date on single row
- Encryption key hash preview (first 12 characters)
- Download progress indicator below content
- Smooth hover effects and ring focus states

**Mobile Safety:**
- Touch-friendly button sizes (8×8 or 32px minimum)
- Responsive padding: `p-4 sm:p-5 md:p-6 lg:p-8`
- Text wrapping with `line-clamp-2` for long filenames
- Proper spacing for small screens

---

## 3. Segmented Progress Bar (`/components/file-upload-area.tsx`)

**Implementation:**
- 8-segment grid representing 5MB chunks (0-40MB visible)
- Each segment fills progressively as upload progresses
- Color states:
  - `bg-secondary/50` = Not started
  - `bg-primary/60` = In progress
  - `bg-primary` = Complete
- Hover tooltips showing chunk size: "Chunk 1: 5MB", "Chunk 2: 10MB", etc.
- Real-time visual feedback during upload

**CSS Grid Approach:**
```tailwind
grid grid-cols-8 gap-1 h-2
```

---

## 4. Floating Action Button (FAB) (`/components/file-upload-area.tsx`)

**Design:**
- Fixed positioning at bottom-right corner
- **Desktop:** `bottom-8 right-8` with 64×64px (w-16 h-16)
- **Mobile:** `bottom-6 right-6` with 56×56px (w-14 h-14)
- Fully rounded: `rounded-full`
- Drop shadow with hover enhancement
- Plus icon while idle, spinning checkmark during upload
- Respects safe areas for notched devices

**Responsive Behavior:**
- Adapts to different screen sizes
- Never covers critical content
- Accessible with proper `title` attribute
- Disabled state during active uploads

---

## 5. Mobile-Safe Padding & Layout (`/components/vault-dashboard.tsx`)

**Responsive Padding Scale:**
- **Mobile (base):** `p-4 sm:p-5 md:p-6 lg:p-8`
- Header uses `px-4 sm:px-6 lg:px-8` for edge safety
- Sidebar uses `p-4 sm:p-5 md:p-6` for comfortable scrolling
- Main content uses `p-4 sm:p-5 md:p-6 lg:p-8`

**Android/Capacitor Compatibility:**
- Respects safe area insets
- No fixed positioning conflicts with status bars
- Proper viewport handling for bottom navigation
- Touch targets minimum 44×44px (8 or 10 spacing units)

**Layout Structure:**
- Flexible row/column switching: `flex flex-col lg:flex-row`
- Border adaptations: `border-b lg:border-b-0 lg:border-r`
- Max-width constraint: `max-w-7xl` for readability

---

## 6. Theme Switching System

**Implementation:**
- Toggle button in Privacy Status Bar
- Persists preference to localStorage (`vault-theme`)
- Applies/removes `dark` class on `html` element
- Uses existing CSS custom properties (OKLCH colors)

**Theme Colors (Amanah-Inspired):**

### Light Mode
```css
--background: oklch(0.98 0.01 70)     /* Off-white warmth */
--foreground: oklch(0.22 0.02 35)     /* Dark brown */
--primary: oklch(0.54 0.14 32)        /* Warm brown */
--secondary: oklch(0.88 0.08 60)      /* Light beige */
```

### Dark Mode
```css
--background: oklch(0.15 0.01 35)     /* Deep brown */
--foreground: oklch(0.95 0.01 70)     /* Warm white */
--primary: oklch(0.68 0.12 45)        /* Warm gold */
--secondary: oklch(0.35 0.04 55)      /* Mid-brown */
```

---

## 7. Component Updates Summary

### PrivacyStatusBar
- New component for connection status
- Theme toggle integration
- Responsive flex layout

### VaultDashboard
- Added PrivacyStatusBar at top
- Enhanced padding responsiveness
- Plus icon in vault creation button
- Better mobile spacing

### FileViewer
- Converted to 3-column bento grid
- Improved card information hierarchy
- Touch-friendly action buttons
- Progress indicator integration

### FileUploadArea
- Segmented progress bar with 8 segments
- FAB button implementation
- Mobile-optimized spacing
- Better visual feedback during upload

---

## 8. Design Tokens & Colors

**Used in Implementation:**
- `text-balance` & `text-pretty` for titles
- `line-clamp-2` for filename overflow
- `animate-spin` for loading states
- `transition-all` for smooth interactions
- OKLCH color space for perceptually uniform colors

---

## Mobile-First Approach

All components follow mobile-first responsive design:
1. **Base styles:** Mobile (320px+)
2. **sm:** Small devices (640px+)
3. **md:** Tablets (768px+)
4. **lg:** Desktops (1024px+)

---

## Testing Checklist

- [ ] Theme toggle works and persists
- [ ] Status bar shows correct connection states
- [ ] File grid responsive at all breakpoints
- [ ] FAB doesn't overlap content on mobile
- [ ] Progress bar segments fill correctly during upload
- [ ] Mobile padding safe on Android
- [ ] Touch targets are adequate (44×44px minimum)
- [ ] Dark mode colors have sufficient contrast
- [ ] Icons animate smoothly during loading
- [ ] Safe area insets respected on notched devices
