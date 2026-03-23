<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import { RulePolicyManager } from "$lib/components/RulePolicyManager";
  import type {
    Rule,
    FilterDefinition,
    PayloadTestResult,
    RuleChangeSummary,
  } from "$lib/components/RulePolicyManager";
  import { setActiveModal } from "$lib/components/Modal/ModalStore.svelte";
  import SaveChangesModal from "$lib/components/RulePolicyManager/SaveChangesModal.svelte";

  // Filter definitions for the demo
  const filtersDefinitions: FilterDefinition[] = [
    {
      key: "role",
      label: "Role",
      type: "enum",
      enumValues: ["admin", "editor", "viewer", "guest"],
    },
    {
      key: "department",
      label: "Department",
      type: "enum",
      enumValues: ["engineering", "marketing", "finance", "hr", "legal"],
    },
    {
      key: "minAge",
      label: "Min Age",
      type: "number",
      placeholder: "e.g. 18",
    },
    {
      key: "maxAge",
      label: "Max Age",
      type: "number",
      placeholder: "e.g. 65",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      placeholder: "e.g. US",
      validationRegex: "^[A-Z]{2}$",
    },
    {
      key: "verified",
      label: "Verified",
      type: "boolean",
    },
    {
      key: "subscriptionLevel",
      label: "Subscription",
      type: "enum",
      enumValues: ["free", "pro", "enterprise"],
    },
    {
      key: "createdBefore",
      label: "Created Before",
      type: "date",
    },
    {
      key: "allowedRoles",
      label: "Allowed Roles",
      type: "array",
      itemType: "enum",
      itemEnumValues: ["admin", "editor", "viewer", "guest"],
    },
    {
      key: "allowedCountries",
      label: "Allowed Countries",
      type: "array",
      itemType: "string",
      placeholder: "e.g. US",
      validationRegex: "^[A-Z]{2}$",
    },
  ];

  // Initial rules
  let rules = $state<Rule[]>([
    {
      id: "rule-1",
      name: "Allow Admins",
      action: "ALLOW",
      enabled: true,
      filters: [{ key: "role", value: "admin" }],
      metadata: {
        createdBy: "alice",
        updatedBy: "alice",
        createdAt: "2025-11-01T09:00:00Z",
        updatedAt: "2026-01-15T14:32:00Z",
      },
    },
    {
      id: "rule-2",
      name: "Deny Guests",
      action: "DENY",
      enabled: true,
      filters: [
        { key: "role", value: "guest" },
        { key: "verified", value: false },
      ],
      metadata: {
        createdBy: "bob",
        updatedBy: "alice",
        createdAt: "2025-12-03T11:20:00Z",
        updatedAt: "2026-02-10T08:45:00Z",
      },
    },
    {
      id: "rule-3",
      name: "Allow Pro Editors",
      action: "ALLOW",
      enabled: false,
      filters: [
        { key: "role", value: "editor" },
        { key: "subscriptionLevel", value: "pro" },
      ],
      metadata: {
        createdBy: "carol",
        createdAt: "2026-01-20T16:00:00Z",
      },
    },
    {
      id: "rule-4",
      name: "Allow Privileged Roles",
      action: "ALLOW",
      enabled: true,
      filters: [
        { key: "allowedRoles", value: ["admin", "editor"] },
        { key: "verified", value: true },
      ],
    },
    {
      id: "rule-5",
      name: "Geo-restricted Access",
      action: "ALLOW",
      enabled: true,
      filters: [
        { key: "allowedCountries", value: ["US", "GB", "fr"] },
      ],
    },
  ]);

  // Payload tester
  function testPayload(
    payload: Record<string, unknown>,
    activeRules: Rule[],
  ): PayloadTestResult {
    for (let i = 0; i < activeRules.length; i++) {
      const rule = activeRules[i];
      if (!rule.enabled) continue;

      // A rule matches when ALL its defined properties match the payload.
      const matches = rule.filters.every((prop) => {
        const payloadValue = payload[prop.key];
        // Array (anyOf): payload value must be one of the listed items
        if (Array.isArray(prop.value)) {
          return prop.value.includes(String(payloadValue));
        }
        // Coerce number properties
        if (typeof prop.value === "number") {
          return Number(payloadValue) === prop.value;
        }
        if (typeof prop.value === "boolean") {
          return String(payloadValue) === String(prop.value);
        }
        return String(payloadValue) === String(prop.value);
      });

      if (matches) {
        return { matched: true, matchedRuleId: rule.id, matchedRuleIndex: i };
      }
    }
    return { matched: false, matchedRuleId: null, matchedRuleIndex: null };
  }

  // Change log
  let changeLog = $state<string[]>([]);

  function handleRulesChange(updated: Rule[]) {
    const entry = `[${new Date().toLocaleTimeString()}] Rules updated — ${updated.length} rule(s)`;
    changeLog = [entry, ...changeLog].slice(0, 10);
  }

  // Dirty / Save
  let isDirty = $state(false);

  function handleSave(
    savedRules: Rule[],
    summary: RuleChangeSummary,
    commit: () => void,
  ) {
    setActiveModal({
      modal: SaveChangesModal,
      props: {
        summary,
        filtersDefinitions,
        onConfirm: () => {
          commit();
        },
        onCancel: () => {},
      },
    });
  }

  // Navigation guard
  beforeNavigate(({ cancel }) => {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Leave this page?")) {
        cancel();
      }
    }
  });

  $effect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });
