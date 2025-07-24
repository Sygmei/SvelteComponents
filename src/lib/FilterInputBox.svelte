<script lang="ts">
  import type {
    Filter,
    Comparator,
    FieldDefinition,
    FilterInputBoxProps,
  } from "./types.js";

  type Props = FilterInputBoxProps;

  let {
    fields = ["name", "email", "status"],
    comparators = [
      "==",
      "!=",
      ">",
      "<",
      ">=",
      "<=",
      "contains",
      "startsWith",
      "endsWith",
    ],
    fieldComparators = {},
    fetchValues = async () => [],
    onFiltersChange = () => {},
  }: Props = $props();

  let inputValue = $state("");
  let filters = $state<Filter[]>([]);
  let showSuggestions = $state(false);
  let suggestions = $state<string[]>([]);
  let currentPart = $state<"field" | "comparator" | "value">("field");
  let selectedIndex = $state(0);
  let inputElement: HTMLInputElement;
  let debounceTimer: number;

  let currentField = $state("");
  let currentComparator = $state<Comparator | "">("");
  let suggestionsHaveLoaded = $state(false);

  // Helper function to get field names
  function getFieldNames(): string[] {
    return Array.isArray(fields) &&
      fields.length > 0 &&
      typeof fields[0] === "object"
      ? (fields as FieldDefinition[]).map((f) => f.name)
      : (fields as string[]);
  }

  // Helper function to get comparators for a field
  function getComparatorsForField(fieldName: string): Comparator[] {
    // Check fieldComparators prop first
    if (fieldComparators[fieldName]) {
      return fieldComparators[fieldName];
    }

    // If fields are FieldDefinition objects, use their comparators
    if (
      Array.isArray(fields) &&
      fields.length > 0 &&
      typeof fields[0] === "object"
    ) {
      const fieldDef = (fields as FieldDefinition[]).find(
        (f) => f.name === fieldName
      );
      if (fieldDef?.comparators) {
        return fieldDef.comparators;
      }
    }

    // Fallback to default comparators
    return comparators;
  }

  function debouncedUpdateSuggestions(): void {
    clearTimeout(debounceTimer);
    suggestionsHaveLoaded = false;
    debounceTimer = setTimeout(updateSuggestions, 100);
  }

  async function updateSuggestions(): Promise<void> {
    return updateSuggestionsForInput(inputValue);
  }

  async function updateSuggestionsForInput(input: string): Promise<void> {
    suggestionsHaveLoaded = false;
    console.log("Updating suggestions for input:", input);

    const fieldNames = getFieldNames();

    if (!input.trim()) {
      // Show all fields when input is empty (on focus)
      currentPart = "field";
      suggestions = fieldNames;
      showSuggestions = suggestions.length > 0;
      selectedIndex = 0;
      suggestionsHaveLoaded = true;
      return;
    }

    const parts = input.split(/\s+/);

    if (parts.length === 1) {
      currentPart = "field";
      suggestions = fieldNames.filter((f) =>
        f.toLowerCase().includes(parts[0].toLowerCase())
      );
    } else if (parts.length === 2) {
      currentField = parts[0];
      const fieldNames = getFieldNames();

      // Only show comparator suggestions if the field is valid
      if (fieldNames.includes(currentField)) {
        currentPart = "comparator";
        const availableComparators = getComparatorsForField(currentField);
        suggestions = availableComparators.filter((c) =>
          c.toLowerCase().includes(parts[1].toLowerCase())
        );
      } else {
        // Field not recognized, don't show suggestions
        suggestions = [];
      }
    } else if (parts.length >= 3) {
      currentPart = "value";
      const fieldName = parts[0];
      const comparatorName = parts[1] as Comparator;
      const query = parts.slice(2).join(" ");

      // Update state variables
      currentField = fieldName;
      currentComparator = comparatorName;

      try {
        // Check if field has enum values defined
        const fieldDef =
          Array.isArray(fields) &&
          fields.length > 0 &&
          typeof fields[0] === "object"
            ? (fields as FieldDefinition[]).find((f) => f.name === fieldName)
            : null;

        if (fieldDef?.enumValues) {
          // Use enum values for suggestions
          suggestions = fieldDef.enumValues.filter((value) =>
            value.toLowerCase().includes(query.toLowerCase())
          );
        } else {
          // Use fetchValues function with local variables
          const values = await fetchValues(fieldName, query);
          suggestions = values;
        }
      } catch (error) {
        console.error("Error fetching values:", error);
        suggestions = [];
      }
    }

    showSuggestions = suggestions.length > 0;
    selectedIndex = 0;
    suggestionsHaveLoaded = true;
  }

  async function selectSuggestion(suggestion: string): Promise<void> {
    const parts = inputValue.split(/\s+/);

    // Check if we're in value mode and the current value matches the suggestion
    if (currentPart === "value") {
      const currentValue = parts.slice(2).join(" ");

      if (currentValue === suggestion) {
        // Value matches suggestion exactly - add as filter instead of selecting
        addFilter();
        return;
      }
    }

    let newInputValue: string;

    if (currentPart === "field") {
      newInputValue = suggestion + " ";
    } else if (currentPart === "comparator") {
      newInputValue = parts[0] + " " + suggestion + " ";
    } else if (currentPart === "value") {
      newInputValue = parts[0] + " " + parts[1] + " " + suggestion;
    } else {
      newInputValue = inputValue;
    }

    inputValue = newInputValue;
    showSuggestions = false;
    inputElement?.focus();

    // Wait for suggestions to update with the new input value
    await updateSuggestionsForInput(newInputValue);
  }

  function addFilter(): void {
    console.log("Adding filter with input:", inputValue);
    const parts = inputValue.trim().split(/\s+/);
    const fieldNames = getFieldNames();

    if (
      parts.length >= 3 &&
      fieldNames.includes(parts[0]) &&
      comparators.includes(parts[1] as Comparator)
    ) {
      // Valid field comparator value format - create standard filter
      const field = parts[0];
      const comparator = parts[1] as Comparator;
      const value = parts.slice(2).join(" ");

      const newFilter: Filter = { field, comparator, value, id: Date.now() };
      filters = [...filters, newFilter];
      inputValue = "";
      showSuggestions = false;
      suggestions = [];
      onFiltersChange(filters);
    } else {
      // Not a valid field comparator value format - treat as value-only filter
      const value = inputValue.trim();

      const newFilter: Filter = { value, id: Date.now() };
      filters = [...filters, newFilter];
      inputValue = "";
      showSuggestions = false;
      suggestions = [];
      onFiltersChange(filters);
    }
  }

  function removeFilter(id: number): void {
    filters = filters.filter((f) => f.id !== id);
    onFiltersChange(filters);
  }

  function isStandardFilter(
    filter: Filter
  ): filter is {
    field: string;
    comparator: Comparator;
    value: string;
    id: number;
  } {
    return "field" in filter && "comparator" in filter;
  }

  async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (!showSuggestions) {
      // No suggestions showing - handle special keys
      if (event.key === "Enter" && inputValue.trim()) {
        event.preventDefault();
        if (!suggestionsHaveLoaded && currentPart === "value") {
          console.log("Ignore enter", suggestionsHaveLoaded);
          // If suggestions haven't loaded yet, just ignore Enter
          return;
        }
        addFilter();
      } else if (
        event.key === "Backspace" &&
        !inputValue.trim() &&
        filters.length > 0
      ) {
        // Delete last filter when backspace on empty input
        event.preventDefault();
        const lastFilter = filters[filters.length - 1];
        removeFilter(lastFilter.id);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        break;

      case "ArrowUp":
        event.preventDefault();
        selectedIndex =
          selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
        break;

      case "Enter":
        event.preventDefault();

        if (suggestions[selectedIndex]) {
          const selectedSuggestion = suggestions[selectedIndex];

          // Check if we're in value mode and the current value matches the suggestion
          if (currentPart === "value") {
            const parts = inputValue.split(/\s+/);
            const currentValue = parts.slice(2).join(" ");

            if (currentValue === selectedSuggestion) {
              // Value matches suggestion exactly - add as filter instead of selecting
              addFilter();
            } else {
              // Value is different - select the suggestion
              await selectSuggestion(selectedSuggestion);
            }
          } else {
            // Not in value mode - select the suggestion
            await selectSuggestion(selectedSuggestion);
          }
        } else if (inputValue.trim()) {
          // No suggestion selected, add as filter
          addFilter();
        }
        break;

      case "Escape":
        event.preventDefault();
        showSuggestions = false;
        selectedIndex = 0;
        break;
    }
  }
