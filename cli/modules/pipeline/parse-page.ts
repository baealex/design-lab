export interface PageMetadata {
    layout: string;
    title: string;
    description: string;
}

export interface PageDefinition {
    metadata: PageMetadata;
    style: string;
    body: string;
    script: string;
}

function extractMetadata(source: string): PageMetadata {
    const layoutMatch = source.match(/<!--\s*layout:\s*(.+?)\s*-->/);
    const titleMatch = source.match(/<!--\s*title:\s*(.+?)\s*-->/);
    const descriptionMatch = source.match(/<!--\s*description:\s*(.+?)\s*-->/);

    return {
        layout: layoutMatch?.[1] ?? '',
        title: titleMatch?.[1] ?? '',
        description: descriptionMatch?.[1] ?? '',
    };
}

function extractTagContent(source: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const match = source.match(regex);
    return match?.[1] ?? '';
}

export function parsePage(source: string): PageDefinition {
    return {
        metadata: extractMetadata(source),
        style: extractTagContent(source, 'style'),
        body: extractTagContent(source, 'body'),
        script: extractTagContent(source, 'script'),
    };
}
