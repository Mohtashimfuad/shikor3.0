import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseImageExifGps, parseJpegExifGps } from '../src/lib/evidenceMetadata.ts';

function jpegWithGps(latRef = 'N', lonRef = 'E'): ArrayBuffer {
  const tiff = new ArrayBuffer(128);
  const view = new DataView(tiff);
  const u16 = (offset: number, value: number) => view.setUint16(offset, value, true);
  const u32 = (offset: number, value: number) => view.setUint32(offset, value, true);
  u16(0, 0x4949);
  u16(2, 42);
  u32(4, 8);
  u16(8, 1);
  u16(10, 0x8825);
  u16(12, 4);
  u32(14, 1);
  u32(18, 26);
  u32(22, 0);
  u16(26, 4);
  const entry = (offset: number, tag: number, type: number, count: number, value: number) => {
    u16(offset, tag);
    u16(offset + 2, type);
    u32(offset + 4, count);
    u32(offset + 8, value);
  };
  entry(28, 1, 2, 2, latRef.charCodeAt(0));
  entry(40, 2, 5, 3, 80);
  entry(52, 3, 2, 2, lonRef.charCodeAt(0));
  entry(64, 4, 5, 3, 104);
  u32(76, 0);
  const rational = (offset: number, value: number) => { u32(offset, value); u32(offset + 4, 1); };
  rational(80, 25); rational(88, 34); rational(96, 5);
  rational(104, 89); rational(112, 40); rational(120, 20);

  const tiffBytes = new Uint8Array(tiff);
  const exif = new Uint8Array(6 + tiffBytes.length);
  exif.set([0x45, 0x78, 0x69, 0x66, 0, 0]);
  exif.set(tiffBytes, 6);
  const jpeg = new Uint8Array(2 + 2 + 2 + exif.length + 2);
  const output = new DataView(jpeg.buffer);
  output.setUint16(0, 0xffd8, false);
  output.setUint16(2, 0xffe1, false);
  output.setUint16(4, exif.length + 2, false);
  jpeg.set(exif, 6);
  output.setUint16(6 + exif.length, 0xffd9, false);
  return jpeg.buffer;
}

function imageTiffGpsFixture(): ArrayBuffer {
  return jpegWithGps().slice(12, 140);
}

test('reads valid GPS coordinates from JPEG EXIF and applies hemisphere signs', () => {
  const northEast = parseJpegExifGps(jpegWithGps());
  assert.ok(northEast);
  assert.ok(Math.abs(northEast.latitude - (25 + 34 / 60 + 5 / 3600)) < 0.0000001);
  assert.ok(Math.abs(northEast.longitude - (89 + 40 / 60 + 20 / 3600)) < 0.0000001);

  const southWest = parseJpegExifGps(jpegWithGps('S', 'W'));
  assert.ok(southWest);
  assert.ok(southWest.latitude < 0);
  assert.ok(southWest.longitude < 0);
});

test('does not invent GPS for files without a valid EXIF GPS block', () => {
  assert.equal(parseJpegExifGps(new ArrayBuffer(0)), null);
  assert.equal(parseJpegExifGps(new Uint8Array([0xff, 0xd8, 0xff, 0xda]).buffer), null);
});

test('reads embedded GPS coordinates from PNG eXIf and WebP EXIF chunks', () => {
  const tiff = new Uint8Array(imageTiffGpsFixture());
  const png = new Uint8Array(8 + 12 + tiff.length + 12);
  const pngView = new DataView(png.buffer);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  pngView.setUint32(8, tiff.length, false);
  png.set([0x65, 0x58, 0x49, 0x66], 12);
  png.set(tiff, 16);
  const pngEnd = 16 + tiff.length;
  pngView.setUint32(pngEnd, 0, false);
  png.set([0x49, 0x45, 0x4e, 0x44], pngEnd + 4);

  const webp = new Uint8Array(12 + 8 + tiff.length);
  const webpView = new DataView(webp.buffer);
  webp.set([0x52, 0x49, 0x46, 0x46]);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  webp.set([0x45, 0x58, 0x49, 0x46], 12);
  webpView.setUint32(16, tiff.length, true);
  webp.set(tiff, 20);

  assert.ok(parseImageExifGps(png.buffer, 'image/png'));
  assert.ok(parseImageExifGps(webp.buffer, 'image/webp'));
});

test('evidence description migration is additive and does not change access policies', () => {
  const migration = readFileSync('supabase/migrations/20261018090000_claim_evidence_descriptions.sql', 'utf8');
  assert.match(migration, /add column if not exists description text/i);
  assert.match(migration, /description is null or length\(btrim\(description\)\) between 1 and 500/i);
  assert.doesNotMatch(migration, /drop policy|create policy|grant |revoke /i);
});

test('dossier client loads evidence descriptions, EXIF coordinates, and uploaded dates through existing private RLS paths', () => {
  const client = readFileSync('src/lib/erosionClaims.ts', 'utf8');
  assert.match(client, /select\('id, storage_path, media_type, description, original_filename, exif_lat, exif_lng, sha256_hash, uploaded_at'\)/i);
  assert.match(client, /createSignedUrl\(storagePath, 60\)/i);
  assert.match(client, /exif_lat:\s*draft\.latitude/i);
  assert.match(client, /exif_lng:\s*draft\.longitude/i);
  assert.match(client, /rpc\('current_access_role'/i);
});

test('upload errors keep failed evidence drafts available for an explicit retry', () => {
  const client = readFileSync('src/lib/erosionClaims.ts', 'utf8');
  const view = readFileSync('src/components/claim/CitizenClaimsView.tsx', 'utf8');
  assert.match(client, /failedEvidence\.push\(draft\)/i);
  assert.match(client, /successfully attached files are already saved/i);
  assert.match(view, /ব্যর্থ ফাইলগুলো আবার চেষ্টা করুন|Retry failed files/i);
  assert.match(view, /dossierLoadError[\s\S]*?copy\('আবার চেষ্টা করুন', 'Retry'\)/i);
});
