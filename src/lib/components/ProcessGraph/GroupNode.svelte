<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        data: {
            label: string;
            fullPath: string;
        };
        selected?: boolean;
    }

    let { data, selected = false }: Props = $props();

    // Theme detection
    let isDark = $state(true);

    onMount(() => {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    });

    // Generate consistent color based on the root folder name
    function hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    const colorPalette = [
        {
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/40",
            text: "text-indigo-400",
            headerBg: "bg-indigo-500/20",
        },
        {
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/40",
            text: "text-cyan-400",
            headerBg: "bg-cyan-500/20",
        },
        {
            bg: "bg-pink-500/10",
            border: "border-pink-500/40",
            text: "text-pink-400",
            headerBg: "bg-pink-500/20",
        },
        {
            bg: "bg-orange-500/10",
            border: "border-orange-500/40",
            text: "text-orange-400",
            headerBg: "bg-orange-500/20",
        },
        {
            bg: "bg-teal-500/10",
            border: "border-teal-500/40",
            text: "text-teal-400",
            headerBg: "bg-teal-500/20",
        },
        {
            bg: "bg-purple-500/10",
            border: "border-purple-500/40",
            text: "text-purple-400",
            headerBg: "bg-purple-500/20",
        },
        {
            bg: "bg-lime-500/10",
            border: "border-lime-500/40",
            text: "text-lime-400",
            headerBg: "bg-lime-500/20",
        },
        {
            bg: "bg-rose-500/10",
            border: "border-rose-500/40",
            text: "text-rose-400",
            headerBg: "bg-rose-500/20",
        },
    ];

    const rootFolder = $derived(() => {
        const parts = data.fullPath.split(".");
        return parts[0];
    });

    const colorIndex = $derived(hashString(rootFolder()) % colorPalette.length);
    const colors = $derived(colorPalette[colorIndex]);

    // Depth for visual hierarchy
    const depth = $derived(data.fullPath.split(".").length);
</script>

<div
    class="group-node absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-300 {colors.bg} {colors.border} {selected
        ? 'shadow-lg'
        : ''}"
>
    <!-- Group header -->
    <div
        class="absolute -top-0 left-4 flex items-center gap-2 rounded-b-lg px-3 py-1.5 {colors.headerBg} border-x-2 border-b-2 border-dashed {colors.border}"
    >
        <svg
            class="h-4 w-4 {colors.text}"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
            />
        </svg>
        <span class="font-semibold text-sm {colors.text}">
            {data.label}
        </span>
    </div>
</div>

<style>
    .group-node {
        font-family: "Inter", system-ui, sans-serif;
    }

    :global(.svelte-flow__node-group) {
        background: transparent !important;
        border: none !important;
        outline: none !important;
    }
</style>
