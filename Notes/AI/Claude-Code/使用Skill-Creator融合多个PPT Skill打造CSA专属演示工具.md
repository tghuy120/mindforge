---
title: 使用 Skill-Creator 融合多个 PPT Skill 打造 CSA 专属演示工具
created: 2026-03-23
tags: [AI, claude-code, skill-creator, skill, ppt, csa, azure, workflow, orchestration, plugin, eval]
---

# 使用 Skill-Creator 融合多个 PPT Skill 打造 CSA 专属演示工具

作为 Azure CSA（Cloud Solution Architect），做 PPT 是日常高频任务。客户方案演示、内部技术分享、Workshop 培训、架构评审、AI Tour 活动......场景多样，格式各异。在 Claude Code 中积累了多个 PPT 相关的 skill 后，一个自然的想法浮现出来：**能不能用 skill-creator 把它们融合成一个 CSA 专属的 PPT skill？**

本文记录了这次实践的完整过程和关键收获。

---

## 1. 起点：五个 PPT Skill + 若干 MCP Server

在开始之前，手头已经有以下 5 个 PPT 相关的 skill：

| Skill | 核心能力 | 输出格式 | 技术栈 |
|-------|---------|---------|--------|
| **azure-diagrams** | 700+ Azure 组件架构图、泳道图、ERD、Timeline | PNG/SVG | Python diagrams + matplotlib |
| **excalidraw-diagram** | 手绘风格概念图、流程图 | .excalidraw + PNG | Excalidraw JSON + Playwright 渲染 |
| **frontend-slides** | 动画丰富的 HTML 演示，中文友好 | 单 HTML 文件 | 纯 HTML/CSS/JS |
| **pptx** | 底层 OOXML 操作，HTML 转 PPTX | .pptx | Node.js + Python |
| **skywork-ppt** | 本地快速生成/编辑 PPT，模板复用 | .pptx | python-pptx |

此外还有 MCP Server 可配合使用：Tavily（web search）、Figma、Pencil 等。

**目标**：融合这些 skill，做一个 CSA 专属的 PPT skill——不是简单拼接，而是一个能根据场景自动选择最优工具组合的**智能编排层**。

---

## 2. 使用 /skill-creator 启动创建流程

在 Claude Code 中执行 `/skill-creator`，skill-creator 首先询问了几个关键问题来理解需求：

**Q1：统一 skill 的核心工作流应该是怎样的？**
- 回答：混合模式——自动判断 + 可手动选择

**Q2：最终输出格式的优先级？**
- 回答：按场景灵活选择，不固定

**Q3：是否需要模板复用？**
- 回答：两者都要——自有模板 + 外部给的模板

**Q4：最常见使用场景？**
- 客户方案演示
- 内部技术分享
- Workshop/培训
- 架构评审
- AI Tour 活动 PPT
- HR 给模板填内容

这些回答帮助 skill-creator 精准理解了 CSA 角色的实际需求。

---

## 3. Explore Agent 自动分析现有 Skill

skill-creator 启动了 **Explore agent**，花了约 2 分钟（38 次工具调用）详细分析了所有 5 个 skill 的结构和能力。这个过程完全自动，不需要手动介入。

Explore agent 做的事情包括：
- 读取每个 skill 的 `SKILL.md`
- 分析引用的脚本和模板文件
- 梳理每个 skill 的输入输出能力
- 识别能力重叠和互补关系
- 生成完整的**能力矩阵**

这一步的价值在于：它比人手动对比 5 个 skill 要全面得多，尤其是对工具链细节（比如哪个工具的 CJK 字体处理更好）的挖掘。

---

## 4. 核心设计：编排层而非合并层

这是整个过程中**最关键的架构决策**。

skill-creator 设计出的 csa-ppt skill **不复制**子 skill 的代码，而是作为一个**智能编排层**，通过 Decision Framework 做路由。

### Decision Framework 的四个维度

**维度 1：内容类型 --> 选择图表工具**

