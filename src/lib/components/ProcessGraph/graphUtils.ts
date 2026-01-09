import type { Process, ProcessNodeData } from './types';
import type { Node, Edge } from '@xyflow/svelte';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import { writable } from 'svelte/store';

// Node dimensions - constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GROUP_PADDING = 40;  // Global margin for groups
const GROUP_HEADER = 40;
const PORT_SIZE = 1; // Invisible port nodes for entry/exit points
const TURN_CLEARANCE = 40; // Minimum distance from group boundary for edge turns and avoidance paths
const GLOBAL_MARGIN = 40; // Global margin respected everywhere

const elk = new ELK();

// Exported store for group bounding boxes - used by ElkEdge for obstacle avoidance
export interface GroupBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    collapsed: boolean;
}
export const groupBoxesStore = writable<GroupBox[]>([]);

// Store for group entry/exit port positions
export interface GroupPort {
    groupId: string;
    type: 'entry' | 'exit';
    x: number;
    y: number;
}
export const groupPortsStore = writable<Map<string, GroupPort>>(new Map());

// Store for edge confluence points - used to align edges branching from or joining to the same node
// Key: nodeId, Value: { branchY: Y position where outgoing edges should branch, joinY: Y position where incoming edges should join }
export interface ConfluencePoints {
    branchY?: number;  // Y position where edges leaving this node should branch out
    joinY?: number;    // Y position where edges entering this node should join
}
export const confluencePointsStore = writable<Map<string, ConfluencePoints>>(new Map());

// Store for currently hovered node - used to highlight connected edges
export const hoveredNodeStore = writable<string | null>(null);

// Store for currently focused (zoomed) node - used to toggle zoom behavior
export const focusedNodeStore = writable<string | null>(null);

/**
 * Find the common ancestor group of two groups (or 'root' if none)
 */
function findCommonAncestor(group1: string, group2: string): string {
    if (group1 === 'root' || group2 === 'root') return 'root';
    if (group1 === group2) return group1;

    const parts1 = group1.split('.');
    const parts2 = group2.split('.');

    const commonParts: string[] = [];
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
        if (parts1[i] === parts2[i]) {
            commonParts.push(parts1[i]);
        } else {
            break;
        }
    }

    return commonParts.length > 0 ? commonParts.join('.') : 'root';
}

/**
 * Get edges that should be laid out at a specific group level
 * These are edges where both source and target are direct children of the group
 */
function getEdgesForGroupLevel(
    groupId: string,
    groups: Map<string, GroupInfo>,
    edgesInGroup: Map<string, { sources: string[]; targets: string[] }[]>
): ElkExtendedEdge[] {
    const edges: ElkExtendedEdge[] = [];
    const groupEdges = edgesInGroup.get(groupId) || [];

    groupEdges.forEach((edge, idx) => {
        const sourceId = edge.sources[0];
        const targetId = edge.targets[0];

        // Get the direct child representation for source and target
        const sourceChild = getDirectChildId(sourceId, groupId, groups);
        const targetChild = getDirectChildId(targetId, groupId, groups);

        if (sourceChild && targetChild) {
            edges.push({
                id: `${groupId}-edge-${idx}`,
                sources: [sourceChild],
                targets: [targetChild]
            });
        }
    });

    return edges;
}

/**
 * Get the direct child ID of a process/group relative to a parent group
 */
function getDirectChildId(nodeId: string, parentGroupId: string, groups: Map<string, GroupInfo>): string | null {
    const nodeGroup = extractGroup(nodeId);

    if (parentGroupId === 'root') {
        // Direct child is either the process itself (if root level) or the first-level group
        if (nodeGroup === 'root') {
            return nodeId; // Root-level process
        }
        const firstPart = nodeGroup.split('.')[0];
        return `group-${firstPart}`;
    }

    // Check if node is directly in this group
    const group = groups.get(parentGroupId);
    if (!group) return null;

    if (group.processes.includes(nodeId)) {
        return nodeId;
    }

    // Check if node is in a direct child group
    for (const childGroupId of group.childGroups) {
        const childGroup = groups.get(childGroupId);
        if (childGroup) {
            if (childGroup.processes.includes(nodeId) || nodeGroup.startsWith(childGroupId + '.') || nodeGroup === childGroupId) {
                return `group-${childGroupId}`;
            }
        }
    }

    // Node might be a process directly in this group
    if (nodeGroup === parentGroupId) {
        return nodeId;
    }

    return null;
}

/**
 * Layout a single group using ELK
 * This is called bottom-up (deepest groups first) so child sizes are already computed
 */
async function layoutGroup(
    group: GroupInfo,
    allGroups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>,
    groupSizes: Map<string, { width: number; height: number }>,
    edgesInGroup: Map<string, { sources: string[]; targets: string[] }[]>,
    groupInternalLayouts: Map<string, Map<string, { x: number; y: number; width: number; height: number }>>,
    collapsedGroups: Set<string> = new Set()
): Promise<{ width: number; height: number }> {
    const children: ElkNode[] = [];

    // Add direct child groups (using their pre-computed sizes from bottom-up layout)
    group.childGroups.forEach(childGroupId => {
        const childGroupNodeId = `group-${childGroupId}`;
        if (collapsedGroups.has(childGroupNodeId)) {
            // This child is collapsed, include it with collapsed size
            children.push({
                id: childGroupNodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT
            });
        } else {
            const size = groupSizes.get(childGroupId);
            if (size) {
                children.push({
                    id: childGroupNodeId,
                    width: size.width,
                    height: size.height
                });
            }
        }
    });

    // Add direct processes
    group.processes.forEach(pName => {
        children.push({
            id: pName,
            width: nodeWidths.get(pName) || NODE_WIDTH,
            height: NODE_HEIGHT
        });
    });

    // Get edges internal to this group level
    const edges = getEdgesForGroupLevel(group.id, allGroups, edgesInGroup);

    const elkGraph: ElkNode = {
        id: `layout-${group.id}`,
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '60',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN),
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.padding': `[top=${GROUP_HEADER + GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
        },
        children,
        edges
    };

    const layouted = await elk.layout(elkGraph);

    // Store internal layout positions
    const internalLayout = new Map<string, { x: number; y: number; width: number; height: number }>();
    layouted.children?.forEach(child => {
        internalLayout.set(child.id, {
            x: child.x || 0,
            y: child.y || 0,
            width: child.width || 0,
            height: child.height || 0
        });
    });
    groupInternalLayouts.set(group.id, internalLayout);

    return {
        width: layouted.width || 200,
        height: layouted.height || 100
    };
}

/**
 * Layout the root level
 */
async function layoutRoot(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>,
    groupSizes: Map<string, { width: number; height: number }>,
    edgesInGroup: Map<string, { sources: string[]; targets: string[] }[]>,
    collapsedGroups: Set<string> = new Set()
): Promise<Map<string, { x: number; y: number; width: number; height: number }>> {
    const children: ElkNode[] = [];

    // Add root-level processes
    processes.forEach(p => {
        if (!p.name.includes('.')) {
            children.push({
                id: p.name,
                width: nodeWidths.get(p.name) || NODE_WIDTH,
                height: NODE_HEIGHT
            });
        }
    });

    // Add root-level groups
    const rootGroups = Array.from(groups.values()).filter(g => !g.parentId);
    rootGroups.forEach(group => {
        const groupNodeId = `group-${group.id}`;
        if (collapsedGroups.has(groupNodeId)) {
            children.push({
                id: groupNodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT
            });
        } else {
            const size = groupSizes.get(group.id);
            if (size) {
                children.push({
                    id: groupNodeId,
                    width: size.width,
                    height: size.height
                });
            }
        }
    });

    // Get edges at root level
    const edges = getEdgesForGroupLevel('root', groups, edgesInGroup);

    const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN + 10),
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.padding': `[top=${GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
        },
        children,
        edges
    };

    const layouted = await elk.layout(elkGraph);

    const rootLayout = new Map<string, { x: number; y: number; width: number; height: number }>();
    layouted.children?.forEach(child => {
        rootLayout.set(child.id, {
            x: child.x || 0,
            y: child.y || 0,
            width: child.width || 0,
            height: child.height || 0
        });
    });

    return rootLayout;
}

/**
 * Build Svelte Flow nodes and edges from the hierarchical layouts
 */
