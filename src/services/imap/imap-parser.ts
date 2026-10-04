import { ParsedMail, simpleParser } from 'mailparser';
import { EmailAddress, EmailDocument } from '../../types/email.types';

export interface ParseOptions {
  accountId: string;
  folder: string;
  uid: number;
  uidValidity?: number;
}

export class ImapParser {
  /**
   * Normalizes a single mailparser address object into EmailAddress { name, address }
   */
  private static normalizeAddress(addr: { name?: string; address?: string } | undefined): EmailAddress {
    return {
      name: addr?.name ? addr.name.trim() : '',
      address: addr?.address ? addr.address.trim().toLowerCase() : ''
    };
  }

  /**
   * Normalizes list of addresses into EmailAddress[]
   */
  private static normalizeAddressList(addrs: unknown): EmailAddress[] {
    if (!addrs) return [];
    const list = Array.isArray(addrs) ? addrs : [addrs];
    const result: EmailAddress[] = [];

    for (const item of list) {
      if (item && typeof item === 'object') {
        const anyItem = item as { value?: Array<{ name?: string; address?: string }>; address?: string; name?: string };
        if (Array.isArray(anyItem.value)) {
          for (const v of anyItem.value) {
            if (v.address) {
              result.push(this.normalizeAddress(v));
            }
          }
        } else if (anyItem.address) {
          result.push(this.normalizeAddress(anyItem));
        }
      }
    }

    return result;
  }

  /**
   * Generates a clean 180-character snippet from plaintext body
   */
  private static generateSnippet(text: string): string {
    if (!text) return '';
    const cleaned = text
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
  }

  /**
   * Converts references header into a clean string array
   */
  private static normalizeReferences(references: string | string[] | undefined): string[] {
    if (!references) return [];
    if (Array.isArray(references)) return references.map(r => r.trim()).filter(Boolean);
    return references.split(/\s+/).map(r => r.trim()).filter(Boolean);
  }

  /**
   * Parses raw RFC 2822 message source Buffer/Stream into our EmailDocument
   */
  public static async parseMessage(
    rawSource: Buffer | string,
    options: ParseOptions
  ): Promise<EmailDocument> {
    const parsed: ParsedMail = await simpleParser(rawSource);

    const fromAddress = parsed.from?.value?.[0]
      ? this.normalizeAddress(parsed.from.value[0])
      : { name: '', address: 'unknown@sender.com' };

    const toAddresses = this.normalizeAddressList(parsed.to);
    const ccAddresses = this.normalizeAddressList(parsed.cc);
    const bccAddresses = this.normalizeAddressList(parsed.bcc);

    const bodyText = parsed.text ? parsed.text.trim() : '';
    const bodyHtml = typeof parsed.html === 'string' ? parsed.html : '';
    const snippet = this.generateSnippet(bodyText || bodyHtml.replace(/<[^>]*>?/gm, ' '));

    const date = parsed.date instanceof Date && !isNaN(parsed.date.getTime())
      ? parsed.date
      : new Date();

    const references = this.normalizeReferences(parsed.references);
    const messageId = parsed.messageId ? parsed.messageId.trim() : `<generated-${options.accountId}-${options.uid}@reachinbox.local>`;

    // Deterministic identity: account + folder + uidValidity + UID
    const deterministicId = `${options.accountId}#${options.folder}#${options.uidValidity || 0}#${options.uid}`;

    return {
      id: deterministicId,
      accountId: options.accountId,
      folder: options.folder,
      uid: options.uid,
      uidValidity: options.uidValidity,
      messageId,
      threadId: references[0] || messageId,
      inReplyTo: parsed.inReplyTo ? parsed.inReplyTo.trim() : undefined,
      references,
      subject: parsed.subject ? parsed.subject.trim() : '(No Subject)',
      from: fromAddress,
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      date,
      bodyText,
      bodyHtml,
      snippet,
      category: 'Uncategorized',
      categoryConfidence: 0,
      categoryReasoning: undefined,
      notificationSent: false,
      indexedAt: new Date()
    };
  }
}
