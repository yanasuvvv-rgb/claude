import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Progress,
  Segmented,
  Space,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { TreeDataNode } from 'antd';
import {
  CheckCircleFilled,
  CloseOutlined,
  FieldStringOutlined,
  FolderOutlined,
  KeyOutlined,
  MinusCircleFilled,
  PlusCircleFilled,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CompareRunInfo, DiffLevel, DiffNode, DiffOperation, SourceRef } from './types';
import {
  type LevelFilter,
  type OperationFilter,
  collectAllIds,
  filterTree,
  flatten,
  removeNodes,
  summarize,
  tallyOperations,
} from './utils';

const OPERATION_LABEL: Record<DiffOperation, string> = {
  added: 'Добавлено',
  updated: 'Обновлено',
  deleted: 'Удалено',
};

const OPERATION_COLOR: Record<DiffOperation, string> = {
  added: 'success',
  updated: 'processing',
  deleted: 'error',
};

const OPERATION_ICON: Record<DiffOperation, React.ReactNode> = {
  added: <PlusCircleFilled />,
  updated: <ReloadOutlined />,
  deleted: <MinusCircleFilled />,
};

const LEVEL_ICON: Record<DiffLevel, React.ReactNode> = {
  schema: <FolderOutlined />,
  table: <TableOutlined />,
  column: <FieldStringOutlined />,
  constraint: <KeyOutlined />,
};

function nodeToTreeData(node: DiffNode): TreeDataNode {
  const hasChanges = node.operation === 'updated' && node.changes && node.changes.length > 0;
  const title = (
    <Flex align="center" gap={8} style={{ width: '100%' }}>
      <span style={{ color: 'rgba(0,0,0,0.45)' }}>{LEVEL_ICON[node.level]}</span>
      <span>{node.name}</span>
      <Tag color={OPERATION_COLOR[node.operation]} icon={OPERATION_ICON[node.operation]} style={{ marginInlineStart: 'auto' }}>
        {OPERATION_LABEL[node.operation]}
      </Tag>
      {hasChanges && (
        <Tooltip
          title={
            <div>
              {node.changes!.map((c) => (
                <div key={c.field}>
                  <b>{c.field}:</b> {c.oldValue} → {c.newValue}
                </div>
              ))}
            </div>
          }
        >
          <Typography.Link style={{ fontSize: 12 }}>что изменилось?</Typography.Link>
        </Tooltip>
      )}
    </Flex>
  );
  return {
    key: node.id,
    title,
    children: node.children?.map(nodeToTreeData),
  };
}

interface DifferencesWizardProps {
  open: boolean;
  onClose: () => void;
  source: SourceRef;
  diffTree: DiffNode[];
  lastRun: CompareRunInfo;
  onRunFullCompare: () => Promise<DiffNode[]>;
  onApply: (selectedIds: string[]) => Promise<void>;
}

