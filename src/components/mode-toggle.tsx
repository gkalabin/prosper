'use client';

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import {Fragment, useEffect, useState} from 'react';
import {useTheme} from './theme-provider';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function ModeToggle() {
  const {setTheme, theme} = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative ml-3">
        <button className="flex rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
          <span className="sr-only">Toggle theme</span>
          <SunIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const currentIcon =
    theme === 'dark' ? (
      <MoonIcon className="h-6 w-6" aria-hidden="true" />
    ) : theme === 'light' ? (
      <SunIcon className="h-6 w-6" aria-hidden="true" />
    ) : (
      <ComputerDesktopIcon className="h-6 w-6" aria-hidden="true" />
    );

  return (
    <Menu as="div" className="relative ml-3">
      <div>
        <MenuButton className="flex rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
          <span className="sr-only">Open theme menu</span>
          {currentIcon}
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
        <MenuItems className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-white/10">
          <MenuItem>
            {({focus}) => (
              <button
                onClick={() => setTheme('light')}
                className={classNames(
                  focus ? 'bg-gray-100 dark:bg-gray-700' : '',
                  'flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300'
                )}
              >
                <SunIcon className="mr-2 h-4 w-4" />
                Light
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({focus}) => (
              <button
                onClick={() => setTheme('dark')}
                className={classNames(
                  focus ? 'bg-gray-100 dark:bg-gray-700' : '',
                  'flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300'
                )}
              >
                <MoonIcon className="mr-2 h-4 w-4" />
                Dark
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({focus}) => (
              <button
                onClick={() => setTheme('system')}
                className={classNames(
                  focus ? 'bg-gray-100 dark:bg-gray-700' : '',
                  'flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300'
                )}
              >
                <ComputerDesktopIcon className="mr-2 h-4 w-4" />
                System
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
