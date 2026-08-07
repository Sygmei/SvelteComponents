<script lang="ts">
  import type {
    Rule,
    RuleAction,
    RuleSection,
    FilterDefinition,
    RulePolicyManagerProps,
    RuleChangeSummary,
    RuleModification,
  } from "./types.js";
  import PropertyEditor from "./PropertyEditor.svelte";
  import RuleMetadataModal from "./RuleMetadataModal.svelte";
  import { setActiveModal } from "$lib/components/Modal/ModalStore.svelte";

  type Props = RulePolicyManagerProps;

  let {
    rules = $bindable<Rule[]>([]),
    sections = [],
    filtersDefinitions = [],
    isDirty = $bindable(false),
    onRulesChange = () => {},
    onSave,
  }: Props = $props();

  const DEFAULT_SECTION: RuleSection = {
    id: "__default__",
    name: "Rules",
  };
  const UNASSIGNED_SECTION: RuleSection = {
    id: "__unassigned__",
    name: "Unassigned",
    readOnly: true,
  };

  const configuredSectionIds = $derived(new Set(sections.map((s) => s.id)));
  const hasUnassignedRules = $derived(
    sections.length > 0 &&
      rules.some(
        (rule) =>
          rule.sectionId == null || !configuredSectionIds.has(rule.sectionId),
      ),
  );
  const displaySections = $derived(
    sections.length === 0
      ? [DEFAULT_SECTION]
      : hasUnassignedRules
        ? [...sections, UNASSIGNED_SECTION]
        : sections,
  );
  const writableSections = $derived(
    displaySections.filter((section) => !section.readOnly),
  );

  // saved snapshot
  // Deep-cloned at mount; updated only when the user confirms a save.
  let savedRulesSnapshot = $state<string>(JSON.stringify(rules));

  // dirty tracking
  const _isDirty = $derived(JSON.stringify(rules) !== savedRulesSnapshot);
  $effect(() => {
    isDirty = _isDirty;
  });

  // drag & drop state
  let dragLocation = $state<{ sectionId: string; index: number } | null>(null);
  // dropPosition is the insertion index (0 = before first … N = after last)
  let dropPosition = $state<number | null>(null);

  // expanded rows
  let expandedIds = $state<Set<string>>(new Set());

  // helpers
  function ruleBelongsToSection(rule: Rule, sectionId: string): boolean {
    if (sections.length === 0) return sectionId === DEFAULT_SECTION.id;
    if (sectionId === UNASSIGNED_SECTION.id) {
      return (
        rule.sectionId == null || !configuredSectionIds.has(rule.sectionId)
      );
    }
    return rule.sectionId === sectionId;
  }

  function getSectionRules(sectionId: string): Rule[] {
    return rules.filter((rule) => ruleBelongsToSection(rule, sectionId));
  }

  function isSectionReadOnly(sectionId: string): boolean {
    return (
      displaySections.find((section) => section.id === sectionId)?.readOnly ===
      true
    );
  }

  function sectionForRule(rule: Rule): RuleSection {
    if (sections.length === 0) return DEFAULT_SECTION;
    if (rule.sectionId != null && configuredSectionIds.has(rule.sectionId)) {
      return sections.find((section) => section.id === rule.sectionId)!;
    }
    return UNASSIGNED_SECTION;
  }

  function isRuleWritable(id: string): boolean {
    const rule = rules.find((candidate) => candidate.id === id);
    return rule != null && !sectionForRule(rule).readOnly;
  }

  function defaultFilterValue(
    def: FilterDefinition,
  ): string | number | boolean | string[] | null {
    if (def.type === "array") return [];
    if (def.type === "number") return 0;
    if (def.type === "boolean") return false;
    return null;
  }

  function backfillFilters(rule: Rule): Rule {
    if (filtersDefinitions.length === 0) return rule;
    const existingMap = new Map(rule.filters.map((f) => [f.key, f.value]));
    const filters = filtersDefinitions.map((d) => ({
      key: d.key,
      value: existingMap.has(d.key)
        ? existingMap.get(d.key)!
        : defaultFilterValue(d),
    }));
    if (JSON.stringify(filters) === JSON.stringify(rule.filters)) return rule;
    return { ...rule, filters };
  }

  // Backfill missing filters on existing rules at mount (and whenever
  // filtersDefinitions change) without triggering dirty state.
  $effect(() => {
    if (filtersDefinitions.length === 0) return;
    const backfilled = rules.map((rule) =>
      isRuleWritable(rule.id) ? backfillFilters(rule) : rule,
    );
    const changed = backfilled.some(
      (r, i) => JSON.stringify(r) !== JSON.stringify(rules[i]),
    );
    if (changed) {
      rules = backfilled;
      savedRulesSnapshot = JSON.stringify(rules);
    }
  });

  function notify() {
    onRulesChange([...rules]);
  }

  function generateId(): string {
    return crypto.randomUUID();
  }

  function addRule(sectionId: string) {
    if (isSectionReadOnly(sectionId)) return;
    const sectionRules = getSectionRules(sectionId);
    const newRule: Rule = {
      id: generateId(),
      ...(sections.length > 0 ? { sectionId } : {}),
      name: `Rule ${sectionRules.length + 1}`,
      action: "ALLOW",
      enabled: true,
      filters: filtersDefinitions.map((def) => ({
        key: def.key,
        value: defaultFilterValue(def),
      })),
    };
    rules = [...rules, newRule];
    expandedIds = new Set([...expandedIds, newRule.id]);
    notify();
  }

  function removeRule(id: string) {
    if (!isRuleWritable(id)) return;
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

  function updateRule(
    id: string,
    patch: Partial<Omit<Rule, "id" | "sectionId">>,
  ) {
    if (!isRuleWritable(id)) return;
    rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    notify();
  }

  function toggleAction(id: string, current: RuleAction) {
    updateRule(id, { action: current === "ALLOW" ? "DENY" : "ALLOW" });
  }

  function toggleEnabled(id: string, current: boolean) {
    updateRule(id, { enabled: !current });
  }

  function duplicateRule(id: string) {
    if (!isRuleWritable(id)) return;
    const src = rules.find((r) => r.id === id);
    if (!src) return;
    const clone: Rule = {
      ...src,
      id: generateId(),
      name: src.name + " (copy)",
      filters: src.filters.map((p) => ({ ...p })),
    };
    const idx = rules.findIndex((r) => r.id === id);
    const updated = [...rules];
    updated.splice(idx + 1, 0, clone);
    rules = updated;
    expandedIds = new Set([...expandedIds, clone.id]);
    notify();
  }

  function moveRuleToSection(
    id: string,
    targetSectionId: string,
    targetIndex = getSectionRules(targetSectionId).length,
  ) {
    if (sections.length === 0 || isSectionReadOnly(targetSectionId)) return;
    const sourceRule = rules.find((rule) => rule.id === id);
    if (!sourceRule) return;
    const sourceSection = sectionForRule(sourceRule);
    if (sourceSection.readOnly || sourceSection.id === targetSectionId) return;

    const targetRules = getSectionRules(targetSectionId);
    const sourceRules = getSectionRules(sourceSection.id);
    const sourceIndex = sourceRules.findIndex((rule) => rule.id === id);
    if (sourceIndex < 0) return;

    const movedRule = { ...sourceRule, sectionId: targetSectionId };
    const boundedTargetIndex = Math.max(
      0,
      Math.min(targetIndex, targetRules.length),
    );
    const targetAnchor = targetRules[boundedTargetIndex];
    const remainingRules = rules.filter((rule) => rule.id !== id);
    let insertionIndex = remainingRules.length;
    if (targetAnchor) {
      insertionIndex = remainingRules.findIndex(
        (rule) => rule.id === targetAnchor.id,
      );
    } else if (targetRules.length > 0) {
      const lastTargetRule = targetRules[targetRules.length - 1];
      const lastTargetIndex = remainingRules.findIndex(
        (rule) => rule.id === lastTargetRule.id,
      );
      insertionIndex = lastTargetIndex + 1;
    }

    remainingRules.splice(insertionIndex, 0, movedRule);
    rules = remainingRules;
    notify();
  }

  // drag & drop
  function onDragStart(e: DragEvent, sectionId: string, index: number) {
    if (isSectionReadOnly(sectionId)) {
      e.preventDefault();
      return;
    }
    dragLocation = { sectionId, index };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${sectionId}:${index}`);
    }
  }

  function onDragOver(e: DragEvent, sectionId: string, index: number) {
    if (
      dragLocation === null ||
      isSectionReadOnly(sectionId) ||
      isSectionReadOnly(dragLocation.sectionId)
    ) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropPosition = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
  }

  function onEmptySectionDragOver(e: DragEvent, sectionId: string) {
    if (
      dragLocation === null ||
      isSectionReadOnly(sectionId) ||
      isSectionReadOnly(dragLocation.sectionId)
    ) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dropPosition = 0;
  }

  function onDragLeave() {
    dropPosition = null;
  }

  function onDrop(e: DragEvent, sectionId: string) {
    e.preventDefault();
    if (
      dragLocation === null ||
      dropPosition === null ||
      isSectionReadOnly(sectionId) ||
      isSectionReadOnly(dragLocation.sectionId)
    ) {
      dragLocation = null;
      dropPosition = null;
      return;
    }
    const sourceSectionId = dragLocation.sectionId;
    if (sourceSectionId !== sectionId) {
      const sourceRules = getSectionRules(sourceSectionId);
      const movedRule = sourceRules[dragLocation.index];
      if (movedRule) {
        moveRuleToSection(movedRule.id, sectionId, dropPosition);
      }
      dragLocation = null;
      dropPosition = null;
      return;
    }

    const sectionRules = getSectionRules(sectionId);
    // Adjust for the gap left after removing the dragged item
    let target = dropPosition;
    if (dragLocation.index < target) target--;
    if (dragLocation.index !== target) {
      const updatedSectionRules = [...sectionRules];
      const [moved] = updatedSectionRules.splice(dragLocation.index, 1);
      updatedSectionRules.splice(target, 0, moved);
      let replacementIndex = 0;
      rules = rules.map((rule) =>
        ruleBelongsToSection(rule, sectionId)
          ? updatedSectionRules[replacementIndex++]
          : rule,
      );
      notify();
    }
    dragLocation = null;
    dropPosition = null;
  }

  function onDragEnd() {
    dragLocation = null;
    dropPosition = null;
  }

  // change summary
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
      const changedFields: Array<
        "name" | "action" | "enabled" | "filters" | "sectionId"
      > = [];
      if (rule.name !== prev.name) changedFields.push("name");
      if (rule.action !== prev.action) changedFields.push("action");
      if (rule.enabled !== prev.enabled) changedFields.push("enabled");
      if (JSON.stringify(rule.filters) !== JSON.stringify(prev.filters))
        changedFields.push("filters");
      if (rule.sectionId !== prev.sectionId) changedFields.push("sectionId");
      modified.push({
        rule,
        previous: prev,
        changedFields,
        previousSection: sectionForRule(prev),
        currentSection: sectionForRule(rule),
      });
    }

    const previousOrder = saved
      .filter((r) => currentMap.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    const currentOrder = current
      .filter((r) => savedMap.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    const reordered =
      JSON.stringify(previousOrder.map((r) => r.id)) !==
      JSON.stringify(currentOrder.map((r) => r.id));

    const totalChanges =
      added.length + removed.length + modified.length + (reordered ? 1 : 0);

    return {
      added,
      removed,
      modified,
      reordered,
      totalChanges,
      previousOrder,
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

  function handleRevert() {
    if (!_isDirty) return;
    rules = JSON.parse(savedRulesSnapshot);
    onRulesChange(rules);
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
      <span
        class="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 font-medium"
      >
        {displaySections.length} section{displaySections.length !== 1 ? "s" : ""}
      </span>
    </div>

    <!-- Dirty / Save button -->
    <div class="flex items-center gap-2">
      {#if _isDirty}
        <button
          type="button"
          onclick={handleRevert}
          class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 transition-colors"
          title="Revert all unsaved changes"
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
            <path d="M1 4h6a4 4 0 1 1 0 8" />
            <polyline points="1,1 1,4 4,4" />
          </svg>
          Revert
        </button>
      {/if}
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
    </div>
  </div>

  <!-- Body -->
  <div class="divide-y divide-surface-200 dark:divide-surface-700">
    {#each displaySections as section (section.id)}
      {@const sectionRules = getSectionRules(section.id)}
      <section
        class="bg-white dark:bg-surface-950"
        data-section-id={section.id}
      >
        <header
          class="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800"
        >
          <div class="flex items-center gap-2 min-w-0">
            <h3
              class="text-sm font-semibold text-surface-800 dark:text-surface-200 truncate"
            >
              {section.name}
            </h3>
            <span
              class="text-[11px] text-surface-500 dark:text-surface-400 shrink-0"
            >
              {sectionRules.length} rule{sectionRules.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span
            class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 {section.readOnly
              ? 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600'
              : 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800'}"
          >
            {#if section.readOnly}
              <svg
                width="9"
                height="9"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="8" height="6" rx="1" />
                <path d="M4 5V3.5a2 2 0 0 1 4 0V5" />
              </svg>
              Read only
            {:else}
              Read write
            {/if}
          </span>
        </header>

        <div
          class="divide-y divide-surface-200 dark:divide-surface-700"
          role="list"
        >
          {#if sectionRules.length === 0}
            <div
              role="listitem"
              class="flex flex-col items-center justify-center py-9 text-surface-400 dark:text-surface-500 gap-1.5"
              ondragover={(e) => onEmptySectionDragOver(e, section.id)}
              ondrop={(e) => onDrop(e, section.id)}
            >
              <span class="text-2xl">📋</span>
              <p class="text-sm font-medium">No rules in this section</p>
              {#if section.readOnly}
                <p class="text-xs">This section is read only</p>
              {:else}
                <p class="text-xs">Add a rule to get started</p>
              {/if}
            </div>
          {/if}

          {#each sectionRules as rule, index (rule.id)}
            {@const isExpanded = expandedIds.has(rule.id)}
            {@const isDragging =
              dragLocation?.sectionId === section.id &&
              dragLocation.index === index}
            {@const isDropTarget =
              dragLocation !== null && !section.readOnly}
            {@const showLineBefore =
              isDropTarget &&
              dropPosition === index &&
              (dragLocation?.sectionId !== section.id ||
                dragLocation.index !== index)}
            {@const showLineAfter =
              isDropTarget &&
              dropPosition === index + 1 &&
              (dragLocation?.sectionId !== section.id ||
                dragLocation.index !== index)}

      <div
        role="listitem"
        data-rule-id={rule.id}
        draggable={!section.readOnly}
        ondragstart={(e) => onDragStart(e, section.id, index)}
        ondragover={(e) => onDragOver(e, section.id, index)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, section.id)}
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
          <!-- Drag handle / read-only indicator -->
          <span
            class="text-surface-300 dark:text-surface-600 transition-colors shrink-0 px-1 {section.readOnly
              ? 'cursor-default'
              : 'cursor-grab active:cursor-grabbing hover:text-surface-500 dark:hover:text-surface-400'}"
            aria-label={section.readOnly ? "Rule is read only" : "Drag to reorder"}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="3" cy="3" r="1.5" />
              <circle cx="7" cy="3" r="1.5" />
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="7" cy="8" r="1.5" />
              <circle cx="3" cy="13" r="1.5" />
              <circle cx="7" cy="13" r="1.5" />
            </svg>
          </span>

          <!-- Index badge -->
          <span
            class="text-xs text-surface-400 dark:text-surface-500 font-mono w-5 text-center shrink-0"
            title="Priority {index + 1}"
          >
            {index + 1}
          </span>

          <!-- Enabled toggle -->
          <button
            type="button"
            onclick={() => toggleEnabled(rule.id, rule.enabled)}
            disabled={section.readOnly}
            class="relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:cursor-default
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

          <!-- Action badge -->
          <button
            type="button"
            onclick={() => toggleAction(rule.id, rule.action)}
            disabled={section.readOnly}
            class="text-xs font-bold px-2 w-20 text-center py-0.5 rounded-md shrink-0 transition-colors disabled:cursor-default
                {rule.action === 'ALLOW'
              ? 'bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-200 dark:hover:bg-success-900 border border-success-300 dark:border-success-700'
              : 'bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300 hover:bg-error-200 dark:hover:bg-error-900 border border-error-300 dark:border-error-700'}"
            title={section.readOnly
              ? "Rule is read only"
              : "Click to toggle ALLOW / DENY"}
          >
            {rule.action === "ALLOW" ? "✓ ALLOW" : "✕ DENY"}
          </button>

          <!-- Rule name -->
          <input
            type="text"
            value={rule.name}
            readonly={section.readOnly}
            oninput={(e) =>
              updateRule(rule.id, {
                name: (e.currentTarget as HTMLInputElement).value,
              })}
            onclick={(e) => e.stopPropagation()}
            placeholder="Rule name…"
            class="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 {section.readOnly
              ? 'cursor-default'
              : 'cursor-text'}"
          />

          <!-- Created by badge (always occupies a fixed slot) -->
          <span class="hidden sm:flex items-center w-24 shrink-0">
            {#if rule.metadata?.createdBy}
              <span
                class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700 truncate max-w-full"
                title="Created by {rule.metadata.createdBy}"
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="shrink-0"
                >
                  <circle cx="6" cy="4" r="2.5" />
                  <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" />
                </svg>
                <span class="truncate">{rule.metadata.createdBy}</span>
              </span>
            {/if}
          </span>

          <!-- Rule ID badge (fixed width) -->
          <span
            class="font-mono text-[10px] w-20 text-center px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 border border-surface-200 dark:border-surface-700 shrink-0 hidden sm:inline-block truncate"
            title="Rule ID: {rule.id}"
          >
            {rule.id.slice(0, 8)}
          </span>

          <!-- Filters count pill (fixed width) -->
          <span
            class="text-xs w-20 text-center px-1.5 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 shrink-0"
          >
            {rule.filters.length} filter{rule.filters.length !== 1 ? "s" : ""}
          </span>

          <!-- Action buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                setActiveModal({ modal: RuleMetadataModal, props: { rule } });
              }}
              class="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="View metadata"
              aria-label="View metadata"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="6" cy="6" r="5" />
                <line x1="6" y1="5.5" x2="6" y2="9" />
                <circle
                  cx="6"
                  cy="3.5"
                  r="0.5"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </button>
            {#if !section.readOnly}
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
            {/if}
            {#if !section.readOnly && writableSections.length > 1}
              <select
                value={section.id}
                onchange={(e) =>
                  moveRuleToSection(
                    rule.id,
                    (e.currentTarget as HTMLSelectElement).value,
                  )}
                class="max-w-28 text-[10px] rounded-md border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                title="Move rule to section"
                aria-label="Move {rule.name} to section"
              >
                {#each writableSections as targetSection (targetSection.id)}
                  <option value={targetSection.id}>{targetSection.name}</option>
                {/each}
              </select>
            {/if}
            <button
              type="button"
              onclick={() => toggleExpanded(rule.id)}
              class="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
              title={isExpanded ? "Collapse" : "Expand filters"}
              aria-label={isExpanded ? "Collapse" : "Expand filters"}
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
            {#if filtersDefinitions.length === 0}
              <p
                class="text-xs text-surface-400 dark:text-surface-500 italic pt-3"
              >
                No filter definitions provided. Pass <code
                  class="bg-surface-200 dark:bg-surface-700 px-1 rounded"
                  >filtersDefinitions</code
                > to enable filter editing.
              </p>
            {:else}
              <PropertyEditor
                propertyDefinitions={filtersDefinitions}
                filters={rule.filters}
                onFiltersChange={(filters) => updateRule(rule.id, { filters })}
                readOnly={section.readOnly}
              />
            {/if}
          </div>
        {/if}
            </div>
          {/each}
        </div>

        {#if !section.readOnly}
          <div
            class="px-5 py-3 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-950"
          >
            <button
              type="button"
              onclick={() => addRule(section.id)}
              class="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <span
                class="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-base font-bold"
                >+</span
              >
              Add rule to {section.name}
            </button>
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>
