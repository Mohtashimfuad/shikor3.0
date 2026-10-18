export interface EvidenceDraft {
  id: string;
  file: File;
  description: string;
  latitude: number | null;
  longitude: number | null;
}

export interface EvidenceGpsCoordinates {
  latitude: number;
  longitude: number;
}

const MAX_EXIF_HEADER_BYTES = 512 * 1024;

/** Reads embedded image EXIF coordinates only. It never substitutes device location. */
export async function readEvidenceGpsCoordinates(file: File): Promise<EvidenceGpsCoordinates | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return null;
  try {
    return parseImageExifGps(await file.slice(0, MAX_EXIF_HEADER_BYTES).arrayBuffer(), file.type);
  } catch {
    return null;
  }
}

export function parseImageExifGps(buffer: ArrayBuffer, mimeType: string): EvidenceGpsCoordinates | null {
  if (mimeType === 'image/jpeg') return parseJpegExifGps(buffer);
  const bytes = new DataView(buffer);
  if (mimeType === 'image/png') return parsePngExifGps(bytes);
  if (mimeType === 'image/webp') return parseWebpExifGps(bytes);
  return null;
}

export function parseJpegExifGps(buffer: ArrayBuffer): EvidenceGpsCoordinates | null {
  const bytes = new DataView(buffer);
  if (bytes.byteLength < 4 || bytes.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.byteLength) {
    if (bytes.getUint8(offset) !== 0xff) return null;
    const marker = bytes.getUint8(offset + 1);
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) return null;

    const segmentLength = bytes.getUint16(offset, false);
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.byteLength) return null;

    if (marker === 0xe1 && segmentLength >= 14
        && bytes.getUint8(segmentStart) === 0x45
        && bytes.getUint8(segmentStart + 1) === 0x78
        && bytes.getUint8(segmentStart + 2) === 0x69
        && bytes.getUint8(segmentStart + 3) === 0x66
        && bytes.getUint8(segmentStart + 4) === 0
        && bytes.getUint8(segmentStart + 5) === 0) {
      return parseTiffGps(bytes, segmentStart + 6, segmentEnd);
    }
    offset = segmentEnd;
  }
  return null;
}

function parsePngExifGps(bytes: DataView): EvidenceGpsCoordinates | null {
  if (bytes.byteLength < 8 || bytes.getUint32(0, false) !== 0x89504e47 || bytes.getUint32(4, false) !== 0x0d0a1a0a) return null;
  let offset = 8;
  while (offset + 12 <= bytes.byteLength) {
    const length = bytes.getUint32(offset, false);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + length;
    if (chunkEnd + 4 > bytes.byteLength) return null;
    if (bytes.getUint32(offset + 4, false) === 0x65584966) {
      return parseExifTiffGps(copyViewRange(bytes, dataOffset, chunkEnd));
    }
    if (bytes.getUint32(offset + 4, false) === 0x49454e44) return null;
    offset = chunkEnd + 4;
  }
  return null;
}

function parseWebpExifGps(bytes: DataView): EvidenceGpsCoordinates | null {
  if (bytes.byteLength < 12 || bytes.getUint32(0, false) !== 0x52494646 || bytes.getUint32(8, false) !== 0x57454250) return null;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const length = bytes.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + length;
    if (chunkEnd > bytes.byteLength) return null;
    if (bytes.getUint32(offset, false) === 0x45584946) {
      let exifStart = dataOffset;
      if (length >= 6 && bytes.getUint32(dataOffset, false) === 0x45786966
          && bytes.getUint16(dataOffset + 4, false) === 0) exifStart += 6;
      return parseExifTiffGps(copyViewRange(bytes, exifStart, chunkEnd));
    }
    offset = chunkEnd + (length % 2);
  }
  return null;
}

function copyViewRange(bytes: DataView, start: number, end: number): ArrayBuffer {
  const copy = new Uint8Array(end - start);
  copy.set(new Uint8Array(bytes.buffer, bytes.byteOffset + start, end - start));
  return copy.buffer;
}

function parseExifTiffGps(buffer: ArrayBuffer): EvidenceGpsCoordinates | null {
  const bytes = new DataView(buffer);
  return parseTiffGps(bytes, 0, bytes.byteLength);
}

