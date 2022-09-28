import chalk, { ForegroundColor } from 'chalk';

export class Logger {
  private logging: boolean;

  constructor(logging: boolean = false) {
    this.logging = logging;
  }

  public log(
    message: string,
    title = 'MailboxJS',
    color: typeof ForegroundColor = 'white',
  ) {
    if (this.logging) {
      title = chalk[color](`[${title}]`);
      let date = new Date(Date.now()).toLocaleString();
      date = chalk.white(date);
      message = chalk[color](message);
      console.log(`${title} - ${date} - ${message}`);
    }
  }
}
