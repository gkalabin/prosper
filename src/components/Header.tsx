'use client';
import {SIGN_IN_URL, SIGN_OUT_URL} from '@/lib/auth/const';
import {isProd} from '@/lib/util/env';
import {cn} from '@/lib/utils';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import {
  BanknotesIcon,
  Bars3Icon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Fragment} from 'react';

export default function Header({login}: {login: string}) {
  const pathname = usePathname();
  const isActive = ({href}: {href: string}) => {
    return href === pathname;
  };

  const navigation = [
    {name: 'Overview', href: '/overview'},
    {name: 'Transactions', href: '/transactions'},
    {name: 'Stats', href: '/stats/expense'},
    {name: 'Trips', href: '/trips'},
  ];

  return (
    <Disclosure
      as="nav"
      className={cn(isProd() ? 'bg-gray-800' : 'bg-orange-700')}
    >
      {({open}) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
                <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
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
                    {navigation.map(item => (
                      <Link
                        href={item.href}
                        key={item.name}
                        className={cn(
                          isActive(item)
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                          'rounded-md px-3 py-2 text-sm font-medium'
                        )}
                        aria-current={isActive(item) ? 'page' : undefined}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                {/* Profile dropdown */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <MenuButton className="flex rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                      <span className="sr-only">Open user menu</span>
                      <UserCircleIcon className="h-8 w-8 rounded-full text-white" />
                    </MenuButton>
                  </div>
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
                            Config
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
                              Sign In
                            </a>
                          )}
                        </MenuItem>
                      )}

                      {login && (
                        <MenuItem>
                          {({focus}) => (
                            <>
                              <span className="block px-4 py-2 text-sm text-gray-700">
                                Signed in as <i>{login}</i>
                              </span>
                              <a
                                href={SIGN_OUT_URL}
                                className={cn(
                                  focus ? 'bg-gray-100' : '',
                                  'block cursor-pointer py-2 pl-6 pr-4 text-sm text-gray-700'
                                )}
                              >
                                Sign Out
                              </a>
                            </>
                          )}
                        </MenuItem>
                      )}
                    </MenuItems>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map(item => (
                <Link href={item.href} key={item.name}>
                  <DisclosureButton
                    key={item.name}
                    className={cn(
                      isActive(item)
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'block rounded-md px-3 py-2 text-base font-medium'
                    )}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    {item.name}
                  </DisclosureButton>
                </Link>
              ))}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}
