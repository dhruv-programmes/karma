# CarbonLoop UI Aesthetic Contract: Home Page Artism & Cleanliness

This rule sets the mandatory, non-negotiable visual design standard for all screens, components, and UI refactors across the mobile application. Whenever the user requests to "clean the UI", "redesign the UI", or improve aesthetics, this contract must be followed.

---

## 1. Canvas Foundation
- **Screen Background**: Always use the signature clean botanical canvas `#F4FAF6`.
- **Sub-Screens**: Keep the canvas uniform and quiet. Depth, warmth, and artistic delight must come strictly from the layered card surfaces, not from garish multi-colored section backgrounds.
- **Double Borders**: Never wrap cards in outer "frost" or padding frames (e.g. `<View style={styles.frost}><Card /></View>`). Cards must sit directly and cleanly on the `#F4FAF6` canvas.

---

## 2. The Signature Frosted Glass Morphism (Card Architecture)
Every primary card and content container must follow the Home Page's signature frosted glass morphism:

```tsx
<View style={styles.glassCard}>
  <BlurView
    intensity={Platform.OS === "ios" ? 50 : 85}
    tint="light"
    style={StyleSheet.absoluteFill}
  />
  <LinearGradient
    colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 0.85, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
  {/* Clean Content */}
</View>
```

### Card Style Specifications:
- `backgroundColor: "transparent"`
- `borderRadius: 22` (range: 20–24px, generous organic pebble radii)
- `padding: 18`
- `borderWidth: 1.2`
- `borderColor: "rgba(255, 255, 255, 0.82)"` (or soft sage `rgba(215, 235, 222, 0.95)`)
- `overflow: "hidden"` (mandatory for BlurView & gradient clipping)
- `shadowColor: "#0A2415"`
- `shadowOpacity: 0.08`
- `shadowRadius: 12`
- `shadowOffset: { width: 0, height: 4 }`
- `elevation: 3`

---

## 3. ABSOLUTELY ZERO PILL BOXES (Golden Rule)
**NEVER use enclosed pill or capsule boxes anywhere in the app, even if deemed required.**

### Forbidden Patterns:
- ❌ Top-right pill badges (e.g. `Close to Limit`, `On Track`, `Over Budget`, `High Impact`).
- ❌ Enclosed pill tags wrapping point values (e.g. `+50 KARMA COINS`, `15 kg remaining`, `Latest: ~7 kg`).
- ❌ Tacky colored rounded background chips wrapping percentages or categories (e.g. `SOLAR TELEMETRY`, `SMART TIMING` in a box).
- ❌ Pill containers wrapping windows or meta (e.g. `Peak Window: 12-3 PM` in a green pill).

### Required Minimalist Replacements:
- **Clean Inline Typography**: Present points, status, and deltas as crisp text directly in the header or beside primary numbers (e.g. `<Text style={styles.metaPoints}>+50 Coins</Text>`).
- **Semantic Text Color**: Apply status color directly to the text itself:
  - Emerald `#059669` for on-track, verified, and positive savings.
  - Amber `#D97706` for watch status, pending points, or high consumption.
  - Rose `#EF4444` for over-budget or spikes.
  - Slate `#64748B` for neutral comparisons and subtitles.
- **Micro-Dots**: If a status indicator is needed, use a clean 6px dot (`width: 6, height: 6, borderRadius: 3`) beside text rather than enclosing the text in a pill.

---

## 4. Card Headers & Visual Accents
- **Frosted Micro-Icon Box**: If a card header uses an icon, style it exclusively as the Home Page frosted icon box:
  ```tsx
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  }
  ```
  Icon color: deep botanical emerald `#1E5E3A` (`size: 18`, `strokeWidth: 2.2`). Never use loud cartoon solid green/yellow circles.
- **Typography-First Headers**: When an icon is unnecessary, lead directly with crisp typography:
  - Title: `fontSize: 16`, `fontFamily: "Nunito_800ExtraBold"`, `color: "#0D1811"`, `letterSpacing: -0.2`.
  - Subtitle: `fontSize: 12`, `fontFamily: "Nunito_500Medium"`, `color: "#64748B"`, `marginTop: 2`.

---

## 5. No Nested Boxes or Disclaimer Banners
- **No Boxes Inside Boxes**: Never place a rounded card inside a rounded card with separate backgrounds and borders. The card must be a single, cohesive surface.
- **No Footnote/Disclaimer Banners**: Never append bottom callout boxes (e.g. `<View style={styles.footnoteRow}>` with lightbulb/sparkle icons explaining the chart). Let clean typography, progress tracks, and charts speak for themselves.

---

## 6. Actions, CTAs & Chevrons
- **Primary Action Buttons**: Executive dark forest `#0D1811` or `#1E5E3A`, `borderRadius: 12-14`, padding `13px` horizontal / `8px` vertical, `Nunito_700Bold` white text with micro-arrow.
- **Interactive Rows & Chevrons**: Use the Home Page's frosted chevron circle:
  ```tsx
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  }
  ```
- **Tap Targets**: Make the entire card or row pressable with `activeOpacity: 0.85`.

---

## 7. Typography Hierarchy
| Role | Family | Size | Weight | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Number** | `IBMPlexMono_600SemiBold` | 30–34px | SemiBold | `#0D1811` or `#FFFFFF` (dark card) |
| **Section Heading** | `Nunito_800ExtraBold` | 16–18px | ExtraBold | `#0D1811`, letterSpacing `-0.2` |
| **Card Subtitle** | `Nunito_500Medium` | 12px | Medium | `#64748B` |
| **Metric Value** | `IBMPlexMono_600SemiBold` | 18–22px | SemiBold | `#0D1811` or tone color |
| **Body / Description**| `Nunito_500Medium` | 12.5–13px | Medium | `#526658`, lineHeight `18` |
| **Eyebrow Label** | `Nunito_800ExtraBold` | 10–10.5px | ExtraBold | `#2EA86E` or `#5EEAD4`, letterSpacing `0.8-1.2` |

---

## 8. Summary Checklist Before Finalizing Any UI Edit
- [ ] Canvas is clean `#F4FAF6` without double frames or frost wrappers.
- [ ] Card uses `BlurView` + white translucent `LinearGradient` + `1.2px` hairline border + `22px` radii.
- [ ] ZERO pill boxes exist on the screen.
- [ ] Status and rewards are communicated through typography, color, and 6px micro-dots.
- [ ] Card headers use either the frosted 36px micro-icon box or typography-only.
- [ ] No nested callout/disclaimer banners.
- [ ] Primary buttons use executive dark forest styling.
- [ ] TypeScript check (`pnpm --dir apps/mobile exec tsc --noEmit`) passes with 0 errors.
