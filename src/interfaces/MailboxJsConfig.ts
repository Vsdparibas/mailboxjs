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
  user: string;
  password: string;
  smtp: SmtpConfig;
  imap: ImapConfig;
  reconnectInterval?: number;
  mailboxesToWatch?: string[];
  mailboxesWatchInterval?: number;
  logging?: boolean;
}
