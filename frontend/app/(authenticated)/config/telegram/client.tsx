'use client';
import {
  createTelegramLink,
  deleteTelegramLink,
} from '@/actions/config/telegram';
import {Button} from '@/components/ui/button';
import {useState} from 'react';

export function TelegramSettingsPage({
  configured,
  initialLinked,
}: {
  configured: boolean;
  initialLinked: boolean;
}) {
  const [linked, setLinked] = useState(initialLinked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!configured) {
    return (
      <p className="text-muted-foreground text-sm">
        {/* TODO: I don't like the copy, speaking of server is kind of nerdy, find a nicer way to phrase it. */}
        Telegram integration is not configured on this server.
      </p>
    );
  }

  const handleConnect = async () => {
    setError('');
    setPending(true);
    try {
      const {deepLink} = await createTelegramLink();
      // Opening the deep link hands off to Telegram, where tapping Start
      // sends /start with the token and links the chat.
      window.open(deepLink, '_blank', 'noopener');
      setLinked(true);
    } catch {
      setError('Could not create a connection link. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const handleUnlink = async () => {
    setError('');
    setPending(true);
    try {
      await deleteTelegramLink();
      setLinked(false);
    } catch {
      setError('Could not disconnect. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {/* TODO: copy issue - do not speak of open banking, the user probably doesn't know what it is. Something like when bank reports or smth. */}
        Get a Telegram message when open banking finds a new transaction, and
        record it with one tap. Message content is delivered to and stored by
        Telegram.
      </p>
      {linked ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">✅ Connected to Telegram.</span>
          <Button
            type="button"
            variant="destructive"
            onClick={handleUnlink}
            disabled={pending}
          >
            {pending ? 'Disconnecting…' : 'Unlink'}
          </Button>
        </div>
      ) : (
        <div>
          <Button type="button" onClick={handleConnect} disabled={pending}>
            {pending ? 'Opening Telegram…' : 'Connect Telegram'}
          </Button>
        </div>
      )}
      {error && <div className="text-destructive text-sm">{error}</div>}
    </div>
  );
}
