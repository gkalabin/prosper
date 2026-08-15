'use client';
import {deleteTelegramLink} from '@/actions/config/telegram';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {CheckCircleIcon} from '@heroicons/react/24/outline';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function TelegramSettingsPage({
  configured,
  linked,
  linkUrl,
  linkCommand,
}: {
  configured: boolean;
  linked: boolean;
  linkUrl: string;
  // The command is the manual fallback when the hand-off to Telegram doesn't work.
  linkCommand: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!configured) {
    return (
      <p className="text-muted-foreground text-sm">
        Telegram notifications aren't available right now.
      </p>
    );
  }

  const copyLinkCommand = async () => {
    try {
      await navigator.clipboard.writeText(linkCommand);
      setCopied(true);
    } catch {
      setError('Could not copy the command. Please copy the command manually.');
    }
  };

  const handleUnlink = async () => {
    setError('');
    setPending(true);
    try {
      await deleteTelegramLink();
      // Reloading the page mints the link token the connect flow needs.
      router.refresh();
    } catch {
      setError('Could not disconnect. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex max-w-prose flex-col gap-1 p-6">
          <h2 className="font-medium leading-none">Transaction alerts</h2>
          <p className="text-muted-foreground text-sm">
            Get a Telegram message when your bank reports a new transaction, and
            record it with one tap.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {linked ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" />
              Connected to Telegram
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Not connected yet</p>
          )}
          {linked ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnlink}
              disabled={pending}
              className="self-start sm:self-auto"
            >
              {pending ? 'Disconnecting…' : 'Unlink'}
            </Button>
          ) : (
            <Button asChild className="self-start sm:self-auto">
              {/* Opening the link hands off to Telegram, where tapping Start
                  sends the token and links the chat. */}
              <a href={linkUrl} target="_blank" rel="noopener">
                Connect Telegram
              </a>
            </Button>
          )}
        </div>

        {!linked && (
          <div className="bg-muted/40 flex flex-col gap-3 border-t px-6 py-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Button above doesn't work?</p>
              <p className="text-muted-foreground text-sm">
                Open the bot in Telegram and send it this message.
              </p>
            </div>
            <div className="bg-background flex items-center gap-3 rounded-md border p-2 pl-3">
              <code className="min-w-0 grow break-all font-mono text-xs leading-5">
                {linkCommand}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={copyLinkCommand}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}
      </Card>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
