import type { Process, ProcessNodeData } from './types';
import type { Node, Edge } from '@xyflow/svelte';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import { writable } from 'svelte/store';

// Node dimensions
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GROUP_PADDING = 40;
const GROUP_HEADER = 40;

// Collapsed group dimensions
const COLLAPSED_GROUP_WIDTH = 280;
const COLLAPSED_GROUP_HEIGHT = 60;

const elk = new ELK();

// Stores for UI state
export const hoveredNodeStore = writable<string | null>(null);
export const focusedNodeStore = writable<string | null>(null);
export const highlightedStatusStore = writable<string | null>(null);

// ELK layout algorithm options
export type ElkAlgorithm = 'layered' | 'force' | 'mrtree' | 'radial' | 'stress' | 'box';
export type ElkDirection = 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';

export interface LayoutOptions {
    algorithm?: ElkAlgorithm;
    direction?: ElkDirection;
    centerNodes?: boolean;
}

// Group hierarchy info
interface GroupInfo {
    id: string;
    path: string[];
    parentId: string | null;
    processes: string[];
    childGroups: string[];
}

/**
 * Extract the group path from a process name
 * e.g., "group1.group2.process" -> "group1.group2"
 */
function extractGroup(name: string): string {
    const parts = name.split('.');
    if (parts.length > 1) {
        return parts.slice(0, -1).join('.');
    }
    return 'root';
}

/**
 * Build group hierarchy from processes
 */
function buildGroupHierarchy(processes: Process[]): Map<string, GroupInfo> {
    const groups = new Map<string, GroupInfo>();

    processes.forEach(p => {
        const groupPath = extractGroup(p.name);
        if (groupPath === 'root') return;

        const parts = groupPath.split('.');

        // Create all ancestor groups
        for (let i = 1; i <= parts.length; i++) {
            const currentPath = parts.slice(0, i);
            const groupId = currentPath.join('.');

            if (!groups.has(groupId)) {
                groups.set(groupId, {
                    id: groupId,
                    path: currentPath,
                    parentId: i > 1 ? parts.slice(0, i - 1).join('.') : null,
                    processes: [],
                    childGroups: []
                });
            }
        }

        // Add process to its direct group
        const directGroup = groups.get(groupPath);
        if (directGroup) {
            directGroup.processes.push(p.name);
        }
    });

    // Build child group relationships
    groups.forEach((group, id) => {
        if (group.parentId) {
            const parent = groups.get(group.parentId);
            if (parent && !parent.childGroups.includes(id)) {
                parent.childGroups.push(id);
            }
        }
    });

    return groups;
}

/**
 * Build a unified ELK graph with hierarchical structure
 */
