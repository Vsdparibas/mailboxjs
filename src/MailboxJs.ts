import { MailboxJsConfig } from './interfaces/MailboxJsConfig';
import { SmtpManager } from './SmtpManager';
import { ImapManager } from './ImapManager';
import { Logger } from './Logger';
import { Mailbox } from './Mailbox';
import { UidsList } from './interfaces/UidsList';
import {
  CopyResponseObject,
  MailboxCreateResponse,
  MailboxDeleteResponse,
  MailboxRenameResponse,
} from 'imapflow';
import { Mail } from './Mail';
import { Attachment } from './Attachment';

export interface Context {
  config: MailboxJsConfig;
  logger: Logger;
}

/**
 * MailboxJS
 * Used to interact with a mailbox by IMAP or/and SMTP
 */
export class MailboxJs {
  private readonly config: MailboxJsConfig;
  private readonly smtp: SmtpManager | undefined;
  private readonly imap: ImapManager | undefined;
  private readonly logger: Logger;

  /**
   * Contructor of MailboxJS
   * @param {MailboxJsConfig} config - Configuration of MailboxJS
   */
  constructor(config: MailboxJsConfig) {
    this.config = config;
    this.logger = new Logger(this.config.logging);
    if (this.config.smtp) {
      this.smtp = new SmtpManager(this.getContext(), this.config.smtp);
    }
    if (this.config.imap) {
      this.imap = new ImapManager(this.getContext(), this.config.imap);
    }
  }

  /**
   * Run MailboxJS
   * You should await for this method before any actions on MailboxJS object
   * @returns {MailboxJs}
   */
  async run(): Promise<MailboxJs> {
    this.imap && (await this.imap.run());
    return this;
  }

  public on(event: 'delete', callback: (uid: number) => void): void;
  public on(event: 'mail', callback: (mail: Mail) => void): void;
  /**
   * Event listener for MailboxJS
   * @param {'mail' | 'delete'} event - Event you want to listen to
   * @param {Function} callback - Function to call when event triggered (give you an email for 'mail' event and uid for 'delete' event)
   */
  public on(
    event: 'mail' | 'delete',
    callback: ((mail: Mail) => void) | ((uid: number) => void),
  ): void {
    if (this.imap) {
      switch (event) {
        case 'mail':
          this.imap.eventEmitter.addListener('mail', callback);
          break;
        case 'delete':
          this.imap.eventEmitter.addListener('delete', callback);
          break;
      }
    }
  }

  /**
   * Send a mail
   * @param {string} to - Receiver identity
   * @param {string} subject - Subject of the mail
   * @param {string} text - Content text of the mail
   * @param {Attachment[]} attachments - Mail attachments
   * @param {string} from - Sender identity
   */
  public send(
    to: string,
    subject: string,
    text: string,
    attachments?: Attachment[] | Attachment,
    from?: string,
  ) {
    this.smtp && this.smtp.send(to, subject, text, attachments, from);
  }

  /**
   * Send a html mail
   * @param {string} to - Receiver identity
   * @param {string} subject - Subject of the mail
   * @param {string} text - Content text of the mail
   * @param {string} html - Content html of the mail
   * @param {Attachment[] | Attachment} attachments - Mail attachments
   * @param {string} from - Sender identity
   */
  public sendHtml(
    to: string,
    subject: string,
    text: string,
    html: string,
    attachments?: Attachment[] | Attachment,
    from?: string,
  ) {
    this.smtp && this.smtp.sendHtml(to, subject, text, html, attachments, from);
  }

  /**
   * Get mailboxes map
   * @returns {Map<string, Mailbox>} - A map of Mailbox objects
   */
  public getMailboxes(): Map<string, Mailbox> | undefined {
    if (this.imap && this.imap.getIsConnected()) {
      return this.imap.getMailboxes();
    } else {
      return this.imapError();
    }
  }