| 内容需求 | 推荐工具 |
|---------|---------|
| Azure 架构图 | azure-diagrams |
| 手绘/概念图 | excalidraw-diagram |
| 泳道/业务流程 | azure-diagrams（matplotlib） |
| 设计稿/线框图 | Figma 或 Pencil MCP |

**维度 2：交付格式 --> 选择 Deck 工具**

| 交付场景 | 推荐工具 |
|---------|---------|
| 给了 .pptx 模板 | skywork-ppt 或 pptx（OOXML） |
| 客户正式交付 | pptx（html2pptx）或 skywork-ppt |
| 内部分享/演示 | frontend-slides（动画/中文多时）或 skywork-ppt |
| Workshop 教学 | frontend-slides |

**维度 3：语言编码**

| 语言特征 | 推荐路线 |
|---------|---------|
| 中文为主 | 优先 frontend-slides（彻底避开字体嵌入问题） |
| 必须 .pptx 且中文 | pptx 的 html2pptx.js（CJK 处理优于 python-pptx） |

**维度 4：模板处理**

| 模板需求 | 推荐工具 |
|---------|---------|
| 简单文字 + 图片填充 | skywork-ppt |
| 复杂格式/严格占位符 | pptx OOXML |

---

## 5. 三种编排模式

基于 Decision Framework，skill 定义了三种典型的编排模式：

### Pattern 1：Diagrams + Deck（最常用）

1. 先用 azure-diagrams 或 excalidraw 生成图表，保存为高分辨率 PNG
2. 再用 pptx 或 skywork-ppt 组装 Deck，引用生成的图片
3. 验证渲染结果

**典型场景**：客户架构方案演示——先画架构图，再组装成 PPT。

### Pattern 2：Research + Content + Deck

1. Tavily 搜索研究（Azure 文档、案例、最新价格）
2. 组织叙事结构
3. 生成图表
4. 组装 Deck

**典型场景**：内部技术分享——需要先做主题调研再做 PPT。

### Pattern 3：Template + Content Fill

1. 分析模板结构（占位符、版式、品牌元素）
2. 研究内容
3. 生成图表
4. 填充模板
5. 验证

**典型场景**：AI Tour 活动给的品牌模板、HR 给的公司模板做季度分享。

---

## 6. 场景映射速查表

| 场景 | 推荐路线 |
|------|---------|
| AI Tour 活动给的品牌模板 | skywork-ppt --mode template |
| HR 给的公司模板做季度分享 | skywork-ppt --mode template |
| 客户给的模板（格式严格） | pptx OOXML（更精确控制） |
| 需要在模板中嵌入架构图 | azure-diagrams 生成图片 --> skywork-ppt 填充模板 |
| 中文多的内部分享 | frontend-slides |
| 需要丰富动画效果 | frontend-slides |
| 正式客户交付 | pptx（html2pptx）或 skywork-ppt |

---

## 7. 生成的文件结构

skill-creator 最终生成了以下文件：

```
.claude/skills/csa-ppt/
├── SKILL.md                            # 核心编排文件（196 行）
└── references/
    ├── workflow-customer-demo.md        # 客户方案演示流程
    ├── workflow-tech-sharing.md         # 内部技术分享流程
    ├── workflow-workshop.md             # Workshop/培训流程
    ├── workflow-architecture-review.md  # 架构评审流程
    └── workflow-template-fill.md        # 模板填充流程
```

`SKILL.md` 是核心，包含 Decision Framework 和编排逻辑。`references/` 下的五个文件是每个典型场景的详细操作流程文档，Claude Code 在实际执行时会按需加载。

---

## 8. 关键收获

### 8.1 Skill-Creator 的工作方式

skill-creator 不是简单拼接代码，它的工作流程是：
1. **充分了解角色和需求场景**——通过对话确认
2. **自动探索所有现有 skill 的能力边界**——Explore agent 深度分析
3. **设计编排层**——不合并，而是路由
4. **为每个典型场景生成具体操作流程文档**——可执行的 reference

### 8.2 编排层 vs 合并层

这是最重要的设计理念。编排层带来三个好处：
- **子 skill 更新时，csa-ppt 自动获益**——因为不复制代码，只引用
- **职责清晰**——每个工具做自己最擅长的事
- **灵活组合**——比如 azure-diagrams 生成图 + skywork-ppt 填模板，两个工具各司其职

