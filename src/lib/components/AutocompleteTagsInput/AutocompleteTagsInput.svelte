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
  <div class="flex flex-wrap items-center gap-2 p-3 border border-surface-300 dark:border-surface-600 rounded-2xl bg-surface-50 dark:bg-surface-900 {disabled ? 'opacity-50 cursor-not-allowed' : readonly ? 'bg-surface-100 dark:bg-surface-800' : 'focus-within:border-primary-500'}">
    {#each internalTags as tag (tag.id)}
      <span
        class="chip {tagColorFunction ? '' : 'bg-primary-500 text-white'} flex items-center gap-1"
        style={tagColorFunction ? `background-color: ${tagColorFunction(tag.value)}; color: white;` : ''}
      >
        <span>{tag.value}</span>
        {#if !disabled && !readonly}
          <button
            type="button"
            onclick={() => removeTag(tag.id)}
            class="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none
                   text-white/60 hover:text-white/90
                   hover:bg-white/20
                   transition-all duration-150 ease-out
                   focus:outline-none focus:ring-1 focus:ring-white/40"
            aria-label="Remove tag"
          >
            ×
          </button>
        {/if}
      </span>
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
        class="flex-1 min-w-0 bg-transparent outline-none {disabled ? 'cursor-not-allowed' : ''}"
        type="text"
      />
    {/if}
  </div>

  {#if showSuggestions && !disabled && !readonly}
    <div class="absolute top-full left-0 right-0 mt-1 card p-2 max-h-48 overflow-y-auto z-10 border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 shadow-lg rounded-2xl">
      {#each suggestions as suggestion, index}
        <button
          type="button"
          onclick={() => selectSuggestion(suggestion)}
          class="btn w-full justify-start text-left {index === selectedIndex
            ? 'bg-primary-500 text-white'
            : 'hover:bg-surface-200 dark:hover:bg-surface-700'}"
        >
          <span class="font-medium">{suggestion}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>