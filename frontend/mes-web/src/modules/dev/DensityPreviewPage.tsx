import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Density, SignalState } from '@/app/theme/tokens';
import { useUiSettings } from '@/platform/preferences/uiSettings';
import { Identifier } from '@/shared/ui/Identifier';
import { PageFrame } from '@/shared/ui/PageFrame/PageFrame';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { rowSignalProps } from '@/shared/ui/StatusBadge/rowSignal';

// 렌더링 중 큰 배열을 만들지 않도록 표본은 모듈 상수로 한 번만 만든다.
const states: SignalState[] = ['fault', 'delayed', 'running', 'running', 'ok', 'ok', 'ok', 'idle'];
const rows = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  workOrder: `WO-2610-${String(1040 + i).padStart(4, '0')}`,
  lot: `L26100${(i % 5) + 1}-A${String(i + 3).padStart(2, '0')}`,
  state: states[i % states.length]!,
  quantity: 1200 - i * 37,
  updated: `10:${String(42 - (i % 40)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
}));

// FE-03 검증용 임시 화면: 표 밀도를 비교한다. 실제 목록은 ServerDataGrid(FE-05)를 쓴다.
export default function DensityPreviewPage() {
  const { t } = useTranslation('dev');
  const { settings, update } = useUiSettings();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedRow = rows.find((r) => r.id === selectedId);
  return (
    <PageFrame
      title={t('density.title')}
      actions={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={settings.density}
          aria-label={t('density.title')}
          onChange={(_e, v: Density | null) => v && update({ density: v })}
        >
          <ToggleButton value="compact">{t('density.compact')}</ToggleButton>
          <ToggleButton value="standard">{t('density.standard')}</ToggleButton>
          <ToggleButton value="comfortable">{t('density.comfortable')}</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Box sx={{ px: 3, pb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {t('density.intro')}
        </Typography>
        <Typography variant="body2" aria-live="polite" sx={{ fontWeight: 700, mt: 0.5 }}>
          {selectedRow ? t('density.selected', { number: selectedRow.workOrder }) : t('density.selectedNone')}
        </Typography>
      </Box>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 3 }}>{t('density.colStatus')}</TableCell>
            <TableCell>{t('density.colWorkOrder')}</TableCell>
            <TableCell>{t('density.colLot')}</TableCell>
            <TableCell align="right">{t('density.colQuantity')}</TableCell>
            <TableCell align="right">{t('density.colUpdated')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              hover
              selected={r.id === selectedId}
              tabIndex={0}
              aria-selected={r.id === selectedId}
              {...rowSignalProps(r.state)}
              onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedId(r.id === selectedId ? null : r.id);
                }
              }}
              sx={{ height: (theme) => theme.mes.rowHeight, cursor: 'pointer' }}
            >
              <TableCell sx={{ width: 140, pl: 3 }}>
                <StatusBadge state={r.state} />
              </TableCell>
              <TableCell>
                <Identifier>{r.workOrder}</Identifier>
              </TableCell>
              <TableCell>
                <Identifier>{r.lot}</Identifier>
              </TableCell>
              <TableCell align="right">{r.quantity.toLocaleString()}</TableCell>
              <TableCell align="right">{r.updated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageFrame>
  );
}
