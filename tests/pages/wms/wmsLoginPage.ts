import { Page, Locator, expect } from '@playwright/test';
 
export class WmsLoginPage {
  readonly page: Page;
  readonly idInput: Locator;
  readonly pwInput: Locator;
  readonly loginBtn: Locator;
  readonly wmsMenuHeader: Locator;
  readonly wmsMenuText: Locator;
 
  constructor(page: Page) {
    this.page = page;
    this.idInput = page.locator('input[name="USERID"]');
    this.pwInput = page.locator('input[name="PASSWORD"]');
    this.loginBtn = page.locator('span:has-text("로그인"), button:has-text("로그인")');
    this.wmsMenuHeader = page.locator('#wmsMenuPanel_header');
    this.wmsMenuText = page.locator('#wmsMenuPanel_header-title-textEl');
  }
 
  async login(
    userId: string = process.env.WMS_USER_ID || '',
    userPw: string = process.env.WMS_USER_PW || ''
  ) {
        const wmsUrl = process.env.WMS_URL || '';
 
    console.log('[1단계] WMS 로그인 페이지 접속 중...');
    await this.page.goto(wmsUrl, { waitUntil: 'networkidle' });
 
    console.log('[1단계] 계정 정보 입력 중...');
    await this.idInput.waitFor({ state: 'visible' });
    await this.idInput.fill(userId);
    await this.pwInput.fill(userPw);
    await this.pwInput.press('Enter');
 
    await this.page.waitForLoadState('networkidle');
    console.log('[1단계] WMS 로그인 완료 ✓');
  }
 
  async selectWmsMenu() {
    await expect(this.wmsMenuHeader).toBeVisible({ timeout: 10000 });
    await this.wmsMenuHeader.click();
    console.log('[1단계] WMS 메뉴 패널 열기 완료 ✓');
  }
}
