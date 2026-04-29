import { Page, FrameLocator, expect } from '@playwright/test';
import { StorageType, WMS_CONFIG } from '../../fixtures/baseFixtures';
 
export class WmsInboundPage {
  readonly page: Page;
  readonly frame: FrameLocator;
 
  constructor(page: Page) {
    this.page = page;
    this.frame = page.frameLocator('iframe[src*="asnMgmt.jsp"]').first();
  }
 
  async searchInboundAndGetNo(date: string, storage: StorageType): Promise<string | null> {
    const config = WMS_CONFIG[storage];
    const soUserId = process.env.SO_USER_ID || '';
 
    console.log('[2단계] 입고예정 조회 조건 설정 중...');
    await this.selectCenterCode(config.center);
    await this.page.waitForTimeout(500);
    await this.selectSellerCode(config.shipper);
    await this.setInboundExpectedDate(date);
    await this.selectBoundList('입고예정(조정됨)');
 
    console.log('[2단계] 입고예정 목록 조회 중...');
    await this.searchInboundList(soUserId);
 
    return await this.getInboundNumber();
  }
 
  async selectCenterCode(targetText: string) {
    const inputField = this.frame.locator('input[name="A.WH_CD"]');
    await inputField.waitFor({ state: 'visible', timeout: 15000 });
 
    const comboTrigger = this.frame.locator('.x-form-trigger-wrap').filter({ has: inputField }).locator('.x-form-arrow-trigger');
    await comboTrigger.click();
 
    const pickerItem = this.frame.locator('.x-boundlist-item', { hasText: targetText }).first();
    await expect(pickerItem).toBeVisible({ timeout: 5000 });
    await pickerItem.click();
 
    console.log(`[2단계] 센터코드 '${targetText}' 선택 완료 ✓`);
  }
 
  async selectSellerCode(targetText: string) {
    const inputField = this.frame.locator('input[name="A.STRR_ID"]');
    await inputField.waitFor({ state: 'visible', timeout: 15000 });
 
    const comboTrigger = this.frame.locator('.x-form-trigger-wrap').filter({ has: inputField }).locator('.x-form-arrow-trigger');
    await comboTrigger.click();
 
    const pickerItem = this.frame.locator('.x-boundlist-item').filter({ hasText: new RegExp(`^${targetText}$`) }).first();
    await pickerItem.waitFor({ state: 'attached', timeout: 5000 });
    await pickerItem.dispatchEvent('click');
 
    console.log(`[2단계] 화주사코드 '${targetText}' 선택 완료 ✓`);
  }
 
  async setInboundExpectedDate(date: string) {
    const dateInputFrom = this.frame.locator('input[name="INB_ECT_DATE"]').first();
    const dateInputTo = this.frame.locator('input[name="INB_ECT_DATE"]').last();
 
    await expect(dateInputFrom).toBeVisible({ timeout: 10000 });
    await dateInputFrom.click();
    await dateInputFrom.fill(date);
    await dateInputFrom.press('Enter');
 
    await expect(dateInputTo).toBeVisible({ timeout: 10000 });
    await dateInputTo.click();
    await dateInputTo.fill(date);
    await dateInputTo.press('Enter');
 
    await this.page.keyboard.press('Escape');
    console.log(`[2단계] 입고예정일 '${date}' 설정 완료 ✓`);
  }
 
  async selectBoundList(targetText: string) {
    const frame = await this.page.frame({ url: /asnMgmt\.jsp/ });
    if (!frame) throw new Error('frame 못 찾음');
 
    await frame.evaluate((text) => {
      const Ext = (window as any).Ext;
      const combo = Ext.ComponentQuery.query('combo[name=INB_SCD]')[0];
      const store = combo.getStore();
      combo.expand();
      const field = combo.displayField;
      const record = store.findRecord(field, text);
      if (record) {
        combo.select(record);
        combo.fireEvent('select', combo, [record]);
      } else {
        throw new Error(`값 못 찾음: ${text}`);
      }
    }, targetText);
  }
 
  async searchInboundList(supplierId: string) {
    const supplierInput = this.frame.locator('input[name="SUPPR_ID"]');
    await expect(supplierInput).toBeVisible({ timeout: 10000 });
    await supplierInput.click();
    await supplierInput.fill(supplierId);
    await supplierInput.press('Enter');
 
    const searchBtn = this.frame.locator('#asnHeaderButton0');
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();
 
    await this.frame.locator('.x-grid-item')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
 
    console.log(`[2단계] 조회 완료 ✓`);
  }
 
  async getInboundNumber(): Promise<string | null> {
    await this.frame.locator('.x-mask, .x-mask-loading')
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
 
    const rows = this.frame.locator('.x-grid-item');
    const rowCount = await rows.count();
 
    if (rowCount === 0) {
      console.log('[종료] 조회 결과가 0건입니다.');
      return null;
    }
 
    const firstRow = rows.first();
    const inboundNoCell = firstRow.locator('td[data-columnid="INB_NO"] .x-grid-cell-inner');
 
    try {
      await expect(async () => {
        const text = await inboundNoCell.innerText();
        expect(text.trim()).toMatch(/[a-zA-Z0-9]/);
      }).toPass({ timeout: 5000 });
 
      const inboundNo = (await inboundNoCell.innerText()).trim();
      console.log(`[2단계] 입고번호 추출 완료 ✓ (${inboundNo})`);
      return inboundNo;
    } catch (error) {
      console.log('[경고] 행은 존재하나 입고번호 텍스트가 비어있습니다.');
      return null;
    }
  }
 
  async hasInboundData(): Promise<boolean> {
    const rowCount = await this.frame.locator('.x-grid-item').count();
 
    if (rowCount === 0) {
      console.log('[정보] 조회된 데이터 행이 없습니다 (count: 0).');
      return false;
    }
 
    const firstRowInboundNo = this.frame
      .locator('.x-grid-item')
      .first()
      .locator('td[data-columnid="INB_NO"] .x-grid-cell-inner');
 
    const text = await firstRowInboundNo.innerText();
    const hasData = text.trim().length > 0;
 
    if (!hasData) {
      console.log('[정보] 행은 존재하지만 실제 데이터(입고번호)가 없습니다.');
    }
 
    return hasData;
  }
}
