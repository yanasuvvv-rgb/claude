import type { DiffLevel, DiffNode, DiffOperation, DiffSummary } from './types';

export type OperationFilter = 'all' | DiffOperation;
export type LevelFilter = 'all' | DiffLevel;

/** Every id present in the (unfiltered) tree, node and all descendants. */
export function collectAllIds(nodes: DiffNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: DiffNode[]) => {
    for (const node of list) {
      ids.push(node.id);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

/**
 * Keeps a node if it matches the filters itself, OR any descendant does
 * (so parents of a matching child stay visible even if the parent itself
 * doesn't match). Matching nodes' own children are pruned to matches too.
 */
export function filterTree(
  nodes: DiffNode[],
  opFilter: OperationFilter,
  levelFilter: LevelFilter,
  search: string,
): DiffNode[] {
  const term = search.trim().toLowerCase();

  const matchesSelf = (node: DiffNode) => {
    const opOk = opFilter === 'all' || node.operation === opFilter;
    const levelOk = levelFilter === 'all' || node.level === levelFilter;
    const searchOk = term === '' || node.name.toLowerCase().includes(term);
    return opOk && levelOk && searchOk;
  };

  const walk = (list: DiffNode[]): DiffNode[] => {
    const result: DiffNode[] = [];
    for (const node of list) {
      const filteredChildren = node.children ? walk(node.children) : undefined;
      const selfMatches = matchesSelf(node);
      const hasMatchingChildren = !!filteredChildren && filteredChildren.length > 0;
      if (selfMatches || hasMatchingChildren) {
        result.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
    return result;
  };

  return walk(nodes);
}

/** Summary counts by operation, over every node in the given tree (not just leaves). */
export function summarize(nodes: DiffNode[]): DiffSummary {
  const summary: DiffSummary = { added: 0, updated: 0, deleted: 0 };
  const walk = (list: DiffNode[]) => {
    for (const node of list) {
      if (node.operation === 'added') summary.added++;
      else if (node.operation === 'updated') summary.updated++;
      else if (node.operation === 'deleted') summary.deleted++;
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return summary;
}

/**
 * Tallies operations over an already-flat list of nodes (e.g. the output of
 * `flatten`). Unlike `summarize`, it does NOT recurse into `.children` —
 * every node in a flat list is already its own entry, so recursing into
 * children too would double-count any child whose ancestor is also present.
 */
export function tallyOperations(nodes: DiffNode[]): DiffSummary {
  const summary: DiffSummary = { added: 0, updated: 0, deleted: 0 };
  for (const node of nodes) {
    if (node.operation === 'added') summary.added++;
    else if (node.operation === 'updated') summary.updated++;
    else if (node.operation === 'deleted') summary.deleted++;
  }
  return summary;
}

/**
 * A node's own diff operation is independent of its children's (a schema can
 * be "updated" while one of its tables is "added" and another "deleted"), so
 * cascading the checkbox tree must not make an indeterminate parent drop out
 * of the apply set just because it isn't fully checked. This returns every
 * id that should still count as selected: explicitly checked, or an ancestor
 * of at least one checked descendant (i.e. also indeterminate parents).
 */
export function effectiveSelection(nodes: DiffNode[], checkedIds: Set<string>): Set<string> {
  const result = new Set<string>();
  const walk = (node: DiffNode): boolean => {
    const childChecked = (node.children ?? []).reduce(
      (any, child) => walk(child) || any,
      false,
    );
    const selected = checkedIds.has(node.id) || childChecked;
    if (selected) result.add(node.id);
    return selected;
  };
  nodes.forEach(walk);
  return result;
}

/** Removes every node whose id is in `idsToRemove`, at any depth (subtree included). */
export function removeNodes(nodes: DiffNode[], idsToRemove: Set<string>): DiffNode[] {
  const result: DiffNode[] = [];
  for (const node of nodes) {
    if (idsToRemove.has(node.id)) continue;
    result.push({
      ...node,
      children: node.children ? removeNodes(node.children, idsToRemove) : undefined,
    });
  }
  return result;
}

export function findNode(nodes: DiffNode[], id: string): DiffNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function flatten(nodes: DiffNode[]): DiffNode[] {
  const result: DiffNode[] = [];
  const walk = (list: DiffNode[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}
