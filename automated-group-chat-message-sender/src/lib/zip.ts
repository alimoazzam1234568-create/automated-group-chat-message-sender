import { BRIDGE_MANIFEST, WA_SCRIPT, IG_SCRIPT, BRIDGE_README } from './bridgeFiles';

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(d: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < d.length; i++) c = CRC_TABLE[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** Minimal STORE-method zip writer — no compression, universally readable. */
export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, e.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true);
    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);

    offset += 30 + name.length + size;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) {
    chunks.push(c);
    cdSize += c.length;
  }

  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true);
  eo.setUint16(4, 0, true);
  eo.setUint16(6, 0, true);
  eo.setUint16(8, entries.length, true);
  eo.setUint16(10, entries.length, true);
  eo.setUint32(12, cdSize, true);
  eo.setUint32(16, cdStart, true);
  eo.setUint16(20, 0, true);
  chunks.push(new Uint8Array(eo.buffer));

  return new Blob(chunks as BlobPart[], { type: 'application/zip' });
}

/** Draw the extension icon on a canvas so no binary asset is needed. */
async function makeIcon(): Promise<Uint8Array> {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  if (!g) return new Uint8Array(0);

  const grad = g.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(0.55, '#d946ef');
  grad.addColorStop(1, '#22d3ee');
  g.fillStyle = grad;

  const r = 26;
  g.beginPath();
  g.moveTo(r, 0);
  g.arcTo(128, 0, 128, r, r);
  g.arcTo(128, 128, 128 - r, 128, r);
  g.arcTo(0, 128, 0, 128 - r, r);
  g.arcTo(0, 0, r, 0, r);
  g.closePath();
  g.fill();

  g.strokeStyle = '#ffffff';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(24, 66);
  g.lineTo(40, 66);
  g.lineTo(49, 38);
  g.lineTo(64, 94);
  g.lineTo(76, 50);
  g.lineTo(84, 66);
  g.lineTo(104, 66);
  g.stroke();

  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
  if (!blob) return new Uint8Array(0);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function buildBridgeZip(): Promise<Blob> {
  const enc = new TextEncoder();
  const icon = await makeIcon();
  return makeZip([
    { name: 'manifest.json', data: enc.encode(BRIDGE_MANIFEST) },
    { name: 'bridge-wa.js', data: enc.encode(WA_SCRIPT) },
    { name: 'bridge-ig.js', data: enc.encode(IG_SCRIPT) },
    { name: 'icon128.png', data: icon },
    { name: 'README.txt', data: enc.encode(BRIDGE_README) },
  ]);
}
