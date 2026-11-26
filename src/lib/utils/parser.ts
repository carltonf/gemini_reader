import type { ChatMessage, ChatSession, ConversationTurn } from '../types';
import {
  cleanSessionContext,
  extractConversationalText,
  extractFilesContext,
  extractMessageText,
  extractSessionContext,
  isPureToolResponse,
} from './formatters';

export function extractProjectFromPath(relPath: string): string {
  if (!relPath) return '';
  const parts = relPath.split(/[/\\]/);
  const chatsIdx = parts.indexOf('chats');
  if (chatsIdx > 0) {
    return parts[chatsIdx - 1];
  }
  if (parts.length > 1) {
    return parts[0];
  }
  return '';
}

export function extractProjectFromText(text: string): string {
  if (!text) return '';
  const m1 = text.match(/The project.*?temporary directory is:[^\r\n]*[\\\/]([a-zA-Z0-9_\-]+)/i);
  if (m1) return m1[1];
  const m2 = text.match(/Workspace Directories:[\s\S]*?-[^\r\n]*[\\\/]([a-zA-Z0-9_\-]+)/i);
  if (m2) return m2[1];
  return '';
}

export function buildSearchText(messages: ChatMessage[], summary?: string, project?: string): string {
  const msgParts = messages.map(m =>
    extractMessageText(m.content, { includeToolCalls: true, includeToolResponses: true })
  );
  return (msgParts.join(' ') + ' ' + (summary || '') + ' ' + (project || '')).toLowerCase();
}

export function parseSessionFile(content: string, fileName: string, relativePath = ''): ChatSession | null {
  if (!content || !content.trim()) return null;

  // 1. Try legacy single JSON object format
  try {
    const singleObj = JSON.parse(content);
    if (singleObj && (singleObj.sessionId || singleObj.messages)) {
      const msgs = Array.isArray(singleObj.messages) ? singleObj.messages : [];
      const chatDate = new Date(
        singleObj.startTime || singleObj.lastUpdated || msgs[0]?.timestamp || Date.now()
      );
      const project =
        singleObj.projectName || singleObj.projectHash || extractProjectFromPath(relativePath) || 'default';
      return {
        id: singleObj.sessionId || fileName.replace(/\.jsonl?$/, ''),
        projectHash: singleObj.projectHash || '',
        projectName: project,
        date: isNaN(chatDate.getTime()) ? new Date() : chatDate,
        startTime: singleObj.startTime,
        lastUpdated: singleObj.lastUpdated,
        summary: singleObj.summary,
        messages: msgs,
        filename: fileName,
        searchText: buildSearchText(msgs, singleObj.summary, project),
      };
    }
  } catch {}

  // 2. Parse JSON Lines (event stream)
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let sessionId: string | null = null;
  let projectHash: string | null = null;
  let projectName = extractProjectFromPath(relativePath);
  let startTime: string | number | null = null;
  let lastUpdated: string | number | null = null;
  let summary: string | null = null;
  let kind: string | null = null;
  const messagesMap = new Map<string, any>();

  for (const line of lines) {
    let r: any;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (!r || typeof r !== 'object') continue;

    if (r.sessionId) sessionId = r.sessionId;
    if (r.projectHash) projectHash = r.projectHash;
    if (r.startTime) startTime = r.startTime;
    if (r.lastUpdated) lastUpdated = r.lastUpdated;
    if (r.summary) summary = r.summary;
    if (r.kind) kind = r.kind;

    // $set update
    if (r.$set) {
      if (r.$set.sessionId) sessionId = r.$set.sessionId;
      if (r.$set.lastUpdated) lastUpdated = r.$set.lastUpdated;
      if (r.$set.summary) summary = r.$set.summary;
      if (Array.isArray(r.$set.messages)) {
        messagesMap.clear();
        for (const m of r.$set.messages) {
          if (m && m.id) messagesMap.set(m.id, m);
        }
      }
    }

    // $patch update
    if (r.$patch) {
      if (r.$patch.id && messagesMap.has(r.$patch.id)) {
        Object.assign(messagesMap.get(r.$patch.id), r.$patch);
      }
      if (Array.isArray(r.$patch.updates)) {
        for (const u of r.$patch.updates) {
          if (u && u.id && messagesMap.has(u.id)) {
            Object.assign(messagesMap.get(u.id), u);
          }
        }
      }
      if (Array.isArray(r.$patch.removeIds)) {
        for (const remId of r.$patch.removeIds) {
          messagesMap.delete(remId);
        }
      }
    }

    // $rewindTo update
    if (r.$rewindTo) {
      const rewindId = r.$rewindTo;
      let found = false;
      const idsToDelete: string[] = [];
      for (const [id] of messagesMap) {
        if (id === rewindId) found = true;
        if (found) idsToDelete.push(id);
      }
      if (found) {
        for (const id of idsToDelete) messagesMap.delete(id);
      } else {
        messagesMap.clear();
      }
    }

    // Regular message record
    if (r.id && !r.$patch && !r.$set && !r.$rewindTo) {
      messagesMap.set(r.id, r);
    }
  }

  const messages: ChatMessage[] = Array.from(messagesMap.values());
  if (!sessionId && messages.length === 0) return null;

  // If project name not found in path, try session context
  if (!projectName) {
    for (const m of messages) {
      const raw = extractMessageText(m.content);
      const projMatch = extractProjectFromText(raw);
      if (projMatch) {
        projectName = projMatch;
        break;
      }
    }
  }

  const chatDate = new Date(
    startTime ||
      lastUpdated ||
      messages[0]?.timestamp ||
      messages[messages.length - 1]?.timestamp ||
      Date.now()
  );

  return {
    id: sessionId || fileName.replace(/\.jsonl?$/, ''),
    projectHash: projectHash || '',
    projectName: projectName || (projectHash ? projectHash.substring(0, 6) : 'workspace'),
    date: isNaN(chatDate.getTime()) ? new Date() : chatDate,
    startTime: startTime ?? undefined,
    lastUpdated: lastUpdated ?? undefined,
    summary: summary ?? undefined,
    kind: kind ?? undefined,
    messages,
    filename: fileName,
    searchText: buildSearchText(messages, summary ?? undefined, projectName),
  };
}

