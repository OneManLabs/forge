/**
 * Streaming parser for Claude's structured response.
 *
 * Recognized top-level tags: <reply>, <canvas>, <questions>.
 *
 *   <reply>
 *   ...chat text...
 *   </reply>
 *   <questions>
 *   [ { "title": "...", "options": [...] }, ... ]
 *   </questions>
 *   <canvas>
 *   <!DOCTYPE html>...complete HTML doc...
 *   </canvas>
 *
 * The parser routes deltas to the right channel as they arrive — without
 * buffering the whole response — and handles tags split across delta
 * boundaries.
 */

export type ChannelKind =
  | "reply"
  | "files"
  | "questions"
  | "edits"
  | "tweaks"
  | "variations"
  | "design_plan"
  | "todos";

export type ParserEvent = { type: ChannelKind; delta: string };

const OPEN_TAGS: Record<ChannelKind, string> = {
  reply: "<reply>",
  files: "<files>",
  questions: "<questions>",
  edits: "<edits>",
  tweaks: "<tweaks>",
  variations: "<variations>",
  design_plan: "<design_plan>",
  todos: "<todos>",
};

const CLOSE_TAGS: Record<ChannelKind, string> = {
  reply: "</reply>",
  files: "</files>",
  questions: "</questions>",
  edits: "</edits>",
  tweaks: "</tweaks>",
  variations: "</variations>",
  design_plan: "</design_plan>",
  todos: "</todos>",
};

const MAX_TAG_LEN = Math.max(
  ...Object.values(OPEN_TAGS).map((t) => t.length),
  ...Object.values(CLOSE_TAGS).map((t) => t.length),
);

type State =
  | { kind: "outside" }
  | { kind: "inside"; channel: ChannelKind; trimmedStart: boolean };

export class ResponseParser {
  private state: State = { kind: "outside" };
  private buffer = "";

  push(chunk: string): ParserEvent[] {
    this.buffer += chunk;
    const events: ParserEvent[] = [];

    while (this.buffer.length > 0) {
      if (this.state.kind === "outside") {
        const channels = Object.keys(OPEN_TAGS) as ChannelKind[];
        let nextChannel: ChannelKind | null = null;
        let nextIdx = -1;
        for (const c of channels) {
          const idx = this.buffer.indexOf(OPEN_TAGS[c]);
          if (idx >= 0 && (nextIdx === -1 || idx < nextIdx)) {
            nextIdx = idx;
            nextChannel = c;
          }
        }
        if (nextChannel === null || nextIdx === -1) {
          // Hold a small tail — an opening tag may straddle the next chunk.
          const keep = Math.min(this.buffer.length, MAX_TAG_LEN - 1);
          this.buffer = this.buffer.slice(this.buffer.length - keep);
          break;
        }
        this.buffer = this.buffer.slice(nextIdx + OPEN_TAGS[nextChannel].length);
        this.state = { kind: "inside", channel: nextChannel, trimmedStart: false };
        continue;
      }

      const closeTag = CLOSE_TAGS[this.state.channel];
      const closeIdx = this.buffer.indexOf(closeTag);

      if (closeIdx >= 0) {
        let chunk = this.buffer.slice(0, closeIdx);
        this.buffer = this.buffer.slice(closeIdx + closeTag.length);
        if (this.state.channel === "reply" && !this.state.trimmedStart) {
          chunk = chunk.replace(/^\s+/, "");
        }
        if (chunk.length > 0) {
          events.push({ type: this.state.channel, delta: chunk });
        }
        this.state = { kind: "outside" };
        continue;
      }

      // Emit what we can but keep a tail for partial close-tag detection.
      const safeEmit = Math.max(0, this.buffer.length - (closeTag.length - 1));
      if (safeEmit > 0) {
        let chunk = this.buffer.slice(0, safeEmit);
        if (this.state.channel === "reply" && !this.state.trimmedStart) {
          chunk = chunk.replace(/^\s+/, "");
          if (chunk.length > 0) this.state.trimmedStart = true;
        }
        if (chunk.length > 0) {
          events.push({ type: this.state.channel, delta: chunk });
        }
        this.buffer = this.buffer.slice(safeEmit);
      }
      break;
    }

    return events;
  }

  flush(): ParserEvent[] {
    if (this.state.kind === "outside" || this.buffer.length === 0) return [];
    let chunk = this.buffer;
    if (this.state.channel === "reply" && !this.state.trimmedStart) {
      chunk = chunk.replace(/^\s+/, "");
    }
    const channel = this.state.channel;
    this.buffer = "";
    this.state = { kind: "outside" };
    return chunk.length > 0 ? [{ type: channel, delta: chunk }] : [];
  }
}
