# Connections Stats OCR Investigation

**Date:** January 29-30, 2026  
**Status:** UNRESOLVED - needs further investigation

---

## The Problem

Connections stats screenshots (white background, thin font showing "562 80 1 29") fail to OCR on iOS Safari, while:
- ✅ Wordle stats (black background) work fine
- ✅ Test images created by Claude (PIL) work fine
- ✅ Pre-inverted Connections screenshot (created server-side by Python PIL) works when pasted
- ❌ Real Connections screenshots fail even with client-side inversion

---

## Key Discovery

**Server-side inverted PNG works, client-side Canvas inversion doesn't.**

When I created `connections-inverted.png` using Python PIL and the user pasted that, the OCR found all the numbers correctly. But when the app tries to invert the same image using the Canvas API in JavaScript, the OCR still fails.

---

## Versions Attempted (v1.3.36 - v1.3.44)

| Version | Approach | Result |
|---------|----------|--------|
| 1.3.36 | Character confusion fix (l→1, O→0) | Failed - numbers not being read at all |
| 1.3.37 | Debug info in failure prompt | Revealed OCR finds NO numbers from stats |
| 1.3.38 | Image threshold preprocessing | Failed |
| 1.3.39 | Region-focused OCR | Failed |
| 1.3.40 | Color inversion for light backgrounds | Failed |
| 1.3.41 | Smart background detection + inversion | Failed |
| 1.3.42 | Dilation (font thickening) + inversion | Failed |
| 1.3.43 | Simplified - always invert light backgrounds | Failed |
| 1.3.44 | Try both original and inverted, pick best | Failed - only found "8" |

---

## Debug Output Examples

**From real Connections screenshot:**
```
Numbers found: 4, 45, 8
Text: 4:45 = < Game Shelf * M Back to puzzle X Perfect! Completed Win% Current Max Streak Streak NEW...
```

The OCR reads the **labels** (Completed, Win%, Streak) but NOT the **numbers** (562, 80, 1, 29).

---

## Theories

### 1. Canvas API Output Differs from PIL
The JavaScript Canvas `toBlob('image/png')` might produce different output than Python PIL's PNG encoding.

### 2. iOS Safari Canvas Security Restrictions
iOS may restrict canvas operations on images from the clipboard for security reasons.

### 3. Blob/Image Conversion Quality Loss
Converting blob → Image → Canvas → blob might lose quality or metadata.

### 4. Font Rendering Issue
The thin font used by NYT Connections is simply too light for Tesseract.js to detect, and the Canvas inversion isn't properly thickening it like PIL does.

---

## Next Steps to Try

1. **Debug canvas output visually** - Display the inverted canvas as a data URL to verify inversion is actually happening correctly

2. **Compare file sizes** - Check if canvas-generated PNG is same size as PIL-generated PNG

3. **Try different image formats** - Maybe 'image/jpeg' with high quality instead of PNG

4. **Try OffscreenCanvas** - Might behave differently than regular Canvas

5. **Use a different Tesseract config** - Try PSM modes, whitelist digits only

6. **Cloud OCR fallback** - Google Cloud Vision API handles thin fonts much better

---

## Files Involved

- `gameshelf/index.html` - Main app
  - `invertImage()` function - around line 29243
  - `processScreenshot()` function - around line 29270
  - `parseStatsFromOCR()` function
  - Debug prompt: `showStatsParseFailurePrompt()`

---

## Working Test Files (in outputs)

- `connections-inverted.png` - Server-side inverted image that WORKS
- `connections-binary-inverted.png` - Binary threshold + inverted
- `connections-dilated-inverted.png` - Dilated + inverted
- `test-dark-stats.png` - Bold white text on black (WORKS)
- `test-bold-stats.png` - Bold black text on white
