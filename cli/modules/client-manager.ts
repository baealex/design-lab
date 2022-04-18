export interface ClientManagerItems {
    id: string;
    onChange: (value: string) => void;
}

export const clientManager = (() => {
    let items: ClientManagerItems[] = [];

    return {
        run(value: string) {
            items.forEach(({ onChange }) => onChange(value));
        },
        push(item: ClientManagerItems) {
            items.push(item);
        },
        remove(removeId: string) {
            items = items.filter(({ id }) => id !== removeId);
        }
    };
})();