export default async function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex h-full w-full justify-center">
      <main className="mx-8 mt-24 w-[360px] place-self-center rounded-md border border-indigo-300 p-8 shadow-md">
        <h1 className="mb-8 text-center text-2xl font-bold leading-9 tracking-tight text-indigo-900">
          Prosper
        </h1>
        {children}
      </main>
    </div>
  );
}
