import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Gullak Pixel is the 5x7 bitmap font from the art mocks, compiled to TrueType
 * by scripts/gullak/ttf.js. It has 8 font pixels per em, so a font pixel lands
 * on exactly `n` device pixels when fontSize is 8n/3 on this 3x phone.
 * Android picks the face by asset filename, so weight is chosen by family.
 */
export const PIXEL_FONT = { regular: 'GullakPixel-Regular', bold: 'GullakPixel-Bold' };

/** Text style where each font pixel is `n` device pixels. */
export function pixelText(n: number, bold = true) {
  const fontSize = (8 * n) / 3;
  return {
    fontFamily: bold ? PIXEL_FONT.bold : PIXEL_FONT.regular,
    fontSize,
    // 7 rows of cap height + 2 of descender, plus a row of air.
    lineHeight: (10 * n) / 3,
    includeFontPadding: false,
    textTransform: 'lowercase' as const,
  };
}

/** The world's colours. Pastel clay, with ink dark enough to read on cream. */
export const W = {
  ink: '#3A2320',
  inkSoft: '#8A6A5A',
  outline: '#3F2622',
  paper: '#FFF8EC',
  paperDim: '#EADBC4',
  periwinkle: '#8E9FDF',
  periwinkleLight: '#A8B6EA',
  cream: '#FBF3E4',
  mustard: '#F4C752',
  butter: '#F7D98A',
  green: '#2E7A44',
  greenSoft: '#6FA866',
  greenPale: '#A6D49A',
  greenWash: '#E3F5DA',
  red: '#B23A30',
  clayLabel: '#5A3A2C',
  shadow: 'rgba(63,38,34,0.25)',
};

type PanelProps = {
  fill?: string;
  border?: string;
  /** Border width in dp. */
  b?: number;
  /** Drop-shadow offset in dp; 0 for none. */
  shadow?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * A pixel-art panel: a border with stepped (notched) corners, like the
 * dialog boxes in the mocks. Built from plain Views — two overlapping
 * rectangles per layer make the notch.
 */
export function PixelPanel({ fill = W.paper, border = W.outline, b = 3, shadow = 0, style, children }: PanelProps) {
  return (
    <View style={style}>
      {shadow > 0 && (
        <>
          <View style={[StyleSheet.absoluteFill, { left: b + shadow, right: b - shadow, top: shadow, bottom: -shadow, backgroundColor: W.shadow }]} />
          <View style={[StyleSheet.absoluteFill, { left: shadow, right: -shadow, top: b + shadow, bottom: b - shadow, backgroundColor: W.shadow }]} />
        </>
      )}
      <View style={[StyleSheet.absoluteFill, { left: b, right: b, backgroundColor: border }]} />
      <View style={[StyleSheet.absoluteFill, { top: b, bottom: b, backgroundColor: border }]} />
      <View style={[StyleSheet.absoluteFill, { left: 2 * b, right: 2 * b, top: b, bottom: b, backgroundColor: fill }]} />
      <View style={[StyleSheet.absoluteFill, { left: b, right: b, top: 2 * b, bottom: 2 * b, backgroundColor: fill }]} />
      {children}
    </View>
  );
}

/** ₹ with Indian digit grouping: ₹1,44,109. */
export function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Short form for tight spots: ₹1.49L, ₹23.2k, ₹507. */
export function rupeesShort(n: number): string {
  const a = Math.abs(n), sign = n < 0 ? '-' : '';
  const trim = (s: string) => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (a >= 1e5) return `${sign}₹${trim((a / 1e5).toFixed(2))}L`;
  if (a >= 1e4) return `${sign}₹${trim((a / 1e3).toFixed(1))}k`;
  return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`;
}
