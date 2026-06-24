'use client';
import {SIGN_IN_URL, SIGN_OUT_URL} from '@/lib/auth/const';
import {cn} from '@/lib/utils';
import {
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
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
      <Dialog.Trigger className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
        <span className="sr-only">Open main menu</span>
        <Bars3Icon className="block h-5 w-5" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className={
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col bg-gray-800 p-4 shadow-xl duration-200'
          }
        >
          <div className="flex items-center justify-between px-1">
            <BanknotesIcon className="block h-8 w-auto text-green-200" />
            <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
            <Dialog.Close className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
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
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
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
    <div className="mt-auto border-t border-gray-700 pt-4">
      {login && (
        <p className="px-3 pb-2 text-sm text-gray-400">
          Signed in as <span className="text-gray-200">{login}</span>
        </p>
      )}
      <nav className="flex flex-col space-y-1">
        <Dialog.Close asChild>
          <Link
            href="/config"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
            Settings
          </Link>
        </Dialog.Close>
        {login ? (
          <a
            href={SIGN_OUT_URL}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
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
            className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
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
