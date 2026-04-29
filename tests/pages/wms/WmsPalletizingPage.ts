import { Page, FrameLocator, expect } from '@playwright/test';
import { StorageType, WMS_CONFIG } from '../../fixtures/baseFixtures';
 
export class WmsPalletizingPage {
  readonly page: Page;
  readonly frame: FrameLocator;
 
  constructor(page: Page) {
    this.page = page;
    this.frame = page.frameLocator('#main_tab_3_iframe');
  }
 
  async execute(itemCode: string, storage: StorageType) {
    const config = WMS_CONFIG[storage];
 
    console.log(`[4단계] 적치 작업 시작 (상품코드: ${itemCode})...`);
    await this.frame.locator('.x-mask').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
 
    console.log('[4단계] 조회 조건 설정 중...');
    await this.selectCenter(config.center);
    await this.page.waitForTimeout(500);
    await this.selectSeller(config.shipper);
    await this.enterItem(itemCode);
    await this.search();
 
    console.log('[4단계] 대상 행 선택 중...');
    await this.selectFirstRow();
 
    console.log('[4단계] 추천 셀 조회 및 승인 처리 중...');
    await this.handleRecommendCellFlow();
 
    console.log('[4단계] 적치 확정 처리 중...');
    await this.clickPutaway();
  }
 
  private async selectCenter(value: string) {
    const input = this.frame.locator('input[name="WH_CD"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.click({ force: true });
 
    const boundItem = this.frame.locator('.x-boundlist-item').filter({ hasText: value }).first();
 
    try {
      await boundItem.waitFor({ state: 'visible', timeout: 5000 });
      await boundItem.click({ force: true });
    } catch (e) {
      console.log(`[경고] 센터 리스트 미표시, 재시도 중...`);
      await input.click({ force: true });
      await boundItem.click({ force: true });
    }
 
    console.log(`[4단계] 센터 선택 완료 ✓ (${value})`);
  }
 
  async selectSeller(value: string) {
    const input = this.frame.locator('input[name="STRR_ID"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.click({ force: true });
 
    const boundItem = this.frame.locator('.x-boundlist-item').filter({ hasText: new RegExp(`^${value}$`) }).first();
 
    try {
      await boundItem.waitFor({ state: 'attached', timeout: 5000 });
      await boundItem.dispatchEvent('click');
    } catch (e) {
      console.log(`[경고] 화주사 리스트 미표시, 재시도 중...`);
      await input.click({ force: true });
      await this.page.waitForTimeout(500);
      await boundItem.dispatchEvent('click');
    }
 
    console.log(`[4단계] 화주사 선택 완료 ✓ (${value})`);
  }
 
  async enterItem(itemCode: string) {
    await this.frame.locator('#textfield-1040-inputEl').fill(itemCode);
  }
 
  async search() {
    await this.frame.locator('#perPcsButton0').click({ force: true });
 
    await expect.poll(async () => {
      return await this.frame.locator('.x-grid-item').count();
    }).toBeGreaterThan(0);
 
    console.log('[4단계] 상품 조회 완료 ✓');
  }
 
  async selectFirstRow() {
    const row = this.frame.locator('.x-grid-item').first();
    await row.click({ force: true });
 
    await expect.poll(async () => {
      return await row.evaluate(el => el.classList.contains('x-grid-item-selected'));
    }).toBeTruthy();
  }
 
  async handleRecommendCellFlow() {
    const row = this.frame.locator('.x-grid-item').first();
    await row.click({ force: true });
 
    const recommendBtn = this.frame.locator('a.x-btn').filter({ hasText: '추천 셀 조회' }).first();
    await expect(recommendBtn).toBeVisible({ timeout: 5000 });
    await recommendBtn.click({ force: true });
 
    await this.waitForPopup();
    await this.handleInspectionFlow();
 
    console.log('[4단계] 추천 셀 조회 완료 ✓');
  }
 
  async waitForPopup() {
    const popup = this.frame.locator('.x-message-box, .x-window').first();
 
    await expect.poll(async () => {
      return await popup.isVisible();
    }, {
      timeout: 10000,
      message: '추천 셀 조회 클릭 후 팝업창이 10초 이내에 나타나지 않았습니다.'
    }).toBeTruthy();
  }
 
  private async handleInspectionFlow() {
    const questionBox = this.frame.locator('.x-message-box').first();
    await questionBox.waitFor({ state: 'visible', timeout: 7000 });
 
    const yesButton = questionBox.locator('span.x-btn-inner').filter({ hasText: /^예$/ });
    if (await yesButton.isVisible()) {
      await yesButton.click({ force: true });
    }
 
    const successMsg = this.frame.locator('.x-window-text').filter({ hasText: '요청하신 작업을 완료하였습니다.' });
    await successMsg.waitFor({ state: 'visible', timeout: 7000 });
 
    const okButton = this.frame.locator('.x-message-box').locator('span.x-btn-inner').filter({ hasText: /^확인$/ });
    await okButton.click({ force: true });
 
    await questionBox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
 
  async clickPutaway() {
    const putawayBtn = this.frame.locator('a.x-btn').filter({ hasText: '적치' }).first();
    await putawayBtn.click({ force: true });
 
    const questionBox = this.frame.locator('.x-message-box').first();
    const taskCountMsg = questionBox.locator('.x-window-text').filter({ hasText: /작업대상갯수/ });
 
    await taskCountMsg.waitFor({ state: 'visible', timeout: 7000 });
 
    const yesButton = questionBox.locator('span.x-btn-inner').filter({ hasText: /^예$/ });
    if (await yesButton.isVisible()) {
      await yesButton.click({ force: true });
    }
 
    const successMsg = this.frame.locator('.x-window-text').filter({ hasText: '요청하신 작업을 완료하였습니다.' });
 
    try {
      await successMsg.waitFor({ state: 'visible', timeout: 10000 });
      const okButton = this.frame.locator('.x-message-box').locator('span.x-btn-inner').filter({ hasText: /^확인$/ });
      await okButton.click({ force: true });
      console.log('[4단계] 적치 프로세스 최종 완료 ✓');
    } catch (e) {
      console.log('[경고] 완료 메시지가 나타나지 않았거나 이미 닫혔습니다.');
    }
 
    await questionBox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}
