export interface ClientManagerItems {
    id: string;
    onChange: (value: string) => void;
    onError: (message: string) => void;
}

export const clientManager = (() => {
    let items: ClientManagerItems[] = [];

    return {
        run(value: string) {
            items.forEach(({ onChange }) => onChange(value));
        },
        error(message: string) {
            items.forEach(({ onError }) => onError(message));
        },
        push(item: ClientManagerItems) {
            items.push(item);
        },
        remove(removeId: string) {
            items = items.filter(({ id }) => id !== removeId);
        }
    };
})();
