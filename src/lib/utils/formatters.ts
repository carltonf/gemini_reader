import type { ChatSession, ChatMessage } from '../types';

export function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function cleanSessionContext(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<session_context>[\s\S]*?<\/session_context>/gi, '');
  cleaned = cleaned.replace(/<hook_context>[\s\S]*?<\/hook_context>/gi, '');
  cleaned = cleaned.replace(/--- Content from referenced files ---[\s\S]*?(?:--- End of content ---|$)/gi, '');
  return cleaned.trim();
}

export function extractSessionContext(text: string): string | null {
  if (!text) return null;
  const match = text.match(/<session_context>([\s\S]*?)<\/session_context>/i);
  return match ? match[1].trim() : null;
}

export function extractFilesContext(text: string): string | null {
  if (!text) return null;
  const match = text.match(/--- Content from referenced files ---([\s\S]*?)(?:--- End of content ---|$)/i);
  return match ? match[1].trim() : null;
}

export function extractConversationalText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (part.text) return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (typeof content === 'object' && content.text) return String(content.text).trim();
  return '';
}

export function extractMessageText(content: any, options: { includeToolCalls?: boolean; includeToolResponses?: boolean } = {}): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (part.text) return part.text;
        if (part.functionCall && options.includeToolCalls) {
          return `[Tool Call: ${part.functionCall.name}]`;
        }
        if (part.functionResponse) {
          if (options.includeToolResponses) {
            const resp = part.functionResponse.response?.output || part.functionResponse.response?.error || '';
            return `[Tool Response: ${part.functionResponse.name}]\n${typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2)}`;
          }
          return '';
        }
        if (part.inlineData) {
          return `[Attachment: ${part.inlineData.mimeType || 'media'}]`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof content === 'object') {
    if (content.text) return content.text;
    return '';
  }
  return String(content);
}

export function isPureToolResponse(msg: ChatMessage): boolean {
  if (!msg || msg.type !== 'user' || !Array.isArray(msg.content)) return false;
  return msg.content.length > 0 && msg.content.every((p: any) => p && p.functionResponse && !p.text);
}

export function getChatTitle(chat: ChatSession): string {
  if (chat.summary && typeof chat.summary === 'string' && chat.summary.trim()) {
    return chat.summary.trim();
  }
  for (const m of chat.messages) {
    if (m.type === 'user') {
      const text = cleanSessionContext(extractMessageText(m.content));
      if (text) {
        return text.split('\n')[0].slice(0, 60);
      }
    }
  }
  if (chat.projectName) {
    return `${chat.projectName} (Session)`;
  }
  return 'Session ' + (chat.id ? chat.id.slice(0, 8) : 'Chat');
}

export function prepareMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/^(\s*\d+[.)])([^\s\d])/gm, '$1 $2');
}

export function splitHighlightedLines(html: string): string[] {
  const rawLines = html.split(/\r?\n/);
  if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }
  const stack: string[] = [];
  const processedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const prefix = stack.map(tag => `<span class="${tag}">`).join('');
    const tagRegex = /<\/?span(?: class="([^"]*)")?>/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(line)) !== null) {
      if (match[0].startsWith('</')) {
        stack.pop();
      } else if (match[1]) {
        stack.push(match[1]);
      }
    }
    const suffix = stack.map(() => '</span>').join('');
    processedLines.push(prefix + line + suffix);
  }
  return processedLines;
}

export function renderCodeWithLineNumbers(code: string, lang = '', highlightedHtml: string | null = null): string {
  const contentHtml = highlightedHtml || escapeHtml(code);
  const lines = splitHighlightedLines(contentHtml);
  const digits = Math.max(2, String(lines.length).length);
  const widthRem = (digits * 0.55 + 1.2).toFixed(2);

  return lines
    .map((l, i) => {
      const num = i + 1;
      return `<div class="code-line"><span class="line-num" style="width:${widthRem}rem; min-width:${widthRem}rem;" aria-hidden="true">${num}</span><span class="line-content">${l || '&nbsp;'}</span></div>`;
    })
    .join('');
}
