'use client';
import {NavDrawer, NavItem} from '@/components/NavDrawer';
import {SIGN_IN_URL, SIGN_OUT_URL} from '@/lib/auth/const';
import {isProd} from '@/lib/util/env';
import {cn} from '@/lib/utils';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import {
  BanknotesIcon,
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
    <nav className={cn(isProd() ? 'bg-gray-800' : 'bg-orange-700')}>
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <NavDrawer navigation={navigation} login={login} />
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/">
                <BanknotesIcon className="block h-8 w-auto text-green-200" />
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
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
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
      <MenuButton className="flex rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
        <span className="sr-only">Open user menu</span>
        <UserCircleIcon className="h-8 w-8 rounded-full text-white" />
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
