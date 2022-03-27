export interface DebounceEventRunner {
    (e?: Event | string): boolean;
    clear(): void;
}

export function debounceEvent(func: (e?: Event | string) => void, timing: number): DebounceEventRunner {
    let timer: NodeJS.Timeout;

    const runner = function(e?: Event | string) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func(e), timing);
        return true;
    };

    runner.clear = function() {
        if (timer) clearTimeout(timer);
    };

    return runner;
}

export function throttleEvent(func: (e?: Event) => void, timing: number) {
    let isReady = true;

    return (e?: Event) => {
        if (isReady) {
            isReady = false;
            func(e);
            setTimeout(() => {
                isReady = true;
            }, timing);
        }
    };
}