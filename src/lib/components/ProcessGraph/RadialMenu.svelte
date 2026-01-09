<script lang="ts">
    import { onMount } from "svelte";

    interface RadialMenuItem {
        id: string;
        label: string;
        icon: string;
        color: string;
        hoverColor: string;
    }

    interface Props {
        items: RadialMenuItem[];
        show: boolean;
        onAction: (actionId: string) => void;
        onClose: () => void;
    }

    let { items, show, onAction, onClose }: Props = $props();

    // Half-circle segment calculations
    const menuRadius = 70;
    const segmentAngle = $derived(180 / items.length);

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

    function handleAction(actionId: string, event: MouseEvent) {
        event.stopPropagation();
        onAction(actionId);
    }

    let menuElement: HTMLDivElement | undefined = $state(undefined);

    onMount(() => {
        // Global click handler to close radial menu when clicking outside
        const handleGlobalClick = (e: MouseEvent) => {
            if (show && menuElement && !menuElement.contains(e.target as Node)) {
                onClose();
            }
        };

        // Use capture phase to ensure we catch clicks on the svelte-flow pane
        document.addEventListener('click', handleGlobalClick, true);

        return () => {
            document.removeEventListener('click', handleGlobalClick, true);
        };
    });
</script>

{#if show}
    <!-- Half-circle radial menu on the right -->
    <div 
        bind:this={menuElement}
        class="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none" 
        style="left: calc(100% + 5px);"
    >
        <svg
            width="160"
            height="180"
            viewBox="-10 -90 160 180"
            class="overflow-visible drop-shadow-2xl"
        >
            <!-- Glow filter -->
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.4" />
                </filter>
            </defs>

            <!-- Segment buttons -->
            {#each items as item, index}
                {@const innerRadius = 25}
                {@const outerRadius = menuRadius + 20}
                {@const path = getSegmentPath(index, innerRadius, outerRadius)}
                {@const center = getSegmentCenter(index, (innerRadius + outerRadius) / 2)}

                <g
                    class="segment-group pointer-events-auto cursor-pointer"
                    style="animation-delay: {index * 60}ms;"
                    onclick={(e) => handleAction(item.id, e)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => e.key === 'Enter' && handleAction(item.id, e as unknown as MouseEvent)}
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

<style>
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
