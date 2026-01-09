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
    import ElkEdge from "./ElkEdge.svelte";
    import FitViewOnChange from "./FitViewOnChange.svelte";
    import StatusCountWidget from "./StatusCountWidget.svelte";
    import {
        processesToFlow,
        processesToFlowAsync,
        getProcessStats,
    } from "./graphUtils";
    import type { ProcessGraphData, RadialMenuAction } from "./types";
    import { onMount } from "svelte";

    // Default radial menu actions
    const defaultRadialActions: RadialMenuAction[] = [
        { 
            id: 'retry', 
            label: 'Retry', 
            icon: '↻',
            color: '#3b82f6',
            hoverColor: '#2563eb',
        },
        { 
            id: 'set-failed', 
            label: 'Failed', 
            icon: '✗',
            color: '#ef4444',
            hoverColor: '#dc2626',
        },
        { 
            id: 'set-success', 
            label: 'Success', 
            icon: '✓',
            color: '#10b981',
            hoverColor: '#059669',
        },
        { 
            id: 'logs', 
            label: 'Logs', 
            icon: '📋',
            color: '#8b5cf6',
            hoverColor: '#7c3aed',
        },
    ];

    interface Props {
        data: ProcessGraphData;
        showMiniMap?: boolean;
        showControls?: boolean;
        showStats?: boolean;
        fitViewOnLoad?: boolean;
        radialActions?: RadialMenuAction[];
    }

    let {
        data,
        showMiniMap = true,
        showControls = true,
        showStats = true,
        fitViewOnLoad = true,
        radialActions = defaultRadialActions,
    }: Props = $props();

    const nodeTypes = {
        process: ProcessNode,
        group: GroupNode,
    };

    const edgeTypes = {
        elk: ElkEdge,
    };

    // Use sync layout as initial fallback, then update with ELK async
    let { nodes: initialNodes, edges: initialEdges } = $derived(
        processesToFlow(data.processes),
    );
    let stats = $derived(getProcessStats(data.processes));

    // Theme detection
    let isDark = $state(true);
    let isInitialLayoutReady = $state(false);

    // Track collapsed groups
    let collapsedGroups = $state<Set<string>>(new Set());

    // Hide skipped processes
    let hideSkipped = $state(false);

    // Layout version to force re-layout when collapse state changes
    let layoutVersion = $state(0);

    onMount(() => {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    });

    // Handle group collapse toggle
    function handleToggleCollapse(groupId: string) {
        const newCollapsed = new Set(collapsedGroups);
        if (newCollapsed.has(groupId)) {
            newCollapsed.delete(groupId);
        } else {
            newCollapsed.add(groupId);
        }
        collapsedGroups = newCollapsed;
        layoutVersion++;
    }

    // For reactivity with SvelteFlow
    let flowNodes = $state<Node[]>([]);
    let flowEdges = $state<Edge[]>([]);

    // Run ELK layout when data or collapse state changes
    $effect(() => {
        const allProcesses = data.processes;
        const collapsed = collapsedGroups;
        const _version = layoutVersion; // Track for reactivity
        const _hideSkipped = hideSkipped; // Track for reactivity

        // Filter skipped processes if enabled, with edge bridging
        let processes = allProcesses;
        if (_hideSkipped) {
            const processMap = new Map(allProcesses.map((p) => [p.name, p]));
            const skippedNames = new Set(
                allProcesses
                    .filter((p) => p.status === "SKIPPED")
                    .map((p) => p.name),
            );

            // Find all non-skipped ancestors of a process (bridging through skipped ones)
            function getNonSkippedUpstreams(
                processName: string,
                visited = new Set<string>(),
            ): string[] {
                if (visited.has(processName)) return [];
                visited.add(processName);

                const process = processMap.get(processName);
                if (!process) return [];

                const result: string[] = [];
                for (const upstream of process.upstream_processes) {
                    if (skippedNames.has(upstream)) {
                        // Bridge through skipped process - get its upstreams
                        result.push(
                            ...getNonSkippedUpstreams(upstream, visited),
                        );
                    } else {
                        // Non-skipped upstream - keep it
                        result.push(upstream);
                    }
                }
                return [...new Set(result)]; // Deduplicate
            }

            // Filter processes and rewire upstream references
            processes = allProcesses
                .filter((p) => p.status !== "SKIPPED")
                .map((p) => ({
                    ...p,
                    upstream_processes: getNonSkippedUpstreams(p.name),
                }));
        }

        // Run async ELK layout with collapsed groups
        processesToFlowAsync(processes, collapsed)
            .then(({ nodes, edges }) => {
                // Add callbacks and data to nodes
                flowNodes = nodes.map((node) => {
                    if (node.type === "group") {
                        return {
                            ...node,
                            draggable: false,
                            data: {
                                ...node.data,
                                collapsed: collapsed.has(node.id),
                                onToggleCollapse: handleToggleCollapse,
                            },
                        };
                    }
                    // Process nodes get radial menu config
                    return { 
                        ...node, 
                        draggable: false,
                        data: {
                            ...node.data,
                            radialActions,
                        },
                    };
                });
                flowEdges = edges;
                isInitialLayoutReady = true;
            })
            .catch(() => {
                // Fallback to sync layout if ELK fails
                flowNodes = initialNodes.map((node) => {
                    if (node.type === "group") {
                        return {
                            ...node,
                            draggable: false,
                            data: {
                                ...node.data,
                                collapsed: collapsed.has(node.id),
                                onToggleCollapse: handleToggleCollapse,
                            },
                        };
                    }
                    // Process nodes get radial menu config
                    return { 
                        ...node, 
                        draggable: false,
                        data: {
                            ...node.data,
                            radialActions,
                        },
                    };
                });
                flowEdges = initialEdges;
                isInitialLayoutReady = true;
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
    class="process-graph-container relative h-full w-full overflow-hidden rounded-2xl border transition-colors duration-300 bg-gradient-to-br {isDark
        ? 'from-slate-900 via-slate-800 to-slate-900 border-white/10'
        : 'from-slate-100 via-white to-slate-100 border-slate-200'}"
    data-theme={isDark ? "dark" : "light"}
>
    <!-- Loading Indicator (only show on initial load) -->
    {#if !isInitialLayoutReady}
        <div
            class="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm {isDark
                ? 'bg-slate-900/50'
                : 'bg-white/50'}"
        >
            <div class="flex flex-col items-center gap-3">
                <div
                    class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
                ></div>
                <span
                    class="text-sm font-medium {isDark
                        ? 'text-white'
                        : 'text-slate-700'}">Computing layout...</span
                >
            </div>
        </div>
    {/if}

    <!-- Stats Panel -->
    {#if showStats}
        <div class="absolute left-4 top-4 z-10">
            <StatusCountWidget 
                {stats} 
                {isDark} 
                {hideSkipped}
                onToggleSkipped={() => (hideSkipped = !hideSkipped)}
            />
        </div>
    {/if}

    <!-- Title Badge -->
    <div class="absolute right-4 top-4 z-10">
        <div
            class="flex items-center gap-2 rounded-xl backdrop-blur-sm border px-4 py-2 shadow-xl transition-colors duration-300 {isDark
                ? 'bg-slate-800/80 border-white/10'
                : 'bg-white/80 border-slate-200'}"
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
            <span
                class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}"
                >Process Graph</span
            >
        </div>
    </div>

    <!-- Flow Canvas -->
    <SvelteFlow
        {nodeTypes}
        {edgeTypes}
        bind:nodes={flowNodes}
        bind:edges={flowEdges}
        fitView={fitViewOnLoad}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        defaultEdgeOptions={{
            type: "elk",
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
                    : "!bg-white/80 !border-slate-200 !rounded-xl !shadow-xl [&>button]:!bg-slate-100 [&>button]:!border-slate-200 [&>button]:!text-slate-700 [&>button:hover]:!bg-slate-200"}
                showLock={false}
            />
        {/if}

        {#if showMiniMap}
            <MiniMap
                nodeColor={getMiniMapNodeColor}
                maskColor={isDark
                    ? "rgba(15, 23, 42, 0.8)"
                    : "rgba(241, 245, 249, 0.8)"}
                class={isDark
                    ? "!bg-slate-800/80 !border-white/10 !rounded-xl !shadow-xl"
                    : "!bg-white/80 !border-slate-200 !rounded-xl !shadow-xl"}
            />
        {/if}

        <!-- Auto fit view when hideSkipped changes -->
        <FitViewOnChange trigger={hideSkipped} />
    </SvelteFlow>

    <!-- Gradient overlays for depth -->
    {#if isDark}
        <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"
        ></div>
        <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-transparent"
        ></div>
    {:else}
        <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-200/30 via-transparent to-transparent"
        ></div>
        <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100/20 via-transparent to-transparent"
        ></div>
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