  /**
   * Create a mailbox
   * @param {string} mailboxPath - Mailbox's name to create
   * @returns {Promise<MailboxCreateResponse | undefined>}
   */
  public async createMailbox(
    mailboxPath: string,
  ): Promise<MailboxCreateResponse | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.createMailbox(mailboxPath);
    } else {
      return this.imapError();
    }
  }

  /**
   * Delete a mailbox
   * @param {string} mailboxPath - Mailbox's name to delete
   * @returns {Promise<MailboxDeleteResponse | undefined>}
   */
  public async deleteMailbox(
    mailboxPath: string,
  ): Promise<MailboxDeleteResponse | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.deleteMailbox(mailboxPath);
    } else {
      return this.imapError();
    }
  }

  /**
   * Rename a mailbox
   * @param {string} mailboxPath - Mailbox's name to rename
   * @param {string} newMailboxPath - New mailbox's name
   * @returns {Promise<MailboxRenameResponse | undefined>}
   */
  public async renameMailbox(
    mailboxPath: string,
    newMailboxPath: string,
  ): Promise<MailboxRenameResponse | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.renameMailbox(mailboxPath, newMailboxPath);
    } else {
      return this.imapError();
    }
  }

  /**
   * Copy one or multiple mails
   * @param {string} mailboxPath - Mailbox's name
   * @param {string} toMailboxPath - To mailbox's name
   * @param {UidsList} toCopy - List of mails to copy
   * @returns {Promise<CopyResponseObject | undefined>}
   */
  public async copyMails(
    mailboxPath: string,
    toMailboxPath: string,
    toCopy: UidsList,
  ): Promise<CopyResponseObject | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.copyMails(mailboxPath, toMailboxPath, toCopy);
    } else {
      return this.imapError();
    }
  }

  /**
   * Move one or multiple mails
   * @param {string} mailboxPath - Mailbox's name from
   * @param {string} toMailboxPath - Mailbox's name to
   * @param {UidsList} toMove - List of mails to move
   * @returns {Promise<CopyResponseObject | undefined>}
   */
  public async moveMails(
    mailboxPath: string,
    toMailboxPath: string,
    toMove: UidsList,
  ): Promise<CopyResponseObject | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.moveMails(mailboxPath, toMailboxPath, toMove);
    } else {
      return this.imapError();
    }
  }

  /**
   * Delete one or multiple mails
   * @param {string} mailboxPath - Mailbox's name
   * @param {UidsList} toDelete - List of mails to delete
   * @returns {Promise<boolean | undefined>}
   */
  public async deleteMails(
    mailboxPath: string,
    toDelete: UidsList,
  ): Promise<boolean | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.deleteMails(mailboxPath, toDelete);
    } else {
      return this.imapError();
    }
  }

  /**
   * Add flags to one or multiple mails
   * @param {string} mailboxPath - Mailbox's name
   * @param {string[]} flags - Array of flags
   * @param {UidsList} toAdd - List of mails to add flags
   * @returns {Promise<boolean | undefined>}
   */
  public async addMailsFlags(
    mailboxPath: string,
    flags: string[],
    toAdd: UidsList,
  ): Promise<boolean | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.addMailsFlags(mailboxPath, flags, toAdd);
    } else {
      return this.imapError();
    }
  }

  /**
   * Remove flags to one or multiple mails
   * @param {string} mailboxPath - Mailbox's name
   * @param {string[]} flags - Array of flags
   * @param {UidsList} toRemove - List of mails to remove flags
   * @returns {Promise<boolean | undefined>}
   */
  public async removeMailsFlags(
    mailboxPath: string,
    flags: string[],
    toRemove: UidsList,
  ): Promise<boolean | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.removeMailsFlags(mailboxPath, flags, toRemove);
    } else {
      return this.imapError();
    }
  }

  /**
   * Get a mail from uid
   * @param {string} mailboxPath - Mailbox's name
   * @param {number} uid - Uid of mail to get
   * @returns {Promise<Mail | undefined>}
   */
  public async getMail(
    mailboxPath: string,
    uid: number,
  ): Promise<Mail | undefined> {
    if (this.imap && this.imap.getIsConnected()) {
      return await this.imap.getMail(mailboxPath, uid);
    } else {
      return this.imapError();
    }
  }

  /**
   * Get multiple mails
   * @param {string} mailboxPath - Mailbox's name
   * @param {UidsList} toFetch - List of mails's uids to fetch
   * @returns {Promise<Mail[] | undefined>}
   */
  public async getMails(
    mailboxPath: string,
    toFetch: UidsList | undefined,
  ): Promise<Mail[] | undefined> {
    if (this.imap) {
      return await this.imap.getMails(mailboxPath, toFetch);
    } else {
      return this.imapError();
    }
  }

  /**
   * Get unseen mails
   * @param {string} mailboxPath - Mailbox's name
   * @returns {Promise<Mail[] | undefined>}
   */
  public async getUnseenMails(
    mailboxPath: string,
  ): Promise<Mail[] | undefined> {
    if (this.imap) {
      return await this.imap.getUnseenMails(mailboxPath);
    } else {
      return this.imapError();
    }
  }

  /**
   * Get seen mails
   * @param {string} mailboxPath - Mailbox's name
   * @returns {Promise<Mail[] | undefined>}
   */
  public async getSeenMails(mailboxPath: string): Promise<Mail[] | undefined> {
    if (this.imap) {
      return await this.imap.getSeenMails(mailboxPath);
    } else {
      return this.imapError();
    }
  }

  private getContext(): Context {
    return {
      config: this.config,
      logger: this.logger,
    };
  }

  private imapError() {
    console.log('ERROR: You need to configure IMAP or await run() method');
    return undefined;
  }
}
