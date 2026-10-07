import ExpandMore from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlant } from '@/platform/plant/plantContext';

// 현재 Plant 표시와 선택. 선택지는 세션의 allowedPlantIds뿐이며, 하나뿐이면 선택 없이 이름만 보여준다.
export function PlantPicker() {
  const theme = useTheme();
  const { t } = useTranslation('shell');
  const { allowedPlantIds, plantId, selectPlant } = usePlant();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const label = t('signalBar.plant');
  if (plantId === null) {
    return (
      <span>
        {label} <strong>{t('signalBar.plantNoneAllowed')}</strong>
      </span>
    );
  }
  const current = t('signalBar.plantValue', { id: plantId });
  if (allowedPlantIds.length < 2) {
    return (
      <span>
        {label} <strong style={{ color: theme.mes.ink }}>{current}</strong>
      </span>
    );
  }
  return (
    <>
      <Button
        size="small"
        aria-label={`${t('signalBar.plantSelect')}: ${current}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        endIcon={<ExpandMore sx={{ fontSize: 16 }} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ color: theme.mes.ink, fontWeight: 600, textTransform: 'none' }}
      >
        {label} {current}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { 'aria-label': t('signalBar.plantSelect') } }}
      >
        {allowedPlantIds.map((id) => (
          <MenuItem
            key={id}
            selected={id === plantId}
            onClick={() => {
              selectPlant(id);
              setAnchor(null);
            }}
          >
            {t('signalBar.plantValue', { id })}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
