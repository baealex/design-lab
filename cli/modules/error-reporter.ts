type ErrorHandler = (error: string) => void;

let handler: ErrorHandler | null = null;

export function setErrorHandler(fn: ErrorHandler) {
    handler = fn;
}

export function reportError(error: string) {
    if (handler) {
        handler(error);
    }
}

export function clearError() {
    if (handler) {
        handler('');
    }
}
