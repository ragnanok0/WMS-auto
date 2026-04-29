import { test, expect, StorageType } from './fixtures/baseFixtures';
import dotenv from 'dotenv';

dotenv.config();

const targetDate = process.env.targetDate ?? '';
const storage = (process.env.storage as StorageType) ?? '상온';

test('WMS 입고 프로세스: 예정 조회 및 확정 이동 테스트', async ({ wmsLogin, wmsMenu, inboundPage, inboundConfirmPage, palletizingpage, page }) => {
  console.log('==========================================');
  console.log('[테스트 시작] WMS 입고 프로세스');
  console.log(`- 입고 예정일: ${targetDate}`);
  console.log(`- 보관 유형: ${storage}`);
  console.log('==========================================');

  // 1. 로그인
  await wmsLogin.login();

  // 2. 입고예정 메뉴 이동 및 초기 조회
  await wmsMenu.goToInboundExpected();
  await inboundPage.searchInboundAndGetNo(targetDate, storage);

  // 3. 반복 처리 시작
  let processCount = 0;
  while (true) {
    const inboundNo = await inboundPage.getInboundNumber();

    if (!inboundNo) {
      console.log('[종료] 처리할 데이터가 더 이상 없습니다. 테스트를 종료합니다.');
      break;
    }

    processCount++;
    console.log(`------------------------------------------`);
    console.log(`[${processCount}번째 처리] 입고번호: ${inboundNo}`);

    // 입고확정 처리
    await wmsMenu.goToInboundConfirmPage();
    const itemCd = await inboundConfirmPage.confirmInbound(inboundNo, targetDate, storage);

    // 적치 처리
    await wmsMenu.goToPalletizingMenu();
    await palletizingpage.execute(itemCd, storage);

    console.log(`[${processCount}번째 완료] 입고번호: ${inboundNo} 처리 완료 ✓`);

    // 다음 데이터를 위한 화면 초기화 및 재조회
    await page.reload();
    await page.waitForTimeout(500);
    await wmsMenu.goToInboundExpected();
    await inboundPage.searchInboundAndGetNo(targetDate, storage);
    await page.waitForTimeout(500);
  }

  console.log('==========================================');
  console.log(`[최종 완료] 총 ${processCount}건 처리 완료`);
  console.log('==========================================');
});
