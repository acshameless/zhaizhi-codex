import path from 'node:path';
import { loadBooks, resolveContentDir } from '../src/lib/content.mjs';

const contentDir = resolveContentDir();
const { books, errors } = loadBooks({ contentDir, includePrivate: true });

const quota = books.reduce((sum, book) => sum + book.quoteCount, 0);
const privateQuotes = books.reduce((sum, book) => sum + book.quotes.filter((q) => q.private).length, 0);

console.log(`[content] 目录：${path.relative(process.cwd(), contentDir) || contentDir}`);
console.log(`[content] ${books.length} 本书 / ${quota} 条摘抄（其中私密 ${privateQuotes} 条）`);

if (errors.length > 0) {
  console.error(`\n[content] 发现 ${errors.length} 个问题：`);
  for (const error of errors) {
    const location = error.line ? `${error.file}:${error.line}` : error.file;
    console.error(`  ✗ ${location}  ${error.message}`);
  }
  process.exit(1);
}

const undated = books.flatMap((book) => book.quotes.filter((q) => !q.resolvedDate).map((q) => `${book.title}#${q.id}`));
if (undated.length > 0) {
  console.warn(`[content] 提示：${undated.length} 条摘抄没有可用日期，将归入时间轴「未注明日期」：${undated.slice(0, 5).join('、')}`);
}

console.log('[content] 校验通过');
