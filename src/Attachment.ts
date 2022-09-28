import { PathLike } from 'fs';
import { Readable } from 'stream';

export interface Attachment {
  data: PathLike | Readable | string;
  name?: string;
  encoded?: boolean;
  type?: string;
  charset?: string;
}

export class JsonAttachment implements Attachment {
  data: PathLike | Readable | string;
  name?: string;
  encoded?: boolean;
  type: string;
  charset: string;
  constructor(
    value: any,
    fileName?: string,
    charset = 'utf8',
    encoded?: boolean,
  ) {
    this.data = JSON.stringify(value);
    this.name = fileName;
    this.type = 'application/json';
    this.charset = charset;
    this.encoded = encoded;
  }
}

export class TxtAttachment implements Attachment {
  data: PathLike | Readable | string;
  name?: string;
  encoded?: boolean;
  type: string;
  charset: string;
  constructor(
    text: any,
    fileName?: string,
    charset = 'utf8',
    encoded?: boolean,
  ) {
    this.data = text;
    this.name = fileName;
    this.type = 'text/plain';
    this.charset = charset;
    this.encoded = encoded;
  }
}

export class CsvAttachment implements Attachment {
  data: PathLike | Readable | string;
  name?: string;
  encoded?: boolean;
  type: string;
  charset: string;
  constructor(
    text: any,
    fileName?: string,
    charset = 'utf8',
    encoded?: boolean,
  ) {
    this.data = text;
    this.name = fileName;
    this.type = 'text/plain';
    this.charset = charset;
    this.encoded = encoded;
  }
}
