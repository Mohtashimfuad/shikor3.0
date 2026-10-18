export const GIBS_LAYER = 'MODIS_Terra_CorrectedReflectance_TrueColor';
export const GIBS_TILE_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const GIBS_FIRST_DATE = '2000-02-24';
export const GIBS_MAX_ZOOM = 9;

/** Approximate named-place center for the Chilmari study view; it is not a claim coordinate. */
export const CHILMARI_STUDY_AREA = {
  name: 'Chilmari, Kurigram',
  latitude: 25.5343,
  longitude: 89.7098,
  zoom: 9,
} as const;

export type ImageryTileStatus = 'loading' | 'available' | 'unavailable';

export function isSupportedImageryDate(date: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const currentDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return date >= GIBS_FIRST_DATE && parsed <= currentDate;
}

export function buildGibsTileUrl(date: string): string | null {
  if (!isSupportedImageryDate(date)) return null;
  return `${GIBS_TILE_BASE}/${GIBS_LAYER}/default/${date}/GoogleMapsCompatible_Level{z}/{z}/{y}/{x}.jpg`;
}

export function getImageryDateLabel(date: string, language: 'bn' | 'en'): string {
  return language === 'bn'
    ? `NASA দৈনিক কম্পোজিট তারিখ: ${date}`
    : `NASA daily composite date: ${date}`;
}

export function getImageryStatusMessage(status: ImageryTileStatus, language: 'bn' | 'en'): string {
  if (language === 'bn') {
    if (status === 'loading') return 'NASA GIBS থেকে চিত্র লোড হচ্ছে…';
    if (status === 'available') return 'এই তারিখের জন্য অন্তত কিছু চিত্র টাইল লোড হয়েছে। মেঘ বা ফাঁকা অংশ থাকতে পারে।';
    return 'চিত্র টাইল পাওয়া যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন; এই তারিখে কভারেজ নাও থাকতে পারে।';
  }
  if (status === 'loading') return 'Loading imagery tiles from NASA GIBS…';
  if (status === 'available') return 'Some imagery tiles loaded for this date. Clouds or gaps may remain.';
  return 'No imagery tiles loaded. Check the connection and retry; coverage may be unavailable for this date.';
}
