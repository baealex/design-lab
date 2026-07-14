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

type PageBlockName = 'style' | 'body' | 'script';
type TemplateMode = 'template' | 'bundle';

interface PageBlock {
    name: PageBlockName;
    node: HtmlNode;
    start: number;
    end: number;
}

interface TemplateMarker {
    mode: TemplateMode;
    node: HtmlNode;
    start: number;
    end: number;
}

const PAGE_BLOCK_NAMES = new Set<PageBlockName>(['style', 'body', 'script']);

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

function isPageBlockName(value: string | undefined): value is PageBlockName {
    return value !== undefined && PAGE_BLOCK_NAMES.has(value as PageBlockName);
}

function collectTopLevelPageBlocks(root: HtmlNode): PageBlock[] {
    const blocks: PageBlock[] = [];

    walkHtml(root, node => {
        const startTag = node.sourceCodeLocation?.startTag;
        if (!isPageBlockName(node.tagName) || !startTag) return;
        const location = node.sourceCodeLocation!;
        blocks.push({
            name: node.tagName,
            node,
            start: startTag.startOffset,
            end: location.endTag?.endOffset ?? location.endOffset,
        });
    });

    return blocks
        .filter((candidate, _, all) => !all.some(other => {
            return other !== candidate
                && other.start < candidate.start
                && other.end >= candidate.end;
        }))
        .sort((left, right) => left.start - right.start);
}

function markerMode(value: string, node: HtmlNode, file: string): TemplateMode {
    if (value === 'lab:template') return 'template';
    if (value === 'lab:template:bundle') return 'bundle';

    throw new LabCompilerError({
        stage: 'parse',
        file,
        line: node.sourceCodeLocation?.startLine,
        column: node.sourceCodeLocation?.startCol,
        message: `Unknown Page template directive: <!-- ${value} -->.`,
    });
}

function collectTemplateMarkers(root: HtmlNode, blocks: PageBlock[], file: string): TemplateMarker[] {
    const markers: TemplateMarker[] = [];

    walkHtml(root, node => {
        if (node.nodeName !== '#comment' || !node.data || !node.sourceCodeLocation) return;
        const value = node.data.trim();
        if (!value.startsWith('lab:template')) return;

        const location = node.sourceCodeLocation;
        const isInsidePageBlock = blocks.some(block => {
            return location.startOffset >= block.start && location.endOffset <= block.end;
        });
        if (isInsidePageBlock) {
            throw new LabCompilerError({
                stage: 'parse',
                file,
                line: location.startLine,
                column: location.startCol,
                message: 'Page template directives cannot be nested inside another Page template block.',
            });
        }

        markers.push({
            mode: markerMode(value, node, file),
            node,
            start: location.startOffset,
            end: location.endOffset,
        });
    });

    return markers.sort((left, right) => left.start - right.start);
}

function expectedDirective(name: PageBlockName): string {
    return name === 'body' ? 'lab:template' : 'lab:template:bundle';
}

function parseTemplateBlocks(source: string, root: HtmlNode, file: string) {
    const blocks = collectTopLevelPageBlocks(root);
    const markers = collectTemplateMarkers(root, blocks, file);
    const assigned = new Set<HtmlNode>();
    const values: Record<PageBlockName, string> = {
        style: '',
        body: '',
        script: '',
    };
    const declared = new Set<PageBlockName>();

    markers.forEach(marker => {
        const block = blocks.find(candidate => candidate.start >= marker.end);
        const isImmediate = block !== undefined
            && source.slice(marker.end, block.start).trim() === '';

        if (!block || !isImmediate) {
            throw new LabCompilerError({
                stage: 'parse',
                file,
                line: marker.node.sourceCodeLocation?.startLine,
                column: marker.node.sourceCodeLocation?.startCol,
                message: '<!-- lab:template* --> must be followed immediately by an explicit <style>, <body>, or <script> block.',
            });
        }

        const expected = expectedDirective(block.name);
        const actual = marker.mode === 'bundle' ? 'lab:template:bundle' : 'lab:template';
        if (actual !== expected) {
            throw new LabCompilerError({
                stage: 'parse',
                file,
                line: marker.node.sourceCodeLocation?.startLine,
                column: marker.node.sourceCodeLocation?.startCol,
                message: `<${block.name}> must use <!-- ${expected} -->.`,
            });
        }

        if (assigned.has(block.node) || declared.has(block.name)) {
            throw new LabCompilerError({
                stage: 'parse',
                file,
                line: marker.node.sourceCodeLocation?.startLine,
                column: marker.node.sourceCodeLocation?.startCol,
                message: `Duplicate Page template block: ${block.name}.`,
            });
        }

        if ((block.node.attrs?.length ?? 0) > 0) {
            throw new LabCompilerError({
                stage: 'parse',
                file,
                line: block.node.sourceCodeLocation?.startLine,
                column: block.node.sourceCodeLocation?.startCol,
                message: `<${block.name}> cannot declare attributes because its wrapper is consumed by the Page compiler.`,
            });
        }

        values[block.name] = extractNodeContent(source, block.node, block.name, file);
        assigned.add(block.node);
        declared.add(block.name);
    });

    const unmarked = blocks.find(block => !assigned.has(block.node));
    if (unmarked) {
        const directive = expectedDirective(unmarked.name);
        throw new LabCompilerError({
            stage: 'parse',
            file,
            line: unmarked.node.sourceCodeLocation?.startLine,
            column: unmarked.node.sourceCodeLocation?.startCol,
            message: `<${unmarked.name}> must be preceded immediately by <!-- ${directive} -->.`,
        });
    }

    if (!declared.has('body')) {
        throw new LabCompilerError({
            stage: 'parse',
            file,
            message: 'Missing required Page template block: <!-- lab:template --> followed by <body>.',
        });
    }

    return values;
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

    const blocks = parseTemplateBlocks(source, root, file);

    return {
        metadata,
        style: blocks.style,
        body: blocks.body,
        script: blocks.script,
    };
}
