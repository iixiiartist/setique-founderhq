import { expect, Page } from '@playwright/test';

export async function openNavigationMenu(page: Page) {
  const menuButton = page.getByTestId('open-side-menu-button');
  await expect(menuButton).toBeVisible();
  await menuButton.click();
}

export async function navigateToTab(page: Page, tabId: string) {
  await openNavigationMenu(page);
  const navLink = page.getByTestId(`nav-link-${tabId}`);
  await expect(navLink).toBeVisible();
  await navLink.click();
}
