/* =====================================================================
   auth.js
   -----------------------------------------------------------------
   ورود/ثبت‌نام با ایمیل (Firebase Email Link — ورود بدون رمز عبور).
   مرحله ۱: کاربر ایمیل و شماره موبایلش رو می‌نویسه ->
            یک لینک ورود به ایمیلش ارسال می‌شه.
   مرحله ۲: کاربر روی لینک ایمیل‌شده کلیک می‌کنه -> وارد اپ می‌شه
            و شماره موبایلش توی پروفایلش (Firestore) ذخیره می‌شه.
   تا وقتی کاربر وارد نشده، صفحه‌ی اصلی اپ نمایش داده نمی‌شه.
   ===================================================================== */

let __resolveAuthReady;
window.__authReady = new Promise((resolve) => { __resolveAuthReady = resolve; });
window.__currentUser = null;

const PENDING_EMAIL_KEY = 'classbook_pending_email';
const PENDING_PHONE_KEY = 'classbook_pending_phone';

function normalizeAuthDigits(str) {
  const fa = '۰۱۲۳۴۵۶۷۸۹', ar = '٠١٢٣٤٥٦٧٨٩';
  return String(str == null ? '' : str).replace(/[۰-۹٠-٩]/g, (d) => {
    let i = fa.indexOf(d); if (i > -1) return String(i);
    i = ar.indexOf(d); if (i > -1) return String(i);
    return d;
  });
}

