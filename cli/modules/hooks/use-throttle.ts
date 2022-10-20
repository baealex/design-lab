export function useThrottle(func: (e?: Event) => void, timing: number) {
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
