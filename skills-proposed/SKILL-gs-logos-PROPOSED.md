---
name: gs-logos
description: Game Shelf logo assets and usage guidelines. Reference this skill when adding Game Shelf branding to any app. Contains inline SVG code for both badge and horizontal logos.
---

# Game Shelf Logo Assets

## 🎯 QUICK REFERENCE

| Logo Type | Use Case |
|-----------|----------|
| Badge (Square) | App icons, favicons, PWA icons |
| Horizontal | Headers, navigation bars |
| Gradient Colors | Buttons, accents, backgrounds |

---

## 🏷️ BADGE LOGO (Square)

**Copy-paste ready SVG:**

```html
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="gsBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea"/>
            <stop offset="100%" style="stop-color:#764ba2"/>
        </linearGradient>
    </defs>
    <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#gsBadgeGrad)"/>
    <g transform="rotate(-12, 35, 50)">
        <rect x="15" y="28" width="28" height="36" rx="4" fill="white"/>
        <circle cx="43" cy="46" r="6" fill="white"/>
        <text x="29" y="54" font-family="Arial" font-size="20" font-weight="bold" fill="#667eea" text-anchor="middle">G</text>
    </g>
    <g transform="rotate(12, 65, 50)">
        <rect x="57" y="28" width="28" height="36" rx="4" fill="rgba(255,255,255,0.9)"/>
        <circle cx="57" cy="46" r="6" fill="url(#gsBadgeGrad)"/>
        <text x="71" y="54" font-family="Arial" font-size="20" font-weight="bold" fill="#764ba2" text-anchor="middle">S</text>
    </g>
</svg>
```

### Inline Usage (React/JSX)

```jsx
const GameShelfLogo = ({ size = 40 }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="gsBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#667eea'}}/>
                <stop offset="100%" style={{stopColor:'#764ba2'}}/>
            </linearGradient>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#gsBadgeGrad)"/>
        <g transform="rotate(-12, 35, 50)">
            <rect x="15" y="28" width="28" height="36" rx="4" fill="white"/>
            <circle cx="43" cy="46" r="6" fill="white"/>
            <text x="29" y="54" fontFamily="Arial" fontSize="20" fontWeight="bold" fill="#667eea" textAnchor="middle">G</text>
        </g>
        <g transform="rotate(12, 65, 50)">
            <rect x="57" y="28" width="28" height="36" rx="4" fill="rgba(255,255,255,0.9)"/>
            <circle cx="57" cy="46" r="6" fill="url(#gsBadgeGrad)"/>
            <text x="71" y="54" fontFamily="Arial" fontSize="20" fontWeight="bold" fill="#764ba2" textAnchor="middle">S</text>
        </g>
    </svg>
);
```

---

## 📏 HORIZONTAL LOGO (Text + Icon)

```html
<div class="gs-logo-horizontal" style="display: flex; align-items: center; gap: 8px;">
    <!-- Badge icon at small size -->
    <svg viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <!-- Same badge SVG as above -->
    </svg>
    <span style="font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        Game Shelf
    </span>
</div>
```

---

## 🎨 BRAND COLORS

### Primary Gradient
```css
background: linear-gradient(135deg, #667eea, #764ba2);
```

### Individual Colors
| Name | Hex | Usage |
|------|-----|-------|
| Purple Primary | `#667eea` | Main brand color |
| Purple Secondary | `#764ba2` | Gradient end, darker accent |
| Pink Accent | `#f093fb` | Highlights, S puzzle piece |

### CSS Variables
```css
:root {
    --gs-purple: #667eea;
    --gs-purple-dark: #764ba2;
    --gs-pink: #f093fb;
    --gs-gradient: linear-gradient(135deg, #667eea, #764ba2);
}
```

---

## 📦 COMMAND CENTER USAGE

In Command Center, apps use `icon` field:

```javascript
// Game Shelf uses special logo identifier
gameshelf: {
    id: 'gameshelf',
    icon: 'gs-logo',  // Renders SVG logo
    // ...
}

// Other apps use emoji
quotle: {
    id: 'quotle', 
    icon: '💬',
    // ...
}
```

The `AppIcon` component handles rendering:

```javascript
const AppIcon = ({ icon, size = 20 }) => {
    if (icon === 'gs-logo') {
        return <Icons.GameShelfLogo size={size} />;
    }
    return <span style={{ fontSize: size }}>{icon}</span>;
};
```

---

## 📱 PWA ICON SIZES

For PWA manifests, generate these sizes:

| Size | Use |
|------|-----|
| 72×72 | Legacy Android |
| 96×96 | Legacy Android |
| 128×128 | Chrome Web Store |
| 144×144 | Windows tiles |
| 152×152 | iOS |
| 192×192 | Android, PWA standard |
| 384×384 | PWA splash |
| 512×512 | PWA standard, largest |

**Maskable icons** (for adaptive icon systems):
- 192×192 maskable
- 512×512 maskable

Note: Production icons are purple, test mode icons are orange.
