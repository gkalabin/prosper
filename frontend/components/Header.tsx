'use client';
import {Logo} from '@/components/Logo';
import {NavDrawer, NavItem} from '@/components/NavDrawer';
import {SIGN_IN_URL, SIGN_OUT_URL} from '@/lib/auth/const';
import {cn} from '@/lib/utils';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import {
  ChartBarIcon,
  HomeIcon,
  ListBulletIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Fragment} from 'react';

const navigation: NavItem[] = [
  {name: 'Overview', href: '/overview', icon: HomeIcon},
  {name: 'Transactions', href: '/transactions', icon: ListBulletIcon},
  {name: 'Stats', href: '/stats/expense', icon: ChartBarIcon},
  {name: 'Trips', href: '/trips', icon: PaperAirplaneIcon},
];

export default function Header({login}: {login: string}) {
  const pathname = usePathname();
  return (
    <nav className="bg-header text-header-foreground">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <NavDrawer navigation={navigation} login={login} />
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                aria-label="Prosper — Overview"
                className="flex items-center gap-1 text-xl"
              >
                <Logo />
                <span className="font-extrabold">prosper</span>
              </a>
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map(item => {
                  const active = item.href === pathname;
                  return (
                    <Link
                      href={item.href}
                      key={item.name}
                      className={cn(
                        active
                          ? 'bg-header-hover text-header-foreground'
                          : 'text-header-muted hover:bg-header-hover hover:text-header-foreground',
                        'rounded-md px-3 py-2 text-sm font-medium'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <ProfileMenu login={login} />
          </div>
        </div>
      </div>
    </nav>
  );
}

// Avatar dropdown shown inline on wider viewports. Narrow viewports surface the
// same account actions at the bottom of the navigation drawer instead.
function ProfileMenu({login}: {login: string}) {
  return (
    <Menu as="div" className="relative ml-3">
      <MenuButton
        className="text-header-muted hover:bg-header-hover hover:text-header-foreground focus-visible:ring-accent inline-grid h-10 w-10 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
        aria-label="Open user menu"
      >
        <UserCircleIcon className="h-5 w-5" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <MenuItem>
            {({focus}) => (
              <Link
                href="/config"
                className={cn(
                  focus ? 'bg-gray-100' : '',
                  'block px-4 py-2 text-sm text-gray-700'
                )}
              >
                Settings
              </Link>
            )}
          </MenuItem>

          {!login && (
            <MenuItem>
              {({focus}) => (
                <a
                  href={SIGN_IN_URL}
                  className={cn(
                    focus ? 'bg-gray-100' : '',
                    'block cursor-pointer px-4 py-2 text-sm text-gray-700'
                  )}
                >
                  Sign in
                </a>
              )}
            </MenuItem>
          )}

          {login && (
            <>
              <div className="block px-4 py-2 text-sm text-gray-700">
                Signed in as <i>{login}</i>
              </div>
              <MenuItem>
                {({focus}) => (
                  <a
                    href={SIGN_OUT_URL}
                    className={cn(
                      focus ? 'bg-gray-100' : '',
                      'block cursor-pointer py-2 pl-6 pr-4 text-sm text-gray-700'
                    )}
                  >
                    Sign out
                  </a>
                )}
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Transition>
    </Menu>
  );
}
