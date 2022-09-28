import { ImapManager } from './ImapManager';
import { FetchMessageObject } from 'imapflow';
import {
  ParsedMail,
  Attachment,
  HeaderLines,
  Headers,
  AddressObject,
} from 'mailparser';
import { Mailbox } from './Mailbox';

/**
 * Mail from IMAP server
 * @param {number} uid - Unique id of the mail
 * @param {number} seq - Sequence number of the mail
 * @param {Mailbox} mailbox - Mailbox where the mail is
 * @param {Attachment[]} attachments - Array of attachments
 * @param {Headers} headers -
 * @param {HeaderLines} headerLines -
 * @param {string | false} html -
 * @param {string | undefined} text -
 * @param {string | undefined} textAsHtml -
 * @param {string | undefined} subject - Subject of the mail
 * @param {string[] | string | undefined} references -
 * @param {Date | undefined} date -
 * @param {AddressObject | AddressObject[] | undefined} to -
 * @param {AddressObject | undefined} from -
 * @param {AddressObject | AddressObject[] | undefined} cc -
 * @param {AddressObject | AddressObject[] | undefined} bcc -
 * @param {AddressObject | undefined} replyTo -
 * @param {string | undefined} messageId -
 * @param {string | undefined} inReplyTo -
 * @param {'norma' | 'low' | 'high' | undefined} priority -
 */
export class Mail {
  private readonly imap: ImapManager;
  uid: number;
  seq: number;
  mailbox: Mailbox;
  attachments: Attachment[];
  headers: Headers;
  headerLines: HeaderLines;
  html: string | false;
  text?: string | undefined;
  textAsHtml?: string | undefined;
  subject?: string | undefined;
  references?: string[] | string | undefined;
  date?: Date | undefined;
  to?: AddressObject | AddressObject[] | undefined;
  from?: AddressObject | undefined;
  cc?: AddressObject | AddressObject[] | undefined;
  bcc?: AddressObject | AddressObject[] | undefined;
  replyTo?: AddressObject | undefined;
  messageId?: string | undefined;
  inReplyTo?: string | undefined;
  priority?: 'normal' | 'low' | 'high' | undefined;

  constructor(
    imap: ImapManager,
    mailbox: Mailbox,
    parsedMail: ParsedMail,
    msg: FetchMessageObject,
  ) {
    this.imap = imap;
    this.uid = msg.uid;
    this.seq = msg.seq;
    this.mailbox = mailbox;
    this.attachments = parsedMail.attachments;
    this.headers = parsedMail.headers;
    this.headerLines = parsedMail.headerLines;
    this.html = parsedMail.html;
    this.text = parsedMail.text;
    this.textAsHtml = parsedMail.textAsHtml;
    this.subject = parsedMail.subject;
    this.references = parsedMail.references;
    this.date = parsedMail.date;
    this.to = parsedMail.to;
    this.from = parsedMail.from;
    this.cc = parsedMail.cc;
    this.bcc = parsedMail.bcc;
    this.replyTo = parsedMail.replyTo;
    this.messageId = parsedMail.messageId;
    this.inReplyTo = parsedMail.inReplyTo;
    this.priority = parsedMail.priority;
  }

  /**
   * Delete this mail
   */
  public delete() {
    this.imap.deleteMails(this.mailbox.path, { uids: [this.uid] });
  }

  /**
   * Move this mail to another mailbox
   * @param {string} toMailboxPath - Mailbox's name where to move the mail
   */
  public move(toMailboxPath: string) {
    this.imap.moveMails(this.mailbox.path, toMailboxPath, { uids: [this.uid] });
  }

  /**
   * Copy this mail in anoter mailbox
   * @param {string} toMailboxPath - Mailbox's name where to copy this mail
   */
  public copy(toMailboxPath: string) {
    this.imap.copyMails(this.mailbox.path, toMailboxPath, { uids: [this.uid] });
  }

  /**
   * Add flags to this mail
   * @param {string[]} flags - Array of flags to add
   */
  public addFlags(flags: string[]) {
    this.imap.addMailsFlags(this.mailbox.path, flags, { uids: [this.uid] });
  }

  /**
   * Remove flags to this mail
   * @param {string[]} flags - Array of flags to remove
   */
  public removeFlags(flags: string[]) {
    this.imap.removeMailsFlags(this.mailbox.path, flags, { uids: [this.uid] });
  }

  /**
   * Mark this mail seen
   */
  public see() {
    this.imap.seeMails(this.mailbox.path, { uids: [this.uid] });
  }

  /**
   * Mark this mail unseen
   */
  public unsee() {
    this.imap.unseeMails(this.mailbox.path, { uids: [this.uid] });
  }
}
