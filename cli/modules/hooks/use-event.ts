export interface DebounceEventRunner<T> {
    (e?: T): boolean;
    clear(): void;
}

export function useDebounceEvent<T>(func: (e?: T) => void, timing: number): DebounceEventRunner<T> {
    let timer: NodeJS.Timeout;

    const runner = function(e?: T) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func(e), timing);
        return true;
    };

    runner.clear = function() {
        if (timer) clearTimeout(timer);
    };

    return runner;
}

export function useThrottleEvent(func: (e?: Event) => void, timing: number) {
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