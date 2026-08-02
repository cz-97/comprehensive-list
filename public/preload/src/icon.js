// File: public/preload/src/icon.js
// 图标 BLOB 转 data URL（favicons 里没有 mime_type 字段，按文件头魔数嗅探）
// 根据文件头魔数嗅探真实 MIME 类型
function sniffMime(buf) {
  if (!buf || buf.length < 4) return 'image/x-icon';
  const h = buf.subarray(0, 4);
  // PNG
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return 'image/png';
  // GIF
  if (buf.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  // JPEG
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'image/jpeg';
  // WebP
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  // BMP
  if (h[0] === 0x42 && h[1] === 0x4d) return 'image/bmp';
  // SVG
  const head = buf.toString('latin1', 0, 256).trimStart();
  if (head.startsWith('<svg')) return 'image/svg+xml';
  // 默认：ICO（含 PNG 内嵌的也会被上面 PNG 分支命中）
  return 'image/x-icon';
}

// 把数据库中的图标 BLOB 转成 data URL
function toDataUrl(data) {
  if (!data) return null;
  const mime = sniffMime(Buffer.from(data));
  const b64 = Buffer.from(data).toString('base64');
  return `data:${mime};base64,${b64}`;
}

module.exports = { toDataUrl };
