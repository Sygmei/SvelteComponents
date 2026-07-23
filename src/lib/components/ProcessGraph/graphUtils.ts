import type { GroupNodeData, Process, ProcessNodeData } from './types';
import type { Node, Edge } from '@xyflow/svelte';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import { writable } from 'svelte/store';

// Node dimensions
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GROUP_PADDING = 40;
const GROUP_HEADER = 40;
const MAPPED_GRID_GAP = 16;

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
    mappedTasks: string[];
}

interface MappedTaskInfo {
    baseProcess: Process;
    instances: Process[];
    nodeId: string;
}

const MAPPED_TASK_NODE_PREFIX = 'mapped-task-';

function getMappedTaskBaseName(processName: string): string | null {
    const match = processName.match(/^(.*)\[\{\?:.+\}\]$/);
    return match?.[1] || null;
}

function getMappedTaskNodeId(baseName: string): string {
    return `${MAPPED_TASK_NODE_PREFIX}${baseName}`;
}

/**
 * A mapped task is represented by one template process plus one or more
 * resolved instances whose synthetic names end in `[{?:...}]`.
 */
function findMappedTasks(processes: Process[]): Map<string, MappedTaskInfo> {
    const processMap = new Map(processes.map(process => [process.name, process]));
    const mappedTasks = new Map<string, MappedTaskInfo>();

    processes.forEach(process => {
        if (process.name_template_substitution === null) return;

        const baseName = getMappedTaskBaseName(process.name);
        if (!baseName) return;

        const baseProcess = processMap.get(baseName);
        if (!baseProcess || baseProcess.name_template_substitution !== null) return;

        const existing = mappedTasks.get(baseName);
        if (existing) {
            existing.instances.push(process);
        } else {
            mappedTasks.set(baseName, {
                baseProcess,
                instances: [process],
                nodeId: getMappedTaskNodeId(baseName)
            });
        }
    });

    return mappedTasks;
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
function buildGroupHierarchy(
    processes: Process[],
    mappedTasks: Map<string, MappedTaskInfo>
): Map<string, GroupInfo> {
    const groups = new Map<string, GroupInfo>();
    const mappedInstanceNames = new Set(
        [...mappedTasks.values()].flatMap(mappedTask =>
            mappedTask.instances.map(instance => instance.name)
        )
    );

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
                    childGroups: [],
                    mappedTasks: []
                });
            }
        }

        // Add process to its direct group
        const directGroup = groups.get(groupPath);
        if (directGroup) {
            if (mappedTasks.has(p.name)) {
                if (!directGroup.mappedTasks.includes(p.name)) {
                    directGroup.mappedTasks.push(p.name);
                }
            } else if (!mappedInstanceNames.has(p.name)) {
                directGroup.processes.push(p.name);
            }
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
    mappedTasks: Map<string, MappedTaskInfo>,
    collapsedGroups: Set<string>,
    layoutOptions: LayoutOptions = {}
): ElkNode {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    const algorithm = layoutOptions.algorithm || 'layered';
    const direction = layoutOptions.direction || 'DOWN';
    const centerNodes = layoutOptions.centerNodes ?? true;

    function getGroupLayoutOptions(): Record<string, string> {
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

        return groupLayoutOptions;
    }

    function buildMappedTaskNode(mappedTask: MappedTaskInfo): ElkNode {
        if (collapsedGroups.has(mappedTask.nodeId)) {
            return {
                id: mappedTask.nodeId,
                width: COLLAPSED_GROUP_WIDTH,
                height: COLLAPSED_GROUP_HEIGHT,
                layoutOptions: {
                    'elk.padding': '[top=10,left=10,bottom=10,right=10]'
                }
            };
        }

        const columnCount = Math.max(
            1,
            Math.ceil(Math.sqrt(mappedTask.instances.length))
        );
        const rowCount = Math.ceil(
            mappedTask.instances.length / columnCount
        );
        const contentWidth =
            columnCount * NODE_WIDTH +
            Math.max(0, columnCount - 1) * MAPPED_GRID_GAP;
        const contentHeight =
            rowCount * NODE_HEIGHT +
            Math.max(0, rowCount - 1) * MAPPED_GRID_GAP;

        return {
            id: mappedTask.nodeId,
            width: contentWidth + GROUP_PADDING * 2,
            height: contentHeight + GROUP_HEADER + GROUP_PADDING * 2,
            layoutOptions: {
                'elk.algorithm': 'fixed',
                'elk.nodeSize.fixedGraphSize': 'true',
                'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
            },
            children: mappedTask.instances.map((instance, index) => ({
                id: instance.name,
                x:
                    GROUP_PADDING +
                    (index % columnCount) *
                        (NODE_WIDTH + MAPPED_GRID_GAP),
                y:
                    GROUP_HEADER +
                    GROUP_PADDING +
                    Math.floor(index / columnCount) *
                        (NODE_HEIGHT + MAPPED_GRID_GAP),
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            }))
        };
    }

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

        group.mappedTasks.forEach(baseName => {
            const mappedTask = mappedTasks.get(baseName);
            if (mappedTask) {
                children.push(buildMappedTaskNode(mappedTask));
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

        return {
            id: groupNodeId,
            layoutOptions: getGroupLayoutOptions(),
            children
        };
    }

    // Build root children
    const rootChildren: ElkNode[] = [];
    const mappedInstanceNames = new Set(
        [...mappedTasks.values()].flatMap(mappedTask =>
            mappedTask.instances.map(instance => instance.name)
        )
    );

    // Add root-level processes
    processes.forEach(p => {
        if (
            !p.name.includes('.') &&
            !mappedTasks.has(p.name) &&
            !mappedInstanceNames.has(p.name)
        ) {
            rootChildren.push({
                id: p.name,
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            });
        }
    });

    mappedTasks.forEach(mappedTask => {
        if (extractGroup(mappedTask.baseProcess.name) === 'root') {
            rootChildren.push(buildMappedTaskNode(mappedTask));
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
            const effectiveSource = getEffectiveNodeId(
                upstream,
                collapsedGroups,
                mappedTasks
            );
            const effectiveTarget = getEffectiveNodeId(
                process.name,
                collapsedGroups,
                mappedTasks
            );

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
function isInsideCollapsedGroup(
    nodeId: string,
    collapsedGroups: Set<string>
): string | null {
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
function getEffectiveNodeId(
    nodeId: string,
    collapsedGroups: Set<string>,
    mappedTasks: Map<string, MappedTaskInfo>
): string {
    const collapsedParent = isInsideCollapsedGroup(nodeId, collapsedGroups);
    if (collapsedParent) return collapsedParent;

    const mappedTask = mappedTasks.get(nodeId);
    if (mappedTask) return mappedTask.nodeId;

    const baseName = getMappedTaskBaseName(nodeId);
    const mappedParent = baseName ? mappedTasks.get(baseName) : undefined;
    if (mappedParent) {
        return mappedParent.nodeId;
    }

    return nodeId;
}

/**
 * Convert ELK layout result to Svelte Flow nodes and edges
 */
function elkToSvelteFlow(
    layoutedGraph: ElkNode,
    processes: Process[],
    processMap: Map<string, Process>,
    groups: Map<string, GroupInfo>,
    mappedTasks: Map<string, MappedTaskInfo>,
    collapsedGroups: Set<string>
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const mappedTasksByNodeId = new Map(
        [...mappedTasks.values()].map(mappedTask => [mappedTask.nodeId, mappedTask])
    );

    // Recursively extract nodes from ELK layout
    function extractNodes(elkNode: ElkNode, parentId?: string, offsetX = 0, offsetY = 0): void {
        if (!elkNode.children) return;

        elkNode.children.forEach(child => {
            const x = (child.x || 0) + offsetX;
            const y = (child.y || 0) + offsetY;

            const mappedTask = child.id.startsWith(MAPPED_TASK_NODE_PREFIX)
                ? mappedTasksByNodeId.get(child.id)
                : undefined;

            if (child.id.startsWith('group-') || mappedTask) {
                const groupId = child.id.replace('group-', '');
                const group = groups.get(groupId);
                const isCollapsed = collapsedGroups.has(child.id);
                const groupData: GroupNodeData = mappedTask
                    ? {
                        label: `${mappedTask.baseProcess.resolved_name}[]`,
                        fullPath: mappedTask.baseProcess.resolved_name,
                        collapsed: isCollapsed,
                        mappedTask: true,
                        mappedTaskCount: mappedTask.instances.length
                    }
                    : {
                        label: group?.path[group.path.length - 1] || groupId,
                        fullPath: group?.path.join('.') || groupId,
                        collapsed: isCollapsed
                    };

                nodes.push({
                    id: child.id,
                    type: 'group',
                    position: { x: child.x || 0, y: child.y || 0 },
                    data: groupData,
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
                if (!process) return;
                const groupPath = extractGroup(child.id);

                nodes.push({
                    id: child.id,
                    type: 'process',
                    position: { x: child.x || 0, y: child.y || 0 },
                    data: {
                        label: process.resolved_name,
                        resolvedName: process.resolved_name,
                        nameTemplateSubstitution: process.name_template_substitution,
                        status: process.status,
                        errorMessage: process.last_run_error_message,
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
            const effectiveSource = getEffectiveNodeId(
                upstream,
                collapsedGroups,
                mappedTasks
            );
            const effectiveTarget = getEffectiveNodeId(
                process.name,
                collapsedGroups,
                mappedTasks
            );

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

    const mappedTasks = findMappedTasks(processes);
    const groups = buildGroupHierarchy(processes, mappedTasks);
    const elkGraph = buildElkGraph(
        processes,
        groups,
        mappedTasks,
        collapsedGroups,
        layoutOptions
    );
    const layoutedGraph = await elk.layout(elkGraph);

    return elkToSvelteFlow(
        layoutedGraph,
        processes,
        processMap,
        groups,
        mappedTasks,
        collapsedGroups
    );
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