function buildSvelteFlowFromLayouts(
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    rootLayout: Map<string, { x: number; y: number; width: number; height: number }>,
    groupInternalLayouts: Map<string, Map<string, { x: number; y: number; width: number; height: number }>>,
    groupSizes: Map<string, { width: number; height: number }>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Sort groups by depth (shallowest first for proper parent-child relationship)
    const sortedGroups = Array.from(groups.values()).sort((a, b) => a.path.length - b.path.length);

    // Create group nodes
    sortedGroups.forEach(group => {
        const size = groupSizes.get(group.id);
        if (!size) return;

        let position: { x: number; y: number };

        if (!group.parentId) {
            // Root-level group
            const layout = rootLayout.get(`group-${group.id}`);
            position = { x: layout?.x || 0, y: layout?.y || 0 };
        } else {
            // Nested group - get position from parent's internal layout
            const parentLayout = groupInternalLayouts.get(group.parentId);
            const myLayout = parentLayout?.get(`group-${group.id}`);
            position = { x: myLayout?.x || 0, y: myLayout?.y || 0 };
        }

        nodes.push({
            id: `group-${group.id}`,
            type: 'group',
            position,
            data: {
                label: group.path[group.path.length - 1],
                fullPath: group.path.join('.')
            },
            style: `width: ${size.width}px; height: ${size.height}px;`,
            ...(group.parentId && { parentId: `group-${group.parentId}` })
        });
    });

    // Create process nodes
    processes.forEach(process => {
        const groupPath = extractGroup(process.name);
        const parentGroupId = groupPath !== 'root' ? `group-${groupPath}` : undefined;

        let position: { x: number; y: number };

        if (groupPath === 'root') {
            // Root-level process
            const layout = rootLayout.get(process.name);
            position = { x: layout?.x || 0, y: layout?.y || 0 };
        } else {
            // Process in a group - get position from group's internal layout
            const groupLayout = groupInternalLayouts.get(groupPath);
            const myLayout = groupLayout?.get(process.name);
            position = { x: myLayout?.x || 0, y: myLayout?.y || 0 };
        }

        nodes.push({
            id: process.name,
            type: 'process',
            position,
            data: {
                label: process.name,
                status: process.status,
                errorMessage: process.last_run_error_message,
                group: groupPath
            } satisfies ProcessNodeData,
            ...(parentGroupId && { parentId: parentGroupId })
        });
    });

    // Create edges
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const sourceStatus = processMap.get(upstream)?.status || 'NOTSTARTED';
            const targetStatus = process.status;

            edges.push({
                id: `${upstream}->${process.name}`,
                source: upstream,
                target: process.name,
                type: 'smoothstep',
                animated: targetStatus === 'INPROGRESS',
                style: getEdgeStyle(sourceStatus, targetStatus)
            });
        });
    });

    return { nodes, edges };
}

/**
 * Build Svelte Flow nodes and edges from the hierarchical layouts (with collapse support)
 */
function buildSvelteFlowFromLayoutsWithCollapse(
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    rootLayout: Map<string, { x: number; y: number; width: number; height: number }>,
    groupInternalLayouts: Map<string, Map<string, { x: number; y: number; width: number; height: number }>>,
    groupSizes: Map<string, { width: number; height: number }>,
    collapsedGroups: Set<string>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Sort groups by depth (shallowest first for proper parent-child relationship)
    const sortedGroups = Array.from(groups.values()).sort((a, b) => a.path.length - b.path.length);

    // Track which groups to show (not inside a collapsed parent)
    const visibleGroups = new Set<string>();

    // Create group nodes
    sortedGroups.forEach(group => {
        const groupNodeId = `group-${group.id}`;

        // Check if this group is inside a collapsed ancestor
        const isInsideCollapsed = group.parentId && isGroupInsideCollapsed(group.parentId, collapsedGroups);
        if (isInsideCollapsed) {
            return; // Skip - this group is hidden inside a collapsed parent
        }

        visibleGroups.add(group.id);

        const isCollapsed = collapsedGroups.has(groupNodeId);
        const size = isCollapsed
            ? { width: COLLAPSED_GROUP_WIDTH, height: COLLAPSED_GROUP_HEIGHT }
            : groupSizes.get(group.id);

        if (!size) return;

        let position: { x: number; y: number };

        if (!group.parentId) {
            // Root-level group
            const layout = rootLayout.get(groupNodeId);
            position = { x: layout?.x || 0, y: layout?.y || 0 };
        } else {
            // Nested group - get position from parent's internal layout
            const parentLayout = groupInternalLayouts.get(group.parentId);
            const myLayout = parentLayout?.get(groupNodeId);
            position = { x: myLayout?.x || 0, y: myLayout?.y || 0 };
        }

        nodes.push({
            id: groupNodeId,
            type: 'group',
            position,
            data: {
                label: group.path[group.path.length - 1],
                fullPath: group.path.join('.'),
                collapsed: isCollapsed
            },
            style: `width: ${size.width}px; height: ${size.height}px;`,
            ...(group.parentId && { parentId: `group-${group.parentId}` })
        });
    });

    // Create process nodes (only if not inside collapsed group)
    processes.forEach(process => {
        const groupPath = extractGroup(process.name);

        // Check if this process is inside a collapsed group
        const collapsedParent = isInsideCollapsedGroup(process.name, collapsedGroups, groups);
        if (collapsedParent) {
            return; // Skip - this process is hidden inside a collapsed group
        }

        const parentGroupId = groupPath !== 'root' ? `group-${groupPath}` : undefined;

        let position: { x: number; y: number };

        if (groupPath === 'root') {
            // Root-level process
            const layout = rootLayout.get(process.name);
            position = { x: layout?.x || 0, y: layout?.y || 0 };
        } else {
            // Process in a group - get position from group's internal layout
            const groupLayout = groupInternalLayouts.get(groupPath);
            const myLayout = groupLayout?.get(process.name);
            position = { x: myLayout?.x || 0, y: myLayout?.y || 0 };
        }

        nodes.push({
            id: process.name,
            type: 'process',
            position,
            data: {
                label: process.name,
                status: process.status,
                errorMessage: process.last_run_error_message,
                group: groupPath
            } satisfies ProcessNodeData,
            ...(parentGroupId && { parentId: parentGroupId })
        });
    });

    // Create edges (redirecting to collapsed groups when needed)
    const addedEdges = new Set<string>(); // Avoid duplicate edges

    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            // Get effective source and target (may be redirected to collapsed group)
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            // Skip self-loops (when both ends collapse to same group)
            if (effectiveSource === effectiveTarget) return;

            const edgeId = `${effectiveSource}->${effectiveTarget}`;
            if (addedEdges.has(edgeId)) return; // Skip duplicates
            addedEdges.add(edgeId);

            const sourceStatus = processMap.get(upstream)?.status || 'NOTSTARTED';
            const targetStatus = process.status;

            edges.push({
                id: edgeId,
                source: effectiveSource,
                target: effectiveTarget,
                type: 'smoothstep',
                animated: targetStatus === 'INPROGRESS',
                style: getEdgeStyle(sourceStatus, targetStatus)
            });
        });
    });

    return { nodes, edges };
}

/**
 * Check if a group ID is inside a collapsed ancestor
 */
function isGroupInsideCollapsed(groupId: string, collapsedGroups: Set<string>): boolean {
    const parts = groupId.split('.');
    for (let i = 1; i <= parts.length; i++) {
        const ancestorGroup = parts.slice(0, i).join('.');
        if (collapsedGroups.has(`group-${ancestorGroup}`)) {
            return true;
        }
    }
    return false;
}

/**
 * Standard node width
 */
function calculateNodeWidth(_processName: string): number {
    return NODE_WIDTH;
}

// Collapsed group dimensions
const COLLAPSED_GROUP_WIDTH = 280;
const COLLAPSED_GROUP_HEIGHT = 60;

/**
 * Check if a process or group is inside a collapsed group
 */
function isInsideCollapsedGroup(nodeId: string, collapsedGroups: Set<string>, groups: Map<string, GroupInfo>): string | null {
    const nodeGroup = extractGroup(nodeId);
    if (nodeGroup === 'root') return null;

    // Check if this node's group or any ancestor is collapsed
    const parts = nodeGroup.split('.');
    for (let i = 1; i <= parts.length; i++) {
        const ancestorGroup = parts.slice(0, i).join('.');
        if (collapsedGroups.has(`group-${ancestorGroup}`)) {
            return `group-${ancestorGroup}`;
        }
    }
    return null;
}

/**
 * Get the effective node ID for edge routing (redirects to collapsed group if needed)
 */
function getEffectiveNodeId(nodeId: string, collapsedGroups: Set<string>, groups: Map<string, GroupInfo>): string {
    const collapsedParent = isInsideCollapsedGroup(nodeId, collapsedGroups, groups);
    return collapsedParent || nodeId;
}

/**
 * Get the group hierarchy for a node (returns array from innermost to outermost)
 */
