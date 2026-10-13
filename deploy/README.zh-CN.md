# MailFlow 团队版部署记录

本目录由部署维护者操作，团队成员只需打开网址、登录并添加自己的邮箱。

## 当前状态

基于上游提交 `9de4acfe5ea06342c0362fd2c9d48aa4b74aa241` 准备首轮适配。
包含国内常用邮箱预设、邮箱地址自动识别与用户名填入、授权码提示、中文和浅色部署默认值。
团队用户、邀请、邮件隔离、微软授权、邮件收发引擎沿用上游实现。
项目副本：https://github.com/1122u6a/mailflow。当前尚无生产服务器，未完成公网部署或真实邮箱联调。

## 首次安装

1. 准备支持 Docker 的 Linux 服务器，核查其能连接目标邮箱服务的 993、465、587 端口；Gmail 等也需网络可达。
2. 准备域名，将 DNS 指向服务器。放行公网 80/443，数据库和缓存不开放公网。
3. 将经过检查的本项目源码放到服务器。保留 LICENSE、LICENSE-COMMERCIAL 及上游来源。
4. 安装 Docker、Docker Compose 2.21+ 与 Node.js 22（配置工具使用标准库，无需 npm 安装）。
5. 在项目根目录运行：

   ```bash
   node deploy/configure.mjs mail.example.com admin@example.com
   bash deploy/first-run.sh
   ```

   域名与证书通知邮箱需改为实际值。配置工具只在不存在 `.env` 时创建，权限为 0600。
   首次部署通过容器内部地址创建管理员，成功后才启动公网 HTTPS 入口。
   如管理员创建成功但公网入口启动失败，应直接恢复 Caddy，不能重新注册管理员。

6. 检查 HTTPS、管理员登录、关闭开放注册状态。通过管理员面板邀请成员。
7. 每位成员自行在页面填写邮箱授权信息，无需将授权码发送给维护者或放进 GitHub。

## 后续启动和更新

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml -f deploy/compose.team.yml --profile https up -d --build --wait
```

更新前备份 PostgreSQL、Redis 数据及 `.env`。备份应加密并保存到服务器之外；尤其不可丢失或随意更换 `ENCRYPTION_KEY`。
不得运行 `docker compose down -v`，否则会删除数据卷。版本升级可能包含数据库迁移，不能仅靠退回旧镜像恢复。

## 上线验收

- HTTPS 域名可访问，证书有效，HTTP 跳转正常，`/api/health` 返回正常。
- 管理员、邀请成员可登录；默认不开放公开注册。
- 两个不同成员的账户与邮件不可交叉访问。
- 每种实际使用的邮箱完成连接、同步、阅读、搜索和附件验证。
- 使用专门测试邮箱验证发送、回复、转发及附件；发件操作需明确获得授权。
- 同一用户的多个邮箱统一展示，发件身份正确。
- 重启服务器后服务与用户数据恢复；备份恢复演练通过。
- 未拿到的邮箱授权、未配置的微软应用注册、企业管理员禁止 IMAP 等问题必须明确标记，不能算作接入完成。

本环境没有 Docker daemon 或生产资源；配置工具测试和源码检查不能替代上述服务器验收。
