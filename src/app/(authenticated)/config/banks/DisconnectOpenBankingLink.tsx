import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/model/BankAccount';
import {useState} from 'react';

export function DisconnectOpenBankingLink({bank}: {bank: Bank}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onClick = async () => {
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
      <Button
        variant="link"
        size="inherit"
        className="text-destructive"
        onClick={onClick}
        disabled={disconnecting}
      >
        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
      </Button>
      {error && <div className="text-red-600">{error}</div>}
    </>
  );
}
