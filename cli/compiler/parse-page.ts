import { LabCompilerError } from './errors';
import { type HtmlNode, parseDocument, walkHtml } from './html-tree';

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

function extractMetadata(root: HtmlNode): PageMetadata {
    const values: Partial<PageMetadata> = {};

    walkHtml(root, node => {
        if (node.nodeName !== '#comment' || !node.data) return;

        const match = node.data.match(/^\s*(layout|title|description):\s*([\s\S]*?)\s*$/);
        if (!match) return;

        const key = match[1] as keyof PageMetadata;
        if (values[key] === undefined) values[key] = match[2];
    });

    return {
        layout: values.layout ?? '',
        title: values.title ?? '',
        description: values.description ?? '',
    };
}

function findElement(root: HtmlNode, tagName: string): HtmlNode | undefined {
    let match: HtmlNode | undefined;
    walkHtml(root, node => {
        if (!match && node.tagName === tagName) match = node;
    });
    return match;
}

function extractElementContent(source: string, root: HtmlNode, tagName: string, file: string): string {
    const node = findElement(root, tagName);
    if (!node) return '';

    const location = node.sourceCodeLocation;
    if (!location?.startTag || !location.endTag) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            line: location?.startLine,
            column: location?.startCol,
            message: `<${tagName}> must have an explicit closing tag.`,
        });
    }

    return source.slice(location.startTag.endOffset, location.endTag.startOffset);
}

export function parsePage(source: string, file = '<page>'): PageDefinition {
    const root = parseDocument(source);
    const metadata = extractMetadata(root);

    if (!metadata.layout) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            message: 'Missing required metadata: layout.',
        });
    }

    if (!metadata.title) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            message: 'Missing required metadata: title.',
        });
    }

    const body = extractElementContent(source, root, 'body', file);
    if (!findElement(root, 'body')) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            message: 'Missing required <body> block.',
        });
    }

    return {
        metadata,
        style: extractElementContent(source, root, 'style', file),
        body,
        script: extractElementContent(source, root, 'script', file),
    };
}

