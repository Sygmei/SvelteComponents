<script lang="ts">
    import { Handle, Position } from "@xyflow/svelte";
    import { onMount } from "svelte";

    interface Props {
        data: {
            label: string;
            fullPath: string;
            collapsed?: boolean;
            onToggleCollapse?: (groupId: string) => void;
        };
        id: string;
        selected?: boolean;
    }

    let { data, id, selected = false }: Props = $props();

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

    function handleHeaderClick(e: MouseEvent) {
        e.stopPropagation();
        data.onToggleCollapse?.(id);
    }

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
            handleBg: "bg-indigo-500",
        },
        {
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/40",
            text: "text-cyan-400",
            headerBg: "bg-cyan-500/20",
            handleBg: "bg-cyan-500",
        },
        {
            bg: "bg-pink-500/10",
            border: "border-pink-500/40",
            text: "text-pink-400",
            headerBg: "bg-pink-500/20",
            handleBg: "bg-pink-500",
        },
        {
            bg: "bg-orange-500/10",
            border: "border-orange-500/40",
            text: "text-orange-400",
            headerBg: "bg-orange-500/20",
            handleBg: "bg-orange-500",
        },
        {
            bg: "bg-teal-500/10",
            border: "border-teal-500/40",
            text: "text-teal-400",
            headerBg: "bg-teal-500/20",
            handleBg: "bg-teal-500",
        },
        {
            bg: "bg-purple-500/10",
            border: "border-purple-500/40",
            text: "text-purple-400",
            headerBg: "bg-purple-500/20",
            handleBg: "bg-purple-500",
        },
        {
            bg: "bg-lime-500/10",
            border: "border-lime-500/40",
            text: "text-lime-400",
            headerBg: "bg-lime-500/20",
            handleBg: "bg-lime-500",
        },
        {
            bg: "bg-rose-500/10",
            border: "border-rose-500/40",
            text: "text-rose-400",
            headerBg: "bg-rose-500/20",
            handleBg: "bg-rose-500",
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
    const isCollapsed = $derived(data.collapsed ?? false);
</script>

{#if isCollapsed}
    <!-- Collapsed state: compact clickable card -->
    <button
        class="group-node w-full h-full rounded-xl border-2 transition-all duration-300 {colors.bg} {colors.border} {selected
            ? 'shadow-lg'
            : ''} flex items-center justify-center gap-3 px-4 hover:opacity-90 cursor-pointer"
        onclick={handleHeaderClick}
    >
        <!-- Expand chevron -->
        <svg
            class="h-4 w-4 {colors.text} transition-transform flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
            />
        </svg>

        <!-- Folder icon -->
        <svg
            class="h-5 w-5 {colors.text} flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
            />
        </svg>

        <!-- Label -->
        <span class="font-semibold text-sm {colors.text} truncate">
            {data.label}
        </span>

        <!-- Input handle (top) -->
        <Handle
            type="target"
            position={Position.Top}
            class="!w-3 !h-3 !border-2 !border-white/50 !rounded-full {colors.handleBg}"
        />

        <!-- Output handle (bottom) -->
        <Handle
            type="source"
            position={Position.Bottom}
            class="!w-3 !h-3 !border-2 !border-white/50 !rounded-full {colors.handleBg}"
        />
    </button>
{:else}
    <!-- Expanded state: full group container -->
    <div
        class="group-node absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-300 {colors.bg} {colors.border} {selected
            ? 'shadow-lg'
            : ''}"
    >
        <!-- Group header (clickable to collapse) -->
        <button
            class="absolute -top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-b-lg px-3 py-1.5 {colors.headerBg} border-x-2 border-b-2 border-dashed {colors.border} hover:opacity-80 transition-opacity cursor-pointer"
            onclick={handleHeaderClick}
        >
            <svg
                class="h-4 w-4 {colors.text} transition-transform rotate-90"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                />
            </svg>
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
        </button>
    </div>
{/if}

<style>
    .group-node {
        font-family: "Inter", system-ui, sans-serif;
    }
</style>
