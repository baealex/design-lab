import { parse, parseFragment } from 'parse5';

export interface SourcePosition {
    startLine: number;
    startCol: number;
    startOffset: number;
    endLine: number;
    endCol: number;
    endOffset: number;
}

export interface ElementLocation extends SourcePosition {
    startTag?: SourcePosition;
    endTag?: SourcePosition;
}

export interface HtmlAttribute {
    name: string;
    value: string;
}

export interface HtmlNode {
    nodeName: string;
    tagName?: string;
    attrs?: HtmlAttribute[];
    childNodes?: HtmlNode[];
    content?: HtmlNode;
    data?: string;
    sourceCodeLocation?: ElementLocation | null;
}

export function parseDocument(source: string): HtmlNode {
    return parse(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
}

export function parseHtmlFragment(source: string): HtmlNode {
    return parseFragment(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
}

export function walkHtml(node: HtmlNode, visit: (node: HtmlNode) => void) {
    visit(node);
    node.childNodes?.forEach(child => walkHtml(child, visit));
    if (node.content) walkHtml(node.content, visit);
}

export function getAttribute(node: HtmlNode, name: string): string | undefined {
    return node.attrs?.find(attribute => attribute.name === name)?.value;
}

