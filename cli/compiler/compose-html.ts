import * as fs from 'fs-extra';
import * as path from 'path';

import { LabCompilerError } from './errors';
import {
    getAttribute,
    type HtmlNode,
    parseDocument,
    parseHtmlFragment,
    walkHtml,
} from './html-tree';

const DEFAULT_LAYOUTS_PATH = path.resolve('src/layouts');
const DEFAULT_PARTIALS_PATH = path.resolve('src/partials');
const REQUIRED_LAYOUT_SLOTS = ['title', 'body'];
const PARTIAL_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
const LAYOUT_NAME_PATTERN = /^[a-z0-9][a-z0-9_.-]*\.html$/i;

interface Replacement {
    start: number;
    end: number;
    value: string;
}

export interface ComposeOptions {
    isDev?: boolean;
    pageFile?: string;
    layoutsPath?: string;
    partialsPath?: string;
}

export interface CompositionResult {
    html: string;
    dependencies: string[];
}

function replaceRanges(source: string, replacements: Replacement[]): string {
    return replacements
        .sort((a, b) => b.start - a.start)
        .reduce((result, replacement) => {
            return result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end);
        }, source);
}

function getLabNodes(source: string, fragment: boolean): HtmlNode[] {
    const root = fragment ? parseHtmlFragment(source) : parseDocument(source);
    const nodes: HtmlNode[] = [];
    walkHtml(root, node => {
        if (node.tagName?.startsWith('lab:')) nodes.push(node);
    });
    return nodes;
}

function assertKnownDirectives(nodes: HtmlNode[], file: string) {
    nodes.forEach(node => {
        if (node.tagName === 'lab:slot' || node.tagName === 'lab:use') return;
        throw new LabCompilerError({
            stage: 'compose',
            file,
            line: node.sourceCodeLocation?.startLine,
            column: node.sourceCodeLocation?.startCol,
            message: `Unknown Lab directive: <${node.tagName}>.`,
        });
    });
}

function assertClosed(node: HtmlNode, file: string) {
    if (node.sourceCodeLocation?.startTag && node.sourceCodeLocation.endTag) return;
    throw new LabCompilerError({
        stage: 'compose',
        file,
        line: node.sourceCodeLocation?.startLine,
        column: node.sourceCodeLocation?.startCol,
        message: `<${node.tagName}> must have an explicit closing tag.`,
    });
}

function resolveLayoutPath(name: string, layoutsPath: string): string {
    if (!LAYOUT_NAME_PATTERN.test(name) || path.basename(name) !== name) {
        throw new LabCompilerError({
            stage: 'compose',
            file: name,
            message: `Invalid Layout name: ${name}.`,
        });
    }

    const layoutPath = path.resolve(layoutsPath, name);
    if (!fs.existsSync(layoutPath)) {
        throw new LabCompilerError({
            stage: 'compose',
            file: layoutPath,
            message: `Layout not found: ${name}.`,
        });
    }
    return layoutPath;
}

function resolvePartialPath(name: string, partialsPath: string, callFile: string, node: HtmlNode): string {
    if (!PARTIAL_NAME_PATTERN.test(name)) {
        throw new LabCompilerError({
            stage: 'compose',
            file: callFile,
            line: node.sourceCodeLocation?.startLine,
            column: node.sourceCodeLocation?.startCol,
            message: `Invalid Partial name: ${name || '(empty)'}.`,
        });
    }

    const partialPath = path.resolve(partialsPath, `${name}.html`);
    const relative = path.relative(path.resolve(partialsPath), partialPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new LabCompilerError({
            stage: 'compose',
            file: callFile,
            line: node.sourceCodeLocation?.startLine,
            column: node.sourceCodeLocation?.startCol,
            message: `Partial path escapes src/partials: ${name}.`,
        });
    }

    if (!fs.existsSync(partialPath)) {
        throw new LabCompilerError({
            stage: 'compose',
            file: callFile,
            line: node.sourceCodeLocation?.startLine,
            column: node.sourceCodeLocation?.startCol,
            message: `Partial not found: ${name}.`,
        });
    }
    return partialPath;
}

