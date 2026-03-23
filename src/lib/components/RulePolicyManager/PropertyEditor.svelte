<script lang="ts">
  import type { PropertyDefinition, RuleProperty } from "./types.js";
  import DateTimeInput from "./DateTimeInput.svelte";

  interface Props {
    propertyDefinitions: PropertyDefinition[];
    filters: RuleProperty[];
    onFiltersChange: (filters: RuleProperty[]) => void;
  }

  let {
    propertyDefinitions,
    filters: properties,
    onFiltersChange: onPropertiesChange,
  }: Props = $props();

  let addingKey = $state<string | null>(null);

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

  function commitValue(key: string, rawValue: string) {
    const def = propertyDefinitions.find((d) => d.key === key);
    let value: string | number | boolean = rawValue;
    if (def?.type === "number") value = rawValue === "" ? 0 : Number(rawValue);
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

  function openArrayAdder(key: string, def: PropertyDefinition) {
    arrayAddingKey = key;
    arrayNewValue = { ...arrayNewValue, [key]: "" };
  }

  // shared
  function removeProperty(key: string) {
    onPropertiesChange(properties.filter((p) => p.key !== key));
  }

  const definedKeys = $derived(properties.map((p) => p.key));
  const availableToAdd = $derived(
    propertyDefinitions.filter((d) => !definedKeys.includes(d.key)),
  );

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
                    <span
                      class="inline-flex items-center gap-1 text-[11px] font-medium bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 pl-2 pr-1 py-0.5 rounded-full leading-none"
                    >
                      {item}
                      <button
                        type="button"
                        onclick={() => removeArrayItem(prop.key, i)}
                        class="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-error-100 dark:hover:bg-error-900 hover:text-error-600 dark:hover:text-error-400 transition-colors leading-none text-primary-400 dark:text-primary-600"
                        aria-label="Remove {item}">×</button
                      >
                    </span>
                  {/each}
                {/if}
              </div>

              {#if arrayAddingKey === prop.key}
                <div class="flex items-center gap-1.5">
                  <input
                    type={def.itemType === "number" ? "number" : "text"}
                    bind:value={arrayNewValue[prop.key]}
                    placeholder={def.placeholder ?? "Value…"}
                    onkeydown={(e) =>
                      e.key === "Enter" && addArrayItem(prop.key)}
                    class={inputClass}
                  />
                  <button
                    type="button"
                    onclick={() => addArrayItem(prop.key)}
                    class={btnPrimary}>Add</button
                  >
                  <button
                    type="button"
                    onclick={() => (arrayAddingKey = null)}
                    class={btnGhost}>✕</button
                  >
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
            value={inputMirrors[prop.key] ?? ""}
            onchange={(v) => commitValue(prop.key, v)}
            {inputClass}
          />
        {:else}
          <input
            type={def?.type === "number" ? "number" : "text"}
            bind:value={inputMirrors[prop.key]}
            oninput={() => commitValue(prop.key, inputMirrors[prop.key])}
            placeholder={def?.placeholder ?? ""}
            class={inputClass}
          />
        {/if}
      </div>

      <!-- Remove button -->
      <div class="flex items-center h-7">
        <button
          type="button"
          onclick={() => removeProperty(prop.key)}
          class="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md text-surface-400 dark:text-surface-500 hover:bg-error-100 dark:hover:bg-error-950 hover:text-error-500 dark:hover:text-error-400 text-sm"
          aria-label="Remove filter">×</button
        >
      </div>
    </div>
  {/each}

  <!-- ── Divider when there are properties ──────────────────────────────── -->
  {#if properties.length > 0 && availableToAdd.length > 0}
    <div
      class="border-t border-surface-200 dark:border-surface-700 mx-3 my-1"
    ></div>
  {/if}

  <!-- ── Add property ────────────────────────────────────────────────────── -->
  {#if availableToAdd.length > 0}
    {#if addingKey === null}
      <div class="px-3 py-1">
        <button
          type="button"
          onclick={() => (addingKey = availableToAdd[0].key)}
          class="flex items-center gap-1.5 text-xs font-medium text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          <span
            class="w-4 h-4 flex items-center justify-center rounded bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-sm font-bold leading-none"
            >+</span
          >
          Add filter
        </button>
      </div>
    {:else}
      <div
        class="grid grid-cols-[112px_1fr_auto_auto] items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 mx-0"
      >
        <span
          class="text-[11px] font-semibold text-primary-600 dark:text-primary-400"
          >Filter</span
        >
        <select
          bind:value={addingKey}
          class="text-xs rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
        >
          {#each availableToAdd as def}
            <option value={def.key}>{def.label ?? def.key}</option>
          {/each}
        </select>
        <button
          type="button"
          onclick={() => {
            if (addingKey) {
              const def = propertyDefinitions.find((d) => d.key === addingKey);
              if (def?.type === "array") {
                commitArrayChange(addingKey, []);
              } else {
                const defaultValue =
                  def?.type === "boolean"
                    ? false
                    : def?.type === "number"
                      ? 0
                      : "";
                commitValue(addingKey, String(defaultValue));
              }
            }
            addingKey = null;
          }}
          class={btnPrimary}>Add</button
        >
        <button
          type="button"
          onclick={() => (addingKey = null)}
          class={btnGhost}>✕</button
        >
      </div>
    {/if}
  {/if}
</div>
