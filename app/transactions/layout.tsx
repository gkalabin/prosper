export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <div className="w-full p-4 sm:w-3/4">{children}</div>
    </div>
  );
}
