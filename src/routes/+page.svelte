<script lang="ts">
    const components = [
        {
            href: "/autocompletetagsinput",
            name: "Autocomplete Tags Input",
            description:
                "Tag input with autocomplete suggestions and keyboard navigation.",
            icon: "🏷️",
            color: "from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800",
            badge: "Input",
        },
        {
            href: "/filterinputbox",
            name: "Filter Input Box",
            description:
                "Filterable input box with real-time search and customizable matchers.",
            icon: "🔍",
            color: "from-sky-500/10 to-blue-500/10 border-sky-200 dark:border-sky-800",
            badge: "Input",
        },
        {
            href: "/logblock",
            name: "Log Block",
            description:
                "Rich log viewer supporting Airflow, plain text, and custom log providers.",
            icon: "📋",
            color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800",
            badge: "Display",
        },
        {
            href: "/modal",
            name: "Modal",
            description:
                "Composable modal system with confirm, prompt, error, and custom modals.",
            icon: "🪟",
            color: "from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800",
            badge: "Overlay",
        },
        {
            href: "/processgraph",
            name: "Process Graph",
            description:
                "Interactive DAG visualizer with nodes, edges, grouping, and radial menus.",
            icon: "🕸️",
            color: "from-rose-500/10 to-pink-500/10 border-rose-200 dark:border-rose-800",
            badge: "Graph",
        },
        {
            href: "/rulepolicymanager",
            name: "Rule Policy Manager",
            description:
                "Drag-and-drop rule builder with ALLOW / DENY modes and payload testing.",
            icon: "⚖️",
            color: "from-indigo-500/10 to-blue-500/10 border-indigo-200 dark:border-indigo-800",
            badge: "Manager",
        },
        {
            href: "/tooltip",
            name: "Tooltip",
            description:
                "Lightweight, accessible tooltip component with flexible positioning.",
            icon: "💬",
            color: "from-cyan-500/10 to-sky-500/10 border-cyan-200 dark:border-cyan-800",
            badge: "Overlay",
        },
    ];
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
    <!-- Hero -->
    <header
        class="relative overflow-hidden border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950"
    >
        <!-- Gradient blobs -->
        <div
            class="pointer-events-none absolute -top-24 -left-20 w-96 h-96 rounded-full bg-primary-400/10 blur-3xl"
        ></div>
        <div
            class="pointer-events-none absolute -bottom-16 right-10 w-72 h-72 rounded-full bg-secondary-400/10 blur-3xl"
        ></div>

        <div class="relative max-w-4xl mx-auto px-6 py-16 text-center">
            <span
                class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-500 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 px-3 py-1 rounded-full mb-5"
            >
                ✦ Svelte Component Library
            </span>
            <h1
                class="text-4xl sm:text-5xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight mb-4 leading-tight"
            >
                Svelte<span class="text-primary-500">Components</span>
            </h1>
            <p
                class="text-base text-surface-500 dark:text-surface-400 max-w-xl mx-auto leading-relaxed"
            >
                A collection of carefully crafted, accessible UI components
                built with Svelte 5 and Skeleton UI. Pick a component below to
                explore its live demo.
            </p>
            <div
                class="mt-6 flex items-center justify-center gap-3 text-xs text-surface-400 dark:text-surface-500"
            >
                <span class="flex items-center gap-1.5"
                    ><span
                        class="w-2 h-2 rounded-full bg-success-400 inline-block"
                    ></span>Svelte 5</span
                >
                <span class="text-surface-300 dark:text-surface-700">·</span>
                <span class="flex items-center gap-1.5"
                    ><span
                        class="w-2 h-2 rounded-full bg-primary-400 inline-block"
                    ></span>Skeleton UI</span
                >
                <span class="text-surface-300 dark:text-surface-700">·</span>
                <span class="flex items-center gap-1.5"
                    ><span
                        class="w-2 h-2 rounded-full bg-secondary-400 inline-block"
                    ></span>Tailwind CSS</span
                >
            </div>
        </div>
    </header>

    <!-- Components grid -->
    <main class="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each components as c}
                <a
                    href={c.href}
                    class="group relative flex flex-col gap-3 p-5 rounded-2xl border bg-gradient-to-br {c.color}
            bg-white dark:bg-surface-900
            hover:shadow-lg hover:-translate-y-0.5
            transition-all duration-200 cursor-pointer"
                >
                    <!-- Icon + badge row -->
                    <div class="flex items-start justify-between">
                        <span class="text-2xl leading-none">{c.icon}</span>
                        <span
                            class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700"
                        >
                            {c.badge}
                        </span>
                    </div>

                    <!-- Text -->
                    <div class="flex flex-col gap-1 flex-1">
                        <h2
                            class="text-sm font-bold text-surface-900 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                        >
                            {c.name}
                        </h2>
                        <p
                            class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed"
                        >
                            {c.description}
                        </p>
                    </div>

                    <!-- Arrow -->
                    <div
                        class="flex items-center gap-1 text-xs font-medium text-primary-500 dark:text-primary-400 mt-1"
                    >
                        View demo
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="transform group-hover:translate-x-0.5 transition-transform duration-150"
                        >
                            <line x1="2" y1="6" x2="10" y2="6" />
                            <polyline points="7,3 10,6 7,9" />
                        </svg>
                    </div>
                </a>
            {/each}
        </div>
    </main>

    <!-- Footer -->
    <footer
        class="border-t border-surface-200 dark:border-surface-800 py-6 text-center text-xs text-surface-400 dark:text-surface-600"
    >
        {components.length} components · Built with Svelte 5 + Skeleton UI
    </footer>
</div>
