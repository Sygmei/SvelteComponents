<script lang="ts">
  import { FilterInputBox } from "$lib/components/FilterInputBox";
  import type { Filter, FieldDefinition } from "$lib/components/FilterInputBox";

  // Component reference
  let filterInputBox: FilterInputBox;

  let currentFilters = $state<Filter[]>([]);

  // Example using FieldDefinition objects with built-in type-aware comparators
  const advancedFields: FieldDefinition[] = [
    {
      name: "name",
      type: "string",
      label: "Full Name",
      comparators: ["==", "!=", "contains", "startsWith", "endsWith"],
    },
    {
      name: "email",
      type: "string",
      label: "Email Address",
      comparators: ["==", "!=", "contains", "endsWith"],
    },
    {
      name: "age",
      type: "number",
      label: "Age",
      comparators: ["==", "!=", ">", "<", ">=", "<="],
    },
    {
      name: "department",
      type: "enum",
      label: "Department",
      comparators: ["==", "!=", "in"],
      enumValues: ["engineering", "marketing", "sales", "hr", "finance"],
    },
    {
      name: "isActive",
      type: "boolean",
      label: "Is Active",
      comparators: ["==", "!="],
    },
  ];

  // Mock data generator for demo purposes
  async function customFetchValues(
    field: string,
    query: string
  ): Promise<string[]> {
    console.log("Fetching values for field:", field, "with query:", query);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const mockData: Record<string, string[]> = {
      name: [
        "john.doe",
        "jane.smith",
        "alice.johnson",
        "bob.wilson",
        "carol.brown",
        "david.clark",
        "emma.davis",
      ],
      email: [
        "john@example.com",
        "jane@company.co",
        "alice@test.org",
        "bob@demo.net",
        "carol@sample.com",
      ],
      age: ["18", "25", "30", "35", "40", "45", "50"],
      department: ["engineering", "marketing", "sales", "hr", "finance"],
      isActive: ["true", "false"],
    };

    return (mockData[field] || []).filter((value) =>
      value.toLowerCase().includes(query.toLowerCase())
    );
  }

  function handleFiltersChange(filters: Filter[]): void {
    console.log("📝 Filters changed:", filters);
    console.log(`Total filters: ${filters.length}`);
  }

  // Pre-configured filters for dynamic addition
  const preConfiguredFilters: Filter[] = [
    {
      id: Date.now() + 1,
      field: "name",
      comparator: "==" as const,
      value: "john.doe",
    },
    { id: Date.now() + 2, field: "age", comparator: ">" as const, value: "25" },
    {
      id: Date.now() + 3,
      field: "department",
      comparator: "==" as const,
      value: "engineering",
    },
    { id: Date.now() + 4, value: "urgent" }, // Value-only filter
  ];

  let currentPreConfigIndex = 0;

  function addPreConfiguredFilter(): void {
    const filterToAdd = preConfiguredFilters[currentPreConfigIndex];

    // Remove the 'id' property since the component will add it
    const { id, ...filterWithoutId } = filterToAdd;

    // Use the exposed method to add the filter
    filterInputBox.addFilterProgrammatically(filterWithoutId);

    // Cycle through pre-configured filters
    currentPreConfigIndex =
      (currentPreConfigIndex + 1) % preConfiguredFilters.length;
  }

  function isStandardFilter(filter: Filter): filter is {
    field: string;
    comparator: string;
    value: string;
    id: number;
  } {
    return "field" in filter && "comparator" in filter;
  }
</script>

<svelte:head>
  <title>Filter Input Box Demo - TypeScript</title>
</svelte:head>