</script>

<svelte:head>
  <title>Rule Policy Manager Demo</title>
</svelte:head>

<div
  class="container h-full mx-auto flex justify-center items-start overflow-y-auto"
>
  <div class="space-y-8 w-full max-w-4xl p-8">
    <header class="text-center space-y-4">
      <h1 class="text-4xl font-bold">Rule Policy Manager</h1>
      <p class="text-xl text-surface-600 dark:text-surface-400">
        Create, organize, and test rule-based access policies
      </p>
    </header>

    <!-- Main component -->
    <section>
      <RulePolicyManager
        bind:rules
        bind:isDirty
        filtersDefinitions={filtersDefinitions}
        {testPayload}
        onRulesChange={handleRulesChange}
        onSave={handleSave}
      />
    </section>

    <!-- How it works -->
    <section
      class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
    >
      <header>
        <h2 class="text-xl font-bold">How it works</h2>
      </header>
      <ul
        class="list-disc list-inside space-y-1 text-sm text-surface-700 dark:text-surface-300"
      >
        <li>
          <strong>Drag</strong> the ⠿ handle to reorder rules — priority is top-to-bottom
        </li>
        <li>
          <strong>Click the mode badge</strong> (✓ ALLOW / ✕ DENY) to toggle between
          modes
        </li>
        <li>
          <strong>Toggle the switch</strong> to enable or disable a rule without
          deleting it
        </li>
        <li>
          <strong>Expand a rule</strong> with the chevron to edit its property conditions
        </li>
        <li>
          Open the <strong>Test Payload</strong> tab and enter a JSON object to see
          which rule fires first
        </li>
      </ul>
    </section>

    <!-- Live rule JSON -->
    <section
      class="card p-6 space-y-3 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
    >
      <header>
        <h2 class="text-xl font-bold">Live Rule State</h2>
      </header>
      <pre
        class="text-xs bg-surface-100 dark:bg-surface-800 rounded-xl p-4 overflow-x-auto text-surface-800 dark:text-surface-200 font-mono">{JSON.stringify(
          rules,
          null,
          2,
        )}</pre>
    </section>

    <!-- Change log -->
    {#if changeLog.length > 0}
      <section
        class="card p-6 space-y-3 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
      >
        <header>
          <h2 class="text-xl font-bold">Change Log</h2>
        </header>
        <ul
          class="text-xs space-y-1 font-mono text-surface-600 dark:text-surface-400"
        >
          {#each changeLog as entry}
            <li>{entry}</li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>
