<script lang="ts">
  import type {
    Rule,
    RuleMode,
    PropertyDefinition,
    RulePolicyManagerProps,
    RuleChangeSummary,
    RuleModification,
  } from "./types.js";
  import PropertyEditor from "./PropertyEditor.svelte";
  import PayloadTester from "./PayloadTester.svelte";

  type Props = RulePolicyManagerProps;

  let {
    rules = $bindable<Rule[]>([]),
    propertyDefinitions = [],
    isDirty = $bindable(false),
    onRulesChange = () => {},
    onSave,
    testPayload,
  }: Props = $props();

  // ─── saved snapshot ────────────────────────────────────────────────────────
  // Deep-cloned at mount; updated only when the user confirms a save.
  let savedRulesSnapshot = $state<string>(JSON.stringify(rules));

  // ─── dirty tracking ───────────────────────────────────────────────────────
  const _isDirty = $derived(JSON.stringify(rules) !== savedRulesSnapshot);
  $effect(() => {
    isDirty = _isDirty;
  });

  // ─── drag & drop state ─────────────────────────────────────────────────────
  let dragIndex = $state<number | null>(null);
  // dropPosition is the insertion index (0 = before first … N = after last)
  let dropPosition = $state<number | null>(null);
  let dragging = $state(false);

  // ─── expanded rows ──────────────────────────────────────────────────────────
  let expandedIds = $state<Set<string>>(new Set());

  // ─── active tab ─────────────────────────────────────────────────────────────
  let activeTab = $state<"rules" | "test">("rules");

  // ─── helpers ────────────────────────────────────────────────────────────────
  function notify() {
    onRulesChange([...rules]);
  }

  function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  function addRule() {
    const newRule: Rule = {
      id: generateId(),
      name: `Rule ${rules.length + 1}`,
      mode: "ALLOW",
      enabled: true,
      properties: [],
    };
    rules = [...rules, newRule];
    expandedIds = new Set([...expandedIds, newRule.id]);
    notify();
  }

  function removeRule(id: string) {
    rules = rules.filter((r) => r.id !== id);
    expandedIds.delete(id);
    expandedIds = new Set(expandedIds);
    notify();
  }

  function toggleExpanded(id: string) {
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
    expandedIds = new Set(expandedIds);
  }

  function updateRule(id: string, patch: Partial<Rule>) {
    rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    notify();
  }

  function toggleMode(id: string, current: RuleMode) {
    updateRule(id, { mode: current === "ALLOW" ? "DENY" : "ALLOW" });
  }

  function toggleEnabled(id: string, current: boolean) {
    updateRule(id, { enabled: !current });
  }

  function duplicateRule(id: string) {
    const src = rules.find((r) => r.id === id);
    if (!src) return;
    const clone: Rule = {
      ...src,
      id: generateId(),
      name: src.name + " (copy)",
      properties: src.properties.map((p) => ({ ...p })),
    };
    const idx = rules.findIndex((r) => r.id === id);
    const updated = [...rules];
    updated.splice(idx + 1, 0, clone);
    rules = updated;
    expandedIds = new Set([...expandedIds, clone.id]);
    notify();
  }

  // ─── drag & drop ────────────────────────────────────────────────────────────
  function onDragStart(e: DragEvent, index: number) {
    dragIndex = index;
    dragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropPosition = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
  }

  function onDragLeave() {
    dropPosition = null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (dragIndex === null || dropPosition === null) {
      dragIndex = null;
      dropPosition = null;
      dragging = false;
      return;
    }
    // Adjust for the gap left after removing the dragged item
    let target = dropPosition;
    if (dragIndex < target) target--;
    if (dragIndex !== target) {
      const updated = [...rules];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(target, 0, moved);
      rules = updated;
      notify();
    }
    dragIndex = null;
    dropPosition = null;
    dragging = false;
  }

  function onDragEnd() {
    dragIndex = null;
    dropPosition = null;
    dragging = false;
  }

  // ─── change summary ───────────────────────────────────────────────────────
  function buildChangeSummary(
    saved: Rule[],
    current: Rule[],
  ): RuleChangeSummary {
    const savedMap = new Map(saved.map((r) => [r.id, r]));
    const currentMap = new Map(current.map((r) => [r.id, r]));

    const added = current.filter((r) => !savedMap.has(r.id));
    const removed = saved.filter((r) => !currentMap.has(r.id));

    const modified: RuleModification[] = [];
    for (const rule of current) {
      const prev = savedMap.get(rule.id);
      if (!prev || JSON.stringify(rule) === JSON.stringify(prev)) continue;
      const changedFields: Array<"name" | "mode" | "enabled" | "properties"> =
        [];
      if (rule.name !== prev.name) changedFields.push("name");
      if (rule.mode !== prev.mode) changedFields.push("mode");
      if (rule.enabled !== prev.enabled) changedFields.push("enabled");
      if (JSON.stringify(rule.properties) !== JSON.stringify(prev.properties))
        changedFields.push("properties");
      modified.push({ rule, previous: prev, changedFields });
    }

    const savedOrder = saved
      .filter((r) => currentMap.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    const currentOrder = current
      .filter((r) => savedMap.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    const reordered =
      JSON.stringify(savedOrder.map((r) => r.id)) !==
      JSON.stringify(currentOrder.map((r) => r.id));

    const totalChanges =
      added.length + removed.length + modified.length + (reordered ? 1 : 0);

    return {
      added,
      removed,
      modified,
      reordered,
      totalChanges,
      savedOrder,
      currentOrder,
    };
  }

  function handleSave() {
    if (!onSave || !_isDirty) return;
    const savedParsed: Rule[] = JSON.parse(savedRulesSnapshot);
    const currentCopy: Rule[] = JSON.parse(JSON.stringify(rules));
    const summary = buildChangeSummary(savedParsed, currentCopy);
    onSave(currentCopy, summary, () => {
      savedRulesSnapshot = JSON.stringify(rules);
    });
  }
</script>

<div
  class="flex flex-col gap-0 w-full rounded-2xl border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 overflow-hidden shadow-sm"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-950"
  >
    <div class="flex items-center gap-3">
      <span class="text-lg">⚖️</span>
      <h2
        class="text-base font-bold text-surface-900 dark:text-surface-100 tracking-tight"
      >
        Rule Policy Manager
      </h2>
      <span
        class="text-xs px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400 font-medium"
      >
        {rules.length} rule{rules.length !== 1 ? "s" : ""}
      </span>
    </div>

    <!-- Dirty / Save button -->
    <div class="flex items-center gap-2">
      {#if _isDirty && onSave}
        <button
          type="button"
          onclick={handleSave}
          class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white transition-colors shadow-sm"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M1 1h7.5L11 3.5V11H1V1z" />
            <rect x="3.5" y="7" width="5" height="4" rx="0.5" />
            <rect x="3.5" y="1" width="4" height="3" rx="0.5" />
          </svg>
          Save
          <span class="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"
          ></span>
        </button>
      {/if}

      <!-- Tabs -->
      <div
        class="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl p-1"
      >
        <button
          type="button"
          onclick={() => (activeTab = "rules")}
          class="text-xs px-3 py-1.5 rounded-lg font-medium transition-all {activeTab ===
          'rules'
            ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
            : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'}"
        >
          Rules
        </button>
        <button
          type="button"
          onclick={() => (activeTab = "test")}
          class="text-xs px-3 py-1.5 rounded-lg font-medium transition-all {activeTab ===
          'test'
            ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
            : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'}"
        >
          Test Payload
        </button>
      </div>
    </div>
  </div>

  <!-- Body -->
  {#if activeTab === "rules"}
    <!-- Rules list -->
    <div class="divide-y divide-surface-200 dark:divide-surface-700">
      {#if rules.length === 0}
        <div
          class="flex flex-col items-center justify-center py-14 text-surface-400 dark:text-surface-500 gap-3"
        >
          <span class="text-4xl">📋</span>
          <p class="text-sm font-medium">No rules yet</p>
          <p class="text-xs">Add your first rule to get started</p>
        </div>
      {/if}

      {#each rules as rule, index (rule.id)}
        {@const isExpanded = expandedIds.has(rule.id)}
        {@const isDragging = dragIndex === index}
        {@const showLineBefore = dropPosition === index && dragIndex !== index}
        {@const showLineAfter =
          dropPosition === index + 1 && dragIndex !== index}

        <div
          draggable={true}
          ondragstart={(e) => onDragStart(e, index)}
          ondragover={(e) => onDragOver(e, index)}
          ondragleave={onDragLeave}
          ondrop={onDrop}
          ondragend={onDragEnd}
          class="transition-all duration-150
            {isDragging ? 'opacity-40 scale-[0.99]' : 'opacity-100'}
            {showLineBefore
            ? 'border-t-2 border-t-primary-400 dark:border-t-primary-500'
            : ''}
            {showLineAfter
            ? 'border-b-2 border-b-primary-400 dark:border-b-primary-500'
            : ''}"
        >
          <!-- Rule header row -->
          <div
            class="flex items-center gap-2 px-4 py-3 {rule.enabled
              ? ''
              : 'opacity-50'}
              {isExpanded
              ? 'bg-surface-100 dark:bg-surface-800'
              : 'bg-white dark:bg-surface-950 hover:bg-surface-50 dark:hover:bg-surface-900'}
              transition-colors"
          >
            <!-- Drag handle -->
            <button
              type="button"
              class="cursor-grab active:cursor-grabbing text-surface-300 dark:text-surface-600 hover:text-surface-500 dark:hover:text-surface-400 transition-colors shrink-0 px-1"
              aria-label="Drag to reorder"
              tabindex={-1}
            >
              <svg
                width="10"
                height="16"
                viewBox="0 0 10 16"
                fill="currentColor"
              >
                <circle cx="3" cy="3" r="1.5" />
                <circle cx="7" cy="3" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="7" cy="8" r="1.5" />
                <circle cx="3" cy="13" r="1.5" />
                <circle cx="7" cy="13" r="1.5" />
              </svg>
            </button>

            <!-- Index badge -->
            <span
              class="text-xs text-surface-400 dark:text-surface-500 font-mono w-5 text-center shrink-0"
            >
              {index + 1}
            </span>

            <!-- Enabled toggle -->
            <button
              type="button"
              onclick={() => toggleEnabled(rule.id, rule.enabled)}
              class="relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200
                {rule.enabled
                ? 'bg-primary-500'
                : 'bg-surface-300 dark:bg-surface-600'}"
              role="switch"
              aria-checked={rule.enabled}
              aria-label="Toggle rule enabled"
            >
              <span
                class="pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform ring-0 transition-transform duration-200
                  {rule.enabled ? 'translate-x-3' : 'translate-x-0'}"
              ></span>
            </button>

            <!-- Mode badge -->
            <button
              type="button"
              onclick={() => toggleMode(rule.id, rule.mode)}
              class="text-xs font-bold px-2 w-20 text-center py-0.5 rounded-md shrink-0 transition-colors
                {rule.mode === 'ALLOW'
                ? 'bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-200 dark:hover:bg-success-900 border border-success-300 dark:border-success-700'
                : 'bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300 hover:bg-error-200 dark:hover:bg-error-900 border border-error-300 dark:border-error-700'}"
              title="Click to toggle ALLOW / DENY"
            >
              {rule.mode === "ALLOW" ? "✓ ALLOW" : "✕ DENY"}
            </button>

            <!-- Rule name -->
            <input
              type="text"
              bind:value={rules[index].name}
              oninput={() => notify()}
              onclick={(e) => e.stopPropagation()}
              placeholder="Rule name…"
              class="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 cursor-text"
            />

            <!-- Properties count pill -->
            {#if rule.properties.length > 0}
              <span
                class="text-xs px-1.5 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 shrink-0"
              >
                {rule.properties.length} prop{rule.properties.length !== 1
                  ? "s"
                  : ""}
              </span>
            {/if}

            <!-- Action buttons -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onclick={() => duplicateRule(rule.id)}
                class="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-700 dark:hover:text-surface-300 transition-colors text-sm"
                title="Duplicate rule"
                aria-label="Duplicate rule"
              >
                ⧉
              </button>
              <button
                type="button"
                onclick={() => removeRule(rule.id)}
                class="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-error-100 dark:hover:bg-error-950 hover:text-error-600 dark:hover:text-error-400 transition-colors text-sm"
                title="Delete rule"
                aria-label="Delete rule"
              >
                ×
              </button>
              <button
                type="button"
                onclick={() => toggleExpanded(rule.id)}
                class="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                title={isExpanded ? "Collapse" : "Expand properties"}
                aria-label={isExpanded ? "Collapse" : "Expand properties"}
                aria-expanded={isExpanded}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="transition-transform duration-200 {isExpanded
                    ? 'rotate-180'
                    : ''}"
                >
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Expanded: property editor -->
          {#if isExpanded}
            <div
              class="px-4 pb-2 bg-surface-50 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700"
            >
              {#if propertyDefinitions.length === 0}
                <p
                  class="text-xs text-surface-400 dark:text-surface-500 italic pt-3"
                >
                  No property definitions provided. Pass <code
                    class="bg-surface-200 dark:bg-surface-700 px-1 rounded"
                    >propertyDefinitions</code
                  > to enable property editing.
                </p>
              {:else}
                <PropertyEditor
                  {propertyDefinitions}
                  properties={rule.properties}
                  onPropertiesChange={(props) =>
                    updateRule(rule.id, { properties: props })}
                />
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Footer: add rule -->
    <div
      class="px-5 py-3 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-950"
    >
      <button
        type="button"
        onclick={addRule}
        class="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
      >
        <span
          class="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-base font-bold"
          >+</span
        >
        Add rule
      </button>
    </div>
  {:else}
    <!-- Test Payload tab -->
    <div class="p-5 bg-white dark:bg-surface-950">
      <div class="mb-3">
        <h3
          class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-1"
        >
          Test a Payload
        </h3>
        <p class="text-xs text-surface-500 dark:text-surface-400">
          Enter a JSON payload to see which rule matches first.
        </p>
      </div>
      <PayloadTester {rules} {testPayload} />
    </div>
  {/if}
</div>
