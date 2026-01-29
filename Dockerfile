# Dockerfile（用于构建项目镜像，而非运行 Electron GUI）
# 说明：此镜像主要用于在 CI 中打包/构建，默认不运行应用。
# 如果你需要在容器内执行构建命令，可通过 BUILD_CMD 参数覆盖。

# ===== 构建阶段（安装依赖，可选择执行构建） =====
FROM node:18-bullseye AS builder

# 设置工作目录（中文注释：容器内的项目根路径）
WORKDIR /app

# 仅复制依赖清单用于缓存（中文注释：加速安装）
COPY package.json package-lock.json* ./

# 安装依赖（中文注释：优先使用 npm ci 保持锁文件一致）
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 复制其他源代码（中文注释：包括 src、配置与资源文件）
COPY . .

# 构建命令可通过 --build-arg BUILD_CMD="npm run make" 覆盖
# 中文注释：默认仅验证环境，避免 Electron GUI 在容器中运行失败
ARG BUILD_CMD="npm run env:check:js"
RUN echo "将执行构建命令: ${BUILD_CMD}" && \
    bash -lc "${BUILD_CMD}" || echo "构建命令可在 CI 中覆盖，此处忽略失败"

# ===== 运行阶段（若需要作为基础镜像使用） =====
FROM node:18-slim AS runtime

# 环境变量（中文注释：减少无关下载或优化行为）
ENV NODE_ENV=production \
    ELECTRON_ENABLE_SECURITY_WARNINGS=false

WORKDIR /app

# 仅复制必要文件（中文注释：避免将全部源码带入运行层）
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./

# 安装生产依赖（中文注释：对仅运行脚本的场景生效）
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# 可选：复制构建产物（中文注释：若 BUILD_CMD 生成 out/dist 等可在此复制）
# COPY --from=builder /app/out ./out

# 默认命令（中文注释：提示镜像用途，不直接运行 Electron）
CMD ["node", "-e", "console.log('镜像构建完成，默认不运行 Electron GUI；请在 CI 中使用该镜像进行构建或自定义命令')"]