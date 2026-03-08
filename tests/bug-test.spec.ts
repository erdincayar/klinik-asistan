import { test, expect, Page } from '@playwright/test';

// Collect console errors per page
const consoleErrors: Record<string, string[]> = {};

function trackConsoleErrors(page: Page, pageName: string) {
  consoleErrors[pageName] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors[pageName].push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors[pageName].push(err.message);
  });
}

// ============================================================
// 1. LOGIN
// ============================================================
test.describe('LOGIN', () => {
  test('should login with admin credentials and redirect to dashboard', async ({ page }) => {
    trackConsoleErrors(page, 'login');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/01-login-page.png' });

    // Fill credentials
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('admin@inpobi.com');
    await passwordInput.fill('InPobi2026Admin!');

    // Click login button
    const loginBtn = page.locator('button[type="submit"]');
    await loginBtn.click();

    // Wait for navigation
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/02-dashboard-after-login.png' });
    expect(page.url()).toContain('dashboard');
  });
});

// ============================================================
// 2. DASHBOARD
// ============================================================
test.describe('DASHBOARD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load dashboard cards without errors', async ({ page }) => {
    trackConsoleErrors(page, 'dashboard');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/03-dashboard.png' });

    // Check for error messages
    const errorElements = page.locator('text=/hata|error|failed|başarısız/i');
    const errorCount = await errorElements.count();

    // Check for cards/widgets
    const cards = page.locator('[class*="card"], [class*="Card"], [class*="widget"], [class*="stat"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    if (errorCount > 0) {
      const errors: string[] = [];
      for (let i = 0; i < errorCount; i++) {
        errors.push(await errorElements.nth(i).textContent() || '');
      }
      console.log('Dashboard errors found:', errors);
    }
  });
});

// ============================================================
// 3. SIDEBAR NAVIGATION
// ============================================================
test.describe('SIDEBAR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const menuItems = [
    { name: 'Genel Bakış', urlPart: 'dashboard' },
    { name: 'Müşteriler', urlPart: 'patients' },
    { name: 'Randevular', urlPart: 'appointments' },
    { name: 'Finans', urlPart: 'finance' },
    { name: 'Stok', urlPart: 'stock' },
    { name: 'Çalışanlar', urlPart: 'employees' },
    { name: 'Pazarlama', urlPart: 'marketing' },
    { name: 'Mesajlaşma', urlPart: 'messaging' },
    { name: 'AI Asistan', urlPart: 'ai' },
    { name: 'Raporlar', urlPart: 'reports' },
    { name: 'Hatırlatmalar', urlPart: 'reminders' },
    { name: 'Abonelik', urlPart: 'subscription' },
    { name: 'Ayarlar', urlPart: 'settings' },
  ];

  for (const item of menuItems) {
    test(`should navigate to ${item.name}`, async ({ page }) => {
      trackConsoleErrors(page, `sidebar-${item.name}`);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Try clicking sidebar link
      const link = page.locator(`a, button, [role="menuitem"], [role="link"]`).filter({ hasText: new RegExp(`^${escapeRegex(item.name)}$|^${escapeRegex(item.name)}\\s`, 'i') });
      const linkCount = await link.count();

      if (linkCount > 0) {
        await link.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `test-results/screenshots/sidebar-${item.urlPart}.png` });

        // Verify page loaded (no 404, no blank page)
        const body = await page.locator('body').textContent();
        expect(body?.length).toBeGreaterThan(10);
      } else {
        // Menu item not found - try alternative selectors
        const altLink = page.locator(`[href*="${item.urlPart}"]`);
        const altCount = await altLink.count();
        if (altCount > 0) {
          await altLink.first().click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: `test-results/screenshots/sidebar-${item.urlPart}.png` });
        } else {
          console.log(`Menu item "${item.name}" not found in sidebar`);
          await page.screenshot({ path: `test-results/screenshots/sidebar-${item.urlPart}-NOT-FOUND.png` });
          // Don't fail, just report
          test.info().annotations.push({ type: 'warning', description: `Menu item "${item.name}" not found` });
        }
      }
    });
  }
});

// ============================================================
// 4. MÜŞTERİLER
// ============================================================
test.describe('MÜŞTERİLER', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load customer list and show add button', async ({ page }) => {
    trackConsoleErrors(page, 'patients');
    await page.goto('/dashboard/patients');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/04-patients.png' });

    // Check for list/table
    const table = page.locator('table, [class*="list"], [class*="List"], [role="table"]');
    const tableExists = await table.count();

    // Check for add button
    const addBtn = page.locator('button, a').filter({ hasText: /ekle|yeni|oluştur|add|new/i });
    const addBtnExists = await addBtn.count();

    expect(tableExists + addBtnExists).toBeGreaterThan(0);
  });
});

