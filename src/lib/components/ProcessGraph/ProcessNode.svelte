<script lang="ts">
    import {
        Handle,
        Position,
        useSvelteFlow,
        useEdges,
        useNodes,
    } from "@xyflow/svelte";
    import type { ProcessNodeData } from "./types";
    import { onMount } from "svelte";
    import { hoveredNodeStore, focusedNodeStore } from "./graphUtils";
    import { get } from "svelte/store";

    interface Props {
        data: ProcessNodeData;
        id?: string;
        selected?: boolean;
    }

    let { data, id = "", selected = false }: Props = $props();

    // Get SvelteFlow instance
    const { fitBounds } = useSvelteFlow();
    const edges = useEdges();
    const nodes = useNodes();

    // Theme detection
    let isDark = $state(true);
    
    // Radial menu state
    let showRadialMenu = $state(false);
    let nodeElement: HTMLDivElement;

    onMount(() => {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener("change", handler);
        
        // Global click handler to close radial menu when clicking outside
        const handleGlobalClick = (e: MouseEvent) => {
            if (showRadialMenu && nodeElement && !nodeElement.contains(e.target as Node)) {
                showRadialMenu = false;
            }
        };
        
        // Use capture phase to ensure we catch clicks on the svelte-flow pane
        document.addEventListener('click', handleGlobalClick, true);
        
        return () => {
            mediaQuery.removeEventListener("change", handler);
            document.removeEventListener('click', handleGlobalClick, true);
        };
    });

    function handleMouseEnter() {
        hoveredNodeStore.set(id);
    }

    function handleMouseLeave() {
        hoveredNodeStore.set(null);
    }

    // Radial menu configuration - half circle on the right
    const radialMenuItems = [
        { 
            id: 'retry', 
            label: 'Retry', 
            icon: '↻',
            color: '#3b82f6', // blue-500
            hoverColor: '#2563eb', // blue-600
        },
        { 
            id: 'set-failed', 
            label: 'Failed', 
            icon: '✗',
            color: '#ef4444', // red-500
            hoverColor: '#dc2626', // red-600
        },
        { 
            id: 'set-success', 
            label: 'Success', 
            icon: '✓',
            color: '#10b981', // emerald-500
            hoverColor: '#059669', // emerald-600
        },
        { 
            id: 'logs', 
            label: 'Logs', 
            icon: '📋',
            color: '#8b5cf6', // violet-500
            hoverColor: '#7c3aed', // violet-600
        },
    ];

    // Half-circle segment calculations
    const menuRadius = 70;
    const segmentAngle = 180 / radialMenuItems.length; // Each segment spans this many degrees
    
    function getSegmentPath(index: number, innerRadius: number, outerRadius: number): string {
        const startAngle = -90 + (index * segmentAngle);
        const endAngle = startAngle + segmentAngle;
        const gap = 2; // Gap between segments in degrees
        
        const adjustedStartAngle = startAngle + gap / 2;
        const adjustedEndAngle = endAngle - gap / 2;
        
        const startRad = (adjustedStartAngle * Math.PI) / 180;
        const endRad = (adjustedEndAngle * Math.PI) / 180;
        
        const x1 = Math.cos(startRad) * outerRadius;
        const y1 = Math.sin(startRad) * outerRadius;
        const x2 = Math.cos(endRad) * outerRadius;
        const y2 = Math.sin(endRad) * outerRadius;
        const x3 = Math.cos(endRad) * innerRadius;
        const y3 = Math.sin(endRad) * innerRadius;
        const x4 = Math.cos(startRad) * innerRadius;
        const y4 = Math.sin(startRad) * innerRadius;
        
        const largeArcFlag = segmentAngle > 180 ? 1 : 0;
        
        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
    }
    
    function getSegmentCenter(index: number, radius: number): { x: number; y: number } {
        const midAngle = -90 + (index * segmentAngle) + (segmentAngle / 2);
        const rad = (midAngle * Math.PI) / 180;
        return {
            x: Math.cos(rad) * radius,
            y: Math.sin(rad) * radius
        };
    }

    function handleRadialAction(actionId: string, event: MouseEvent) {
        event.stopPropagation();
        console.log(`[ProcessNode] Radial action: ${actionId} for node: ${id}`);
        // TODO: Dispatch events for each action
        showRadialMenu = false;
    }

    function closeRadialMenu(event: MouseEvent) {
        event.stopPropagation();
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
            const parent = nodes.current.find(n => n.id === parentId);
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
    const currentNode = nodes.current.find(n => n.id === id);
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
            const node = nodes.current.find(n => n.id === nodeId);
            if (node) {
                const pos = getAbsolutePosition(node);
                const w = node.measured?.width ?? 180;
                const h = node.measured?.height ?? 80;
                
                // Calculate distance to the farthest edge of this node
                const nodeLeft = pos.x;
                const nodeRight = pos.x + w;
                const nodeTop = pos.y;
                const nodeBottom = pos.y + h;
                
                maxDistanceX = Math.max(maxDistanceX, 
                    Math.abs(nodeLeft - currentCenterX),
                    Math.abs(nodeRight - currentCenterX)
                );
                maxDistanceY = Math.max(maxDistanceY,
                    Math.abs(nodeTop - currentCenterY),
                    Math.abs(nodeBottom - currentCenterY)
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    bind:this={nodeElement}
    class="process-node group relative w-[180px] rounded-xl border-2 backdrop-blur-sm transition-all duration-300 {config.bgColor} {config.borderColor} {selected
        ? 'shadow-lg ' + config.glow
        : 'shadow-md'} {isDark ? 'bg-slate-900/80' : 'bg-white/90'}"
    class:scale-105={selected}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onclick={handleClick}
>
    <!-- Radial Menu - Half circle on the right -->
    {#if showRadialMenu}
        <!-- Half-circle radial menu on the right -->
        <div class="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none" style="left: calc(100% - 10px);">
            <svg 
                width="160" 
                height="180" 
                viewBox="-10 -90 160 180"
                class="overflow-visible drop-shadow-2xl"
            >
                <!-- Glow filter -->
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.4"/>
                    </filter>
                </defs>
                
                <!-- Segment buttons -->
                {#each radialMenuItems as item, index}
                    {@const innerRadius = 25}
                    {@const outerRadius = menuRadius + 20}
                    {@const path = getSegmentPath(index, innerRadius, outerRadius)}
                    {@const center = getSegmentCenter(index, (innerRadius + outerRadius) / 2)}
                    
                    <g 
                        class="segment-group pointer-events-auto cursor-pointer"
                        style="animation-delay: {index * 60}ms;"
                        onclick={(e) => handleRadialAction(item.id, e)}
                    >
                        <!-- Segment background -->
                        <path
                            d={path}
                            fill={item.color}
                            class="segment-path transition-all duration-200"
                            filter="url(#shadow)"
                        />
                        <!-- Hover overlay -->
                        <path
                            d={path}
                            fill={item.hoverColor}
                            class="segment-hover opacity-0 transition-opacity duration-200"
                        />
                        <!-- Icon -->
                        <text
                            x={center.x}
                            y={center.y}
                            text-anchor="middle"
                            dominant-baseline="central"
                            class="text-base fill-white drop-shadow-md pointer-events-none select-none"
                            style="font-size: 18px;"
                        >
                            {item.icon}
                        </text>
                        <!-- Label (appears on hover) -->
                        <text
                            x={center.x + 35}
                            y={center.y}
                            text-anchor="start"
                            dominant-baseline="central"
                            class="segment-label fill-white text-xs font-semibold opacity-0 transition-opacity duration-200 pointer-events-none select-none"
                            style="font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
                        >
                            {item.label}
                        </text>
                    </g>
                {/each}
            </svg>
        </div>
    {/if}

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

    /* Segment menu animation */
    .segment-group {
        animation: segment-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        opacity: 0;
        transform-origin: 0 0;
    }

    .segment-group:hover .segment-hover {
        opacity: 1;
    }

    .segment-group:hover .segment-label {
        opacity: 1;
    }

    .segment-group:hover .segment-path {
        filter: url(#glow);
    }

    .segment-group:active .segment-path {
        transform: scale(0.95);
        transform-origin: center;
    }

    @keyframes segment-slide-in {
        0% {
            opacity: 0;
            transform: translateX(-20px) scale(0.8);
        }
        100% {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
    }
</style>
