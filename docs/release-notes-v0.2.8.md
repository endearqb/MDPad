# MDPad v0.2.8 更新说明

发布日期：2026-04-25

## 亮点更新
- HTML 预览回到更稳定的普通页面模式：
  - 移除了 MDPad 自带的 HTML 幻灯片模式、阅读/演示工具栏、自动 slide 检测和 section 显隐改写，避免用户 HTML 被预览层意外重排或隐藏。
  - 普通 HTML 预览、资源路径重写、导出入口、文本编辑和图表编辑链路继续保留。
- SVG 编辑能力重新接回主流程：
  - HTML 预览中的 inline SVG 可通过双击或右键打开 SVG 编辑弹窗。
  - SVG 编辑后会写回 HTML 状态并刷新预览，关闭弹窗后页面中的 SVG 会立即更新。
  - 连接线命中范围扩大，折线、正交 path 和端点附近更容易被选中。
- 窗口控制体验升级：
  - 右上角窗口尺寸入口改为横向菜单，提供 `40% x 90%`、`16:9 Slide`、最大化和全屏四个常用动作。
  - 全屏状态由 App 层统一管理，进入全屏后隐藏自绘 titlebar 和底部 statusbar，主区域铺满窗口。

## 体验优化
- HTML 渲染页中的 SVG 点击不再显示蓝色选中框或控制点，避免普通阅读/预览时出现编辑态视觉噪音。
- SVG 编辑弹窗去掉默认元素标注，画布上不再显示“矩形 / 直线 / 文字”等标签；未选中元素只保留透明命中层，选中元素才显示蓝色边框和控制点。
- SVG 编辑弹窗新增“最大化宽度 / 恢复宽度”按钮，可临时扩展到当前应用视口宽度，更适合编辑宽图或复杂结构图。
- SVG 文字编辑区收口为单个输入框视觉，圆角跟随当前应用窗口模式。
- 右上角窗口菜单视觉与左侧文件菜单对齐，classic / modern 两套 UI 下都保持一致的弹层观感。

## 技术调整
- 恢复并补齐 SVG 编辑器组件、几何 helper、会话 helper、iframe 消息协议和 `applySvgPatch` 写回能力。
- SVG 连接线命中从原始 bbox 判定扩展为线段距离判定，并保留 bbox fallback。
- 下线 HTML slide 偏好、slide detection helper 和相关测试，降低 HTML 预览宿主脚本的职责复杂度。
- 新增和更新 HTML Preview、SVG 编辑、窗口菜单、全屏布局与窗口预设相关测试。
- 版本号已同步到 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 和 `Cargo.lock`。

## 安装包
- Windows NSIS 安装包：`MDPad_0.2.8_x64-setup.exe`
- SHA256：`491C163016CB329CB1C440BC61B89D209459924618F04F5AD1B3AC0EBAEC354F`
