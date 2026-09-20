import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

const REQUIRED_BOOK_FIELDS = ['title', 'author'];
const BLOCK_HEADING = /^#{2,4}\s+(q-[A-Za-z0-9_-]+)\s*$/;
const META_LINE = /^-\s*([^:：]+)\s*[:：]\s*(.*)$/;

export function resolveContentDir(root = process.cwd()) {
  const fromEnv = process.env.ZHAIZHI_CONTENT_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  const local = path.join(root, 'content');
  if (hasBooks(local)) return local;
  return path.join(root, 'examples');
}

function hasBooks(dir) {
  const booksDir = path.join(dir, 'books');
  try {
    return fs.readdirSync(booksDir).some((f) => f.endsWith('.md'));
  } catch {
    return false;
  }
}

function parseBoolean(value) {
  const v = String(value).trim().toLowerCase();
  return ['true', 'yes', 'y', '1', '是', '✓'].includes(v);
}

function parseList(value) {
  return String(value)
    .replace(/^\[|\]$/g, '')
    .split(/[,，、|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseBookFile(source, file) {
  const errors = [];
  const lines = source.split(/\r?\n/);
  const push = (line, message) => errors.push({ file, line, message });

  if (lines[0]?.trim() !== '---') {
    push(1, '文件必须以 YAML frontmatter 开头（第一行为 ---）');
    return { book: null, errors };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    push(1, 'frontmatter 缺少结束的 ---');
    return { book: null, errors };
  }

  let fm = {};
  try {
    fm = YAML.parse(lines.slice(1, end).join('\n')) ?? {};
  } catch (error) {
    push(2, `frontmatter YAML 解析失败：${error.message}`);
    return { book: null, errors };
  }

  for (const field of REQUIRED_BOOK_FIELDS) {
    if (!fm[field]) push(2, `frontmatter 缺少必填字段：${field}`);
  }

  const quotes = [];
  const seenIds = new Map();
  let current = null;

  const flush = () => {
    if (!current) return;
    if (!current.text.length) {
      push(current.headingLine, `摘抄 ${current.id} 缺少原文（引用块 > ...）`);
    }
    if (current.id && !/^q-[A-Za-z0-9_-]+$/.test(current.id)) {
      push(current.headingLine, `摘抄 id 需形如 q-001，当前为 ${current.id}`);
    }
    if (seenIds.has(current.id)) {
      push(current.headingLine, `摘抄 id 重复：${current.id}（首次出现在第 ${seenIds.get(current.id)} 行）`);
    } else {
      seenIds.set(current.id, current.headingLine);
    }
    quotes.push({
      id: current.id,
      text: current.text.join('\n').trim(),
      chapter: metaValue(current.meta, '章节'),
      location: metaValue(current.meta, '位置'),
      tags: current.meta.has('标签') ? parseList(current.meta.get('标签')) : [],
      date: metaValue(current.meta, '摘于'),
      favorite: current.meta.has('收藏') ? parseBoolean(current.meta.get('收藏')) : false,
      private: current.meta.has('私密') ? parseBoolean(current.meta.get('私密')) : false,
      note: current.note.join('\n').trim() || null,
      line: current.headingLine,
    });
  };

  for (let i = end + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lineNo = i + 1;

    const heading = trimmed.match(BLOCK_HEADING);
    if (heading) {
      flush();
      current = { id: heading[1], headingLine: lineNo, text: [], meta: new Map(), note: [] };
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (!current) continue;
    if (!trimmed) continue;

    if (trimmed.startsWith('>')) {
      current.text.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }

    const meta = trimmed.match(META_LINE);
    if (meta && current.note.length === 0) {
      current.meta.set(meta[1].trim(), meta[2].trim());
      continue;
    }

    current.note.push(trimmed);
  }
  flush();

  const slug = String(fm.slug || path.basename(file, '.md')).trim();

  const book = {
    slug,
    title: fm.title ?? '',
    author: fm.author ?? '',
    cover: fm.cover ?? null,
    translator: fm.translator ?? null,
    publisher: fm.publisher ?? null,
    year: fm.year ?? null,
    isbn: fm.isbn ?? null,
    status: fm.status ?? null,
    rating: fm.rating ?? null,
    readStart: fm.read_start ? String(fm.read_start) : null,
    readFinish: fm.read_finish ? String(fm.read_finish) : null,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : fm.tags ? parseList(fm.tags) : [],
    private: fm.private === true,
    quotes,
    file,
    sourcePath: file,
  };

  return { book, errors };
}

function metaValue(map, key) {
  if (!map.has(key)) return null;
  const value = String(map.get(key) ?? '').trim();
  return value || null;
}

export function loadBooks({ contentDir = resolveContentDir(), includePrivate = false } = {}) {
  const booksDir = path.join(contentDir, 'books');
  let entries = [];
  try {
    entries = fs.readdirSync(booksDir).filter((f) => f.endsWith('.md'));
  } catch {
    return { books: [], errors: [{ file: booksDir, line: 0, message: `内容目录不存在：${booksDir}` }] };
  }

  const books = [];
  const errors = [];
  const slugs = new Map();

  for (const entry of entries.sort()) {
    const file = path.join(booksDir, entry);
    const source = fs.readFileSync(file, 'utf8');
    const parsed = parseBookFile(source, file);
    errors.push(...parsed.errors);
    if (!parsed.book) continue;
    if (slugs.has(parsed.book.slug)) {
      errors.push({
        file,
        line: 1,
        message: `slug 重复：${parsed.book.slug}（已在 ${slugs.get(parsed.book.slug)} 使用）`,
      });
      continue;
    }
    slugs.set(parsed.book.slug, file);

    if (parsed.book.private && !includePrivate) continue;
    const quotes = parsed.book.quotes.filter((q) => includePrivate || !q.private);
    books.push({ ...parsed.book, quotes });
  }

  for (const book of books) {
    for (const quote of book.quotes) {
      quote.resolvedDate = quote.date || book.readFinish || firstAppearanceDate(book.sourcePath, quote.text);
    }
    const dated = book.quotes.map((q) => q.resolvedDate).filter(Boolean).sort();
    book.latestQuoteDate = dated.at(-1) ?? null;
    book.quoteCount = book.quotes.length;
  }

  books.sort((a, b) => String(b.latestQuoteDate ?? '').localeCompare(String(a.latestQuoteDate ?? '')));

  return { books, errors };
}

let gitAvailable = null;
const gitCache = new Map();

function firstAppearanceDate(file, text) {
  if (!text) return null;
  if (gitAvailable === null) {
    try {
      execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
      gitAvailable = true;
    } catch {
      gitAvailable = false;
    }
  }
  if (!gitAvailable) return null;

  const needle = text.slice(0, 24).replace(/\s+/g, ' ').trim();
  const key = `${file}::${needle}`;
  if (gitCache.has(key)) return gitCache.get(key);

  let value = null;
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--format=%aI', '-S', needle, '--', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const dates = out.split('\n').map((s) => s.trim()).filter(Boolean);
    if (dates.length) value = dates.at(-1).slice(0, 10);
  } catch {
    value = null;
  }
  gitCache.set(key, value);
  return value;
}

export function allQuotes(books) {
  return books.flatMap((book) => book.quotes.map((quote) => ({ book, quote })));
}
