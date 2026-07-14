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

function extractNodeContent(source: string, node: HtmlNode, tagName: string, file: string): string {
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

function extractElementContent(source: string, root: HtmlNode, tagName: string, file: string): string {
    const node = findElement(root, tagName);
    return node ? extractNodeContent(source, node, tagName, file) : '';
}

function findTemplateBody(source: string, root: HtmlNode, file: string): HtmlNode {
    const markers: HtmlNode[] = [];

    walkHtml(root, node => {
        if (node.nodeName === '#comment' && node.data?.trim() === 'lab:template') {
            markers.push(node);
        }
    });

    if (markers.length === 0) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            message: 'Missing required Page template marker: <!-- lab:template -->.',
        });
    }

    if (markers.length > 1) {
        const location = markers[1].sourceCodeLocation;
        throw new LabCompilerError({
            stage: 'parse',
            file,
            line: location?.startLine,
            column: location?.startCol,
            message: 'Duplicate Page template marker: <!-- lab:template -->.',
        });
    }

    const markerLocation = markers[0].sourceCodeLocation;
    const body = findElement(root, 'body');
    const bodyLocation = body?.sourceCodeLocation;
    const markerEnd = markerLocation?.endOffset;
    const bodyStart = bodyLocation?.startTag?.startOffset;
    const isImmediatelyFollowed = markerEnd !== undefined
        && bodyStart !== undefined
        && bodyStart >= markerEnd
        && source.slice(markerEnd, bodyStart).trim() === '';

    if (!body || !isImmediatelyFollowed) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            line: markerLocation?.startLine,
            column: markerLocation?.startCol,
            message: '<!-- lab:template --> must be followed immediately by an explicit <body> block.',
        });
    }

    return body;
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

    const bodyNode = findTemplateBody(source, root, file);

    return {
        metadata,
        style: extractElementContent(source, root, 'style', file),
        body: extractNodeContent(source, bodyNode, 'body', file),
        script: extractElementContent(source, root, 'script', file),
    };
}

