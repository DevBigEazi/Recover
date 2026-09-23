declare module "zeptomail" {
  export interface ZeptoMailAddress {
    address: string;
    name?: string;
  }

  export interface ZeptoMailRecipient {
    email_address: ZeptoMailAddress;
  }

  export interface ZeptoMailSendMailOptions {
    from: ZeptoMailAddress;
    to: ZeptoMailRecipient[];
    subject: string;
    htmlbody?: string;
    textbody?: string;
    cc?: ZeptoMailRecipient[];
    bcc?: ZeptoMailRecipient[];
    reply_to?: ZeptoMailAddress[];
    track_clicks?: boolean;
    track_opens?: boolean;
    client_reference?: string;
    mime_headers?: Record<string, string>;
  }

  export interface ZeptoMailSendResponse {
    data?: Array<{
      code: string;
      message: string;
      additional_info?: unknown[];
    }>;
    message?: string;
    request_id?: string;
    object?: string;
  }

  export class SendMailClient {
    constructor(options: { url: string; token: string });
    sendMail(mailOptions: ZeptoMailSendMailOptions): Promise<ZeptoMailSendResponse>;
  }
}