</script>

<div class="relative w-full max-w-2xl">
  <div
    class="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-white min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
  >
    {#each filters as filter (filter.id)}
      {#if isStandardFilter(filter)}
        <!-- Standard field comparator value filter -->
        <div
          class="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
        >
          <span class="font-medium">{filter.field}</span>
          <span class="text-blue-600">{filter.comparator}</span>
          <span>{filter.value}</span>
          <button
            type="button"
            onclick={() => removeFilter(filter.id)}
            class="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      {:else}
        <!-- Value-only filter -->
        <div
          class="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm"
        >
          <span class="font-medium">{filter.value}</span>
          <button
            type="button"
            onclick={() => removeFilter(filter.id)}
            class="ml-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      {/if}
    {/each}

    <input
      bind:this={inputElement}
      bind:value={inputValue}
      onkeydown={handleKeydown}
      oninput={debouncedUpdateSuggestions}
      onfocus={() => updateSuggestions()}
      placeholder={filters.length === 0
        ? "Enter filter (e.g., name == test)"
        : ""}
      class="flex-1 min-w-0 outline-none bg-transparent text-sm"
    />
  </div>

  {#if showSuggestions}
    <div
      class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
    >
      {#each suggestions as suggestion, index}
        <button
          type="button"
          onclick={() => selectSuggestion(suggestion)}
          class="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm {index ===
          selectedIndex
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-700'}"
        >
          {#if currentPart === "field"}
            <span class="font-medium text-blue-600">{suggestion}</span>
            <span class="text-gray-400 ml-2">field</span>
          {:else if currentPart === "comparator"}
            <span class="text-gray-600">{currentField}</span>
            <span class="font-medium text-blue-600 mx-2">{suggestion}</span>
            <span class="text-gray-400">comparator</span>
          {:else}
            <span class="text-gray-600">{currentField} {currentComparator}</span
            >
            <span class="font-medium text-blue-600 ml-2">{suggestion}</span>
            <span class="text-gray-400 ml-2">value</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
