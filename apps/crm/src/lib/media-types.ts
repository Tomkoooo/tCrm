export type MediaListItem = {
  id: string;
  type: 'file' | 'link';
  filename: string;
  url?: string;
  contentType?: string;
  size?: number;
  useCount: number;
  usages: Array<{
    entityType: string;
    entityId: string;
    fieldName: string;
    label?: string;
    sku?: string;
  }>;
  previewUrl: string;
  createdAt: string;
};

export type SelectedMedia = {
  id: string;
  previewUrl: string;
  filename: string;
  type: 'file' | 'link';
};
