import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { AttachmentOwnerType } from '@todo/shared';
import { attachmentsApi, type AttachmentWithUse, type Owner } from '../../api/attachments';
import { fileProblem } from '../../lib/files/fileTypes';

export const attachmentsKey = (owner: Owner) => ['attachments', owner.ownerType, owner.ownerId] as const;

/** The files attached to one item. Pass null (a new item that doesn't exist yet) to skip the lookup. */
export function useOwnerAttachments(owner: Owner | null) {
  return useQuery({
    queryKey: owner ? attachmentsKey(owner) : ['attachments', 'none'],
    queryFn: () => attachmentsApi.forOwner(owner!),
    enabled: owner !== null,
    staleTime: 10_000,
  });
}

/** How many files each item of one kind has, for the paperclip on a board card. */
export function useAttachmentCounts(ownerType: AttachmentOwnerType) {
  return useQuery({ queryKey: ['attachments', ownerType, 'counts'], queryFn: () => attachmentsApi.counts(ownerType), staleTime: 10_000 }).data;
}

/** Upload files and attach them to an item. Resolves to the problems found (one message per file that failed). */
export async function uploadAndLink(files: File[], owner: Owner): Promise<string[]> {
  const problems: string[] = [];
  for (const file of files) {
    const problem = fileProblem(file);
    if (problem) {
      problems.push(problem);
      continue;
    }
    try {
      const saved = await attachmentsApi.upload(file);
      await attachmentsApi.link(saved.id, owner);
    } catch (err) {
      problems.push(err instanceof Error ? err.message : `“${file.name}” couldn’t be added.`);
    }
  }
  return problems;
}

/** Detach a file from an item. If nothing else uses it, the file itself is deleted too, so nothing is left behind unseen. */
export async function detach(file: AttachmentWithUse, owner: Owner): Promise<void> {
  if (file.linkCount > 1) await attachmentsApi.unlink(file.id, owner);
  else await attachmentsApi.remove(file.id);
}

/** Tell the cache that an item's files changed. */
export function useRefreshAttachments() {
  const qc = useQueryClient();
  return useCallback(
    (owner: Owner) => Promise.all([qc.invalidateQueries({ queryKey: attachmentsKey(owner) }), qc.invalidateQueries({ queryKey: ['attachments', owner.ownerType, 'counts'] })]),
    [qc],
  );
}
