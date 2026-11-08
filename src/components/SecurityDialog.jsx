import React from 'react';
import AccountDialog from './AccountDialog';

/**
 * Backward-compatible wrapper for AccountDialog defaulting to security tab.
 */
export default function SecurityDialog(props) {
  return <AccountDialog {...props} initialTab="security" />;
}
