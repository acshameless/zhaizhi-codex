import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = process.env.ZHAIZHI_BASE_URL ?? 'http://localhost:4321';
const chromePath =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const terms = process.argv.slice(2).filter(Boolean);
const queries = terms.length > 0 ? terms : ['重读', '摘抄', 'attention'];
const port = 9333 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zhaizhi-cdp-'));

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtoolsReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch {
      /* 继续等待 */
    }
    await sleep(500);
  }
  return false;
}

async function openTarget(url) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  return res.json();
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = (nextId += 1);
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { send, close: () => ws.close() };
}

const evaluate = async (client, expression) => {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return response.result?.result?.value;
};

const waitFor = async (client, expression, timeoutMs = 25000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(client, expression);
    if (value) return value;
    await sleep(400);
  }
  return null;
};

let failures = 0;
try {
  if (!(await devtoolsReady())) throw new Error('无法启动 headless Chrome 的调试端口');

  for (const term of queries) {
    const target = await openTarget(`${baseUrl}/search/?q=${encodeURIComponent(term)}`);
    const client = await connect(target.webSocketDebuggerUrl);
    await client.send('Runtime.enable');

    const state = await waitFor(
      client,
      `(() => {
        const results = document.querySelectorAll('.pagefind-ui__result').length;
        const empty = document.querySelector('.pagefind-ui__message')?.textContent?.trim() || '';
        if (results > 0) {
          const first = document.querySelector('.pagefind-ui__result-title, .pagefind-ui__result-link');
          const link = document.querySelector('.pagefind-ui__result-link');
          return JSON.stringify({ results, empty, first: first?.textContent?.trim() || '', href: link?.getAttribute('href') || '' });
        }
        if (empty.includes('没有找到') || empty.toLowerCase().includes('no results')) {
          return JSON.stringify({ results: 0, empty, first: '', href: '' });
        }
        return '';
      })()`,
    );

    if (!state) {
      failures += 1;
      console.log(`✗ ${term}  搜索未在超时时间内返回结果`);
    } else {
      const data = JSON.parse(state);
      const ok = data.results > 0;
      if (!ok) failures += 1;
      console.log(
        `${ok ? '✓' : '✗'} ${term}  命中 ${data.results} 条${data.first ? ` · ${data.first.slice(0, 40)}` : ''}${data.href ? ` · ${data.href.slice(0, 60)}` : ''}`,
      );
    }

    await client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  }
} finally {
  chrome.kill();
  await sleep(500);
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
  } catch {
    /* 临时目录清理失败不影响检查结果 */
  }
}

process.exit(failures > 0 ? 1 : 0);
