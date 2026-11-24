import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_IMAGE_BYTES = 1_048_576;
const MAX_DIMENSION_PX = 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_SHA256 = 'e9e9a5a18aa036ed18d1651336223709c39718a50eaee2dbb7fc8e0fec68692e';

function computeSha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function assertValidImageFormat(data: Buffer): void {
  const isPng = data.byteLength >= 24 && data.subarray(0, 8).equals(PNG_SIGNATURE);
  if (isPng) {
    const chunkType = data.subarray(12, 16).toString('ascii');
    if (chunkType !== 'IHDR') {
      throw new Error(`Expected IHDR chunk first, found ${chunkType}.`);
    }
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (width === 0 || height === 0 || width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
      throw new Error(
        `Invalid PNG dimensions ${width}x${height}; must be within 1..${MAX_DIMENSION_PX}px.`,
      );
    }
    return;
  }

  const isJpeg =
    data.byteLength >= 4 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff &&
    data[data.byteLength - 2] === 0xff &&
    data[data.byteLength - 1] === 0xd9;
  if (!isJpeg) {
    throw new Error('Source entry.png must be a complete PNG or JPEG image.');
  }
}

function resolveOutputDirectory(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  return configured && configured.length > 0 ? configured : '/output';
}

function main(): void {
  const sourceUrl = new URL('./entry.png', import.meta.url);
  const imageBytes = readFileSync(sourceUrl);

  if (imageBytes.byteLength === 0 || imageBytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `Invalid image size: got ${imageBytes.byteLength} bytes, limit is ${MAX_IMAGE_BYTES} bytes.`,
    );
  }

  assertValidImageFormat(imageBytes);

  const actualHash = computeSha256(imageBytes);
  if (actualHash !== EXPECTED_SHA256) {
    throw new Error(
      `Image digest mismatch: expected ${EXPECTED_SHA256}, got ${actualHash}.`,
    );
  }

  const outDir = resolveOutputDirectory();
  mkdirSync(outDir, { recursive: true });
  const destination = join(outDir, 'entry.png');
  writeFileSync(destination, imageBytes);
}

main();
