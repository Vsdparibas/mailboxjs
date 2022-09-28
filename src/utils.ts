import { Mail } from './Mail';

export function uidsAndMailsToUids(toMerge: {
  uids?: number[];
  mails?: Mail[];
}): number[] {
  if (!toMerge.uids && !toMerge.mails) return [];
  if (!toMerge.uids) toMerge.uids = [];
  if (toMerge.mails && toMerge.mails.length > 0) {
    toMerge.uids = [...toMerge.uids, ...toMerge.mails.map((mail) => mail.uid)];
  }
  return toMerge.uids;
}
