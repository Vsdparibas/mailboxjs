import { MessageAttachment, MessageAttachmentHeaders } from 'emailjs';
import { existsSync, PathLike } from 'fs';
import { Readable } from 'stream';

export class Attachment implements MessageAttachment {
  [index: string]:
    | string
    | boolean
    | MessageAttachment
    | MessageAttachment[]
    | MessageAttachmentHeaders
    | Readable
    | PathLike
    | undefined;
  stream?: Readable;
  data?: string;
  path?: PathLike;
  name?: string;
  charset: string;
  encoded?: boolean;
  type?: string;

  constructor(
    filename: string,
    content: Readable | PathLike | string,
    mimeType?: string,
    charset = 'utf-8',
    encoded?: boolean,
  ) {
    this.name = filename;
    if (content instanceof Readable) {
      this.stream = content;
    } else if (existsSync(content)) {
      this.path = content;
    } else if (typeof content === 'string') {
      this.data = content;
    }
    this.type = mimeType;
    this.charset = charset;
    this.encoded = encoded;
  }
}
