<script lang="ts">
    import { highlightedStatusStore } from "./graphUtils";
    import type { ProcessStatus } from "./types";

    interface ProcessStats {
        total: number;
        success: number;
        skipped: number;
        failed: number;
        inprogress: number;
        notstarted: number;
        rollbacked: number;
    }

    interface Props {
        stats: ProcessStats;
        isDark?: boolean;
        hideSkipped?: boolean;
        onToggleSkipped?: () => void;
    }

    let {
        stats,
        isDark = false,
        hideSkipped = false,
        onToggleSkipped,
    }: Props = $props();

    function setHighlightedStatus(status: ProcessStatus | null) {
        highlightedStatusStore.set(status);
    }
</script>

<div
    class="stats-card backdrop-blur-sm border rounded-xl px-4 py-3 shadow-xl transition-colors duration-300 {isDark
        ? 'bg-slate-800/80 border-white/10'
        : 'bg-white/80 border-slate-200'}"
>
    <div class="flex flex-col gap-2 text-sm">
        <!-- Total -->
        <div class="flex items-center gap-2">
            <span
                class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}"
                >{stats.total}</span
            >
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Total</span
            >
        </div>

        <div
            class="h-px w-full {isDark ? 'bg-white/20' : 'bg-slate-300'}"
        ></div>

        <!-- Success -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-emerald-500/20"
            onmouseenter={() => setHighlightedStatus("SUCCESS")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span class="text-emerald-500 font-medium w-6">{stats.success}</span
            >
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Success</span
            >
        </div>

        <!-- Skipped -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-slate-500/20"
            onmouseenter={() => setHighlightedStatus("SKIPPED")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
            <span class="text-slate-500 font-medium w-6">{stats.skipped}</span>
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Skipped</span
            >
            {#if onToggleSkipped}
                <button
                    onclick={onToggleSkipped}
                    class="ml-auto px-2 py-0.5 rounded text-xs transition-colors {hideSkipped
                        ? 'bg-slate-500 text-white'
                        : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}"
                >
                    {hideSkipped ? "Show" : "Hide"}
                </button>
            {/if}
        </div>

        <!-- Failed -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-red-500/20"
            onmouseenter={() => setHighlightedStatus("FAILED")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            <span class="text-red-500 font-medium w-6">{stats.failed}</span>
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Failed</span
            >
        </div>

        <!-- In Progress -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-blue-500/20"
            onmouseenter={() => setHighlightedStatus("INPROGRESS")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"
            ></span>
            <span class="text-blue-500 font-medium w-6">{stats.inprogress}</span
            >
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >In Progress</span
            >
        </div>

        <!-- Not Started -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-amber-500/20"
            onmouseenter={() => setHighlightedStatus("NOTSTARTED")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span class="text-amber-500 font-medium w-6"
                >{stats.notstarted}</span
            >
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Not Started</span
            >
        </div>

        <!-- Rollbacked -->
        <div
            class="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-violet-500/20"
            onmouseenter={() => setHighlightedStatus("ROLLBACKED")}
            onmouseleave={() => setHighlightedStatus(null)}
            role="button"
            tabindex="0"
        >
            <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
            <span class="text-violet-500 font-medium w-6"
                >{stats.rollbacked}</span
            >
            <span class={isDark ? "text-slate-400" : "text-slate-500"}
                >Rollbacked</span
            >
        </div>
    </div>
</div>
