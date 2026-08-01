const Database = require('better-sqlite3');
const fs = require('node:fs')
const path = require('node:path')

// 书签 + favicon（favicons.sqlite 通过 ATTACH 关联）
const bookmarks = `
  SELECT
    b.id,
    b.title AS bookmark_title,
    p.url,
    p.title AS page_title,
    i.data
  FROM moz_bookmarks b
  LEFT JOIN moz_places p ON b.fk = p.id
  LEFT JOIN favicons.moz_pages_w_icons pw ON pw.page_url_hash = p.url_hash
  LEFT JOIN favicons.moz_icons_to_pages ip ON ip.page_id = pw.id
  LEFT JOIN favicons.moz_icons i ON i.id = ip.icon_id
  WHERE b.type = 1
`
// 历史 + favicon
const history = `
  SELECT p.url,
         p.title,
         p.visit_count                                                 AS 频次,
         datetime(p.last_visit_date / 1000000, 'unixepoch', '+8 hours') AS 最后访问,
         i.data
  FROM moz_places p
  LEFT JOIN favicons.moz_pages_w_icons pw ON pw.page_url_hash = p.url_hash
  LEFT JOIN favicons.moz_icons_to_pages ip ON ip.page_id = pw.id
  LEFT JOIN favicons.moz_icons i ON i.id = ip.icon_id
  WHERE p.visit_count > 0
    and p.title is not null
  ORDER BY p.last_visit_date DESC, p.visit_count desc
`
function getDB() {
  const profilePath = window.ztools.dbStorage.getItem("profilePath");
  const dbPath = path.join(profilePath, 'places.sqlite');
  const db = new Database(dbPath);
  // 挂载 favicons.sqlite，使其可在 SQL 中以 favicons 前缀访问
  const faviconsPath = path.join(profilePath, 'favicons.sqlite');
  db.prepare(`ATTACH DATABASE ? AS favicons`).run(faviconsPath);
  return db;
}

// 根据文件头魔数嗅探真实 MIME 类型（favicons 里没有 mime_type 字段）
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

// 把查询行里的图标 BLOB 转成 favicon data URL，并去掉原始 BLOB 字段
function hydrateFavicon(rows) {
  return (rows || []).map((row) => {
    const favicon = toDataUrl(row.data);
    const { data, ...rest } = row;
    return { ...rest, favicon };
  });
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 数据库查询
  query(sql) {
    const db = getDB();
    return db.prepare(sql).all()
  },
  // 获取书签
  getBookmarks() {
    const db = getDB();
    const rows = db.prepare(bookmarks).all();
    db.close();
    return hydrateFavicon(rows);
  },
  // 获取历史记录
  getHistory() {
    const db = getDB();
    const rows = db.prepare(history).all();
    db.close();
    return hydrateFavicon(rows);
  },
}
