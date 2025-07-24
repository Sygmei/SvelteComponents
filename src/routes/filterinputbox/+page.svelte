<script lang="ts">
  import { FilterInputBox } from "$lib/components/FilterInputBox";
  import type { Filter, FieldDefinition } from "$lib/components/FilterInputBox";

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
    currentFilters = filters;
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

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">
      Filter Input Box Demo (TypeScript)
    </h1>

    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">
        Try the Filter Input Box
      </h2>
      <p class="text-gray-600 mb-4">
        Type to create filters like: <code class="bg-gray-100 px-2 py-1 rounded"
          >name == john</code
        >
        or <code class="bg-gray-100 px-2 py-1 rounded">age > 25</code>
      </p>
      <p class="text-sm text-gray-500 mb-4">
        Uses TypeScript with proper type definitions and field-aware
        comparators.
      </p>

      <FilterInputBox
        fields={advancedFields}
        fetchValues={customFetchValues}
        onFiltersChange={handleFiltersChange}
      />
    </div>

    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        Current Filters ({currentFilters.length})
      </h3>
      {#if currentFilters.length === 0}
        <p class="text-gray-500 italic">No filters applied</p>
      {:else}
        <div class="space-y-2">
          {#each currentFilters as filter}
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded border">
              {#if isStandardFilter(filter)}
                <span
                  class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium"
                  >{filter.field}</span
                >
                <span class="text-gray-600">{filter.comparator}</span>
                <span class="font-medium">{filter.value}</span>
                <span class="text-xs text-gray-400 ml-auto"
                  >Standard Filter</span
                >
              {:else}
                <span
                  class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium"
                  >{filter.value}</span
                >
                <span class="text-xs text-gray-400 ml-auto"
                  >Value-Only Filter</span
                >
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          TypeScript Features
        </h3>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            Strongly typed props and state
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            Type-safe filter objects
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            Field type definitions (string, number, enum, boolean, date)
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            Comparator validation per field type
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            Mock data with proper typing
          </li>
        </ul>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          Field Types Demo
        </h3>
        <div class="space-y-3 text-sm">
          <div>
            <span class="font-medium text-blue-600">name</span>
            <span class="text-gray-500 ml-2">(string)</span>
            <span class="text-xs text-gray-400 ml-2"
              >contains, startsWith, endsWith</span
            >
          </div>
          <div>
            <span class="font-medium text-blue-600">age</span>
            <span class="text-gray-500 ml-2">(number)</span>
            <span class="text-xs text-gray-400 ml-2"
              >&gt;, &lt;, &gt;=, &lt;=, ==, !=</span
            >
          </div>
          <div>
            <span class="font-medium text-blue-600">department</span>
            <span class="text-gray-500 ml-2">(enum)</span>
            <span class="text-xs text-gray-400 ml-2">==, !=, in</span>
          </div>
          <div>
            <span class="font-medium text-blue-600">isActive</span>
            <span class="text-gray-500 ml-2">(boolean)</span>
            <span class="text-xs text-gray-400 ml-2">==, !=</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Usage Example</h3>
      <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code
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
  </div>
</div>
