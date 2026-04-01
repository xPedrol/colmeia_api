import nodemailer from "nodemailer";

export default class MailService {
  _transporter;
  _from;

  constructor({ host, port, user, pass, from }) {
    this._from = from || user;
    this._transporter = nodemailer.createTransport({
      host,
      port,
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendEmail(to, subject, html) {
    await this._transporter.sendMail({
      from: this._from,
      to,
      subject,
      html,
    });
  }
}
