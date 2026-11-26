import type { ChatSession, ConversationTurn } from '../types';
import {
  escapeHtml,
  extractMessageText,
  getChatTitle,
  renderCodeWithLineNumbers,
} from './formatters';
import { buildConversationTurns } from './parser';

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportChat(chat: ChatSession, type: 'md' | 'html', htmlContent?: string) {
  if (!chat) return;
  const title = getChatTitle(chat);

  if (type === 'md') {
    let md = `# ${title}\n\n`;
    md += `- **Date:** ${chat.date.toLocaleString()}\n`;
    md += `- **Project:** ${chat.projectName}\n`;
    md += `- **Session ID:** \`${chat.id}\`\n\n---\n\n`;

    const turns = buildConversationTurns(chat.messages);
    turns.forEach(t => {
      if (t.userMsg) {
        md += `### USER\n\n${t.cleanPrompt || t.rawText || '(Session initialized with environment context)'}\n\n`;
      }
      if (t.systemContext) {
        md += `<details><summary>System Context</summary>\n\n\`\`\`\n${t.systemContext}\n\`\`\`\n</details>\n\n`;
      }
      if (t.filesContext) {
        md += `<details><summary>Referenced Files</summary>\n\n\`\`\`\n${t.filesContext}\n\`\`\`\n</details>\n\n`;
      }
      if (t.toolCalls && t.toolCalls.length) {
        md += `<details><summary>Tool Responses (${t.toolCalls.length})</summary>\n\n`;
        t.toolCalls.forEach(tc => {
          const resp =
            tc.result?.[0]?.functionResponse?.response?.output ||
            tc.result?.[0]?.functionResponse?.response?.error ||
            '';
          md += `\`\`\`bash\n# ${tc.name}\n${typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2)}\n\`\`\`\n\n`;
        });
        md += `</details>\n\n`;
      }
      if (t.assistantMsgs && t.assistantMsgs.length) {
        t.assistantMsgs.forEach(am => {
          md += `### ASSISTANT\n\n${extractMessageText(am.content)}\n\n`;
        });
      }
      if (t.cancelled) {
        md += `> *[Generation Cancelled]*\n\n`;
      }
      md += `---\n\n`;
    });
    downloadFile(`gemini-chat-${chat.id.slice(0, 8)}.md`, md, 'text/markdown');
  } else if (type === 'html') {
    const messagesHtml = htmlContent || '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:850px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#334155}pre{background:#0f172a;color:#f8fafc;padding:1rem;border-radius:6px;overflow-x:auto}code{font-family:monospace}.conversation-turn{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #e2e8f0}.chat-content{padding:1rem;border-radius:12px;margin-bottom:0.75rem}.bg-blue-600{background:#2563eb;color:#fff}.bg-white{background:#f8fafc;border:1px solid #e2e8f0}</style></head><body><h1>${escapeHtml(title)}</h1><p><small>${chat.date.toLocaleString()} | Project: ${escapeHtml(chat.projectName)}</small></p><hr/>${messagesHtml}</body></html>`;
    downloadFile(`gemini-chat-${chat.id.slice(0, 8)}.html`, html, 'text/html');
  }
}