<div class="container h-full mx-auto flex justify-center items-center">
  <div class="space-y-8 w-full max-w-5xl p-8">
    <header class="text-center space-y-4">
      <h1 class="text-4xl font-bold">Filter Input Box Demo</h1>
      <p class="text-xl text-surface-600 dark:text-surface-400">
        Advanced filtering with TypeScript support
      </p>
    </header>

    <section
      class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
    >
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">Try the Filter Input Box</h2>
        <p class="text-surface-600 dark:text-surface-400">
          Type to create filters like: <code
            class="bg-surface-200 dark:bg-surface-800 px-2 py-1 rounded-xl"
            >name == john</code
          >
          or
          <code class="bg-surface-200 dark:bg-surface-800 px-2 py-1 rounded-xl"
            >age > 25</code
          >
        </p>
        <p class="text-sm text-surface-600 dark:text-surface-400">
          Uses TypeScript with proper type definitions and field-aware
          comparators.
        </p>
      </header>

      <FilterInputBox
        bind:this={filterInputBox}
        fields={advancedFields}
        fetchValues={customFetchValues}
        bind:filters={currentFilters}
        onFiltersChange={handleFiltersChange}
      />

      <div
        class="flex items-center gap-4 pt-4 border-t border-surface-300 dark:border-surface-600"
      >
        <button
          onclick={addPreConfiguredFilter}
          class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors duration-150"
        >
          Add Pre-configured Filter
        </button>
        <span class="text-sm text-surface-600 dark:text-surface-400">
          Next: {preConfiguredFilters[currentPreConfigIndex].field
            ? `${preConfiguredFilters[currentPreConfigIndex].field} ${preConfiguredFilters[currentPreConfigIndex].comparator} ${preConfiguredFilters[currentPreConfigIndex].value}`
            : `"${preConfiguredFilters[currentPreConfigIndex].value}"`}
        </span>
      </div>
    </section>

    <section
      class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
    >
      <h3 class="text-xl font-bold">
        Current Filters ({currentFilters.length})
      </h3>
      {#if currentFilters.length === 0}
        <p class="text-surface-500 dark:text-surface-400 italic">
          No filters applied
        </p>
      {:else}
        <div class="space-y-2">
          {#each currentFilters as filter}
            <div
              class="bg-surface-100 dark:bg-surface-800 p-4 rounded-2xl flex items-center gap-3"
            >
              {#if isStandardFilter(filter)}
                <span class="chip bg-primary-500 text-white"
                  >{filter.field}</span
                >
                <span class="text-surface-600 dark:text-surface-400"
                  >{filter.comparator}</span
                >
                <span class="font-medium">{filter.value}</span>
                <span class="chip bg-tertiary-500 text-white text-xs ml-auto"
                  >Standard Filter</span
                >
              {:else}
                <span class="chip bg-secondary-500 text-white"
                  >{filter.value}</span
                >
                <span class="chip bg-tertiary-500 text-white text-xs ml-auto"
                  >Value-Only Filter</span
                >
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <div class="grid md:grid-cols-2 gap-6">
      <section
        class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
      >
        <h3 class="text-xl font-bold">TypeScript Features</h3>
        <ul class="space-y-2">
          <li class="flex items-center gap-2">
            <span class="chip bg-success-500 text-white text-sm">✓</span>
            <span>Strongly typed props and state</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="chip bg-success-500 text-white text-sm">✓</span>
            <span>Type-safe filter objects</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="chip bg-success-500 text-white text-sm">✓</span>
            <span
              >Field type definitions (string, number, enum, boolean, date)</span
            >
          </li>
          <li class="flex items-center gap-2">
            <span class="chip bg-success-500 text-white text-sm">✓</span>
            <span>Comparator validation per field type</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="chip bg-success-500 text-white text-sm">✓</span>
            <span>Mock data with proper typing</span>
          </li>
        </ul>
      </section>

      <section
        class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
      >
        <h3 class="text-xl font-bold">Field Types Demo</h3>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip bg-primary-500 text-white">name</span>
            <span
              class="chip bg-surface-300 dark:bg-surface-600 text-surface-900 dark:text-surface-100 text-sm"
              >string</span
            >
            <span class="text-xs text-surface-600 dark:text-surface-400"
              >contains, startsWith, endsWith</span
            >
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip bg-primary-500 text-white">age</span>
            <span
              class="chip bg-surface-300 dark:bg-surface-600 text-surface-900 dark:text-surface-100 text-sm"
              >number</span
            >
            <span class="text-xs text-surface-600 dark:text-surface-400"
              >&gt;, &lt;, &gt;=, &lt;=, ==, !=</span
            >
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip bg-primary-500 text-white">department</span>
            <span
              class="chip bg-surface-300 dark:bg-surface-600 text-surface-900 dark:text-surface-100 text-sm"
              >enum</span
            >
            <span class="text-xs text-surface-600 dark:text-surface-400"
              >==, !=, in</span
            >
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip bg-primary-500 text-white">isActive</span>
            <span
              class="chip bg-surface-300 dark:bg-surface-600 text-surface-900 dark:text-surface-100 text-sm"
              >boolean</span
            >
            <span class="text-xs text-surface-600 dark:text-surface-400"
              >==, !=</span
            >
          </div>
        </div>
      </section>
    </div>

    <section
      class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
    >
      <h3 class="text-xl font-bold">Usage Example</h3>
      <div
        class="bg-surface-200 dark:bg-surface-800 p-4 rounded-2xl overflow-x-auto"
      >
        <pre class="text-sm"><code
            >{`import FilterInputBox from '$lib/FilterInputBox.svelte';
import type { Filter, FieldDefinition } from '$lib/types.js';

const fields: FieldDefinition[] = [
  {
    name: 'age',
    type: 'number',
    comparators: ['>', '<', '>=', '<=', '==', '!=']
  }
];

let filters: Filter[] = [];

function handleChange(newFilters: Filter[]) {
  filters = newFilters;
}

<FilterInputBox 
  fields={fields}
  onFiltersChange={handleChange}
/>`}</code
          ></pre>
      </div>
    </section>
  </div>
</div>
