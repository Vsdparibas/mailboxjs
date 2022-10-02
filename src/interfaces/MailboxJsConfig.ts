export interface SmtpConfig {
  host: string;
  port: number;
  tls?: boolean;
}

export interface ImapConfig {
  host: string;
  port: number;
  tls?: boolean;
}

export interface MailboxJsConfig {
  name: string;
  user: string;
  password: string;
  smtp: SmtpConfig;
  imap: ImapConfig;
  reconnectInterval?: number;
  mailboxesToWatch?: string[];
  mailboxesWatchInterval?: number;
  logging?: boolean;
}
