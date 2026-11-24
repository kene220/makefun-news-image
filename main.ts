import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const imageBytes = fs.readFileSync(new URL('entry.png', import.meta.url));
const suppliedImageSha256 = 'e9e9a5a18aa036ed18d1651336223709c39718a50eaee2dbb7fc8e0fec68692e';

if (imageBytes.length > 1_048_576) {
  throw new Error('The supplied image exceeds the competition size limit.');
}
if (createHash('sha256').update(imageBytes).digest('hex') !== suppliedImageSha256) {
  throw new Error('The supplied image bytes have changed.');
}

const outputFile = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');

fs.mkdirSync(dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, imageBytes);
