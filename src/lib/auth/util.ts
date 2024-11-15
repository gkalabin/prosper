export async function waitUntilNavigationComplete() {
  // This is a massive hack which just adds arbitrary wait in the code when there is a need to await clientside navigation.
  // Nextjs doesn't provide a way to detect when the navigation (using router.push) is complete, hence this workaround.
  await new Promise(resolve => setTimeout(resolve, 10000));
}
