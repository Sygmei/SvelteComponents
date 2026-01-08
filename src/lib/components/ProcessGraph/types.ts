export type ProcessStatus = 'NOTSTARTED' | 'SKIPPED' | 'INPROGRESS' | 'SUCCESS' | 'FAILED' | 'ROLLBACKED';

export interface Process {
    kind: string;
    name: string;
    upstream_processes: string[];
    status: ProcessStatus;
    last_run_error_message: string | null;
}

export interface ProcessGraphData {
    processes: Process[];
}

export interface ProcessNodeData {
    label: string;
    status: ProcessStatus;
    errorMessage: string | null;
    group: string;
}
