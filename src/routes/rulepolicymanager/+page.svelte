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

  // ISO 3166-1 alpha-2 country codes with names used for autocomplete
  const COUNTRIES: { code: string; name: string }[] = [
    { code: "AD", name: "Andorra" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "AF", name: "Afghanistan" },
    { code: "AG", name: "Antigua and Barbuda" },
    { code: "AL", name: "Albania" },
    { code: "AM", name: "Armenia" },
    { code: "AO", name: "Angola" },
    { code: "AR", name: "Argentina" },
    { code: "AT", name: "Austria" },
    { code: "AU", name: "Australia" },
    { code: "AZ", name: "Azerbaijan" },
    { code: "BA", name: "Bosnia and Herzegovina" },
    { code: "BB", name: "Barbados" },
    { code: "BD", name: "Bangladesh" },
    { code: "BE", name: "Belgium" },
    { code: "BF", name: "Burkina Faso" },
    { code: "BG", name: "Bulgaria" },
    { code: "BH", name: "Bahrain" },
    { code: "BI", name: "Burundi" },
    { code: "BJ", name: "Benin" },
    { code: "BN", name: "Brunei" },
    { code: "BO", name: "Bolivia" },
    { code: "BR", name: "Brazil" },
    { code: "BS", name: "Bahamas" },
    { code: "BT", name: "Bhutan" },
    { code: "BW", name: "Botswana" },
    { code: "BY", name: "Belarus" },
    { code: "BZ", name: "Belize" },
    { code: "CA", name: "Canada" },
    { code: "CD", name: "Congo (DRC)" },
    { code: "CF", name: "Central African Republic" },
    { code: "CG", name: "Congo" },
    { code: "CH", name: "Switzerland" },
    { code: "CI", name: "Côte d'Ivoire" },
    { code: "CL", name: "Chile" },
    { code: "CM", name: "Cameroon" },
    { code: "CN", name: "China" },
    { code: "CO", name: "Colombia" },
    { code: "CR", name: "Costa Rica" },
    { code: "CU", name: "Cuba" },
    { code: "CV", name: "Cape Verde" },
    { code: "CY", name: "Cyprus" },
    { code: "CZ", name: "Czech Republic" },
    { code: "DE", name: "Germany" },
    { code: "DJ", name: "Djibouti" },
    { code: "DK", name: "Denmark" },
    { code: "DM", name: "Dominica" },
    { code: "DO", name: "Dominican Republic" },
    { code: "DZ", name: "Algeria" },
    { code: "EC", name: "Ecuador" },
    { code: "EE", name: "Estonia" },
    { code: "EG", name: "Egypt" },
    { code: "ER", name: "Eritrea" },
    { code: "ES", name: "Spain" },
    { code: "ET", name: "Ethiopia" },
    { code: "FI", name: "Finland" },
    { code: "FJ", name: "Fiji" },
    { code: "FM", name: "Micronesia" },
    { code: "FR", name: "France" },
    { code: "GA", name: "Gabon" },
    { code: "GB", name: "United Kingdom" },
    { code: "GD", name: "Grenada" },
    { code: "GE", name: "Georgia" },
    { code: "GH", name: "Ghana" },
    { code: "GM", name: "Gambia" },
    { code: "GN", name: "Guinea" },
    { code: "GQ", name: "Equatorial Guinea" },
    { code: "GR", name: "Greece" },
    { code: "GT", name: "Guatemala" },
    { code: "GW", name: "Guinea-Bissau" },
    { code: "GY", name: "Guyana" },
    { code: "HN", name: "Honduras" },
    { code: "HR", name: "Croatia" },
    { code: "HT", name: "Haiti" },
    { code: "HU", name: "Hungary" },
    { code: "ID", name: "Indonesia" },
    { code: "IE", name: "Ireland" },
    { code: "IL", name: "Israel" },
    { code: "IN", name: "India" },
    { code: "IQ", name: "Iraq" },
    { code: "IR", name: "Iran" },
    { code: "IS", name: "Iceland" },
    { code: "IT", name: "Italy" },
    { code: "JM", name: "Jamaica" },
    { code: "JO", name: "Jordan" },
    { code: "JP", name: "Japan" },
    { code: "KE", name: "Kenya" },
    { code: "KG", name: "Kyrgyzstan" },
    { code: "KH", name: "Cambodia" },
    { code: "KI", name: "Kiribati" },
    { code: "KM", name: "Comoros" },
    { code: "KN", name: "Saint Kitts and Nevis" },
    { code: "KP", name: "North Korea" },
    { code: "KR", name: "South Korea" },
    { code: "KW", name: "Kuwait" },
    { code: "KZ", name: "Kazakhstan" },
    { code: "LA", name: "Laos" },
    { code: "LB", name: "Lebanon" },
    { code: "LC", name: "Saint Lucia" },
    { code: "LI", name: "Liechtenstein" },
    { code: "LK", name: "Sri Lanka" },
    { code: "LR", name: "Liberia" },
    { code: "LS", name: "Lesotho" },
    { code: "LT", name: "Lithuania" },
    { code: "LU", name: "Luxembourg" },
    { code: "LV", name: "Latvia" },
    { code: "LY", name: "Libya" },
    { code: "MA", name: "Morocco" },
    { code: "MC", name: "Monaco" },
    { code: "MD", name: "Moldova" },
    { code: "ME", name: "Montenegro" },
    { code: "MG", name: "Madagascar" },
    { code: "MH", name: "Marshall Islands" },
    { code: "MK", name: "North Macedonia" },
    { code: "ML", name: "Mali" },
    { code: "MM", name: "Myanmar" },
    { code: "MN", name: "Mongolia" },
    { code: "MR", name: "Mauritania" },
    { code: "MT", name: "Malta" },
    { code: "MU", name: "Mauritius" },
    { code: "MV", name: "Maldives" },
    { code: "MW", name: "Malawi" },
    { code: "MX", name: "Mexico" },
    { code: "MY", name: "Malaysia" },
    { code: "MZ", name: "Mozambique" },
    { code: "NA", name: "Namibia" },
    { code: "NE", name: "Niger" },
    { code: "NG", name: "Nigeria" },
    { code: "NI", name: "Nicaragua" },
    { code: "NL", name: "Netherlands" },
    { code: "NO", name: "Norway" },
    { code: "NP", name: "Nepal" },
    { code: "NR", name: "Nauru" },
    { code: "NZ", name: "New Zealand" },
    { code: "OM", name: "Oman" },
    { code: "PA", name: "Panama" },
    { code: "PE", name: "Peru" },
    { code: "PG", name: "Papua New Guinea" },
    { code: "PH", name: "Philippines" },
    { code: "PK", name: "Pakistan" },
    { code: "PL", name: "Poland" },
    { code: "PT", name: "Portugal" },
    { code: "PW", name: "Palau" },
    { code: "PY", name: "Paraguay" },
    { code: "QA", name: "Qatar" },
    { code: "RO", name: "Romania" },
    { code: "RS", name: "Serbia" },
    { code: "RU", name: "Russia" },
    { code: "RW", name: "Rwanda" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "SB", name: "Solomon Islands" },
    { code: "SC", name: "Seychelles" },
    { code: "SD", name: "Sudan" },
    { code: "SE", name: "Sweden" },
    { code: "SG", name: "Singapore" },
    { code: "SI", name: "Slovenia" },
    { code: "SK", name: "Slovakia" },
    { code: "SL", name: "Sierra Leone" },
    { code: "SM", name: "San Marino" },
    { code: "SN", name: "Senegal" },
    { code: "SO", name: "Somalia" },
    { code: "SR", name: "Suriname" },
    { code: "SS", name: "South Sudan" },
    { code: "ST", name: "São Tomé and Príncipe" },
    { code: "SV", name: "El Salvador" },
    { code: "SY", name: "Syria" },
    { code: "SZ", name: "Eswatini" },
    { code: "TD", name: "Chad" },
    { code: "TG", name: "Togo" },
    { code: "TH", name: "Thailand" },
    { code: "TJ", name: "Tajikistan" },
    { code: "TL", name: "Timor-Leste" },
    { code: "TM", name: "Turkmenistan" },
    { code: "TN", name: "Tunisia" },
    { code: "TO", name: "Tonga" },
    { code: "TR", name: "Turkey" },
    { code: "TT", name: "Trinidad and Tobago" },
    { code: "TV", name: "Tuvalu" },
    { code: "TZ", name: "Tanzania" },
    { code: "UA", name: "Ukraine" },
    { code: "UG", name: "Uganda" },
    { code: "US", name: "United States" },
    { code: "UY", name: "Uruguay" },
    { code: "UZ", name: "Uzbekistan" },
    { code: "VA", name: "Vatican City" },
    { code: "VC", name: "Saint Vincent and the Grenadines" },
    { code: "VE", name: "Venezuela" },
    { code: "VN", name: "Vietnam" },
    { code: "VU", name: "Vanuatu" },
    { code: "WS", name: "Samoa" },
    { code: "YE", name: "Yemen" },
    { code: "ZA", name: "South Africa" },
    { code: "ZM", name: "Zambia" },
    { code: "ZW", name: "Zimbabwe" },
  ];

  function autocompleteCountry(query: string): { label: string; value: string }[] {
    if (!query) return [];
    const q = query.toUpperCase();
    return COUNTRIES.filter(
      (c) => c.code.startsWith(q) || c.name.toUpperCase().includes(q)
    )
      .slice(0, 8)
      .map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code }));
  }

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
      autocomplete: autocompleteCountry,
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
      autocomplete: autocompleteCountry,
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
      filters: [{ key: "allowedCountries", value: ["US", "GB", "fr"] }],
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
        {filtersDefinitions}
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
