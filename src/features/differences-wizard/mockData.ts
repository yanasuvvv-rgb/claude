import type { DiffNode, CompareRunInfo, SourceRef } from './types';

export const mockSource: SourceRef = {
  id: 'src-erp-1',
  name: 'Собственное хранилище',
  hasPhysicalModel: true,
};

export const mockLastRun: CompareRunInfo = {
  finishedAt: '2026-09-04T02:00:00',
  trigger: 'schedule',
};

let idCounter = 0;
const nextId = () => `n${++idCounter}`;

export function buildMockDiffTree(): DiffNode[] {
  idCounter = 0;
  return [
    {
      id: nextId(),
      level: 'schema',
      name: 'INTEGRATOR',
      operation: 'updated',
      children: [
        {
          id: nextId(),
          level: 'table',
          name: 'ITG_ATTRIBUTES_BO_IN_DS',
          operation: 'added',
          children: [
            { id: nextId(), level: 'column', name: 'BO_BO_ID', operation: 'added' },
            { id: nextId(), level: 'column', name: 'ATTRIBUTE_CODE', operation: 'added' },
            { id: nextId(), level: 'column', name: 'DATA_TYPE', operation: 'added' },
            {
              id: nextId(),
              level: 'constraint',
              name: 'PK_ITG_ATTRIBUTES_BO_IN_DS',
              operation: 'added',
            },
          ],
        },
        {
          id: nextId(),
          level: 'table',
          name: 'ORDERS',
          operation: 'updated',
          children: [
            {
              id: nextId(),
              level: 'column',
              name: 'LOYALTY_TIER_CODE',
              operation: 'added',
            },
            {
              id: nextId(),
              level: 'column',
              name: 'SEGMENT_ID',
              operation: 'added',
            },
            {
              id: nextId(),
              level: 'column',
              name: 'STATUS',
              operation: 'updated',
              changes: [{ field: 'Тип данных', oldValue: 'VARCHAR(10)', newValue: 'VARCHAR(20)' }],
            },
            {
              id: nextId(),
              level: 'column',
              name: 'CUSTOMER_ID',
              operation: 'updated',
              changes: [{ field: 'Nullable', oldValue: 'true', newValue: 'false' }],
            },
            {
              id: nextId(),
              level: 'constraint',
              name: 'FK_ORDERS_CUSTOMER',
              operation: 'updated',
              changes: [{ field: 'Ссылка на таблицу', oldValue: 'CUSTOMER', newValue: 'CUSTOMERS' }],
            },
          ],
        },
        {
          id: nextId(),
          level: 'table',
          name: 'TMP_STAGING_ORDERS',
          operation: 'deleted',
          children: [
            { id: nextId(), level: 'column', name: 'ID', operation: 'deleted' },
            { id: nextId(), level: 'column', name: 'RAW_PAYLOAD', operation: 'deleted' },
          ],
        },
      ],
    },
    {
      id: nextId(),
      level: 'schema',
      name: 'ATOLL',
      operation: 'updated',
      children: [
        {
          id: nextId(),
          level: 'table',
          name: 'WELLS',
          operation: 'updated',
          children: [
            {
              id: nextId(),
              level: 'column',
              name: 'FIELD_NAME',
              operation: 'added',
            },
            {
              id: nextId(),
              level: 'constraint',
              name: 'UQ_WELLS_CODE',
              operation: 'deleted',
            },
          ],
        },
        {
          id: nextId(),
          level: 'table',
          name: 'REPAIRS',
          operation: 'added',
          children: [
            { id: nextId(), level: 'column', name: 'REPAIR_ID', operation: 'added' },
            { id: nextId(), level: 'column', name: 'WELL_ID', operation: 'added' },
            { id: nextId(), level: 'column', name: 'STARTED_AT', operation: 'added' },
          ],
        },
      ],
    },
  ];
}
