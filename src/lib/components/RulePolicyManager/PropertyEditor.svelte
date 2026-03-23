<script lang="ts">
  import type { FilterDefinition, RuleFilter, AutocompleteSuggestion } from "./types.js";
  import DateTimeInput from "./DateTimeInput.svelte";

  interface Props {
    propertyDefinitions: FilterDefinition[];
    filters: RuleFilter[];
    onFiltersChange: (filters: RuleFilter[]) => void;
  }

  let {
    propertyDefinitions,
    filters: properties,
    onFiltersChange: onPropertiesChange,
  }: Props = $props();

  // scalar mirrors
  let inputMirrors = $state<Record<string, string>>({});

  $effect(() => {
    const next: Record<string, string> = {};
    for (const p of properties) {
      const def = propertyDefinitions.find((d) => d.key === p.key);
      if (def?.type !== "array") {
        next[p.key] = String(p.value);
      }
    }
    inputMirrors = next;
  });

  function commitValue(key: string, rawValue: string | null) {
    const def = propertyDefinitions.find((d) => d.key === key);
    let value: string | number | boolean | null = rawValue;
    if (def?.type === "date") value = rawValue; // null or RFC3339 string
    else if (def?.type === "number") value = (rawValue ?? "") === "" ? 0 : Number(rawValue);
    else if (def?.type === "boolean") value = rawValue === "true";

    const existing = properties.findIndex((p) => p.key === key);
    if (existing >= 0) {
      const updated = [...properties];
      updated[existing] = { key, value };
      onPropertiesChange(updated);
    } else {
      onPropertiesChange([...properties, { key, value }]);
    }
  }

  // array helpers
  /** Which array property currently has its "add item" row open */
  let arrayAddingKey = $state<string | null>(null);
  /** Pending new-item value per property key */
  let arrayNewValue = $state<Record<string, string>>({});

  function getArray(key: string): string[] {
    const prop = properties.find((p) => p.key === key);
    if (!prop) return [];
    return Array.isArray(prop.value) ? (prop.value as string[]) : [];
  }

  function commitArrayChange(key: string, newArray: string[]) {
    const existing = properties.findIndex((p) => p.key === key);
    if (existing >= 0) {
      const updated = [...properties];
      updated[existing] = { key, value: newArray };
      onPropertiesChange(updated);
    } else {
      onPropertiesChange([...properties, { key, value: newArray }]);
    }
  }

  function removeArrayItem(key: string, index: number) {
    const arr = [...getArray(key)];
    arr.splice(index, 1);
    commitArrayChange(key, arr);
  }

  function addArrayItem(key: string) {
    const val = arrayNewValue[key];
    if (val === undefined || val === "") return;
    commitArrayChange(key, [...getArray(key), val]);
    arrayNewValue = { ...arrayNewValue, [key]: "" };
    arrayAddingKey = null;
  }

  function openArrayAdder(key: string, def: FilterDefinition) {
    arrayAddingKey = key;
    arrayNewValue = { ...arrayNewValue, [key]: "" };
  }

  // shared
  function resetProperty(key: string) {
    const def = propertyDefinitions.find((d) => d.key === key);
    const defaultValue:
      | string
      | number
      | boolean
      | string[] =
      def?.type === "array" ? [] :
      def?.type === "number" ? 0 :
      def?.type === "boolean" ? false :
      "";
    const existing = properties.findIndex((p) => p.key === key);
    if (existing >= 0) {
      const updated = [...properties];
      updated[existing] = { key, value: defaultValue };
      onPropertiesChange(updated);
    }
  }

  // ── Autocomplete ────────────────────────────────────────────────────────
  let acSuggestions = $state<Record<string, AutocompleteSuggestion[]>>({});
  let acOpen = $state<Record<string, boolean>>({});
  let acLoading = $state<Record<string, boolean>>({});
  let acHighlight = $state<Record<string, number>>({});

  function acSuggestionValue(s: AutocompleteSuggestion): string {
    return typeof s === "string" ? s : s.value;
  }
  function acSuggestionLabel(s: AutocompleteSuggestion): string {
    return typeof s === "string" ? s : s.label;
  }

  async function fetchSuggestions(acKey: string, query: string, def: FilterDefinition) {
    if (!def.autocomplete) return;
    acLoading = { ...acLoading, [acKey]: true };
    acHighlight = { ...acHighlight, [acKey]: -1 };
    try {
      const results = await def.autocomplete(query);
      acSuggestions = { ...acSuggestions, [acKey]: results };
      acOpen = { ...acOpen, [acKey]: results.length > 0 };
    } finally {
      acLoading = { ...acLoading, [acKey]: false };
    }
  }

  function acSelect(acKey: string, suggestion: AutocompleteSuggestion, onSelect: (v: string) => void) {
    onSelect(acSuggestionValue(suggestion));
    acOpen = { ...acOpen, [acKey]: false };
    acSuggestions = { ...acSuggestions, [acKey]: [] };
    acHighlight = { ...acHighlight, [acKey]: -1 };
  }

  function acKeydown(e: KeyboardEvent, acKey: string, onEnter: (v: string) => void) {
    const suggestions = acSuggestions[acKey] ?? [];
    if (!acOpen[acKey] || suggestions.length === 0) return;
    const hi = acHighlight[acKey] ?? -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      acHighlight = { ...acHighlight, [acKey]: Math.min(hi + 1, suggestions.length - 1) };
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      acHighlight = { ...acHighlight, [acKey]: Math.max(hi - 1, -1) };
    } else if (e.key === "Enter" && hi >= 0) {
      e.preventDefault();
      acSelect(acKey, suggestions[hi], onEnter);
    } else if (e.key === "Escape") {
      acOpen = { ...acOpen, [acKey]: false };
    }
  }

  function acBlur(acKey: string) {
    // delay so mousedown on a suggestion fires before blur closes the list
    setTimeout(() => { acOpen = { ...acOpen, [acKey]: false }; }, 150);
  }

  const inputClass =
    "w-full text-xs rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition-colors";

  const btnPrimary =
    "text-xs px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium shrink-0";

  const btnGhost =
    "text-xs px-2.5 py-1.5 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shrink-0";
