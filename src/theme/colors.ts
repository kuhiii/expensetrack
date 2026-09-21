/**
 * Base Web's documented light-theme semantic colors. Base's default primary
 * is pure black (#000000) — everywhere that referenced primaryA/accent now
 * points at DEFAULT_ACCENT instead. Everything else (neutrals, content,
 * background, border tokens) is untouched from Base's real values, so
 * contrast/legibility stays exactly as Base intended it.
 */

export const DEFAULT_ACCENT = '#FF4D8D';

export const base = {
  primaryB: '#FFFFFF',

  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F6F6F6',
  backgroundTertiary: '#EEEEEE',
  backgroundInverseSecondary: '#1F1F1F',

  contentPrimary: '#000000',
  contentSecondary: '#545454',
  contentTertiary: '#757575',
  contentInversePrimary: '#FFFFFF',
  contentInverseSecondary: '#CBCBCB',

  borderOpaque: '#E2E2E2',

  // 50% black — used for the softer text in transaction rows.
  contentMuted: 'rgba(0, 0, 0, 0.5)',
  // 30% black — quieter still, for secondary affordances like "+ add".
  contentFaint: 'rgba(0, 0, 0, 0.3)',

  negative: '#D44333',
  warning: '#FFC043',
  // Lighter than Base's green: money in is context next to the spend
  // figure, not a warning, and the darker tone read as heavy beside it.
  positive: '#2DB863',
};

// The footer band. Not part of Base's palette — a small, self-contained set
// for the one decorative surface in the app.
export const coffee = {
  liquid: '#4A2C1A',
  crema: '#E4C9A8',
  foam: 'rgba(255, 245, 230, 0.07)',
  sheen: 'rgba(255, 245, 230, 0.04)',
  depth: 'rgba(0, 0, 0, 0.22)',
  // Opaque enough to read against the page above the waterline, and against
  // the coffee below it.
  ice: 'rgba(228, 241, 248, 0.94)',
  iceEdge: 'rgba(255, 255, 255, 0.85)',
};

// Curated swatch options for the accent color picker opened by tapping the
// cat. Chosen so every option reads cleanly against the white/backgroundSecondary
// cards rather than letting someone pick something that clashes.
export const accentSwatches = [
  '#FF4D8D', // default — bubblegum pink
  '#FF6B6B', // coral
  '#FF9F43', // tangerine
  '#FFC93C', // marigold
  '#6BCB77', // mint
  '#4D96FF', // periwinkle
  '#9B5DE5', // lilac
  '#F45B69', // watermelon
];

/**
 * Card tints for the untagged queue, read off the supplied pastel palette.
 * The palette's top-left swatches are near-white and would vanish against the
 * page, so these are the ones with enough presence to tell cards apart.
 */
export const pastelCards = [
  '#FCE0E7', // rose
  '#EDE4F3', // lavender
  '#FBF0CD', // butter
  '#D8E8F4', // sky
  '#E8E1F4', // lilac
  '#EFDCD0', // sand
  '#BEDDFC', // cornflower
  '#FDF0E7', // peach
];

/** How much of the palette colour survives the mix — the rest is white. */
const TINT_STRENGTH = 0.15;

/**
 * Blended against white rather than drawn at 30% alpha: the cards overlap in
 * the stack, and a translucent one would show the card beneath it through the
 * overlap.
 */
function mixWithWhite(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 0xff;
    return Math.round(255 + amount * (c - 255));
  };
  const [r, g, b] = [channel(16), channel(8), channel(0)];
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Stable tint per transaction: keyed off the id rather than its position, so
 * a card keeps its colour as it moves up the stack.
 */
export function pastelForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return mixWithWhite(pastelCards[Math.abs(hash) % pastelCards.length], TINT_STRENGTH);
}

// Auto-assigned per-category bar colors (pastel set, distinct from the
// accent so category rows stay legible regardless of which accent is active).
// Assigned by index when a category is created — see data/categories.ts.
export const categoryPalette = [
  '#F7B2BD',
  '#F9C784',
  '#FCE38A',
  '#A8E6CE',
  '#A0C4FF',
  '#BDB2FF',
  '#FFADAD',
  '#CAFFBF',
  '#9BF6FF',
  '#FFC6FF',
];