function expandUses(
    source: string,
    file: string,
    partialsPath: string,
    dependencies: Set<string>,
    stack: string[],
    fragment: boolean,
): string {
    const nodes = getLabNodes(source, fragment);
    assertKnownDirectives(nodes, file);

    const uses = nodes.filter(node => node.tagName === 'lab:use');
    const replacements = uses.map(node => {
        assertClosed(node, file);
        const name = getAttribute(node, 'partial') ?? '';
        const partialPath = resolvePartialPath(name, partialsPath, file, node);

        if (stack.includes(name)) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                line: node.sourceCodeLocation?.startLine,
                column: node.sourceCodeLocation?.startCol,
                message: `Partial cycle detected: ${stack.concat(name).join(' → ')}`,
            });
        }

        dependencies.add(partialPath);
        const partialSource = fs.readFileSync(partialPath, 'utf8');
        const expanded = expandUses(
            partialSource,
            partialPath,
            partialsPath,
            dependencies,
            stack.concat(name),
            true,
        );
        const location = node.sourceCodeLocation!;
        return {
            start: location.startOffset,
            end: location.endOffset,
            value: expanded,
        };
    });

    return replaceRanges(source, replacements);
}

function fillSlots(source: string, slots: Record<string, string>, file: string): string {
    const nodes = getLabNodes(source, false);
    assertKnownDirectives(nodes, file);

    const slotNodes = nodes.filter(node => node.tagName === 'lab:slot');
    const names = new Set<string>();

    slotNodes.forEach(node => {
        assertClosed(node, file);
        const name = getAttribute(node, 'name') ?? '';
        if (!name) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                line: node.sourceCodeLocation?.startLine,
                column: node.sourceCodeLocation?.startCol,
                message: 'Lab slot requires a static name attribute.',
            });
        }
        if (names.has(name)) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                line: node.sourceCodeLocation?.startLine,
                column: node.sourceCodeLocation?.startCol,
                message: `Duplicate Layout slot: ${name}.`,
            });
        }
        names.add(name);
    });

    REQUIRED_LAYOUT_SLOTS.forEach(name => {
        if (!names.has(name)) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                message: `Missing required Layout slot: ${name}.`,
            });
        }
    });

    const replacements = slotNodes.map(node => {
        const name = getAttribute(node, 'name')!;
        const location = node.sourceCodeLocation!;
        const fallback = source.slice(location.startTag!.endOffset, location.endTag!.startOffset);
        return {
            start: location.startOffset,
            end: location.endOffset,
            value: Object.prototype.hasOwnProperty.call(slots, name) ? slots[name] : fallback,
        };
    });

    return replaceRanges(source, replacements);
}

function validateFinalHtml(html: string, file: string, isDev: boolean) {
    const root = parseDocument(html);
    const ids = new Map<string, HtmlNode>();

    walkHtml(root, node => {
        if (node.tagName?.startsWith('lab:')) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                line: node.sourceCodeLocation?.startLine,
                column: node.sourceCodeLocation?.startCol,
                message: `Unresolved Lab directive: <${node.tagName}>.`,
            });
        }

        const id = getAttribute(node, 'id');
        if (!id) return;
        if (ids.has(id)) {
            throw new LabCompilerError({
                stage: 'compose',
                file,
                line: node.sourceCodeLocation?.startLine,
                column: node.sourceCodeLocation?.startCol,
                message: `Duplicate id in composed HTML: ${id}.`,
            });
        }
        ids.set(id, node);
    });

    if (!isDev && (html.includes('/__lab/') || html.includes('/socket.io/socket.io.js'))) {
        throw new LabCompilerError({
            stage: 'compose',
            file,
            message: 'Production HTML contains the Lab development client.',
        });
    }
}

export function composeHtml(
    layoutName: string,
    slots: Record<string, string>,
    options: ComposeOptions = {},
): CompositionResult {
    const layoutsPath = path.resolve(options.layoutsPath ?? DEFAULT_LAYOUTS_PATH);
    const partialsPath = path.resolve(options.partialsPath ?? DEFAULT_PARTIALS_PATH);
    const layoutPath = resolveLayoutPath(layoutName, layoutsPath);
    const dependencies = new Set<string>([layoutPath]);
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');
    const expanded = expandUses(layoutSource, layoutPath, partialsPath, dependencies, [], false);
    const html = fillSlots(expanded, slots, layoutPath);

    validateFinalHtml(html, options.pageFile ?? layoutPath, options.isDev ?? false);

    return {
        html,
        dependencies: Array.from(dependencies),
    };
}

export function injectDevClient(html: string, file: string): string {
    const root = parseDocument(html);
    let body: HtmlNode | undefined;
    walkHtml(root, node => {
        if (!body && node.tagName === 'body') body = node;
    });

    if (!body?.sourceCodeLocation?.endTag) {
        throw new LabCompilerError({
            stage: 'compose',
            file,
            message: 'Cannot inject the Lab development client without an explicit </body>.',
        });
    }

    const clientTags = [
        '    <script src="/socket.io/socket.io.js"></script>',
        '    <script src="/__lab/client.js"></script>',
    ].join('\n');
    const offset = body.sourceCodeLocation.endTag.startOffset;
    return `${html.slice(0, offset)}${clientTags}\n${html.slice(offset)}`;
}

