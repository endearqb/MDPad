# MDPad 开发记录：从 v0.1.0 到 v0.1.8 的一周密集迭代

2026 年 2 月 23 日到 2026 年 3 月 1 日，MDPad 进入了高频迭代期。  
从最初的安装包可用性、多窗口能力，到编辑器交互稳定性、Markdown 兼容性，再到目录（TOC）、只读模式、内置示例文档与发布流程规范化，项目在“功能扩展”和“工程质量”两条线上同时推进。

这轮迭代里最明显的变化有三点：

1. 编辑体验从“能用”走向“稳定可控”  
划词菜单、Slash 菜单、链接点击路由、只读模式拦截、Mermaid/公式/代码块等关键链路都做了重构或收敛，减少了“看起来点到了但命令没生效”的交互不确定性。

2. Markdown 兼容面显著扩大  
针对 `callout`、Obsidian 图片语法、本地路径（含 Windows `\\?\`）、`file:///`、BOM/FEFF、列表后 fenced code 等问题补齐了解析与回归测试，提升了跨编辑器迁移和历史文档打开成功率。

3. 发布工程化成熟度提升  
版本单源管理（`package.json` -> Tauri 同步）、标准化构建验证（`test/build/tauri build`）、Release 资产上传、README 中英同步、MIT 协议与仓库公开化，形成了可重复执行的发布链路。

---

## 版本演进与功能/修复对照表

> 说明：以下按 `tasks/todo.md` 为主整理；`v0.1.1`、`v0.1.7` 在 tasks 中缺少独立发布回顾，表内做了“按时间线推断”标注。

| 版本 | 发布时间（UTC） | 功能更新（Feature） | Bug 修复 / 稳定性（Fix） | 发布 |
| --- | --- | --- | --- | --- |
| v0.1.0 | 2026-02-23 | 多窗口文档模式、无标题栏 UI、图标链路重建、NSIS 中英安装语言 | 修复文件关联启动弹控制台窗口（Windows GUI subsystem） | https://github.com/endearqb/MDPad/releases/tag/v0.1.0 |
| v0.1.1 | 2026-02-24 | tasks 文档无独立回顾（功能明细未单列） | tasks 文档无独立回顾（修复明细未单列） | https://github.com/endearqb/MDPad/releases/tag/v0.1.1 |
| v0.1.2 | 2026-02-24 | Modern/Classic 双 UI 主题切换与持久化 | 主题切换相关样式与构建链路稳定化 | https://github.com/endearqb/MDPad/releases/tag/v0.1.2 |
| v0.1.3 | 2026-02-25 | TopBar/File 菜单重构、StatusBar 主题入口、40%x90% 伪最大化 | Classic/Modern 边框阴影差异化与交互细节修正 | https://github.com/endearqb/MDPad/releases/tag/v0.1.3 |
| v0.1.4 | 2026-02-25 | 编辑器能力扩展（callout、图片语法兼容、菜单职责分离） | 本地图片路径、`\\?\`、`file:///`、粘贴落盘与渲染失败等兼容修复 | https://github.com/endearqb/MDPad/releases/tag/v0.1.4 |
| v0.1.5 | 2026-02-26 | 代码块复制按钮、Mermaid 交互升级、启动故障兜底页 | 划词菜单点击失效、Mermaid 下载失效、安装版白屏风险修复 | https://github.com/endearqb/MDPad/releases/tag/v0.1.5 |
| v0.1.6 | 2026-02-28 | 版本单源脚本、打开速度优化（P0/P1）、中英文切换、默认文件名本地化 | 修复“未修改也提示 Unsaved”、去除打开时 Loading 文案界面 | https://github.com/endearqb/MDPad/releases/tag/v0.1.6 |
| v0.1.7 | 2026-02-28 |（按时间线推断）TOC 插件接入与目录键轨策略、UI Slate 化收敛 |（按时间线推断）暗色粗体可见性、列表后代码块与二次渲染问题修复 | https://github.com/endearqb/MDPad/releases/tag/v0.1.7 |
| v0.1.8 | 2026-03-01 | 链接路由（锚点/外链/相对 md）、内置中英 sample、只读/可编辑模式、Bubble 媒体按钮、MIT + Public | 链接双开冲突、只读交互反馈、BOM/FEFF 与 callout 边界解析修复 | https://github.com/endearqb/MDPad/releases/tag/v0.1.8 |

---

## 这轮迭代的工程经验

- “根因优先”比“补丁优先”更省总成本。  
- 编辑器交互问题优先排查事件时序和生命周期，而不是先改样式。  
- Markdown 兼容要统一入口（打开文件与粘贴共用解析链路）。  
- 发布流程必须可脚本化、可回放、可校验（版本、构建、资产、标签一致）。
