<script lang="ts">
  import Tooltip from "$lib/components/Tooltip/Tooltip.svelte";
</script>

<svelte:head>
  <title>Tooltip Examples</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-8">
    Tooltip Component Examples
  </h1>

  <div class="space-y-8">
    <!-- Basic Tooltips -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Basic Tooltips
      </h2>
      <div class="flex flex-wrap gap-6 items-center">
        <Tooltip>
          {#snippet trigger()}
            <button
              class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg"
            >
              Hover me (top)
            </button>
          {/snippet}
          {#snippet content()}
            <div
              class="px-3 py-2 text-sm text-white bg-surface-900 dark:bg-surface-100 dark:text-surface-900 rounded-lg shadow-lg border border-surface-700 dark:border-surface-300 max-w-xs break-words"
            >
              This is a top tooltip
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="bottom">
          {#snippet trigger()}
            <button
              class="btn bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg"
            >
              Hover me (bottom)
            </button>
          {/snippet}
          {#snippet content()}
            <div
              class="px-3 py-2 text-sm text-white bg-surface-900 dark:bg-surface-100 dark:text-surface-900 rounded-lg shadow-lg border border-surface-700 dark:border-surface-300 max-w-xs break-words"
            >
              This is a bottom tooltip
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="left">
          {#snippet trigger()}
            <button
              class="btn bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg"
            >
              Hover me (left)
            </button>
          {/snippet}
          {#snippet content()}
            This is a left tooltip
          {/snippet}
        </Tooltip>

        <Tooltip placement="right">
          {#snippet trigger()}
            <button
              class="btn bg-warning-500 hover:bg-warning-600 text-white px-4 py-2 rounded-lg"
            >
              Hover me (right)
            </button>
          {/snippet}
          {#snippet content()}
            <div
              class="px-3 py-2 text-sm text-white bg-surface-900 dark:bg-surface-100 dark:text-surface-900 rounded-lg shadow-lg border border-surface-700 dark:border-surface-300 max-w-xs break-words"
            >
              This is a right tooltip
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over">
          {#snippet trigger()}
            <button
              class="btn bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              Hover me (over)
            </button>
          {/snippet}
          {#snippet content()}
            <div
              class="px-3 py-2 text-sm text-white bg-purple-900 rounded-lg shadow-lg border border-purple-700 max-w-xs break-words"
            >
              This tooltip appears directly over the trigger
            </div>
          {/snippet}
        </Tooltip>
      </div>
    </section>

    <!-- Overlay Positioning -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Overlay Positioning
      </h2>
      <div class="grid grid-cols-3 gap-6 max-w-4xl">
        <Tooltip placement="over-top-left">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-blue-800 dark:text-blue-200">Top-Left</span>
              <span class="text-xs text-blue-600 dark:text-blue-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">TL</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-top">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-2 border-green-300 dark:border-green-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-green-800 dark:text-green-200">Top</span>
              <span class="text-xs text-green-600 dark:text-green-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">T</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-top-right">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-purple-800 dark:text-purple-200">Top-Right</span>
              <span class="text-xs text-purple-600 dark:text-purple-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">TR</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-left">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Left</span>
              <span class="text-xs text-yellow-600 dark:text-yellow-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">L</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">Center</span>
              <span class="text-xs text-gray-600 dark:text-gray-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">C</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-right">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Right</span>
              <span class="text-xs text-indigo-600 dark:text-indigo-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">R</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-bottom-left">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-pink-100 dark:bg-pink-900 hover:bg-pink-200 dark:hover:bg-pink-800 border-2 border-pink-300 dark:border-pink-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-pink-800 dark:text-pink-200">Bottom-Left</span>
              <span class="text-xs text-pink-600 dark:text-pink-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">BL</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-bottom">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800 border-2 border-teal-300 dark:border-teal-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-teal-800 dark:text-teal-200">Bottom</span>
              <span class="text-xs text-teal-600 dark:text-teal-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">B</span>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="over-bottom-right">
          {#snippet trigger()}
            <button class="w-40 h-24 bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 border-2 border-orange-300 dark:border-orange-700 rounded-lg transition-colors cursor-help flex flex-col items-center justify-center">
              <span class="text-sm font-semibold text-orange-800 dark:text-orange-200">Bottom-Right</span>
              <span class="text-xs text-orange-600 dark:text-orange-400">Hover me</span>
            </button>
          {/snippet}
          {#snippet content()}
            <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-bold">BR</span>
            </div>
          {/snippet}
        </Tooltip>
      </div>
      <p class="text-sm text-surface-600 dark:text-surface-400 mt-4">
        Overlay positioning allows precise control over where the tooltip appears relative to the trigger element. These positions overlay directly on the trigger rather than appearing outside it.
      </p>
    </section>

    <!-- Frame and Arrow Options -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Frame and Arrow Options
      </h2>
      <div class="flex flex-wrap gap-6 items-center">
        <Tooltip frame={true}>
          {#snippet trigger()}
            <button
              class="btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              With frame
            </button>
          {/snippet}
          {#snippet content()}
            Auto-styled with frame
          {/snippet}
        </Tooltip>

        <Tooltip frame={true} arrow={true}>
          {#snippet trigger()}
            <button
              class="btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Frame + arrow
            </button>
          {/snippet}
          {#snippet content()}
            Frame with pointing arrow
          {/snippet}
        </Tooltip>

        <Tooltip placement="bottom" frame={true} arrow={true}>
          {#snippet trigger()}
            <button
              class="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Bottom arrow
            </button>
          {/snippet}
          {#snippet content()}
            Bottom tooltip with arrow
          {/snippet}
        </Tooltip>

        <Tooltip placement="left" frame={true} arrow={true}>
          {#snippet trigger()}
            <button
              class="btn bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
            >
              Left arrow
            </button>
          {/snippet}
          {#snippet content()}
            Left tooltip with arrow
          {/snippet}
        </Tooltip>

        <Tooltip placement="right" frame={true} arrow={true}>
          {#snippet trigger()}
            <button
              class="btn bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg"
            >
              Right arrow
            </button>
          {/snippet}
          {#snippet content()}
            Right tooltip with arrow
          {/snippet}
        </Tooltip>
      </div>
    </section>

    <!-- Text Elements -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Text Elements with Tooltips
      </h2>
      <div class="space-y-4">
        <p class="text-surface-700 dark:text-surface-300">
          You can hover over
          <Tooltip>
            {#snippet trigger()}
              <span
                class="underline decoration-dotted cursor-help text-primary-600 dark:text-primary-400"
              >
                underlined text
              </span>
            {/snippet}
            {#snippet content()}
              This explains the underlined term in more detail
            {/snippet}
          </Tooltip>
          to get more information about specific terms.
        </p>

        <p class="text-surface-700 dark:text-surface-300">
          Here's an
          <Tooltip placement="bottom" delay={200}>
            {#snippet trigger()}
              <span
                class="font-semibold text-info-600 dark:text-info-400 cursor-help"
              >
                important concept
              </span>
            {/snippet}
            {#snippet content()}
              <div class="text-center">
                <strong>Important Concept</strong><br />
                This is a longer explanation that can contain<br />
                multiple lines and even <em>formatting</em>.
              </div>
            {/snippet}
          </Tooltip>
          with a longer delay.
        </p>
      </div>
    </section>

    <!-- Icon Tooltips -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Icon Tooltips
      </h2>
      <div class="flex gap-4 items-center flex-wrap">
        <Tooltip placement="top">
          {#snippet trigger()}
            <div
              class="w-8 h-8 bg-info-500 rounded-full flex items-center justify-center cursor-help"
            >
              <span class="text-white text-sm font-bold">?</span>
            </div>
          {/snippet}
          {#snippet content()}
            Help information
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <div
              class="w-8 h-8 bg-warning-500 rounded-full flex items-center justify-center cursor-help"
            >
              <span class="text-white text-sm font-bold">!</span>
            </div>
          {/snippet}
          {#snippet content()}
            Warning: This action cannot be undone
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <div
              class="w-8 h-8 bg-error-500 rounded-full flex items-center justify-center cursor-help"
            >
              <span class="text-white text-sm font-bold">✕</span>
            </div>
          {/snippet}
          {#snippet content()}
            Delete this item
          {/snippet}
        </Tooltip>

        <!-- Simple icon tooltips -->
        <Tooltip placement="top">
          {#snippet trigger()}
            <span class="text-2xl cursor-help">ℹ️</span>
          {/snippet}
          {#snippet content()}
            Information tooltip
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <span class="text-2xl cursor-help">⚙️</span>
          {/snippet}
          {#snippet content()}
            Settings
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <span class="text-2xl cursor-help">💡</span>
          {/snippet}
          {#snippet content()}
            Tip: You can use any emoji as a tooltip trigger!
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <span class="text-2xl cursor-help">📊</span>
          {/snippet}
          {#snippet content()}
            View analytics
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <span
              class="text-xl cursor-help text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
              >🔍</span
            >
          {/snippet}
          {#snippet content()}
            Search functionality
          {/snippet}
        </Tooltip>

        <!-- Icon-only tooltips (no styling wrapper) -->
        <Tooltip placement="top">
          {#snippet trigger()}
            <button
              class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg"
            >
              Status
            </button>
          {/snippet}
          {#snippet content()}
            <span class="text-2xl">✅</span>
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <button
              class="btn bg-warning-500 hover:bg-warning-600 text-white px-4 py-2 rounded-lg"
            >
              Network
            </button>
          {/snippet}
          {#snippet content()}
            <span class="text-2xl">📶</span>
          {/snippet}
        </Tooltip>

        <Tooltip placement="top">
          {#snippet trigger()}
            <button
              class="btn bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg"
            >
              Alert
            </button>
          {/snippet}
          {#snippet content()}
            <span class="text-2xl">⚠️</span>
          {/snippet}
        </Tooltip>
      </div>
    </section>

    <!-- Complex Content -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Complex Tooltip Content
      </h2>
      <div class="flex gap-6 items-center">
        <Tooltip placement="right">
          {#snippet trigger()}
            <div
              class="p-4 border border-surface-300 dark:border-surface-600 rounded-lg cursor-help"
            >
              <h3 class="font-semibold">Product Card</h3>
              <p class="text-sm text-surface-600 dark:text-surface-400">
                Hover for details
              </p>
            </div>
          {/snippet}
          {#snippet content()}
            <div class="space-y-2">
              <h4 class="font-bold">Product Details</h4>
              <div class="text-sm">
                <div><strong>Price:</strong> $29.99</div>
                <div><strong>Stock:</strong> 15 items</div>
                <div><strong>Rating:</strong> ★★★★☆</div>
              </div>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="left" delay={300}>
          {#snippet trigger()}
            <div
              class="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg cursor-help"
            >
              <span class="font-semibold">Slow show tooltip</span>
            </div>
          {/snippet}
          {#snippet content()}
            <div class="text-center space-y-1">
              <div>🚀 This tooltip has a longer show delay</div>
              <div class="text-xs opacity-75">
                300ms show delay vs default 100ms
              </div>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="top" hideDelay={1000}>
          {#snippet trigger()}
            <div
              class="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg cursor-help"
            >
              <span class="font-semibold">Slow hide tooltip</span>
            </div>
          {/snippet}
          {#snippet content()}
            <div class="text-center space-y-1">
              <div>🐌 This tooltip stays visible longer</div>
              <div class="text-xs opacity-75">
                1000ms hide delay vs default 100ms
              </div>
            </div>
          {/snippet}
        </Tooltip>

        <Tooltip placement="bottom" interactive={true} hideDelay={200}>
          {#snippet trigger()}
            <div
              class="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg cursor-help"
            >
              <span class="font-semibold">Interactive tooltip</span>
            </div>
          {/snippet}
          {#snippet content()}
            <div class="space-y-2">
              <div class="font-semibold">🖱️ Interactive Content</div>
              <div class="text-xs">You can hover this tooltip!</div>
              <button
                class="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors"
              >
                Click me
              </button>
            </div>
          {/snippet}
        </Tooltip>
      </div>
    </section>

    <!-- Edge Cases -->
    <section>
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Edge Cases & Viewport Handling
      </h2>
      <div class="text-surface-700 dark:text-surface-300 space-y-4">
        <p>
          Tooltips automatically adjust their position to stay within the
          viewport. Try hovering these elements near the edges of the screen:
        </p>

        <div class="flex justify-between items-center">
          <Tooltip placement="right">
            {#snippet trigger()}
              <button
                class="btn bg-surface-500 hover:bg-surface-600 text-white px-4 py-2 rounded-lg"
              >
                Left edge
              </button>
            {/snippet}
            {#snippet content()}
              This tooltip should adjust if it goes off the left edge
            {/snippet}
          </Tooltip>

          <Tooltip placement="left">
            {#snippet trigger()}
              <button
                class="btn bg-surface-500 hover:bg-surface-600 text-white px-4 py-2 rounded-lg"
              >
                Right edge
              </button>
            {/snippet}
            {#snippet content()}
              This tooltip should adjust if it goes off the right edge
            {/snippet}
          </Tooltip>
        </div>

        <div class="text-center">
          <Tooltip placement="bottom">
            {#snippet trigger()}
              <button
                class="btn bg-surface-500 hover:bg-surface-600 text-white px-4 py-2 rounded-lg"
              >
                Top edge
              </button>
            {/snippet}
            {#snippet content()}
              This tooltip should adjust if it goes off the top edge
            {/snippet}
          </Tooltip>
        </div>
      </div>
    </section>

    <!-- Usage Information -->
    <section class="mt-12 p-6 bg-surface-100 dark:bg-surface-800 rounded-lg">
      <h2
        class="text-xl font-semibold text-surface-800 dark:text-surface-200 mb-4"
      >
        Usage
      </h2>
      <div class="space-y-4 text-surface-700 dark:text-surface-300">
        <p>
          The Tooltip component uses Svelte 5's snippet system for maximum
          flexibility:
        </p>
        <pre
          class="bg-surface-900 text-surface-100 p-4 rounded-lg overflow-x-auto"><code
            >&lt;Tooltip placement="top" delay={100}&gt;
  {#snippet trigger()}
              &lt;button&gt;Hover me&lt;/button&gt;
            {/snippet}
  {#snippet content()}
              &lt;p&gt;Tooltip content here&lt;/p&gt;
            {/snippet}
&lt;/Tooltip&gt;</code
          ></pre>

        <div class="space-y-2">
          <h3 class="font-semibold">Props:</h3>
          <ul class="list-disc list-inside space-y-1 ml-4">
            <li>
              <code>placement</code>: "top" | "bottom" | "left" | "right" |
              "over" | "over-left" | "over-right" | "over-top" | "over-bottom" |
              "over-top-left" | "over-top-right" | "over-bottom-left" | "over-bottom-right" (default: "top")
            </li>
            <li>
              <code>delay</code>: show delay in milliseconds (default: 100)
            </li>
            <li>
              <code>hideDelay</code>: hide delay in milliseconds (default: 100)
            </li>
            <li>
              <code>offset</code>: distance from trigger in pixels (default: 8,
              ignored for "over")
            </li>
            <li>
              <code>interactive</code>: allow hovering the tooltip itself
              (default: false)
            </li>
            <li>
              <code>frame</code>: add default styling frame (default: false)
            </li>
            <li>
              <code>arrow</code>: add pointing arrow (default: false, ignored
              for "over")
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold">Features:</h3>
          <ul class="list-disc list-inside space-y-1 ml-4">
            <li>Automatic viewport boundary detection and adjustment</li>
            <li>Scroll-aware positioning (follows trigger element)</li>
            <li>High z-index (70) to appear above modals and other UI</li>
            <li>Configurable placement and timing</li>
            <li>Supports any content through snippets</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</div>
