<script lang="ts">
    import { Handle, Position } from "@xyflow/svelte";
    import type { ProcessNodeData } from "./types";
    import { onMount } from "svelte";

    interface Props {
        data: ProcessNodeData;
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

    const statusConfig = {
        SUCCESS: {
            bgColor: "bg-emerald-500/20",
            borderColor: "border-emerald-500",
            textColor: "text-emerald-600",
            iconBg: "bg-emerald-500",
            icon: "✓",
            glow: "shadow-emerald-500/30",
        },
        SKIPPED: {
            bgColor: "bg-slate-500/20",
            borderColor: "border-slate-400",
            textColor: "text-slate-500",
            iconBg: "bg-slate-500",
            icon: "⏭",
            glow: "shadow-slate-500/30",
        },
        FAILED: {
            bgColor: "bg-red-500/20",
            borderColor: "border-red-500",
            textColor: "text-red-600",
            iconBg: "bg-red-500",
            icon: "✗",
            glow: "shadow-red-500/30",
        },
        INPROGRESS: {
            bgColor: "bg-blue-500/20",
            borderColor: "border-blue-500",
            textColor: "text-blue-600",
            iconBg: "bg-blue-500",
            icon: "⟳",
            glow: "shadow-blue-500/30",
        },
        NOTSTARTED: {
            bgColor: "bg-zinc-500/20",
            borderColor: "border-zinc-400",
            textColor: "text-zinc-500",
            iconBg: "bg-zinc-500",
            icon: "◯",
            glow: "shadow-zinc-500/30",
        },
        ROLLBACKED: {
            bgColor: "bg-amber-500/20",
            borderColor: "border-amber-500",
            textColor: "text-amber-600",
            iconBg: "bg-amber-500",
            icon: "↩",
            glow: "shadow-amber-500/30",
        },
    };

    const config = $derived(
        statusConfig[data.status] || statusConfig.NOTSTARTED,
    );

    // Extract short name from potentially dotted name
    const shortName = $derived(() => {
        const parts = data.label.split(".");
        return parts[parts.length - 1];
    });

    const groupPath = $derived(() => {
        const parts = data.label.split(".");
        if (parts.length > 1) {
            return parts.slice(0, -1);
        }
        return null;
    });

    // Generate a consistent color for the root folder
    const folderColors: Record<
        string,
        { bg: string; text: string; border: string }
    > = {
        default: {
            bg: "bg-indigo-500/20",
            text: "text-indigo-400",
            border: "border-indigo-500/30",
        },
    };

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
            bg: "bg-indigo-500/20",
            text: "text-indigo-400",
            border: "border-indigo-500/30",
        },
        {
            bg: "bg-cyan-500/20",
            text: "text-cyan-400",
            border: "border-cyan-500/30",
        },
        {
            bg: "bg-pink-500/20",
            text: "text-pink-400",
            border: "border-pink-500/30",
        },
        {
            bg: "bg-orange-500/20",
            text: "text-orange-400",
            border: "border-orange-500/30",
        },
        {
            bg: "bg-teal-500/20",
            text: "text-teal-400",
            border: "border-teal-500/30",
        },
        {
            bg: "bg-purple-500/20",
            text: "text-purple-400",
            border: "border-purple-500/30",
        },
        {
            bg: "bg-lime-500/20",
            text: "text-lime-400",
            border: "border-lime-500/30",
        },
        {
            bg: "bg-rose-500/20",
            text: "text-rose-400",
            border: "border-rose-500/30",
        },
    ];

    const getFolderColor = (path: string[] | null) => {
        if (!path || path.length === 0) return folderColors.default;
        const rootFolder = path[0];
        const index = hashString(rootFolder) % colorPalette.length;
        return colorPalette[index];
    };

    const folderColor = $derived(getFolderColor(groupPath()));
</script>

<div
    class="process-node group relative min-w-[180px] max-w-[260px] rounded-xl border-2 backdrop-blur-sm transition-all duration-300 {config.bgColor} {config.borderColor} {selected
        ? 'shadow-lg ' + config.glow
        : 'shadow-md'} {isDark ? 'bg-slate-900/80' : 'bg-white/90'}"
    class:scale-105={selected}
>
    <!-- Main content -->
    <div class="p-3">
        <!-- Process name and status -->
        <div class="flex items-center gap-2">
            <span
                class="font-semibold text-sm leading-tight truncate {isDark
                    ? 'text-white'
                    : 'text-slate-800'}"
                title={data.label}
            >
                {shortName()}
            </span>
        </div>

        <!-- Status badge -->
        <div class="mt-2 flex items-center justify-between">
            <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider {config.bgColor} {config.textColor} border {config.borderColor}"
            >
                <span
                    class="h-1.5 w-1.5 rounded-full {config.iconBg} {data.status ===
                    'INPROGRESS'
                        ? 'animate-pulse'
                        : ''}"
                ></span>
                {data.status}
            </span>
        </div>

        <!-- Error message tooltip trigger -->
        {#if data.errorMessage}
            <div
                class="mt-2 rounded-lg bg-red-500/20 border border-red-500/50 p-2 text-[10px] text-red-400 line-clamp-2"
            >
                ⚠ {data.errorMessage}
            </div>
        {/if}
    </div>

    <!-- Handles -->
    <Handle
        type="target"
        position={Position.Top}
        class="!w-3 !h-3 !border-2 !-top-1.5 transition-all {isDark
            ? '!bg-white/30 !border-white/50 hover:!bg-white/60'
            : '!bg-slate-400/50 !border-slate-400 hover:!bg-slate-500'}"
    />
    <Handle
        type="source"
        position={Position.Bottom}
        class="!w-3 !h-3 !border-2 !-bottom-1.5 transition-all {isDark
            ? '!bg-white/30 !border-white/50 hover:!bg-white/60'
            : '!bg-slate-400/50 !border-slate-400 hover:!bg-slate-500'}"
    />
</div>

<style>
    .process-node {
        font-family: "Inter", system-ui, sans-serif;
    }

    .process-node:hover {
        transform: translateY(-2px);
    }
</style>
