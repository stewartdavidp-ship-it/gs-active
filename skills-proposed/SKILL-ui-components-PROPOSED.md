---
name: ui-components
description: UI patterns, colors, and components for Game Shelf ecosystem. Ensures consistent dark mode styling, modals, buttons, and mobile-friendly design across all apps.
---

# UI Components for Game Shelf

## 🛑 MANDATORY RULES

### ❌ NEVER USE THESE

| NEVER | USE INSTEAD |
|-------|-------------|
| `alert()` | `showToast()` or custom modal |
| `confirm()` | `showConfirm()` custom dialog |
| `prompt()` | Custom input modal |
| Light mode as default | Dark mode is ALWAYS default |
| Fixed pixel widths | Use responsive units (%, vw, rem) |
| Inline styles for colors | Use CSS variables |

### ✅ ALWAYS DO THESE

| ALWAYS | WHY |
|--------|-----|
| Use CSS variables for colors | Consistency, easy theming |
| Dark mode by default | All Game Shelf apps are dark mode |
| Mobile-first responsive | Most users are on mobile |
| Use existing component patterns | Consistency across apps |
| Stop propagation on modal content | Prevents close when clicking inside |

---

## 🎨 COLOR PALETTE (MANDATORY)

### Dark Mode Colors (Default for ALL apps)

```css
:root {
    /* Backgrounds - darkest to lightest */
    --bg-primary: #1a1a2e;      /* Main background */
    --bg-secondary: #16213e;     /* Cards, sections */
    --bg-tertiary: #0f0f23;      /* Deeper elements */
    
    /* Text */
    --text-primary: #e8e6e3;     /* Main text */
    --text-secondary: #a0a0a0;   /* Muted text */
    --text-muted: #6b7280;       /* Very muted */
    
    /* Accents */
    --accent-primary: #667eea;   /* Purple - main brand */
    --accent-secondary: #764ba2; /* Purple - darker */
    --accent-pink: #f093fb;      /* Pink accent */
    
    /* Status colors */
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
    --info: #3b82f6;
}
```

### App-Specific Accent Colors

| App | Primary | Secondary | Use Case |
|-----|---------|-----------|----------|
| **Game Shelf** | `#667eea` | `#764ba2` | Buttons, highlights |
| **Quotle** | `#8B0000` | `#D4AF37` | Burgundy + gold |
| **Slate** | `#2a4a3a` | `#22c55e` | Chalkboard green |
| **Rungs** | `#f97316` | `#ea580c` | Orange ladder |
| **Word Boxing** | `#c41e3a` | `#991b1b` | Boxing red |

---

## 📦 COMPONENT PATTERNS

### Toast Notification (Use Instead of alert())

```javascript
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: fadeInUp 0.2s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}
```

### Modal / Bottom Sheet

```html
<!-- Modal Overlay -->
<div class="modal-overlay" onclick="closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2>Modal Title</h2>
        <!-- Content here -->
    </div>
</div>
```

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-end;  /* Bottom sheet style */
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
}

.modal-content {
    background: var(--bg-secondary);
    border-radius: 16px 16px 0 0;
    padding: 24px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
}

.modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 24px;
    cursor: pointer;
}

@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### Confirm Dialog (Use Instead of confirm())

```javascript
function showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 400px; border-radius: 16px; margin: auto;">
                <h3 style="margin: 0 0 16px; color: var(--text-primary);">${title}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove(); window._confirmResolve(false)">Cancel</button>
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove(); window._confirmResolve(true)">Confirm</button>
                </div>
            </div>
        `;
        window._confirmResolve = resolve;
        document.body.appendChild(overlay);
    });
}

// Usage
const confirmed = await showConfirm('Delete this item?', 'Confirm Delete');
if (confirmed) { /* proceed */ }
```

### Buttons

```css
/* Primary - Gradient */
.btn-primary {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:active {
    transform: translateY(0);
}

/* Secondary - Outline */
.btn-secondary {
    background: transparent;
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
}

/* Danger */
.btn-danger {
    background: var(--danger);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
}

/* Disabled state */
.btn-primary:disabled,
.btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

### Cards

```css
.card {
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.card-title {
    font-weight: 600;
    color: var(--text-primary);
}
```

---

## 📱 RESPONSIVE DESIGN

### Mobile-First Breakpoints (MANDATORY)

```css
/* Mobile first - base styles */
.container {
    padding: 16px;
    width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
    .container {
        padding: 24px;
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .container {
        max-width: 1200px;
        margin: 0 auto;
    }
}
```

### Safe Areas (for notched phones)

```css
.app-container {
    padding-bottom: env(safe-area-inset-bottom, 0);
}

.bottom-nav {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
}
```

---

## 🎯 COMMON PATTERNS

### Loading Spinner

```html
<div class="spinner"></div>
```

```css
.spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--bg-tertiary);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

### Empty State

```html
<div class="empty-state">
    <div class="empty-icon">📭</div>
    <h3>No items yet</h3>
    <p>Start by adding something</p>
</div>
```

```css
.empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-secondary);
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
}
```

### Floating Action Button (FAB)

```css
.fab {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    z-index: 100;
}
```

---

## ❌ ANTI-PATTERNS TO AVOID

| Don't | Do |
|-------|-----|
| `alert('Error!')` | `showToast('Error!')` |
| `if (confirm('Sure?'))` | `if (await showConfirm('Sure?'))` |
| `background: #1a1a2e` | `background: var(--bg-primary)` |
| `width: 400px` | `width: 100%; max-width: 400px` |
| Light backgrounds | Always dark mode |
| Tiny tap targets | Min 44px touch targets |
