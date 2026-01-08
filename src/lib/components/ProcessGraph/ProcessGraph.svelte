<script lang="ts">
    import {
        SvelteFlow,
        Controls,
        Background,
        MiniMap,
        type Node,
        type Edge,
        BackgroundVariant,
    } from "@xyflow/svelte";
    import "@xyflow/svelte/dist/style.css";

    import ProcessNode from "./ProcessNode.svelte";
    import GroupNode from "./GroupNode.svelte";
    import { processesToFlow, processesToFlowAsync, getProcessStats } from "./graphUtils";
    import type { ProcessGraphData } from "./types";
    import { onMount } from "svelte";

    interface Props {
        data: ProcessGraphData;
        showMiniMap?: boolean;
        showControls?: boolean;
        showStats?: boolean;
        fitViewOnLoad?: boolean;
    }

    let {
        data,
        showMiniMap = true,
        showControls = true,
        showStats = true,
        fitViewOnLoad = true,
    }: Props = $props();

    const nodeTypes = {
        process: ProcessNode,
        group: GroupNode,
    };

    // Use sync layout as initial fallback, then update with ELK async
    let { nodes: initialNodes, edges: initialEdges } = $derived(processesToFlow(data.processes));
    let stats = $derived(getProcessStats(data.processes));

    // Theme detection
    let isDark = $state(true);
    let isLayoutReady = $state(false);
    
    onMount(() => {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    });

    // For reactivity with SvelteFlow
    let flowNodes = $state<Node[]>([]);
    let flowEdges = $state<Edge[]>([]);

    // Run ELK layout when data changes
    $effect(() => {
        const processes = data.processes;
        isLayoutReady = false;
        
        // Run async ELK layout
        processesToFlowAsync(processes).then(({ nodes, edges }) => {
            flowNodes = nodes.map(node => ({ ...node, draggable: false }));
            flowEdges = edges;
            isLayoutReady = true;
        }).catch(() => {
            // Fallback to sync layout if ELK fails
            flowNodes = initialNodes.map(node => ({ ...node, draggable: false }));
            flowEdges = initialEdges;
            isLayoutReady = true;
        });
    });

    function getMiniMapNodeColor(node: Node): string {
        const status = node.data?.status as string;
        const colors: Record<string, string> = {
            SUCCESS: "#10b981",
            SKIPPED: "#64748b",
            FAILED: "#ef4444",
            INPROGRESS: "#3b82f6",
            NOTSTARTED: "#f59e0b",
            ROLLBACKED: "#8b5cf6",
        };
        return colors[status] || colors.NOTSTARTED;
    }
</script>

<div
    class="process-graph-container relative h-full w-full overflow-hidden rounded-2xl border transition-colors duration-300 bg-gradient-to-br {isDark ? 'from-slate-900 via-slate-800 to-slate-900 border-white/10' : 'from-slate-100 via-white to-slate-100 border-slate-200'}"
    data-theme={isDark ? 'dark' : 'light'}
>
    <!-- Loading Indicator -->
    {#if !isLayoutReady}
        <div class="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm {isDark ? 'bg-slate-900/50' : 'bg-white/50'}">
            <div class="flex flex-col items-center gap-3">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <span class="text-sm font-medium {isDark ? 'text-white' : 'text-slate-700'}">Computing layout...</span>
            </div>
        </div>
    {/if}

    <!-- Stats Panel -->
    {#if showStats}
        <div class="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <div
                class="stats-card backdrop-blur-sm border rounded-xl px-4 py-2 shadow-xl transition-colors duration-300 {isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white/80 border-slate-200'}"
            >
                <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}">{stats.total}</span>
                        <span class={isDark ? 'text-slate-400' : 'text-slate-500'}>Total</span>
                    </div>
                    <div class="h-4 w-px {isDark ? 'bg-white/20' : 'bg-slate-300'}"></div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        <span class="text-emerald-500 font-medium">{stats.success}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
                        <span class="text-slate-500 font-medium">{stats.skipped}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        <span class="text-red-500 font-medium">{stats.failed}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <span class="text-blue-500 font-medium">{stats.inprogress}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                        <span class="text-amber-500 font-medium">{stats.notstarted}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
                        <span class="text-violet-500 font-medium">{stats.rollbacked}</span>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Title Badge -->
    <div class="absolute right-4 top-4 z-10">
        <div
            class="flex items-center gap-2 rounded-xl backdrop-blur-sm border px-4 py-2 shadow-xl transition-colors duration-300 {isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white/80 border-slate-200'}"
        >
            <svg
                class="h-5 w-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
            </svg>
            <span class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}">Process Graph</span>
        </div>
    </div>

    <!-- Flow Canvas -->
    <SvelteFlow
        {nodeTypes}
        bind:nodes={flowNodes}
        bind:edges={flowEdges}
        fitView={fitViewOnLoad}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        defaultEdgeOptions={{
            type: "smoothstep",
            style: "stroke-width: 2px;",
        }}
        proOptions={{ hideAttribution: true }}
        class="process-flow {isDark ? 'theme-dark' : 'theme-light'}"
    >
        <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            bgColor="transparent"
            patternColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}
        />

        {#if showControls}
            <Controls
                class={isDark 
                    ? "!bg-slate-800/80 !border-white/10 !rounded-xl !shadow-xl [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-slate-600"
                    : "!bg-white/80 !border-slate-200 !rounded-xl !shadow-xl [&>button]:!bg-slate-100 [&>button]:!border-slate-200 [&>button]:!text-slate-700 [&>button:hover]:!bg-slate-200"
                }
                showLock={false}
            />
        {/if}

        {#if showMiniMap}
            <MiniMap
                nodeColor={getMiniMapNodeColor}
                maskColor={isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(241, 245, 249, 0.8)"}
                class={isDark
                    ? "!bg-slate-800/80 !border-white/10 !rounded-xl !shadow-xl"
                    : "!bg-white/80 !border-slate-200 !rounded-xl !shadow-xl"
                }
            />
        {/if}
    </SvelteFlow>

    <!-- Gradient overlays for depth -->
    {#if isDark}
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-transparent"></div>
    {:else}
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-200/30 via-transparent to-transparent"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100/20 via-transparent to-transparent"></div>
    {/if}
</div>

<style>
    .process-graph-container {
        font-family: "Inter", system-ui, sans-serif;
    }

    /* Remove default group node styling */
    :global(.svelte-flow__node-group) {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
    }

    :global(.process-flow .svelte-flow__edge-path) {
        stroke-linecap: round;
    }

    :global(.process-flow .svelte-flow__edge.animated path) {
        stroke-dasharray: 5;
        animation: dash 0.5s linear infinite;
    }

    @keyframes dash {
        to {
            stroke-dashoffset: -10;
        }
    }

    :global(.svelte-flow__minimap) {
        bottom: 1rem !important;
        right: 1rem !important;
    }

    :global(.svelte-flow__controls) {
        bottom: 1rem !important;
        left: 1rem !important;
    }
</style>