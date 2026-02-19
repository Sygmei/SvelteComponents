<script lang="ts">
  /* eslint-disable no-unused-vars */

  import LogBlockEntry from "./LogBlockEntry.svelte";
  import type { LogEntry, LogGroupEntry } from "./types.js";

  interface Props {
    entry: LogEntry;
    depth?: number;
    collapsedGroupIds?: Record<string, boolean>;
    toggleGroup?(groupId: string): void;
    displayLevel?(level: string): string;
  }

  let {
    entry,
    depth = 0,
    collapsedGroupIds = {},
    toggleGroup = () => {},
    displayLevel = (level: string) => level,
  }: Props = $props();

  function getGroupState(groupEntry: LogGroupEntry): boolean {
    return Boolean(collapsedGroupIds[groupEntry.id]);
  }

  function levelClass(level: string | undefined): string {
    const normalized = (level || "").toUpperCase();

    if (normalized === "ERROR" || normalized === "CRITICAL") {
      return "bg-error-600/20 text-error-400 border border-error-600/30";
    }

    if (normalized === "WARNING" || normalized === "WARN") {
      return "bg-warning-600/20 text-warning-400 border border-warning-600/30";
    }

    if (normalized === "INFO") {
      return "bg-primary-600/20 text-primary-300 border border-primary-600/30";
    }

    if (normalized === "DEBUG") {
      return "bg-surface-600/30 text-surface-300 border border-surface-500/40";
    }

    return "bg-tertiary-600/20 text-tertiary-300 border border-tertiary-600/30";
  }

  interface ParsedTimestamp {
    year: string;
    month: string;
    day: string;
    separator: string;
    hour: string;
    minute: string;
    second: string;
    fractional?: string;
    timezone?: string;
  }

  function parseTimestamp(timestamp: string | undefined): ParsedTimestamp | null {
    if (!timestamp) {
      return null;
    }

    const match = timestamp.match(
      /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?<separator>[T ])(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?<fractional>\.\d+)?(?<timezone>Z|[+-]\d{2}:\d{2})?$/
    );

    if (!match?.groups) {
      return null;
    }

    return {
      year: match.groups.year,
      month: match.groups.month,
      day: match.groups.day,
      separator: match.groups.separator,
      hour: match.groups.hour,
      minute: match.groups.minute,
      second: match.groups.second,
      fractional: match.groups.fractional,
      timezone: match.groups.timezone,
    };
  }

  type HighlightTokenKind = "text" | "string" | "number" | "path";

  interface HighlightToken {
    kind: HighlightTokenKind;
    text: string;
  }

  const HIGHLIGHT_PATTERN =
    /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:[A-Za-z]:\\[^\s"'`]+|(?:\.{1,2}\/|\/)[^\s"'`]+)|\b-?\d+(?:\.\d+)?\b/g;
  const PATH_PATTERN = /^(?:[A-Za-z]:\\[^\s"'`]+|(?:\.{1,2}\/|\/)[^\s"'`]+)$/;
  const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

  function tokenizeSyntax(text: string): HighlightToken[] {
    if (!text) {
      return [{ kind: "text", text: "" }];
    }

    const tokens: HighlightToken[] = [];
    let lastIndex = 0;
    HIGHLIGHT_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = HIGHLIGHT_PATTERN.exec(text)) !== null) {
      const matchedText = match[0];
      const start = match.index;
      const end = start + matchedText.length;

      if (start > lastIndex) {
        tokens.push({
          kind: "text",
          text: text.slice(lastIndex, start),
        });
      }

      let kind: HighlightTokenKind = "text";
      if (
        (matchedText.startsWith("'") && matchedText.endsWith("'")) ||
        (matchedText.startsWith('"') && matchedText.endsWith('"')) ||
        (matchedText.startsWith("`") && matchedText.endsWith("`"))
      ) {
        kind = "string";
      } else if (PATH_PATTERN.test(matchedText)) {
        kind = "path";
      } else if (NUMBER_PATTERN.test(matchedText)) {
        kind = "number";
      }

      tokens.push({ kind, text: matchedText });
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      tokens.push({
        kind: "text",
        text: text.slice(lastIndex),
      });
    }

    return tokens.length > 0 ? tokens : [{ kind: "text", text }];
  }

  function syntaxTokenClass(kind: HighlightTokenKind): string {
    if (kind === "string") {
      return "text-emerald-300";
    }

    if (kind === "number") {
      return "text-amber-300";
    }

    if (kind === "path") {
      return "text-cyan-300";
    }

    return "";
  }
</script>

{#if entry.kind === "group"}
  <div class="my-1" style={`margin-left: ${depth * 16}px;`}>
    <button
      type="button"
      class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-surface-700/80 bg-surface-800/45 text-left hover:bg-surface-800/70 hover:border-surface-600 transition-colors"
      onclick={() => toggleGroup(entry.id)}
      aria-expanded={!getGroupState(entry)}
      aria-label={getGroupState(entry) ? `Expand ${entry.title}` : `Collapse ${entry.title}`}
    >
      <span
        class={`inline-flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] leading-none transition-colors ${
          getGroupState(entry)
            ? "border-surface-600 text-surface-400 bg-surface-800"
            : "border-primary-500/40 text-primary-300 bg-primary-500/15"
        }`}
      >
        {getGroupState(entry) ? "▸" : "▾"}
      </span>
      <span class="text-[10px] uppercase tracking-widest text-surface-400">group</span>
      <span class="text-surface-100 font-medium text-xs truncate">{entry.title}</span>
      <span
        class="ml-auto inline-flex h-4 items-center rounded-md border border-surface-600 bg-surface-800 px-1.5 text-[10px] text-surface-300 font-mono"
      >
        {entry.entries.length}
      </span>
    </button>

    {#if !getGroupState(entry)}
      <div class="relative pt-1">
        <span
          class="pointer-events-none absolute left-0 top-[-2px] h-2 w-2 border-l border-b border-primary-400/70 rounded-bl-md"
          aria-hidden="true"
        ></span>
        <span
          class="pointer-events-none absolute left-0 top-[6px] bottom-[8px] w-px bg-primary-400/65"
          aria-hidden="true"
        ></span>
        <span
          class="pointer-events-none absolute left-0 bottom-0 h-2 w-2 border-l border-b border-primary-400/65 rounded-bl-md"
          aria-hidden="true"
        ></span>
        {#each entry.entries as childEntry (childEntry.id)}
          <LogBlockEntry
            entry={childEntry}
            {depth}
            {collapsedGroupIds}
            {toggleGroup}
            {displayLevel}
          />
        {/each}
      </div>
    {/if}
  </div>
{:else}
  {@const parsedTimestamp = parseTimestamp(entry.timestamp)}
  <div
    class="grid grid-cols-[max-content_9ch_minmax(0,1fr)] items-start gap-x-2 px-2 py-1 rounded-lg hover:bg-surface-800/40"
    style={`margin-left: ${depth * 16}px;`}
  >
    {#if parsedTimestamp}
      <span class="inline-flex h-5 items-center rounded-md border border-surface-700/90 bg-surface-800/70 px-1.5 text-xs whitespace-nowrap font-mono tabular-nums leading-none shadow-sm"><span class="text-info-300">{parsedTimestamp.year}</span><span class="text-surface-500">-</span><span class="text-cyan-300">{parsedTimestamp.month}</span><span class="text-surface-500">-</span><span class="text-teal-300">{parsedTimestamp.day}</span><span class="text-surface-500">{parsedTimestamp.separator}</span><span class="text-primary-300">{parsedTimestamp.hour}</span><span class="text-surface-500">:</span><span class="text-primary-300">{parsedTimestamp.minute}</span><span class="text-surface-500">:</span><span class="text-primary-300">{parsedTimestamp.second}</span>{#if parsedTimestamp.fractional}<span class="text-violet-300">{parsedTimestamp.fractional}</span>{/if}{#if parsedTimestamp.timezone}<span class="text-amber-300">{parsedTimestamp.timezone}</span>{/if}</span>
    {:else if entry.timestamp}
      <span class="inline-flex h-5 items-center rounded-md border border-surface-700/90 bg-surface-800/70 px-1.5 text-xs whitespace-nowrap text-info-400 font-mono tabular-nums leading-none shadow-sm">
        {entry.timestamp}
      </span>
    {:else}
      <span
        class="inline-flex h-5 items-center rounded-md border border-surface-700/90 bg-surface-800/70 px-1.5 text-xs whitespace-nowrap font-mono tabular-nums leading-none shadow-sm invisible select-none"
        aria-hidden="true"
      >
        0000-00-00T00:00:00.000+00:00
      </span>
    {/if}

    {#if entry.level}
      <span
        class={`inline-flex h-5 w-full items-center justify-center text-[10px] uppercase tracking-wide px-2 rounded-md whitespace-nowrap font-mono leading-none ${levelClass(entry.level)}`}
      >
        {displayLevel(entry.level)}
      </span>
    {:else}
      <span
        class="inline-flex h-5 w-full items-center justify-center text-[10px] uppercase tracking-wide px-2 rounded-md whitespace-nowrap font-mono leading-none invisible select-none"
        aria-hidden="true"
      >
        LEVEL
      </span>
    {/if}

    <span class="text-xs leading-5 text-surface-100 break-all min-w-0">
      {#each entry.messageParts as part, partIndex (`${part.kind}-${part.text}-${partIndex}`)}
        {#if part.kind === "link" && part.href}
          <button
            type="button"
            onclick={() => window.open(part.href, "_blank", "noopener,noreferrer")}
            class="underline decoration-primary-400/60 text-primary-300 hover:text-primary-200 text-left p-0 m-0 border-0 bg-transparent align-baseline leading-5"
          >
            {part.text}
          </button>
        {:else}
          {@const syntaxTokens = tokenizeSyntax(part.text)}
          {#each syntaxTokens as syntaxToken, syntaxTokenIndex (`${syntaxToken.kind}-${syntaxToken.text}-${syntaxTokenIndex}`)}
            {#if syntaxToken.kind === "text"}
              {syntaxToken.text}
            {:else}
              <span class={syntaxTokenClass(syntaxToken.kind)}>{syntaxToken.text}</span>
            {/if}
          {/each}
        {/if}
      {/each}

      {#if entry.metadata}
        <span class="text-surface-400"> 
          {#each tokenizeSyntax(entry.metadata) as metadataToken, metadataTokenIndex (`${metadataToken.kind}-${metadataToken.text}-${metadataTokenIndex}`)}
            {#if metadataToken.kind === "text"}
              {metadataToken.text}
            {:else}
              <span class={syntaxTokenClass(metadataToken.kind)}>{metadataToken.text}</span>
            {/if}
          {/each}
        </span>
      {/if}
    </span>
  </div>
{/if}