function getGroupHierarchyForNode(nodeId: string): string[] {
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

/**
 * Check if node is inside a group (at any level)
 */
function isNodeInsideGroup(nodeId: string, groupId: string): boolean {
    const hierarchy = getGroupHierarchyForNode(nodeId);
    return hierarchy.includes(groupId);
}

/**
 * Analyze edges after initial layout and calculate required group width expansions
 * for avoidance paths that would otherwise violate parent group boundaries.
 * 
 * IMPORTANT: Avoidance paths ALWAYS go to the RIGHT. This ensures consistent
 * layout behavior and guarantees enough space is reserved.
 */
function calculateAvoidanceExpansions(
    absolutePositions: Map<string, { x: number; y: number; width: number; height: number }>,
    processes: Process[],
    groups: Map<string, GroupInfo>,
    collapsedGroups: Set<string>
): Map<string, number> {
    const expansions = new Map<string, number>(); // groupId -> additional width needed on RIGHT side

    // Build edges list
    interface EdgeInfo {
        sourceId: string;
        targetId: string;
        sourcePos: { x: number; y: number; width: number; height: number };
        targetPos: { x: number; y: number; width: number; height: number };
    }

    const edges: EdgeInfo[] = [];
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            if (effectiveSource === effectiveTarget) return;

            const sourcePos = absolutePositions.get(effectiveSource);
            const targetPos = absolutePositions.get(effectiveTarget);

            if (sourcePos && targetPos) {
                edges.push({
                    sourceId: effectiveSource,
                    targetId: effectiveTarget,
                    sourcePos,
                    targetPos
                });
            }
        });
    });

    // For each edge, check if it needs an avoidance path that would violate parent boundaries
    edges.forEach(edge => {
        const { sourceId, targetId, sourcePos, targetPos } = edge;

        const srcCenterX = sourcePos.x + sourcePos.width / 2;
        const srcBottomY = sourcePos.y + sourcePos.height;
        const tgtCenterX = targetPos.x + targetPos.width / 2;
        const tgtTopY = targetPos.y;

        // Find containing groups (groups that contain both source and target)
        const sourceHierarchy = getGroupHierarchyForNode(sourceId);
        const targetHierarchy = getGroupHierarchyForNode(targetId);
        const containingGroups = sourceHierarchy.filter(g => targetHierarchy.includes(g));

        // Find groups that are obstacles (between source and target, not containing them)
        const obstacleGroups: Array<{ id: string; pos: { x: number; y: number; width: number; height: number } }> = [];

        absolutePositions.forEach((pos, id) => {
            if (!id.startsWith('group-')) return;

            // Skip if this group contains source or target
            if (isNodeInsideGroup(sourceId, id) || isNodeInsideGroup(targetId, id)) return;
            if (sourceId === id || targetId === id) return;

            // Skip collapsed groups' children
            if (collapsedGroups.has(id)) return;

            // Check if the group is in the path's Y range
            const boxTop = pos.y - TURN_CLEARANCE;
            const boxBottom = pos.y + pos.height + TURN_CLEARANCE;

            if (boxBottom < srcBottomY || boxTop > tgtTopY) return;

            // Check if the group could be an obstacle (horizontally in the way)
            const boxLeft = pos.x - TURN_CLEARANCE;
            const boxRight = pos.x + pos.width + TURN_CLEARANCE;

            const pathMinX = Math.min(srcCenterX, tgtCenterX);
            const pathMaxX = Math.max(srcCenterX, tgtCenterX);

            // If box overlaps with the path's X range
            if (boxRight >= pathMinX && boxLeft <= pathMaxX) {
                obstacleGroups.push({ id, pos });
            }
        });

        // If there are obstacles, calculate avoidance path requirements
        if (obstacleGroups.length === 0) return;

        // For each obstacle, the avoidance path ALWAYS goes RIGHT
        obstacleGroups.forEach(obstacle => {
            const boxRight = obstacle.pos.x + obstacle.pos.width + TURN_CLEARANCE;

            // Avoidance path always goes to the right of the obstacle
            const avoidanceX = boxRight;

            // Check if this avoidance path would violate any containing group's boundary
            if (containingGroups.length > 0) {
                const innermostContainer = containingGroups[0];
                const containerPos = absolutePositions.get(innermostContainer);

                if (containerPos) {
                    const containerRight = containerPos.x + containerPos.width - TURN_CLEARANCE;

                    // Calculate how much we'd violate the right boundary
                    if (avoidanceX > containerRight) {
                        const violation = avoidanceX - containerRight;
                        // We need to expand the container group's right padding
                        const containerId = innermostContainer.replace('group-', '');
                        const currentExpansion = expansions.get(containerId) || 0;
                        // Add TURN_CLEARANCE extra to ensure comfortable spacing
                        const neededExpansion = violation + TURN_CLEARANCE;
                        expansions.set(containerId, Math.max(currentExpansion, neededExpansion));
                    }
                }
            }
        });
    });

    return expansions;
}

/**
 * Post-process ELK layout to center children within their parent groups.
 * This centers the content horizontally within each group's available space.
 * 
 * For proper visual alignment, we also need to align nodes with their
 * upstream/downstream connections where possible.
 */
function centerChildrenInGroups(elkGraph: ElkNode): void {
    // First pass: Calculate absolute positions for all nodes
    const absolutePositions = new Map<string, { x: number; y: number; width: number; height: number; parentId?: string }>();

    function calculatePositions(node: ElkNode, offsetX: number = 0, offsetY: number = 0, parentId?: string): void {
        if (!node.children) return;

        node.children.forEach(child => {
            const absX = offsetX + (child.x || 0);
            const absY = offsetY + (child.y || 0);
            absolutePositions.set(child.id, {
                x: absX,
                y: absY,
                width: child.width || 0,
                height: child.height || 0,
                parentId
            });

            if (child.id.startsWith('group-') && child.children) {
                calculatePositions(child, absX, absY, child.id);
            }
        });
    }

    calculatePositions(elkGraph);

    // Build edge map: target -> sources
    const incomingEdges = new Map<string, string[]>();

    function collectEdges(node: ElkNode): void {
        if (node.edges) {
            node.edges.forEach(edge => {
                const target = edge.targets[0];
                const source = edge.sources[0];
                if (!incomingEdges.has(target)) {
                    incomingEdges.set(target, []);
                }
                incomingEdges.get(target)!.push(source);
            });
        }
        if (node.children) {
            node.children.forEach(child => {
                if (child.id.startsWith('group-')) {
                    collectEdges(child);
                }
            });
        }
    }

    collectEdges(elkGraph);

    // Second pass: Center children and align with upstream where possible
    function processNode(node: ElkNode): void {
        if (!node.children || node.children.length === 0) {
            return;
        }

        // First, recursively process all child groups (bottom-up)
        node.children.forEach(child => {
            if (child.id.startsWith('group-') && child.children && child.children.length > 0) {
                processNode(child);
            }
        });

        // Group children by their Y position (layer)
        // Items with overlapping Y ranges should be in the same layer
        const layerMap = new Map<number, ElkNode[]>();

        // First, sort children by Y position
        const sortedChildren = [...node.children].sort((a, b) => (a.y || 0) - (b.y || 0));

        // Group items that overlap vertically into the same layer
        let currentLayerY = -Infinity;
        let currentLayerMaxY = -Infinity;

        sortedChildren.forEach(child => {
            const childY = child.y || 0;
            const childHeight = child.height || 0;
            const childBottomY = childY + childHeight;

            // If this child's top is within the current layer's range, add to current layer
            // Allow some tolerance for items that are "close enough" to be in the same visual row
            const LAYER_TOLERANCE = 50; // Items within 50px of each other are considered same layer

            if (childY <= currentLayerMaxY + LAYER_TOLERANCE) {
                // Extend current layer
                currentLayerMaxY = Math.max(currentLayerMaxY, childBottomY);
            } else {
                // Start a new layer
                currentLayerY = childY;
                currentLayerMaxY = childBottomY;
            }

            // Use the layer's starting Y as the key
            const roundedLayerY = Math.round(currentLayerY / 10) * 10;
            if (!layerMap.has(roundedLayerY)) {
                layerMap.set(roundedLayerY, []);
            }
            layerMap.get(roundedLayerY)!.push(child);
        });

        console.log(`[Centering ${node.id}] Layers:`, Array.from(layerMap.entries()).map(([y, nodes]) =>
            `y=${y}: [${nodes.map(n => `${n.id}(x=${n.x},w=${n.width})`).join(', ')}]`
        ));

        // For each layer, try to center it based on connections or parent center
        const nodeWidth = node.width || 0;
        const nodeCenterX = nodeWidth / 2;

        const sortedLayers = Array.from(layerMap.keys()).sort((a, b) => a - b);

        sortedLayers.forEach((layerY, layerIndex) => {
            const layerNodes = layerMap.get(layerY)!;

            // Sort nodes by X position to maintain order
            layerNodes.sort((a, b) => (a.x || 0) - (b.x || 0));

            // Calculate layer bounding box
            let layerMinX = Infinity;
            let layerMaxX = -Infinity;
            layerNodes.forEach(child => {
                layerMinX = Math.min(layerMinX, child.x || 0);
                layerMaxX = Math.max(layerMaxX, (child.x || 0) + (child.width || 0));
            });

            const layerWidth = layerMaxX - layerMinX;
            const layerCenterX = layerMinX + layerWidth / 2;

            console.log(`  Layer ${layerIndex} (y=${layerY}): nodes=${layerNodes.map(n => n.id).join(',')}, minX=${layerMinX}, maxX=${layerMaxX}, layerWidth=${layerWidth}, layerCenterX=${layerCenterX}`);

            // Determine target center for this layer
            let targetCenterX = nodeCenterX;

            // For layers in root, try to align with upstream nodes
            // For layers inside groups, just center within the parent (the parent group itself will align to upstream)
            if (node.id === 'root' && layerIndex > 0) {
                // Check if nodes in this layer have incoming edges from previous layers
                let sumUpstreamCenterX = 0;
                let upstreamCount = 0;

                layerNodes.forEach(layerNode => {
                    const nodeIncoming = incomingEdges.get(layerNode.id) || [];
                    nodeIncoming.forEach(srcId => {
                        const srcPos = absolutePositions.get(srcId);
                        if (srcPos) {
                            sumUpstreamCenterX += srcPos.x + srcPos.width / 2;
                            upstreamCount++;
                        }
                    });
                });

                if (upstreamCount > 0) {
                    targetCenterX = sumUpstreamCenterX / upstreamCount;
                }
            }

            // Clamp target center to keep layer within padding bounds
            const leftPadding = GLOBAL_MARGIN;
            const rightPadding = GLOBAL_MARGIN;
            const minLayerCenter = leftPadding + layerWidth / 2;
            const maxLayerCenter = nodeWidth - rightPadding - layerWidth / 2;
            targetCenterX = Math.max(minLayerCenter, Math.min(maxLayerCenter, targetCenterX));

            // Calculate shift
            const shiftX = targetCenterX - layerCenterX;

            if (Math.abs(shiftX) > 1) {
                layerNodes.forEach(child => {
                    child.x = (child.x || 0) + shiftX;

                    // Update absolute position for this child and all its descendants
                    updateAbsolutePositions(child.id, shiftX);
                });
            }
        });

        // Helper function to recursively update absolute positions after a shift
        function updateAbsolutePositions(nodeId: string, shiftX: number): void {
            const absPos = absolutePositions.get(nodeId);
            if (absPos) {
                absPos.x += shiftX;

                // If this is a group, also update all descendants
                if (nodeId.startsWith('group-')) {
                    absolutePositions.forEach((pos, id) => {
                        if (pos.parentId === nodeId) {
                            updateAbsolutePositions(id, shiftX);
                        }
                    });
                }
            }
        }
    }

    // Start processing from the root
    processNode(elkGraph);
}