反过来，如果做"合并层"（把所有代码堆在一起），会导致维护困难、能力退化、版本不同步等一系列问题。

### 8.3 中文 PPT 的处理方案

这是 CSA 工作中的实际痛点。skill 明确给出了分层方案：
- **中文多的内容** --> 优先 HTML（frontend-slides），彻底避开字体嵌入问题
- **必须 .pptx 且中文** --> 用 pptx 的 html2pptx.js，比 python-pptx 的 CJK 处理更好
- **英文为主的客户交付** --> skywork-ppt 或 pptx 均可

### 8.4 MCP Server 的配合

skill 设计充分利用了已有的 MCP 生态：
- **Tavily**：做内容研究（Azure 文档、案例、最新价格）
- **Figma/Pencil**：设计稿 --> 演示内容
- **Playwright**：截取 Azure Portal 界面截图嵌入 PPT

MCP Server 和 Skill 的配合，本质上是**数据获取**和**内容生成**的协作。Skill 定义"怎么做"，MCP 提供"做什么"。

### 8.5 质量清单

skill 内置了 CSA 演示的质量检查清单，确保交付质量。这一点在实际工作中很重要——不只是"能生成 PPT"，还要保证专业度。

---

## 9. Eval 测试验证

skill-creator 还内置了测试评估流程。针对 csa-ppt 设计了 **3 个测试用例**，分别覆盖最核心的使用场景，并同时跑 **with-skill** 和 **baseline**（无 skill 对照组），共 6 个 subagent 并行运行。

### 测试用例设计

| # | 场景 | 测试重点 |
|---|------|---------|
| 1 | 客户 RAG 方案演示（.pptx + 架构图） | 路由到 azure-diagrams 生成架构图 + pptx 组装 deck，中文处理 |
| 2 | 内部 AKS→ACA 技术分享（HTML） | 自动判断用 frontend-slides（中文多 + 内部分享），对比表格 + 迁移步骤 |
| 3 | HR 模板填充（template fill） | 分析模板结构 → 映射内容 → 保持模板风格填充 |

每个测试用例都有 5-6 个断言（assertions）来量化评估，比如：`correct_routing`（路由正确性）、`architecture_diagram_exists`（架构图是否生成）、`chinese_rendering`（中文渲染）、`template_style_preserved`（模板样式保留）等。

### 测试结果

| 测试 | With-Skill | Baseline | 对比 |
|------|-----------|----------|------|
| **Eval 1：客户 RAG 演示** | 10 页 pptx + 2 个架构图 PNG + HTML slides | 10 页 pptx + 2 个 SVG + 演讲稿 | Skill 版用 azure-diagrams 生成了真正的架构图并嵌入 pptx |
| **Eval 2：ACA 技术分享** | 26 页 HTML（Noto Sans SC, viewport 适配, 388s/76K tokens） | 26 页 HTML（暗色主题, 234s/56K tokens） | Skill 版明确路由到 frontend-slides，中文字体 + 响应式更规范 |
| **Eval 3：模板填充** | 8 页 pptx（**166s**/65K tokens） | 8 页 pptx（**370s**/66K tokens） | Skill 版快了 **2.2 倍**（直接路由到 skywork-ppt 模板流程） |

### 关键发现

- **模板场景（Eval 3）收益最大**——with-skill 版本因为 Decision Framework 直接路由到 skywork-ppt 的模板工作流，跳过了 baseline 中的"摸索最佳工具"阶段，速度提升 2.2 倍
- **HTML 场景（Eval 2）质量更高**——with-skill 版本明确使用了 Noto Sans SC 中文字体、viewport 适配（`clamp()` + responsive breakpoints）、`prefers-reduced-motion` 无障碍适配等规范做法
- **架构图场景（Eval 1）路由更精准**——with-skill 版本自动调用 azure-diagrams 生成包含 Azure OpenAI、AI Search 等组件的专业架构图
- Baseline 在没有 skill 指导时也能产出不错的结果（Claude Code 本身能力强），但需要更多时间去"发现"最佳路线

