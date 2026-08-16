import { describe, expect, it } from 'vitest';
import { getInvitationStatus } from './invitations';

describe('getInvitationStatus', () => {
  it('returns used when already used', () => {
    expect(getInvitationStatus({ isUsed: true, expiresAt: new Date(Date.now() + 10_000) })).toBe(
      'used'
    );
  });

  it('returns expired when past expiry', () => {
    expect(getInvitationStatus({ isUsed: false, expiresAt: new Date(Date.now() - 1) })).toBe(
      'expired'
    );
  });

  it('returns pending otherwise', () => {
    expect(getInvitationStatus({ isUsed: false, expiresAt: new Date(Date.now() + 10_000) })).toBe(
      'pending'
    );
  });
});
