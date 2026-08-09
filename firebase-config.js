/* =====================================================================
   firebase-config.js
   -----------------------------------------------------------------
   اینجا فقط تنظیمات پروژه‌ی Firebase قرار می‌گیره.
   بعد از ساختن پروژه در Firebase Console، مقادیر زیر رو با مقادیر
   واقعی پروژه‌ی خودت جایگزین کن (Project Settings > General > Your apps).
   این مقادیر «سری» نیستن و امنیتی محسوب نمی‌شن؛ امنیت واقعی با
   Firestore Security Rules (فایل firestore.rules) تأمین می‌شه.
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyCFIH5LWdcKFHo-lAoKg78a2T4KzVTea5c",
  authDomain: "classbook-b7ce9.firebaseapp.com",
  projectId: "classbook-b7ce9",
  storageBucket: "classbook-b7ce9.firebasestorage.app",
  messagingSenderId: "330214041782",
  appId: "1:330214041782:web:764331503905e470331e17"
};

firebase.initializeApp(firebaseConfig);

// فعال‌سازی حالت آفلاین‌فرست Firestore: داده‌ها روی دستگاه هم کش می‌شن
// و وقتی اینترنت نبود، اپ همچنان کار می‌کنه و بعداً خودکار سینک می‌شه.
firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('چند تب باز است؛ persistence فقط در یک تب فعال می‌شود.');
  } else if (err.code === 'unimplemented') {
    console.warn('این مرورگر از حالت آفلاین Firestore پشتیبانی نمی‌کند.');
  }
});

const auth = firebase.auth();
const db = firebase.firestore();
