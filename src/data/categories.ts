import { categoryPalette } from '../theme/colors';

export type CategoryPreset = {
  id: string;
  label: string;
  /** Key into CATEGORY_ICONS. */
  iconKey: string;
  /** Pre-created on first launch so Home isn't empty on day one. */
  core: boolean;
};

// NOTE on the icons: the zip had 15 generically-named files with no
// per-icon labels, and they weren't in category-list order (e.g. the
// suitcase is Travel, not Transport — the auto-rickshaw is Transport).
// This mapping is based on actually looking at each icon's artwork rather
// than assuming order. Two are genuinely ambiguous and worth a second
// look on your end:
//   - miscellaneous.png: a bin holding assorted shapes (ball/prism/cube) —
//     read as a generic "assorted stuff" catch-all rather than any one
//     specific category.
//   - subscriptions.png: a water bottle — the weakest fit of the set. It
//     was the only icon left over once everything else matched clearly,
//     so it's assigned here by elimination rather than genuine visual fit.
//     If it's meant to be something else (e.g. Personal Care), swap it —
//     one line below, nothing structural.

/**
 * Every category icon the app ships, keyed by a stable name. A category
 * stores the key rather than the require()'d asset, so its icon can be
 * changed after creation and survives across launches.
 */
export const CATEGORY_ICONS: Record<string, any> = {
  'food-drinks': require('../../assets/icons/food-drinks.png'),
  commute: require('../../assets/icons/commute.png'),
  groceries: require('../../assets/icons/groceries.png'),
  shopping: require('../../assets/icons/shopping.png'),
  utilities: require('../../assets/icons/utilities.png'),
  health: require('../../assets/icons/health.png'),
  entertainment: require('../../assets/icons/entertainment.png'),
  'personal-care': require('../../assets/icons/personal-care.png'),
  rent: require('../../assets/icons/rent.png'),
  travel: require('../../assets/icons/travel.png'),
  subscription: require('../../assets/icons/subscription.png'),
  investment: require('../../assets/icons/investment.png'),
  gifts: require('../../assets/icons/gifts.png'),
  withdrawals: require('../../assets/icons/withrawals.png'),
  miscellaneous: require('../../assets/icons/miscalleneous.png'),
  gym: require('../../assets/icons/gym.png'),
  hobbies: require('../../assets/icons/hobbies.png'),
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);
export const DEFAULT_ICON_KEY = 'miscellaneous';

export const PAYCHECK_ID = 'paycheck';

export const CATEGORY_PRESETS: CategoryPreset[] = [
  // Filenames are kept free of spaces and "&" — Metro can't resolve assets
  // with those characters ("Asset not found: food%20&%20drinks.png").
  { id: 'food-dining', label: 'food & dining', iconKey: 'food-drinks', core: true },
  { id: 'transport', label: 'transport', iconKey: 'commute', core: true },
  { id: 'groceries', label: 'groceries', iconKey: 'groceries', core: true },
  { id: 'shopping', label: 'shopping', iconKey: 'shopping', core: true },
  { id: 'bills-utilities', label: 'bills & utilities', iconKey: 'utilities', core: true },
  { id: 'health', label: 'health', iconKey: 'health', core: true },
  { id: 'entertainment', label: 'entertainment', iconKey: 'entertainment', core: true },
  { id: 'personal-care', label: 'personal care', iconKey: 'personal-care', core: true },
  { id: PAYCHECK_ID, label: 'paycheck', iconKey: 'withdrawals', core: false },
  { id: 'rent', label: 'rent', iconKey: 'rent', core: false },
  { id: 'travel', label: 'travel', iconKey: 'travel', core: false },
  { id: 'subscriptions', label: 'subscriptions', iconKey: 'subscription', core: false },
  { id: 'investments-savings', label: 'investments & savings', iconKey: 'investment', core: false },
  { id: 'gifts-donations', label: 'gifts & donations', iconKey: 'gifts', core: false },
  { id: 'cash-withdrawal', label: 'cash withdrawal', iconKey: 'withdrawals', core: false },
  { id: 'miscellaneous', label: 'miscellaneous', iconKey: 'miscellaneous', core: false },
  { id: 'gym', label: 'gym', iconKey: 'gym', core: false },
  { id: 'hobbies', label: 'hobbies', iconKey: 'hobbies', core: false },
];

/** The icon a category shows: its own choice, else its preset's, else none. */
export function iconForCategory(category: { id: string; iconKey?: string | null }): any {
  if (category.iconKey && CATEGORY_ICONS[category.iconKey]) return CATEGORY_ICONS[category.iconKey];
  const preset = CATEGORY_PRESETS.find((p) => p.id === category.id);
  return preset ? CATEGORY_ICONS[preset.iconKey] : undefined;
}

/**
 * Tapping the "+" in the tag-picker or the category list shows whichever
 * of these haven't been added yet, as one-tap tiles (icon + name bundled —
 * no typing required since we already have a matching icon+name pair for
 * each). A free-text "Custom category" option should sit at the end of
 * that same grid for anything outside this list, falling back to the
 * Miscellaneous icon unless/until you hand over more art.
 */
export function nextAvailablePresets(existingIds: string[]): CategoryPreset[] {
  return CATEGORY_PRESETS.filter((c) => !existingIds.includes(c.id));
}

export function colorForCategoryIndex(index: number): string {
  return categoryPalette[index % categoryPalette.length];
}

// Virtual bucket — never appears in CATEGORY_PRESETS because it isn't a
// real user category. Untagged transactions live here until tagged.
export const UNCATEGORIZED_ID = 'uncategorized';