function parseTiffGps(bytes: DataView, tiffStart: number, segmentEnd: number): EvidenceGpsCoordinates | null {
  if (tiffStart + 8 > segmentEnd) return null;
  const byteOrder = bytes.getUint16(tiffStart, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) return null;
  const readU16 = (offset: number) => offset + 2 <= segmentEnd ? bytes.getUint16(offset, littleEndian) : null;
  const readU32 = (offset: number) => offset + 4 <= segmentEnd ? bytes.getUint32(offset, littleEndian) : null;
  if (readU16(tiffStart + 2) !== 42) return null;

  const ifd0Offset = readU32(tiffStart + 4);
  if (ifd0Offset === null) return null;
  const ifd0 = tiffStart + ifd0Offset;
  const gpsPointer = findTiffEntry(ifd0, 0x8825, tiffStart, segmentEnd, readU16, readU32);
  if (!gpsPointer || gpsPointer.type !== 4 || gpsPointer.count !== 1) return null;
  const gpsIfdOffset = readU32(gpsPointer.valueFieldOffset);
  if (gpsIfdOffset === null) return null;
  const gpsIfd = tiffStart + gpsIfdOffset;
  const latitudeRef = findTiffEntry(gpsIfd, 1, tiffStart, segmentEnd, readU16, readU32);
  const latitude = findTiffEntry(gpsIfd, 2, tiffStart, segmentEnd, readU16, readU32);
  const longitudeRef = findTiffEntry(gpsIfd, 3, tiffStart, segmentEnd, readU16, readU32);
  const longitude = findTiffEntry(gpsIfd, 4, tiffStart, segmentEnd, readU16, readU32);
  if (!latitudeRef || !latitude || !longitudeRef || !longitude) return null;

  const lat = readGpsCoordinate(tiffStart, segmentEnd, latitude, readU32);
  const lng = readGpsCoordinate(tiffStart, segmentEnd, longitude, readU32);
  const latDirection = readAsciiValue(bytes, segmentEnd, latitudeRef);
  const lngDirection = readAsciiValue(bytes, segmentEnd, longitudeRef);
  if (lat === null || lng === null || (latDirection !== 'N' && latDirection !== 'S')
      || (lngDirection !== 'E' && lngDirection !== 'W')) return null;

  const signedLatitude = latDirection === 'S' ? -lat : lat;
  const signedLongitude = lngDirection === 'W' ? -lng : lng;
  if (Math.abs(signedLatitude) > 90 || Math.abs(signedLongitude) > 180) return null;
  return { latitude: signedLatitude, longitude: signedLongitude };
}

interface TiffEntry {
  type: number;
  count: number;
  dataOffset: number;
  valueFieldOffset: number;
}

function findTiffEntry(
  ifdOffset: number,
  tag: number,
  tiffStart: number,
  segmentEnd: number,
  readU16: (offset: number) => number | null,
  readU32: (offset: number) => number | null,
): TiffEntry | null {
  const count = readU16(ifdOffset);
  if (count === null || count > 1024 || ifdOffset + 2 + count * 12 > segmentEnd) return null;
  for (let index = 0; index < count; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (readU16(entryOffset) !== tag) continue;
    const type = readU16(entryOffset + 2);
    const valueCount = readU32(entryOffset + 4);
    const fieldOffset = entryOffset + 8;
    const fieldValue = readU32(fieldOffset);
    if (type === null || valueCount === null || fieldValue === null) return null;
    const typeSize = type === 1 || type === 2 || type === 7 ? 1 : type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 || type === 10 ? 8 : 0;
    const valueBytes = valueCount * typeSize;
    const dataOffset = valueBytes <= 4 ? fieldOffset : tiffStart + fieldValue;
    if (typeSize === 0 || dataOffset + valueBytes > segmentEnd) return null;
    return { type, count: valueCount, dataOffset, valueFieldOffset: fieldOffset };
  }
  return null;
}

function readGpsCoordinate(
  tiffStart: number,
  segmentEnd: number,
  entry: TiffEntry,
  readU32: (offset: number) => number | null,
): number | null {
  if (entry.type !== 5 || entry.count !== 3) return null;
  const offset = entry.dataOffset;
  if (offset < tiffStart || offset + 24 > segmentEnd) return null;
  const parts: number[] = [];
  for (let index = 0; index < 3; index += 1) {
    const numerator = readU32(offset + index * 8);
    const denominator = readU32(offset + index * 8 + 4);
    if (numerator === null || denominator === null || denominator === 0) return null;
    parts.push(numerator / denominator);
  }
  return parts[0] + parts[1] / 60 + parts[2] / 3600;
}

function readAsciiValue(bytes: DataView, segmentEnd: number, entry: TiffEntry): string | null {
  if (entry.type !== 2 || entry.count < 1 || entry.count > 8) return null;
  const offset = entry.dataOffset;
  if (offset + entry.count > segmentEnd) return null;
  return String.fromCharCode(...Array.from({ length: entry.count - 1 }, (_, index) => bytes.getUint8(offset + index))).toUpperCase();
}
