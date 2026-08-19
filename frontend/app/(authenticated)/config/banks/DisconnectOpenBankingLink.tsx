import {TextButton} from '@/components/ui/text-button';
import {Bank} from '@/lib/model/BankAccount';
import {useState} from 'react';

export function DisconnectOpenBankingLink({bank}: {bank: Bank}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${bank.name}?`)) {
      return;
    }
    setError(null);
    setDisconnecting(true);
    const response = await fetch(
      `/api/config/bank/${bank.id}/open-banking/disconnect`,
      {
        method: 'POST',
      }
    );
    if (response.status !== 200) {
      setDisconnecting(false);
      setError(`Failed to disconnect: ${response.statusText}`);
      return;
    }
    window.location.reload();
  };

  return (
    <>
      <TextButton tone="muted" onClick={disconnect} pending={disconnecting}>
        Disconnect
      </TextButton>
      {error && <div className="text-destructive">{error}</div>}
    </>
  );
}
