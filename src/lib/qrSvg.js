/**
 * Zero-dependency ISO/IEC 18004 QR Code matrix generator (Byte mode, ECC Level L,
 * Versions 1–6 — up to 134 UTF-8 bytes, ideal for in-person check-in URLs/tokens).
 */

// Version table for ECC Level L (single block up to V5; 2 blocks for V6)
const VERSION_SPEC = {
  1: { size: 21, dataCodewords: 19, ecPerBlock: 7, blocks: 1, align: [] },
  2: { size: 25, dataCodewords: 34, ecPerBlock: 10, blocks: 1, align: [6, 18] },
  3: { size: 29, dataCodewords: 55, ecPerBlock: 15, blocks: 1, align: [6, 22] },
  4: { size: 33, dataCodewords: 80, ecPerBlock: 20, blocks: 1, align: [6, 26] },
  5: { size: 37, dataCodewords: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
  6: { size: 41, dataCodewords: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] },
};

// GF(256) with primitive polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a, b) {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEc(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ res[0];
    for (let i = 0; i < ecCount - 1; i++) res[i] = res[i + 1];
    res[ecCount - 1] = 0;
    for (let i = 0; i < ecCount; i++) {
      res[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return Array.from(res);
}

function pickVersion(byteLen) {
  // Byte mode overhead: 4-bit mode + 8-bit length = 2 bytes needed before payload
  const needed = byteLen + 2;
  for (let v = 1; v <= 6; v++) {
    if (needed <= VERSION_SPEC[v].dataCodewords) return v;
  }
  throw new Error('QR payload exceeds supported length (134 bytes)');
}

function encodeDataCodewords(bytes, totalDataCodewords) {
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = totalDataCodewords * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i + j];
    codewords.push(val);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }
  return codewords;
}

/** Format bits for ECC Level L (01) + Mask 0 (000) -> 15-bit BCH + XOR 0x5412 = 0x77c4 */
const FORMAT_L_MASK0 = 0x77c4;

export function buildQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text));
  const version = pickVersion(bytes.length);
  const spec = VERSION_SPEC[version];
  const size = spec.size;

  const dataCw = encodeDataCodewords(bytes, spec.dataCodewords);
  const blockSize = Math.floor(spec.dataCodewords / spec.blocks);
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = dataCw.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(slice);
    ecBlocks.push(rsComputeEc(slice, spec.ecPerBlock));
  }

  const stream = [];
  for (let i = 0; i < blockSize; i++) {
    for (const blk of dataBlocks) stream.push(blk[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const blk of ecBlocks) stream.push(blk[i]);
  }

  // Matrix: null = free, 0 = light, 1 = dark; isFunc tracks fixed function modules
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const isFunc = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      isFunc[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunc(rr, cc, inOuter && (border || center) ? 1 : 0);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0 ? 1 : 0);
    setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment pattern (Versions 2–6)
  if (spec.align.length >= 2) {
    const center = spec.align[1];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        setFunc(center + dr, center + dc, dark ? 1 : 0);
      }
    }
  }

  // Reserve format info + dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, 0);
      setFunc(i, 8, 0);
    }
  }
  for (let i = 0; i < 8; i++) setFunc(8, size - 1 - i, 0);
  for (let i = 0; i < 7; i++) setFunc(size - 1 - i, 8, 0);
  setFunc(size - 8, 8, 1); // Dark module

  // Place codeword bits in zigzag upward/downward pairs with Mask 0 ((r + c) % 2 === 0)
  const bitStream = [];
  for (const cw of stream) {
    for (let i = 7; i >= 0; i--) bitStream.push((cw >>> i) & 1);
  }
  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const c = right - dx;
        if (isFunc[r][c]) continue;
        const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
        const masked = (r + c) % 2 === 0 ? bit ^ 1 : bit;
        matrix[r][c] = masked;
      }
    }
    upward = !upward;
  }

  // Write 15-bit format info (Level L, Mask 0)
  const fmtBit = (i) => (FORMAT_L_MASK0 >>> i) & 1;
  // Around top-left finder
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i];
    matrix[r][c] = fmtBit(14 - i);
  }
  // Split across bottom-left & top-right finders
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = fmtBit(14 - i);
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = fmtBit(7 - i);

  return { size, version, matrix };
}
