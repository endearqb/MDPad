
# 把补丁号加 1。比如 0.1.12 -> 0.1.13
pnpm version:bump:patch

# 把次要号加 1。比如 0.1.12 -> 0.2.0
pnpm version:bump:minor

# 把主号加 1。比如 0.1.12 -> 1.0.0
pnpm version:bump:major

# 把补丁号加 1。比如 0.1.12 -> 0.1.13 构建安装包 
pnpm release:patch

# 把次要号加 1。比如 0.1.12 -> 0.2.0 构建安装包
pnpm release:minor

# 把主号加 1。比如 0.1.12 -> 1.0.0 构建安装包
pnpm release:major

# 直接构建安装包
pnpm release:no-bump
