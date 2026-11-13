import type { Attachment, AttachmentOwnerType } from '@todo/shared';
import { apiFetch } from './client';

/** A file and how many items it is attached to (so "delete the file too?" is only asked when it was the last). */
export interface AttachmentWithUse extends Attachment {
  linkCount: number;
}

export interface Owner {
  ownerType: AttachmentOwnerType;
  ownerId: string;
}

export const attachmentsApi = {
  upload(file: File): Promise<Attachment> {
    const body = new FormData();
    body.append('file', file, file.name);
    return apiFetch<Attachment>('/attachments', { method: 'POST', body });
  },
  /** How many files each item of one kind has (items with none are left out). */
  counts: (ownerType: AttachmentOwnerType) => apiFetch<Record<string, number>>(`/attachments/counts?ownerType=${ownerType}`),
  forOwner: ({ ownerType, ownerId }: Owner) => apiFetch<AttachmentWithUse[]>(`/attachments?ownerType=${ownerType}&ownerId=${ownerId}`),
  link: (id: string, owner: Owner) => apiFetch<void>(`/attachments/${id}/links`, { method: 'POST', body: JSON.stringify(owner) }),
  unlink: (id: string, { ownerType, ownerId }: Owner) => apiFetch<void>(`/attachments/${id}/links/${ownerType}/${ownerId}`, { method: 'DELETE' }),
  remove: (id: string) => apiFetch<void>(`/attachments/${id}`, { method: 'DELETE' }),
  /** Where the file's bytes are served (for an <img>, a download link, or a fetch). */
  fileUrl: (id: string, download = false) => `/api/attachments/${id}/file${download ? '?download=1' : ''}`,
};
