/**
 * Design tokens ported from Uber's Base Design System (baseui / Base Web).
 * Base Web is a *web* library (DOM + Styletron) so it can't be imported
 * directly into React Native. These are the actual documented values from
 * baseweb.design's theming reference, reimplemented as plain RN-friendly
 * constants — so the spacing/type/radius rhythm matches Base exactly even
 * though the components underneath are native Views/Text, not baseui's.
 *
 * Values marked "inferred" follow Base's documented arithmetic pattern
 * (the scale steps by a consistent progression) but weren't directly
 * confirmed in the public docs — double check against `baseui/theme` if
 * you ever do end up able to run the real package for reference.
 */

export const sizing = {
  scale0: 0,
  scale100: 4, // inferred — fits the documented progression before scale200
  scale200: 6,
  scale300: 8,
  scale400: 10,
  scale500: 12,
  scale550: 14,
  scale600: 16,
  scale650: 18,
  scale700: 20,
  scale750: 22,
  scale800: 24,
  scale900: 32,
  scale1000: 40,
  scale1200: 48,
  scale1400: 56,
  scale1600: 64,
  scale2400: 96,
  scale3200: 128,
  scale4800: 192,
};

export const radius = {
  radius100: 2,
  radius200: 4,
  radius300: 8,
  radius400: 12,
  // Base's "surfaceBorderRadius" semantic default resolves to radius300 (8px)
  surface: 8,
  // Base's scale doesn't define tokens this large, so the two below are a
  // deliberate extension for our own big surfaces, staying consistent with
  // the step size of the existing scale (200 → 400 → ~800 roughly doubles).
  // Applied to the top two corners of the bottom sheets.
  sheet: 32,
  // The total-spend card is the one hero surface and carries a rounder
  // corner than the sheets do.
  card: 36,
};

// RN's shadow model (elevation on Android, shadow* props on iOS) can't
// reproduce Base's raw CSS box-shadow strings, so these are translated
// per-platform equivalents of the same four elevation levels Base defines.
export const elevation = {
  // Not from Base's scale: its lightest level still reads heavy on this
  // app's flat surfaces, where cards carry no stroke and rely on a barely
  // there lift to separate from the background.
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Android ignores shadowOpacity — depth there comes from elevation, so
    // this is raised alongside it to keep both platforms in step.
    elevation: 3,
  },
  // Figma folks-v2 node 325:12: 0px 2px 4.9px rgba(0,0,0,0.19). Tighter and
  // darker than `soft`, which is what gives that card its lifted, physical
  // look. Its three inset shadows have no React Native equivalent, and
  // measured out to under 3% luminance, so they're not reproduced.
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.19,
    shadowRadius: 4.9,
    elevation: 3,
  },
  shadow400: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  shadow500: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  shadow600: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  shadow700: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
};

/**
 * Urbanist (SIL OFL), bundled as static instances in
 * android/app/src/main/assets/fonts. Android resolves fontFamily by the
 * asset's filename, and pairing a named family with `fontWeight` there
 * gives synthetic bolding rather than the real cut — so weight is chosen by
 * picking the family, and the ramp below carries no fontWeight at all.
 * (Adding iOS later means listing these files under UIAppFonts in
 * Info.plist; the family names stay the same.)
 */
export const fonts = {
  /** Anton (SIL OFL) — the display face, headings only. */
  display: 'Anton-Regular',
  regular: 'Urbanist-Regular',
  medium: 'Urbanist-Medium',
  semiBold: 'Urbanist-SemiBold',
  bold: 'Urbanist-Bold',
};

/**
 * One text style in the ramp.
 *
 * `letterSpacing` is -5% tracking. React Native takes points rather than a
 * percentage, so it has to be derived from each size instead of set once.
 * `textTransform` enforces the all-lowercase voice at the token level, which
 * also covers text that isn't a literal in this codebase — category names
 * from the database, payees parsed out of SMS, and anything typed in.
 */
const track = (fontSize: number, fontFamily: string, lineHeight: number) => ({
  fontSize,
  fontFamily,
  lineHeight,
  letterSpacing: fontSize * -0.05,
  textTransform: 'lowercase' as const,
});

// Base's documented typography ramp (v9+ scale). Paragraph = body text,
// Label = UI/control text (medium weight), Heading = section titles.
export const typography = {
  ParagraphXSmall: track(12, fonts.regular, 20),
  ParagraphSmall: track(14, fonts.regular, 20),
  ParagraphMedium: track(16, fonts.regular, 24),
  ParagraphLarge: track(18, fonts.regular, 28),
  LabelXSmall: track(12, fonts.medium, 16),
  LabelSmall: track(14, fonts.medium, 16),
  LabelMedium: track(16, fonts.medium, 20),
  LabelLarge: track(18, fonts.medium, 24),
  HeadingXSmall: track(20, fonts.semiBold, 28),
  HeadingSmall: track(24, fonts.semiBold, 32),
  // inferred continuation of the same step pattern (Base goes further,
  // e.g. HeadingMedium/Large/XLarge, DisplaySmall/Medium/Large) —
  // included so the total-spend number has somewhere to live
  HeadingMedium: track(28, fonts.semiBold, 36),
  HeadingLarge: track(32, fonts.bold, 40),
  DisplayMedium: track(44, fonts.bold, 52),
};

/**
 * Headings, set in Anton.
 *
 * Tracking tightens as the size grows — -4% at 24px and above, -2% below —
 * because a fat display face needs more of it the larger it gets. React
 * Native takes points, so it's derived per size rather than set once.
 */
const display = (fontSize: number, lineHeight: number) => ({
  fontSize,
  fontFamily: fonts.display,
  lineHeight,
  letterSpacing: fontSize * (fontSize >= 24 ? -0.04 : -0.02),
  textTransform: 'lowercase' as const,
});

export const heading = {
  XSmall: display(14, 20),
  // The size the UI's own body/label text runs at — buttons and money
  // figures, which share the display face with the headings.
  Body: display(16, 24),
  Small: display(18, 24),
  Medium: display(20, 28),
  Amount: display(28, 36),
  Large: display(30, 40),
  XLarge: display(44, 56),
};

export const timing = {
  timing100: 100,
  timing400: 400,
  timing700: 700,
};
