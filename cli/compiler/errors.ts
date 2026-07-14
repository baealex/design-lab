export type BuildStage = 'parse' | 'style' | 'script' | 'compose' | 'emit';

export interface LabBuildError {
    stage: BuildStage;
    file: string;
    line?: number;
    column?: number;
    message: string;
    detail?: string;
}

export class LabCompilerError extends Error {
    readonly buildError: LabBuildError;

    constructor(buildError: LabBuildError) {
        super(buildError.message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'LabCompilerError';
        this.buildError = buildError;
    }
}

export function toLabBuildError(
    error: unknown,
    fallback: Pick<LabBuildError, 'stage' | 'file'>,
): LabBuildError {
    if (error instanceof LabCompilerError) {
        return error.buildError;
    }

    if (error instanceof Error) {
        return {
            ...fallback,
            message: error.message,
            detail: error.stack,
        };
    }

    return {
        ...fallback,
        message: String(error),
    };
}
