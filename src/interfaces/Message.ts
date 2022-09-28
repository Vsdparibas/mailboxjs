import { Attachment } from '../Attachment';

export interface Message {
  from: string;
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
}
