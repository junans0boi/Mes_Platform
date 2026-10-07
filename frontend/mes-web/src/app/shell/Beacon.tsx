import Box from '@mui/material/Box';
import { visuallyHidden } from '@/shared/ui/visuallyHidden';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { overallState, useShellContext } from './shellContext';

// 화면 맨 위 3px 경광선. 평소에는 거의 보이지 않고, 지연이면 호박색, 이상이면 적색이다.
// 색만으로 전달하지 않도록 같은 의미를 상단 한 줄의 도형·글자와 읽기 프로그램용 글자로도 낸다.
// 보조기술 알림은 전체 상태가 바뀔 때만 나간다. 시계·건수처럼 자주 바뀌는 값은 이 live region에 넣지 않는다.
export function Beacon() {
  const theme = useTheme();
  const { t } = useTranslation('shell');
  const state = overallState(useShellContext().value);
  return (
    <>
      <Box
        aria-hidden="true"
        data-beacon={state}
        sx={{
          height: theme.mes.layout.beaconHeight,
          flexShrink: 0,
          backgroundColor: theme.mes.beacon[state],
        }}
      />
      <Box role="status" data-live="beacon" sx={visuallyHidden}>
        {`${t('beacon.label')}: ${t(`beacon.${state}`)}`}
      </Box>
    </>
  );
}
