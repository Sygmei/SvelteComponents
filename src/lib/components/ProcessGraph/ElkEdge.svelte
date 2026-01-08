<script lang="ts">
    import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
    import { groupBoxesStore, type GroupBox } from "./graphUtils";
    import { get } from "svelte/store";

    type $$Props = EdgeProps;

    export let id: $$Props["id"];
    export let sourceX: $$Props["sourceX"];
    export let sourceY: $$Props["sourceY"];
    export let targetX: $$Props["targetX"];
    export let targetY: $$Props["targetY"];
    export let sourcePosition: $$Props["sourcePosition"] = undefined;
    export let targetPosition: $$Props["targetPosition"] = undefined;
    export let style: $$Props["style"] = undefined;
    export let markerEnd: $$Props["markerEnd"] = undefined;
    export let source: string = "";
    export let target: string = "";
    export let data: Record<string, unknown> = {};

    // Suppress unused warnings
    void sourcePosition;
    void targetPosition;
    void data;

    const MARGIN = 20;

    // Check if a line segment intersects a box
    function lineIntersectsBox(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        box: GroupBox,
    ): boolean {
        const left = box.x - MARGIN;
        const right = box.x + box.width + MARGIN;
        const top = box.y - MARGIN;
        const bottom = box.y + box.height + MARGIN;

        // Quick bounds check
        if (Math.max(x1, x2) < left || Math.min(x1, x2) > right) return false;
        if (Math.max(y1, y2) < top || Math.min(y1, y2) > bottom) return false;

        // Check if either endpoint is inside the box
        const p1Inside = x1 > left && x1 < right && y1 > top && y1 < bottom;
        const p2Inside = x2 > left && x2 < right && y2 > top && y2 < bottom;

        if (p1Inside || p2Inside) return true;

        // Line intersection check with box edges
        const dx = x2 - x1;
        const dy = y2 - y1;

        const checkEdge = (
            ex1: number,
            ey1: number,
            ex2: number,
            ey2: number,
        ): boolean => {
            const denom = dx * (ey2 - ey1) - dy * (ex2 - ex1);
            if (Math.abs(denom) < 0.0001) return false;
            const t =
                ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / denom;
            const u =
                -((x1 - x2) * (ey1 - y1) - (y1 - y2) * (ex1 - x1)) / denom;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        };

        return (
            checkEdge(left, top, right, top) ||
            checkEdge(right, top, right, bottom) ||
            checkEdge(left, bottom, right, bottom) ||
            checkEdge(left, top, left, bottom)
        );
    }

    // Check if a group is an ancestor of another group
    function isAncestor(potentialAncestor: string, groupId: string): boolean {
        if (!groupId || !potentialAncestor) return false;
        return (
            groupId.startsWith(potentialAncestor + ".") ||
            groupId === potentialAncestor
        );
    }

    // Get the group path for a node (the group that contains it)
    function getNodeGroup(nodeId: string): string | null {
        if (nodeId.startsWith("group-")) {
            const groupId = nodeId.replace("group-", "");
            const parts = groupId.split(".");
            if (parts.length <= 1) return null;
            return parts.slice(0, -1).join(".");
        } else {
            const parts = nodeId.split(".");
            if (parts.length <= 1) return null;
            return parts.slice(0, -1).join(".");
        }
    }

    // Generate path avoiding group boxes
    function getPath(): string {
        const boxes = get(groupBoxesStore);
        const sourceGroup = getNodeGroup(source);
        const targetGroup = getNodeGroup(target);
        
        // Check if source or target IS a group node itself
        const sourceIsGroup = source.startsWith("group-");
        const targetIsGroup = target.startsWith("group-");
        const sourceGroupId = sourceIsGroup ? source.replace("group-", "") : null;
        const targetGroupId = targetIsGroup ? target.replace("group-", "") : null;

        // Filter boxes to only those we need to avoid
        // Don't avoid boxes that contain source or target, or ARE the source/target
        const boxesToAvoid = boxes.filter((box) => {
            const boxGroupId = box.id.replace("group-", "");

            // Don't avoid if the box IS the source or target group
            if (sourceGroupId && boxGroupId === sourceGroupId) return false;
            if (targetGroupId && boxGroupId === targetGroupId) return false;

            // Don't avoid if source or target is inside this group
            if (sourceGroup && isAncestor(boxGroupId, sourceGroup))
                return false;
            if (targetGroup && isAncestor(boxGroupId, targetGroup))
                return false;
            if (sourceGroup && isAncestor(sourceGroup, boxGroupId))
                return false;
            if (targetGroup && isAncestor(targetGroup, boxGroupId))
                return false;

            return true;
        });

        // Check if a smoothstep path (vertical-horizontal-vertical) intersects any boxes
        function smoothstepIntersectsBox(box: GroupBox): boolean {
            const midY = (sourceY + targetY) / 2;
            // Segment 1: sourceX, sourceY -> sourceX, midY (vertical)
            // Segment 2: sourceX, midY -> targetX, midY (horizontal)
            // Segment 3: targetX, midY -> targetX, targetY (vertical)
            return lineIntersectsBox(sourceX, sourceY, sourceX, midY, box) ||
                   lineIntersectsBox(sourceX, midY, targetX, midY, box) ||
                   lineIntersectsBox(targetX, midY, targetX, targetY, box);
        }

        // Find boxes that intersect the smoothstep path
        const intersectingBoxes = boxesToAvoid.filter((box) =>
            smoothstepIntersectsBox(box)
        );

        // If no intersections, draw direct smoothstep-like path
        if (intersectingBoxes.length === 0) {
            const midY = (sourceY + targetY) / 2;
            return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
        }

        // Sort by Y position (for top-to-bottom flow)
        intersectingBoxes.sort((a, b) => a.y - b.y);

        // Build path around boxes
        const waypoints: Array<{ x: number; y: number }> = [];
        waypoints.push({ x: sourceX, y: sourceY });

        let currentX = sourceX;
        let currentY = sourceY;

        for (const box of intersectingBoxes) {
            const boxLeft = box.x - MARGIN;
            const boxRight = box.x + box.width + MARGIN;
            const boxTop = box.y - MARGIN;
            const boxBottom = box.y + box.height + MARGIN;
            const boxCenterX = box.x + box.width / 2;

            // Decide to go left or right based on target position
            const goRight = targetX > boxCenterX;

            if (goRight) {
                // Route around right side
                if (currentY < boxTop) {
                    // Coming from above - go down to box level, then right, then continue
                    waypoints.push({ x: currentX, y: boxTop });
                    waypoints.push({ x: boxRight, y: boxTop });
                    waypoints.push({ x: boxRight, y: boxBottom });
                    currentX = boxRight;
                    currentY = boxBottom;
                } else {
                    // Already at box level or below
                    waypoints.push({ x: boxRight, y: currentY });
                    currentX = boxRight;
                }
            } else {
                // Route around left side
                if (currentY < boxTop) {
                    waypoints.push({ x: currentX, y: boxTop });
                    waypoints.push({ x: boxLeft, y: boxTop });
                    waypoints.push({ x: boxLeft, y: boxBottom });
                    currentX = boxLeft;
                    currentY = boxBottom;
                } else {
                    waypoints.push({ x: boxLeft, y: currentY });
                    currentX = boxLeft;
                }
            }
        }

        // Connect to target with orthogonal segments (no diagonals)
        // First move horizontally to align with target X, then vertically to target Y
        if (currentX !== targetX) {
            waypoints.push({ x: targetX, y: currentY });
        }
        waypoints.push({ x: targetX, y: targetY });

        // Build SVG path
        let path = `M ${waypoints[0].x} ${waypoints[0].y}`;
        for (let i = 1; i < waypoints.length; i++) {
            path += ` L ${waypoints[i].x} ${waypoints[i].y}`;
        }

        return path;
    }

    $: path = getPath();

    // Debug log - check the problematic edge
    $: if (id === 'branch_pipeline->update_db') {
        const boxes = get(groupBoxesStore);
        const srcGrp = getNodeGroup(source);
        const tgtGrp = getNodeGroup(target);
        const midY = (sourceY + targetY) / 2;
        
        console.log(`=== DEBUG for ${id} ===`);
        console.log(`Source: ${source}, group: ${srcGrp}`);
        console.log(`Target: ${target}, group: ${tgtGrp}`);
        console.log(`Smoothstep path: (${sourceX?.toFixed(0)}, ${sourceY?.toFixed(0)}) -> (${sourceX?.toFixed(0)}, ${midY?.toFixed(0)}) -> (${targetX?.toFixed(0)}, ${midY?.toFixed(0)}) -> (${targetX?.toFixed(0)}, ${targetY?.toFixed(0)})`);
        
        // Check which boxes would be avoided
        const boxesToAvoid = boxes.filter(box => {
            const boxGroupId = box.id.replace('group-', '');
            if (srcGrp && (boxGroupId === srcGrp || srcGrp.startsWith(boxGroupId + '.') || boxGroupId.startsWith(srcGrp + '.'))) return false;
            if (tgtGrp && (boxGroupId === tgtGrp || tgtGrp.startsWith(boxGroupId + '.') || boxGroupId.startsWith(tgtGrp + '.'))) return false;
            return true;
        });
        
        console.log(`Checking smoothstep intersections with ${boxesToAvoid.length} boxes:`);
        boxesToAvoid.forEach(b => {
            const seg1 = lineIntersectsBox(sourceX, sourceY, sourceX, midY, b);
            const seg2 = lineIntersectsBox(sourceX, midY, targetX, midY, b);
            const seg3 = lineIntersectsBox(targetX, midY, targetX, targetY, b);
            console.log(`  ${b.id}: seg1=${seg1}, seg2=${seg2}, seg3=${seg3}`);
        });
    }
</script>

<BaseEdge {id} {path} {style} {markerEnd} />
