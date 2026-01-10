<script lang="ts">
    import { SmoothStepEdge, type EdgeProps } from "@xyflow/svelte";

    type $$Props = EdgeProps;

    export let id: $$Props["id"];
    export let sourceX: $$Props["sourceX"];
    export let sourceY: $$Props["sourceY"];
    export let targetX: $$Props["targetX"];
    export let targetY: $$Props["targetY"];
    export let sourcePosition: $$Props["sourcePosition"];
    export let targetPosition: $$Props["targetPosition"];
    export let style: $$Props["style"] = undefined;
    export let markerEnd: $$Props["markerEnd"] = undefined;
    export let markerStart: $$Props["markerStart"] = undefined;
</script>

<SmoothStepEdge
    {id}
    {sourceX}
    {sourceY}
    {targetX}
    {targetY}
    {sourcePosition}
    {targetPosition}
    {style}
    {markerEnd}
    {markerStart}
/>
