<script lang="ts">
    import {
        Handle,
        Position,
        useSvelteFlow,
        useEdges,
        useNodes,
    } from "@xyflow/svelte";
    import { onMount } from "svelte";
    import { hoveredNodeStore, focusedNodeStore } from "./graphUtils";
    import type { GroupNodeData } from "./types";
    import { get } from "svelte/store";

    interface Props {
        data: GroupNodeData;
        id: string;
        selected?: boolean;
    }

    let { data, id, selected = false }: Props = $props();

    // Get SvelteFlow instance
    const { fitBounds } = useSvelteFlow();
    const edges = useEdges();
    const nodes = useNodes();

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

    function handleMouseEnter() {
        hoveredNodeStore.set(id);
    }

    function handleMouseLeave() {
        hoveredNodeStore.set(null);
    }

    function handleGroupClick(e: MouseEvent) {
        e.stopPropagation();

        const currentFocused = get(focusedNodeStore);

        // If already focused on this node, do nothing - already fit to view
        if (currentFocused === id) {
            return;
        }

        // Find all connected node IDs via edges
        const connectedNodeIds = new Set<string>([id]);

        for (const edge of edges.current) {
            if (edge.source === id) {
                connectedNodeIds.add(edge.target);
            }
            if (edge.target === id) {
                connectedNodeIds.add(edge.source);
            }
        }

        // Get the current node
        const currentNode = nodes.current.find((n) => n.id === id);
        if (!currentNode) return;

        // Get current node center (this will be the center of our view)
        const nodeAny = currentNode as any;
        const currentPos =
            nodeAny.internals?.positionAbsolute ?? currentNode.position;
        const currentWidth = currentNode.measured?.width ?? 180;
        const currentHeight = currentNode.measured?.height ?? 80;
        const currentCenterX = currentPos.x + currentWidth / 2;
        const currentCenterY = currentPos.y + currentHeight / 2;

        // Calculate the max distance from current node center to any connected node's edge
        let maxDistanceX = currentWidth / 2 + 50;
        let maxDistanceY = currentHeight / 2 + 50;

        for (const nodeId of connectedNodeIds) {
            if (nodeId === id) continue;
            const node = nodes.current.find((n) => n.id === nodeId);
            if (node) {
                const nAny = node as any;
                const pos = nAny.internals?.positionAbsolute ?? node.position;
                const w = node.measured?.width ?? 180;
                const h = node.measured?.height ?? 80;

                // Calculate distance to the farthest edge of this node
                const nodeLeft = pos.x;
                const nodeRight = pos.x + w;
                const nodeTop = pos.y;
                const nodeBottom = pos.y + h;

                maxDistanceX = Math.max(
                    maxDistanceX,
                    Math.abs(nodeLeft - currentCenterX),
                    Math.abs(nodeRight - currentCenterX),
                );
                maxDistanceY = Math.max(
                    maxDistanceY,
                    Math.abs(nodeTop - currentCenterY),
                    Math.abs(nodeBottom - currentCenterY),
                );
            }
        }

        // Add padding
        const padding = 60;
        maxDistanceX += padding;
        maxDistanceY += padding;

        // Create a bounds rect centered on the clicked node
        const bounds = {
            x: currentCenterX - maxDistanceX,
            y: currentCenterY - maxDistanceY,
            width: maxDistanceX * 2,
            height: maxDistanceY * 2,
        };

        // Debug logging
        console.debug("[GroupNode] handleGroupClick", {
            id,
            currentPos,
            currentCenter: { x: currentCenterX, y: currentCenterY },
            bounds,
        });

        focusedNodeStore.set(id);

        // fitBounds will center on the provided rect
        fitBounds(bounds, {
            padding: 0.1,
            duration: 400,
        });
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

    const mappedTaskColors = {
        bg: "bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-indigo-500/10",
        border: "border-violet-400/50",
        text: "text-violet-200",
        headerBg: "bg-violet-950/90",
        handleBg: "bg-violet-500",
    };

    const rootFolder = $derived(() => {
        const parts = data.fullPath.split(".");
        return parts[0];
    });

    const colorIndex = $derived(hashString(rootFolder()) % colorPalette.length);
    const colors = $derived(
        data.mappedTask ? mappedTaskColors : colorPalette[colorIndex],
    );

    // Depth for visual hierarchy
    const depth = $derived(data.fullPath.split(".").length);
    const isCollapsed = $derived(data.collapsed ?? false);
</script>

{#if isCollapsed}
    <!-- Collapsed state: compact clickable card -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <button
        class="group-node w-full h-full rounded-xl border-2 transition-all duration-300 {colors.bg} {colors.border} {selected
            ? 'shadow-lg'
            : ''} {data.mappedTask
            ? 'mapped-task-group shadow-[0_8px_24px_rgba(109,40,217,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
            : ''} flex items-center justify-center gap-3 px-4 hover:opacity-90 cursor-pointer"
        data-mapped-task={data.mappedTask ? "true" : undefined}
        onclick={handleHeaderClick}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
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

        {#if data.mappedTask}
            <!-- Stacked squares distinguish mapped tasks from folder groups. -->
            <svg
                class="h-5 w-5 flex-shrink-0 {colors.text}"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                viewBox="0 0 20 20"
            >
                <rect x="3" y="3" width="9" height="9" rx="2" />
                <path d="M8 15h6a2 2 0 002-2V7" />
            </svg>
        {:else}
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
        {/if}

        {#if data.mappedTask}
            <span class="truncate text-sm font-semibold {colors.text}">
                {data.label}
            </span>
            <span
                class="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/15 px-1 text-[9px] font-semibold leading-none text-violet-200"
                aria-label={`${data.mappedTaskCount} instances`}
            >
                {data.mappedTaskCount}
            </span>
        {:else}
            <!-- Label -->
            <span class="font-semibold text-sm {colors.text} truncate">
                {data.label}
            </span>
        {/if}

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
        class="group-node absolute inset-0 rounded-2xl border-2 {data.mappedTask
            ? 'mapped-task-group border-solid shadow-[0_12px_36px_rgba(109,40,217,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'border-dashed'} transition-all duration-300 {colors.bg} {colors.border} {selected
            ? 'shadow-lg'
            : ''}"
        data-mapped-task={data.mappedTask ? "true" : undefined}
    >
        <!-- Group header (clickable to collapse) -->
        <button
            class="absolute -top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-b-lg px-3 py-1.5 {colors.headerBg} border-x-2 border-b-2 {data.mappedTask
                ? 'border-solid rounded-b-xl px-4 py-2 shadow-[0_8px_20px_rgba(30,27,75,0.35)]'
                : 'border-dashed'} {colors.border} hover:opacity-80 transition-opacity cursor-pointer"
            onclick={handleHeaderClick}
            onmouseenter={handleMouseEnter}
            onmouseleave={handleMouseLeave}
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
            {#if data.mappedTask}
                <svg
                    class="h-4 w-4 {colors.text}"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    viewBox="0 0 20 20"
                >
                    <rect x="3" y="3" width="9" height="9" rx="2" />
                    <path d="M8 15h6a2 2 0 002-2V7" />
                </svg>
            {:else}
                <svg
                    class="h-4 w-4 {colors.text}"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                    />
                </svg>
            {/if}
            <span class="font-semibold text-sm {colors.text}">
                {data.label}
            </span>
            {#if data.mappedTask}
                <span
                    class="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/15 px-1 text-[9px] font-semibold leading-none text-violet-200"
                    aria-label={`${data.mappedTaskCount} instances`}
                >
                    {data.mappedTaskCount}
                </span>
            {/if}
        </button>

        {#if data.mappedTask}
            <Handle
                type="target"
                position={Position.Top}
                class="!w-3 !h-3 !border-2 !border-white/50 !rounded-full {colors.handleBg}"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                class="!w-3 !h-3 !border-2 !border-white/50 !rounded-full {colors.handleBg}"
            />
        {/if}
    </div>
{/if}

<style>
    .group-node {
        font-family: "Inter", system-ui, sans-serif;
    }
</style>
