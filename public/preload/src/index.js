// File: public/preload/src/index.js
// 预加载入口：通过 window 对象向渲染进程注入 nodejs 能力。
// 本文件经 esbuild 打包为单文件 public/preload/services.js，供 ztools 加载。
const fs = require('node:fs');
const { SQL, open } = require('./db');
const { toDataUrl } = require('./icon');
const { getGithubStars } = require('./github');

// 根据 profilePath 打开数据库（从 dbStorage 读取）
function getDB() {
  const profilePath = window.ztools.dbStorage.getItem('profilePath');
  return open(profilePath);
}

// 读文件
function readFile(file) {
  return fs.readFileSync(file, { encoding: 'utf-8' });
}

// 数据库查询
function query(sql) {
  const db = getDB();
  try {
    return db.prepare(sql).all();
  } finally {
    db.close();
  }
}

// 获取书签（只含 icon_id，不含图标 BLOB）
function getBookmarks() {
  const db = getDB();
  try {
    return db.prepare(SQL.bookmarks).all();
  } finally {
    db.close();
  }
}

// 获取历史记录（只含 icon_id，不含图标 BLOB）
function getHistory() {
  const db = getDB();
  try {
    return db.prepare(SQL.history).all();
  } finally {
    db.close();
  }
}

// 增量取回图标，返回 { byId, byDomain, maxId }。
// byId 按图标 id 索引；byDomain 按域名索引（无关联表记录时按域名回退）。
function getIcons(fromId = 0) {
  const db = getDB();
  let rows;
  try {
    rows = db.prepare(SQL.iconsSince).all(fromId);
  } finally {
    db.close();
  }
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
}

// 通过 GitHub API 获取用户的所有星标仓库
async function getStars(username) {
  const token = window.ztools.dbStorage.getItem('githubToken') || '';
  return getGithubStars(username, token);
}

window.services = {
  readFile,
  query,
  getBookmarks,
  getHistory,
  getIcons,
  getGithubStars: getStars,
};
