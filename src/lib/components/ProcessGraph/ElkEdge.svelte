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
        // Logic for choosing branch point:
        // We want to branch at the same Y where an edge going INTO this group would turn.
        // - For expanded groups: edge targets first child at ~box.y + 70
        // - For collapsed groups: edge targets the group input port at ~box.y + half_height
        const FIRST_CHILD_OFFSET = 70; // For expanded groups
        const COLLAPSED_NODE_HEIGHT = 60; // Approximate height of collapsed group
        
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

            // Calculate where an edge going INTO this group would turn
            // For collapsed groups, the target is the group's input port (top center)
            // For expanded groups, the target is the first child inside
            // Note: input handles are slightly above the node's y position
            const INPUT_HANDLE_OFFSET = 6; // Handle is ~6px above box.y
            let estimatedTargetY: number;
            if (box.collapsed) {
                // Collapsed: edge goes to the group's input port at the top
                estimatedTargetY = box.y - INPUT_HANDLE_OFFSET;
            } else {
                // Expanded: edge goes to first child inside
                estimatedTargetY = box.y + FIRST_CHILD_OFFSET;
            }
            const siblingEdgeTurnY = (sourceY + estimatedTargetY) / 2;
            
            // Use the sibling edge's turn point if it's above the box, otherwise use offset before box
            let splitY: number;
            if (siblingEdgeTurnY < boxTop) {
                splitY = siblingEdgeTurnY;
            } else {
                // Fallback: branch just before the box
                splitY = boxTop - 30;
            }
            
            // Make sure splitY is below current position
            splitY = Math.max(splitY, currentY + MARGIN);

            // Decide to go left or right based on target position
            const goRight = targetX > boxCenterX;

            if (goRight) {
                // Route around right side
                if (currentY < splitY) {
                    // Go down to split point, then go right around the box
                    waypoints.push({ x: currentX, y: splitY });
                    waypoints.push({ x: boxRight, y: splitY });
                    waypoints.push({ x: boxRight, y: boxBottom });
                    currentX = boxRight;
                    currentY = boxBottom;
                } else {
                    // Already past split point
                    waypoints.push({ x: boxRight, y: currentY });
                    currentX = boxRight;
                }
            } else {
                // Route around left side
                if (currentY < splitY) {
                    waypoints.push({ x: currentX, y: splitY });
                    waypoints.push({ x: boxLeft, y: splitY });
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
        const naturalMidY = (sourceY + targetY) / 2;
        
        console.log(`=== DEBUG for ${id} ===`);
        console.log(`sourceY: ${sourceY?.toFixed(0)}, targetY: ${targetY?.toFixed(0)}`);
        console.log(`naturalMidY (turn point): ${naturalMidY?.toFixed(0)}`);
        
        // Find deploy_mono_airflow box
        const deployBox = boxes.find(b => b.id === 'group-deploy_mono_airflow');
        if (deployBox) {
            const boxTop = deployBox.y - MARGIN;
            console.log(`deploy_mono_airflow box: y=${deployBox.y?.toFixed(0)}, collapsed=${deployBox.collapsed}`);
            
            // Calculate what we estimate
            const estimatedTargetY = deployBox.collapsed ? deployBox.y : deployBox.y + 70;
            const siblingEdgeTurnY = (sourceY + estimatedTargetY) / 2;
            console.log(`estimatedTargetY: ${estimatedTargetY?.toFixed(0)}`);
            console.log(`siblingEdgeTurnY (our calculated split): ${siblingEdgeTurnY?.toFixed(0)}`);
        }
        
        console.log(`Final path: ${path}`);
    }
    
    // Also log the edge going INTO the group for comparison
    $: if (id === 'branch_pipeline->deploy_mono_airflow.gitlab_git_submodules_pipeline' || id === 'branch_pipeline->group-deploy_mono_airflow') {
        const midY = (sourceY + targetY) / 2;
        console.log(`=== DEBUG for edge INTO group (${id}) ===`);
        console.log(`sourceY: ${sourceY?.toFixed(0)}, targetY: ${targetY?.toFixed(0)}`);
        console.log(`Turn Y (midY): ${midY?.toFixed(0)}`);
    }
</script>

<BaseEdge {id} {path} {style} {markerEnd} />
