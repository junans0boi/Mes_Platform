import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultShellContext, type ShellContextValue } from '@/app/shell/shellContext';
import { useShellContext } from '@/app/shell/shellContext';
import type { SignalState } from '@/app/theme/tokens';
import { ExceptionRibbon } from '@/shared/ui/ExceptionRibbon/ExceptionRibbon';
import { PageFrame } from '@/shared/ui/PageFrame/PageFrame';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { signalStates } from '@/shared/ui/StatusBadge/signal';

type Scenario = 'normal' | 'delayed' | 'fault' | 'disconnected';

const counts: Record<Scenario, Record<SignalState, number>> = {
  normal: { fault: 0, delayed: 0, running: 48, ok: 213, idle: 7 },
  delayed: { fault: 0, delayed: 12, running: 48, ok: 201, idle: 7 },
  fault: { fault: 3, delayed: 12, running: 48, ok: 198, idle: 7 },
  disconnected: { fault: 3, delayed: 12, running: 48, ok: 198, idle: 7 },
};

const simulated: Record<Scenario, Partial<ShellContextValue>> = {
  normal: { connection: 'connected', asOfText: '10:42:08', asOfAgeSeconds: 12 },
  delayed: { connection: 'connected', asOfText: '10:42:08', asOfAgeSeconds: 12 },
  fault: { connection: 'connected', asOfText: '10:42:08', asOfAgeSeconds: 12 },
  disconnected: { connection: 'disconnected', asOfText: '10:41:55', asOfAgeSeconds: 45 },
};

// FE-03 검증용 임시 화면: 상태 표현 체계(도형·글자·색·위치), 예외 스트립, 상단 한 줄과 경광선의 변화를 확인한다.
export default function SignalsPreviewPage() {
  const { t } = useTranslation('dev');
  const shell = useShellContext();
  const [scenario, setScenario] = useState<Scenario>('fault');
  const [selected, setSelected] = useState<SignalState | null>(null);

  const { update } = shell;
  useEffect(() => {
    const c = counts[scenario];
    update({
      plantName: '천안1공장',
      userName: '홍길동',
      ...simulated[scenario],
      faultCount: c.fault,
      delayedCount: c.delayed,
    });
    return () => update(defaultShellContext);
  }, [scenario, update]);

  return (
    <PageFrame
      title={t('signals.title')}
      actions={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={scenario}
          aria-label={t('signals.simulate')}
          onChange={(_e, v: Scenario | null) => v && setScenario(v)}
        >
          <ToggleButton value="normal">{t('signals.normal')}</ToggleButton>
          <ToggleButton value="delayed">{t('signals.delayedCase')}</ToggleButton>
          <ToggleButton value="fault">{t('signals.faultCase')}</ToggleButton>
          <ToggleButton value="disconnected">{t('signals.disconnectedCase')}</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <ExceptionRibbon counts={counts[scenario]} selected={selected} onSelect={setSelected} />
      <Box sx={{ px: 3, pb: 2, maxWidth: 760 }}>
        <Typography variant="body1" sx={{ mb: 0.5 }}>
          {t('signals.intro')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {t('signals.ribbonHint')} {t('signals.simulateHint')}
        </Typography>
        <Typography variant="body2" aria-live="polite" sx={{ fontWeight: 700 }}>
          {selected
            ? t('signals.filtered', { state: t(`common:signal.${selected}`) })
            : t('signals.filteredNone')}
        </Typography>
      </Box>
      <Table size="small" sx={{ maxWidth: 820 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 3 }}>{t('signals.colState')}</TableCell>
            <TableCell>{t('signals.colShape')}</TableCell>
            <TableCell>{t('signals.colMeaning')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {signalStates.map((state) => (
            <TableRow key={state} sx={{ height: (theme) => theme.mes.rowHeight }}>
              <TableCell sx={{ pl: 3 }}>
                <StatusBadge state={state} />
              </TableCell>
              <TableCell>{t(`signals.shape.${state}`)}</TableCell>
              <TableCell>{t(`signals.meaning.${state}`)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageFrame>
  );
}
