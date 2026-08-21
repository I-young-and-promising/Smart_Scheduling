# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 排班管理员 / HR，高频操作、需快速识别合规状态与班次分布
- **核心目的**: 高效编排 + 实时合规监控 + 数据导出
- **情绪基调**: 秩序感 / 掌控感；避免焦虑、视觉疲劳

### 1.2 设计方向

- **Design Style**: Grid 网格 — 甘特图为核心载体，网格线+角块强化数据对齐与秩序感
- **Application Type**: Admin/SaaS — 决定后续布局策略
- **Aesthetic Direction**: 明亮办公工具风，高辨识度色块矩阵，警告醒目但不刺眼

## 2. Color System (色彩系统)

**色彩关系**: warm-stone 画布 + 单一 cyan 主色 + 四色班次语义色 + 红色合规警告
**配色设计理由**: 按 DESIGN_BI.md 的 Seline Analytics 风格重构，整体呈现编辑感、克制、专业；仅 cyan 作为唯一彩色声音突出核心行动
**主色推导**: Primary 取 cyan `#3ba6f1` 用于「一键 AI 排班」等核心行动，标题中价值关键词使用 `#3398e1` 高亮
**使用比例**: 75% warm-stone 中性底色 / 15% 班次语义色块 / 10% cyan + 警告色

### 2.1 主题颜色

| Token                | 值                     | 说明                                            |
| -------------------- | ---------------------- | ----------------------------------------------- |
| `background`         | `#fafaf9`              | 页面底色，warm-stone 画布，绝不使用纯白作为页面底色 |
| `card`               | `#ffffff`              | 卡片/容器/导航表面背景，纯白仅用于浮动表面      |
| `foreground`         | `#0c0a09`              | 主文字 / 标题                                   |
| `muted-foreground`   | `#78716c`              | 次要文字 / 导航链接 / 描述                      |
| `primary`            | `#3ba6f1`              | 主交互色（AI 排班、保存）/ 唯一彩色填充元素      |
| `primary-foreground` | `#ffffff`              | 主交互文字                                      |
| `accent`             | `#f5f5f4`              | hover/focus 反馈背景                            |
| `accent-foreground`  | `#0c0a09`              | accent 上文字                                   |
| `border`             | `#e8e6e5`              | hairline 边框，卡片主要结构支撑                  |
| `input`              | `#d6d3d1`              | 输入框默认边框                                  |
| `stone-canvas`       | `#fafaf9`              | 画布 token                                      |
| `cyan-signal`        | `#3ba6f1`              | 主 CTA / active 图标                            |
| `cyan-edge`          | `#3398e1`              | 高亮文字与描边按钮边框                          |
| `sky-wash`           | `#c1e1f7`              | 标题高亮背景                                    |
| `shift-day`          | hsl(326, 89%, 93%)     | 早班色块（淡粉）                                |
| `shift-mid`          | hsl(173, 65%, 90%)     | 中班色块（淡青绿）                              |
| `shift-night`        | hsl(222, 94%, 86%)     | 晚班色块（淡蓝紫）                              |
| `shift-rest`         | hsl(0, 0%, 100%)       | 休班色块（白底黑字）                            |
| `shift-leave`        | hsl(172, 65%, 60%)     | 员工端休假统一色（青绿）                        |
| `schedule-weekend`   | hsl(55, 100%, 67%)     | 周末表头/休假汇总黄底（红字）                   |
| `danger`             | hsl(0, 84%, 60%)       | 合规警告/违规红框                               |

### 2.2 导航区配色

- **基调关系**: Top Nav 使用纯白 (`#ffffff`) 表面，底部 1px `border` (`#e8e6e5`) 与 warm-stone 画布分隔
- **关键状态**: 导航链接默认 `#78716c`，hover / active 为 `#0c0a09`；右侧 cyan pill CTA 是唯一彩色填充按钮
- **边界与背景**: 导航条固定顶部，`backdrop-blur` 半透明；中间重叠 Avatar 组使用 24px 圆形 + 2px 白色 ring + -8px overlap

### 2.3 语义颜色

| 用途     | HSL 值             | 说明                   |
| -------- | ------------------ | ---------------------- |
| success  | hsl(152, 69%, 45%) | 保存成功/审批通过提示    |
| warning  | hsl(38, 92%, 50%)  | 人数接近上限预警        |
| danger   | hsl(0, 84%, 60%)   | 合规违规/驳回/错误阻止  |

## 3. Typography (字体排版)

- **Display / Heading**: `Inter Tight` / `Inter` + "PingFang SC", "Microsoft YaHei", sans-serif（Roobert 不可用时的替代方案）
- **Body / Nav / UI**: Inter + "PingFang SC", "Microsoft YaHei", sans-serif
- **Mono**: JetBrains Mono + "SF Mono", monospace（工号/UID/时间数字专用）
- **Display 排版**: 52px，font-weight 400，line-height 1.12，letter-spacing -1.092px；每页主标题仅含一个 cyan highlight span（`#3398e1` 文字 + `#c1e1f7` 胶囊背景）
- **Body 排版**: 14px / 16px Inter weight 400，line-height 1.69，正文使用 `#78716c`

