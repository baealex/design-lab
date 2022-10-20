export interface DebounceRunner<T> {
  (e?: T): boolean;
  clear(): void;
}

export function useDebounce<T>(func: (e?: T) => void, timing: number): DebounceRunner<T> {
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
