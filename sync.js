/* =====================================================================
   sync.js
   -----------------------------------------------------------------
   لایه‌ی هماهنگ‌سازی بین ذخیره‌سازی محلی (IndexedDB/localStorage که
   در خودِ index.html تعریف شده) و Firestore.
   استراتژی: "جدیدترین برنده است" (last-write-wins) بر اساس timestamp.
   - cloudPull(): آخرین نسخه‌ی ذخیره‌شده روی Firestore رو برمی‌گردونه.
   - cloudPush(json): با debounce (برای جلوگیری از نوشتن‌های زیاد)
     نسخه‌ی فعلی رو روی Firestore ذخیره می‌کنه.
   این دو تابع در index.html داخل loadData()/saveData() صدا زده می‌شن.
   ===================================================================== */

const CLOUD_DEBOUNCE_MS = 1500;
let __pushTimer = null;
let __pendingPayload = null;

async function cloudPull() {
  if (!window.__currentUser) return null;
  try {
    const snap = await db.collection('users').doc(window.__currentUser.uid).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (!d || !d.data) return null;
    return {
      json: d.data,
      updatedAt: d.updatedAt ? d.updatedAt.toMillis() : 0,
    };
  } catch (e) {
    console.warn('cloudPull failed:', e);
    return null;
  }
}

function cloudPush(jsonStr) {
  if (!window.__currentUser) return;
  __pendingPayload = jsonStr;
  if (__pushTimer) clearTimeout(__pushTimer);
  __pushTimer = setTimeout(async () => {
    const payload = __pendingPayload;
    __pendingPayload = null;
    if (!payload) return;
    try {
      await db.collection('users').doc(window.__currentUser.uid).set(
        {
          data: payload,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      setSyncIndicator('synced');
    } catch (e) {
      console.warn('cloudPush failed (will retry on next save):', e);
      setSyncIndicator('error');
    }
  }, CLOUD_DEBOUNCE_MS);
}

// یه نشونگر کوچیک وضعیت سینک (اختیاری، اگه در UI باشه آپدیتش می‌کنیم)
function setSyncIndicator(state) {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  const map = {
    synced: { text: '✓ ذخیره شد', color: '#4caf50' },
    saving: { text: '… در حال ذخیره', color: '#d4af37' },
    error: { text: '⚠ خطا در سینک', color: '#e05656' },
    offline: { text: '⚡ آفلاین', color: '#9aa3b2' },
  };
  const s = map[state] || map.offline;
  el.textContent = s.text;
  el.style.color = s.color;
}

window.addEventListener('online', () => setSyncIndicator('synced'));
window.addEventListener('offline', () => setSyncIndicator('offline'));

window.cloudPull = cloudPull;
window.cloudPush = cloudPush;
