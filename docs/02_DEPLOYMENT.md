# 摘纸 · 部署与双仓工作流

版本 v1.0 · 2026-09-20

---

## 1. 仓库结构

| 仓库 | 可见性 | 内容 |
| --- | --- | --- |
| `acshameless/zhaizhi-codex` | 公开 | 站点代码、文档、脚本、虚构示例内容（`examples/`） |
| `acshameless/zhaizhi-content` | 私有 | 真实摘抄 `books/*.md`、封面 `covers/*` |

内容仓最小结构：

```text
zhaizhi-content/
├── books/
│   ├── huozhe.md
│   └── ...
└── covers/          # 可选，封面图片
```

## 2. 本地开发

```bash
# 代码仓
git clone git@github.com:acshameless/zhaizhi-codex.git
cd zhaizhi-codex
npm install

# 内容仓（与本仓库并列）
git clone git@github.com:acshameless/zhaizhi-content.git ../zhaizhi-content

# 用真实内容开发
ZHAIZHI_CONTENT_DIR=../zhaizhi-content npm run dev

# 不带内容仓时，回落到仓内示例内容
npm run dev
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run validate` | 只做内容校验，输出文件与行号 |
| `npm run build` | 校验 + 构建 + 生成 Pagefind 索引（产物在 `dist/`） |
| `npm run preview` | 预览构建产物 |

搜索页依赖构建产物：`npm run dev` 下 `/search` 不加载索引，需要先 `npm run build && npm run preview`。

## 3. Cloudflare Pages 配置

在 Cloudflare Dashboard 创建 Pages 项目，连接到**私有内容仓** `zhaizhi-content`：

| 配置项 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `git clone --depth 1 https://github.com/acshameless/zhaizhi-codex.git .zhaizhi && bash .zhaizhi/scripts/build-with-content.sh "$PWD" .zhaizhi` |
| Build output directory | `.zhaizhi/dist` |
| 环境变量 | `NODE_VERSION=22` |

工作方式：构建容器检出的内容仓就是内容源；公开代码仓通过 HTTPS 克隆，因此不需要任何跨仓密钥。之后每次向内容仓 push 都会自动重建并发布。

## 4. 内容仓初始化

1. 在 GitHub 新建私有仓库 `zhaizhi-content`（不要勾选 README）。
2. 本地创建并推送第一本书的文件：

```bash
mkdir -p ~/Github/codex/zhaizhi-content/books
cd ~/Github/codex/zhaizhi-content
git init -b main
git remote add origin git@github.com:acshameless/zhaizhi-content.git
# 放入 books/第一本书.md 后：
git add -A && git commit -m "content: 第一本书" && git push -u origin main
```

## 5. 上线前检查清单

1. `npm run build` 本地通过，`dist/` 中有全部页面与 `pagefind/` 索引。
2. 私密条目验证：在页面源码与 `dist/pagefind/` 中搜索该句片段，必须搜不到。
3. 中文检索验证：用任意摘抄的中间片段搜索，能命中该句。
4. 时间轴验证：日期取值顺序为「摘于 → 读完日期 → 首次提交日期」。
5. 移动端验证：手机浏览器打开站点，能读、能搜；录入路径实测一次。

## 6. 回滚

Cloudflare Pages 的部署历史支持一键回滚到任意一次成功构建；内容仓的每次提交也可单独 revert。两者都不需要重建数据库，因为不存在数据库。

## 7. 绑定域名（可选）

在 Pages 项目的 Custom domains 中添加域名并按提示配置 DNS。域名与站点是否被搜索引擎收录互不影响。