function buildElkGraph(
    processes: Process[],
    groups: Map<string, GroupInfo>,
    collapsedGroups: Set<string>,
    layoutOptions: LayoutOptions = {}
): ElkNode {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    const algorithm = layoutOptions.algorithm || 'layered';
    const direction = layoutOptions.direction || 'DOWN';
    const centerNodes = layoutOptions.centerNodes ?? true;

    // Build group nodes recursively
    function buildGroupNode(group: GroupInfo): ElkNode {
        const groupNodeId = `group-${group.id}`;
        const isCollapsed = collapsedGroups.has(groupNodeId);

        if (isCollapsed) {
            return {
                id: groupNodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT,
                layoutOptions: {
                    'elk.padding': '[top=10,left=10,bottom=10,right=10]'
                }
            };
        }

        const children: ElkNode[] = [];

        // Add child groups
        group.childGroups.forEach(childGroupId => {
            const childGroup = groups.get(childGroupId);
            if (childGroup) {
                children.push(buildGroupNode(childGroup));
            }
        });

        // Add direct processes
        group.processes.forEach(processName => {
            children.push({
                id: processName,
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            });
        });

        // Build group layout options
        const groupLayoutOptions: Record<string, string> = {
            'elk.algorithm': algorithm,
            'elk.direction': direction,
            'elk.spacing.nodeNode': '40',
            'elk.padding': `[top=${GROUP_HEADER + GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
        };

        if (algorithm === 'layered') {
            groupLayoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = '60';
            if (centerNodes) {
                groupLayoutOptions['elk.layered.nodePlacement.strategy'] = 'NETWORK_SIMPLEX';
                groupLayoutOptions['elk.alignment'] = 'CENTER';
            }
        }

        return {
            id: groupNodeId,
            layoutOptions: groupLayoutOptions,
            children
        };
    }

    // Build root children
    const rootChildren: ElkNode[] = [];

    // Add root-level processes
    processes.forEach(p => {
        if (!p.name.includes('.')) {
            rootChildren.push({
                id: p.name,
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            });
        }
    });

    // Add root-level groups
    groups.forEach(group => {
        if (!group.parentId) {
            rootChildren.push(buildGroupNode(group));
        }
    });

    // Build edges
    const edges: ElkExtendedEdge[] = [];
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            // Get effective source and target (may be redirected to collapsed group)
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            // Skip self-loops
            if (effectiveSource === effectiveTarget) return;

            // Skip duplicates
            const edgeId = `${effectiveSource}->${effectiveTarget}`;
            if (edges.some(e => e.id === edgeId)) return;

            edges.push({
                id: edgeId,
                sources: [effectiveSource],
                targets: [effectiveTarget]
            });
        });
    });

    // Build layout options based on algorithm
    const rootLayoutOptions: Record<string, string> = {
        'elk.algorithm': algorithm,
        'elk.direction': direction,
        'elk.spacing.nodeNode': '50',
        'elk.padding': '[top=40,left=40,bottom=40,right=40]',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    };

    // Layered-specific options
    if (algorithm === 'layered') {
        rootLayoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = '80';
        rootLayoutOptions['elk.layered.crossingMinimization.strategy'] = 'LAYER_SWEEP';

        if (centerNodes) {
            // Use NETWORK_SIMPLEX for better centering
            rootLayoutOptions['elk.layered.nodePlacement.strategy'] = 'NETWORK_SIMPLEX';
            // Center nodes within their layer
            rootLayoutOptions['elk.alignment'] = 'CENTER';
        } else {
            rootLayoutOptions['elk.layered.nodePlacement.strategy'] = 'BRANDES_KOEPF';
        }
    }

    return {
        id: 'root',
        layoutOptions: rootLayoutOptions,
        children: rootChildren,
        edges
    };
}

/**
 * Check if a process is inside a collapsed group
 */
function isInsideCollapsedGroup(nodeId: string, collapsedGroups: Set<string>, groups: Map<string, GroupInfo>): string | null {
    const nodeGroup = extractGroup(nodeId);
    if (nodeGroup === 'root') return null;

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
 * Get effective node ID for edge routing (redirects to collapsed group if needed)
 */
function getEffectiveNodeId(nodeId: string, collapsedGroups: Set<string>, groups: Map<string, GroupInfo>): string {
    const collapsedParent = isInsideCollapsedGroup(nodeId, collapsedGroups, groups);
    return collapsedParent || nodeId;
}

/**
 * Convert ELK layout result to Svelte Flow nodes and edges
 */
function elkToSvelteFlow(
    layoutedGraph: ElkNode,
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    collapsedGroups: Set<string>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Recursively extract nodes from ELK layout
    function extractNodes(elkNode: ElkNode, parentId?: string, offsetX = 0, offsetY = 0): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const x = (child.x || 0) + offsetX;
            const y = (child.y || 0) + offsetY;

            if (child.id.startsWith('group-')) {
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
                if (!isCollapsed && child.children) {
                    extractNodes(child, child.id, x, y);
                }
            } else {
                // Process node
                const process = processMap.get(child.id);
                const groupPath = extractGroup(child.id);

                nodes.push({
                    id: child.id,
                    type: 'process',
                    position: { x: child.x || 0, y: child.y || 0 },
                    data: {
                        label: child.id,
                        status: process?.status || 'NOTSTARTED',
                        errorMessage: process?.last_run_error_message || null,
                        group: groupPath
                    } satisfies ProcessNodeData,
                    ...(parentId && { parentId })
                });
            }
        });
    }

    extractNodes(layoutedGraph);

    // Create edges
    const addedEdges = new Set<string>();
    processes.forEach(process => {
        process.upstream_processes.forEach(upstream => {
            const effectiveSource = getEffectiveNodeId(upstream, collapsedGroups, groups);
            const effectiveTarget = getEffectiveNodeId(process.name, collapsedGroups, groups);

            if (effectiveSource === effectiveTarget) return;

            const edgeId = `${effectiveSource}->${effectiveTarget}`;
            if (addedEdges.has(edgeId)) return;
            addedEdges.add(edgeId);

            const sourceStatus = processMap.get(upstream)?.status || 'NOTSTARTED';
            const targetStatus = process.status;

            edges.push({
                id: edgeId,
                source: effectiveSource,
                target: effectiveTarget,
                type: 'elk',
                animated: targetStatus === 'INPROGRESS',
                style: getEdgeStyle(sourceStatus, targetStatus)
            });
        });
    });

    return { nodes, edges };
}

/**
 * Async layout using ELK
 */
export async function processesToFlowAsync(
    processes: Process[],
    collapsedGroups: Set<string> = new Set(),
    layoutOptions: LayoutOptions = {}
): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    const groups = buildGroupHierarchy(processes);
    const elkGraph = buildElkGraph(processes, groups, collapsedGroups, layoutOptions);
    const layoutedGraph = await elk.layout(elkGraph);

    return elkToSvelteFlow(layoutedGraph, processes, processMap, groups, collapsedGroups);
}

/**
 * Get edge styling based on status
 */
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
