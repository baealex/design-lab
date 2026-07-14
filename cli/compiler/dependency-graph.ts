import * as path from 'path';

export class DependencyGraph {
    private readonly pageDependencies = new Map<string, Set<string>>();
    private readonly dependencyPages = new Map<string, Set<string>>();

    updatePage(page: string, dependencies: Iterable<string>) {
        this.removePage(page);

        const normalized = new Set(Array.from(dependencies, dependency => path.resolve(dependency)));
        this.pageDependencies.set(page, normalized);

        normalized.forEach(dependency => {
            const pages = this.dependencyPages.get(dependency) ?? new Set<string>();
            pages.add(page);
            this.dependencyPages.set(dependency, pages);
        });
    }

    removePage(page: string) {
        this.pageDependencies.get(page)?.forEach(dependency => {
            const pages = this.dependencyPages.get(dependency);
            pages?.delete(page);
            if (pages?.size === 0) this.dependencyPages.delete(dependency);
        });
        this.pageDependencies.delete(page);
    }

    getDependencies(page: string): string[] {
        return Array.from(this.pageDependencies.get(page) ?? []);
    }

    getAffectedPages(dependency: string): string[] {
        return Array.from(this.dependencyPages.get(path.resolve(dependency)) ?? []);
    }

    clear() {
        this.pageDependencies.clear();
        this.dependencyPages.clear();
    }
}

