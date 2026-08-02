// File: public/preload/src/github.js
// 通过 GitHub API 获取用户的所有星标仓库（自动分页，最多 10 页 / 1000 个）。
// 未认证的 GitHub API 限额 60 次/小时；可配置 token 提升到 5000 次/小时。
async function getGithubStars(username, token) {
  if (!username) throw new Error('缺少 GitHub 用户名');
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'firefox-bookmark-history' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const url = 'https://api.github.com/users/' + encodeURIComponent(username) + '/starred?per_page=100&page=' + page;
    const res = await fetch(url, { headers });
    if (res.status === 404) throw new Error('GitHub 用户不存在: ' + username);
    if (res.status === 403) throw new Error('GitHub API 限流（rate limit），请稍后再试或配置 GITHUB_TOKEN');
    if (!res.ok) throw new Error('GitHub API 错误: ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
  }
  // 只保留前端需要的字段，避免体积过大
  return repos.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    description: r.description,
    html_url: r.html_url,
    url: r.html_url,
    language: r.language,
    stargazers_count: r.stargazers_count,
    owner: { login: r.owner?.login },
  }));
}

module.exports = { getGithubStars };
