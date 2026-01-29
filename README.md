# ffo-auto-script

> 中文说明：本项目为 Electron 应用；容器镜像主要用于在 CI 中进行构建/打包，不直接运行 GUI。

## 镜像构建与推送（GitHub Actions）

- 工作流位置：`.github/workflows/docker-image.yml`
- 触发方式：推送到 `main`、打 `v*` 标签、或手动触发
- 默认推送到 GHCR：`ghcr.io/<owner>/<repo>:<tag>`

### 使用步骤

1. 在仓库 Settings 中启用 Actions 与 Packages 权限（允许写入 Packages）。
2. 推送至 `main` 或创建版本标签（例如 `v1.0.0`）。
3. 访问 Actions 页面查看构建日志与生成的镜像标签。

### 修改示例

- 如需指定自定义构建命令，可在 `Dockerfile` 构建阶段通过：
  ```bash
  docker build --build-arg BUILD_CMD="npm run make" -t your-image:tag .
  ```
- 如需推送到其他镜像注册表，修改 `docker-image.yml` 中的登录与 `images` 设置。

## 本地构建镜像

```bash
# 构建镜像（中文注释：默认不运行 Electron GUI，仅用于构建环境）
docker build -t ffo-auto-script:local .

# 运行镜像（中文注释：默认命令仅打印说明，不启动应用）
docker run --rm ffo-auto-script:local
```

## 注意事项

- Electron GUI 不适合直接在容器中运行，建议在 CI 中使用镜像进行打包或生成工件。
- 如需在 Linux 下产出安装包（deb/rpm），可在构建阶段将 `BUILD_CMD` 设置为 `npm run make`，并确保镜像内具备必要的系统依赖。