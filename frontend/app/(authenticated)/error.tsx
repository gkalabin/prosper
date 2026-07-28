'use client';
import {useEffect} from 'react';

export default function ErrorBoundary({
  error,
}: {
  error: Error & {digest?: string};
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const serverMessage = error.message || 'Unknown error';
  return (
    <div className="flex justify-center">
      <div className="w-full p-4 sm:w-3/4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-4 text-gray-700">
          This request failed. Try again, or check the details below.
        </p>
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="text-sm font-medium text-gray-700">
            What went wrong
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words font-mono text-sm text-gray-600">
            {serverMessage}
          </p>
        </div>
        {error.digest && (
          <p className="mt-3 text-xs text-gray-500">
            Reference code: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
