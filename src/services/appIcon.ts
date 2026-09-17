import { NativeModules, ImageSourcePropType } from 'react-native';

/**
 * Which launcher icon the app wears.
 *
 * Backed by AppIconModule, which enables one of the manifest's
 * <activity-alias> entries — so the enabled alias is itself the stored
 * preference and nothing needs writing to AsyncStorage.
 */

export type AppIconName = 'maneki' | 'money';

export const APP_ICONS: { name: AppIconName; label: string; preview: ImageSourcePropType }[] = [
  { name: 'maneki', label: 'lucky cat', preview: require('../../assets/icon-maneki.png') },
  { name: 'money', label: 'money cat', preview: require('../../assets/icon-money.png') },
];

export const DEFAULT_APP_ICON: AppIconName = 'maneki';

// Absent whenever the JS bundle is newer than the installed binary — a Metro
// reload can't add a native module — so every call here degrades to the
// default rather than throwing.
const native = NativeModules.AppIconModule as
  | { getIcon(): Promise<string>; setIcon(name: string): Promise<string> }
  | undefined;

export const appIconSwitchingAvailable = native != null;

function coerce(value: string | undefined): AppIconName {
  return APP_ICONS.some((i) => i.name === value) ? (value as AppIconName) : DEFAULT_APP_ICON;
}

export async function getAppIcon(): Promise<AppIconName> {
  if (!native) return DEFAULT_APP_ICON;
  try {
    return coerce(await native.getIcon());
  } catch {
    return DEFAULT_APP_ICON;
  }
}

export async function setAppIcon(name: AppIconName): Promise<AppIconName> {
  if (!native) return DEFAULT_APP_ICON;
  return coerce(await native.setIcon(name));
}
