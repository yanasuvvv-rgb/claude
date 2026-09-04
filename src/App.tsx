import { useState } from 'react';
import { App as AntApp, ConfigProvider, Flex, Layout, Typography, notification } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import DifferencesWizard from './features/differences-wizard/DifferencesWizard';
import SourceCard from './features/differences-wizard/SourceCard';
import { buildMockDiffTree, mockLastRun, mockSource } from './features/differences-wizard/mockData';
import { summarize } from './features/differences-wizard/utils';
import type { CompareRunInfo, DiffNode } from './features/differences-wizard/types';

const { Header, Content } = Layout;

function simulateCompareRequest(): Promise<DiffNode[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildMockDiffTree()), 1800);
  });
}

function simulateApplyRequest(_selectedIds: string[]): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 1200);
  });
}

export default function App() {
  const [diffTree, setDiffTree] = useState<DiffNode[]>(() => buildMockDiffTree());
  const [lastRun, setLastRun] = useState<CompareRunInfo>(mockLastRun);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [api, contextHolder] = notification.useNotification();

  const summary = summarize(diffTree);

  const handleCompareFromCard = async () => {
    if (cardBusy) return;
    setCardBusy(true);
    try {
      const newTree = await simulateCompareRequest();
      setDiffTree(newTree);
      const newRun: CompareRunInfo = { finishedAt: new Date().toISOString(), trigger: 'manual' };
      setLastRun(newRun);
      const s = summarize(newTree);
      api.success({
        message: 'Сверка источника завершена',
        description: `Добавлено: ${s.added}, обновлено: ${s.updated}, удалено: ${s.deleted}.`,
        btn: (
          <a onClick={() => setWizardOpen(true)} role="button">
            Открыть мастер расхождений
          </a>
        ),
        placement: 'bottomRight',
        duration: 8,
      });
    } finally {
      setCardBusy(false);
    }
  };

  return (
    <ConfigProvider locale={ruRU} theme={{ token: { borderRadius: 4 } }}>
      <AntApp>
        {contextHolder}
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <Typography.Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
              Ведение систем — Каталог данных
            </Typography.Title>
          </Header>
          <Content style={{ padding: 24 }}>
            <Flex vertical gap={16}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Экземпляр системы-источника
              </Typography.Title>
              <SourceCard
                source={mockSource}
                lastRun={lastRun}
                summary={summary}
                busy={cardBusy}
                onCompare={handleCompareFromCard}
                onShowDiff={() => setWizardOpen(true)}
              />
            </Flex>
          </Content>
        </Layout>

        <DifferencesWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          source={mockSource}
          diffTree={diffTree}
          lastRun={lastRun}
          onRunFullCompare={simulateCompareRequest}
          onApply={simulateApplyRequest}
        />
      </AntApp>
    </ConfigProvider>
  );
}
