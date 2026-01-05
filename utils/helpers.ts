import { Page } from '@playwright/test';

/**
 * Utility helpers for common operations
 */

// Generate random string
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate random email
export function generateRandomEmail(domain: string = 'test.com'): string {
  return `test_${generateRandomString(8)}@${domain}`;
}

// Generate random number in range
export function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Format date to string
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

// Wait for specified milliseconds
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with attempts
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(delayMs);
    }
  }
  throw new Error('Retry failed');
}

// Get current timestamp
export function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Browser storage helpers
export async function setLocalStorage(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

// Cookie helpers
export async function setCookie(page: Page, name: string, value: string): Promise<void> {
  const url = page.url();
  await page.context().addCookies([{ name, value, url }]);
}

export async function getCookies(page: Page): Promise<any[]> {
  return await page.context().cookies();
}

export async function clearCookies(page: Page): Promise<void> {
  await page.context().clearCookies();
}
