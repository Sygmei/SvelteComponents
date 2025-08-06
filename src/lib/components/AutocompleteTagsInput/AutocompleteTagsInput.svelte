<script lang="ts">
  import type { Tag, AutocompleteTagsInputProps } from "./types.js";

  type Props = AutocompleteTagsInputProps;

  let {
    tags = [],
    placeholder = "Add tags...",
    maxTags = undefined,
    allowDuplicates = false,
    completer = async () => [],
    onTagsChange = () => {},
    disabled = false,
    readonly = false,
    tagColorFunction = undefined,
  }: Props = $props();

  let inputValue = $state("");
  let internalTags = $state<Tag[]>(tags);
  let showSuggestions = $state(false);
  let suggestions = $state<string[]>([]);
  let selectedIndex = $state(0);
  let inputElement: HTMLInputElement;

  // Sync internal tags with prop changes
  $effect(() => {
    internalTags = [...tags];
  });

  async function updateSuggestions(): Promise<void> {
    if (disabled || readonly || !inputValue.trim()) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    try {
      const result = await completer(inputValue.trim());
      suggestions = result.filter((suggestion) => {
        if (!allowDuplicates) {
          return !internalTags.some((tag) => tag.value === suggestion);
        }
        return true;
      });
      
      showSuggestions = suggestions.length > 0;
      selectedIndex = 0;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestions = [];
      showSuggestions = false;
    }
  }

  function addTag(value?: string): void {
    if (disabled || readonly) return;

    const tagValue = (value || inputValue).trim();
    if (!tagValue) return;

    // Check max tags limit
    if (maxTags !== undefined && internalTags.length >= maxTags) {
      return;
    }

    // Check for duplicates if not allowed
    if (!allowDuplicates && internalTags.some((tag) => tag.value === tagValue)) {
      inputValue = "";
      showSuggestions = false;
      return;
    }

    const newTag: Tag = {
      id: Date.now() + Math.random(),
      value: tagValue,
    };

    internalTags = [...internalTags, newTag];
    inputValue = "";
    showSuggestions = false;
    suggestions = [];
    selectedIndex = 0;
    onTagsChange(internalTags);
  }

  function removeTag(id: number): void {
    if (disabled || readonly) return;

    internalTags = internalTags.filter((tag) => tag.id !== id);
    onTagsChange(internalTags);
  }

  function selectSuggestion(suggestion: string): void {
    addTag(suggestion);
  }

  async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (disabled || readonly) return;

    if (!showSuggestions) {
      if (event.key === "Enter" && inputValue.trim()) {
        event.preventDefault();
        addTag();
      } else if (
        event.key === "Backspace" &&
        !inputValue.trim() &&
        internalTags.length > 0
      ) {
        event.preventDefault();
        const lastTag = internalTags[internalTags.length - 1];
        removeTag(lastTag.id);
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
          selectSuggestion(suggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag();
        }
        break;

      case "Escape":
        event.preventDefault();
        showSuggestions = false;
        selectedIndex = 0;
        break;
    }
  }

  function handleFocus(): void {
    if (disabled || readonly) return;
    updateSuggestions();
  }

  function handleBlur(): void {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      showSuggestions = false;
      selectedIndex = 0;
    }, 150);
  }
</script>

<div class="relative w-full max-w-2xl">
  <div
    class="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-white min-h-[44px] {disabled
      ? 'bg-gray-50 cursor-not-allowed'
      : readonly
        ? 'bg-gray-50'
        : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}"
  >
    {#each internalTags as tag (tag.id)}
      <div
        class="flex items-center gap-1 px-2 py-1 rounded-md text-sm"
        style={tagColorFunction ? `background-color: ${tagColorFunction(tag.value)}; color: white;` : 'background-color: rgb(219 234 254); color: rgb(30 64 175);'}
      >
        <span class="font-medium">{tag.value}</span>
        {#if !disabled && !readonly}
          <button
            type="button"
            onclick={() => removeTag(tag.id)}
            class="ml-1 rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-70 hover:opacity-100 hover:bg-black hover:bg-opacity-20"
            aria-label="Remove tag"
          >
            ×
          </button>
        {/if}
      </div>
    {/each}

    {#if !readonly && (maxTags === undefined || internalTags.length < maxTags)}
      <input
        bind:this={inputElement}
        bind:value={inputValue}
        onkeydown={handleKeydown}
        oninput={updateSuggestions}
        onfocus={handleFocus}
        onblur={handleBlur}
        placeholder={internalTags.length === 0 ? placeholder : ""}
        {disabled}
        class="flex-1 min-w-0 outline-none bg-transparent text-sm {disabled
          ? 'cursor-not-allowed'
          : ''}"
      />
    {/if}
  </div>

  {#if showSuggestions && !disabled && !readonly}
    <div
      class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
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
          <span class="font-medium">{suggestion}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>