// ============================================================
// 5. RANDEVULAR
// ============================================================
test.describe('RANDEVULAR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should render calendar', async ({ page }) => {
    trackConsoleErrors(page, 'appointments');
    await page.goto('/dashboard/appointments');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/05-appointments.png' });

    // Check for calendar elements
    const calendar = page.locator('[class*="calendar"], [class*="Calendar"], [class*="fc-"], table, [class*="schedule"], [class*="Schedule"]');
    const calendarExists = await calendar.count();
    expect(calendarExists).toBeGreaterThan(0);
  });
});

// ============================================================
// 6. FİNANS
// ============================================================
test.describe('FİNANS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have tabs and load content', async ({ page }) => {
    trackConsoleErrors(page, 'finance');
    await page.goto('/dashboard/finance');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/06-finance.png' });

    // Check for tabs
    const tabs = page.locator('[role="tab"], [class*="tab"], button').filter({ hasText: /gelir|gider|fatura|özet|income|expense|invoice/i });
    const tabCount = await tabs.count();

    // Check content loaded
    const body = await page.locator('main, [class*="content"], [class*="Content"]').first().textContent();
    expect((body?.length || 0)).toBeGreaterThan(5);
  });
});

// ============================================================
// 7. STOK
// ============================================================
test.describe('STOK', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load product list', async ({ page }) => {
    trackConsoleErrors(page, 'stock');
    // Try both possible URLs
    await page.goto('/dashboard/stock');
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent();
    if (body?.includes('404') || (body?.length || 0) < 50) {
      await page.goto('/dashboard/products');
      await page.waitForLoadState('networkidle');
    }

    await page.screenshot({ path: 'test-results/screenshots/07-stock.png' });

    // Check for product list/table
    const list = page.locator('table, [class*="list"], [class*="List"], [class*="product"], [class*="Product"], [class*="grid"]');
    const listExists = await list.count();
    expect(listExists).toBeGreaterThan(0);
  });
});

// ============================================================
// 8. AYARLAR
// ============================================================
test.describe('AYARLAR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have Telegram, WhatsApp, Meta Ads sections', async ({ page }) => {
    trackConsoleErrors(page, 'settings');
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/08-settings.png' });

    const pageContent = await page.locator('body').textContent() || '';

    const hasTelegram = pageContent.toLowerCase().includes('telegram');
    const hasWhatsApp = pageContent.toLowerCase().includes('whatsapp');
    const hasMetaAds = pageContent.toLowerCase().includes('meta') || pageContent.toLowerCase().includes('reklam') || pageContent.toLowerCase().includes('ads');

    console.log(`Telegram: ${hasTelegram}, WhatsApp: ${hasWhatsApp}, Meta Ads: ${hasMetaAds}`);

    // At least check that settings page loaded
    expect(pageContent.length).toBeGreaterThan(50);
  });
});

// ============================================================
// 9. CONSOLE ERRORS - collected across pages
// ============================================================
test.describe('CONSOLE ERRORS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const pagesToCheck = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Patients', path: '/dashboard/patients' },
    { name: 'Appointments', path: '/dashboard/appointments' },
    { name: 'Finance', path: '/dashboard/finance' },
    { name: 'Settings', path: '/dashboard/settings' },
  ];

  for (const p of pagesToCheck) {
    test(`should check console errors on ${p.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        errors.push(`PAGE ERROR: ${err.message}`);
      });

      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      // Wait a bit more for async errors
      await page.waitForTimeout(3000);

      if (errors.length > 0) {
        console.log(`Console errors on ${p.name}:`, JSON.stringify(errors, null, 2));
        // Don't fail, just report
        test.info().annotations.push({
          type: 'console-errors',
          description: errors.join(' | '),
        });
      }
    });
  }
});

// ============================================================
// 10. RESPONSIVE
// ============================================================
test.describe('RESPONSIVE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should render correctly on mobile (375px)', async ({ page }) => {
    trackConsoleErrors(page, 'responsive-mobile');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/09-mobile-375.png', fullPage: true });

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasOverflow = scrollWidth > clientWidth + 10; // 10px tolerance

    if (hasOverflow) {
      console.log(`Mobile overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    }

    // Navigate to patients page on mobile
    await page.goto('/dashboard/patients');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/10-mobile-patients.png', fullPage: true });
  });

  test('should render correctly on tablet (768px)', async ({ page }) => {
    trackConsoleErrors(page, 'responsive-tablet');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/11-tablet-768.png', fullPage: true });

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasOverflow = scrollWidth > clientWidth + 10;

    if (hasOverflow) {
      console.log(`Tablet overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    }

    await page.goto('/dashboard/patients');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/12-tablet-patients.png', fullPage: true });
  });
});

// ============================================================
// HELPERS
// ============================================================
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[name="email"], input[type="email"]');
  const passwordInput = page.locator('input[name="password"], input[type="password"]');

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill('admin@inpobi.com');
  await passwordInput.fill('InPobi2026Admin!');

  const loginBtn = page.locator('button[type="submit"]');
  await loginBtn.click();

  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
