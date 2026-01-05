import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import * as dotenv from 'dotenv';

dotenv.config();

export class LinkedInLoginPage extends BasePage {
  // Locators
  private readonly emailInput = 'input[name="session_key"]';
  private readonly passwordInput = 'input[name="session_password"]';
  private readonly loginButton = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to LinkedIn login page
   */
  async navigateToLogin() {
    await this.page.goto('https://www.linkedin.com/login');
    console.log('✅ Navigated to LinkedIn login page');
  }

  /**
   * Fill email from .env file
   */
  async fillEmail() {
    const email = process.env.USER_EMAIL;
    if (!email) {
      throw new Error('USER_EMAIL not found in .env file');
    }
    await this.page.locator(this.emailInput).fill(email);
    console.log('✅ Filled email');
  }

  /**
   * Fill password from .env file
   */
  async fillPassword() {
    const password = process.env.USER_PASSWORD;
    if (!password) {
      throw new Error('USER_PASSWORD not found in .env file');
    }
    await this.page.locator(this.passwordInput).fill(password);
    console.log('✅ Filled password');
  }

  /**
   * Click login button
   */
  async clickLoginButton() {
    await this.page.locator(this.loginButton).click();
    console.log('✅ Clicked login button');
  }

  /**
   * Complete login flow
   */
  async login() {
    await this.navigateToLogin();
    await this.fillEmail();
    await this.fillPassword();
    await this.clickLoginButton();

    // Wait for navigation after login
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Login completed');
  }
}