function generateDetailsTabHtml(title: string, subtitle: string, turnSections: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <script src="https://unpkg.com/@phosphor-icons/web"><\/script>
    <style>
        :root {
            --bg: #0f172a;
            --panel: #1e293b;
            --panel-sub: #0b0f19;
            --border: #334155;
            --text: #f1f5f9;
            --muted: #94a3b8;
            --blue: #38bdf8;
            --green: #34d399;
            --purple: #c084fc;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 2rem 1.5rem;
            line-height: 1.6;
        }
        .container { max-width: 1080px; margin: 0 auto; }
        header { border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        h1 { font-size: 1.4rem; margin: 0 0 0.5rem 0; color: var(--blue); }
        .meta { font-size: 0.85rem; color: var(--muted); display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .turn-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 2.5rem; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
        .turn-header { padding: 1rem 1.25rem; background: rgba(30, 41, 59, 0.95); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .turn-prompt { font-weight: 600; font-size: 0.95rem; color: #fff; }
        .section-box { padding: 1.25rem; border-bottom: 1px solid var(--border); }
        .section-box:last-child { border-bottom: none; }
        .section-title { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
        .ctx-title { color: #60a5fa; }
        .tools-title { color: var(--green); }
        .thoughts-title { color: var(--purple); }
        .tool-item { background: var(--panel-sub); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .tool-item:last-child { margin-bottom: 0; }
        .tool-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; font-family: monospace; font-size: 0.85rem; }
        .tool-cmd { color: var(--green); font-weight: 700; word-break: break-all; }
        .code-content { margin: 0; padding: 0.6rem 0; background: #060913; border-radius: 6px; overflow-x: auto; }
        .code-line { display: flex; align-items: flex-start; line-height: 1.55; padding: 0.05rem 0.5rem 0.05rem 0; transition: background 0.15s; }
        .code-line:hover { background: rgba(255, 255, 255, 0.035); }
        .line-num { user-select: none !important; -webkit-user-select: none !important; color: #475569; text-align: right; padding-right: 1.25rem; flex-shrink: 0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; line-height: 1.55; }
        .line-content { flex: 1; min-width: 0; white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: anywhere !important; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.8rem; line-height: 1.55; color: #cbd5e1; }
        .btn { background: #334155; border: 1px solid #475569; color: #e2e8f0; padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
        .btn:hover { background: #475569; color: #fff; }
        .search-bar { margin-bottom: 1.5rem; display: flex; gap: 0.5rem; }
        .search-input { flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 1rem; color: #fff; font-size: 0.85rem; outline: none; }
        .search-input:focus { border-color: var(--blue); }
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1><i class="ph ph-terminal-window"></i> ${escapeHtml(title)}</h1>
                <div class="meta">${subtitle}</div>
            </div>
            <div>
                <button onclick="window.print()" class="btn"><i class="ph ph-printer"></i> Print</button>
            </div>
        </header>
        <div class="search-bar">
            <input type="text" id="quick-filter" placeholder="Quick filter tools or outputs..." class="search-input" oninput="filterDetails(this.value)">
        </div>
        <main id="details-main">
            ${turnSections}
        </main>
    </div>
    <script>
        function copyText(btn, text) {
            navigator.clipboard.writeText(text);
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
            setTimeout(() => btn.innerHTML = orig, 1500);
        }
        function copyCode(btn) {
            const wrapper = btn.closest('.tool-item') || btn.closest('.section-box') || btn.closest('.turn-card');
            const rawEl = wrapper ? wrapper.querySelector('.raw-code') : null;
            const raw = rawEl ? rawEl.textContent : (btn.dataset.code || '');
            navigator.clipboard.writeText(raw);
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
            setTimeout(() => btn.innerHTML = orig, 1500);
        }
        function filterDetails(q) {
            const query = q.toLowerCase();
            document.querySelectorAll('.tool-item, .turn-card').forEach(el => {
                if (!query) { el.style.display = ''; return; }
                const txt = el.innerText.toLowerCase();
                el.style.display = txt.includes(query) ? '' : 'none';
            });
        }
    <\/script>
</body>
</html>`;
}

export function renderTurnDetailSection(turn: ConversationTurn, chat: ChatSession): string {
  const hasContext = Boolean(turn.systemContext);
  const hasFiles = Boolean(turn.filesContext);
  const hasTools = turn.toolCalls && turn.toolCalls.length > 0;
  const hasThoughts = turn.thoughts && turn.thoughts.length > 0;

  if (!hasContext && !hasFiles && !hasTools && !hasThoughts) return '';

  let html = `
    <div class="turn-card" id="turn-detail-${turn.id}">
        <div class="turn-header">
            <div class="turn-prompt"><i class="ph ph-chat-circle-dots text-blue-400 mr-1.5"></i> ${escapeHtml(turn.cleanPrompt || 'Session initialized with environment context')}</div>
            <span class="text-xs text-slate-400 font-mono">${turn.toolCalls.length} tools</span>
        </div>
  `;

  if (hasContext && turn.systemContext) {
    html += `
        <div class="section-box">
            <div class="section-title ctx-title">
                <span><i class="ph ph-brackets-curly"></i> System & Workspace Context (${escapeHtml(chat.projectName)})</span>
                <button class="btn" onclick="copyCode(this)"><i class="ph ph-copy"></i> Copy</button>
            </div>
            <div class="code-content max-h-96 border border-slate-700">
                ${renderCodeWithLineNumbers(turn.systemContext, 'text')}
            </div>
            <div class="hidden raw-code">${escapeHtml(turn.systemContext)}</div>
        </div>
    `;
  }

  if (hasFiles && turn.filesContext) {
    html += `
        <div class="section-box">
            <div class="section-title" style="color:#818cf8;">
                <span><i class="ph ph-file-text"></i> Referenced File Contents</span>
                <button class="btn" onclick="copyCode(this)"><i class="ph ph-copy"></i> Copy</button>
            </div>
            <div class="code-content max-h-96 border border-slate-700">
                ${renderCodeWithLineNumbers(turn.filesContext, 'text')}
            </div>
            <div class="hidden raw-code">${escapeHtml(turn.filesContext)}</div>
        </div>
    `;
  }

  if (hasThoughts) {
    html += `
        <div class="section-box">
            <div class="section-title thoughts-title">
                <span><i class="ph ph-brain"></i> Agent Reasoning Thoughts (${turn.thoughts.length})</span>
            </div>
            <div class="space-y-2">
                ${turn.thoughts
                  .map(
                    (th, i) => `
                    <div style="background:#0b0f19; border:1px solid #1e293b; border-radius:6px; padding:0.75rem; margin-bottom:0.5rem;">
                        <div style="font-weight:700; color:#c084fc; font-size:0.8rem; margin-bottom:0.25rem;">${i + 1}. ${escapeHtml(th.subject || 'Thought')}</div>
                        <div style="font-size:0.8rem; color:#cbd5e1; white-space:pre-wrap;">${escapeHtml(th.description || '')}</div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>
    `;
  }

  if (hasTools) {
    html += `
        <div class="section-box">
            <div class="section-title tools-title">
                <span><i class="ph ph-terminal"></i> Tool Calls & Execution Responses (${turn.toolCalls.length})</span>
            </div>
            <div>
                ${turn.toolCalls
                  .map(c => {
                    const resp = c.result?.[0]?.functionResponse?.response || {};
                    const output =
                      resp.output || resp.error || (typeof c.result === 'string' ? c.result : '') || '(No output)';
                    const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
                    const isError = Boolean(resp.error || c.status === 'error');

                    let cmdHeader = `$ ${c.name}`;
                    if (c.args) {
                      if (c.args.command) cmdHeader = `$ ${c.args.command}`;
                      else if (c.args.file_path) cmdHeader = `${c.name}: ${c.args.file_path}`;
                      else if (c.args.pattern) cmdHeader = `${c.name}: "${c.args.pattern}"`;
                      else if (c.args.query) cmdHeader = `${c.name}: "${c.args.query}"`;
                      else if (Object.keys(c.args).length > 0) cmdHeader = `${c.name}(${Object.keys(c.args).join(', ')})`;
                    }

                    return `
                        <div class="tool-item">
                            <div class="tool-head">
                                <span class="tool-cmd" style="${isError ? 'color:#f87171;' : ''}">${escapeHtml(cmdHeader)}</span>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:#1e293b; color:#94a3b8;">${escapeHtml(c.name)}</span>
                                    <button class="btn" onclick="copyCode(this)"><i class="ph ph-copy"></i> Copy</button>
                                </div>
                            </div>
                            <div class="code-content max-h-80 border ${isError ? 'border-red-900/60' : 'border-slate-800'}">
                                ${renderCodeWithLineNumbers(outputStr, 'text')}
                            </div>
                            <div class="hidden raw-code">${escapeHtml(outputStr)}</div>
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        </div>
    `;
  }

  html += `</div>`;
  return html;
}

export function openTurnDetailsInNewTab(chat: ChatSession, turnId: string) {
  if (!chat) return;
  const turns = buildConversationTurns(chat.messages);
  const turn = turns.find(t => t.id === turnId);
  if (!turn) return;

  const title = `Context & Tools: ${turn.cleanPrompt ? turn.cleanPrompt.slice(0, 50) : 'Session Turn'}`;
  const subtitle = `<span><b>Project:</b> ${escapeHtml(chat.projectName)}</span> <span><b>Date:</b> ${chat.date.toLocaleString()}</span> <span><b>Session:</b> ${chat.id.slice(0, 8)}</span>`;

  const turnHtml = renderTurnDetailSection(turn, chat);
  const pageHtml = generateDetailsTabHtml(
    title,
    subtitle,
    turnHtml || '<div class="turn-card p-6 text-center text-slate-400">No context or tool activity in this turn.</div>'
  );

  const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function openAllDetailsInNewTab(chat: ChatSession) {
  if (!chat) return;
  const turns = buildConversationTurns(chat.messages);
  const chatTitle = getChatTitle(chat);
  const title = `All Context & Tool Responses: ${chatTitle}`;
  const subtitle = `<span><b>Project:</b> ${escapeHtml(chat.projectName)}</span> <span><b>Date:</b> ${chat.date.toLocaleString()}</span> <span><b>Total Turns:</b> ${turns.length}</span>`;

  let allHtml = turns.map(t => renderTurnDetailSection(t, chat)).join('');
  if (!allHtml.trim()) {
    allHtml =
      '<div class="turn-card p-6 text-center text-slate-400">No context or tool activity recorded in this conversation.</div>';
  }
  const pageHtml = generateDetailsTabHtml(title, subtitle, allHtml);

  const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
