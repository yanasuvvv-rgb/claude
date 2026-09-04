export type DiffOperation = 'added' | 'updated' | 'deleted';

export type DiffLevel = 'schema' | 'table' | 'column' | 'constraint';

export interface DiffFieldChange {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface DiffNode {
  id: string;
  level: DiffLevel;
  name: string;
  operation: DiffOperation;
  /** Present only for "updated" nodes: what actually changed. */
  changes?: DiffFieldChange[];
  children?: DiffNode[];
}

export interface DiffSummary {
  added: number;
  updated: number;
  deleted: number;
}

export type CompareRunTrigger = 'schedule' | 'manual';

export interface CompareRunInfo {
  finishedAt: string;
  trigger: CompareRunTrigger;
}

export interface SourceRef {
  id: string;
  name: string;
  hasPhysicalModel: boolean;
}
