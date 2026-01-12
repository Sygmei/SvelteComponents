<script lang="ts">
    import {
        Handle,
        Position,
        useSvelteFlow,
        useEdges,
        useNodes,
    } from "@xyflow/svelte";
    import type { ProcessNodeData, RadialMenuAction } from "./types";
    import { onMount } from "svelte";
    import {
        hoveredNodeStore,
        focusedNodeStore,
        highlightedStatusStore,
    } from "./graphUtils";
    import { get } from "svelte/store";
    import RadialMenu from "./RadialMenu.svelte";

    interface ExtendedProcessNodeData extends ProcessNodeData {
        radialActions?: RadialMenuAction[];
    }

    interface Props {
        data: ExtendedProcessNodeData;
        id?: string;
        selected?: boolean;
    }

    let { data, id = "", selected = false }: Props = $props();

    // Get SvelteFlow instance
    const { fitBounds } = useSvelteFlow();
    const edges = useEdges();
    const nodes = useNodes();

    // Check if node has input/output connections
    const hasInputConnection = $derived(
        edges.current.some((edge) => edge.target === id),
    );
    const hasOutputConnection = $derived(
        edges.current.some((edge) => edge.source === id),
    );

    // Theme detection
    let isDark = $state(true);

    // Radial menu state
    let showRadialMenu = $state(false);

    // Tooltip state
    let showTooltip = $state(false);
    let nodeElement: HTMLElement;

    // Status highlighting from stats panel hover
    let highlightedStatus = $state<string | null>(null);
    highlightedStatusStore.subscribe((value) => {
        highlightedStatus = value;
    });

    // Check if this node should be highlighted based on status hover
    const isStatusHighlighted = $derived(
        highlightedStatus !== null && data.status === highlightedStatus,
    );

    // Check if this node should be dimmed (another status is highlighted but not ours)
    const isStatusDimmed = $derived(
        highlightedStatus !== null && data.status !== highlightedStatus,
    );

    // Sync selected state with focusedNodeStore
    $effect(() => {
        if (selected) {
            focusedNodeStore.set(id);
        } else {
            // Clear focus when this node is deselected (only if it was focused)
            focusedNodeStore.update((current) =>
                current === id ? null : current,
            );
        }
    });

    onMount(() => {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener("change", handler);

        return () => {
            mediaQuery.removeEventListener("change", handler);
            // Clean up tooltip if component unmounts while showing
            if (tooltipEl) {
                tooltipEl.remove();
            }
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
            }
        };
    });

    // Create tooltip element in body for proper z-index
    let tooltipEl: HTMLDivElement | null = null;
    let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

    function createTooltip() {
        if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.className = "process-node-tooltip";
            document.body.appendChild(tooltipEl);
        }
    }

    function updateTooltip() {
        if (!nodeElement || !tooltipEl) return;

        const rect = nodeElement.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top - 8;

        tooltipEl.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -100%);
            z-index: 99999;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            pointer-events: none;
            background: ${isDark ? "#334155" : "#1e293b"};
            color: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        `;
        tooltipEl.textContent = data.label;
    }

    function removeTooltip() {
        if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
        }
    }

    function handleMouseEnter() {
        hoveredNodeStore.set(id);

        // Clear any existing timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }

        // Delay tooltip appearance by 1 second
        tooltipTimeout = setTimeout(() => {
            showTooltip = true;
            createTooltip();
            requestAnimationFrame(updateTooltip);
        }, 1000);
    }

    function handleMouseMove() {
        if (showTooltip && tooltipEl) {
            updateTooltip();
        }
    }

    function handleMouseLeave() {
        hoveredNodeStore.set(null);
        showTooltip = false;
        removeTooltip();

        // Clear pending tooltip timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
    }

    // Default radial menu items (fallback if not provided via props)
    const defaultRadialMenuItems: RadialMenuAction[] = [
        {
            id: "retry",
            label: "Retry",
            icon: "↻",
            color: "#3b82f6",
            hoverColor: "#2563eb",
        },
        {
            id: "set-failed",
            label: "Failed",
            icon: "✗",
            color: "#ef4444",
            hoverColor: "#dc2626",
        },
        {
            id: "set-success",
            label: "Success",
            icon: "✓",
            color: "#10b981",
            hoverColor: "#059669",
        },
        {
            id: "logs",
            label: "Logs",
            icon: "📋",
            color: "#8b5cf6",
            hoverColor: "#7c3aed",
        },
    ];

    // Use provided radial actions or fall back to defaults
    const radialMenuItems = $derived(
        data.radialActions ?? defaultRadialMenuItems,
    );

    function handleRadialAction(actionId: string) {
        // Find the action and call its callback if provided
        const action = radialMenuItems.find((a) => a.id === actionId);
        if (action?.onAction) {
            action.onAction(id, data);
        } else {
            console.log(
                `[ProcessNode] Radial action: ${actionId} for node: ${id}`,
            );
        }
        showRadialMenu = false;
    }

    function closeRadialMenu() {
        showRadialMenu = false;
    }

    // Helper function to get absolute position of a node (accounts for parent groups)
    function getAbsolutePosition(node: any): { x: number; y: number } {
        // First check if internals.positionAbsolute is available
        if (node.internals?.positionAbsolute) {
            return node.internals.positionAbsolute;
        }

        // Otherwise, compute by traversing parent chain
        let absX = node.position.x;
        let absY = node.position.y;
        let parentId = node.parentId;

        while (parentId) {
            const parent = nodes.current.find((n) => n.id === parentId);
            if (!parent) break;

            // Add parent's position
            absX += parent.position.x;
            absY += parent.position.y;

            // Check if parent itself has a parent
            parentId = parent.parentId;
        }

        return { x: absX, y: absY };
    }

    function handleClick() {
        const currentFocused = get(focusedNodeStore);

        // If already focused on this node, toggle the radial menu
        if (currentFocused === id) {
            showRadialMenu = !showRadialMenu;
            return;
        }

        // Show radial menu when focusing on node
        showRadialMenu = true;

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
        const currentPos = getAbsolutePosition(currentNode);
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
                const pos = getAbsolutePosition(node);
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

        focusedNodeStore.set(id);

        // fitBounds will center on the provided rect
        fitBounds(bounds, {
            padding: 0.1,
            duration: 400,
        });
    }

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

    // Dynamic classes for status highlighting
    const highlightClasses = $derived(() => {
        if (isStatusHighlighted) {
            return "scale-110 ring-4 ring-white/50 z-10";
        }
        if (isStatusDimmed) {
            return "opacity-30";
        }
        return "";
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
    bind:this={nodeElement}
    class="process-node group relative w-[180px] rounded-xl border-2 backdrop-blur-sm transition-all duration-300 {config.bgColor} {config.borderColor} {selected
        ? 'shadow-lg ' + config.glow
        : 'shadow-md'} {isDark
        ? 'bg-slate-900/80'
        : 'bg-white/90'} {highlightClasses()}"
    class:scale-105={selected && !isStatusHighlighted}
    onmouseenter={handleMouseEnter}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
    onclick={handleClick}
>
    <!-- Radial Menu Component -->
    <RadialMenu
        items={radialMenuItems}
        show={showRadialMenu}
        onAction={handleRadialAction}
        onClose={closeRadialMenu}
    />

    <!-- Main content -->
    <div class="p-3">
        <!-- Process name and status -->
        <div class="flex items-center gap-2">
            <span
                class="font-semibold text-sm leading-tight truncate {isDark
                    ? 'text-white'
                    : 'text-slate-800'}"
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
    {#if hasInputConnection}
        <Handle
            type="target"
            position={Position.Top}
            class="!w-3 !h-3 !border-2 !-top-1.5 transition-all {isDark
                ? '!bg-white/30 !border-white/50 hover:!bg-white/60'
                : '!bg-slate-400/50 !border-slate-400 hover:!bg-slate-500'}"
        />
    {/if}
    {#if hasOutputConnection}
        <Handle
            type="source"
            position={Position.Bottom}
            class="!w-3 !h-3 !border-2 !-bottom-1.5 transition-all {isDark
                ? '!bg-white/30 !border-white/50 hover:!bg-white/60'
                : '!bg-slate-400/50 !border-slate-400 hover:!bg-slate-500'}"
        />
    {/if}
</div>

<style>
    .process-node {
        font-family: "Inter", system-ui, sans-serif;
    }

    .process-node:hover {
        transform: translateY(-2px);
    }
</style>
