import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { assertValidFields, type SearchField, type SearchValues } from './searchFields';

export interface SearchPanelProps {
  fields: readonly SearchField[];
  /** 현재 적용된 조건(URL 상태). 바뀌면 입력란도 이 값으로 맞춘다. */
  values: SearchValues;
  onSubmit: (values: SearchValues) => void;
}

function clean(values: SearchValues): SearchValues {
  const out: SearchValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value) ? value.length > 0 : value.trim() !== '') out[key] = value;
  }
  return out;
}

// 검색 조건 입력. 필드 정의로 입력란을 만들고 값만 돌려준다. API 요청으로의 변환은 feature adapter가 한다.
// 입력 중인 값은 "검색"을 누를 때만 적용한다(타이핑마다 요청을 보내지 않는다).
export function SearchPanel({ fields, values, onSubmit }: SearchPanelProps) {
  const { t } = useTranslation(['common']);
  assertValidFields(fields);
  const [draft, setDraft] = useState<SearchValues>(values);
  // 적용된 조건(URL)이 바뀌면 입력란을 그 값으로 맞춘다. 렌더 중 상태 보정 방식이라 effect가 필요 없다.
  const [syncedFrom, setSyncedFrom] = useState(values);
  if (syncedFrom !== values) {
    setSyncedFrom(values);
    setDraft(values);
  }

  const set = (key: string, value: string | string[]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: string) => (typeof draft[key] === 'string' ? (draft[key] as string) : '');

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(clean(draft));
  }

  return (
    <Box
      component="form"
      role="search"
      aria-label={t('common:search.label')}
      onSubmit={submit}
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.5, px: 3, py: 1.5 }}
    >
      {fields.map((field) => {
        switch (field.type) {
          case 'text':
          case 'entity':
            return (
              <TextField
                key={field.key}
                size="small"
                label={t(field.labelKey)}
                value={text(field.key)}
                onChange={(e) => set(field.key, e.target.value)}
                slotProps={field.type === 'entity' ? { htmlInput: { inputMode: 'numeric' } } : undefined}
              />
            );
          case 'select': {
            const selected = field.multiple
              ? Array.isArray(draft[field.key])
                ? (draft[field.key] as string[])
                : []
              : text(field.key);
            return (
              <TextField
                key={field.key}
                select
                size="small"
                label={t(field.labelKey)}
                value={selected}
                onChange={(e) => {
                  const v = e.target.value as string | string[];
                  set(field.key, field.multiple ? (typeof v === 'string' ? v.split(',') : v) : v);
                }}
                sx={{ minWidth: 160 }}
                slotProps={{
                  select: {
                    multiple: field.multiple,
                    renderValue: (v) =>
                      (Array.isArray(v) ? v : [v])
                        .map((x) => field.options.find((o) => o.value === x))
                        .filter((o) => o !== undefined)
                        .map((o) => t(o.labelKey))
                        .join(', '),
                  },
                }}
              >
                {field.multiple ? null : <MenuItem value="">—</MenuItem>}
                {field.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </TextField>
            );
          }
          case 'dateRange':
            return (
              <Box
                key={field.fromKey}
                role="group"
                aria-label={t(field.labelKey)}
                sx={{ display: 'flex', gap: 1 }}
              >
                <TextField
                  size="small"
                  type="date"
                  label={`${t(field.labelKey)} ${t('common:search.from')}`}
                  value={text(field.fromKey)}
                  onChange={(e) => set(field.fromKey, e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={`${t(field.labelKey)} ${t('common:search.to')}`}
                  value={text(field.toKey)}
                  onChange={(e) => set(field.toKey, e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            );
        }
      })}
      <Button type="submit" variant="contained">
        {t('common:search.submit')}
      </Button>
      <Button
        type="button"
        variant="text"
        onClick={() => {
          setDraft({});
          onSubmit({});
        }}
      >
        {t('common:search.reset')}
      </Button>
    </Box>
  );
}