/**
 * Build a unified hierarchical ELK graph with all nodes and edges
 * This allows ELK to properly route edges around group boundaries
 * 
 * Key approach: Build deepest groups first (bottom-up), then parent groups.
 * Reserved space for avoidance paths is added as extra right padding on groups
 * that have edges bypassing them.
 */
function buildUnifiedElkGraph(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>,
    collapsedGroups: Set<string>
): ElkNode {
    const graph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.spacing.edgeNodeBetweenLayers': '30',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN + 10),
            'elk.spacing.edgeEdge': '20',
            'elk.spacing.edgeNode': '30',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.padding': `[top=${GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.edgeRouting': 'ORTHOGONAL'
        },
        children: [],
        edges: []
    };

    // Pre-calculate which groups need extra right padding for avoidance paths
    // A group needs extra right padding if there's an edge that:
    // 1. Starts from inside the group (or the group itself)
    // 2. Goes to a node that is NOT inside the group
    // 3. The target is positioned such that the edge needs to go around the group
    const groupsNeedingAvoidanceSpace = calculateGroupsNeedingAvoidanceSpace(processes, groups, collapsedGroups);

    // Build group nodes recursively with proper bottom-up sizing
    function buildGroupNode(group: GroupInfo): ElkNode {
        const groupNodeId = `group-${group.id}`;
        const isCollapsed = collapsedGroups.has(groupNodeId);

        if (isCollapsed) {
            // Collapsed group is a simple node
            return {
                id: groupNodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT,
                layoutOptions: {
                    'elk.portConstraints': 'FREE'
                }
            };
        }

        // Check if this group needs extra right padding for avoidance paths
        const needsAvoidanceSpace = groupsNeedingAvoidanceSpace.has(group.id);
        const rightPadding = needsAvoidanceSpace ? GLOBAL_MARGIN + TURN_CLEARANCE : GLOBAL_MARGIN;

        const elkGroup: ElkNode = {
            id: groupNodeId,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.layered.spacing.nodeNodeBetweenLayers': '60',
                'elk.spacing.nodeNode': String(GLOBAL_MARGIN),
                'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
                'elk.padding': `[top=${GROUP_HEADER + GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${rightPadding}]`,
                'elk.alignment': 'CENTER',
                'elk.contentAlignment': 'H_CENTER V_TOP'
            },
            children: [],
            labels: [{ text: group.path[group.path.length - 1] }]
        };

        // Add child groups (these will be recursively built bottom-up by ELK)
        group.childGroups.forEach(childGroupId => {
            const childGroup = groups.get(childGroupId);
            if (childGroup) {
                elkGroup.children!.push(buildGroupNode(childGroup));
            }
        });

        // Add processes directly in this group
        group.processes.forEach(pName => {
            elkGroup.children!.push({
                id: pName,
                width: nodeWidths.get(pName) || NODE_WIDTH,
                height: NODE_HEIGHT
            });
        });

        return elkGroup;
    }

    // Add root-level processes
    processes.forEach(p => {
        if (!p.name.includes('.')) {
            graph.children!.push({
                id: p.name,
                width: nodeWidths.get(p.name) || NODE_WIDTH,
                height: NODE_HEIGHT
            });
        }
    });

    // Add root-level groups
    const rootGroups = Array.from(groups.values()).filter(g => !g.parentId);
    rootGroups.sort((a, b) => a.id.localeCompare(b.id));
    rootGroups.forEach(group => {
        graph.children!.push(buildGroupNode(group));
    });

    // Add ALL edges at the root level - ELK with INCLUDE_CHILDREN will route them
    const edges: ElkExtendedEdge[] = [];
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            // Get effective IDs (redirect to collapsed groups if needed)
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            // Skip self-loops
            if (effectiveSource === effectiveTarget) return;

            edges.push({
                id: `${effectiveSource}->${effectiveTarget}`,
                sources: [effectiveSource],
                targets: [effectiveTarget]
            });
        });
    });
    graph.edges = edges;

    return graph;
}

/**
 * Calculate which groups need extra right padding for avoidance paths.
 * A group needs avoidance space if there's an edge that bypasses it
 * (source before group, target after group, and neither inside the group)
 */
function calculateGroupsNeedingAvoidanceSpace(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    collapsedGroups: Set<string>
): Set<string> {
    const needsSpace = new Set<string>();

    // Build a map of which group each process belongs to
    const processToGroup = new Map<string, string>();
    processes.forEach(p => {
        const group = extractGroup(p.name);
        processToGroup.set(p.name, group);
    });

    // For each edge, check if it needs to bypass any groups
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            if (effectiveSource === effectiveTarget) return;

            const sourceGroup = effectiveSource.startsWith('group-')
                ? effectiveSource.replace('group-', '')
                : processToGroup.get(effectiveSource) || 'root';
            const targetGroup = effectiveTarget.startsWith('group-')
                ? effectiveTarget.replace('group-', '')
                : processToGroup.get(effectiveTarget) || 'root';

            // Find common ancestor
            const commonAncestor = findCommonAncestor(sourceGroup, targetGroup);

            // Check all groups - any group that is:
            // 1. At the same level or below the common ancestor
            // 2. Not containing source or target
            // ... might need avoidance space
            groups.forEach((group, groupId) => {
                // Skip if this group contains source or target
                if (sourceGroup === groupId || sourceGroup.startsWith(groupId + '.')) return;
                if (targetGroup === groupId || targetGroup.startsWith(groupId + '.')) return;

                // Skip collapsed groups
                if (collapsedGroups.has(`group-${groupId}`)) return;

                // If this group is a sibling of source/target path, it may need avoidance space
                // Check if it's under the common ancestor but not in source/target path
                if (commonAncestor === 'root' || groupId.startsWith(commonAncestor + '.') || commonAncestor.startsWith(groupId)) {
                    // This group might be bypassed by the edge
                    // Mark it and all its ancestors up to common ancestor
                    let current = groupId;
                    while (current && current !== 'root') {
                        if (current !== sourceGroup && current !== targetGroup &&
                            !sourceGroup.startsWith(current + '.') && !targetGroup.startsWith(current + '.')) {
                            needsSpace.add(current);
                        }
                        const parts = current.split('.');
                        if (parts.length <= 1) break;
                        current = parts.slice(0, -1).join('.');
                    }
                }
            });
        });
    });

    return needsSpace;
}

/**
 * Build unified ELK graph with expanded padding for groups that need more space for avoidance paths
 * Always adds padding to the RIGHT side (avoidance paths always go right)
 */