---

## 10. Plugin 打包与发布

创建了 skill 之后，下一步是让同事也能方便地安装和使用。csa-ppt 是一个编排层，依赖 5 个子 skill 来实际执行，所以采用了**全部打包成一个 plugin** 的方式。

### Plugin 结构

```
csa-ppt-plugin/                          # 1.8MB, 110 files
├── .claude-plugin/
│   ├── plugin.json                      # Plugin 元数据（名称、版本、描述、skill 列表）
│   └── marketplace.json                 # Marketplace 配置（owner、source）
├── README.md                            # 使用说明
└── skills/
    ├── csa-ppt/          (32KB)         # 智能编排层
    ├── azure-diagrams/   (296KB)        # Azure 架构图（700+ 组件）
    ├── excalidraw-diagram/ (60KB)       # 手绘风格图表
    ├── frontend-slides/  (72KB)         # HTML 演示（中文友好）
    ├── pptx/             (1.3MB)        # OOXML 级 PowerPoint 操作
    └── skywork-ppt/      (84KB)         # 快速 PPT 生成/模板
```

### 打包要点

1. **使用 `rsync` 复制子 skill，排除 `.git`、`.venv`、`__pycache__`、`node_modules` 等不需要的文件**——这些目录会显著增大 plugin 体积
2. **`plugin.json` 中列出所有 skill 路径**——让 Claude Code 知道有哪些 skill 可用
3. **`marketplace.json` 配置 owner 和 source**——支持通过 marketplace 机制分发
4. **清理 `.DS_Store` 和测试 eval 文件**——保持 plugin 干净

### 发布到 GitHub

使用 `gh` CLI 一条命令完成 repo 创建和推送：

```bash
cd csa-ppt-plugin
git init && git add . && git commit -m "v1.0.0: CSA PPT all-in-one plugin"
gh repo create csa-ppt-plugin --public \
  --description "All-in-one presentation toolkit for Azure CSA" \
  --source . --push
```

GitHub 仓库：[huqianghui/csa-ppt-plugin](https://github.com/huqianghui/csa-ppt-plugin)

### 同事安装方式

同事只需在 Claude Code 中运行两条命令：

```
/plugin marketplace add huqianghui/csa-ppt-plugin
/plugin install csa-ppt@csa-skills
```

安装后说"帮我做一个 PPT"就会自动触发 csa-ppt skill，6 个子 skill 全部可用。

### 其他发布渠道

| 渠道 | 说明 |
|------|------|
| **GitHub Marketplace（当前方式）** | 同事先 `marketplace add` 再 `install`，两步搞定 |
| **Anthropic 官方 Marketplace** | 提交到 `claude.ai/settings/plugins/submit`，审核通过后所有用户可在 `/plugin → Discover` 中搜到 |
| **npm 发布** | `npm publish --access public`，适合已有 npm 生态的团队 |

---

## 11. 总结与建议

这次实践展示了 Claude Code skill 生态的一个重要玩法：**用 skill-creator 将多个专项 skill 编排成一个面向角色的统一 skill**。对于像 CSA 这种需要频繁输出多种格式演示内容的角色，这种编排模式大幅降低了选择工具的心智负担——不用每次都想"这次该用哪个 skill"，直接告诉 csa-ppt 你要做什么，它会帮你选。

**给想做类似事情的人的建议**：

1. **先积累足够多的专项 skill**（至少 3-5 个覆盖不同能力），这是编排的基础
2. **明确自己的角色和典型场景**，这决定了编排层的路由逻辑
3. **让 skill-creator 做编排层设计**，不要手动拼接——它对 skill 能力的分析比人更全面
4. **为每个典型工作流写一个 reference 文档**，让执行时有章可循
5. **保持子 skill 独立**——编排层只做路由，不做执行

最终，这不只是一个工具层面的优化，更是一种**角色化 AI 工具链**的思路：围绕具体角色的工作场景，将散落的 AI 能力编排成一个统一的、智能的、可演进的工作流。