## 4. Layout Strategy (布局策略)

- **导航意图**: 顶部固定 Top Nav（Logo + 中部导航链接 + 重叠 Avatar 组 + 右侧登录/CTA）；不再有左侧 Sidebar
- **页面架构**: 主内容区 `mx-auto max-w-[1200px] px-4`；Section 之间垂直间距 96px；Card 内边距 24px；组件基础间距 8px
- **首页架构**: Hero 区（左对齐标题 + 双 CTA + 信任元素）→ 全宽 Floating Dashboard Preview（深阴影，侵入下一 Section）→ Body 区（2-column Feature Grid + Stats Grid）
- **响应式**: 移动端导航链接收折；Dashboard Preview 重叠效果在小屏取消；甘特图横向滚动不压缩列宽

## 5. Visual Language (视觉语言)

- **形态参数**: 按钮 / active tab 使用 `rounded-full`（9999px）；卡片使用 10px 圆角；输入框 6px 圆角；图标 4px 圆角
- **阴影层级**: 普通卡片使用 `rgba(0,0,0,0.05) 0px 4px 16px 0px`；唯一 Dashboard Preview 使用 `rgba(17,12,46,0.12) 0px 12px 45px 0px`；禁用重阴影装饰
- **边框策略**: 以 1px `#e8e6e5` hairline border 作为卡片主要结构支撑，放弃重度分割线
- **识别签名**: 首页 Hero 区呈现营销式 Dashboard Preview，内部日历应用 `grayscale(1) contrast(0.94)` 滤镜，营造极简单色质感；排班工作台仍保留月历聚合视图与班次色块语义
- **装饰策略**: 每 Section 可放置一次 Mascot Sticker（hooded 轮廓 SVG，grayscale + drop-shadow）作为视觉平衡；无渐变、无玻璃拟态、无装饰色块
- **动效原则**: 状态切换 150ms ease-out；拖拽反馈即时；AI 求解进度条线性动画
- **可及性**: 色块内文字对比度 ≥ 4.5:1；红框违规辅以 ⚠️ 图标；键盘可遍历所有甘特图单元格

## 6. Component Principles (组件原则)

- **状态完整性**: 按钮/输入框/表格行覆盖 Default/Hover/Focus/Disabled/Error；甘特图单元格支持 Selected/Dragging/Violation
- **层级清晰**: Primary 按钮为 cyan pill 填充（唯一彩色填充元素）；Secondary / Ghost 按钮为 hairline 边框透明底；Danger 操作（驳回/删除）用红色 Ghost 按钮
- **一致性**: 偏好标签统一胶囊形 + 浅色底深色字；状态标签统一带图标；弹窗宽度固定 480px

## 7. Image Direction (图片与视觉资产)

- **Image Role**: Dashboard Preview 作为产品截图（grayscale + contrast 滤镜），是首页核心视觉资产
- **Image Art Direction**: 优先通过班次色块矩阵、网格线、数据密度建立视觉记忆点；吉祥物 Mascot Sticker 为轮廓 SVG，每 Section 仅出现一次
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 不使用通用办公插图、生活摄影、抽象科技背景

## 8. 应避免 (Anti-patterns)

- ❌ 页面背景使用纯白 `#ffffff`——页面底色必须是 `#fafaf9`
- ❌ 引入除 cyan 外的新强调色（绿/紫/红仅用于状态语义）
- ❌ 在普通卡片上使用重阴影——深阴影仅保留给 Dashboard Preview
- ❌ 主标题中使用多个 cyan highlight span——每标题仅允许一个
- ❌ 按钮使用深色/中性填充作为主按钮——主按钮必须是 cyan `#3ba6f1`
- ❌ 班次色块使用渐变或透明度——降低甘特图扫视效率
- ❌ 添加玻璃拟态或装饰渐变——设计应保持扁平与纸张质感

## 9. 角色权限与发布机制

- **角色体系**: admin（管理员/HR）与 employee（普通员工）。所有已登录用户统一视为 admin；未登录访客按 employee 最小权限兜底。登录用户仍按 uid/工号匹配员工花名册（命中用本人档案），未命中则落到演示员工「张伟（employee_no=001）」档案上，便于分享体验时无需预先导入每个同事的 UID。前端以 `GET /api/me` + `useIdentity` hook 做路由与导航鉴权。
- **接口门禁**: 排班/员工/班次配置的管理接口统一经 `IdentityService.assertAdmin`；排休创建强制本人、列表按角色隔离、审批仅 admin
- **发布机制**: 排班按月维护 draft/published 状态（schedule_publish 表）；任何排班写操作（生成/改单元格/导入/删除导入）自动重置为草稿，仅 admin 在排班工作台显式发布后员工端「我的班表」可见；未发布时员工端只展示空态提示，不泄露草稿数据
