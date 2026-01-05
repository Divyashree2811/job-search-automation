import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Contains reusable UI functions for all page objects
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async acceptCookies() {
  const acceptBtn = this.page.locator('button:has-text("Accept all")');
  if (await acceptBtn.count() > 0) {
    await acceptBtn.first().click();
    await this.page.waitForTimeout(200); // small wait for banner to disappear
  }
}

  // ============ Navigation ============
  
  async navigate(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // ============ Click Actions ============

  async click(locator: Locator, options?: { force?: boolean; timeout?: number }): Promise<void> {
    // Wait for element to be visible and enabled before clicking
    await locator.waitFor({ state: 'visible', timeout: options?.timeout || 10000 });

    // Scroll into view if needed
    await locator.scrollIntoViewIfNeeded();

    // Click with optional force
    await locator.click({ force: options?.force });
  }

  async doubleClick(locator: Locator): Promise<void> {
    await locator.dblclick();
  }

  async rightClick(locator: Locator): Promise<void> {
    await locator.click({ button: 'right' });
  }

  // ============ Input Actions ============
  
  async fill(locator: Locator, text: string): Promise<void> {
    await locator.fill(text);
  }

  async clearAndFill(locator: Locator, text: string): Promise<void> {
    await locator.clear();
    await locator.fill(text);
  }

  async type(locator: Locator, text: string, delay: number = 50): Promise<void> {
    await locator.pressSequentially(text, { delay });
  }

  // ============ Select/Dropdown ============
  
  async selectByValue(locator: Locator, value: string): Promise<void> {
    await locator.selectOption({ value });
  }

  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await locator.selectOption({ label });
  }

  async selectByIndex(locator: Locator, index: number): Promise<void> {
    await locator.selectOption({ index });
  }

  // ============ Checkbox/Radio ============
  
  async check(locator: Locator): Promise<void> {
    await locator.check();
  }

  async uncheck(locator: Locator): Promise<void> {
    await locator.uncheck();
  }

  async isChecked(locator: Locator): Promise<boolean> {
    return await locator.isChecked();
  }

  // ============ Wait Functions ============
  
  async waitForElement(locator: Locator, timeout: number = 30000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async waitForElementHidden(locator: Locator, timeout: number = 30000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  // ============ Element State ============
  
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  async isEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  async getText(locator: Locator): Promise<string> {
    return await locator.innerText();
  }

  async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
    return await locator.getAttribute(attribute);
  }

  async getInputValue(locator: Locator): Promise<string> {
    return await locator.inputValue();
  }

  // ============ Assertions ============
  
  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async expectHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  async expectText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toHaveText(text);
  }

  async expectContainsText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text);
  }

  // ============ Screenshots ============
  
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  // ============ Keyboard Actions ============
  
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  // ============ Hover ============
  
  async hover(locator: Locator): Promise<void> {
    await locator.hover();
  }

  // ============ Scroll ============
  
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}
