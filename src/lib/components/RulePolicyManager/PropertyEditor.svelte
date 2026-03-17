<script lang="ts">
  import type { PropertyDefinition, RuleProperty } from "./types.js";

  interface Props {
    propertyDefinitions: PropertyDefinition[];
    properties: RuleProperty[];
    onPropertiesChange: (properties: RuleProperty[]) => void;
  }

  let { propertyDefinitions, properties, onPropertiesChange }: Props = $props();

  let addingKey = $state<string | null>(null);

  // Mutable string mirror used for bind:value on each property input
  // Keyed by property key. Updated reactively from properties prop.
  let inputMirrors = $state<Record<string, string>>({});

  $effect(() => {
    const next: Record<string, string> = {};
    for (const p of properties) {
      // Only initialise if not already present (avoids clobbering mid-edit)
      next[p.key] = String(p.value);
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

  function removeProperty(key: string) {
    onPropertiesChange(properties.filter((p) => p.key !== key));
  }

  const definedKeys = $derived(properties.map((p) => p.key));
  const availableToAdd = $derived(
    propertyDefinitions.filter((d) => !definedKeys.includes(d.key))
  );
</script>

<div class="space-y-2 pt-2">
  {#each properties as prop (prop.key)}
    {@const def = propertyDefinitions.find((d) => d.key === prop.key)}
    <div class="flex items-center gap-2 group">
      <span
        class="text-xs font-semibold text-surface-500 dark:text-surface-400 min-w-[90px] shrink-0"
      >
        {def?.label ?? prop.key}
      </span>

      {#if def?.type === "boolean"}
        <select
          bind:value={inputMirrors[prop.key]}
          onchange={() => commitValue(prop.key, inputMirrors[prop.key])}
          class="flex-1 text-xs rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      {:else if def?.type === "enum" && def.enumValues}
        <select
          bind:value={inputMirrors[prop.key]}
          onchange={() => commitValue(prop.key, inputMirrors[prop.key])}
          class="flex-1 text-xs rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          <option value="" disabled>Select…</option>
          {#each def.enumValues as val}
            <option value={val}>{val}</option>
          {/each}
        </select>
      {:else}
        <input
          type={def?.type === "number" ? "number" : def?.type === "date" ? "date" : "text"}
          bind:value={inputMirrors[prop.key]}
          oninput={() => commitValue(prop.key, inputMirrors[prop.key])}
          placeholder={def?.placeholder ?? ""}
          class="flex-1 text-xs rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 px-2 py-1 focus:outline-none focus:border-primary-500"
        />
      {/if}

      <button
        type="button"
        onclick={() => removeProperty(prop.key)}
        class="opacity-0 group-hover:opacity-100 transition-opacity text-surface-400 hover:text-error-500 dark:hover:text-error-400 text-xs w-5 h-5 flex items-center justify-center rounded"
        aria-label="Remove property"
      >
        ×
      </button>
    </div>
  {/each}

  {#if availableToAdd.length > 0}
    {#if addingKey === null}
      <button
        type="button"
        onclick={() => (addingKey = availableToAdd[0].key)}
        class="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors mt-1"
      >
        <span class="text-base leading-none">+</span> Add property
      </button>
    {:else}
      <div class="flex items-center gap-2 mt-1">
        <select
          bind:value={addingKey}
          class="text-xs rounded-lg border border-primary-400 dark:border-primary-600 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 px-2 py-1 focus:outline-none focus:border-primary-500"
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
              const defaultValue = def?.type === "boolean" ? false : def?.type === "number" ? 0 : "";
              commitValue(addingKey, String(defaultValue));
            }
            addingKey = null;
          }}
          class="text-xs px-2 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onclick={() => (addingKey = null)}
          class="text-xs px-2 py-1 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    {/if}
  {/if}
</div>
