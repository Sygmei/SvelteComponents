import type { Process, ProcessNodeData } from './types';
import type { Node, Edge } from '@xyflow/svelte';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';

// Node dimensions - constants
const MIN_NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const CHAR_WIDTH = 8;
const GROUP_PADDING = 40;
const GROUP_HEADER = 40;

const elk = new ELK();

/**
 * Calculate the width needed for a process node based on its name
 */
function calculateNodeWidth(processName: string): number {
    const parts = processName.split('.');
    const shortName = parts[parts.length - 1];
    const textWidth = shortName.length * CHAR_WIDTH;
    return Math.max(MIN_NODE_WIDTH, textWidth + 70);
}

/**
 * Converts process data to Svelte Flow nodes and edges with ELK layout
 */
export async function processesToFlowAsync(processes: Process[]): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const processMap = new Map<string, Process>();
    processes.forEach(p => processMap.set(p.name, p));

    // Build group hierarchy
    const groups = buildGroupHierarchy(processes);
    
    // Pre-calculate node widths
    const nodeWidths = new Map<string, number>();
    processes.forEach(p => {
        nodeWidths.set(p.name, calculateNodeWidth(p.name));
    });

    // Build ELK graph with hierarchy
    const elkGraph = buildElkGraph(processes, groups, nodeWidths);
    
    // Run ELK layout
    const layoutedGraph = await elk.layout(elkGraph);
    
    // Convert ELK result to Svelte Flow nodes and edges
    return elkToSvelteFlow(layoutedGraph, processes, processMap, groups);
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
                const width = nodeWidths.get(name) || MIN_NODE_WIDTH;
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
            levelWidth += nodeWidths.get(name) || MIN_NODE_WIDTH;
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
            levelWidth += nodeWidths.get(name) || MIN_NODE_WIDTH;
            if (idx < names.length - 1) levelWidth += 50;
        });
        
        let x = GROUP_PADDING + (groupWidth - GROUP_PADDING * 2 - levelWidth) / 2;
        const y = processStartY + levelIdx * (NODE_HEIGHT + 60);
        
        names.forEach(name => {
            const width = nodeWidths.get(name) || MIN_NODE_WIDTH;
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
            'elk.spacing.nodeNode': '50',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.padding': '[top=20,left=20,bottom=20,right=20]'
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
                width: nodeWidths.get(p.name) || MIN_NODE_WIDTH,
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
            'elk.spacing.nodeNode': '40',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.padding': `[top=${GROUP_HEADER + GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`
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
            width: nodeWidths.get(pName) || MIN_NODE_WIDTH,
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