// Génère les icônes PNG (fond sombre, cap stylisé) sans dépendance externe.
// PNG minimal : RGBA, un IDAT zlib. Dessin : disque dégradé + chevron "cap".
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // fond : dégradé sombre subtil
      const t = y / size
      let r = 12 + t * 8, g = 12 + t * 10, b = 16 + t * 16, a = 255

      // chevron "cap" pointant vers le haut, bleu système
      const nx = (x - cx) / size, ny = (y - cy) / size
      const w = 0.055 // demi-épaisseur du trait
      const insideChevron = (() => {
        // deux segments : (-0.22,0.14)->(0,-0.16) et (0,-0.16)->(0.22,0.14)
        const seg = (x1, y1, x2, y2) => {
          const dx = x2 - x1, dy = y2 - y1
          const len2 = dx * dx + dy * dy
          let tt = ((nx - x1) * dx + (ny - y1) * dy) / len2
          tt = Math.max(0, Math.min(1, tt))
          const px2 = x1 + tt * dx, py2 = y1 + tt * dy
          const d = Math.hypot(nx - px2, ny - py2)
          return d < w
        }
        return seg(-0.22, 0.14, 0, -0.16) || seg(0, -0.16, 0.22, 0.14)
      })()
      // point sous le chevron
      const dot = Math.hypot(nx, ny - 0.22) < 0.045

      if (insideChevron || dot) {
        r = 10; g = 132; b = 255
      }
      px[i] = Math.round(r); px[i + 1] = Math.round(g); px[i + 2] = Math.round(b); px[i + 3] = a
    }
  }
  return png(size, size, px)
}

mkdirSync('public/icons', { recursive: true })
for (const s of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${s}.png`, drawIcon(s))
  console.log(`icon-${s}.png`)
}
