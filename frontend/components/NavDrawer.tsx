'use client';
import {Logo} from '@/components/Logo';
import {SIGN_IN_URL, SIGN_OUT_URL} from '@/lib/auth/const';
import {cn} from '@/lib/utils';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
};

// Navigation menu that slides in from the left, for viewports too narrow to
// show the links inline. Account actions live at the bottom, mirroring the
// avatar menu shown inline on wider viewports. Selecting an item closes the
// drawer.
export function NavDrawer({
  navigation,
  login,
}: {
  navigation: NavItem[];
  login: string;
}) {
  const pathname = usePathname();
  return (
    <Dialog.Root>
      <Dialog.Trigger className="text-header-muted hover:bg-header-hover hover:text-header-foreground focus:ring-header-foreground inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-inset">
        <span className="sr-only">Open main menu</span>
        <Bars3Icon className="block h-5 w-5" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          // The drawer is a self-describing list of links; explicitly opt out
          // of a description instead of adding filler text for screen readers.
          aria-describedby={undefined}
          className={
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left bg-drawer text-drawer-foreground fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col p-4 shadow-xl duration-200'
          }
        >
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1 text-xl">
              <Logo />
              <span className="font-extrabold">prosper</span>
            </span>
            <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
            <Dialog.Close className="text-drawer-muted hover:text-drawer-foreground focus:ring-drawer-foreground rounded-md p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset">
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <nav className="mt-4 flex flex-col space-y-1">
            {navigation.map(item => {
              const active = item.href === pathname;
              const Icon = item.icon;
              return (
                <Dialog.Close asChild key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      active
                        ? 'bg-drawer-active text-drawer-foreground'
                        : 'text-drawer-muted hover:text-drawer-foreground hover:bg-white/5',
                      'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                </Dialog.Close>
              );
            })}
          </nav>
          <AccountSection login={login} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccountSection({login}: {login: string}) {
  return (
    <div className="border-drawer-border mt-auto border-t pt-4">
      {login && (
        <p className="text-drawer-muted px-3 pb-2 text-sm">
          Signed in as <span className="text-drawer-foreground">{login}</span>
        </p>
      )}
      <nav className="flex flex-col space-y-1">
        <Dialog.Close asChild>
          <Link
            href="/config"
            className="text-drawer-muted hover:text-drawer-foreground flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium hover:bg-white/5"
          >
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
            Settings
          </Link>
        </Dialog.Close>
        {login ? (
          <a
            href={SIGN_OUT_URL}
            className="text-drawer-muted hover:text-drawer-foreground flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium hover:bg-white/5"
          >
            <ArrowRightStartOnRectangleIcon
              className="h-5 w-5"
              aria-hidden="true"
            />
            Sign out
          </a>
        ) : (
          <a
            href={SIGN_IN_URL}
            className="text-drawer-muted hover:text-drawer-foreground flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium hover:bg-white/5"
          >
            <ArrowRightStartOnRectangleIcon
              className="h-5 w-5"
              aria-hidden="true"
            />
            Sign in
          </a>
        )}
      </nav>
    </div>
  );
}