function buildUnifiedElkGraphWithExpansions(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>,
    collapsedGroups: Set<string>,
    expansions: Map<string, number> // groupId -> additional width needed on RIGHT side
): ElkNode {
    const graph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.spacing.edgeNodeBetweenLayers': '30',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN + 10),
            'elk.spacing.edgeEdge': '20',
            'elk.spacing.edgeNode': '30',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.padding': `[top=${GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.edgeRouting': 'ORTHOGONAL'
        },
        children: [],
        edges: []
    };

    // Build group nodes recursively, applying padding expansions where needed
    function buildGroupNode(group: GroupInfo): ElkNode {
        const groupNodeId = `group-${group.id}`;
        const isCollapsed = collapsedGroups.has(groupNodeId);

        if (isCollapsed) {
            return {
                id: groupNodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT,
                layoutOptions: {
                    'elk.portConstraints': 'FREE'
                }
            };
        }

        // Check if this group needs expanded RIGHT padding for avoidance paths
        const expansion = expansions.get(group.id) || 0;
        const rightPadding = GLOBAL_MARGIN + expansion;

        const elkGroup: ElkNode = {
            id: groupNodeId,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.layered.spacing.nodeNodeBetweenLayers': '60',
                'elk.spacing.nodeNode': String(GLOBAL_MARGIN),
                'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
                'elk.padding': `[top=${GROUP_HEADER + GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${rightPadding}]`,
                'elk.alignment': 'CENTER',
                'elk.contentAlignment': 'H_CENTER V_TOP'
            },
            children: [],
            labels: [{ text: group.path[group.path.length - 1] }]
        };

        // Add child groups
        group.childGroups.forEach(childGroupId => {
            const childGroup = groups.get(childGroupId);
            if (childGroup) {
                elkGroup.children!.push(buildGroupNode(childGroup));
            }
        });

        // Add processes directly in this group
        group.processes.forEach(pName => {
            elkGroup.children!.push({
                id: pName,
                width: nodeWidths.get(pName) || NODE_WIDTH,
                height: NODE_HEIGHT
            });
        });

        return elkGroup;
    }

    // Add root-level processes
    processes.forEach(p => {
        if (!p.name.includes('.')) {
            graph.children!.push({
                id: p.name,
                width: nodeWidths.get(p.name) || NODE_WIDTH,
                height: NODE_HEIGHT
            });
        }
    });

    // Add root-level groups
    const rootGroups = Array.from(groups.values()).filter(g => !g.parentId);
    rootGroups.sort((a, b) => a.id.localeCompare(b.id));
    rootGroups.forEach(group => {
        graph.children!.push(buildGroupNode(group));
    });

    // Add ALL edges at the root level
    const edges: ElkExtendedEdge[] = [];
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            if (effectiveSource === effectiveTarget) return;

            edges.push({
                id: `${effectiveSource}->${effectiveTarget}`,
                sources: [effectiveSource],
                targets: [effectiveTarget]
            });
        });
    });
    graph.edges = edges;

    return graph;
}

/**
 * Adjust vertical spacing in ELK layout to ensure proper margin for edges entering groups
 * 
 * When an edge goes from a node to a target inside a group, the edge needs to:
 * 1. Branch at sourceBottom + GLOBAL_MARGIN (if multiple outgoing edges)
 * 2. Turn horizontally at groupTop - GLOBAL_MARGIN
 * 
 * This means we need at least 2*GLOBAL_MARGIN between source bottom and group top.
 * This function adjusts group positions if needed.
 */
function adjustVerticalMargins(
    elkGraph: ElkNode,
    collapsedGroups: Set<string>
): void {
    // First, collect all edges and build a map of which groups they enter
    const edgesEnteringGroups = new Map<string, { sourceId: string; sourceParent: ElkNode }[]>();

    function collectEdges(node: ElkNode): void {
        if (node.edges) {
            node.edges.forEach(edge => {
                const sourceId = edge.sources[0];
                const targetId = edge.targets[0];

                // Check if target is inside a group that source is NOT inside
                // This means the edge enters that group
                const targetGroup = getDirectParentGroupId(targetId);
                const sourceGroup = getDirectParentGroupId(sourceId);

                if (targetGroup && targetGroup !== sourceGroup) {
                    // This edge enters targetGroup
                    if (!edgesEnteringGroups.has(targetGroup)) {
                        edgesEnteringGroups.set(targetGroup, []);
                    }
                    edgesEnteringGroups.get(targetGroup)!.push({
                        sourceId,
                        sourceParent: node // The parent ELK node containing this edge
                    });
                    console.log(`[VerticalMargins] Edge ${sourceId} -> ${targetId} enters group ${targetGroup}`);
                }
            });
        }

        // Recurse
        if (node.children) {
            node.children.forEach(child => {
                if (!collapsedGroups.has(child.id)) {
                    collectEdges(child);
                }
            });
        }
    }

    function getDirectParentGroupId(nodeId: string): string | null {
        // For "prod_validation.validate_jsonschema.get_schemas", parent is "group-prod_validation.validate_jsonschema"
        // For "group-prod_validation.validate_jsonschema", parent is "group-prod_validation"
        if (nodeId.startsWith('group-')) {
            const parts = nodeId.replace('group-', '').split('.');
            if (parts.length > 1) {
                return 'group-' + parts.slice(0, -1).join('.');
            }
            return null; // Root level group
        } else {
            const parts = nodeId.split('.');
            if (parts.length > 1) {
                return 'group-' + parts.slice(0, -1).join('.');
            }
            return null; // Root level node
        }
    }

    collectEdges(elkGraph);

    // Now check each group that has edges entering it
    // and ensure there's enough vertical margin
    function findNodeInParent(parent: ElkNode, nodeId: string): ElkNode | undefined {
        return parent.children?.find(c => c.id === nodeId);
    }

    function adjustGroupMargin(parentNode: ElkNode): void {
        if (!parentNode.children) return;

        // Sort children by Y position
        const sortedChildren = [...parentNode.children].sort((a, b) => (a.y || 0) - (b.y || 0));

        // Check each group that has edges entering it
        for (const child of sortedChildren) {
            if (!child.id.startsWith('group-')) continue;

            const edgeEntries = edgesEnteringGroups.get(child.id);
            if (!edgeEntries) continue;

            console.log(`[VerticalMargins] Checking group ${child.id} with ${edgeEntries.length} entering edges`);

            // Find the source node with the highest bottom Y
            let maxSourceBottom = 0;
            for (const entry of edgeEntries) {
                // Find source in parent's children
                const sourceNode = findNodeInParent(parentNode, entry.sourceId);
                console.log(`[VerticalMargins]   Source ${entry.sourceId} in parent ${parentNode.id}: ${sourceNode ? `found at y=${sourceNode.y}, h=${sourceNode.height}` : 'NOT FOUND'}`);
                if (sourceNode) {
                    const sourceBottom = (sourceNode.y || 0) + (sourceNode.height || 0);
                    maxSourceBottom = Math.max(maxSourceBottom, sourceBottom);
                }
            }

            if (maxSourceBottom > 0) {
                // Required group top Y: maxSourceBottom + 2*GLOBAL_MARGIN
                // (one margin for branch point, one margin for turn above group)
                const requiredGroupTop = maxSourceBottom + 2 * GLOBAL_MARGIN;
                const currentGroupTop = child.y || 0;

                console.log(`[VerticalMargins]   maxSourceBottom=${maxSourceBottom}, required=${requiredGroupTop}, current=${currentGroupTop}`);

                if (currentGroupTop < requiredGroupTop) {
                    // Need to shift this group and all nodes below it down
                    const shiftAmount = requiredGroupTop - currentGroupTop;
                    console.log(`[VerticalMargins]   SHIFTING ${child.id} and siblings down by ${shiftAmount}px`);

                    // Find all nodes at or below this Y and shift them
                    for (const otherChild of sortedChildren) {
                        if ((otherChild.y || 0) >= currentGroupTop) {
                            otherChild.y = (otherChild.y || 0) + shiftAmount;
                        }
                    }

                    // Also need to increase parent height
                    if (parentNode.height) {
                        parentNode.height += shiftAmount;
                    }
                }
            }
        }

        // Recurse into child groups
        for (const child of parentNode.children) {
            if (child.id.startsWith('group-') && !collapsedGroups.has(child.id)) {
                adjustGroupMargin(child);
            }
        }
    }

    adjustGroupMargin(elkGraph);
}

/**
 * Convert unified ELK layout to Svelte Flow format
 */
