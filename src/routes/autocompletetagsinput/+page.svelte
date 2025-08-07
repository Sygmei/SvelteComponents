<script lang="ts">
  import { AutocompleteTagsInput } from "$lib/components/AutocompleteTagsInput";
  import type { Tag } from "$lib/components/AutocompleteTagsInput";

  let tags = $state<Tag[]>([]);

  // Sample completer function with various suggestions
  async function sampleCompleter(query: string): Promise<string[]> {
    const suggestions = [
      "JavaScript",
      "TypeScript",
      "Svelte",
      "React",
      "Vue",
      "Angular",
      "Node.js",
      "Python",
      "Java",
      "C++",
      "Rust",
      "Go",
      "PHP",
      "Ruby",
      "Swift",
      "Kotlin",
    ];

    // Simulate async behavior
    await new Promise((resolve) => setTimeout(resolve, 100));

    return suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Color-based completer
  async function colorCompleter(query: string): Promise<string[]> {
    const colors = [
      "Red",
      "Blue",
      "Green",
      "Yellow",
      "Purple",
      "Orange",
      "Pink",
      "Brown",
      "Black",
      "White",
      "Gray",
      "Cyan",
      "Magenta",
      "Lime",
      "Indigo",
      "Violet",
    ];

    return colors.filter((color) =>
      color.toLowerCase().includes(query.toLowerCase())
    );
  }

  let basicTags = $state<Tag[]>([]);
  let techTags = $state<Tag[]>([]);
  let colorTags = $state<Tag[]>([]);
  let customColorTags = $state<Tag[]>([]);

  function handleBasicTagsChange(newTags: Tag[]) {
    basicTags = newTags;
    console.log("Basic tags changed:", newTags);
  }

  function handleTechTagsChange(newTags: Tag[]) {
    techTags = newTags;
    console.log("Tech tags changed:", newTags);
  }

  function handleColorTagsChange(newTags: Tag[]) {
    colorTags = newTags;
    console.log("Color tags changed:", newTags);
  }

  function handleCustomColorTagsChange(newTags: Tag[]) {
    customColorTags = newTags;
    console.log("Custom color tags changed:", newTags);
  }

  // Function that returns colors based on tag text
  function getTagColor(tagValue: string): string {
    const colors = {
      // Programming languages
      "JavaScript": "#f7df1e",
      "TypeScript": "#3178c6",
      "Python": "#3776ab",
      "Java": "#ed8b00",
      "Rust": "#ce422b",
      "Go": "#00add8",
      "PHP": "#777bb4",
      "Ruby": "#cc342d",
      "Swift": "#fa7343",
      "Kotlin": "#7f52ff",
      // Frameworks
      "React": "#61dafb",
      "Vue": "#4fc08d",
      "Angular": "#dd0031",
      "Svelte": "#ff3e00",
      "Node.js": "#339933",
      // Colors
      "Red": "#dc2626",
      "Blue": "#2563eb",
      "Green": "#16a34a",
      "Yellow": "#ca8a04",
      "Purple": "#9333ea",
      "Orange": "#ea580c",
      "Pink": "#db2777",
      "Brown": "#a16207",
      "Black": "#374151",
      "Gray": "#6b7280",
      "Cyan": "#0891b2",
      "Magenta": "#c026d3",
      "Lime": "#65a30d",
      "Indigo": "#4f46e5",
      "Violet": "#7c3aed",
    };
    
    // Return specific color if found, otherwise generate a hash-based color
    if (colors[tagValue]) {
      return colors[tagValue];
    }
    
    // Generate a consistent color based on string hash
    let hash = 0;
    for (let i = 0; i < tagValue.length; i++) {
      hash = tagValue.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 50%)`;
  }
</script>

<svelte:head>
  <title>AutocompleteTagsInput Demo</title>
</svelte:head>

<div class="container h-full mx-auto flex justify-center items-center">
<div class="space-y-8 w-full max-w-4xl p-8">
  <header class="text-center space-y-4">
    <h1 class="text-4xl font-bold">AutocompleteTagsInput Component Demo</h1>
    <p class="text-xl text-surface-600 dark:text-surface-400">A powerful and flexible tags input component for Svelte</p>
  </header>

  <div class="space-y-10">
    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">Basic AutocompleteTagsInput</h2>
        <p class="text-surface-600 dark:text-surface-400">Simple tags input without autocomplete</p>
      </header>
      <AutocompleteTagsInput
        placeholder="Enter basic tags..."
        onTagsChange={handleBasicTagsChange}
      />
      <div class="bg-surface-200 dark:bg-surface-800 p-4 rounded-2xl">
        <code class="text-sm">Tags: {JSON.stringify(basicTags.map((t) => t.value))}</code>
      </div>
    </section>

    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">AutocompleteTagsInput with Tech Autocomplete</h2>
        <p class="text-surface-600 dark:text-surface-400">
          Type programming languages/frameworks (e.g., "java", "script", "react")
        </p>
      </header>
      <AutocompleteTagsInput
        placeholder="Enter tech tags..."
        completer={sampleCompleter}
        onTagsChange={handleTechTagsChange}
      />
      <div class="bg-surface-200 dark:bg-surface-800 p-4 rounded-2xl">
        <code class="text-sm">Tags: {JSON.stringify(techTags.map((t) => t.value))}</code>
      </div>
    </section>

    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">AutocompleteTagsInput with Colors (Max 5, No Duplicates)</h2>
        <p class="text-surface-600 dark:text-surface-400">Color suggestions with limits</p>
      </header>
      <AutocompleteTagsInput
        placeholder="Enter color tags..."
        completer={colorCompleter}
        maxTags={5}
        allowDuplicates={false}
        onTagsChange={handleColorTagsChange}
      />
      <div class="bg-surface-200 dark:bg-surface-800 p-4 rounded-2xl">
        <code class="text-sm">Tags: {JSON.stringify(colorTags.map((t) => t.value))} ({colorTags.length}/5)</code>
      </div>
    </section>

    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">Disabled AutocompleteTagsInput</h2>
        <p class="text-surface-600 dark:text-surface-400">Disabled state</p>
      </header>
      <AutocompleteTagsInput
        tags={[
          { id: 1, value: "Disabled" },
          { id: 2, value: "Component" },
        ]}
        disabled={true}
        placeholder="This is disabled..."
      />
    </section>

    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">AutocompleteTagsInput with Custom Colors</h2>
        <p class="text-surface-600 dark:text-surface-400">
          Tags with custom colors based on their content. Try tech terms or colors!
        </p>
      </header>
      <AutocompleteTagsInput
        placeholder="Enter tags with custom colors..."
        completer={sampleCompleter}
        tagColorFunction={getTagColor}
        onTagsChange={handleCustomColorTagsChange}
      />
      <div class="bg-surface-200 dark:bg-surface-800 p-4 rounded-2xl">
        <code class="text-sm">Tags: {JSON.stringify(customColorTags.map((t) => t.value))}</code>
      </div>
    </section>

    <section class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl">
      <header class="space-y-2">
        <h2 class="text-2xl font-bold">Readonly AutocompleteTagsInput</h2>
        <p class="text-surface-600 dark:text-surface-400">Readonly state - cannot add/remove tags</p>
      </header>
      <AutocompleteTagsInput
        tags={[
          { id: 1, value: "Read" },
          { id: 2, value: "Only" },
        ]}
        readonly={true}
        placeholder="This is readonly..."
      />
    </section>
  </div>

  <aside class="card p-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-600 rounded-2xl">
    <h3 class="text-xl font-bold mb-4">Features</h3>
    <div class="grid md:grid-cols-2 gap-4">
      <ul class="space-y-2">
        <li class="flex items-center space-x-2">
          <span class="chip bg-primary-500 text-white text-sm">✓</span>
          <span>Type and press Enter to add tags</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-primary-500 text-white text-sm">✓</span>
          <span>Backspace on empty input to delete last tag</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-primary-500 text-white text-sm">✓</span>
          <span>Click × button to remove specific tags</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-primary-500 text-white text-sm">✓</span>
          <span>Arrow keys to navigate autocomplete suggestions</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-primary-500 text-white text-sm">✓</span>
          <span>Custom completer function for autocomplete</span>
        </li>
      </ul>
      <ul class="space-y-2">
        <li class="flex items-center space-x-2">
          <span class="chip bg-secondary-500 text-white text-sm">✓</span>
          <span>Custom tag colors with tagColorFunction</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-secondary-500 text-white text-sm">✓</span>
          <span>Optional max tags limit</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-secondary-500 text-white text-sm">✓</span>
          <span>Allow/disallow duplicate tags</span>
        </li>
        <li class="flex items-center space-x-2">
          <span class="chip bg-secondary-500 text-white text-sm">✓</span>
          <span>Disabled and readonly states</span>
        </li>
      </ul>
    </div>
  </aside>
</div>
</div>
