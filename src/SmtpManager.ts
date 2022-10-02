import { SmtpConfig } from './interfaces/MailboxJsConfig';
import {
  MessageAttachment,
  MessageHeaders as EmailJsMessage,
  SMTPClient,
  SMTPConnectionOptions,
} from 'emailjs';
import { Context } from './MailboxJs';
import { Attachment } from './Attachment';

export class SmtpManager {
  private context: Context;
  private client: SMTPClient;

  constructor(context: Context, smtpConfig: SmtpConfig) {
    this.context = context;
    const config: Partial<SMTPConnectionOptions> = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      tls: smtpConfig.tls,
      user: context.config.user,
      password: context.config.password,
    };
    this.client = new SMTPClient(config);
    this.context.logger.log(
      `Configured for <${this.context.config.user}>`,
      'SMTP',
      'green',
    );
  }

  public async send(
    to: string,
    subject: string,
    text: string,
    attachments?: Attachment[] | Attachment,
    from?: string,
  ): Promise<boolean | Error> {
    return new Promise((resolve, reject) => {
      const msg = this.getMsg(to, subject, text, attachments, from);
      this.client.send(msg, (err) => {
        if (err) return reject(err);
        resolve(true);
        this.context.logger.log(
          `Sending mail from <${this.context.config.user}>`,
          'SMTP',
        );
      });
    });
  }

  public async sendHtml(
    to: string,
    subject: string,
    text: string,
    html: string,
    attachments?: Attachment[] | Attachment,
    from?: string,
  ): Promise<boolean | Error> {
    return new Promise((resolve, reject) => {
      const msg = this.getMsg(to, subject, text, attachments, from);
      const attachmentHtml: MessageAttachment = {
        data: html,
        alternative: true,
      };
      if (!msg.attachment) {
        msg.attachment = [attachmentHtml];
      } else {
        if (Array.isArray(msg.attachment)) {
          msg.attachment.push(attachmentHtml);
        } else {
          msg.attachment = [attachmentHtml, msg.attachment];
        }
      }
      this.client.send(msg, (err) => {
        if (err) return reject(err);
        resolve(true);
        this.context.logger.log(
          `Sending mail from <${this.context.config.user}>`,
          'SMTP',
        );
      });
    });
  }

  private getMsg(
    to: string,
    subject: string,
    text: string,
    attachments?: Attachment[] | Attachment,
    from?: string,
  ): EmailJsMessage {
    if (!from) {
      from = `${this.context.config.name} <${this.context.config.user}>`;
    }
    return {
      from,
      to,
      subject: subject,
      text: text,
      attachment: attachments,
    };
  }
}
