/* V19.2 — spatial swipe and unified calendar guidance. */
(function(){
  const dictionaries={
    fa:{calendar_swipe_hint:'برای رفتن بین ماه‌ها، تقویم را به چپ یا راست بکشید.'},
    en:{calendar_swipe_hint:'Swipe the calendar left or right to move between months.'},
    fr:{calendar_swipe_hint:'Balayez le calendrier à gauche ou à droite pour changer de mois.'},
    tr:{calendar_swipe_hint:'Aylar arasında geçmek için takvimi sola veya sağa kaydırın.'},
    it:{calendar_swipe_hint:'Scorri il calendario a sinistra o a destra per cambiare mese.'},
    zh:{calendar_swipe_hint:'左右滑动日历即可切换月份。'}
  };
  for(const [lang,dict] of Object.entries(dictionaries))Object.assign(I18N[lang],dict);
})();
