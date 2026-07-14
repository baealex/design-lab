import type { LabBuildError } from '../compiler';

export const LAB_EVENTS = {
    connected: 'lab:connected',
    buildStart: 'lab:build-start',
    buildComplete: 'lab:build-complete',
    update: 'lab:update',
    error: 'lab:error',
} as const;

export interface LabConnected {
    buildId: string;
    status: 'ready' | 'building' | 'error';
    error?: LabBuildError;
}

export interface LabBuildStart {
    buildId: string;
    files: string[];
}

export interface LabBuildComplete {
    buildId: string;
    durationMs: number;
}

export interface LabUpdate {
    buildId: string;
    kind: 'style' | 'page' | 'global' | 'layout' | 'partial' | 'public';
    pages: string[];
    strategy: 'patch-style' | 'reload-page' | 'reload-all';
    indexDataChanged?: boolean;
}

export interface ServerToClientEvents {
    'lab:connected': (payload: LabConnected) => void;
    'lab:build-start': (payload: LabBuildStart) => void;
    'lab:build-complete': (payload: LabBuildComplete) => void;
    'lab:update': (payload: LabUpdate) => void;
    'lab:error': (payload: LabBuildError) => void;
}

