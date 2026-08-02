// File: public/preload/src/db.js
// 数据库连接与查询（读取 Firefox 配置文件夹下的 places.sqlite / favicons.sqlite）
const Database = require('better-sqlite3');
const path = require('node:path');

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
`;
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
`;
// 按 id 增量取图标（id 自增；传上次已加载的最大 id）；icon_url 用于按域名回退匹配
const iconsSince = `
  SELECT id, width, icon_url, data FROM favicons.moz_icons WHERE id > ?
`;

const SQL = { bookmarks, history, iconsSince };

// 打开数据库并挂载 favicons.sqlite，使其可在 SQL 中以 favicons 前缀访问
function open(profilePath) {
  const db = new Database(path.join(profilePath, 'places.sqlite'));
  db.prepare('ATTACH DATABASE ? AS favicons').run(path.join(profilePath, 'favicons.sqlite'));
  return db;
}

module.exports = { SQL, open };
