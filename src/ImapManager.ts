import { Mailbox } from './Mailbox';
import { Context } from './MailboxJs';
import mailparser from 'mailparser';
import {
  ImapFlow,
  ListResponse,
  MailboxCreateResponse,
  MailboxDeleteResponse,
  MailboxRenameResponse,
  CopyResponseObject,
  ImapFlowOptions,
} from 'imapflow';
import { ImapConfig } from './interfaces/MailboxJsConfig.js';
import { Mail } from './Mail.js';
import { UidsList } from './interfaces/UidsList.js';
import { uidsAndMailsToUids } from './utils.js';
import { EventEmitter } from 'stream';

const DEFAULT_RESTART_INTERVAL = 5000;
const DEFAULT_MAILBOXES_INTERVAL = 5000;

export class ImapManager {
  private readonly context: Context;
  private readonly config: ImapConfig;
  private readonly mailboxes: Map<string, Mailbox>;
  private readonly client: ImapFlow;
  public readonly eventEmitter: EventEmitter;
  private isConnected: boolean;

  constructor(context: Context, imapConfig: ImapConfig) {
    this.context = context;
    this.config = imapConfig;
    const config: ImapFlowOptions = {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls,
      auth: {
        user: context.config.user,
        pass: context.config.password,
      },
      logger: false,
    };
    this.client = new ImapFlow(config);
    this.mailboxes = new Map();
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();
  }

