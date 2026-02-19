<script lang="ts">
  import LogBlockEntry from "./LogBlockEntry.svelte";
  import { airflowLogProvider, defaultLinkify } from "./providers.js";
  import type {
    LogBlockProps,
    LogEntry,
    LogGroupEntry,
    LogLineEntry,
    LogProvider,
  } from "./types.js";

  type Props = LogBlockProps;

  let {
    logs = "",
    provider = airflowLogProvider,
    title = "Logs",
    emptyMessage = "No logs to display.",
    showLevelFilter = true,
    initialGroupsCollapsed = false,
    selectedLevels = $bindable<string[]>([]),
    className = "",
  }: Props = $props();

  let collapsedGroupIds = $state<Record<string, boolean>>({});
  let levelDropdownOpen = $state(false);
  let levelDropdownElement = $state<HTMLDivElement | undefined>(undefined);

  function splitInputLines(input: string | string[]): string[] {
    if (Array.isArray(input)) {
      return input.flatMap((line) => line.split(/\r?\n/));
    }

    if (!input) {
      return [];
    }

    return input.split(/\r?\n/);
  }

  function makeEntryId(prefix: string, lineIndex: number, depth: number): string {
    return `${prefix}-${lineIndex}-${depth}`;
  }

  function parseEntries(rawLogs: string | string[], logProvider: LogProvider): {
    entries: LogEntry[];
    levels: string[];
    groupIds: string[];
  } {
    const entries: LogEntry[] = [];
    const groupStack: LogGroupEntry[] = [];
    const levels: string[] = [];
    const groupIds: string[] = [];

    const lines = splitInputLines(rawLogs);

    const appendEntry = (entry: LogEntry): void => {
      if (groupStack.length === 0) {
        entries.push(entry);
        return;
      }

      groupStack[groupStack.length - 1].entries.push(entry);
    };

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const parsed = logProvider.parseLine(line, index);

      if (parsed.type === "skip") {
        continue;
      }

      if (parsed.type === "groupStart") {
        const groupEntry: LogGroupEntry = {
          kind: "group",
          id: makeEntryId("group", index, groupStack.length),
          raw: parsed.raw,
          sourceLine: index + 1,
          title: parsed.title,
          entries: [],
        };

        appendEntry(groupEntry);
        groupStack.push(groupEntry);
        groupIds.push(groupEntry.id);
        continue;
      }

      if (parsed.type === "groupEnd") {
        if (groupStack.length > 0) {
          groupStack.pop();
        }
        continue;
      }

      const normalizedLevel = parsed.line.level
        ? (logProvider.normalizeLevel?.(parsed.line.level) ?? parsed.line.level)
        : undefined;

      if (normalizedLevel) {
        if (!levels.includes(normalizedLevel)) {
          levels.push(normalizedLevel);
        }
      }

      const linkify = logProvider.linkify ?? ((text: string) => defaultLinkify(text));
      const lineEntry: LogLineEntry = {
        kind: "line",
        id: makeEntryId("line", index, groupStack.length),
        raw: parsed.line.raw,
        sourceLine: index + 1,
        timestamp: parsed.line.timestamp,
        level: parsed.line.level,
        normalizedLevel,
        message: parsed.line.message,
        metadata: parsed.line.metadata,
        messageParts: linkify(parsed.line.message, parsed.line),
      };

      appendEntry(lineEntry);
    }

    return { entries, levels, groupIds };
  }

  const parsedData = $derived(parseEntries(logs, provider));

  const levelOptions = $derived.by(() => {
    const levels = [...parsedData.levels];
    const orderedLevels = provider.levelOrder ?? [];

    levels.sort((a, b) => {
      const leftIndex = orderedLevels.indexOf(a);
      const rightIndex = orderedLevels.indexOf(b);

      if (leftIndex === -1 && rightIndex === -1) {
        return a.localeCompare(b);
      }

      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });

    return levels;
  });

  $effect(() => {
    const cleanedLevels = selectedLevels.filter((level) => levelOptions.includes(level));
    const normalizedLevels =
      levelOptions.length > 0 && cleanedLevels.length === levelOptions.length ? [] : cleanedLevels;

    if (
      normalizedLevels.length !== selectedLevels.length ||
      normalizedLevels.some((level, index) => level !== selectedLevels[index])
    ) {
      selectedLevels = normalizedLevels;
    }
  });

  $effect(() => {
    if (!levelDropdownOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (levelDropdownElement && !levelDropdownElement.contains(target)) {
        levelDropdownOpen = false;
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        levelDropdownOpen = false;
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  });

  $effect(() => {
    const previousState = collapsedGroupIds;
    const nextState: Record<string, boolean> = {};
    let hasChanged = parsedData.groupIds.length !== Object.keys(previousState).length;

    for (const groupId of parsedData.groupIds) {
      const nextValue =
        previousState[groupId] !== undefined
          ? previousState[groupId]
          : initialGroupsCollapsed;

      nextState[groupId] =
        nextValue;

      if (previousState[groupId] !== nextValue) {
        hasChanged = true;
      }
    }

    if (hasChanged) {
      collapsedGroupIds = nextState;
    }
  });

  function filterEntriesByLevel(entries: LogEntry[], activeLevels: string[]): LogEntry[] {
    if (activeLevels.length === 0) {
      return entries;
    }

    const filteredEntries: LogEntry[] = [];

    for (const entry of entries) {
      if (entry.kind === "line") {
        if (!entry.normalizedLevel || activeLevels.includes(entry.normalizedLevel)) {
          filteredEntries.push(entry);
        }
        continue;
      }

      const filteredChildren = filterEntriesByLevel(entry.entries, activeLevels);
      if (filteredChildren.length === 0) {
        continue;
      }

      filteredEntries.push({
        ...entry,
        entries: filteredChildren,
      });
    }

    return filteredEntries;
  }

  const visibleEntries = $derived(filterEntriesByLevel(parsedData.entries, selectedLevels));

  function toggleGroup(groupId: string): void {
    collapsedGroupIds = {
      ...collapsedGroupIds,
      [groupId]: !collapsedGroupIds[groupId],
    };
  }

  function toggleLevel(level: string): void {
    if (selectedLevels.includes(level)) {
      selectedLevels = selectedLevels.filter((selectedLevel) => selectedLevel !== level);
      return;
    }

    selectedLevels = [...selectedLevels, level];
  }

  function resetLevelFilter(): void {
    selectedLevels = [];
  }

  function isLevelChecked(level: string): boolean {
    return selectedLevels.length === 0 || selectedLevels.includes(level);
  }

  function toggleLevelFromDropdown(level: string): void {
    if (selectedLevels.length === 0) {
      selectedLevels = levelOptions.filter((levelOption) => levelOption !== level);
      return;
    }

    toggleLevel(level);
  }

  function levelFilterLabel(): string {
    if (selectedLevels.length === 0) {
      return "All levels";
    }

    if (selectedLevels.length === 1) {
      return displayLevel(selectedLevels[0]);
    }

    return `${selectedLevels.length} levels`;
  }

  function displayLevel(level: string): string {
    const normalized = provider.normalizeLevel?.(level) ?? level;
    return provider.displayLevel?.(normalized) ?? normalized;
  }
</script>

<div
  class={`card border border-surface-700 bg-surface-900/90 rounded-2xl p-4 space-y-4 ${className}`}
>
  <header class="flex flex-wrap items-center justify-between gap-2">
    <h2 class="text-xs font-semibold text-surface-100 tracking-wide uppercase">{title}</h2>

    {#if showLevelFilter && levelOptions.length > 0}
      <div class="relative" bind:this={levelDropdownElement}>
        <button
          type="button"
          class={`inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
            selectedLevels.length === 0
              ? "bg-primary-600/15 text-primary-200 border-primary-600/35"
              : "bg-surface-800 text-surface-200 border-surface-600 hover:bg-surface-700"
          }`}
          onclick={() => (levelDropdownOpen = !levelDropdownOpen)}
          aria-haspopup="menu"
          aria-expanded={levelDropdownOpen}
        >
          <span class="uppercase tracking-wide">Levels</span>
          <span class="text-surface-300 normal-case">{levelFilterLabel()}</span>
          <span class={`text-surface-400 transition-transform ${levelDropdownOpen ? "rotate-180" : ""}`}>▾</span>
        </button>

        {#if levelDropdownOpen}
          <div
            class="absolute right-0 top-full mt-2 w-52 rounded-lg border border-surface-600 bg-surface-900 shadow-xl z-20 overflow-hidden"
            role="menu"
            aria-label="Filter levels"
          >
            <div class="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-surface-700">
              <button
                type="button"
                class="text-[11px] text-primary-300 hover:text-primary-200"
                onclick={() => {
                  resetLevelFilter();
                  levelDropdownOpen = false;
                }}
              >
                All levels
              </button>
              <button
                type="button"
                class="text-[11px] text-surface-300 hover:text-surface-100 disabled:opacity-40"
                onclick={() => {
                  selectedLevels = [];
                  levelDropdownOpen = false;
                }}
                disabled={selectedLevels.length === 0}
              >
                Clear
              </button>
            </div>

            <div class="max-h-56 overflow-auto p-1.5 space-y-1">
              {#each levelOptions as level (level)}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isLevelChecked(level)}
                  class={`w-full flex items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-colors ${
                    isLevelChecked(level)
                      ? "bg-primary-600/15 text-primary-100"
                      : "text-surface-200 hover:bg-surface-800"
                  }`}
                  onclick={() => toggleLevelFromDropdown(level)}
                >
                  <span
                    class={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] leading-none ${
                      isLevelChecked(level)
                        ? "border-primary-400 bg-primary-500/20 text-primary-200"
                        : "border-surface-500 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span class="font-mono tracking-wide">{displayLevel(level)}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </header>

  <div
    class="bg-surface-950/70 border border-surface-800 rounded-xl p-2 max-h-[32rem] overflow-auto font-mono"
  >
    {#if visibleEntries.length === 0}
      <p class="text-xs text-surface-400 p-2">{emptyMessage}</p>
    {:else}
      {#each visibleEntries as entry (entry.id)}
        <LogBlockEntry
          {entry}
          collapsedGroupIds={collapsedGroupIds}
          {toggleGroup}
          {displayLevel}
        />
      {/each}
    {/if}
  </div>
</div>
