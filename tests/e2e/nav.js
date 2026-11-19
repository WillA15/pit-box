// The main nav sits behind a menu button on phones: open it first when it is there.
export async function mainNav(page) {
  const toggle = page.getByRole('button', { name: 'Open menu' });
  if (await toggle.isVisible()) await toggle.click();
  return page.getByRole('navigation', { name: 'Main' });
}
