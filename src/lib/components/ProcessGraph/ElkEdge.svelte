<script lang="ts">
    import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
    import {
        groupBoxesStore,
        groupPortsStore,
        type GroupBox,
    } from "./graphUtils";
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

    const MARGIN = 40; // Minimum distance from group boundary for turns, entry/exit ports, and avoidance paths

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
    function findGroupTransitions(
        sourceId: string,
        targetId: string,
    ): {
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
        boxes.forEach((b) => boxMap.set(b.id, b));

        // Find group transitions
        const { exitGroups, entryGroups, commonAncestor } =
            findGroupTransitions(source, target);

        // Build waypoints
        const waypoints: Array<{ x: number; y: number }> = [];
        waypoints.push({ x: sourceX, y: sourceY });

        // Add exit port waypoints for groups we're leaving
        // This ensures the edge visually exits through the group's exit port
        if (exitGroups.length > 0) {
            // For each exit group, add waypoints to route through its exit port
            for (const exitGroupId of exitGroups) {
                const exitPortKey = `${exitGroupId}-exit`;
                const exitPort = ports.get(exitPortKey);
                const exitBox = boxMap.get(exitGroupId);
                
                if (exitPort && exitBox) {
                    // First, go down to just above the exit port (align with bottom of group)
                    const preExitY = exitBox.y + exitBox.height - MARGIN / 2;
                    const lastWaypoint = waypoints[waypoints.length - 1];
                    
                    // Only add preExitY waypoint if we need to move down
                    if (preExitY > lastWaypoint.y) {
                        // Go down on current X
                        waypoints.push({ x: lastWaypoint.x, y: preExitY });
                        // Only add horizontal waypoint if exit port X is different
                        if (Math.abs(exitPort.x - lastWaypoint.x) > 1) {
                            waypoints.push({ x: exitPort.x, y: preExitY });
                        }
                    }
                    
                    // Then go through the exit port (only if different from last waypoint)
                    const currentLast = waypoints[waypoints.length - 1];
                    if (Math.abs(exitPort.x - currentLast.x) > 1 || Math.abs(exitPort.y - currentLast.y) > 1) {
                        waypoints.push({ x: exitPort.x, y: exitPort.y });
                    }
                }
            }
        }

        // Calculate intermediate turn point
        // If we're crossing groups, we need careful placement of the turn
        let turnY: number;
        const lastExitWaypoint = waypoints[waypoints.length - 1];
        const effectiveSourceY = lastExitWaypoint.y;
        const effectiveSourceX = lastExitWaypoint.x;

        if (entryGroups.length > 0) {
            // We're entering groups - place turn well above the first group to enter
            const firstEntryGroup = entryGroups[0];
            const entryBox = boxMap.get(firstEntryGroup);
            if (entryBox) {
                // Turn should be MARGIN above the group
                turnY = entryBox.y - MARGIN;
                // But not above the effective source (after exit waypoints)
                turnY = Math.max(turnY, effectiveSourceY + 20);
            } else {
                turnY = (effectiveSourceY + targetY) / 2;
            }
        } else if (exitGroups.length > 0) {
            // We're exiting groups but not entering any new ones
            // Since we've already added exit port waypoints, the turn should be
            // right after the last exit port (which is already in effectiveSourceY)
            // Just add a small offset to create a proper turn
            turnY = effectiveSourceY + MARGIN;
            // But not below the target
            turnY = Math.min(turnY, targetY - 20);
        } else if (commonAncestor) {
            // Both in the same group hierarchy - check if we need to go around sibling groups
            const ancestorBox = boxMap.get(commonAncestor);

            // Find sibling groups between source and target
            const siblingGroups = boxes.filter((box) => {
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
                turnY = firstSibling.y - MARGIN;
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

                // If midY is within MARGIN of a box boundary, adjust
                if (Math.abs(midY - boxTop) < MARGIN) {
                    adjustedTurnY = boxTop - MARGIN;
                } else if (Math.abs(midY - boxBottom) < MARGIN) {
                    adjustedTurnY = boxBottom + MARGIN;
                } else if (midY > boxTop && midY < boxBottom) {
                    // Turn would be inside a box - go above it
                    adjustedTurnY = boxTop - MARGIN;
                }
            }

            turnY = adjustedTurnY;
            turnY = Math.max(turnY, sourceY + 20);
            turnY = Math.min(turnY, targetY - 20);
        }

        // First, identify all boxes we need to avoid (not containing source or target)
        const boxesToAvoid = boxes.filter((box) => {
            // Check if source or target is inside this box (if so, don't avoid it)
            if (
                isInsideGroup(source, box.id) ||
                isInsideGroup(target, box.id)
            ) {
                return false;
            }
            // Check if source or target IS this group
            if (source === box.id || target === box.id) {
                return false;
            }
            return true;
        });

        // Check if a smoothstep path (down, across, down) intersects any boxes
        // Use effective source position (after exit port waypoints) for intersection checks
        function pathIntersectsBox(turnY: number, box: GroupBox): boolean {
            const boxLeft = box.x - MARGIN;
            const boxRight = box.x + box.width + MARGIN;
            const boxTop = box.y - MARGIN;
            const boxBottom = box.y + box.height + MARGIN;

            // Check vertical segment 1: effectiveSourceX, effectiveSourceY -> effectiveSourceX, turnY
            if (effectiveSourceX > boxLeft && effectiveSourceX < boxRight) {
                const segTop = Math.min(effectiveSourceY, turnY);
                const segBottom = Math.max(effectiveSourceY, turnY);
                if (segBottom > boxTop && segTop < boxBottom) return true;
            }

            // Check horizontal segment: effectiveSourceX, turnY -> targetX, turnY
            if (turnY > boxTop && turnY < boxBottom) {
                const segLeft = Math.min(effectiveSourceX, targetX);
                const segRight = Math.max(effectiveSourceX, targetX);
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
        const intersectingBoxes = boxesToAvoid.filter((box) =>
            pathIntersectsBox(turnY, box),
        );

        if (intersectingBoxes.length > 0) {
            // Need to route around boxes
            // If we have exit waypoints, start avoidance from the last waypoint position
            return buildAvoidancePath(
                effectiveSourceX,
                effectiveSourceY,
                targetX,
                targetY,
                boxesToAvoid,
                waypoints,  // Pass existing waypoints including exit ports
            );
        }

        // Simple orthogonal path: down (from effective source), across, down
        // Only add down waypoint if we need to move vertically from effective source
        if (turnY !== effectiveSourceY) {
            waypoints.push({ x: effectiveSourceX, y: turnY });
        }
        // Move horizontally to target X if needed
        if (effectiveSourceX !== targetX) {
            waypoints.push({ x: targetX, y: turnY });
        }
        waypoints.push({ x: targetX, y: targetY });

        // Build SVG path
        return buildPathFromWaypoints(waypoints);
    }

    function buildPathFromWaypoints(
        waypoints: Array<{ x: number; y: number }>,
    ): string {
        if (waypoints.length === 0) return "";
        let path = `M ${waypoints[0].x} ${waypoints[0].y}`;
        for (let i = 1; i < waypoints.length; i++) {
            path += ` L ${waypoints[i].x} ${waypoints[i].y}`;
        }
        return path;
    }

    function buildAvoidancePath(
        srcX: number,
        srcY: number,
        tgtX: number,
        tgtY: number,
        allObstacles: GroupBox[],
        existingWaypoints: Array<{ x: number; y: number }> = [],
    ): string {
        const boxes = get(groupBoxesStore);
        const waypoints: Array<{ x: number; y: number }> = [...existingWaypoints];
        
        // If no existing waypoints, start with source position
        if (waypoints.length === 0) {
            waypoints.push({ x: srcX, y: srcY });
        }

        let currentX = srcX;
        let currentY = srcY;

        // Find parent groups that contain both source and target
        // These define the boundaries we must stay within
        const sourceHierarchy = getGroupHierarchy(source);
        const targetHierarchy = getGroupHierarchy(target);
        const containingGroups = sourceHierarchy.filter((g) =>
            targetHierarchy.includes(g),
        );

        // Get the innermost containing group's boundaries (with clearance)
        // Note: Groups should have enough right padding reserved for avoidance paths
        // since avoidance paths always go right
        let minAllowedX = -Infinity;
        let maxAllowedX = Infinity;

        if (containingGroups.length > 0) {
            // The first one is the innermost common ancestor
            const innermostContainer = containingGroups[0];
            const containerBox = boxes.find((b) => b.id === innermostContainer);
            if (containerBox) {
                // Must stay MARGIN inside the container boundaries
                minAllowedX = containerBox.x + MARGIN;
                maxAllowedX =
                    containerBox.x + containerBox.width - MARGIN;
            }
        }

        // Filter to only obstacles that are between source and target vertically
        // and could potentially block our path
        const relevantObstacles = allObstacles.filter((box) => {
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

            // Check if we actually need to go around this box
            // (our current X position would pass through it)
            const wouldPassThrough =
                currentX > boxLeft &&
                currentX < boxRight &&
                currentY < boxBottom &&
                tgtY > boxTop;

            if (!wouldPassThrough) continue;

            // ALWAYS go RIGHT for avoidance paths - this ensures consistent behavior
            // and guarantees the layout has reserved enough space on the right side
            let finalX = boxRight;

            // Clamp finalX to stay within the containing group's boundaries
            finalX = Math.max(finalX, minAllowedX);
            finalX = Math.min(finalX, maxAllowedX);

            // Calculate "smart" split point - align with where sibling edges going INTO this group would turn
            // For edges entering a group, the turn point is: entryBox.y - MARGIN
            // This is the same calculation used in getPath() for entryGroups
            const siblingTurnY = box.y - MARGIN;

            // Use the sibling turn point if it's above the source with enough space
            // Otherwise fall back to MARGIN above the box
            let splitY: number;
            if (siblingTurnY > srcY + 20) {
                // Sibling turn point is safely below the source - use it
                splitY = siblingTurnY;
            } else {
                // Sibling turn would be too close to source - use clearance
                splitY = boxTop - MARGIN;
            }

            // Make sure splitY is below current position
            splitY = Math.max(splitY, currentY + 20);
            if (splitY > currentY) {
                waypoints.push({ x: currentX, y: splitY });
                currentY = splitY;
            }

            // Go around the box using the calculated side
            waypoints.push({ x: finalX, y: currentY });
            
            // KEY FIX: Don't go all the way to boxBottom if target is above boxBottom
            // This prevents the edge from going below the target and then back up
            // Check if the target X is now reachable without going through any more obstacles
            
            if (tgtY < boxBottom && tgtX >= finalX - MARGIN) {
                // Target is above boxBottom and to the right of our current position
                // We can go directly to target Y level without going to boxBottom
                currentX = finalX;
                // Don't update currentY to boxBottom - keep it at splitY
            } else {
                // Need to go all the way around
                waypoints.push({ x: finalX, y: boxBottom });
                currentX = finalX;
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
