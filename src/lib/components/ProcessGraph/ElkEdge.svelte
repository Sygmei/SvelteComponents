<script lang="ts">
    import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
    import { groupBoxesStore, groupPortsStore, type GroupBox } from "./graphUtils";
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
    const TURN_CLEARANCE = 40; // Minimum distance from group boundary for turns

    // Get the group hierarchy for a node (returns array from innermost to outermost)
    function getGroupHierarchy(nodeId: string): string[] {
        const groups: string[] = [];
        
        if (nodeId.startsWith("group-")) {
            // Node is a group itself
            const groupId = nodeId.replace("group-", "");
            const parts = groupId.split(".");
            // Add parent groups (not the group itself)
            for (let i = parts.length - 1; i >= 1; i--) {
                groups.push("group-" + parts.slice(0, i).join("."));
            }
        } else {
            // Regular process node
            const parts = nodeId.split(".");
            for (let i = parts.length - 1; i >= 1; i--) {
                groups.push("group-" + parts.slice(0, i).join("."));
            }
        }
        
        return groups;
    }

    // Check if node is inside a group (at any level)
    function isInsideGroup(nodeId: string, groupId: string): boolean {
        const hierarchy = getGroupHierarchy(nodeId);
        return hierarchy.includes(groupId);
    }

    // Find which groups we need to exit from source and enter to reach target
    function findGroupTransitions(sourceId: string, targetId: string): { 
        exitGroups: string[]; 
        entryGroups: string[]; 
        commonAncestor: string | null;
    } {
        const sourceGroups = getGroupHierarchy(sourceId);
        const targetGroups = getGroupHierarchy(targetId);
        
        // Find common ancestor
        let commonAncestor: string | null = null;
        for (const sg of sourceGroups) {
            if (targetGroups.includes(sg)) {
                commonAncestor = sg;
                break;
            }
        }
        
        // Groups to exit: source groups that are not ancestors of target
        const exitGroups: string[] = [];
        for (const sg of sourceGroups) {
            if (sg === commonAncestor) break;
            exitGroups.push(sg);
        }
        
        // Groups to enter: target groups that are not ancestors of source (in reverse order)
        const entryGroups: string[] = [];
        for (const tg of targetGroups) {
            if (tg === commonAncestor) break;
            entryGroups.push(tg);
        }
        entryGroups.reverse(); // Enter from outermost to innermost
        
        return { exitGroups, entryGroups, commonAncestor };
    }

    // Generate path with entry/exit port waypoints
    function getPath(): string {
        const boxes = get(groupBoxesStore);
        const ports = get(groupPortsStore);
        
        const boxMap = new Map<string, GroupBox>();
        boxes.forEach(b => boxMap.set(b.id, b));
        
        // Find group transitions
        const { exitGroups, entryGroups, commonAncestor } = findGroupTransitions(source, target);
        
        // Build waypoints
        const waypoints: Array<{ x: number; y: number }> = [];
        waypoints.push({ x: sourceX, y: sourceY });
        
        // Calculate intermediate turn point
        // If we're crossing groups, we need careful placement of the turn
        let turnY: number;
        
        if (entryGroups.length > 0) {
            // We're entering groups - place turn well above the first group to enter
            const firstEntryGroup = entryGroups[0];
            const entryBox = boxMap.get(firstEntryGroup);
            if (entryBox) {
                // Turn should be TURN_CLEARANCE above the group
                turnY = entryBox.y - TURN_CLEARANCE;
                // But not above the source
                turnY = Math.max(turnY, sourceY + 20);
            } else {
                turnY = (sourceY + targetY) / 2;
            }
        } else if (exitGroups.length > 0) {
            // We're exiting groups but not entering any new ones
            // Turn should be after we've exited
            const lastExitGroup = exitGroups[exitGroups.length - 1];
            const exitBox = boxMap.get(lastExitGroup);
            if (exitBox) {
                // Turn should be TURN_CLEARANCE below the group we're exiting
                turnY = exitBox.y + exitBox.height + TURN_CLEARANCE;
                // But not below the target
                turnY = Math.min(turnY, targetY - 20);
            } else {
                turnY = (sourceY + targetY) / 2;
            }
        } else if (commonAncestor) {
            // Both in the same group hierarchy - check if we need to go around sibling groups
            const ancestorBox = boxMap.get(commonAncestor);
            
            // Find sibling groups between source and target
            const siblingGroups = boxes.filter(box => {
                if (box.id === commonAncestor) return false;
                // Check if this box is a direct child of the common ancestor
                const boxGroupId = box.id.replace("group-", "");
                const ancestorGroupId = commonAncestor.replace("group-", "");
                if (!boxGroupId.startsWith(ancestorGroupId + ".")) return false;
                // Check it's a direct child (one level deeper)
                const remaining = boxGroupId.slice(ancestorGroupId.length + 1);
                if (remaining.includes(".")) return false;
                // Check if it's between source and target Y
                return box.y > sourceY && box.y < targetY;
            });
            
            if (siblingGroups.length > 0) {
                // There's a sibling group in the way - turn above it
                const firstSibling = siblingGroups.sort((a, b) => a.y - b.y)[0];
                turnY = firstSibling.y - TURN_CLEARANCE;
                turnY = Math.max(turnY, sourceY + 20);
            } else {
                // No obstacles - simple turn at a good distance from source
                turnY = sourceY + 30;
            }
        } else {
            // No group involvement - check for any groups in the path
            const midY = (sourceY + targetY) / 2;
            
            // Find any group whose boundary is too close to midY
            let adjustedTurnY = midY;
            for (const box of boxes) {
                const boxTop = box.y;
                const boxBottom = box.y + box.height;
                
                // If midY is within TURN_CLEARANCE of a box boundary, adjust
                if (Math.abs(midY - boxTop) < TURN_CLEARANCE) {
                    adjustedTurnY = boxTop - TURN_CLEARANCE;
                } else if (Math.abs(midY - boxBottom) < TURN_CLEARANCE) {
                    adjustedTurnY = boxBottom + TURN_CLEARANCE;
                } else if (midY > boxTop && midY < boxBottom) {
                    // Turn would be inside a box - go above it
                    adjustedTurnY = boxTop - TURN_CLEARANCE;
                }
            }
            
            turnY = adjustedTurnY;
            turnY = Math.max(turnY, sourceY + 20);
            turnY = Math.min(turnY, targetY - 20);
        }
        
        // First, identify all boxes we need to avoid (not containing source or target)
        const boxesToAvoid = boxes.filter(box => {
            // Check if source or target is inside this box (if so, don't avoid it)
            if (isInsideGroup(source, box.id) || isInsideGroup(target, box.id)) {
                return false;
            }
            // Check if source or target IS this group
            if (source === box.id || target === box.id) {
                return false;
            }
            return true;
        });
        
        // Check if a smoothstep path (down, across, down) intersects any boxes
        function pathIntersectsBox(turnY: number, box: GroupBox): boolean {
            const boxLeft = box.x - MARGIN;
            const boxRight = box.x + box.width + MARGIN;
            const boxTop = box.y - MARGIN;
            const boxBottom = box.y + box.height + MARGIN;
            
            // Check vertical segment 1: sourceX, sourceY -> sourceX, turnY
            if (sourceX > boxLeft && sourceX < boxRight) {
                const segTop = Math.min(sourceY, turnY);
                const segBottom = Math.max(sourceY, turnY);
                if (segBottom > boxTop && segTop < boxBottom) return true;
            }
            
            // Check horizontal segment: sourceX, turnY -> targetX, turnY
            if (turnY > boxTop && turnY < boxBottom) {
                const segLeft = Math.min(sourceX, targetX);
                const segRight = Math.max(sourceX, targetX);
                if (segRight > boxLeft && segLeft < boxRight) return true;
            }
            
            // Check vertical segment 2: targetX, turnY -> targetX, targetY
            if (targetX > boxLeft && targetX < boxRight) {
                const segTop = Math.min(turnY, targetY);
                const segBottom = Math.max(turnY, targetY);
                if (segBottom > boxTop && segTop < boxBottom) return true;
            }
            
            return false;
        }
        
        // Find boxes that the simple path would intersect
        const intersectingBoxes = boxesToAvoid.filter(box => pathIntersectsBox(turnY, box));
        
        if (intersectingBoxes.length > 0) {
            // Need to route around boxes
            return buildAvoidancePath(sourceX, sourceY, targetX, targetY, boxesToAvoid);
        }
        
        // Simple orthogonal path: down, across, down
        waypoints.push({ x: sourceX, y: turnY });
        waypoints.push({ x: targetX, y: turnY });
        waypoints.push({ x: targetX, y: targetY });
        
        // Build SVG path
        return buildPathFromWaypoints(waypoints);
    }
    
    function buildPathFromWaypoints(waypoints: Array<{ x: number; y: number }>): string {
        if (waypoints.length === 0) return "";
        let path = `M ${waypoints[0].x} ${waypoints[0].y}`;
        for (let i = 1; i < waypoints.length; i++) {
            path += ` L ${waypoints[i].x} ${waypoints[i].y}`;
        }
        return path;
    }
    
    function buildAvoidancePath(
        srcX: number, srcY: number, 
        tgtX: number, tgtY: number, 
        allObstacles: GroupBox[]
    ): string {
        const waypoints: Array<{ x: number; y: number }> = [];
        waypoints.push({ x: srcX, y: srcY });
        
        let currentX = srcX;
        let currentY = srcY;
        
        // Filter to only obstacles that are between source and target vertically
        // and could potentially block our path
        const relevantObstacles = allObstacles.filter(box => {
            const boxTop = box.y - MARGIN;
            const boxBottom = box.y + box.height + MARGIN;
            
            // Box must be in the Y range we're traversing
            if (boxBottom < srcY || boxTop > tgtY) return false;
            
            // Box must overlap with either srcX or tgtX column, or be between them
            const boxLeft = box.x - MARGIN;
            const boxRight = box.x + box.width + MARGIN;
            const minX = Math.min(srcX, tgtX);
            const maxX = Math.max(srcX, tgtX);
            
            // If box is completely to the left or right of our X range, skip it
            if (boxRight < minX || boxLeft > maxX) {
                // Unless our vertical segment passes through it
                if (srcX > boxLeft && srcX < boxRight) return true;
                if (tgtX > boxLeft && tgtX < boxRight) return true;
                return false;
            }
            
            return true;
        });
        
        // Sort obstacles by Y position
        relevantObstacles.sort((a, b) => a.y - b.y);
        
        for (const box of relevantObstacles) {
            const boxLeft = box.x - MARGIN;
            const boxRight = box.x + box.width + MARGIN;
            const boxTop = box.y - MARGIN;
            const boxBottom = box.y + box.height + MARGIN;
            const boxCenterX = box.x + box.width / 2;
            
            // Check if we actually need to go around this box
            // (our current X position would pass through it)
            const wouldPassThrough = currentX > boxLeft && currentX < boxRight && 
                                    currentY < boxBottom && tgtY > boxTop;
            
            if (!wouldPassThrough) continue;
            
            // Decide to go left or right based on target position
            const goRight = tgtX > boxCenterX;
            
            // Calculate "smart" split point - align with where sibling edges going INTO this group would turn
            // For edges entering a group, the turn point is: entryBox.y - TURN_CLEARANCE
            // This is the same calculation used in getPath() for entryGroups
            const siblingTurnY = box.y - TURN_CLEARANCE;
            
            // Use the sibling turn point if it's above the source with enough space
            // Otherwise fall back to TURN_CLEARANCE above the box
            let splitY: number;
            if (siblingTurnY > srcY + 20) {
                // Sibling turn point is safely below the source - use it
                splitY = siblingTurnY;
            } else {
                // Sibling turn would be too close to source - use clearance
                splitY = boxTop - TURN_CLEARANCE;
            }
            
            // Make sure splitY is below current position
            splitY = Math.max(splitY, currentY + 20);
            if (splitY > currentY) {
                waypoints.push({ x: currentX, y: splitY });
                currentY = splitY;
            }
            
            if (goRight) {
                // Go right around the box
                waypoints.push({ x: boxRight, y: currentY });
                waypoints.push({ x: boxRight, y: boxBottom });
                currentX = boxRight;
                currentY = boxBottom;
            } else {
                // Go left around the box
                waypoints.push({ x: boxLeft, y: currentY });
                waypoints.push({ x: boxLeft, y: boxBottom });
                currentX = boxLeft;
                currentY = boxBottom;
            }
        }
        
        // Connect to target with orthogonal segments
        if (currentX !== tgtX) {
            waypoints.push({ x: tgtX, y: currentY });
        }
        waypoints.push({ x: tgtX, y: tgtY });
        
        return buildPathFromWaypoints(waypoints);
    }

    $: path = getPath();
</script>

<BaseEdge {id} {path} {style} {markerEnd} />