export default function DifferencesWizard({
  open,
  onClose,
  source,
  diffTree,
  lastRun,
  onRunFullCompare,
  onApply,
}: DifferencesWizardProps) {
  const [tree, setTree] = useState(diffTree);
  const [run, setRun] = useState(lastRun);
  const [checkedKeys, setCheckedKeys] = useState<string[]>(collectAllIds(diffTree));
  const [opFilter, setOpFilter] = useState<OperationFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareProgress, setCompareProgress] = useState(0);
  const [applying, setApplying] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const { modal, message } = App.useApp();

  const busy = comparing || applying;

  const filteredTree = useMemo(
    () => filterTree(tree, opFilter, levelFilter, search),
    [tree, opFilter, levelFilter, search],
  );

  const visibleIds = useMemo(() => flatten(filteredTree).map((n) => n.id), [filteredTree]);
  const visibleCheckedKeys = useMemo(
    () => checkedKeys.filter((id) => visibleIds.includes(id)),
    [checkedKeys, visibleIds],
  );

  const summary = useMemo(() => summarize(tree), [tree]);
  const selectedSummary = useMemo(() => {
    const checkedSet = new Set(checkedKeys);
    return tallyOperations(flatten(tree).filter((n) => checkedSet.has(n.id)));
  }, [tree, checkedKeys]);

  const treeData = useMemo(() => filteredTree.map(nodeToTreeData), [filteredTree]);

  const handleSelectAllVisible = () => {
    setCheckedKeys((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAllVisible = () => {
    const visibleSet = new Set(visibleIds);
    setCheckedKeys((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  const runFullCompare = async () => {
    if (busy) return;
    setComparing(true);
    setCompareProgress(0);
    setCancelRequested(false);
    try {
      const timer = setInterval(() => {
        setCompareProgress((p) => Math.min(p + 12, 90));
      }, 200);
      const newTree = await onRunFullCompare();
      clearInterval(timer);
      if (cancelRequested) {
        message.info('Сверка отменена, результаты не сохранены');
        return;
      }
      setCompareProgress(100);
      setTree(newTree);
      setCheckedKeys(collectAllIds(newTree));
      setRun({ finishedAt: new Date().toISOString(), trigger: 'manual' });
      message.success('Сверка завершена, список расхождений обновлён');
    } finally {
      setComparing(false);
    }
  };

  const cancelCompare = () => {
    setCancelRequested(true);
    setComparing(false);
    message.warning('Процесс сверки прерван пользователем');
  };

  const handleApply = () => {
    if (checkedKeys.length === 0) {
      message.warning('Отметьте хотя бы одну операцию для применения');
      return;
    }
    const s = selectedSummary;
    modal.confirm({
      title: 'Подтверждение применения изменений',
      width: 480,
      content: (
        <div>
          <p>Будет выполнена синхронизация физической модели «{source.name}» с источником:</p>
          <ul>
            <li>Добавлено объектов: <b>{s.added}</b></li>
            <li>Обновлено объектов: <b>{s.updated}</b></li>
            <li>Удалено объектов: <b>{s.deleted}</b></li>
          </ul>
          <p>Операции выполняются одной транзакцией — при ошибке все изменения будут отменены.</p>
        </div>
      ),
      okText: 'Применить',
      cancelText: 'Отмена',
      onOk: async () => {
        setApplying(true);
        try {
          await onApply(checkedKeys);
          const remaining = removeNodes(tree, new Set(checkedKeys));
          setTree(remaining);
          setCheckedKeys(collectAllIds(remaining));
          modal.success({
            title: 'Изменения применены',
            content: `Добавлено: ${s.added}, обновлено: ${s.updated}, удалено: ${s.deleted}. Модель обновлена.`,
          });
        } catch {
          modal.error({
            title: 'Не удалось применить изменения',
            content: 'Произошла ошибка при синхронизации, выполнен откат — физическая модель не изменена.',
          });
        } finally {
          setApplying(false);
        }
      },
    });
  };

  return (
    <Modal
      open={open}
      onCancel={busy ? undefined : onClose}
      closable={!busy}
      mask={{ closable: false }}
      width={1300}
      styles={{ body: { padding: 0 } }}
      footer={null}
      title={`Мастер расхождений — ${source.name}`}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 720 }}>
        {/* Summary bar */}
        <Flex
          align="center"
          justify="space-between"
          style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}
        >
          <Space size={24}>
            <StatChip label="Добавлено" value={summary.added} color="#52c41a" />
            <StatChip label="Обновлено" value={summary.updated} color="#1677ff" />
            <StatChip label="Удалено" value={summary.deleted} color="#ff4d4f" />
            <StatChip label="Всего" value={summary.added + summary.updated + summary.deleted} color="rgba(0,0,0,0.65)" />
            <StatChip label="Выбрано" value={checkedKeys.length} color="rgba(0,0,0,0.65)" />
          </Space>
          <Typography.Text type="secondary">
            Последняя сверка: {dayjs(run.finishedAt).format('DD.MM.YYYY HH:mm')}
            {run.trigger === 'manual' ? ' (вручную)' : ''}
          </Typography.Text>
        </Flex>

        {comparing && (
          <div style={{ padding: '8px 24px' }}>
            <Flex align="center" gap={12}>
              <Progress percent={compareProgress} size="small" style={{ flex: 1 }} status="active" />
              <Button size="small" danger onClick={cancelCompare}>
                Отменить сверку
              </Button>
            </Flex>
          </div>
        )}

        {applying && (
          <div style={{ padding: '0 24px 8px' }}>
            <Alert type="info" showIcon title="Применение изменений выполняется, дождитесь завершения…" />
          </div>
        )}

        {/* Filters */}
        <Flex align="center" gap={16} wrap="wrap" style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Segmented<OperationFilter>
            disabled={busy}
            value={opFilter}
            onChange={setOpFilter}
            options={[
              { label: 'Все', value: 'all' },
              { label: 'Добавлены', value: 'added' },
              { label: 'Обновлены', value: 'updated' },
              { label: 'Удалены', value: 'deleted' },
            ]}
          />
          <Segmented<LevelFilter>
            disabled={busy}
            value={levelFilter}
            onChange={setLevelFilter}
            options={[
              { label: 'Все уровни', value: 'all' },
              { label: 'Таблицы', value: 'table' },
              { label: 'Колонки', value: 'column' },
              { label: 'Ограничения', value: 'constraint' },
            ]}
          />
          <Input
            disabled={busy}
            allowClear
            placeholder="Поиск по имени таблицы или колонки"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Space style={{ marginInlineStart: 'auto' }}>
            <Button type="link" disabled={busy} onClick={handleSelectAllVisible}>
              Выделить все
            </Button>
            <Button type="link" disabled={busy} onClick={handleDeselectAllVisible}>
              Снять все
            </Button>
          </Space>
        </Flex>

        {/* Tree */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px' }}>
          {treeData.length === 0 ? (
            <Empty description="Нет расхождений, соответствующих текущим фильтрам" style={{ marginTop: 64 }} />
          ) : (
            <Tree
              checkable
              checkStrictly
              disabled={busy}
              selectable={false}
              defaultExpandAll
              checkedKeys={visibleCheckedKeys}
              onCheck={(keys) => {
                const newVisibleChecked = (keys as { checked: string[] }).checked;
                setCheckedKeys((prev) => [
                  ...prev.filter((id) => !visibleIds.includes(id)),
                  ...newVisibleChecked,
                ]);
              }}
              treeData={treeData}
              blockNode
            />
          )}
        </div>

        {/* Footer */}
        <Flex align="center" justify="space-between" style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
          <Button icon={<CloseOutlined />} disabled={busy} onClick={onClose}>
            Закрыть
          </Button>
          <Space>
            <Button icon={<ReloadOutlined />} loading={comparing} disabled={applying} onClick={runFullCompare}>
              Полная сверка
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              loading={applying}
              disabled={comparing}
              onClick={handleApply}
            >
              Применить выбранные ({checkedKeys.length})
            </Button>
          </Space>
        </Flex>
      </div>
    </Modal>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 64 }}>
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
