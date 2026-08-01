const Database = require('better-sqlite3');
const fs = require('node:fs')
const path = require('node:path')

// 书签 + icon_id（只取 icon id，不带 BLOB；按书签分组去重，避免一个书签命到多个图标而重复）
const bookmarks = `
  SELECT
    b.id,
    b.title AS bookmark_title,
    p.url,
    p.title AS page_title,
    MAX(i.id) AS icon_id
  FROM moz_bookmarks b
  LEFT JOIN moz_places p ON b.fk = p.id
  LEFT JOIN favicons.moz_pages_w_icons pw ON pw.page_url_hash = p.url_hash
  LEFT JOIN favicons.moz_icons_to_pages ip ON ip.page_id = pw.id
  LEFT JOIN favicons.moz_icons i ON i.id = ip.icon_id
  WHERE b.type = 1
  GROUP BY b.id
`
// 历史 + icon_id（按 place 分组去重，避免一个历史命到多个图标而重复）
const history = `
  SELECT p.id,
         p.url,
         p.title,
         p.visit_count                                                 AS 频次,
         datetime(p.last_visit_date / 1000000, 'unixepoch', '+8 hours') AS 最后访问,
         MAX(i.id)                                                     AS icon_id
  FROM moz_places p
  LEFT JOIN favicons.moz_pages_w_icons pw ON pw.page_url_hash = p.url_hash
  LEFT JOIN favicons.moz_icons_to_pages ip ON ip.page_id = pw.id
  LEFT JOIN favicons.moz_icons i ON i.id = ip.icon_id
  WHERE p.visit_count > 0
    and p.title is not null
  GROUP BY p.id
  ORDER BY MAX(p.last_visit_date) DESC, MAX(p.visit_count) desc
`
// 按 id 增量取图标（id 自增；传上次已加载的最大 id）；icon_url 用于按域名回退匹配
const iconsSince = `
  SELECT id, width, icon_url, data FROM favicons.moz_icons WHERE id > ?
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
  // 获取书签（只含 icon_id，不含图标 BLOB）
  getBookmarks() {
    const db = getDB();
    const rows = db.prepare(bookmarks).all();
    db.close();
    return rows;
  },
  // 获取历史记录（只含 icon_id，不含图标 BLOB）
  getHistory() {
    const db = getDB();
    const rows = db.prepare(history).all();
    db.close();
    return rows;
  },
  // 增量取回图标，返回 { byId, byDomain, maxId }。
  // 只取 id > fromId 的新图标（id 自增）；maxId 为本次拉取到的最新 id，供下次继续增量。
  // byId 按图标 id 索引；byDomain 按域名索引（无关联表记录时按域名回退）。
  getIcons(fromId = 0) {
    const db = getDB();
    const rows = db.prepare(iconsSince).all(fromId);
    db.close();
    const byId = {}, byDomain = {};
    let maxId = fromId;
    for (const r of rows) {
      const dataUrl = toDataUrl(r.data);
      if (!dataUrl) continue;
      if (r.id > maxId) maxId = r.id;
      const w = r.width ?? 0;
      // 按图标 id
      if (!byId[r.id] || w > byId[r.id].width) byId[r.id] = { width: w, url: dataUrl };
      // 按域名（从 icon_url 提取 host，去掉 www 前缀）
      try {
        const host = new URL(r.icon_url).hostname.replace(/^www\./, '') || '';
        if (host && (!byDomain[host] || w > byDomain[host].width)) byDomain[host] = { width: w, url: dataUrl };
      } catch (e) { /* 忽略非法 icon_url */ }
    }
    return { byId, byDomain, maxId };
  },
}
