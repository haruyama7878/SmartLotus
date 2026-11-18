import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = "C:\\Users\\dungs\\.gemini\\antigravity\\brain\\508b0c6e-ad22-4975-a322-62ada21c3732";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mouseClick(page, element, description = "") {
  console.log(`🖱️ [Chuột] Di chuyển và click: ${description}`);
  const box = await element.boundingBox();
  if (!box) {
    console.warn(`⚠️ Bounding box không tìm thấy cho: ${description}, fallback click DOM`);
    await element.click();
    return;
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 12 });
  await delay(120);
  await page.mouse.down();
  await delay(100);
  await page.mouse.up();
  await delay(350);
}

async function main() {
  console.log("============================================================");
  console.log("🎒 ĐÓNG VAI HỌC SINH: TỪ TẠO TÀI KHOẢN ĐẾN LÀM BÀI ĐẦU TIÊN");
  console.log("============================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Mở trình duyệt Chrome thật
    defaultViewport: { width: 1280, height: 860 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,860',
      '--window-position=50,50'
    ]
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  try {
    // BƯỚC 1: Truy cập Smart Lotus
    console.log("\n🌐 [Bước 1] Mở ứng dụng Smart Lotus tại http://localhost:3000 ...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
    await delay(1200);

    const step1Path = path.join(ARTIFACT_DIR, "student_step1_landing.png");
    await page.screenshot({ path: step1Path });
    console.log(`📸 [Ảnh 1] Màn hình đăng nhập/đăng ký ban đầu: ${step1Path}`);

    // BƯỚC 2: Bấm vào tab "Đăng ký"
    console.log("\n👉 [Bước 2] Học sinh dùng chuột bấm vào tab 'Đăng ký'...");
    const switchButtons = await page.$$('.auth-switch button');
    if (switchButtons.length >= 2) {
      await mouseClick(page, switchButtons[1], "Tab 'Đăng ký'");
    }
    await delay(1000);

    const step2Path = path.join(ARTIFACT_DIR, "student_step2_register_mode.png");
    await page.screenshot({ path: step2Path });
    console.log(`📸 [Ảnh 2] Chuyển sang form tạo tài khoản: ${step2Path}`);

    // BƯỚC 3: Chọn đối tượng "Học sinh"
    console.log("\n👤 [Bước 3] Học sinh chọn đối tượng là 'Học sinh'...");
    const roleButtons = await page.$$('.auth-role');
    if (roleButtons.length > 0) {
      await mouseClick(page, roleButtons[0], "Thẻ đối tượng: Học sinh");
    }
    await delay(600);

    // BƯỚC 4: Điền thông tin đăng ký
    console.log("\n✍️ [Bước 4] Điền thông tin cá nhân của học sinh...");
    
    // Họ và Tên
    const nameInputs = await page.$$('.auth-name-fields input');
    if (nameInputs.length >= 2) {
      console.log("✍️ Nhập Họ: 'Vương'...");
      await nameInputs[0].click();
      await nameInputs[0].type("Vương", { delay: 40 });
      await delay(150);

      console.log("✍️ Nhập Tên: 'Xuân Sơn'...");
      await nameInputs[1].click();
      await nameInputs[1].type("Xuân Sơn", { delay: 40 });
      await delay(150);
    }

    // Số điện thoại
    const phoneInput = await page.$('input[placeholder*="09"]');
    if (phoneInput) {
      console.log("📞 Nhập SĐT: '0912345678'...");
      await phoneInput.click();
      await phoneInput.type("0912345678", { delay: 35 });
      await delay(150);
    }

    // Tỉnh/TP, Xã/Phường, Cấp trường
    const geoSelects = await page.$$('.auth-register-grid-3 select');
    if (geoSelects.length >= 3) {
      console.log("📍 Chọn Tỉnh: Thành phố Hà Nội...");
      await geoSelects[0].select("Thành phố Hà Nội");
      await delay(500);

      console.log("📍 Chọn Xã/Phường...");
      await page.waitForFunction((el) => el.options.length > 1, {}, geoSelects[1]);
      const ward = await page.evaluate((el) => el.options[1]?.value || "", geoSelects[1]);
      if (ward) await geoSelects[1].select(ward);
      await delay(500);

      console.log("🏫 Chọn Cấp trường: Tiểu học...");
      await geoSelects[2].select("primary");
      await delay(500);
    }

    // Tên trường
    const schoolSel = await page.$('.auth-school-selection select');
    if (schoolSel) {
      console.log("🏫 Chọn Tên trường...");
      await page.waitForFunction((el) => el.options.length > 1, {}, schoolSel);
      const schoolOption = await page.evaluate((el) => el.options[1]?.value || "__custom__", schoolSel);
      if (schoolOption === "__custom__") {
        await schoolSel.select("__custom__");
        await delay(300);
        const customInput = await page.$('input[placeholder*="tên trường"]');
        if (customInput) await customInput.type("Tiểu học Dịch Vọng A", { delay: 40 });
      } else {
        await schoolSel.select(schoolOption);
      }
      await delay(500);
    }

    // Khối & Lớp
    const classGridSelects = await page.$$('.auth-register-grid:not(.auth-register-grid-3) select');
    if (classGridSelects.length >= 2) {
      console.log("📚 Chọn Khối: Khối 1...");
      await classGridSelects[0].select("Khối 1");
      await delay(500);

      console.log("📚 Chọn Lớp: 1A...");
      await page.waitForFunction((el) => el.options.length > 1, {}, classGridSelects[1]);
      const classOption = await page.evaluate((el) => el.options[1]?.value || "__custom__", classGridSelects[1]);
      if (classOption === "__custom__") {
        await classGridSelects[1].select("__custom__");
        await delay(300);
        const customClass = await page.$('input[placeholder*="tên lớp"]');
        if (customClass) await customClass.type("1A", { delay: 40 });
      } else {
        await classGridSelects[1].select(classOption);
      }
      await delay(500);
    }

    // Ngày sinh (Ngày 15 / Tháng 8 / Năm 2018)
    console.log("🎂 Chọn Ngày sinh: 15 / 08 / 2018...");
    const allGrid3 = await page.$$('.auth-register-grid-3');
    if (allGrid3.length >= 2) {
      const bdaySelects = await allGrid3[1].$$('select');
      if (bdaySelects.length >= 3) {
        await bdaySelects[0].select("15");
        await delay(200);
        await bdaySelects[1].select("8");
        await delay(200);
        await bdaySelects[2].select("2018");
        await delay(200);
        console.log("✅ Đã chọn xong Ngày: 15, Tháng: 8, Năm: 2018");
      }
    }

    // Email & Mật khẩu
    const uniqueEmail = `son.vuong.${Date.now().toString().slice(-5)}@smartlotus.edu.vn`;
    console.log(`📧 Nhập Email mới: ${uniqueEmail}`);
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(uniqueEmail, { delay: 35 });
      await delay(150);
    }

    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log("🔒 Nhập Mật khẩu: 'Hocsinh123456'...");
      await passwordInput.click();
      await passwordInput.type("Hocsinh123456", { delay: 35 });
      await delay(150);
    }

    // Cuộn trang xuống để hiển thị đầy đủ nút bấm
    await page.evaluate(() => window.scrollBy(0, 400));
    await delay(300);

    const step3Path = path.join(ARTIFACT_DIR, "student_step3_filled_form.png");
    await page.screenshot({ path: step3Path });
    console.log(`📸 [Ảnh 3] Form đăng ký đầy đủ thông tin: ${step3Path}`);

    // BƯỚC 5: Bấm "Tạo tài khoản"
    console.log("\n🚀 [Bước 5] Học sinh dùng chuột bấm 'Tạo tài khoản'...");
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await mouseClick(page, submitBtn, "Nút gửi đăng ký");
    }
    await delay(3500);

    // Kiểm tra thông báo hoặc lỗi nếu có
    const statusMsg = await page.evaluate(() => {
      const err = document.querySelector('.auth-error')?.innerText || '';
      const not = document.querySelector('.auth-notice')?.innerText || '';
      return { error: err, notice: not };
    });
    if (statusMsg.error) console.log("⚠️ Thông báo lỗi từ hệ thống:", statusMsg.error);
    if (statusMsg.notice) console.log("ℹ️ Thông báo từ hệ thống:", statusMsg.notice);

    const step4Path = path.join(ARTIFACT_DIR, "student_step4_after_submit.png");
    await page.screenshot({ path: step4Path });
    console.log(`📸 [Ảnh 4] Sau khi tạo tài khoản: ${step4Path}`);

    // BƯỚC 6: Kiểm tra màn hình Khảo sát đầu vào (Onboarding Guide)
    console.log("\n🧭 [Bước 6] Đang tiến vào Màn hình Khảo sát năng lực đầu vào...");
    await delay(3000);
    
    // Tìm nút "Bắt đầu khảo sát đầu vào" bằng text
    const guideBtnHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes("Bắt đầu khảo sát") || b.innerText.includes("Bắt đầu làm bài") || b.innerText.includes("Khảo sát đầu vào"));
    });
    
    let guideBtn = guideBtnHandle ? guideBtnHandle.asElement() : null;

    if (guideBtn) {
      const step5GuidePath = path.join(ARTIFACT_DIR, "student_step5_onboarding_guide.png");
      await page.screenshot({ path: step5GuidePath });
      console.log(`📸 [Ảnh 5] Màn hình Hướng dẫn Khảo sát đầu vào: ${step5GuidePath}`);

      console.log("👉 Học sinh click chuột vào: 'Bắt đầu khảo sát đầu vào'...");
      await mouseClick(page, guideBtn, "Nút 'Bắt đầu khảo sát đầu vào'");
      console.log("⏳ Đang đợi hệ thống AI nạp và sinh bộ đề khảo sát năng lực (tối đa 30s)...");
    }

    // BƯỚC 7: Màn hình Làm bài toán đầu tiên (Placement Survey / Quiz)
    console.log("\n📝 [Bước 7] Chờ màn hình bài tập toán học xuất hiện...");
    await page.waitForSelector('.tt-quiz', { timeout: 45000 });
    await delay(1500);

    const step6QuizPath = path.join(ARTIFACT_DIR, "student_step6_first_question.png");
    await page.screenshot({ path: step6QuizPath });
    console.log(`📸 [Ảnh 6] Màn hình Câu hỏi toán học đầu tiên: ${step6QuizPath}`);

    // Đọc thông tin đề bài và các phương án
    const questionData = await page.evaluate(() => {
      const promptEl = document.querySelector('.tt-question, .quiz-prompt, h2');
      const diffEl = document.querySelector('.tt-level, .difficulty-badge, .tt-meta-pill');
      const optionEls = Array.from(document.querySelectorAll('.tt-option'));
      return {
        difficulty: diffEl ? diffEl.innerText.trim() : "Level A · Cơ bản",
        prompt: promptEl ? promptEl.innerText.trim() : "Đề bài câu số 1",
        options: optionEls.map(o => o.innerText.trim().replace(/\n/g, ' '))
      };
    });

    console.log(`\n============================================================`);
    console.log(`🎯 CÂU HỎI ĐẦU TIÊN CỦA HỌC SINH:`);
    console.log(`   Độ khó: ${questionData.difficulty}`);
    console.log(`   Đề bài: ${questionData.prompt}`);
    console.log(`   Các phương án lựa chọn:`);
    questionData.options.forEach((opt, idx) => {
      console.log(`     [${idx + 1}] ${opt}`);
    });
    console.log(`============================================================\n`);

    // BƯỚC 8: Học sinh dùng chuột chọn đáp án
    const optionElements = await page.$$('.tt-option');
    if (optionElements.length > 0) {
      console.log("🖱️ [Bước 8] Học sinh suy nghĩ và di chuyển chuột bấm chọn phương án...");
      const chosenOption = optionElements[0];
      await mouseClick(page, chosenOption, `Phương án: "${questionData.options[0] || 'Lựa chọn đầu tiên'}"`);
      await delay(1200);

      const step7SelectedPath = path.join(ARTIFACT_DIR, "student_step7_option_selected.png");
      await page.screenshot({ path: step7SelectedPath });
      console.log(`📸 [Ảnh 7] Đã chọn đáp án (hiệu ứng viền phát sáng): ${step7SelectedPath}`);

      // BƯỚC 9: Bấm nút nộp bài / Câu tiếp theo
      console.log("\n⚡ [Bước 9] Học sinh click nút 'KIỂM TRA' / 'CÂU TIẾP THEO'...");
      const checkBtn = await page.$('.tt-quiz-footer button, button.primary-button');
      if (checkBtn) {
        await mouseClick(page, checkBtn, "Nút nộp câu trả lời / Câu tiếp theo");
        await delay(2500);

        const step8FeedbackPath = path.join(ARTIFACT_DIR, "student_step8_answer_feedback.png");
        await page.screenshot({ path: step8FeedbackPath });
        console.log(`📸 [Ảnh 8] Màn hình hiển thị kết quả kiểm tra & lời giải: ${step8FeedbackPath}`);
      }
    }

    console.log("\n============================================================");
    console.log("🎉 HỌC SINH ĐÃ HOÀN THÀNH XUẤT SẮC TỪ TẠO TÀI KHOẢN ĐẾN CÂU HỎI ĐẦU TIÊN!");
    console.log("============================================================");

  } catch (error) {
    console.error("❌ Xảy ra lỗi trong kịch bản:", error);
    const errPath = path.join(ARTIFACT_DIR, "student_error.png");
    await page.screenshot({ path: errPath }).catch(() => {});
  } finally {
    await delay(4000);
    await browser.close();
  }
}

main();
