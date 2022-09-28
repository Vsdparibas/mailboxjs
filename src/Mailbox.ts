import { ImapManager } from './ImapManager';

/**
 * Mailbox object
 * @param {string} path - Name of the mailbox
 * @param {number} nextUid - Next uid for this mailbox
 */
export class Mailbox {
  private readonly imap: ImapManager;
  watching: boolean;
  path: string;
  nextUid: number;

  constructor(imap: ImapManager, path: string, nextUid: number = 1) {
    this.imap = imap;
    this.path = path;
    this.nextUid = nextUid;
    this.watching = false;
  }

  /**
   * Delete this mailbox
   */
  public delete() {
    this.imap.deleteMailbox(this.path);
  }

  /**
   * Rename this mailbox
   * @param {string} newMailboxPath - New mailbox's name
   */
  public rename(newMailboxPath: string) {
    this.imap.renameMailbox(this.path, newMailboxPath);
  }
}
