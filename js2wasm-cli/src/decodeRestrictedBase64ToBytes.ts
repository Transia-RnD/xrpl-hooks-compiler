const base64DecodeMap = [
  // starts at 0x2B
  62,
  0,
  0,
  0,
  63,
  52,
  53,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 0x3A-0x40
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  0,
  0,
  0,
  0,
  0,
  0, // 0x5B-0x0x60
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
];

const base64DecodeMapOffset = 0x2b;
const base64EOF = 0x3d;

export function decodeRestrictedBase64ToBytes(encoded: string) {
  let ch: any;
  let code: any;
  let code2: any;

  const len = encoded.length;
  const padding =
    encoded.charAt(len - 2) === "="
      ? 2
      : encoded.charAt(len - 1) === "="
      ? 1
      : 0;
  const decoded = new Uint8Array((encoded.length >> 2) * 3 - padding);

  for (let i = 0, j = 0; i < encoded.length; ) {
    ch = encoded.charCodeAt(i++);
    code = base64DecodeMap[ch - base64DecodeMapOffset];
    ch = encoded.charCodeAt(i++);
    code2 = base64DecodeMap[ch - base64DecodeMapOffset];
    decoded[j++] = (code << 2) | ((code2 & 0x30) >> 4);

    ch = encoded.charCodeAt(i++);
    if (ch === base64EOF) {
      return decoded;
    }
    code = base64DecodeMap[ch - base64DecodeMapOffset];
    decoded[j++] = ((code2 & 0x0f) << 4) | ((code & 0x3c) >> 2);

    ch = encoded.charCodeAt(i++);
    if (ch === base64EOF) {
      return decoded;
    }
    code2 = base64DecodeMap[ch - base64DecodeMapOffset];
    decoded[j++] = ((code & 0x03) << 6) | code2;
  }
  return decoded;
}
