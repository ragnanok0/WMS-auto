import { Page, Frame, expect } from '@playwright/test';
import { StorageType, WMS_CONFIG } from '../../fixtures/baseFixtures';
 
export class WmsInboundConfirmPage {
  readonly page: Page;
 
  constructor(page: Page) {
    this.page = page;
  }
 
  async confirmInbound(inboundNo: string, date: string, storage: StorageType): Promise<string> {
    return await this.searchInbound(inboundNo, date, storage);
  }
 
  async searchInbound(inboundNo: string, date: string, storage: StorageType) {
    console.log(`[3단계] 입고번호(${inboundNo}) 확정 처리 시작...`);
 
    const config = WMS_CONFIG[storage];
    const frame = await this.waitForInboundFrame();
    if (!frame) throw new Error('frame 없음');
 
    // 센터 및 화주사 선택
    await this.selectCenter(frame, config.center);
    await this.page.waitForTimeout(500);
    await this.selectShipper(frame, config.shipper);
 
    // 조회 조건 입력
    await frame.locator('input[name="INB_ECT_DATE"]').nth(0).fill(date);
    await frame.locator('input[name="INB_ECT_DATE"]').nth(1).fill(date);
    await frame.locator('input[name="INB_NO"]').fill(inboundNo);
 
    console.log(`[3단계] 입고번호 조회 중...`);
    await frame.locator('a.x-btn')
      .filter({ hasText: '조회' })
      .first()
      .click({ force: true });
 
    await this.waitForGrid(frame);
 
    // 행 선택 및 수량 입력
    const row = frame.locator('.x-grid-item')
      .filter({ has: frame.getByText(inboundNo) })
      .first();
 
    await row.waitFor({ state: 'visible' });
    await row.locator('.x-grid-checkcolumn').first().click({ force: true });
 
    console.log(`[3단계] 선검수 수량 입력 중...`);
    const qtyCell = row.locator('[data-columnid="INSPCT_QTY"]');
    await qtyCell.dblclick();
 
    const editor = frame.locator('.x-editor input');
    await editor.fill('1000');
    await editor.press('Tab');
 
    // 선검수 버튼 클릭 및 팝업 처리
    console.log(`[3단계] 선검수 처리 중...`);
    await frame.locator('#grid01Button1').click({ force: true });
    await this.handlePopup(frame, '예');
    await this.handlePopup(frame, '확인');
 
    await this.waitForGrid(frame);
    await frame.waitForTimeout(500);
 
    // 확정 처리
    const row2 = frame.locator('.x-grid-item')
      .filter({ has: frame.getByText(inboundNo) })
      .first();
 
    await row2.waitFor({ state: 'visible' });
    await row2.locator('.x-grid-checkcolumn').first().click({ force: true });
 
    // 상품코드 추출
    const itemCdCell = row2.locator('td[data-columnid="ITEM_CD"]');
    await itemCdCell.waitFor({ state: 'visible' });
 
    const itemCd = await itemCdCell.evaluate((el) => {
      return el.querySelector('.x-grid-cell-inner')?.textContent?.trim() || '';
    });
    console.log(`[3단계] 기준재고(상품코드) 추출 완료 ✓ (${itemCd})`);
 
    // 확정 버튼 클릭
    console.log(`[3단계] 입고 확정 처리 중...`);
    await frame.locator('#grid01Button2').click({ force: true });
    await this.handleConfirmPopupFlow(frame);
 
    await this.waitForGrid(frame);
    console.log(`[3단계] 입고 확정 완료 ✓`);
 
    return itemCd;
  }
 
  private async handlePopup(scope: Page | Frame, buttonText: string) {
    const popup = scope.locator('.x-message-box.x-window:visible').last();
    await popup.waitFor({ state: 'visible', timeout: 15000 });
 
    const btn = popup.locator('a.x-btn:visible')
      .filter({ hasText: buttonText })
      .first();
 
    await btn.click({ force: true });
  }
 
  private async handleConfirmPopupFlow(scope: Page | Frame) {
    const popup1 = scope.locator('.x-message-box.x-window:visible').last();
    await popup1.waitFor({ state: 'visible', timeout: 15000 });
 
    const yesBtn = popup1.locator('a.x-btn:visible')
      .filter({ hasText: '예' })
      .first();
    await yesBtn.click({ force: true });
 
    const popup2 = scope.locator('.x-message-box.x-window:visible').last();
    await popup2.waitFor({ state: 'visible', timeout: 15000 });
 
    const okBtn = popup2.locator('a.x-btn:visible')
      .filter({ hasText: '확인' })
      .first();
    await okBtn.click({ force: true });
  }
 
  private async waitForGrid(frame: Frame) {
    await frame.locator('.x-mask, .x-mask-loading')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
  }
 
  private async selectCenter(frame: Frame, value: string) {
    const input = frame.locator('input[name="WH_CD"]');
    await input.click();
 
    const pickerItem = frame.locator('.x-boundlist-item').filter({ hasText: value }).first();
    await pickerItem.waitFor({ state: 'attached', timeout: 5000 });
    await pickerItem.dispatchEvent('click');
  }
 
  private async selectShipper(frame: Frame, value: string) {
    const input = frame.locator('input[name="STRR_ID"]');
    await input.click();
 
    const pickerItem = frame.locator('.x-boundlist-item').filter({ hasText: new RegExp(`^${value}$`) }).first();
    await pickerItem.waitFor({ state: 'attached', timeout: 5000 });
    await pickerItem.dispatchEvent('click');
  }
 
  private async waitForInboundFrame(): Promise<Frame | null> {
    for (let i = 0; i < 20; i++) {
      for (const f of this.page.frames()) {
        try {
          if (await f.locator('input[name="STRR_ID"]').count() > 0) {
            return f;
          }
        } catch {}
      }
      await this.page.waitForTimeout(500);
    }
    return null;
  }
 
  async getItemCode(): Promise<string> {
    const frame = await this.waitForInboundFrame();
    if (!frame) throw new Error('frame 없음');
 
    const mask = frame.locator('.x-mask, .x-mask-loading');
    await mask.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
 
    const row = frame.locator('.x-grid-item')
      .filter({ hasText: /4573|inbound/i })
      .first();
 
    await expect(row).toBeVisible({ timeout: 15000 });
 
    const itemCdCell = row.locator('td[data-columnid="ITEM_CD"]');
    const value = await itemCdCell.evaluate((el) => {
      return el.querySelector('.x-grid-cell-inner')?.textContent?.trim() || '';
    });
 
    return value;
  }
}
