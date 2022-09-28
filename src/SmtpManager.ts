import { SmtpConfig } from './interfaces/MailboxJsConfig';
import {
  MessageHeaders as EmailJsMessage,
  MessageAttachment,
  SMTPClient,
  SMTPConnectionOptions,
} from 'emailjs';
import { Context } from './MailboxJs';
import { Message } from './interfaces/Message';
import { Attachment } from './Attachment';
import { existsSync, PathLike } from 'fs';
import { Readable } from 'stream';

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

  public async send(message: Message): Promise<boolean | Error> {
    return new Promise((resolve, reject) => {
      const msg = this.messageToMsg(message);
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

  private messageToMsg(message: Message): EmailJsMessage {
    let attachment = undefined;
    if (message.attachments) {
      attachment = message.attachments.map(
        (attachment): MessageAttachment =>
          this.attachmentToMsgAttachment(attachment),
      );
    }
    return {
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      attachment,
    };
  }

  private attachmentToMsgAttachment(attachment: Attachment): MessageAttachment {
    const { data, path, stream } = this.getDataForAttachment(attachment.data);
    return {
      data,
      path,
      stream,
      name: attachment.name,
      type: attachment.type,
      charset: attachment.charset,
      encoded: attachment.encoded,
    };
  }

  private getDataForAttachment(incomingData: PathLike | Readable | string) {
    let stream: Readable | undefined;
    let path: PathLike | undefined;
    let data: string | undefined;
    if (incomingData instanceof Readable) {
      stream = incomingData;
    } else if (existsSync(incomingData)) {
      path = incomingData;
    } else if (typeof incomingData === 'string') {
      data = incomingData;
    } else {
      data = '';
    }
    return {
      stream,
      path,
      data,
    };
  }
}
