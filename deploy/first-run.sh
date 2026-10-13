#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo '缺少 .env，请先运行 deploy/configure.mjs。' >&2
  exit 1
fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  echo '请先安装 Docker 和 Docker Compose 2.21 或更新版本。' >&2
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo '首次部署需要交互终端，以便安全设置管理员密码。' >&2
  exit 1
fi
compose=(docker compose -f docker-compose.yml -f docker-compose.https.yml -f deploy/compose.team.yml --profile https)
"${compose[@]}" config --quiet

# The HTTPS overlay removes frontend host ports. Caddy stays stopped while the
# administrator is created, preventing outsiders from claiming the first user.
if [[ -n "$("${compose[@]}" ps --status running -q caddy)" ]]; then
  echo '发现已运行的公网入口。此脚本仅用于全新安装，已停止。' >&2
  exit 1
fi
"${compose[@]}" up -d --build --wait frontend

read -r -p '设置管理员用户名：' team_admin_name
read -r -s -p '设置管理员密码（至少 8 位）：' team_admin_password
printf '\n'
if [[ -z "$team_admin_name" || ${#team_admin_password} -lt 8 ]]; then
  unset team_admin_password
  echo '用户名不能为空，密码至少 8 位。公网入口未启动。' >&2
  exit 1
fi

printf '%s\n%s\n' "$team_admin_name" "$team_admin_password" |
  "${compose[@]}" exec -T backend node --input-type=module -e '
    const parts = [];
    for await (const chunk of process.stdin) parts.push(chunk);
    const [username, password] = Buffer.concat(parts).toString().split("\n");
    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      console.error("管理员创建失败，公网入口未启动。请检查是否已有管理员或用户名、密码是否符合要求。");
      process.exit(1);
    }
    const result = await response.json();
    if (!result.user?.isAdmin) {
      console.error("注册结果不是管理员，公网入口未启动。");
      process.exit(1);
    }
    console.log("管理员已创建。");
  '
unset team_admin_password

"${compose[@]}" up -d --wait caddy
echo '服务已启动。仍需检查域名 HTTPS 证书、登录和真实邮箱收发，全部通过后才能宣布上线。'
