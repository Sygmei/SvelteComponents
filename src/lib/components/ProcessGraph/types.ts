export type ProcessStatus = 'NOTSTARTED' | 'SKIPPED' | 'INPROGRESS' | 'SUCCESS' | 'FAILED' | 'ROLLBACKED';

export interface Process {
    kind: string;
    name: string;
    resolved_name: string;
    name_template_substitution: string | null;
    upstream_processes: string[];
    status: ProcessStatus;
    last_run_error_message: string | null;
}

export interface ProcessGraphData {
    processes: Process[];
}

export interface ProcessNodeData {
    label: string;
    resolvedName: string;
    nameTemplateSubstitution: string | null;
    status: ProcessStatus;
    errorMessage: string | null;
    group: string;
}

export interface GroupNodeData {
    label: string;
    fullPath: string;
    collapsed?: boolean;
    mappedTask?: boolean;
    mappedTaskCount?: number;
    onToggleCollapse?: (groupId: string) => void;
}

export interface RadialMenuAction {
    id: string;
    label: string;
    icon: string;
    color: string;
    hoverColor: string;
    onAction?: (nodeId: string, nodeData: ProcessNodeData) => void;
}