  public async run() {
    await this.connect();
    this.watchErrors();
    await this.loadMailboxes();
    await this.watchMailboxes();
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public on(event: 'delete', callback: (uid: number) => void): void;
  public on(event: 'mail', callback: (mail: Mail) => void): void;
  public on(
    event: 'mail' | 'delete',
    callback: ((mail: Mail) => void) | ((uid: number) => void),
  ): void {
    switch (event) {
      case 'mail':
        this.eventEmitter.addListener('mail', callback);
        break;
      case 'delete':
        this.eventEmitter.addListener('delete', callback);
        break;
    }
  }

  public getMailboxes() {
    return this.mailboxes;
  }

  public async createMailbox(
    mailboxPath: string,
  ): Promise<MailboxCreateResponse> {
    const result = await this.client.mailboxCreate(mailboxPath);
    if (result && result.created) {
      this.mailboxes.set(mailboxPath, new Mailbox(this, mailboxPath, 1));
    }
    return result;
  }

  public async deleteMailbox(
    mailboxPath: string,
  ): Promise<MailboxDeleteResponse> {
    const result = await this.client.mailboxDelete(mailboxPath);
    if (result && result.path) {
      this.mailboxes.delete(result.path);
    }
    return result;
  }

  public async renameMailbox(
    mailboxPath: string,
    newMailboxPath: string,
  ): Promise<MailboxRenameResponse> {
    const result = await this.client.mailboxRename(mailboxPath, newMailboxPath);
    if (result && result.path && result.newPath) {
      const mailbox = this.mailboxes.get(result.path);
      if (mailbox) {
        mailbox.path = result.newPath;
        this.mailboxes.delete(result.path);
        this.mailboxes.set(result.newPath, mailbox);
      }
    }
    return result;
  }

  public async copyMails(
    mailboxPath: string,
    toMailboxPath: string,
    toCopy: UidsList,
  ): Promise<CopyResponseObject> {
    return await this.workInMailbox<CopyResponseObject>(
      mailboxPath,
      async () => {
        const uids = uidsAndMailsToUids(toCopy);
        return await this.client.messageCopy(uids, toMailboxPath, {
          uid: true,
        });
      },
    );
  }

  public async moveMails(
    mailboxPath: string,
    toMailboxPath: string,
    toMove: UidsList,
  ): Promise<CopyResponseObject> {
    return await this.workInMailbox<CopyResponseObject>(
      mailboxPath,
      async () => {
        const uids = uidsAndMailsToUids(toMove);
        return await this.client.messageMove(uids, toMailboxPath, {
          uid: true,
        });
      },
    );
  }

  public async deleteMails(
    mailboxPath: string,
    toDelete: UidsList,
  ): Promise<boolean> {
    return await this.workInMailbox<boolean>(mailboxPath, async () => {
      const uids = uidsAndMailsToUids(toDelete);
      const result = await this.client.messageDelete(uids, {
        uid: true,
      });
      for (const uid of uids) {
        this.eventEmitter.emit('delete', uid);
      }
      return result;
    });
  }

  public async addMailsFlags(
    mailboxPath: string,
    flags: string[],
    toAdd: UidsList,
  ): Promise<boolean> {
    return await this.workInMailbox<boolean>(mailboxPath, async () => {
      const uids = uidsAndMailsToUids(toAdd);
      return await this.client.messageFlagsAdd(uids, flags, {
        uid: true,
      });
    });
  }

  public async removeMailsFlags(
    mailboxPath: string,
    flags: string[],
    toRemove: UidsList,
  ): Promise<boolean> {
    return await this.workInMailbox<boolean>(mailboxPath, async () => {
      const uids = uidsAndMailsToUids(toRemove);
      return await this.client.messageFlagsRemove(uids, flags, {
        uid: true,
      });
    });
  }

  public async seeMails(mailboxPath: string, toSee: UidsList) {
    return await this.addMailsFlags(mailboxPath, ['\\Seen'], toSee);
  }

  public async unseeMails(mailboxPath: string, toUnsee: UidsList) {
    return await this.removeMailsFlags(mailboxPath, ['\\Seen'], toUnsee);
  }

  public async getMail(
    mailboxPath: string,
    uid: number,
  ): Promise<Mail | undefined> {
    return await this.workInMailbox<Mail | undefined>(mailboxPath, async () => {
      const msg = await this.client.fetchOne(
        `${uid}`,
        { source: true, uid: true },
        { uid: true },
      );
      if (msg) {
        const mailbox = this.mailboxes.get(mailboxPath);
        if (!mailbox) return undefined;
        const parsedMail = await mailparser.simpleParser(msg.source);
        return new Mail(this, mailbox, parsedMail, msg);
      } else {
        return undefined;
      }
    });
  }

  public async getMails(
    mailboxPath: string,
    toFetch: UidsList | undefined,
  ): Promise<Mail[] | undefined> {
    return await this.workInMailbox<Mail[] | undefined>(
      mailboxPath,
      async () => {
        let fetch = '1:*';
        if (toFetch) {
          fetch = uidsAndMailsToUids(toFetch).join(',');
        }
        const mails = [];
        for await (const msg of this.client.fetch(
          fetch,
          { uid: true, source: true },
          { uid: true, changedSince: BigInt(0) },
        )) {
          const mailbox = this.mailboxes.get(mailboxPath);
          if (!mailbox) return undefined;
          const parsedMail = await mailparser.simpleParser(msg.source);
          mails.push(new Mail(this, mailbox, parsedMail, msg));
        }
        return mails;
      },
    );
  }

  public async getUnseenMails(mailboxPath: string) {
    return await this.workInMailbox<Mail[] | undefined>(
      mailboxPath,
      async () => {
        const mails = [];
        for await (const msg of this.client.fetch(
          { seen: false },
          { uid: true, source: true },
          { uid: true, changedSince: BigInt(0) },
        )) {
          const mailbox = this.mailboxes.get(mailboxPath);
          if (!mailbox) return undefined;
          const parsedMail = await mailparser.simpleParser(msg.source);
          mails.push(new Mail(this, mailbox, parsedMail, msg));
        }
        return mails;
      },
    );
  }

  public async getSeenMails(mailboxPath: string) {
    return await this.workInMailbox<Mail[] | undefined>(
      mailboxPath,
      async () => {
        const mails = [];
        for await (const msg of this.client.fetch(
          { seen: true },
          { uid: true, source: true },
          { uid: true, changedSince: BigInt(0) },
        )) {
          const mailbox = this.mailboxes.get(mailboxPath);
          if (!mailbox) return undefined;
          const parsedMail = await mailparser.simpleParser(msg.source);
          mails.push(new Mail(this, mailbox, parsedMail, msg));
        }
        return mails;
      },
    );
  }

  private async workInMailbox<T>(
    mailboxPath: string,
    callback: (() => Promise<T>) | (() => T),
  ): Promise<T> {
    const mailbox = await this.client.getMailboxLock(mailboxPath);
    const result = await callback();
    mailbox.release();
    return result;
  }

  private async getMailsSinceUid(
    mailboxPath: string,
    uid: number,
  ): Promise<Mail[] | undefined> {
    return await this.workInMailbox<Mail[] | undefined>(
      mailboxPath,
      async () => {
        const mails: Mail[] = [];
        for await (let msg of this.client.fetch(
          `${uid}:*`,
          { uid: true, source: true },
          { uid: true, changedSince: BigInt(0) },
        )) {
          const mailbox = this.mailboxes.get(mailboxPath);
          if (!mailbox) return undefined;
          const parsedMail = await mailparser.simpleParser(msg.source);
          mails.push(new Mail(this, mailbox, parsedMail, msg));
        }
        return mails;
      },
    );
  }

  private async watchMailbox(mailboxPath: string) {
    try {
      const mailbox: Mailbox | undefined = this.mailboxes.get(mailboxPath);
      if (mailbox) {
        const nextUid = await this.getMailboxNextUid(mailbox.path);
        if (mailbox.nextUid < nextUid) {
          const sinceUid = mailbox.nextUid;
          mailbox.nextUid = nextUid;
          this.mailboxes.set(mailbox.path, mailbox);
          const mail = await this.getMail(mailboxPath, sinceUid);
          if (mail) {
            const mails = await this.getMailsSinceUid(mailbox.path, sinceUid);
            if (mails) {
              for (const mail of mails) {
                this.eventEmitter.emit('mail', mail);
              }
              this.context.logger.log(
                `Received ${mails.length} mails in "${mailboxPath}" for <${this.context.config.user}>`,
                'IMAP',
                'yellow',
              );
            }
          }
        }
      }
    } catch (e) {}
    setTimeout(
      this.watchMailbox.bind(this, mailboxPath),
      this.context.config.mailboxesWatchInterval || DEFAULT_MAILBOXES_INTERVAL,
    );
  }

  private async watchMailboxes() {
    if (this.context.config.mailboxesToWatch) {
      for (const mailboxToWatch of this.context.config.mailboxesToWatch) {
        this.context.logger.log(
          `Watching mailbox "${mailboxToWatch}" for <${this.context.config.user}>`,
          'IMAP',
          'yellow',
        );
        await this.watchMailbox(mailboxToWatch);
      }
    }
  }

  private async loadMailboxes() {
    const listResponses: ListResponse[] = await this.client.list();
    for (const list of listResponses) {
      const mailbox = new Mailbox(
        this,
        list.path,
        await this.getMailboxNextUid(list.path),
      );
      this.mailboxes.set(mailbox.path, mailbox);
    }
    this.context.logger.log(
      `Loaded ${this.mailboxes.size} mailboxes for <${this.context.config.user}>`,
      'IMAP',
      'green',
    );
  }

  private async getMailboxNextUid(mailboxPath: string): Promise<number> {
    const status = await this.client.status(mailboxPath, {
      messages: false,
      recent: false,
      uidNext: true,
      uidValidity: false,
      unseen: false,
      highestModseq: true,
    });
    //@ts-ignore: Error from imapflow typing, uidNext exists
    if (status.uidNext) {
      //@ts-ignore: Error from imapflow typing, uidNext exists
      return status.uidNext;
    } else {
      return 1;
    }
  }

  private watchErrors() {
    this.client.on('error', () => {
      this.context.logger.log(
        `Error from <${this.context.config.user}>`,
        'IMAP',
        'red',
      );
      this.restart();
    });
  }

  private async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.context.logger.log(
        `Connected to <${this.context.config.user}>`,
        'IMAP',
        'green',
      );
    } catch (e) {
      this.restart();
    }
  }

  private async restart() {
    this.isConnected = false;
    this.context.logger.log(
      `Restarting connection for <${this.context.config.user}>`,
      'IMAP',
      'red',
    );
    setTimeout(
      this.run.bind(this),
      this.context.config.reconnectInterval || DEFAULT_RESTART_INTERVAL,
    );
    this.run();
  }
}