// شماره‌ی ورودی کاربر (مثلاً 0912xxxxxxx یا 912xxxxxxx) رو به فرمت
// بین‌المللی +989xxxxxxxxx تبدیل می‌کنه (فقط برای ذخیره‌سازی، بدون تایید پیامکی)
function toE164(localNumber) {
  let n = normalizeAuthDigits(localNumber).replace(/[^\d]/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (n.startsWith('98')) n = n.slice(2);
  return '+98' + n;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidIranPhone(raw) {
  const digits = normalizeAuthDigits(raw).replace(/\D/g, '');
  // 0912xxxxxxx (11 رقم با صفر) یا 912xxxxxxx (10 رقم) یا با 98
  return /^(0?9\d{9}|989\d{9})$/.test(digits);
}

function buildAuthScreen() {
  const wrap = document.createElement('div');
  wrap.id = 'authScreen';
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center;
    background:#0f1115; font-family:inherit; direction:rtl; padding:20px; box-sizing:border-box;
  `;
  wrap.innerHTML = `
    <div style="width:100%; max-width:360px; background:#181b22; border-radius:18px; padding:28px 22px; box-shadow:0 10px 40px rgba(0,0,0,.4);">
      <h2 style="color:#fff; text-align:center; margin:0 0 4px; font-size:20px;">دفتر کلاس</h2>
      <p id="authSubtitle" style="color:#9aa3b2; text-align:center; margin:0 0 20px; font-size:13px;">برای دسترسی به اطلاعاتت از هر دستگاه، با ایمیلت وارد شو</p>

      <div id="authError" style="display:none; background:#3a1e1e; color:#ff8a8a; border-radius:10px; padding:8px 12px; font-size:12px; margin-bottom:12px;"></div>

      <!-- مرحله ۱: گرفتن ایمیل و شماره موبایل -->
      <div id="emailStep">
        <label style="display:block; color:#9aa3b2; font-size:12px; margin-bottom:6px;">ایمیل</label>
        <input id="authEmail" type="email" placeholder="example@email.com" dir="ltr" style="width:100%; box-sizing:border-box; padding:12px 14px; border-radius:10px; border:1px solid #2b2f3a; background:#0f1115; color:#fff; font-size:14px; margin-bottom:14px;" />

        <label style="display:block; color:#9aa3b2; font-size:12px; margin-bottom:6px;">شماره موبایل</label>
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <div style="flex:0 0 auto; display:flex; align-items:center; padding:0 12px; border-radius:10px; border:1px solid #2b2f3a; background:#0f1115; color:#9aa3b2; font-size:14px;">+98</div>
          <input id="authPhone" type="tel" inputmode="numeric" placeholder="۰۹۱۲۳۴۵۶۷۸۹" style="flex:1; min-width:0; box-sizing:border-box; padding:12px 14px; border-radius:10px; border:1px solid #2b2f3a; background:#0f1115; color:#fff; font-size:14px;" />
        </div>

        <button id="sendLinkBtn" style="width:100%; padding:12px; border:none; border-radius:10px; background:#d4af37; color:#1a1a1a; font-weight:700; font-size:14px; cursor:pointer;">ارسال لینک ورود</button>
      </div>

      <!-- مرحله ۲: پیام «ایمیلتو چک کن» -->
      <div id="sentStep" style="display:none; text-align:center;">
        <p style="color:#fff; font-size:14px; margin:0 0 8px;">یک لینک ورود به آدرس زیر ارسال شد:</p>
        <p id="sentToEmail" style="color:#d4af37; font-size:14px; margin:0 0 16px; direction:ltr;"></p>
        <p style="color:#9aa3b2; font-size:12.5px; margin:0 0 16px;">ایمیلت رو باز کن و روی لینک کلیک کن تا وارد اپ بشی. اگه توی اینباکس نبود، پوشه‌ی اسپم رو هم چک کن.</p>
        <button id="backToEmailBtn" style="width:100%; padding:10px; border:none; background:transparent; color:#9aa3b2; font-size:13px; cursor:pointer;">تغییر ایمیل / ارسال دوباره</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const emailInput = wrap.querySelector('#authEmail');
  const phoneInput = wrap.querySelector('#authPhone');
  const errorBox = wrap.querySelector('#authError');
  const emailStep = wrap.querySelector('#emailStep');
  const sentStep = wrap.querySelector('#sentStep');
  const sendLinkBtn = wrap.querySelector('#sendLinkBtn');
  const sentToEmail = wrap.querySelector('#sentToEmail');
  const backToEmailBtn = wrap.querySelector('#backToEmailBtn');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
  function clearError() {
    errorBox.style.display = 'none';
  }

  sendLinkBtn.addEventListener('click', async () => {
    clearError();
    const email = emailInput.value.trim();
    const rawPhone = phoneInput.value.trim();

    if (!isValidEmail(email)) {
      showError('یه ایمیل معتبر بنویس');
      return;
    }
    if (!isValidIranPhone(rawPhone)) {
      showError('یه شماره موبایل معتبر بنویس');
      return;
    }
    const phone = toE164(rawPhone);

    sendLinkBtn.disabled = true;
    sendLinkBtn.textContent = '... در حال ارسال';
    try {
      const actionCodeSettings = {
        url: window.location.href.split('#')[0].split('?')[0],
        handleCodeInApp: true,
      };
      await auth.sendSignInLinkToEmail(email, actionCodeSettings);
      window.localStorage.setItem(PENDING_EMAIL_KEY, email);
      window.localStorage.setItem(PENDING_PHONE_KEY, phone);
      sentToEmail.textContent = email;
      emailStep.style.display = 'none';
      sentStep.style.display = 'block';
    } catch (e) {
      showError(mapAuthError(e));
    } finally {
      sendLinkBtn.disabled = false;
      sendLinkBtn.textContent = 'ارسال لینک ورود';
    }
  });

  backToEmailBtn.addEventListener('click', () => {
    clearError();
    sentStep.style.display = 'none';
    emailStep.style.display = 'block';
  });

  return wrap;
}

function mapAuthError(e) {
  const map = {
    'auth/invalid-email': 'ایمیل معتبر نیست',
    'auth/missing-android-pkg-name': 'خطای تنظیمات',
    'auth/quota-exceeded': 'ظرفیت ارسال تموم شده، بعداً امتحان کن',
    'auth/network-request-failed': 'مشکل در اتصال اینترنت',
    'auth/invalid-action-code': 'لینک نامعتبر یا منقضی شده — دوباره درخواست بده',
    'auth/expired-action-code': 'لینک منقضی شده — دوباره درخواست بده',
  };
  return map[e.code] || ('خطا: ' + (e.message || 'مشکلی پیش اومد'));
}

// ذخیره‌ی شماره موبایل توی پروفایل کاربر در Firestore (فقط یک‌بار، بعد از اولین ورود)
async function savePhoneToProfile(user, phone) {
  if (!phone) return;
  try {
    await db.collection('users').doc(user.uid).set({
      phone: phone,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('ذخیره‌ی شماره موبایل با خطا مواجه شد:', e);
  }
}

// اگه صفحه از طریق لینک ایمیل باز شده، ورود رو کامل می‌کنه
async function completeEmailLinkSignInIfNeeded() {
  if (!auth.isSignInWithEmailLink(window.location.href)) return;

  let email = window.localStorage.getItem(PENDING_EMAIL_KEY);
  const phone = window.localStorage.getItem(PENDING_PHONE_KEY);

  if (!email) {
    // کاربر لینک رو روی دستگاه/مرورگر دیگه‌ای باز کرده؛ ازش ایمیل رو دوباره می‌پرسیم
    email = window.prompt('برای تکمیل ورود، ایمیلت رو دوباره وارد کن:');
  }
  if (!email) return;

  try {
    const result = await auth.signInWithEmailLink(email, window.location.href);
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    window.localStorage.removeItem(PENDING_PHONE_KEY);
    if (phone) await savePhoneToProfile(result.user, phone);
    // آدرس رو تمیز می‌کنیم تا لینک دوباره استفاده نشه
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (e) {
    console.warn('تکمیل ورود از طریق لینک ایمیل با خطا مواجه شد:', e);
  }
}

let authScreenEl = null;

completeEmailLinkSignInIfNeeded().finally(() => {
  auth.onAuthStateChanged((user) => {
    window.__currentUser = user;
    if (user) {
      if (authScreenEl) { authScreenEl.remove(); authScreenEl = null; }
      __resolveAuthReady(user);
      document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
    } else {
      if (!authScreenEl) authScreenEl = buildAuthScreen();
    }
  });
});

function signOutUser() {
  auth.signOut();
}
window.signOutUser = signOutUser;
