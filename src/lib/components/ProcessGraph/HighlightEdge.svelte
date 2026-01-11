<script lang="ts">
    import { SmoothStepEdge, type SmoothStepEdgeProps } from "@xyflow/svelte";
    import { hoveredNodeStore, focusedNodeStore } from "./graphUtils";

    type Props = SmoothStepEdgeProps & {
        source: string;
        target: string;
    };

    let {
        id,
        source,
        target,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = "",
        markerEnd,
        markerStart,
        interactionWidth,
        ...rest
    }: Props = $props();

    // Subscribe to stores
    let hoveredNode = $state<string | null>(null);
    let focusedNode = $state<string | null>(null);

    hoveredNodeStore.subscribe((value) => {
        hoveredNode = value;
    });

    focusedNodeStore.subscribe((value) => {
        focusedNode = value;
    });

    // Check if this edge is connected to the active node (hovered or focused)
    const activeNode = $derived(hoveredNode || focusedNode);
    const isConnected = $derived(
        activeNode !== null && (source === activeNode || target === activeNode),
    );

    // Check if any node is active but this edge is not connected
    const isDimmed = $derived(activeNode !== null && !isConnected);

    // Compute final style
    const computedStyle = $derived.by(() => {
        let finalStyle = style || "";

        if (isConnected) {
            // Highlight connected edges with blue color
            finalStyle = finalStyle.replace(/stroke:\s*[^;]+;?/, "");
            finalStyle = finalStyle.replace(/opacity:\s*[\d.]+;?/, "");
            finalStyle = finalStyle.replace(/stroke-width:\s*[\d.]+px;?/, "");
            finalStyle += " stroke: #3b82f6; opacity: 1; stroke-width: 3px;";
        } else if (isDimmed) {
            // Dim non-connected edges
            finalStyle = finalStyle.replace(/opacity:\s*[\d.]+;?/, "");
            finalStyle += " opacity: 0.15;";
        }

        return finalStyle.trim();
    });
</script>

<SmoothStepEdge
    {id}
    {sourceX}
    {sourceY}
    {targetX}
    {targetY}
    {sourcePosition}
    {targetPosition}
    style={computedStyle}
    {markerEnd}
    {markerStart}
    {interactionWidth}
    {...rest}
/>
