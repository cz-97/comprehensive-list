const Database = require('better-sqlite3');
const fs = require('node:fs')
const path = require('node:path')

const bookmarks =`
  SELECT 
    b.id, 
    b.title AS bookmark_title, 
    p.url, 
    p.title AS page_title
  FROM moz_bookmarks b
  left JOIN moz_places p ON b.fk = p.id
  where b.type = 1
`
const history = `
  SELECT p.url,
         p.title,
         p.visit_count                                                  as 频次,
         datetime(p.last_visit_date / 1000000, 'unixepoch', '+8 hours') AS 最后访问
  FROM moz_places p
  WHERE visit_count > 0
    and title is not null
  ORDER BY last_visit_date DESC, visit_count desc
`
function getDB() {
  const profilePath = window.ztools.dbStorage.getItem("profilePath");
  const dbPath = path.join(profilePath, 'places.sqlite');
  return new Database(dbPath);
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
    return window.services.query(bookmarks)
  },
  // 获取历史记录
  getHistory() {
    return window.services.query(history)
  },
}
