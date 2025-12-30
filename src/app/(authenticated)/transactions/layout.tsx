export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex justify-center">
      <div className="w-full sm:w-3/4">{children}</div>
    </div>
  );
}