function unifiedElkToSvelteFlow(
    elkGraph: ElkNode,
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    collapsedGroups: Set<string>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Build absolute positions for all nodes (needed for edge routing)
    const absolutePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

    function calculateAbsolutePositions(elkNode: ElkNode, offsetX: number = 0, offsetY: number = 0): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const absX = offsetX + (child.x || 0);
            const absY = offsetY + (child.y || 0);
            absolutePositions.set(child.id, {
                x: absX,
                y: absY,
                width: child.width || 0,
                height: child.height || 0
            });

            // Recurse for groups
            if (child.id.startsWith('group-') && !collapsedGroups.has(child.id)) {
                calculateAbsolutePositions(child, absX, absY);
            }
        });
    }

    calculateAbsolutePositions(elkGraph);

    // Build group bounding boxes array for edge routing
    const groupBoxes: GroupBox[] = [];
    // Also calculate entry/exit port positions for each group
    const groupPorts = new Map<string, GroupPort>();

    absolutePositions.forEach((pos, id) => {
        // Include all groups (both expanded and collapsed) for edge routing
        if (id.startsWith('group-')) {
            groupBoxes.push({
                id,
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
                collapsed: collapsedGroups.has(id)
            });

            // Calculate entry port (top-center, at GLOBAL_MARGIN above the header)
            const entryPortId = `${id}-entry`;
            groupPorts.set(entryPortId, {
                groupId: id,
                type: 'entry',
                x: pos.x + pos.width / 2,
                y: pos.y - GLOBAL_MARGIN // MARGIN above the group
            });

            // Calculate exit port (bottom-center, at GLOBAL_MARGIN below the group)
            const exitPortId = `${id}-exit`;
            groupPorts.set(exitPortId, {
                groupId: id,
                type: 'exit',
                x: pos.x + pos.width / 2,
                y: pos.y + pos.height + GLOBAL_MARGIN // MARGIN below the group
            });
        }
    });

    // Update the global stores for edge routing
    groupBoxesStore.set(groupBoxes);
    groupPortsStore.set(groupPorts);

    function extractNodes(elkNode: ElkNode, parentId?: string): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const isGroup = child.id.startsWith('group-');

            if (isGroup) {
                const groupId = child.id.replace('group-', '');
                const group = groups.get(groupId);
                const isCollapsed = collapsedGroups.has(child.id);

                nodes.push({
                    id: child.id,
                    type: 'group',
                    position: { x: child.x || 0, y: child.y || 0 },
                    data: {
                        label: group?.path[group.path.length - 1] || groupId,
                        fullPath: group?.path.join('.') || groupId,
                        collapsed: isCollapsed
                    },
                    style: `width: ${child.width}px; height: ${child.height}px;`,
                    ...(parentId && { parentId })
                });

                // Recurse into non-collapsed groups
                if (!isCollapsed) {
                    extractNodes(child, child.id);
                }
            } else {
                const process = processMap.get(child.id);
                if (process) {
                    const groupPath = extractGroup(process.name);

                    nodes.push({
                        id: child.id,
                        type: 'process',
                        position: { x: child.x || 0, y: child.y || 0 },
                        data: {
                            label: process.name,
                            status: process.status,
                            errorMessage: process.last_run_error_message,
                            group: groupPath
                        } satisfies ProcessNodeData,
                        ...(parentId && { parentId })
                    });
                }
            }
        });
    }

    extractNodes(elkGraph);

    // Extract edges from ELK with their routed sections
    const addedEdges = new Set<string>();

    function extractEdgesFromElk(elkNode: ElkNode, offsetX: number = 0, offsetY: number = 0): void {
        if (elkNode.edges) {
            elkNode.edges.forEach(elkEdge => {
                const sourceId = elkEdge.sources[0];
                const targetId = elkEdge.targets[0];

                // Get effective IDs for collapsed groups
                const effectiveSource = getEffectiveNodeId(sourceId, collapsedGroups, groups);
                const effectiveTarget = getEffectiveNodeId(targetId, collapsedGroups, groups);

                if (effectiveSource === effectiveTarget) return;

                const edgeId = `${effectiveSource}->${effectiveTarget}`;
                if (addedEdges.has(edgeId)) return;
                addedEdges.add(edgeId);

                // Get source status for edge styling
                const sourceProcess = processMap.get(sourceId) || processMap.get(effectiveSource.replace('group-', ''));
                const targetProcess = processMap.get(targetId) || processMap.get(effectiveTarget.replace('group-', ''));
                const sourceStatus = sourceProcess?.status || 'NOTSTARTED';
                const targetStatus = targetProcess?.status || 'NOTSTARTED';

                // Use custom elk edge type - it reads group boxes from store
                edges.push({
                    id: edgeId,
                    source: effectiveSource,
                    target: effectiveTarget,
                    type: 'elk',
                    animated: targetStatus === 'INPROGRESS',
                    style: getEdgeStyle(sourceStatus, targetStatus)
                });
            });
        }

        // Recurse into children
        if (elkNode.children) {
            elkNode.children.forEach(child => {
                if (child.id.startsWith('group-') && !collapsedGroups.has(child.id)) {
                    extractEdgesFromElk(child, offsetX + (child.x || 0), offsetY + (child.y || 0));
                }
            });
        }
    }

    extractEdgesFromElk(elkGraph);

    // Calculate confluence points for edges that branch from or join to the same node
    // This ensures edges from the same source branch at the same Y, and edges to the same target join at the same Y
    const confluencePoints = new Map<string, ConfluencePoints>();

    // Helper to get the effective exit Y for a node going to a specific target
    // This considers which groups the edge needs to exit (only groups NOT containing the target)
    function getEffectiveExitY(sourceId: string, targetId: string): number {
        const sourcePos = absolutePositions.get(sourceId);
        if (!sourcePos) return 0;

        const sourceGroup = extractGroup(sourceId);
        const targetGroup = extractGroup(targetId);

        // Base exit Y is bottom of source node + margin
        let maxExitY = sourcePos.y + sourcePos.height + GLOBAL_MARGIN;

        if (sourceGroup === 'root') {
            // Source not in any group - no group exit needed
            return maxExitY;
        }

        // Find which groups source needs to exit to reach target
        // Source needs to exit groups that don't contain the target
        const sourceParts = sourceGroup.split('.');
        const targetParts = targetGroup === 'root' ? [] : targetGroup.split('.');

        // Find common prefix length
        let commonPrefixLen = 0;
        for (let i = 0; i < Math.min(sourceParts.length, targetParts.length); i++) {
            if (sourceParts[i] === targetParts[i]) {
                commonPrefixLen = i + 1;
            } else {
                break;
            }
        }

        // Source needs to exit groups from its innermost down to (but not including) the common ancestor
        // For example, if source is in "prod_validation.validate_jsonschema" and target is in "prod_validation",
        // source needs to exit "prod_validation.validate_jsonschema" but NOT "prod_validation"
        for (let i = sourceParts.length; i > commonPrefixLen; i--) {
            const groupId = `group-${sourceParts.slice(0, i).join('.')}`;
            const groupPos = absolutePositions.get(groupId);
            if (groupPos) {
                const groupExitY = groupPos.y + groupPos.height + GLOBAL_MARGIN;
                maxExitY = Math.max(maxExitY, groupExitY);
            }
        }

        return maxExitY;
    }

    // Group edges by source and target
    const edgesBySource = new Map<string, Array<{ target: string; targetY: number; targetHeight: number }>>();
    const edgesByTarget = new Map<string, Array<{ source: string; sourceY: number; sourceHeight: number; effectiveExitY: number }>>();

    edges.forEach(edge => {
        const sourcePos = absolutePositions.get(edge.source);
        const targetPos = absolutePositions.get(edge.target);

        if (sourcePos && targetPos) {
            // Group by source
            if (!edgesBySource.has(edge.source)) {
                edgesBySource.set(edge.source, []);
            }
            edgesBySource.get(edge.source)!.push({
                target: edge.target,
                targetY: targetPos.y,
                targetHeight: targetPos.height
            });

            // Group by target - also compute effective exit Y for the source (relative to this target)
            if (!edgesByTarget.has(edge.target)) {
                edgesByTarget.set(edge.target, []);
            }
            edgesByTarget.get(edge.target)!.push({
                source: edge.source,
                sourceY: sourcePos.y,
                sourceHeight: sourcePos.height,
                effectiveExitY: getEffectiveExitY(edge.source, edge.target)
            });
        }
    });

    // Calculate branch points for nodes with multiple outgoing edges
    edgesBySource.forEach((targets, sourceId) => {
        if (targets.length > 1) {
            const sourcePos = absolutePositions.get(sourceId);
            if (sourcePos) {
                // Branch point should be at a consistent Y below the source
                // Use the source bottom + GLOBAL_MARGIN as the branch point
                const branchY = sourcePos.y + sourcePos.height + GLOBAL_MARGIN;

                if (!confluencePoints.has(sourceId)) {
                    confluencePoints.set(sourceId, {});
                }
                confluencePoints.get(sourceId)!.branchY = branchY;
            }
        }
    });

    // Calculate join points for nodes with multiple incoming edges
    edgesByTarget.forEach((sources, targetId) => {
        if (sources.length > 1) {
            const targetPos = absolutePositions.get(targetId);
            if (targetPos) {
                // Join point should be at a consistent Y above the target
                // BUT it must be BELOW the maximum effective exit Y of all source nodes
                // This ensures edges that exit groups can still reach the join point
                const maxEffectiveExitY = Math.max(...sources.map(s => s.effectiveExitY));

                // Join Y is the max of: (target top - margin) and (max exit Y + small gap)
                const idealJoinY = targetPos.y - GLOBAL_MARGIN;
                const joinY = Math.max(idealJoinY, maxEffectiveExitY + 10);

                // Only set joinY if it's still above the target
                if (joinY < targetPos.y) {
                    if (!confluencePoints.has(targetId)) {
                        confluencePoints.set(targetId, {});
                    }
                    confluencePoints.get(targetId)!.joinY = joinY;
                }
            }
        }
    });

    // Update the confluence points store
    confluencePointsStore.set(confluencePoints);

    return { nodes, edges };
}

/**
 * Converts process data to Svelte Flow nodes and edges with hierarchical ELK layout
 * Uses unified ELK graph for proper edge routing around groups
 * 
 * This implements a two-pass layout approach:
 * 1. First pass: compute initial layout
 * 2. Analyze avoidance path requirements
 * 3. If groups need expansion, compute second pass with expanded padding
 */
