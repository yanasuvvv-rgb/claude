import { Button, Card, Descriptions, Flex, Tag, Tooltip, Typography } from 'antd';
import { DiffOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CompareRunInfo, DiffSummary, SourceRef } from './types';

interface SourceCardProps {
  source: SourceRef;
  lastRun: CompareRunInfo;
  summary: DiffSummary;
  busy: boolean;
  onCompare: () => void;
  onShowDiff: () => void;
}

export default function SourceCard({ source, lastRun, summary, busy, onCompare, onShowDiff }: SourceCardProps) {
  const total = summary.added + summary.updated + summary.deleted;

  return (
    <Card
      title={source.name}
      style={{ maxWidth: 640 }}
      extra={
        <Tag color={source.hasPhysicalModel ? 'blue' : 'default'}>
          {source.hasPhysicalModel ? 'Физическая модель создана' : 'Физическая модель не создана'}
        </Tag>
      }
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Последняя сверка">
          {dayjs(lastRun.finishedAt).format('DD.MM.YYYY HH:mm')} {lastRun.trigger === 'manual' ? '(вручную)' : '(по расписанию)'}
        </Descriptions.Item>
        <Descriptions.Item label="Обнаружено расхождений">
          {total > 0 ? (
            <Typography.Text>
              добавлено {summary.added}, обновлено {summary.updated}, удалено {summary.deleted}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">расхождений нет</Typography.Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Flex gap={8}>
        <Button icon={<ReloadOutlined />} loading={busy} onClick={onCompare}>
          Сверить
        </Button>
        {source.hasPhysicalModel ? (
          <Button type="primary" icon={<DiffOutlined />} onClick={onShowDiff} disabled={busy}>
            Показать расхождения
          </Button>
        ) : (
          <Tooltip title="Чтобы посмотреть расхождения, сначала создайте физическую модель источника">
            <Button type="primary" icon={<DiffOutlined />} disabled>
              Показать расхождения
            </Button>
          </Tooltip>
        )}
      </Flex>
    </Card>
  );
}
