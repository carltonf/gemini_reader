import { marked } from 'marked';
import hljs from 'highlight.js';
import { escapeHtml, renderCodeWithLineNumbers } from './formatters';

const renderer = new marked.Renderer();

renderer.code = function (token: any, langArg?: string) {
  let code = typeof token === 'object' && token !== null ? token.text : token;
  let language = typeof token === 'object' && token !== null ? token.lang : langArg;
  code = code || '';
  let highlighted: string | null = null;
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    highlighted = escapeHtml(code);
  }

  const linesHtml = renderCodeWithLineNumbers(code, language, highlighted);
  return `<div class="code-block-wrapper">
      <div class="code-header">
          <span>${escapeHtml(language || 'code')}</span>
          <button class="hover:text-white transition-colors flex items-center gap-1 cursor-pointer copy-code-btn" data-code="${encodeURIComponent(code)}">
              <i class="ph ph-copy"></i> Copy
          </button>
      </div>
      <div class="code-content">${linesHtml}</div>
      <div class="hidden raw-code">${escapeHtml(code)}</div> 
  </div>`;
};

marked.setOptions({ renderer, breaks: true, gfm: true });

export function renderMarkdown(text: string): string {
  if (!text) return '';
  return marked.parse(text) as string;
}
