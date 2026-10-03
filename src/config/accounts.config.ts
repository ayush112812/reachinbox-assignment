import { ImapAccountConfig } from '../types/imap.types';
import { logger } from '../utils/logger';

export const loadImapAccounts = (): ImapAccountConfig[] => {
  const accounts: ImapAccountConfig[] = [];

  // Check if a JSON string of accounts was provided
  if (process.env.IMAP_ACCOUNTS_JSON) {
    try {
      const parsed = JSON.parse(process.env.IMAP_ACCOUNTS_JSON);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.id && item.user && item.pass && item.host) {
            accounts.push({
              id: String(item.id),
              user: String(item.user),
              pass: String(item.pass),
              host: String(item.host),
              port: Number(item.port || 993),
              secure: item.secure !== false && item.secure !== 'false',
            });
          }
        }
      }
    } catch (err) {
      logger.error('Failed to parse IMAP_ACCOUNTS_JSON:', err);
    }
  }

  // Scan dynamic environment variables matching IMAP_ACC<N>_*
  const prefixRegex = /^IMAP_ACC(\d+)_/;
  const accountIndices = new Set<string>();

  for (const key of Object.keys(process.env)) {
    const match = key.match(prefixRegex);
    if (match && match[1]) {
      accountIndices.add(match[1]);
    }
  }

  // Sort indices numerically: 1, 2, 3...
  const sortedIndices = Array.from(accountIndices).sort((a, b) => Number(a) - Number(b));

  for (const idx of sortedIndices) {
    const id = process.env[`IMAP_ACC${idx}_ID`] || `account_${idx}`;
    const user = process.env[`IMAP_ACC${idx}_USER`];
    const pass = process.env[`IMAP_ACC${idx}_PASS`];
    const host = process.env[`IMAP_ACC${idx}_HOST`];
    const port = Number(process.env[`IMAP_ACC${idx}_PORT`] || 993);
    const secure = process.env[`IMAP_ACC${idx}_SECURE`] !== 'false';

    // Only load if user, pass, and host are actually configured (not placeholders/empty)
    if (user && pass && host && user !== 'user1@example.com' && user !== 'user2@example.com') {
      accounts.push({
        id,
        user,
        pass,
        host,
        port,
        secure,
      });
    }
  }

  return accounts;
};
