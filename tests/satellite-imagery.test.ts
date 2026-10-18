import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGibsTileUrl,
  CHILMARI_STUDY_AREA,
  getImageryDateLabel,
  getImageryStatusMessage,
  isSupportedImageryDate,
} from '../src/lib/satelliteImagery.ts';

test('builds dated NASA GIBS Terra MODIS tile requests without an API key', () => {
  const url = buildGibsTileUrl('2024-01-15');
  assert.equal(
    url,
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-01-15/GoogleMapsCompatible_Level{z}/{z}/{y}/{x}.jpg',
  );
  assert.equal(buildGibsTileUrl('2024-02-30'), null);
  assert.equal(buildGibsTileUrl('2099-01-01'), null);
});

test('accepts only valid historical dates within the layer period', () => {
  const fixedToday = new Date('2026-10-18T00:00:00Z');
  assert.equal(isSupportedImageryDate('2000-02-24', fixedToday), true);
  assert.equal(isSupportedImageryDate('2000-02-23', fixedToday), false);
  assert.equal(isSupportedImageryDate('2024-02-29', fixedToday), true);
  assert.equal(isSupportedImageryDate('2023-02-29', fixedToday), false);
  assert.equal(isSupportedImageryDate('', fixedToday), false);
});

test('labels the daily composite date and missing-tile outcome without claiming acquisition or analysis', () => {
  assert.equal(getImageryDateLabel('2024-01-15', 'en'), 'NASA daily composite date: 2024-01-15');
  assert.match(getImageryStatusMessage('unavailable', 'en'), /coverage may be unavailable/);
  assert.match(getImageryStatusMessage('available', 'en'), /Clouds or gaps may remain/);
  assert.match(getImageryDateLabel('2024-01-15', 'bn'), /NASA দৈনিক কম্পোজিট তারিখ/);
});

test('uses a sourced named locality center, independent of citizen claim coordinates', () => {
  assert.equal(CHILMARI_STUDY_AREA.name, 'Chilmari, Kurigram');
  assert.deepEqual([CHILMARI_STUDY_AREA.latitude, CHILMARI_STUDY_AREA.longitude], [25.5343, 89.7098]);
});
