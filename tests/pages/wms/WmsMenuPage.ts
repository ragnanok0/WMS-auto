import { Page, expect } from '@playwright/test';
 
export class WmsMenuPage {
  readonly page: Page;
 
  constructor(page: Page) {
    this.page = page;
  }
 
  async goToInboundExpected() {
    console.log('[2단계] 입고예정 메뉴 이동 중...');
    await this.expandMenu('입고');
    await this.expandMenu('입고예정');
    await this.selectLeafMenu('입고예정');
    console.log('[2단계] 입고예정 메뉴 이동 완료 ✓');
  }
 
  async goToInboundConfirmPage() {
    console.log('[3단계] 입고확정 메뉴 이동 중...');
    await this.goToInboundConfirm();
    console.log('[3단계] 입고확정 메뉴 이동 완료 ✓');
  }
 
  async expandMenu(menuName: string) {
    const menuPanel = this.page.locator('#wmsMenuPanel_header');
    const classAttr = await menuPanel.getAttribute('class');
 
    if (classAttr && classAttr.includes('x-collapsed')) {
      await menuPanel.click();
      await this.page.waitForTimeout(1000);
    }
 
    const parentMenu = this.page.locator('div.x-grid-cell-inner', {
      hasText: menuName,
      has: this.page.locator('.x-tree-expander')
    }).filter({ visible: true }).last();
 
    const expander = parentMenu.locator('.x-tree-expander');
    const className = await expander.getAttribute('class');
 
    if (className && className.includes('plus')) {
      await expander.click();
      await this.page.waitForTimeout(600);
    }
  }
 
  async selectLeafMenu(menuName: string) {
    const leafMenu = this.page.locator('div.x-grid-cell-inner')
      .filter({ hasText: new RegExp(`^${menuName}$`) })
      .filter({ has: this.page.locator('.x-tree-icon-leaf') })
      .first();
 
    try {
      await leafMenu.waitFor({ state: 'visible', timeout: 10000 });
      await leafMenu.click({ force: true });
      await this.page.waitForTimeout(500);
    } catch (e) {
      console.log(`[경고] 메뉴 '${menuName}' 일반 클릭 실패, 재시도 중...`);
      await this.page.getByRole('treeitem').getByText(menuName, { exact: true }).click();
    }
  }
 
  async goToInboundConfirm() {
    await this.expandMenu('입고작업');
    await this.selectLeafMenu('입고확정');
  }
 
  async goToPalletizingMenu() {
    console.log('[4단계] 적치 메뉴 이동 중...');
    const menuRoot = this.page.locator('#wmsMenuPanel-body');
 
    const parent = menuRoot
      .locator('.x-tree-node-text')
      .filter({ hasText: '적치' })
      .first();
 
    await parent.click({ force: true });
    await this.page.waitForTimeout(800);
 
    const leaf = menuRoot
      .locator('.x-tree-node-text')
      .filter({ hasText: '적치' })
      .nth(1);
 
    await leaf.waitFor({ state: 'visible' });
    await leaf.click({ force: true });
    console.log('[4단계] 적치 메뉴 이동 완료 ✓');
  }
}