export async function processesToFlowAsync(
    processes: Process[],
    collapsedGroups: Set<string> = new Set()
): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    // Build group hierarchy
    const groups = buildGroupHierarchy(processes);

    // Pre-calculate node widths
    const nodeWidths = new Map<string, number>();
    processes.forEach(p => {
        nodeWidths.set(p.name, calculateNodeWidth(p.name));
    });

    // PASS 1: Build and run initial layout
    let elkGraph = buildUnifiedElkGraph(processes, groups, nodeWidths, collapsedGroups);
    let layoutedGraph = await elk.layout(elkGraph);

    // Calculate absolute positions from first pass for avoidance analysis
    const absolutePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

    function calculateAbsolutePositions(elkNode: ElkNode, offsetX: number = 0, offsetY: number = 0): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const absX = offsetX + (child.x || 0);
            const absY = offsetY + (child.y || 0);
            absolutePositions.set(child.id, {
                x: absX,
                y: absY,
                width: child.width || 0,
                height: child.height || 0
            });

            // Recurse for groups
            if (child.id.startsWith('group-') && !collapsedGroups.has(child.id)) {
                calculateAbsolutePositions(child, absX, absY);
            }
        });
    }

    calculateAbsolutePositions(layoutedGraph);

    // Analyze avoidance path requirements
    const expansions = calculateAvoidanceExpansions(absolutePositions, processes, groups, collapsedGroups);

    // Debug: Log expansions
    if (expansions.size > 0) {
        console.log('[Layout] Groups needing expansion for avoidance paths:');
        expansions.forEach((expansion, groupId) => {
            console.log(`  - ${groupId}: +${expansion}px padding on each side`);
        });
    }

    // PASS 2: If expansions needed, rebuild graph with expanded padding
    if (expansions.size > 0) {
        console.log('[Layout] Running second pass with expanded padding...');
        // Rebuild graph with expanded padding for groups that need it
        elkGraph = buildUnifiedElkGraphWithExpansions(processes, groups, nodeWidths, collapsedGroups, expansions);
        layoutedGraph = await elk.layout(elkGraph);
    }

    // Post-process: Adjust vertical margins to ensure edges entering groups have room to turn
    adjustVerticalMargins(layoutedGraph, collapsedGroups);

    // Post-process: Center children within each group
    centerChildrenInGroups(layoutedGraph);

    // Convert to Svelte Flow format
    return unifiedElkToSvelteFlow(layoutedGraph, processes, processMap, groups, collapsedGroups);
}

/**
 * Synchronous version - fallback layout
 */
export function processesToFlow(processes: Process[]): { nodes: Node[]; edges: Edge[] } {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    const groups = buildGroupHierarchy(processes);
    const nodeWidths = new Map<string, number>();
    processes.forEach(p => {
        nodeWidths.set(p.name, calculateNodeWidth(p.name));
    });

    return processesToFlowSync(processes, processMap, groups, nodeWidths);
}

/**
 * Synchronous fallback layout
 */
function processesToFlowSync(
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const levels = calculateLevels(processes);
    const groupLayouts = new Map<string, { x: number; y: number; width: number; height: number }>();
    const nodePositions = new Map<string, { x: number; y: number }>();

    let currentX = 0;

    // Layout root processes
    const rootProcesses = processes.filter(p => !p.name.includes('.'));
    if (rootProcesses.length > 0) {
        const levelGroups = new Map<number, string[]>();
        rootProcesses.forEach(p => {
            const level = levels.get(p.name) || 0;
            if (!levelGroups.has(level)) levelGroups.set(level, []);
            levelGroups.get(level)!.push(p.name);
        });

        let maxWidth = 0;
        levelGroups.forEach((names, level) => {
            let x = currentX;
            names.forEach(name => {
                const width = nodeWidths.get(name) || NODE_WIDTH;
                nodePositions.set(name, { x, y: level * (NODE_HEIGHT + 60) });
                x += width + 50;
            });
            maxWidth = Math.max(maxWidth, x - currentX);
        });
        currentX += maxWidth + 50;
    }

    // Layout groups
    const rootGroups = Array.from(groups.values()).filter(g => !g.parentId);
    rootGroups.sort((a, b) => a.id.localeCompare(b.id));

    rootGroups.forEach(group => {
        const layout = layoutGroupSimple(group, groups, levels, nodeWidths, nodePositions, groupLayouts, currentX);
        currentX += layout.width + 50;
    });

    // Create group nodes
    const sortedGroups = Array.from(groups.values()).sort((a, b) => a.path.length - b.path.length);
    sortedGroups.forEach(group => {
        const layout = groupLayouts.get(group.id);
        if (!layout) return;

        let position = { x: layout.x, y: layout.y };
        if (group.parentId) {
            const parentLayout = groupLayouts.get(group.parentId);
            if (parentLayout) {
                position = {
                    x: layout.x - parentLayout.x,
                    y: layout.y - parentLayout.y
                };
            }
        }

        nodes.push({
            id: `group-${group.id}`,
            type: 'group',
            position,
            data: {
                label: group.path[group.path.length - 1],
                fullPath: group.path.join('.')
            },
            style: `width: ${layout.width}px; height: ${layout.height}px;`,
            ...(group.parentId && { parentId: `group-${group.parentId}` })
        });
    });

    // Create process nodes
    processes.forEach(process => {
        const pos = nodePositions.get(process.name);
        if (!pos) return;

        const groupPath = extractGroup(process.name);
        const parentGroupId = groupPath !== 'root' ? `group-${groupPath}` : undefined;

        let position = { x: pos.x, y: pos.y };
        if (parentGroupId && groupPath !== 'root') {
            const parentLayout = groupLayouts.get(groupPath);
            if (parentLayout) {
                position = {
                    x: pos.x - parentLayout.x,
                    y: pos.y - parentLayout.y
                };
            }
        }

        nodes.push({
            id: process.name,
            type: 'process',
            position,
            data: {
                label: process.name,
                status: process.status,
                errorMessage: process.last_run_error_message,
                group: groupPath
            } satisfies ProcessNodeData,
            ...(parentGroupId && { parentId: parentGroupId })
        });
    });

    // Create edges
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const sourceStatus = processMap.get(upstream)?.status || 'NOTSTARTED';
            const targetStatus = process.status;

            edges.push({
                id: `${upstream}->${process.name}`,
                source: upstream,
                target: process.name,
                type: 'smoothstep',
                animated: targetStatus === 'INPROGRESS',
                style: getEdgeStyle(sourceStatus, targetStatus)
            });
        });
    });

    return { nodes, edges };
}

function layoutGroupSimple(
    group: GroupInfo,
    allGroups: Map<string, GroupInfo>,
    levels: Map<string, number>,
    nodeWidths: Map<string, number>,
    nodePositions: Map<string, { x: number; y: number }>,
    groupLayouts: Map<string, { x: number; y: number; width: number; height: number }>,
    startX: number
): { width: number; height: number } {
    const childGroups = group.childGroups.map(id => allGroups.get(id)!).filter(Boolean);
    const directProcesses = group.processes;

    let childGroupsWidth = 0;
    let childGroupsHeight = 0;

    childGroups.sort((a, b) => a.id.localeCompare(b.id));

    let childX = startX + GROUP_PADDING;
    childGroups.forEach(childGroup => {
        const childLayout = layoutGroupSimple(
            childGroup, allGroups, levels, nodeWidths,
            nodePositions, groupLayouts, childX
        );
        childGroupsWidth += childLayout.width + 50;
        childGroupsHeight = Math.max(childGroupsHeight, childLayout.height);
        childX += childLayout.width + 50;
    });

    const processLevels = new Map<number, string[]>();
    directProcesses.forEach(pName => {
        const level = levels.get(pName) || 0;
        if (!processLevels.has(level)) processLevels.set(level, []);
        processLevels.get(level)!.push(pName);
    });

    let processesWidth = 0;
    let processesHeight = 0;

    const sortedLevels = Array.from(processLevels.keys()).sort((a, b) => a - b);
    const levelIndexMap = new Map<number, number>();
    sortedLevels.forEach((level, idx) => levelIndexMap.set(level, idx));

    sortedLevels.forEach(level => {
        const names = processLevels.get(level)!;
        let levelWidth = 0;
        names.forEach((name, idx) => {
            levelWidth += nodeWidths.get(name) || NODE_WIDTH;
            if (idx < names.length - 1) levelWidth += 50;
        });
        processesWidth = Math.max(processesWidth, levelWidth);
    });

    if (sortedLevels.length > 0) {
        processesHeight = sortedLevels.length * NODE_HEIGHT + (sortedLevels.length - 1) * 60;
    }

    const contentWidth = Math.max(childGroupsWidth, processesWidth);
    const contentHeight = childGroupsHeight + (childGroupsHeight > 0 && processesHeight > 0 ? 60 : 0) + processesHeight;

    const groupWidth = Math.max(contentWidth + GROUP_PADDING * 2, 250);
    const groupHeight = Math.max(contentHeight + GROUP_PADDING * 2 + GROUP_HEADER, 160);

    const processStartY = GROUP_HEADER + GROUP_PADDING + childGroupsHeight + (childGroupsHeight > 0 ? 60 : 0);

    sortedLevels.forEach(level => {
        const names = processLevels.get(level)!;
        const levelIdx = levelIndexMap.get(level)!;

        let levelWidth = 0;
        names.forEach((name, idx) => {
            levelWidth += nodeWidths.get(name) || NODE_WIDTH;
            if (idx < names.length - 1) levelWidth += 50;
        });

        let x = GROUP_PADDING + (groupWidth - GROUP_PADDING * 2 - levelWidth) / 2;
        const y = processStartY + levelIdx * (NODE_HEIGHT + 60);

        names.forEach(name => {
            const width = nodeWidths.get(name) || NODE_WIDTH;
            nodePositions.set(name, { x: startX + x, y });
            x += width + 50;
        });
    });

    groupLayouts.set(group.id, {
        x: startX,
        y: 0,
        width: groupWidth,
        height: groupHeight
    });

    childX = startX + GROUP_PADDING;
    childGroups.forEach(childGroup => {
        const childLayout = groupLayouts.get(childGroup.id)!;
        childLayout.x = childX;
        childLayout.y = GROUP_HEADER + GROUP_PADDING;
        childX += childLayout.width + 50;
    });

    return { width: groupWidth, height: groupHeight };
}

