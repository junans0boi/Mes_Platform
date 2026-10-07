import type { GridSortModel } from '@mui/x-data-grid-premium';

// API sort 값(`field`, `-field`)과 DataGrid 정렬 모델을 오간다. 정렬은 항상 하나다.
export function toSortModel(sort: string): GridSortModel {
  return sort.startsWith('-') ? [{ field: sort.slice(1), sort: 'desc' }] : [{ field: sort, sort: 'asc' }];
}

export function fromSortModel(model: GridSortModel, fallback: string): string {
  const first = model[0];
  if (!first?.sort) return fallback;
  return first.sort === 'desc' ? `-${first.field}` : first.field;
}