export function buildConversationTurns(messages: ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let currentTurn: ConversationTurn | null = null;

  const functionResponsesMap = new Map<string, any>();
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const p of msg.content) {
        if (p && p.functionResponse && p.functionResponse.id) {
          functionResponsesMap.set(p.functionResponse.id, p.functionResponse);
        }
      }
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (isPureToolResponse(msg)) continue;

    if (msg.type === 'user') {
      const rawText = extractConversationalText(msg.content) || extractMessageText(msg.content);
      currentTurn = {
        id: msg.id || 'turn-' + turns.length,
        userMsg: msg,
        systemContext: extractSessionContext(rawText),
        filesContext: extractFilesContext(rawText),
        cleanPrompt: cleanSessionContext(rawText),
        rawText: rawText,
        toolCalls: [],
        thoughts: [],
        assistantMsgs: [],
        errorMsgs: [],
        infoMsgs: [],
        cancelled: false,
      };
      turns.push(currentTurn);
      continue;
    }

    if (!currentTurn) {
      currentTurn = {
        id: 'init-turn',
        userMsg: null,
        systemContext: null,
        filesContext: null,
        cleanPrompt: '',
        rawText: '',
        toolCalls: [],
        thoughts: [],
        assistantMsgs: [],
        errorMsgs: [],
        infoMsgs: [],
        cancelled: false,
      };
      turns.push(currentTurn);
    }

    if (msg.type === 'info') {
      const infoText = extractMessageText(msg.content);
      if (infoText && infoText.toLowerCase().includes('cancelled')) {
        currentTurn.cancelled = true;
      } else {
        currentTurn.infoMsgs.push(msg);
      }
      continue;
    }

    if (msg.type === 'error') {
      currentTurn.errorMsgs.push(msg);
      continue;
    }

    if (msg.type === 'gemini') {
      // 1. Tool calls directly attached to message
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          if ((!tc.result || tc.result.length === 0) && tc.id && functionResponsesMap.has(tc.id)) {
            tc.result = [{ functionResponse: functionResponsesMap.get(tc.id) }];
          }
          if (!currentTurn.toolCalls.some(existing => existing.id === tc.id)) {
            currentTurn.toolCalls.push(tc);
          }
        }
      }

      // 2. Tool calls embedded inside msg.content as functionCall parts
      if (Array.isArray(msg.content)) {
        for (const p of msg.content) {
          if (p && p.functionCall) {
            const fc = p.functionCall;
            const existing = currentTurn.toolCalls.find(tc => tc.id === fc.id);
            if (!existing) {
              const matchedResp =
                fc.id && functionResponsesMap.has(fc.id)
                  ? [{ functionResponse: functionResponsesMap.get(fc.id) }]
                  : [];
              currentTurn.toolCalls.push({
                id: fc.id || 'call-' + currentTurn.toolCalls.length,
                name: fc.name,
                args: fc.args || {},
                result: matchedResp,
              });
            }
          }
        }
      }

      // 3. Thoughts
      if (msg.thoughts && msg.thoughts.length > 0) {
        currentTurn.thoughts.push(...msg.thoughts);
      }

      // 4. Conversational Text ONLY
      const text = extractConversationalText(msg.content);
      if (text) {
        currentTurn.assistantMsgs.push(msg);
      }
    }
  }

  return turns;
}