interface GroupInfo {
    id: string;
    path: string[];
    processes: string[];
    childGroups: string[];
    parentId?: string;
}

/**
 * Build ELK graph structure with compound nodes for groups
 */
function buildElkGraph(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>
): ElkNode {
    const graph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.spacing.edgeNodeBetweenLayers': '40',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN + 10),
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.padding': `[top=${GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP'
        },
        children: [],
        edges: []
    };

    const rootGroups = Array.from(groups.values()).filter(g => !g.parentId);

    // Add root-level processes
    processes.forEach(p => {
        if (!p.name.includes('.')) {
            graph.children!.push({
                id: p.name,
                width: nodeWidths.get(p.name) || NODE_WIDTH,
                height: NODE_HEIGHT,
                layoutOptions: {
                    'elk.portConstraints': 'FIXED_ORDER'
                }
            });
        }
    });

    // Add root groups
    rootGroups.sort((a, b) => a.id.localeCompare(b.id));
    rootGroups.forEach(group => {
        const elkGroup = buildElkGroup(group, groups, nodeWidths);
        graph.children!.push(elkGroup);
    });

    // Add all edges
    const edges: ElkExtendedEdge[] = [];
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            edges.push({
                id: `${upstream}->${process.name}`,
                sources: [upstream],
                targets: [process.name]
            });
        });
    });
    graph.edges = edges;

    return graph;
}

/**
 * Build ELK group recursively
 */
function buildElkGroup(
    group: GroupInfo,
    allGroups: Map<string, GroupInfo>,
    nodeWidths: Map<string, number>
): ElkNode {
    const elkGroup: ElkNode = {
        id: `group-${group.id}`,
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.layered.spacing.nodeNodeBetweenLayers': '60',
            'elk.spacing.nodeNode': String(GLOBAL_MARGIN),
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.padding': `[top=${GROUP_HEADER + GLOBAL_MARGIN},left=${GLOBAL_MARGIN},bottom=${GLOBAL_MARGIN},right=${GLOBAL_MARGIN}]`,
            'elk.alignment': 'CENTER',
            'elk.contentAlignment': 'H_CENTER V_TOP'
        },
        children: [],
        labels: [{ text: group.path[group.path.length - 1] }]
    };

    const childGroups = group.childGroups.map(id => allGroups.get(id)!).filter(Boolean);
    childGroups.sort((a, b) => a.id.localeCompare(b.id));

    childGroups.forEach(childGroup => {
        const elkChild = buildElkGroup(childGroup, allGroups, nodeWidths);
        elkGroup.children!.push(elkChild);
    });

    group.processes.forEach(pName => {
        elkGroup.children!.push({
            id: pName,
            width: nodeWidths.get(pName) || NODE_WIDTH,
            height: NODE_HEIGHT
        });
    });

    return elkGroup;
}

/**
 * Convert ELK layout result to Svelte Flow format
 */
function elkToSvelteFlow(
    elkGraph: ElkNode,
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    function extractNodes(elkNode: ElkNode, parentId?: string): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const isGroup = child.id.startsWith('group-');

            if (isGroup) {
                const groupId = child.id.replace('group-', '');
                const group = groups.get(groupId);

                nodes.push({
                    id: child.id,
                    type: 'group',
                    position: { x: child.x || 0, y: child.y || 0 },
                    data: {
                        label: group?.path[group.path.length - 1] || groupId,
                        fullPath: group?.path.join('.') || groupId
                    },
                    style: `width: ${child.width}px; height: ${child.height}px;`,
                    ...(parentId && { parentId })
                });

                extractNodes(child, child.id);
            } else {
                const process = processMap.get(child.id);
                if (process) {
                    const groupPath = extractGroup(process.name);

                    nodes.push({
                        id: child.id,
                        type: 'process',
                        position: { x: child.x || 0, y: child.y || 0 },
                        data: {
                            label: process.name,
                            status: process.status,
                            errorMessage: process.last_run_error_message,
                            group: groupPath
                        } satisfies ProcessNodeData,
                        ...(parentId && { parentId })
                    });
                }
            }
        });
    }

    extractNodes(elkGraph);

    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const sourceStatus = processMap.get(upstream)?.status || 'NOTSTARTED';
            const targetStatus = process.status;

            edges.push({
                id: `${upstream}->${process.name}`,
                source: upstream,
                target: process.name,
                type: 'smoothstep',
                animated: targetStatus === 'INPROGRESS',
                style: getEdgeStyle(sourceStatus, targetStatus)
            });
        });
    });

    return { nodes, edges };
}

/**
 * Build hierarchical group structure from process names
 */
function buildGroupHierarchy(processes: Process[]): Map<string, GroupInfo> {
    const groups = new Map<string, GroupInfo>();

    processes.forEach(process => {
        const parts = process.name.split('.');
        if (parts.length <= 1) return;

        for (let i = 1; i < parts.length; i++) {
            const groupPath = parts.slice(0, i);
            const groupId = groupPath.join('.');
            const parentPath = groupPath.slice(0, -1);
            const parentId = parentPath.length > 0 ? parentPath.join('.') : undefined;

            if (!groups.has(groupId)) {
                groups.set(groupId, {
                    id: groupId,
                    path: groupPath,
                    processes: [],
                    childGroups: [],
                    parentId
                });
            }

            if (parentId && groups.has(parentId)) {
                const parentGroup = groups.get(parentId)!;
                if (!parentGroup.childGroups.includes(groupId)) {
                    parentGroup.childGroups.push(groupId);
                }
            }
        }

        const processGroupPath = parts.slice(0, -1);
        const processGroupId = processGroupPath.join('.');
        if (groups.has(processGroupId)) {
            groups.get(processGroupId)!.processes.push(process.name);
        }
    });

    groups.forEach(group => {
        if (group.parentId && groups.has(group.parentId)) {
            const parent = groups.get(group.parentId)!;
            if (!parent.childGroups.includes(group.id)) {
                parent.childGroups.push(group.id);
            }
        }
    });

    return groups;
}

function calculateLevels(processes: Process[]): Map<string, number> {
    const levels = new Map<string, number>();
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    function getLevel(name: string): number {
        if (levels.has(name)) {
            return levels.get(name)!;
        }

        const process = processMap.get(name);
        if (!process || process.upstream_processes.length === 0) {
            levels.set(name, 0);
            return 0;
        }

        const maxUpstreamLevel = Math.max(
            ...process.upstream_processes.map(up => getLevel(up))
        );
        const level = maxUpstreamLevel + 1;
        levels.set(name, level);
        return level;
    }

    processes.forEach(p => getLevel(p.name));
    return levels;
}

function extractGroup(name: string): string {
    const parts = name.split('.');
    if (parts.length > 1) {
        return parts.slice(0, -1).join('.');
    }
    return 'root';
}

function getEdgeStyle(sourceStatus: string, targetStatus: string): string {
    const statusColors: Record<string, string> = {
        SUCCESS: '#10b981',
        SKIPPED: '#64748b',
        FAILED: '#ef4444',
        INPROGRESS: '#3b82f6',
        NOTSTARTED: '#f59e0b',
        ROLLBACKED: '#8b5cf6'
    };

    const color = statusColors[targetStatus] || statusColors.NOTSTARTED;
    return `stroke: ${color}; stroke-width: 2px; opacity: 0.6;`;
}

/**
 * Get statistics about the process graph
 */
export function getProcessStats(processes: Process[]) {
    const stats = {
        total: processes.length,
        success: 0,
        skipped: 0,
        failed: 0,
        inprogress: 0,
        notstarted: 0,
        rollbacked: 0
    };

    processes.forEach(p => {
        const status = p.status.toLowerCase() as keyof typeof stats;
        if (status in stats && status !== 'total') {
            stats[status]++;
        }
    });

    return stats;
}