</script>

<div class="pt-3 pb-1 flex flex-col gap-1">
  <!-- ── Existing properties ─────────────────────────────────────────────── -->
  {#each properties as prop (prop.key)}
    {@const def = propertyDefinitions.find((d) => d.key === prop.key)}

    <div
      class="group grid grid-cols-[112px_1fr_28px] items-start gap-2 px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors"
    >
      <!-- Label pill -->
      <div class="flex items-center h-7">
        <span
          class="inline-block text-[11px] font-semibold text-surface-500 dark:text-surface-400 truncate leading-none"
        >
          {def?.label ?? prop.key}
        </span>
      </div>

      <!-- Value editor -->
      <div class="min-w-0">
        {#if def?.type === "array"}
          {@const arr = getArray(prop.key)}

          {#if def.itemType === "enum" && def.itemEnumValues}
            <!-- ── Enum array: toggleable pill checkboxes ─────────────────── -->
            <div class="flex flex-wrap gap-1 py-0.5">
              {#each def.itemEnumValues as val}
                {@const checked = arr.includes(val)}
                <button
                  type="button"
                  onclick={() => {
                    const next = checked
                      ? arr.filter((v) => v !== val)
                      : [...arr, val];
                    commitArrayChange(prop.key, next);
                  }}
                  class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors leading-none
                    {checked
                    ? 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-surface-900 text-surface-400 dark:text-surface-500 border-surface-300 dark:border-surface-600 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400'}"
                  aria-pressed={checked}
                >
                  {#if checked}
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="shrink-0"
                    >
                      <polyline points="1,4 3,6 7,2" />
                    </svg>
                  {:else}
                    <span
                      class="w-2 h-2 flex items-center justify-center shrink-0 text-surface-300 dark:text-surface-600 leading-none text-base"
                      aria-hidden="true">·</span
                    >
                  {/if}
                  {val}
                </button>
              {/each}
            </div>
          {:else}
            <!-- ── Free-text array: chips + adder ─────────────────────────── -->
            <div class="flex flex-col gap-1.5">
              <div class="flex flex-wrap gap-1 min-h-[26px] items-center">
                {#if arr.length === 0}
                  <span
                    class="text-[11px] text-surface-400 dark:text-surface-500 italic"
                    >No values yet…</span
                  >
                {:else}
                  {#each arr as item, i}
                    {@const chipInvalid =
                      !!def.validationRegex &&
                      !new RegExp(def.validationRegex).test(item)}
                    <span
                      title={chipInvalid
                        ? `Does not match: ${def.validationRegex}`
                        : undefined}
                      class="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-full leading-none border
                        {chipInvalid
                        ? 'bg-error-50 dark:bg-error-950 text-error-700 dark:text-error-300 border-error-300 dark:border-error-700'
                        : 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800'}"
                    >
                      {#if chipInvalid}
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          class="shrink-0"
                          aria-hidden="true"
                        >
                          <line x1="5" y1="2" x2="5" y2="5.5" /><circle
                            cx="5"
                            cy="7.5"
                            r="0.5"
                            fill="currentColor"
                            stroke="none"
                          />
                        </svg>
                      {/if}
                      {item}
                      <button
                        type="button"
                        onclick={() => removeArrayItem(prop.key, i)}
                        class="w-3.5 h-3.5 flex items-center justify-center rounded-full transition-colors leading-none
                          {chipInvalid
                          ? 'text-error-400 dark:text-error-600 hover:bg-error-100 dark:hover:bg-error-900 hover:text-error-600 dark:hover:text-error-400'
                          : 'text-primary-400 dark:text-primary-600 hover:bg-error-100 dark:hover:bg-error-900 hover:text-error-600 dark:hover:text-error-400'}"
                        aria-label="Remove {item}">×</button
                      >
                    </span>
                  {/each}
                {/if}
              </div>

              {#if arrayAddingKey === prop.key}
                {@const acKey = prop.key + ":array"}
                {@const arrRegexInvalid =
                  !!def.validationRegex &&
                  !!arrayNewValue[prop.key] &&
                  !new RegExp(def.validationRegex).test(
                    arrayNewValue[prop.key],
                  )}
                {@const suggestions = acSuggestions[acKey] ?? []}
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-1.5">
                    <div class="relative flex-1 min-w-0">
                      <input
                        type={def.itemType === "number" ? "number" : "text"}
                        bind:value={arrayNewValue[prop.key]}
                        placeholder={def.placeholder ?? "Value…"}
                        oninput={() => {
                          if (def.autocomplete && def.itemType !== "number") fetchSuggestions(acKey, arrayNewValue[prop.key], def);
                        }}
                        onfocus={() => {
                          if (def.autocomplete && def.itemType !== "number") fetchSuggestions(acKey, arrayNewValue[prop.key] ?? "", def);
                        }}
                        onblur={() => acBlur(acKey)}
                        onkeydown={(e) => {
                          acKeydown(e, acKey, (v) => { arrayNewValue = { ...arrayNewValue, [prop.key]: v }; });
                          if (!acOpen[acKey] || (acHighlight[acKey] ?? -1) < 0) {
                            if (e.key === "Enter" && !arrRegexInvalid) addArrayItem(prop.key);
                          }
                        }}
                        class="{inputClass} {arrRegexInvalid
                          ? '!border-error-400 dark:!border-error-600 focus:!ring-error-400'
                          : ''}"
                      />
                      {#if acOpen[acKey] && suggestions.length > 0}
                        {@render acDropdown(acKey, suggestions, (v) => { arrayNewValue = { ...arrayNewValue, [prop.key]: v }; })}
                      {/if}
                    </div>
                    <button
                      type="button"
                      onclick={() => addArrayItem(prop.key)}
                      disabled={arrRegexInvalid}
                      class="{btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed"
                      >Add</button
                    >
                    <button
                      type="button"
                      onclick={() => (arrayAddingKey = null)}
                      class={btnGhost}>✕</button
                    >
                  </div>
                  {#if arrRegexInvalid}
                    <span
                      class="text-[10px] text-error-500 dark:text-error-400 px-0.5 leading-tight"
                    >
                      Must match <code
                        class="font-mono bg-error-100 dark:bg-error-900 px-0.5 rounded"
                        >{def.validationRegex}</code
                      >
                    </span>
                  {/if}
                </div>
              {:else}
                <button
                  type="button"
                  onclick={() => openArrayAdder(prop.key, def)}
                  class="self-start text-[11px] font-medium text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
                >
                  <span class="text-sm leading-none">+</span> Add value
                </button>
              {/if}
            </div>
          {/if}
        {:else if def?.type === "boolean"}
          <select
            bind:value={inputMirrors[prop.key]}
            onchange={() => commitValue(prop.key, inputMirrors[prop.key])}
            class={inputClass}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        {:else if def?.type === "enum" && def.enumValues}
          <select
            bind:value={inputMirrors[prop.key]}
            onchange={() => commitValue(prop.key, inputMirrors[prop.key])}
            class={inputClass}
          >
            <option value="" disabled>Select…</option>
            {#each def.enumValues as val}
              <option value={val}>{val}</option>
            {/each}
          </select>
        {:else if def?.type === "date"}
          <DateTimeInput
            value={(prop.value as string | null) ?? null}
            onchange={(v) => commitValue(prop.key, v)}
            {inputClass}
          />
        {:else}
          {@const regexInvalid =
            !!def?.validationRegex &&
            !!inputMirrors[prop.key] &&
            !new RegExp(def.validationRegex).test(inputMirrors[prop.key])}
          {@const acKey = prop.key}
          {@const suggestions = acSuggestions[acKey] ?? []}
          <div class="flex flex-col gap-0.5">
            <div class="relative">
              <input
                type={def?.type === "number" ? "number" : "text"}
                bind:value={inputMirrors[prop.key]}
                oninput={() => {
                  commitValue(prop.key, inputMirrors[prop.key]);
                  if (def?.autocomplete && def.type === "string") fetchSuggestions(acKey, inputMirrors[prop.key], def);
                }}
                onfocus={() => {
                  if (def?.autocomplete && def?.type === "string") fetchSuggestions(acKey, inputMirrors[prop.key] ?? "", def);
                }}
                onblur={() => acBlur(acKey)}
                onkeydown={(e) => acKeydown(e, acKey, (v) => { inputMirrors[prop.key] = v; commitValue(prop.key, v); })}
                placeholder={def?.placeholder ?? ""}
                class="{inputClass} {regexInvalid ? '!border-error-400 dark:!border-error-600 focus:!ring-error-400' : ''}"
              />
              {#if acOpen[acKey] && suggestions.length > 0}
                {@render acDropdown(acKey, suggestions, (v) => { inputMirrors[prop.key] = v; commitValue(prop.key, v); })}
              {/if}
            </div>
            {#if regexInvalid}
              <span
                class="text-[10px] text-error-500 dark:text-error-400 px-0.5 leading-tight"
              >
                Must match <code
                  class="font-mono bg-error-100 dark:bg-error-900 px-0.5 rounded"
                  >{def?.validationRegex}</code
                >
              </span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Reset button -->
      <div class="flex items-center h-7">
        <button
          type="button"
          onclick={() => resetProperty(prop.key)}
          class="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-600 dark:hover:text-surface-300 text-sm"
          title="Reset to default"
          aria-label="Reset filter">
          <svg width="11" height="11" viewBox="-1 -1 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.5 2.5A5 5 0 1 0 11 6"/>
            <polyline points="8,0.5 11,2.5 8.5,5.5"/>
          </svg>
        </button>
      </div>
    </div>
  {/each}
</div>

{#snippet acDropdown(acKey: string, suggestions: AutocompleteSuggestion[], onSelect: (v: string) => void)}
  <ul
    class="absolute z-20 left-0 right-0 top-full mt-0.5 max-h-40 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg py-0.5 text-xs"
    role="listbox"
  >
    {#each suggestions as suggestion, i}
      <li
        role="option"
        aria-selected={acHighlight[acKey] === i}
        class="px-3 py-1.5 cursor-pointer truncate transition-colors
          {acHighlight[acKey] === i
            ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'}"
        onmousedown={(e) => { e.preventDefault(); acSelect(acKey, suggestion, onSelect); }}
      >{acSuggestionLabel(suggestion)}</li>
    {/each}
    {#if acLoading[acKey]}
      <li class="px-3 py-1.5 text-surface-400 dark:text-surface-500 italic">Loading…</li>
    {/if}
  </ul>
{/snippet}
