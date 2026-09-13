/**
 * 通过JS直接点击Dock按钮，绕过Playwright visibility检�?
 */
import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3080";
const TOKEN = "h35JSdsccDTN3dH576QGUO2-cwg56eZFZrzTfFknzus";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

try {
  console.log("=== 1. 访问DSH ===");
  await page.goto(`${BASE_URL}/?token=${TOKEN}`);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "tests/screenshots/dock_step1.png", fullPage: false });

  console.log("\n=== 2. 查找Dock按钮 ===");
  const dockInfo = await page.evaluate(() => {
    const root = document.getElementById("aq-floating-root");
    if (!root) return { error: "aq-floating-root not found" };
    
    // 获取所有直接子元素
    const children = Array.from(root.children);
    const results = children.map((child, i) => ({
      index: i,
      tagName: child.tagName,
      style: {
        position: child.style.position,
        visibility: child.style.visibility,
        opacity: child.style.opacity,
        zIndex: child.style.zIndex,
        display: child.style.display,
      },
      rect: child.getBoundingClientRect(),
      innerHTML: child.innerHTML.slice(0, 300),
    }));
    
    // 查找Dock按钮（第二个子元素通常是Dock按钮容器�?
    const dockContainer = children.find(c => 
      c.style.position === "fixed" && 
      (c.style.zIndex === "90" || c.style.zIndex === "80")
    );
    
    return {
      childCount: children.length,
      children: results,
      dockFound: !!dockContainer,
      dockRect: dockContainer ? dockContainer.getBoundingClientRect() : null,
    };
  });
  console.log("Dock信息:", JSON.stringify(dockInfo, null, 2));

  console.log("\n=== 3. 通过JS点击Dock按钮 ===");
  await page.evaluate(() => {
    const root = document.getElementById("aq-floating-root");
    const children = Array.from(root.children);
    // Dock按钮容器：position:fixed, zIndex:90 (boardOpen=false�?
    const dockContainer = children.find(c => 
      c.style.position === "fixed" && c.style.zIndex === "90"
    );
    if (dockContainer) {
      const btn = dockContainer.querySelector("button");
      if (btn) {
        // 模拟mousedown然后mouseup来触发toggle
        const down = new MouseEvent("mousedown", { bubbles: true, button: 0 });
        btn.dispatchEvent(down);
        const up = new MouseEvent("mouseup", { bubbles: true, button: 0 });
        btn.dispatchEvent(up);
        return { clicked: true, buttonText: btn.innerText, title: btn.title };
      }
      return { clicked: false, reason: "no button found" };
    }
    return { clicked: false, reason: "dock container not found" };
  });
  console.log("已触发点击事�?);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "tests/screenshots/dock_step2_clicked.png", fullPage: false });
  console.log("点击后截图已保存");

  console.log("\n=== 4. 检查看板是否打开 ===");
  const boardState = await page.evaluate(() => {
    const root = document.getElementById("aq-floating-root");
    const children = Array.from(root.children);
    // 看板容器：position:fixed, inset:0, zIndex:92
    const boardContainer = children.find(c => {
      const s = c.style;
      return s.position === "fixed" && s.inset === "0px" && s.zIndex === "92";
    });
    if (!boardContainer) return { found: false };
    return {
      found: true,
      visibility: boardContainer.style.visibility,
      opacity: boardContainer.style.opacity,
      innerText: boardContainer.innerText.slice(0, 500),
    };
  });
  console.log("看板状�?", JSON.stringify(boardState, null, 2));

  if (boardState.found) {
    console.log("\n=== 5. 检查看板内�?===");
    const contentCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasWorkstation: text.includes("Workstation") || text.includes("任务队列"),
        hasNewTask: text.includes("新建任务") || text.includes("新建"),
        hasTasks: text.includes("运行�?) || text.includes("待执�?),
      };
    });
    console.log("内容检�?", contentCheck);
  }

  console.log("\n=== 测试完成 ===");
} catch (e) {
  console.error("错误:", e.message);
  await page.screenshot({ path: "tests/screenshots/dock_error.png", fullPage: false });
} finally {
  await browser.close();
}
