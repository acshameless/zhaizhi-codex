# 摘纸 (ZhaiZhi)

> 收藏那些值得再次遇见的瞬间。

一个安静的个人引文图书馆：把你读过的书里值得再看一眼的句子摘下来、存住、随时找得回来。

## 文档

| 文件 | 内容 |
| --- | --- |
| [docs/00_VISION.md](docs/00_VISION.md) | 产品愿景、设计哲学、非目标 |
| [docs/01_PRD.md](docs/01_PRD.md) | 需求文档（范围、功能、验收标准、数据模型、里程碑） |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 决策记录与待确认事项 |
| [docs/research/chatgpt-thread-2026-09-20.md](docs/research/chatgpt-thread-2026-09-20.md) | 需求来源：原始讨论存档 |

## 技术栈

Astro + TypeScript + Tailwind CSS v4 + Pagefind + Cloudflare Workers 静态资源（Workers Builds）。
零数据库、零服务端、零运行时依赖：`git push` 即发布。

## 内容形态

一本书 = 一个 Markdown 文件（`books/<slug>.md`）。
Git 是唯一数据源，任何编辑器都能改，十年后仍然打得开。

真实摘抄存放在私有内容仓 `acshameless/zhaizhi-content`；本仓库内的 `examples/` 是虚构示例，用于让代码仓可以独立构建与演示。

## 本地开发

```bash
npm install
npm run dev                                  # 使用仓内示例内容
ZHAIZHI_CONTENT_DIR=../zhaizhi-content npm run dev   # 使用真实内容仓
npm run build                                # 校验 + 构建 + 生成搜索索引
npm run check:search 重读 摘抄          # 用 headless Chrome 验证搜索结果（需先 npm run preview）
```

内容格式、字段与校验规则见 [docs/01_PRD.md](docs/01_PRD.md#6-数据模型)；
部署与双仓工作流见 [docs/02_DEPLOYMENT.md](docs/02_DEPLOYMENT.md)。

新增一本书时，复制 [templates/book.md](templates/book.md) 到内容仓的 `books/` 目录；新增一条摘抄时，在对应文件里复制一个 `### q-XXX` 块。

## 状态

PRD v1.0 已定稿（2026-09-20）；M0 骨架已完成（内容解析、书架/书页/首页/时间轴/搜索），待接入私有内容仓后进入 M1 内容闭环。
