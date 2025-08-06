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

<div class="p-8 space-y-8">
  <h1 class="text-3xl font-bold text-gray-900">AutocompleteTagsInput Component Demo</h1>

  <div class="space-y-6">
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">Basic AutocompleteTagsInput</h2>
      <p class="text-gray-600">Simple tags input without autocomplete</p>
      <AutocompleteTagsInput
        placeholder="Enter basic tags..."
        onTagsChange={handleBasicTagsChange}
      />
      <div class="text-sm text-gray-500">
        Tags: {JSON.stringify(basicTags.map((t) => t.value))}
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">
        AutocompleteTagsInput with Tech Autocomplete
      </h2>
      <p class="text-gray-600">
        Type programming languages/frameworks (e.g., "java", "script", "react")
      </p>
      <AutocompleteTagsInput
        placeholder="Enter tech tags..."
        completer={sampleCompleter}
        onTagsChange={handleTechTagsChange}
      />
      <div class="text-sm text-gray-500">
        Tags: {JSON.stringify(techTags.map((t) => t.value))}
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">
        AutocompleteTagsInput with Colors (Max 5, No Duplicates)
      </h2>
      <p class="text-gray-600">Color suggestions with limits</p>
      <AutocompleteTagsInput
        placeholder="Enter color tags..."
        completer={colorCompleter}
        maxTags={5}
        allowDuplicates={false}
        onTagsChange={handleColorTagsChange}
      />
      <div class="text-sm text-gray-500">
        Tags: {JSON.stringify(colorTags.map((t) => t.value))} ({colorTags.length}/5)
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">Disabled AutocompleteTagsInput</h2>
      <p class="text-gray-600">Disabled state</p>
      <AutocompleteTagsInput
        tags={[
          { id: 1, value: "Disabled" },
          { id: 2, value: "Component" },
        ]}
        disabled={true}
        placeholder="This is disabled..."
      />
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">
        AutocompleteTagsInput with Custom Colors
      </h2>
      <p class="text-gray-600">
        Tags with custom colors based on their content. Try tech terms or colors!
      </p>
      <AutocompleteTagsInput
        placeholder="Enter tags with custom colors..."
        completer={sampleCompleter}
        tagColorFunction={getTagColor}
        onTagsChange={handleCustomColorTagsChange}
      />
      <div class="text-sm text-gray-500">
        Tags: {JSON.stringify(customColorTags.map((t) => t.value))}
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">Readonly AutocompleteTagsInput</h2>
      <p class="text-gray-600">Readonly state - cannot add/remove tags</p>
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

  <div class="mt-8 p-4 bg-gray-50 rounded-lg">
    <h3 class="text-lg font-semibold mb-2">Features:</h3>
    <ul class="space-y-1 text-sm text-gray-600">
      <li>• Type and press Enter to add tags</li>
      <li>• Backspace on empty input to delete last tag</li>
      <li>• Click × button to remove specific tags</li>
      <li>• Arrow keys to navigate autocomplete suggestions</li>
      <li>• Custom completer function for autocomplete</li>
      <li>• Custom tag colors with tagColorFunction</li>
      <li>• Optional max tags limit</li>
      <li>• Allow/disallow duplicate tags</li>
      <li>• Disabled and readonly states</li>
    </ul>
  </div>
</div>
