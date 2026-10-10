/* ============ app state ============ */
const state = {
  screen:'home',        // home | class | student | attendanceHistory | spin | profile | reminders
  classSearch:'',
  studentSearch:'',
  studentFilter:'all',
  screenAnimDir:null,    // for home<->reminders swipe entrance animation
  calHighlightDay:null,  // day to briefly flash-highlight in the calendar "events" tab
  classTab:'students',  // students | homework | attendance
  classId:null,
  studentId:null,
  attHistDate:null,
  spinSelected:{},       // classId -> bool
  spinBag:[],
  spinAll:[],
  spinPoolKey:'',
  spinHistory:[],
  spinSkipAbsent:true,
  spinWinner:null,
  spinning:false,
  spinMode:'normal',     // normal | oral
  reminderClassId:null,
  reminderPickDay:null,
  reminderPickMonth:null,
  reminderPickYear:null,
  calJY:null,
  calJM:null,
  calGY:null,
  calGM:null,
  calAnimDir:null,
  calTab:'calendar'
};

const FOLDER_COLORS = ['#e7b94e','#7cc9a0','#e2785f','#7fb2c9','#c99ee2','#e29ecb'];
function colorForIndex(i){ return FOLDER_COLORS[i % FOLDER_COLORS.length]; }
function initials(name){ return escapeHtml((name||'?').trim().slice(0,1)); }
