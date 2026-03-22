<script lang="ts">
  import type { Rule, PayloadTestResult } from "./types.js";

  interface Props {
    rules: Rule[];
    testPayload?: (
      payload: Record<string, unknown>,
      rules: Rule[],
    ) => PayloadTestResult;
  }

  let { rules, testPayload }: Props = $props();

  let payloadText = $state('{\n  "user": "alice",\n  "role": "admin"\n}');
  let parseError = $state<string | null>(null);
  let result = $state<PayloadTestResult | null>(null);

  function runTest() {
    parseError = null;
    result = null;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      parseError = "Invalid JSON: " + (e as Error).message;
      return;
    }
    if (testPayload) {
      result = testPayload(payload, rules);
    }
  }

  const matchedRule = $derived(
    result?.matchedRuleId != null
      ? rules.find((r) => r.id === result!.matchedRuleId)
      : null,
  );
</script>

<div class="space-y-3">
  <div class="relative">
    <textarea
      bind:value={payloadText}
      rows={6}
      spellcheck={false}
      class="w-full font-mono text-xs rounded-xl border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 p-3 focus:outline-none focus:border-primary-500 resize-y"
      placeholder="&#123; &quot;field&quot;: &quot;value&quot; &#125;"
    ></textarea>
    {#if parseError}
      <p class="text-xs text-error-500 dark:text-error-400 mt-1">
        {parseError}
      </p>
    {/if}
  </div>

  <button
    type="button"
    onclick={runTest}
    disabled={!testPayload}
    class="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm px-4 py-2 rounded-xl"
  >
    Test Payload
  </button>

  {#if !testPayload}
    <p class="text-xs text-surface-400 dark:text-surface-500 italic">
      Provide a <code class="bg-surface-200 dark:bg-surface-700 px-1 rounded"
        >testPayload</code
      > function to enable testing.
    </p>
  {/if}

  {#if result}
    <div
      class="rounded-xl border p-3 text-sm {result.matched
        ? matchedRule?.action === 'ALLOW'
          ? 'border-success-400 bg-success-50 dark:bg-success-950 dark:border-success-700'
          : 'border-error-400 bg-error-50 dark:bg-error-950 dark:border-error-700'
        : 'border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900'}"
    >
      {#if result.matched && matchedRule}
        <div class="flex items-center gap-2 font-semibold mb-1">
          <span
            class="inline-block w-2 h-2 rounded-full {matchedRule.action ===
            'ALLOW'
              ? 'bg-success-500'
              : 'bg-error-500'}"
          ></span>
          <span
            class={matchedRule.action === "ALLOW"
              ? "text-success-700 dark:text-success-300"
              : "text-error-700 dark:text-error-300"}
          >
            {matchedRule.action === "ALLOW" ? "✓ Allowed" : "✕ Denied"}
          </span>
          <span
            class="font-normal text-surface-500 dark:text-surface-400 text-xs"
          >
            by rule #{(result.matchedRuleIndex ?? 0) + 1} — "{matchedRule.name}"
          </span>
        </div>
        {#if matchedRule.filters.length > 0}
          <div class="mt-2 space-y-1">
            {#each matchedRule.filters as prop}
              <div
                class="flex gap-2 text-xs text-surface-600 dark:text-surface-400"
              >
                <span class="font-medium">{prop.key}:</span>
                <span
                  >{Array.isArray(prop.value)
                    ? prop.value.join(", ")
                    : String(prop.value)}</span
                >
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div
          class="flex items-center gap-2 text-surface-500 dark:text-surface-400"
        >
          <span class="inline-block w-2 h-2 rounded-full bg-surface-400"></span>
          No rule matched this payload.
        </div>
      {/if}
    </div>
  {/if}
</div>
