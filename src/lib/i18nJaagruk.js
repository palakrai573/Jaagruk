// UI strings for the Jaagruk feature set, merged into the main dictionary by
// i18n.js. Kept in a separate module so the original file stays readable and so
// coverage for the new surface area can be measured independently.
//
// COVERAGE POLICY, stated honestly:
//   en  — complete, source of truth
//   hi  — complete. Hindi is one of the two languages the problem statement
//         names explicitly, so partial Hindi is not acceptable.
//   sat — Santali (Ol Chiki) on navigation, actions and safety-critical drill
//         content. Written by a non-native speaker as a starting point and NOT
//         verified. Requires review by a native speaker before deployment.
//   bn / or / ur — navigation, actions and hazard reporting. Deeper settings and
//         admin copy falls back to English rather than shipping machine
//         translation of safety instructions.
//
// Any key missing a language falls back to English at lookup time, so the UI
// never shows a raw key. `newStringCoverage()` reports the real numbers, which
// is what drives the in-app "translation in progress" notice.

/* ================================================================== */
/* Shell, navigation and shared actions                                */
/* ================================================================== */

const SHELL = {
  app_name: { en: 'JAAGRUK', hi: 'जागरुक', sat: 'ᱡᱟᱜᱨᱩᱠ', bn: 'জাগরুক', or: 'ଜାଗରୁକ', ur: 'جاگروک' },
  app_tagline: {
    en: 'Safety Training & Certification',
    hi: 'सुरक्षा प्रशिक्षण एवं प्रमाणन',
    sat: 'ᱨᱠᱷᱟ ᱛᱟᱞᱤᱢ',
    bn: 'নিরাপত্তা প্রশিক্ষণ ও সার্টিফিকেশন',
    or: 'ସୁରକ୍ଷା ତାଲିମ ଓ ପ୍ରମାଣପତ୍ର',
    ur: 'حفاظتی تربیت اور سرٹیفیکیشن',
  },

  nav_buddy: { en: 'Buddy Drill', hi: 'बडी ड्रिल', sat: 'ᱡᱚᱲᱟᱣ ᱛᱟᱞᱤᱢ', bn: 'বাডি ড্রিল', or: 'ବଡି ଡ୍ରିଲ', ur: 'بڈی ڈرل' },
  nav_report: { en: 'Report Hazard', hi: 'खतरा रिपोर्ट', sat: 'ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ', bn: 'বিপদ রিপোর্ট', or: 'ବିପଦ ରିପୋର୍ଟ', ur: 'خطرہ رپورٹ' },
  nav_refresher: { en: 'Refresher', hi: 'रिफ्रेशर', sat: 'ᱫᱳᱦᱲᱟ ᱛᱟᱞᱤᱢ', bn: 'রিফ্রেশার', or: 'ରିଫ୍ରେସର', ur: 'ریفریشر' },
  nav_site: { en: 'Site Setup', hi: 'साइट सेटअप', sat: 'ᱴᱷᱟᱶ ᱥᱟᱡᱟᱣ', bn: 'সাইট সেটআপ', or: 'ସାଇଟ ସେଟଅପ', ur: 'سائٹ سیٹ اپ' },
  nav_start: { en: 'Sign In', hi: 'साइन इन', sat: 'ᱵᱳᱞᱚ', bn: 'সাইন ইন', or: 'ସାଇନ ଇନ', ur: 'سائن ان' },

  more_label: { en: 'More', hi: 'अधिक', sat: 'ᱟᱨᱦᱚ', bn: 'আরও', or: 'ଅଧିକ', ur: 'مزید' },
  close_label: { en: 'Close', hi: 'बंद करें', sat: 'ᱵᱚᱸᱫᱚᱭ', bn: 'বন্ধ করুন', or: 'ବନ୍ଦ କରନ୍ତୁ', ur: 'بند کریں' },
  cancel_label: { en: 'Cancel', hi: 'रद्द करें', sat: 'ᱵᱟᱹᱰᱨᱟᱹ', bn: 'বাতিল', or: 'ବାତିଲ', ur: 'منسوخ' },
  delete_label: { en: 'Delete', hi: 'हटाएं', sat: 'ᱜᱷᱟᱹᱴᱟᱣ', bn: 'মুছুন', or: 'ବିଲୋପ', ur: 'حذف کریں' },
  rename_label: { en: 'Rename', hi: 'नाम बदलें', sat: 'ᱧᱩᱛᱩᱢ ᱵᱚᱫᱚᱞ', bn: 'নাম বদলান', or: 'ନାମ ବଦଳାନ୍ତୁ', ur: 'نام بدلیں' },
  clear_label: { en: 'Clear', hi: 'साफ़ करें', sat: 'ᱯᱷᱟᱹᱨᱪᱟ', bn: 'মুছুন', or: 'ସଫା କରନ୍ତୁ', ur: 'صاف کریں' },
  trust_label: { en: 'Trust this signer', hi: 'इस हस्ताक्षरकर्ता पर भरोसा करें', sat: 'ᱱᱚᱶᱟ ᱥᱩᱦᱤ ᱠᱚ ᱯᱟᱛᱭᱟᱣ', bn: 'এই স্বাক্ষরকারীকে বিশ্বাস করুন', or: 'ଏହି ସ୍ୱାକ୍ଷରକାରୀଙ୍କୁ ବିଶ୍ୱାସ କରନ୍ତୁ', ur: 'اس دستخط کنندہ پر بھروسہ کریں' },
  trust_skip_label: { en: 'Import without trusting', hi: 'भरोसा किए बिना आयात करें', sat: 'ᱵᱟᱝ ᱯᱟᱛᱭᱟᱣ ᱠᱟᱛᱮ ᱟᱹᱜᱩ', bn: 'বিশ্বাস না করে আমদানি করুন', or: 'ବିଶ୍ୱାସ ନକରି ଆମଦାନୀ କରନ୍ତୁ', ur: 'بھروسہ کیے بغیر درآمد کریں' },
  site_zone_renamed: { en: 'Zone renamed', hi: 'ज़ोन का नाम बदला', sat: 'ᱡᱚᱱ ᱧᱩᱛᱩᱢ ᱵᱚᱫᱚᱞ ᱮᱱᱟ', bn: 'জোনের নাম বদলেছে', or: 'ଜୋନ ନାମ ବଦଳିଲା', ur: 'زون کا نام بدل گیا' },
  site_zone_deleted: { en: 'Zone deleted', hi: 'ज़ोन हटाया गया', sat: 'ᱡᱚᱱ ᱜᱷᱟᱹᱴᱟᱣ ᱮᱱᱟ', bn: 'জোন মুছে গেছে', or: 'ଜୋନ ବିଲୋପ ହେଲା', ur: 'زون حذف ہو گیا' },
  dash_log_cleared: { en: 'Activity log cleared', hi: 'गतिविधि लॉग साफ़ हुआ', sat: 'ᱠᱟᱹᱢᱤ ᱞᱚᱜ ᱯᱷᱟᱹᱨᱪᱟ ᱮᱱᱟ', bn: 'কার্যকলাপ লগ মুছেছে', or: 'କାର୍ଯ୍ୟକଳାପ ଲଗ ସଫା ହେଲା', ur: 'سرگرمی لاگ صاف ہو گیا' },
  save_label: { en: 'Save', hi: 'सहेजें', sat: 'ᱥᱟᱸᱪᱟᱣ', bn: 'সংরক্ষণ', or: 'ସେଭ କରନ୍ତୁ', ur: 'محفوظ کریں' },
  back_label: { en: 'Back', hi: 'पीछे', sat: 'ᱛᱟᱭᱚᱢ', bn: 'পিছনে', or: 'ପଛକୁ', ur: 'واپس' },
  next_label: { en: 'Next', hi: 'आगे', sat: 'ᱟᱶᱜᱟ', bn: 'পরবর্তী', or: 'ପରବର୍ତ୍ତୀ', ur: 'اگلا' },
  done_label: { en: 'Done', hi: 'पूर्ण', sat: 'ᱦᱩᱭ ᱮᱱᱟ', bn: 'সম্পন্ন', or: 'ସମାପ୍ତ', ur: 'مکمل' },
  retry_label: { en: 'Try again', hi: 'फिर कोशिश करें', sat: 'ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ', bn: 'আবার চেষ্টা করুন', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ', ur: 'دوبارہ کوشش کریں' },
  error_label: { en: 'Something went wrong', hi: 'कुछ गलत हुआ', sat: 'ᱚᱠᱟ ᱦᱚᱸ ᱵᱷᱩᱞ ᱦᱩᱭ ᱮᱱᱟ', bn: 'কিছু ভুল হয়েছে', or: 'କିଛି ଭୁଲ ହେଲା', ur: 'کچھ غلط ہو گیا' },
  not_found_label: { en: 'Not found', hi: 'नहीं मिला', sat: 'ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ', bn: 'পাওয়া যায়নি', or: 'ମିଳିଲା ନାହିଁ', ur: 'نہیں ملا' },
  scan_again_label: { en: 'Scan another', hi: 'दूसरा स्कैन करें', sat: 'ᱮᱴᱟᱜ ᱥᱠᱮᱱ', bn: 'আরেকটি স্ক্যান', or: 'ଅନ୍ୟ ସ୍କାନ', ur: 'دوسرا اسکین کریں' },
  loading_label: { en: 'Loading…', hi: 'लोड हो रहा है…', sat: 'ᱞᱟᱫᱮᱫ ᱠᱟᱱᱟ…', bn: 'লোড হচ্ছে…', or: 'ଲୋଡ ହେଉଛି…', ur: 'لوڈ ہو رہا ہے…' },
  offline_label: { en: 'Offline', hi: 'ऑफ़लाइन', sat: 'ᱚᱯᱷᱞᱟᱭᱤᱱ', bn: 'অফলাইন', or: 'ଅଫଲାଇନ', ur: 'آف لائن' },

  // Theme. Three states, because a two-state switch cannot express "follow my
  // phone" and silently overrides the OS the first time it is touched.
  // Metric labels. Short by design — these sit under a number in a card, where a
  // full sentence would wrap to three lines on a 320px phone.
  m_readiness: { en: 'Readiness', hi: 'तैयारी', sat: 'ᱛᱮᱭᱟᱨᱤ', bn: 'প্রস্তুতি', or: 'ପ୍ରସ୍ତୁତି', ur: 'تیاری' },
  m_domains: { en: 'Domains passed', hi: 'क्षेत्र पास', sat: 'ᱮᱞᱟᱠᱟ ᱯᱟᱥ', bn: 'ক্ষেত্র উত্তীর্ণ', or: 'କ୍ଷେତ୍ର ପାସ', ur: 'شعبے پاس' },
  m_due: { en: 'Refreshers due', hi: 'रिफ्रेशर बाकी', sat: 'ᱫᱚᱦᱲᱟ ᱛᱟᱞᱤᱢ ᱵᱟᱠᱤ', bn: 'রিফ্রেশার বাকি', or: 'ରିଫ୍ରେସର ବାକି', ur: 'ریفریشر باقی' },
  m_reports: { en: 'Open reports', hi: 'खुली रिपोर्ट', sat: 'ᱡᱷᱤᱡ ᱠᱷᱚᱵᱚᱨ', bn: 'খোলা রিপোর্ট', or: 'ଖୋଲା ରିପୋର୍ଟ', ur: 'کھلی رپورٹیں' },
  m_zones: { en: 'Zones scanned', hi: 'ज़ोन स्कैन', sat: 'ᱡᱚᱱ ᱥᱠᱮᱱ', bn: 'জোন স্ক্যান', or: 'ଜୋନ ସ୍କାନ', ur: 'زون اسکین' },
  m_modules: { en: 'Modules', hi: 'मॉड्यूल', sat: 'ᱢᱚᱰᱩᱞ', bn: 'মডিউল', or: 'ମଡ୍ୟୁଲ', ur: 'ماڈیولز' },
  m_decisions: { en: 'Timed decisions', hi: 'समयबद्ध निर्णय', sat: 'ᱚᱠᱛᱚ ᱮᱢ ᱴᱷᱮᱭᱟᱣ', bn: 'সময়বদ্ধ সিদ্ধান্ত', or: 'ସମୟବଦ୍ଧ ନିଷ୍ପତ୍ତି', ur: 'وقت شدہ فیصلے' },
  m_languages: { en: 'Languages', hi: 'भाषाएं', sat: 'ᱯᱟᱹᱨᱥᱤ ᱠᱚ', bn: 'ভাষা', or: 'ଭାଷା', ur: 'زبانیں' },
  m_anchors: { en: 'Anchors placed', hi: 'एंकर लगाए', sat: 'ᱮᱸᱠᱚᱨ ᱮᱢ', bn: 'অ্যাঙ্কর স্থাপিত', or: 'ଆଙ୍କର ସ୍ଥାପିତ', ur: 'اینکر لگائے' },

  home_your_status: { en: 'Where you stand today', hi: 'आज आपकी स्थिति', sat: 'ᱛᱮᱦᱮᱸ ᱟᱢᱟᱜ ᱡᱟᱭᱜᱟ', bn: 'আজ আপনার অবস্থান', or: 'ଆଜି ଆପଣଙ୍କ ସ୍ଥିତି', ur: 'آج آپ کی حالت' },
  home_status_hint: {
    en: 'Readiness decays if you stop refreshing, so this is today\u2019s figure rather than the day you passed.',
    hi: 'रिफ्रेश न करने पर तैयारी घटती है, इसलिए यह आज का आंकड़ा है, पास होने के दिन का नहीं।',
    sat: 'ᱫᱚᱦᱲᱟ ᱵᱟᱝ ᱛᱟᱞᱤᱢ ᱠᱷᱟᱱ ᱛᱮᱭᱟᱨᱤ ᱠᱚᱢ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
    bn: 'রিফ্রেশ না করলে প্রস্তুতি কমে, তাই এটি আজকের হিসাব — পাস করার দিনের নয়।',
    or: 'ରିଫ୍ରେସ ନକଲେ ପ୍ରସ୍ତୁତି କମେ, ତେଣୁ ଏହା ଆଜିର ହିସାବ।',
    ur: 'ریفریش نہ کرنے پر تیاری کم ہوتی ہے، اس لیے یہ آج کا اعداد و شمار ہے۔',
  },
  home_signed_out_title: { en: 'Two minutes to set up', hi: 'सेट अप में दो मिनट', sat: 'ᱵᱟᱨ ᱢᱤᱱᱤᱴ ᱨᱮ ᱛᱮᱭᱟᱨ', bn: 'সেট আপে দুই মিনিট', or: 'ସେଟ ଅପରେ ଦୁଇ ମିନିଟ', ur: 'سیٹ اپ میں دو منٹ' },
  home_signed_out_body: {
    en: 'Pick your language by hearing it spoken, set a PIN, and start. No email, no account, nothing to remember.',
    hi: 'भाषा सुनकर चुनें, पिन सेट करें, और शुरू करें। कोई ईमेल नहीं, कोई खाता नहीं।',
    sat: 'ᱯᱟᱹᱨᱥᱤ ᱟᱸᱡᱚᱢ ᱠᱟᱛᱮ ᱵᱟᱪᱷᱟᱣ ᱢᱮ, ᱯᱤᱱ ᱮᱢ ᱢᱮ, ᱟᱨ ᱮᱦᱚᱵ ᱢᱮ ᱾',
    bn: 'ভাষা শুনে বেছে নিন, পিন দিন, শুরু করুন। কোনো ইমেল বা অ্যাকাউন্ট নেই।',
    or: 'ଭାଷା ଶୁଣି ବାଛନ୍ତୁ, PIN ଦିଅନ୍ତୁ, ଆରମ୍ଭ କରନ୍ତୁ। କୌଣସି ଇମେଲ ନାହିଁ।',
    ur: 'زبان سن کر منتخب کریں، پن سیٹ کریں، شروع کریں۔ کوئی ای میل یا اکاؤنٹ نہیں۔',
  },
  home_explore: { en: 'Everything in Jaagruk', hi: 'जागरुक में सब कुछ', sat: 'ᱡᱟᱜᱨᱩᱠ ᱨᱮ ᱡᱚᱛᱚ', bn: 'জাগরুকে সবকিছু', or: 'ଜାଗରୁକରେ ସବୁକିଛି', ur: 'جاگروک میں سب کچھ' },
  home_not_certified: { en: 'Not yet certified', hi: 'अभी प्रमाणित नहीं', sat: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱵᱟᱝ', bn: 'এখনও সনদ হয়নি', or: 'ଏପର୍ଯ୍ୟନ୍ତ ପ୍ରମାଣିତ ନୁହେଁ', ur: 'ابھی سرٹیفائیڈ نہیں' },
  home_ready_now: { en: 'Eligible now', hi: 'अभी पात्र', sat: 'ᱱᱤᱛᱚᱜ ᱞᱟᱭᱠᱚ', bn: 'এখনই যোগ্য', or: 'ଏବେ ଯୋଗ୍ୟ', ur: 'ابھی اہل' },
  home_footer_note: {
    en: 'Built for Jharkhand\u2019s mines, steel plants and mica units. Works with the network cable pulled out.',
    hi: 'झारखंड की खदानों, स्टील प्लांट और अभ्रक इकाइयों के लिए। नेटवर्क के बिना भी काम करता है।',
    sat: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱨᱮᱱᱟᱜ ᱠᱷᱟᱰᱟᱱ ᱟᱨ ᱠᱟᱹᱨᱠᱷᱟᱱᱟ ᱞᱟᱹᱜᱤᱫ ᱾ ᱱᱮᱴᱣᱟᱨᱠ ᱵᱟᱝ ᱛᱮ ᱦᱚᱸ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
    bn: 'ঝাড়খণ্ডের খনি, স্টিল প্লান্ট ও অভ্র ইউনিটের জন্য। নেটওয়ার্ক ছাড়াও কাজ করে।',
    or: 'ଝାଡ଼ଖଣ୍ଡର ଖଣି, ଷ୍ଟିଲ ପ୍ଲାଣ୍ଟ ଓ ଅଭ୍ରକ ୟୁନିଟ ପାଇଁ। ନେଟୱର୍କ ବିନା ମଧ୍ୟ କାମ କରେ।',
    ur: 'جھارکھنڈ کی کانوں، اسٹیل پلانٹس اور ابرک یونٹس کے لیے۔ نیٹ ورک کے بغیر بھی کام کرتا ہے۔',
  },

  th_dark: { en: 'Dark', hi: 'गहरा', sat: 'ᱧᱩᱛ', bn: 'গাঢ়', or: 'ଗାଢ଼', ur: 'گہرا' },
  th_light: { en: 'Light', hi: 'हल्का', sat: 'ᱨᱟᱹᱲᱟᱹ', bn: 'হালকা', or: 'ହାଲୁକା', ur: 'ہلکا' },
  th_system: { en: 'Auto', hi: 'स्वतः', sat: 'ᱟᱡᱛᱮ', bn: 'স্বয়ংক্রিয়', or: 'ସ୍ୱୟଂଚାଳିତ', ur: 'خودکار' },
  dismiss_label: { en: 'Dismiss', hi: 'हटाएं', sat: 'ᱚᱰᱚᱠ', bn: 'সরান', or: 'ହଟାନ୍ତୁ', ur: 'ہٹائیں' },
}

/* ================================================================== */
/* Onboarding + identity                                               */
/* ================================================================== */

const IDENTITY = {
  ob_pick_language: { en: 'Choose your language', hi: 'अपनी भाषा चुनें', sat: 'ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ', bn: 'আপনার ভাষা বাছুন', or: 'ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ', ur: 'اپنی زبان منتخب کریں' },
  ob_tap_to_hear: { en: 'Tap a language to hear it', hi: 'सुनने के लिए भाषा पर टैप करें', sat: 'ᱟᱹᱲᱟᱹ ᱟᱸᱡᱚᱢ ᱞᱟᱹᱜᱤᱫ ᱛᱚᱯᱟᱣ', bn: 'শুনতে ভাষায় ট্যাপ করুন', or: 'ଶୁଣିବାକୁ ଭାଷାରେ ଟ୍ୟାପ କରନ୍ତୁ', ur: 'سننے کے لیے زبان پر ٹیپ کریں' },
  ob_who_are_you: { en: 'Who is using this phone?', hi: 'यह फ़ोन कौन इस्तेमाल कर रहा है?', sat: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱚᱠᱚᱭ ᱵᱮᱵᱷᱟᱨ ᱮᱫᱟᱭ?', bn: 'এই ফোন কে ব্যবহার করছেন?', or: 'ଏହି ଫୋନ କିଏ ବ୍ୟବହାର କରୁଛନ୍ତି?', ur: 'یہ فون کون استعمال کر رہا ہے؟' },
  ob_new_worker: { en: 'I am new here', hi: 'मैं नया हूँ', sat: 'ᱤᱧ ᱱᱟᱶᱟ ᱠᱟᱱᱟᱹᱧ', bn: 'আমি নতুন', or: 'ମୁଁ ନୂଆ', ur: 'میں نیا ہوں' },
  ob_existing_worker: { en: 'I have used this before', hi: 'मैंने पहले इस्तेमाल किया है', sat: 'ᱤᱧ ᱢᱟᱲᱟᱝ ᱵᱮᱵᱷᱟᱨ ᱠᱮᱫᱟᱹᱧ', bn: 'আমি আগে ব্যবহার করেছি', or: 'ମୁଁ ପୂର୍ବରୁ ବ୍ୟବହାର କରିଛି', ur: 'میں پہلے استعمال کر چکا ہوں' },
  ob_your_name: { en: 'Your name', hi: 'आपका नाम', sat: 'ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ', bn: 'আপনার নাম', or: 'ଆପଣଙ୍କ ନାମ', ur: 'آپ کا نام' },
  ob_name_placeholder: { en: 'Enter your full name', hi: 'अपना पूरा नाम लिखें', bn: 'আপনার পুরো নাম লিখুন', or: 'ଆପଣଙ୍କ ପୂରା ନାମ ଲେଖନ୍ତୁ', ur: 'اپنا پورا نام لکھیں' },
  ob_phone_optional: { en: 'Phone number (optional)', hi: 'फ़ोन नंबर (वैकल्पिक)', sat: 'ᱯᱷᱚᱱ ᱱᱟᱢᱵᱚᱨ', bn: 'ফোন নম্বর (ঐচ্ছিক)', or: 'ଫୋନ ନମ୍ବର (ବିକଳ୍ପ)', ur: 'فون نمبر (اختیاری)' },
  ob_phone_why: {
    en: 'Only used to find your record on a shared phone. Never sent anywhere.',
    hi: 'साझा फ़ोन पर आपका रिकॉर्ड ढूंढने के लिए ही। कहीं नहीं भेजा जाता।',
    bn: 'শুধু শেয়ার করা ফোনে আপনার রেকর্ড খুঁজতে। কোথাও পাঠানো হয় না।',
    or: 'କେବଳ ସହଭାଗୀ ଫୋନରେ ଆପଣଙ୍କ ରେକର୍ଡ ଖୋଜିବା ପାଇଁ। କେଉଁଠି ପଠାଯାଏ ନାହିଁ।',
    ur: 'صرف مشترکہ فون پر آپ کا ریکارڈ ڈھونڈنے کے لیے۔ کہیں نہیں بھیجا جاتا۔',
  },
  ob_choose_pin: { en: 'Choose a 4-digit PIN', hi: '4 अंकों का पिन चुनें', sat: '4 ᱮᱞ ᱯᱤᱱ ᱵᱟᱪᱷᱟᱣ', bn: '৪ সংখ্যার পিন বাছুন', or: '୪ ଅଙ୍କର PIN ବାଛନ୍ତୁ', ur: '4 ہندسوں کا پن منتخب کریں' },
  ob_confirm_pin: { en: 'Enter the PIN again', hi: 'पिन दोबारा लिखें', sat: 'ᱯᱤᱱ ᱫᱚᱦᱲᱟ ᱚᱞ', bn: 'পিন আবার লিখুন', or: 'PIN ପୁଣି ଲେଖନ୍ତୁ', ur: 'پن دوبارہ لکھیں' },
  ob_pin_why: {
    en: 'Your PIN lets you sign in underground with no signal. It stays on this phone.',
    hi: 'आपका पिन बिना सिग्नल भूमिगत साइन इन करने देता है। यह इसी फ़ोन पर रहता है।',
    bn: 'আপনার পিন সিগন্যাল ছাড়াই ভূগর্ভে সাইন ইন করতে দেয়। এটি এই ফোনেই থাকে।',
    or: 'ଆପଣଙ୍କ PIN ସିଗନାଲ ବିନା ଭୂତଳରେ ସାଇନ ଇନ କରିବାକୁ ଦିଏ। ଏହା ଏହି ଫୋନରେ ରହେ।',
    ur: 'آپ کا پن سگنل کے بغیر زیر زمین سائن ان کرنے دیتا ہے۔ یہ اسی فون پر رہتا ہے۔',
  },
  ob_create_account: { en: 'Create my record', hi: 'मेरा रिकॉर्ड बनाएं', sat: 'ᱤᱧᱟᱜ ᱨᱮᱠᱚᱰ ᱛᱮᱭᱟᱨ', bn: 'আমার রেকর্ড তৈরি করুন', or: 'ମୋ ରେକର୍ଡ ତିଆରି କରନ୍ତୁ', ur: 'میرا ریکارڈ بنائیں' },
  ob_sign_in: { en: 'Sign in', hi: 'साइन इन करें', sat: 'ᱵᱚᱞᱚᱭ ᱢᱮ', bn: 'সাইন ইন করুন', or: 'ସାଇନ ଇନ କରନ୍ତୁ', ur: 'سائن ان کریں' },
  ob_enter_pin: { en: 'Enter your PIN', hi: 'अपना पिन लिखें', sat: 'ᱟᱢᱟᱜ ᱯᱤᱱ ᱚᱞ', bn: 'আপনার পিন লিখুন', or: 'ଆପଣଙ୍କ PIN ଲେଖନ୍ତୁ', ur: 'اپنا پن لکھیں' },
  ob_select_worker: { en: 'Select your name', hi: 'अपना नाम चुनें', sat: 'ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ ᱵᱟᱪᱷᱟᱣ', bn: 'আপনার নাম বাছুন', or: 'ଆପଣଙ୍କ ନାମ ବାଛନ୍ତୁ', ur: 'اپنا نام منتخب کریں' },
  ob_no_workers: { en: 'No one is registered on this phone yet.', hi: 'इस फ़ोन पर अभी कोई पंजीकृत नहीं है।', bn: 'এই ফোনে এখনও কেউ নিবন্ধিত নয়।', or: 'ଏହି ଫୋନରେ ଏପର୍ଯ୍ୟନ୍ତ କେହି ପଞ୍ଜୀକୃତ ନାହାନ୍ତି।', ur: 'اس فون پر ابھی کوئی رجسٹرڈ نہیں ہے۔' },
  ob_signed_in_as: { en: 'Signed in as', hi: 'साइन इन:', sat: 'ᱵᱚᱞᱚ ᱠᱟᱱᱟ:', bn: 'সাইন ইন:', or: 'ସାଇନ ଇନ:', ur: 'سائن ان:' },
  ob_sign_out: { en: 'Sign out', hi: 'साइन आउट', sat: 'ᱵᱟᱦᱨᱮ ᱚᱰᱚᱠ', bn: 'সাইন আউট', or: 'ସାଇନ ଆଉଟ', ur: 'سائن آؤٹ' },
  ob_continue_guest: { en: 'Continue without signing in', hi: 'साइन इन किए बिना जारी रखें', bn: 'সাইন ইন না করে চালিয়ে যান', or: 'ସାଇନ ଇନ ନକରି ଜାରି ରଖନ୍ତୁ', ur: 'سائن ان کیے بغیر جاری رکھیں' },
  ob_guest_note: {
    en: 'You can train without an account, but a certificate needs a named worker record.',
    hi: 'आप बिना खाते के प्रशिक्षण कर सकते हैं, लेकिन प्रमाणपत्र के लिए नामित रिकॉर्ड चाहिए।',
    bn: 'অ্যাকাউন্ট ছাড়া প্রশিক্ষণ নিতে পারেন, তবে সার্টিফিকেটের জন্য নামযুক্ত রেকর্ড দরকার।',
    or: 'ଖାତା ବିନା ତାଲିମ ନେଇପାରିବେ, କିନ୍ତୁ ପ୍ରମାଣପତ୍ର ପାଇଁ ନାମିତ ରେକର୍ଡ ଦରକାର।',
    ur: 'اکاؤنٹ کے بغیر تربیت لے سکتے ہیں، لیکن سرٹیفکیٹ کے لیے نامزد ریکارڈ درکار ہے۔',
  },

  err_NAME_TOO_SHORT: { en: 'Please enter at least 2 characters.', hi: 'कम से कम 2 अक्षर लिखें।', bn: 'অন্তত ২টি অক্ষর লিখুন।', or: 'ଅତିକମରେ ୨ଟି ଅକ୍ଷର ଲେଖନ୍ତୁ।', ur: 'کم از کم 2 حروف لکھیں۔' },
  err_NAME_TOO_LONG: { en: 'That name is too long.', hi: 'यह नाम बहुत लंबा है।', bn: 'নামটি খুব দীর্ঘ।', or: 'ନାମ ବହୁତ ଲମ୍ବା।', ur: 'یہ نام بہت لمبا ہے۔' },
  err_PHONE_INVALID: { en: 'Enter a 10-digit phone number, or leave it blank.', hi: '10 अंकों का नंबर लिखें, या खाली छोड़ दें।', bn: '১০ সংখ্যার নম্বর লিখুন, বা খালি রাখুন।', or: '୧୦ ଅଙ୍କର ନମ୍ବର ଲେଖନ୍ତୁ, କିମ୍ବା ଖାଲି ଛାଡ଼ନ୍ତୁ।', ur: '10 ہندسوں کا نمبر لکھیں، یا خالی چھوڑ دیں۔' },
  err_PIN_FORMAT: { en: 'The PIN must be 4 to 6 digits.', hi: 'पिन 4 से 6 अंकों का होना चाहिए।', bn: 'পিন ৪ থেকে ৬ সংখ্যার হতে হবে।', or: 'PIN ୪ରୁ ୬ ଅଙ୍କର ହେବା ଆବଶ୍ୟକ।', ur: 'پن 4 سے 6 ہندسوں کا ہونا چاہیے۔' },
  err_PIN_TOO_SIMPLE: { en: 'Pick a less obvious PIN — not 1234 or all the same digit.', hi: 'कम स्पष्ट पिन चुनें — 1234 या एक ही अंक नहीं।', bn: 'কম সহজ পিন বাছুন — ১২৩৪ বা একই অঙ্ক নয়।', or: 'କମ ସ୍ପଷ୍ଟ PIN ବାଛନ୍ତୁ — ୧୨୩୪ କିମ୍ବା ସମାନ ଅଙ୍କ ନୁହେଁ।', ur: 'کم واضح پن منتخب کریں — 1234 یا ایک ہی ہندسہ نہیں۔' },
  err_PIN_MISMATCH: { en: 'The two PINs do not match.', hi: 'दोनों पिन मेल नहीं खाते।', bn: 'দুটি পিন মেলে না।', or: 'ଦୁଇଟି PIN ମେଳ ଖାଉନାହିଁ।', ur: 'دونوں پن مماثل نہیں ہیں۔' },
  err_PHONE_TAKEN: { en: 'That phone number is already registered at this site.', hi: 'यह नंबर इस साइट पर पहले से पंजीकृत है।', bn: 'এই নম্বর ইতিমধ্যে এই সাইটে নিবন্ধিত।', or: 'ଏହି ନମ୍ବର ପୂର୍ବରୁ ଏହି ସାଇଟରେ ପଞ୍ଜୀକୃତ।', ur: 'یہ نمبر پہلے ہی اس سائٹ پر رجسٹرڈ ہے۔' },
  err_PIN_WRONG: { en: 'Wrong PIN.', hi: 'गलत पिन।', sat: 'ᱵᱷᱩᱞ ᱯᱤᱱ ᱾', bn: 'ভুল পিন।', or: 'ଭୁଲ PIN।', ur: 'غلط پن۔' },
  err_LOCKED_OUT: { en: 'Too many wrong attempts. Wait before trying again.', hi: 'बहुत बार गलत। फिर कोशिश करने से पहले रुकें।', bn: 'অনেকবার ভুল। আবার চেষ্টার আগে অপেক্ষা করুন।', or: 'ବହୁତ ଥର ଭୁଲ। ପୁଣି ଚେଷ୍ଟା ପୂର୍ବରୁ ଅପେକ୍ଷା କରନ୍ତୁ।', ur: 'بہت بار غلط۔ دوبارہ کوشش سے پہلے انتظار کریں۔' },
  err_WORKER_NOT_FOUND: { en: 'That worker record no longer exists on this phone.', hi: 'यह रिकॉर्ड अब इस फ़ोन पर नहीं है।', bn: 'এই রেকর্ড আর এই ফোনে নেই।', or: 'ଏହି ରେକର୍ଡ ଆଉ ଏହି ଫୋନରେ ନାହିଁ।', ur: 'یہ ریکارڈ اب اس فون پر نہیں ہے۔' },
  err_attempts_left: { en: 'attempts left', hi: 'प्रयास बाकी', bn: 'প্রচেষ্টা বাকি', or: 'ପ୍ରୟାସ ବାକି', ur: 'کوششیں باقی' },
}

/* ================================================================== */
/* AR drill + site setup                                               */
/* ================================================================== */

const AR = {
  ar_starting: { en: 'Starting camera…', hi: 'कैमरा शुरू हो रहा है…', sat: 'ᱠᱮᱢᱨᱟ ᱮᱦᱚᱵ ᱠᱟᱱᱟ…', bn: 'ক্যামেরা চালু হচ্ছে…', or: 'କ୍ୟାମେରା ଆରମ୍ଭ ହେଉଛି…', ur: 'کیمرہ شروع ہو رہا ہے…' },
  ar_unavailable: { en: 'AR view unavailable', hi: 'एआर व्यू उपलब्ध नहीं', sat: 'AR ᱧᱮᱞ ᱵᱟᱝ ᱦᱮᱸᱡᱚᱜ', bn: 'এআর ভিউ অনুপলব্ধ', or: 'AR ଭ୍ୟୁ ଉପଲବ୍ଧ ନାହିଁ', ur: 'اے آر ویو دستیاب نہیں' },
  ar_camera_denied: {
    en: 'Camera permission was refused. Allow camera access in your browser settings to use the AR drill.',
    hi: 'कैमरा अनुमति नहीं मिली। एआर ड्रिल के लिए ब्राउज़र सेटिंग्स में कैमरा अनुमति दें।',
    bn: 'ক্যামেরা অনুমতি দেওয়া হয়নি। এআর ড্রিলের জন্য ব্রাউজার সেটিংসে অনুমতি দিন।',
    or: 'କ୍ୟାମେରା ଅନୁମତି ମିଳିଲା ନାହିଁ। AR ଡ୍ରିଲ ପାଇଁ ବ୍ରାଉଜର ସେଟିଂସରେ ଅନୁମତି ଦିଅନ୍ତୁ।',
    ur: 'کیمرہ اجازت نہیں ملی۔ اے آر ڈرل کے لیے براؤزر سیٹنگز میں اجازت دیں۔',
  },
  ar_camera_missing: { en: 'No camera was found on this device.', hi: 'इस डिवाइस पर कैमरा नहीं मिला।', bn: 'এই ডিভাইসে ক্যামেরা পাওয়া যায়নি।', or: 'ଏହି ଡିଭାଇସରେ କ୍ୟାମେରା ମିଳିଲା ନାହିଁ।', ur: 'اس ڈیوائس پر کیمرہ نہیں ملا۔' },
  ar_camera_in_use: { en: 'The camera is being used by another app. Close it and try again.', hi: 'कैमरा दूसरे ऐप में चल रहा है। उसे बंद करके फिर कोशिश करें।', bn: 'ক্যামেরা অন্য অ্যাপে ব্যবহৃত হচ্ছে। বন্ধ করে আবার চেষ্টা করুন।', or: 'କ୍ୟାମେରା ଅନ୍ୟ ଆପରେ ବ୍ୟବହୃତ ହେଉଛି। ବନ୍ଦ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।', ur: 'کیمرہ دوسری ایپ میں استعمال ہو رہا ہے۔ بند کر کے دوبارہ کوشش کریں۔' },
  ar_camera_unsupported: { en: 'This browser cannot open the camera.', hi: 'यह ब्राउज़र कैमरा नहीं खोल सकता।', bn: 'এই ব্রাউজার ক্যামেরা খুলতে পারে না।', or: 'ଏହି ବ୍ରାଉଜର କ୍ୟାମେରା ଖୋଲିପାରିବ ନାହିଁ।', ur: 'یہ براؤزر کیمرہ نہیں کھول سکتا۔' },
  ar_camera_unknown: { en: 'The camera could not start.', hi: 'कैमरा शुरू नहीं हो सका।', bn: 'ক্যামেরা চালু হতে পারেনি।', or: 'କ୍ୟାମେରା ଆରମ୍ଭ ହୋଇପାରିଲା ନାହିଁ।', ur: 'کیمرہ شروع نہیں ہو سکا۔' },
  ar_retry: { en: 'Retry camera', hi: 'कैमरा फिर आज़माएं', bn: 'ক্যামেরা আবার চেষ্টা', or: 'କ୍ୟାମେରା ପୁଣି', ur: 'کیمرہ دوبارہ' },
  ar_use_3d: { en: 'Use 3D view', hi: '3D व्यू इस्तेमाल करें', sat: '3D ᱧᱮᱞ ᱵᱮᱵᱷᱟᱨ', bn: '3D ভিউ ব্যবহার করুন', or: '3D ଭ୍ୟୁ ବ୍ୟବହାର କରନ୍ତୁ', ur: '3D ویو استعمال کریں' },
  ar_use_ar: { en: 'Use camera AR', hi: 'कैमरा एआर इस्तेमाल करें', sat: 'ᱠᱮᱢᱨᱟ AR ᱵᱮᱵᱷᱟᱨ', bn: 'ক্যামেরা এআর ব্যবহার করুন', or: 'କ୍ୟାମେରା AR ବ୍ୟବହାର କରନ୍ତୁ', ur: 'کیمرہ اے آر استعمال کریں' },
  ar_generic_zone: {
    en: 'This site has not been scanned. Showing a generic layout — ask your supervisor to run Site Setup.',
    hi: 'यह साइट स्कैन नहीं हुई। सामान्य लेआउट दिख रहा है — सुपरवाइज़र से साइट सेटअप कराएं।',
    bn: 'এই সাইট স্ক্যান হয়নি। সাধারণ লেআউট দেখানো হচ্ছে — সুপারভাইজারকে সাইট সেটআপ করতে বলুন।',
    or: 'ଏହି ସାଇଟ ସ୍କାନ ହୋଇନାହିଁ। ସାଧାରଣ ଲେଆଉଟ ଦେଖାଉଛି — ସୁପରଭାଇଜରଙ୍କୁ ସାଇଟ ସେଟଅପ କରିବାକୁ କୁହନ୍ତୁ।',
    ur: 'یہ سائٹ اسکین نہیں ہوئی۔ عام لے آؤٹ دکھایا جا رہا ہے — سپروائزر سے سائٹ سیٹ اپ کروائیں۔',
  },
  ar_permission_title: { en: 'Motion access needed', hi: 'मोशन अनुमति चाहिए', bn: 'মোশন অনুমতি প্রয়োজন', or: 'ମୋଶନ ଅନୁମତି ଆବଶ୍ୟକ', ur: 'موشن اجازت درکار' },
  ar_permission_body: {
    en: 'Jaagruk uses the compass to keep hazard markers pointing at the real thing.',
    hi: 'जागरुक कंपास से खतरा मार्कर को असली जगह पर रखता है।',
    bn: 'জাগরুক কম্পাস দিয়ে বিপদ মার্কার সঠিক জায়গায় রাখে।',
    or: 'ଜାଗରୁକ କମ୍ପାସ ବ୍ୟବହାର କରି ବିପଦ ମାର୍କରକୁ ପ୍ରକୃତ ସ୍ଥାନରେ ରଖେ।',
    ur: 'جاگروک کمپاس سے خطرہ مارکر کو اصل جگہ پر رکھتا ہے۔',
  },
  ar_enable_motion: { en: 'Allow motion access', hi: 'मोशन अनुमति दें', bn: 'মোশন অনুমতি দিন', or: 'ମୋଶନ ଅନୁମତି ଦିଅନ୍ତୁ', ur: 'موشن اجازت دیں' },
  ar_rotate_portrait: { en: 'Hold the phone upright for accurate markers', hi: 'सटीक मार्कर के लिए फ़ोन सीधा रखें', sat: 'ᱯᱷᱚᱱ ᱥᱚᱡᱷᱮ ᱫᱚᱦᱚᱭ ᱢᱮ', bn: 'সঠিক মার্কারের জন্য ফোন সোজা ধরুন', or: 'ସଠିକ ମାର୍କର ପାଇଁ ଫୋନ ସିଧା ଧରନ୍ତୁ', ur: 'درست مارکر کے لیے فون سیدھا رکھیں' },
  ar_relative_heading: {
    en: 'No compass reading — markers may drift. Face the main exit and re-centre.',
    hi: 'कंपास रीडिंग नहीं — मार्कर खिसक सकते हैं। मुख्य निकास की ओर मुड़ें और री-सेंटर करें।',
    bn: 'কম্পাস রিডিং নেই — মার্কার সরে যেতে পারে। মূল প্রস্থানের দিকে ঘুরে রি-সেন্টার করুন।',
    or: 'କମ୍ପାସ ରିଡିଂ ନାହିଁ — ମାର୍କର ଖସିପାରେ। ମୁଖ୍ୟ ନିର୍ଗମ ଆଡ଼କୁ ମୁହାଁଇ ରି-ସେଣ୍ଟର କରନ୍ତୁ।',
    ur: 'کمپاس ریڈنگ نہیں — مارکر ہٹ سکتے ہیں۔ مرکزی راستے کی طرف مڑ کر ری سینٹر کریں۔',
  },
  ar_recentre: { en: 'Re-centre', hi: 'री-सेंटर', sat: 'ᱫᱚᱦᱲᱟ ᱛᱷᱤᱠ', bn: 'রি-সেন্টার', or: 'ରି-ସେଣ୍ଟର', ur: 'ری سینٹر' },
  ar_no_compass_title: { en: 'No motion sensor', hi: 'मोशन सेंसर नहीं', bn: 'মোশন সেন্সর নেই', or: 'ମୋଶନ ସେନସର ନାହିଁ', ur: 'موشن سینسر نہیں' },
  ar_no_compass_body: {
    en: 'This device has no usable compass, so markers cannot be anchored to real directions. The 3D view teaches the same decisions.',
    hi: 'इस डिवाइस में उपयोगी कंपास नहीं है, इसलिए मार्कर असली दिशा से नहीं जुड़ सकते। 3D व्यू वही निर्णय सिखाता है।',
    bn: 'এই ডিভাইসে ব্যবহারযোগ্য কম্পাস নেই, তাই মার্কার সঠিক দিকে বসানো যায় না। 3D ভিউ একই সিদ্ধান্ত শেখায়।',
    or: 'ଏହି ଡିଭାଇସରେ ଉପଯୋଗୀ କମ୍ପାସ ନାହିଁ, ତେଣୁ ମାର୍କର ପ୍ରକୃତ ଦିଗରେ ବସାଯାଇପାରିବ ନାହିଁ। 3D ଭ୍ୟୁ ସେହି ନିଷ୍ପତ୍ତି ଶିଖାଏ।',
    ur: 'اس ڈیوائس میں قابل استعمال کمپاس نہیں، اس لیے مارکر اصل سمت سے نہیں جڑ سکتے۔ 3D ویو وہی فیصلے سکھاتا ہے۔',
  },
  ar_aim_prompt: { en: 'Point the phone at the correct marker and hold', hi: 'फ़ोन सही मार्कर पर रखें और स्थिर रखें', sat: 'ᱯᱷᱚᱱ ᱴᱷᱤᱠ ᱢᱟᱨᱠᱚᱨ ᱛᱮ ᱫᱚᱦᱚᱭ', bn: 'ফোন সঠিক মার্কারে ধরে রাখুন', or: 'ଫୋନ ସଠିକ ମାର୍କର ଉପରେ ଧରି ରଖନ୍ତୁ', ur: 'فون درست مارکر پر رکھ کر تھامیں' },
  ar_turn_around: { en: 'Turn around to find it', hi: 'ढूंढने के लिए घूमें', sat: 'ᱧᱟᱢ ᱞᱟᱹᱜᱤᱫ ᱜᱩᱨᱮᱭ', bn: 'খুঁজতে ঘুরুন', or: 'ଖୋଜିବାକୁ ଘୂରନ୍ତୁ', ur: 'ڈھونڈنے کے لیے گھومیں' },

  anchor_exit: { en: 'Exit', hi: 'निकास', sat: 'ᱚᱰᱚᱠ', bn: 'প্রস্থান', or: 'ନିର୍ଗମ', ur: 'راستہ' },
  anchor_extinguisher: { en: 'Extinguisher', hi: 'अग्निशामक', sat: 'ᱥᱮᱸᱜᱮᱞ ᱦᱩᱭᱩᱠ', bn: 'অগ্নিনির্বাপক', or: 'ଅଗ୍ନିଶମକ', ur: 'آگ بجھانے والا' },
  anchor_assembly: { en: 'Assembly point', hi: 'एकत्रीकरण स्थल', sat: 'ᱡᱟᱨᱣᱟ ᱴᱷᱟᱶ', bn: 'সমাবেশ স্থল', or: 'ସମାବେଶ ସ୍ଥଳ', ur: 'اجتماع کی جگہ' },
  anchor_first_aid: { en: 'First aid', hi: 'प्राथमिक चिकित्सा', sat: 'ᱢᱟᱲᱟᱝ ᱩᱴᱷᱟᱹᱨ', bn: 'প্রাথমিক চিকিৎসা', or: 'ପ୍ରାଥମିକ ଚିକିତ୍ସା', ur: 'ابتدائی طبی امداد' },
  anchor_gas_zone: { en: 'Gas zone', hi: 'गैस क्षेत्र', sat: 'ᱜᱮᱥ ᱡᱟᱭᱜᱟ', bn: 'গ্যাস অঞ্চল', or: 'ଗ୍ୟାସ ଅଞ୍ଚଳ', ur: 'گیس زون' },
  anchor_loto: { en: 'Lockout panel', hi: 'लॉकआउट पैनल', bn: 'লকআউট প্যানেল', or: 'ଲକଆଉଟ ପ୍ୟାନେଲ', ur: 'لاک آؤٹ پینل' },
  anchor_electrical: { en: 'Electrical panel', hi: 'विद्युत पैनल', sat: 'ᱵᱤᱡᱩᱞᱤ ᱯᱟᱱᱮᱞ', bn: 'বৈদ্যুতিক প্যানেল', or: 'ବିଦ୍ୟୁତ ପ୍ୟାନେଲ', ur: 'بجلی پینل' },
  anchor_machine: { en: 'Machine', hi: 'मशीन', sat: 'ᱢᱮᱥᱤᱱ', bn: 'মেশিন', or: 'ମେସିନ', ur: 'مشین' },
  anchor_dust: { en: 'Dust source', hi: 'धूल स्रोत', sat: 'ᱫᱷᱩᱲᱤ ᱡᱟᱭᱜᱟ', bn: 'ধুলোর উৎস', or: 'ଧୂଳି ଉତ୍ସ', ur: 'گرد کا ذریعہ' },
  anchor_hazard: { en: 'Hazard', hi: 'खतरा', sat: 'ᱡᱚᱠᱷᱚᱢ', bn: 'বিপদ', or: 'ବିପଦ', ur: 'خطرہ' },

  site_eyebrow: { en: 'Supervisor', hi: 'सुपरवाइज़र', bn: 'সুপারভাইজার', or: 'ସୁପରଭାଇଜର', ur: 'سپروائزر' },
  site_title: { en: 'Scan your site', hi: 'अपनी साइट स्कैन करें', bn: 'আপনার সাইট স্ক্যান করুন', or: 'ଆପଣଙ୍କ ସାଇଟ ସ୍କାନ କରନ୍ତୁ', ur: 'اپنی سائٹ اسکین کریں' },
  site_desc: {
    en: 'Walk the area once and mark where the exits, extinguishers and hazards really are. Every worker who opens a drill in this zone then sees them in the right direction.',
    hi: 'क्षेत्र में एक बार घूमें और चिह्नित करें कि निकास, अग्निशामक और खतरे वास्तव में कहाँ हैं। इस ज़ोन में ड्रिल खोलने वाला हर श्रमिक उन्हें सही दिशा में देखेगा।',
    bn: 'একবার এলাকা ঘুরে চিহ্নিত করুন প্রস্থান, অগ্নিনির্বাপক ও বিপদ কোথায় আছে। এই জোনে ড্রিল খোলা প্রতিটি কর্মী সেগুলি সঠিক দিকে দেখবে।',
    or: 'ଏକ ଥର ଅଞ୍ଚଳ ବୁଲି ଚିହ୍ନଟ କରନ୍ତୁ ନିର୍ଗମ, ଅଗ୍ନିଶମକ ଓ ବିପଦ କେଉଁଠି ଅଛି। ଏହି ଜୋନରେ ଡ୍ରିଲ ଖୋଲୁଥିବା ପ୍ରତ୍ୟେକ କର୍ମୀ ସେଗୁଡ଼ିକୁ ସଠିକ ଦିଗରେ ଦେଖିବେ।',
    ur: 'ایک بار علاقے کا چکر لگا کر نشان لگائیں کہ راستے، آگ بجھانے والے اور خطرات کہاں ہیں۔ اس زون میں ڈرل کھولنے والا ہر ورکر انہیں درست سمت میں دیکھے گا۔',
  },
  site_name_label: { en: 'Site name', hi: 'साइट का नाम', bn: 'সাইটের নাম', or: 'ସାଇଟ ନାମ', ur: 'سائٹ کا نام' },
  site_zones: { en: 'Zones', hi: 'ज़ोन', bn: 'জোন', or: 'ଜୋନ', ur: 'زون' },
  site_new_zone: { en: 'New zone', hi: 'नया ज़ोन', bn: 'নতুন জোন', or: 'ନୂଆ ଜୋନ', ur: 'نیا زون' },
  site_zone_name_prompt: { en: 'Name this zone (e.g. Shaft Corridor B)', hi: 'इस ज़ोन का नाम (जैसे शाफ्ट कॉरिडोर B)', bn: 'এই জোনের নাম (যেমন শ্যাফট করিডোর B)', or: 'ଏହି ଜୋନର ନାମ', ur: 'اس زون کا نام' },
  site_no_zones: { en: 'No zones yet. Create one to start marking anchors.', hi: 'अभी कोई ज़ोन नहीं। एंकर चिह्नित करने के लिए एक बनाएं।', bn: 'এখনও কোনো জোন নেই। অ্যাঙ্কর চিহ্নিত করতে একটি তৈরি করুন।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଜୋନ ନାହିଁ।', ur: 'ابھی کوئی زون نہیں۔' },
  site_anchors_count: { en: 'markers', hi: 'मार्कर', bn: 'মার্কার', or: 'ମାର୍କର', ur: 'مارکر' },
  site_start_marking: { en: 'Mark anchors', hi: 'एंकर चिह्नित करें', bn: 'অ্যাঙ্কর চিহ্নিত করুন', or: 'ଆଙ୍କର ଚିହ୍ନଟ କରନ୍ତୁ', ur: 'اینکر نشان زد کریں' },
  site_aim_and_tap: { en: 'Aim at the object, then tap what it is', hi: 'वस्तु की ओर करें, फिर बताएं वह क्या है', bn: 'বস্তুর দিকে তাক করে বলুন সেটি কী', or: 'ବସ୍ତୁ ଆଡ଼କୁ ଧରି ଏହା କଣ ତାହା ଦିଅନ୍ତୁ', ur: 'چیز کی طرف کر کے بتائیں وہ کیا ہے' },
  site_marked: { en: 'Marked', hi: 'चिह्नित', bn: 'চিহ্নিত', or: 'ଚିହ୍ନିତ', ur: 'نشان زد' },
  site_delete_zone: { en: 'Delete zone', hi: 'ज़ोन हटाएं', bn: 'জোন মুছুন', or: 'ଜୋନ ଡିଲିଟ କରନ୍ତୁ', ur: 'زون حذف کریں' },
  site_export_scan: { en: 'Share this scan', hi: 'यह स्कैन साझा करें', bn: 'এই স্ক্যান শেয়ার করুন', or: 'ଏହି ସ୍କାନ ସେୟାର କରନ୍ତୁ', ur: 'یہ اسکین شیئر کریں' },
  site_import_scan: { en: 'Load a scan', hi: 'स्कैन लोड करें', bn: 'স্ক্যান লোড করুন', or: 'ସ୍କାନ ଲୋଡ କରନ୍ତୁ', ur: 'اسکین لوڈ کریں' },
  site_import_done: { en: 'Scan loaded', hi: 'स्कैन लोड हो गया', bn: 'স্ক্যান লোড হয়েছে', or: 'ସ୍କାନ ଲୋଡ ହେଲା', ur: 'اسکین لوڈ ہو گیا' },
  site_heading_now: { en: 'Facing', hi: 'दिशा', bn: 'দিক', or: 'ଦିଗ', ur: 'سمت' },
  site_scan_note: {
    en: 'Markers are anchored to compass direction, not depth. Steel structures can distort the compass — re-centre if markers look wrong.',
    hi: 'मार्कर कंपास दिशा से जुड़े हैं, गहराई से नहीं। स्टील ढांचे कंपास बिगाड़ सकते हैं — गलत लगे तो री-सेंटर करें।',
    bn: 'মার্কার কম্পাস দিকের সাথে যুক্ত, গভীরতার নয়। স্টিল কাঠামো কম্পাস বিকৃত করতে পারে।',
    or: 'ମାର୍କର କମ୍ପାସ ଦିଗ ସହିତ ଯୁକ୍ତ, ଗଭୀରତା ନୁହେଁ। ଷ୍ଟିଲ ସଂରଚନା କମ୍ପାସ ବିକୃତ କରିପାରେ।',
    ur: 'مارکر کمپاس سمت سے جڑے ہیں، گہرائی سے نہیں۔ اسٹیل ڈھانچے کمپاس بگاڑ سکتے ہیں۔',
  },
}

/* ================================================================== */
/* Buddy drill                                                         */
/* ================================================================== */

const BUDDY = {
  bd_eyebrow: { en: 'Two-person drill', hi: 'दो-व्यक्ति ड्रिल', sat: 'ᱵᱟᱨᱭᱟ ᱦᱚᱲ ᱛᱟᱞᱤᱢ', bn: 'দুই-জনের ড্রিল', or: 'ଦୁଇ-ଜଣିଆ ଡ୍ରିଲ', ur: 'دو افراد کی ڈرل' },
  bd_title: { en: 'Buddy system drill', hi: 'बडी सिस्टम ड्रिल', bn: 'বাডি সিস্টেম ড্রিল', or: 'ବଡି ସିଷ୍ଟମ ଡ୍ରିଲ', ur: 'بڈی سسٹم ڈرل' },
  bd_desc: {
    en: 'The buddy system is two people watching each other. It cannot be practised alone, so this drill needs two phones — connected directly to each other, with no internet.',
    hi: 'बडी सिस्टम का मतलब दो लोग एक-दूसरे का ध्यान रखें। यह अकेले नहीं सीखा जा सकता, इसलिए इस ड्रिल के लिए दो फ़ोन चाहिए — बिना इंटरनेट, सीधे जुड़े हुए।',
    bn: 'বাডি সিস্টেম মানে দুজন একে অপরকে দেখা। একা অভ্যাস করা যায় না, তাই এই ড্রিলে দুটি ফোন দরকার — ইন্টারনেট ছাড়া সরাসরি যুক্ত।',
    or: 'ବଡି ସିଷ୍ଟମ ମାନେ ଦୁଇଜଣ ପରସ୍ପରକୁ ଦେଖିବା। ଏକୁଟିଆ ଅଭ୍ୟାସ ହୋଇପାରିବ ନାହିଁ, ତେଣୁ ଏହି ଡ୍ରିଲ ପାଇଁ ଦୁଇଟି ଫୋନ ଦରକାର।',
    ur: 'بڈی سسٹم کا مطلب دو لوگ ایک دوسرے کا خیال رکھیں۔ اکیلے مشق نہیں ہو سکتی، اس لیے اس ڈرل کے لیے دو فون درکار ہیں۔',
  },
  bd_i_host: { en: 'Start a drill', hi: 'ड्रिल शुरू करें', sat: 'ᱛᱟᱞᱤᱢ ᱮᱦᱚᱵ', bn: 'ড্রিল শুরু করুন', or: 'ଡ୍ରିଲ ଆରମ୍ଭ କରନ୍ତୁ', ur: 'ڈرل شروع کریں' },
  bd_i_join: { en: 'Join my buddy', hi: 'बडी से जुड़ें', sat: 'ᱡᱚᱲᱟᱣ ᱥᱟᱶ ᱢᱮᱥᱟᱣ', bn: 'বাডির সাথে যোগ দিন', or: 'ବଡି ସହ ଯୋଗ ଦିଅନ୍ତୁ', ur: 'بڈی سے جڑیں' },
  bd_host_step1: { en: 'Show this code to your buddy', hi: 'यह कोड अपने बडी को दिखाएं', bn: 'এই কোড আপনার বাডিকে দেখান', or: 'ଏହି କୋଡ ଆପଣଙ୍କ ବଡିକୁ ଦେଖାନ୍ତୁ', ur: 'یہ کوڈ اپنے بڈی کو دکھائیں' },
  bd_host_step2: { en: 'Now scan the code they show you', hi: 'अब उनका दिखाया कोड स्कैन करें', bn: 'এখন তাদের দেখানো কোড স্ক্যান করুন', or: 'ଏବେ ସେମାନଙ୍କ କୋଡ ସ୍କାନ କରନ୍ତୁ', ur: 'اب ان کا دکھایا کوڈ اسکین کریں' },
  bd_join_step1: { en: 'Scan your buddy\u2019s code', hi: 'अपने बडी का कोड स्कैन करें', bn: 'আপনার বাডির কোড স্ক্যান করুন', or: 'ଆପଣଙ୍କ ବଡିର କୋଡ ସ୍କାନ କରନ୍ତୁ', ur: 'اپنے بڈی کا کوڈ اسکین کریں' },
  bd_join_step2: { en: 'Show this code back to them', hi: 'यह कोड उन्हें दिखाएं', bn: 'এই কোড তাদের দেখান', or: 'ଏହି କୋଡ ସେମାନଙ୍କୁ ଦେଖାନ୍ତୁ', ur: 'یہ کوڈ انہیں دکھائیں' },
  bd_scan_now: { en: 'Scan code', hi: 'कोड स्कैन करें', sat: 'ᱠᱚᱰ ᱥᱠᱟᱱ', bn: 'কোড স্ক্যান', or: 'କୋଡ ସ୍କାନ', ur: 'کوڈ اسکین' },
  bd_paste_instead: { en: 'Or paste the code as text', hi: 'या कोड टेक्स्ट में पेस्ट करें', bn: 'বা কোড টেক্সট হিসেবে পেস্ট করুন', or: 'କିମ୍ବା କୋଡ ଟେକ୍ସଟ ଭାବେ ପେଷ୍ଟ କରନ୍ତୁ', ur: 'یا کوڈ ٹیکسٹ میں پیسٹ کریں' },
  bd_paste_placeholder: { en: 'Paste JGKP1… here', hi: 'JGKP1… यहाँ पेस्ट करें', bn: 'JGKP1… এখানে পেস্ট করুন', or: 'JGKP1… ଏଠାରେ ପେଷ୍ଟ କରନ୍ତୁ', ur: 'JGKP1… یہاں پیسٹ کریں' },
  bd_copy_code: { en: 'Copy code', hi: 'कोड कॉपी करें', bn: 'কোড কপি', or: 'କୋଡ କପି', ur: 'کوڈ کاپی' },
  bd_copied: { en: 'Copied', hi: 'कॉपी हो गया', bn: 'কপি হয়েছে', or: 'କପି ହେଲା', ur: 'کاپی ہو گیا' },
  bd_use_code: { en: 'Use this code', hi: 'यह कोड इस्तेमाल करें', bn: 'এই কোড ব্যবহার করুন', or: 'ଏହି କୋଡ ବ୍ୟବହାର କରନ୍ତୁ', ur: 'یہ کوڈ استعمال کریں' },
  bd_connecting: { en: 'Connecting…', hi: 'जुड़ रहा है…', sat: 'ᱡᱚᱲᱟᱣ ᱠᱟᱱᱟ…', bn: 'সংযোগ হচ্ছে…', or: 'ସଂଯୋଗ ହେଉଛି…', ur: 'جڑ رہا ہے…' },
  bd_connected: { en: 'Connected to your buddy', hi: 'बडी से जुड़ गए', sat: 'ᱡᱚᱲᱟᱣ ᱦᱩᱭ ᱮᱱᱟ', bn: 'বাডির সাথে যুক্ত', or: 'ବଡି ସହ ଯୁକ୍ତ', ur: 'بڈی سے جڑ گئے' },
  bd_failed: { en: 'Could not connect', hi: 'जुड़ नहीं सका', bn: 'সংযোগ হয়নি', or: 'ସଂଯୋଗ ହୋଇପାରିଲା ନାହିଁ', ur: 'جڑ نہیں سکا' },
  bd_failed_hint: {
    en: 'Both phones must be on the same wifi or hotspot. Check that, then try again.',
    hi: 'दोनों फ़ोन एक ही वाईफ़ाई या हॉटस्पॉट पर होने चाहिए। जांचें, फिर कोशिश करें।',
    bn: 'দুটি ফোন একই ওয়াইফাই বা হটস্পটে থাকতে হবে। দেখে আবার চেষ্টা করুন।',
    or: 'ଦୁଇଟି ଫୋନ ସମାନ ୱାଇଫାଇ କିମ୍ବା ହଟସ୍ପଟରେ ରହିବା ଆବଶ୍ୟକ।',
    ur: 'دونوں فون ایک ہی وائی فائی یا ہاٹ اسپاٹ پر ہونے چاہیں۔',
  },
  bd_disconnected: { en: 'Your buddy dropped out', hi: 'आपका बडी डिस्कनेक्ट हो गया', sat: 'ᱡᱚᱲᱟᱣ ᱛᱩᱴᱟᱹᱣ ᱮᱱᱟ', bn: 'আপনার বাডি বিচ্ছিন্ন হয়েছে', or: 'ଆପଣଙ୍କ ବଡି ବିଚ୍ଛିନ୍ନ ହେଲା', ur: 'آپ کا بڈی منقطع ہو گیا' },
  bd_bad_code: { en: 'That code could not be read. Scan it again.', hi: 'यह कोड पढ़ा नहीं गया। फिर स्कैन करें।', bn: 'কোডটি পড়া যায়নি। আবার স্ক্যান করুন।', or: 'କୋଡ ପଢ଼ାଯାଇପାରିଲା ନାହିଁ।', ur: 'یہ کوڈ پڑھا نہیں گیا۔' },
  bd_qr_unsupported: {
    en: 'This browser cannot scan QR codes. Copy and paste the code text instead.',
    hi: 'यह ब्राउज़र QR स्कैन नहीं कर सकता। कोड टेक्स्ट कॉपी-पेस्ट करें।',
    bn: 'এই ব্রাউজার QR স্ক্যান করতে পারে না। কোড টেক্সট কপি-পেস্ট করুন।',
    or: 'ଏହି ବ୍ରାଉଜର QR ସ୍କାନ କରିପାରିବ ନାହିଁ। କୋଡ ଟେକ୍ସଟ କପି-ପେଷ୍ଟ କରନ୍ତୁ।',
    ur: 'یہ براؤزر QR اسکین نہیں کر سکتا۔ کوڈ ٹیکسٹ کاپی پیسٹ کریں۔',
  },
  bd_same_device: { en: 'Practise on one device', hi: 'एक डिवाइस पर अभ्यास', bn: 'একটি ডিভাইসে অভ্যাস', or: 'ଏକ ଡିଭାଇସରେ ଅଭ୍ୟାସ', ur: 'ایک ڈیوائس پر مشق' },
  bd_same_device_note: {
    en: 'Opens a practice run between two browser tabs. Useful for learning the flow, but it is not the real two-person drill.',
    hi: 'दो ब्राउज़र टैब के बीच अभ्यास चलाता है। प्रवाह समझने के लिए उपयोगी, लेकिन यह असली दो-व्यक्ति ड्रिल नहीं है।',
    bn: 'দুটি ব্রাউজার ট্যাবের মধ্যে অভ্যাস চালায়। শেখার জন্য উপযোগী, তবে এটি আসল দুই-জনের ড্রিল নয়।',
    or: 'ଦୁଇଟି ବ୍ରାଉଜର ଟ୍ୟାବ ମଧ୍ୟରେ ଅଭ୍ୟାସ ଚଳାଏ। ଶିଖିବା ପାଇଁ ଉପଯୋଗୀ, କିନ୍ତୁ ଏହା ପ୍ରକୃତ ଡ୍ରିଲ ନୁହେଁ।',
    ur: 'دو براؤزر ٹیبز کے درمیان مشق چلاتا ہے۔ سیکھنے کے لیے مفید، مگر یہ اصل ڈرل نہیں۔',
  },
  bd_no_webrtc: { en: 'This browser cannot make a direct phone-to-phone connection.', hi: 'यह ब्राउज़र फ़ोन-से-फ़ोन सीधा कनेक्शन नहीं बना सकता।', bn: 'এই ব্রাউজার ফোন-থেকে-ফোন সরাসরি সংযোগ করতে পারে না।', or: 'ଏହି ବ୍ରାଉଜର ସିଧା ସଂଯୋଗ କରିପାରିବ ନାହିଁ।', ur: 'یہ براؤزر فون سے فون براہ راست کنکشن نہیں بنا سکتا۔' },

  bd_you_are: { en: 'You are', hi: 'आप हैं', sat: 'ᱟᱢ ᱠᱟᱱᱟᱢ', bn: 'আপনি', or: 'ଆପଣ', ur: 'آپ ہیں' },
  bd_role_casualty: { en: 'the worker inside', hi: 'अंदर का श्रमिक', bn: 'ভিতরের কর্মী', or: 'ଭିତରର କର୍ମୀ', ur: 'اندر کا ورکر' },
  bd_role_responder: { en: 'the buddy watching', hi: 'निगरानी करने वाला बडी', bn: 'নজর রাখা বাডি', or: 'ନଜର ରଖୁଥିବା ବଡି', ur: 'نگرانی کرنے والا بڈی' },
  bd_phase_briefing: { en: 'Before entry', hi: 'प्रवेश से पहले', bn: 'প্রবেশের আগে', or: 'ପ୍ରବେଶ ପୂର୍ବରୁ', ur: 'داخلے سے پہلے' },
  bd_phase_entry: { en: 'At the opening', hi: 'प्रवेश द्वार पर', bn: 'প্রবেশমুখে', or: 'ପ୍ରବେଶ ଦ୍ୱାରରେ', ur: 'داخلی راستے پر' },
  bd_phase_monitoring: { en: 'Inside — stay in contact', hi: 'अंदर — संपर्क बनाए रखें', bn: 'ভিতরে — যোগাযোগ রাখুন', or: 'ଭିତରେ — ସମ୍ପର୍କ ରଖନ୍ତୁ', ur: 'اندر — رابطہ رکھیں' },
  bd_phase_distress: { en: 'Something is wrong', hi: 'कुछ गलत है', bn: 'কিছু ভুল হয়েছে', or: 'କିଛି ଭୁଲ ଅଛି', ur: 'کچھ غلط ہے' },
  bd_phase_response: { en: 'Respond', hi: 'प्रतिक्रिया दें', bn: 'সাড়া দিন', or: 'ପ୍ରତିକ୍ରିୟା ଦିଅନ୍ତୁ', ur: 'جواب دیں' },
  bd_phase_debrief: { en: 'Drill complete', hi: 'ड्रिल पूर्ण', bn: 'ড্রিল সম্পন্ন', or: 'ଡ୍ରିଲ ସମାପ୍ତ', ur: 'ڈرل مکمل' },
  bd_phase_aborted: { en: 'Drill ended early', hi: 'ड्रिल जल्दी खत्म', bn: 'ড্রিল আগেই শেষ', or: 'ଡ୍ରିଲ ଶୀଘ୍ର ସମାପ୍ତ', ur: 'ڈرل جلدی ختم' },
  bd_waiting_buddy: { en: 'Waiting for your buddy…', hi: 'बडी का इंतज़ार…', sat: 'ᱡᱚᱲᱟᱣ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱠᱟᱱᱟ…', bn: 'বাডির জন্য অপেক্ষা…', or: 'ବଡିଙ୍କ ଅପେକ୍ଷା…', ur: 'بڈی کا انتظار…' },

  bd_checkin_now: { en: 'Check on your buddy now', hi: 'अभी अपने बडी की जांच करें', sat: 'ᱛᱮᱦᱮᱸ ᱡᱚᱲᱟᱣ ᱧᱮᱞ ᱢᱮ', bn: 'এখনই বাডিকে দেখুন', or: 'ଏବେ ବଡିଙ୍କୁ ଦେଖନ୍ତୁ', ur: 'ابھی اپنے بڈی کو دیکھیں' },
  bd_checkin_btn: { en: 'Buddy is OK', hi: 'बडी ठीक है', sat: 'ᱡᱚᱲᱟᱣ ᱴᱷᱤᱠ ᱜᱮᱭᱟ', bn: 'বাডি ঠিক আছে', or: 'ବଡି ଠିକ ଅଛନ୍ତି', ur: 'بڈی ٹھیک ہے' },
  bd_checkin_done: { en: 'Check-in recorded', hi: 'जांच दर्ज हुई', bn: 'চেক-ইন রেকর্ড হয়েছে', or: 'ଚେକ-ଇନ ରେକର୍ଡ ହେଲା', ur: 'چیک ان درج ہوا' },
  bd_checkin_missed: { en: 'Missed check-in', hi: 'जांच छूट गई', bn: 'চেক-ইন মিস', or: 'ଚେକ-ଇନ ମିସ', ur: 'چیک ان رہ گیا' },
  bd_checkins_label: { en: 'Check-ins', hi: 'जांच', bn: 'চেক-ইন', or: 'ଚେକ-ଇନ', ur: 'چیک ان' },
  bd_buddy_responsive: { en: 'Buddy responding', hi: 'बडी जवाब दे रहा है', sat: 'ᱡᱚᱲᱟᱣ ᱛᱮᱞᱟ ᱮᱫᱟᱭ', bn: 'বাডি সাড়া দিচ্ছে', or: 'ବଡି ଉତ୍ତର ଦେଉଛନ୍ତି', ur: 'بڈی جواب دے رہا ہے' },
  bd_buddy_quiet: { en: 'No word from your buddy', hi: 'बडी से कोई खबर नहीं', sat: 'ᱡᱚᱲᱟᱣ ᱠᱷᱚᱵᱚᱨ ᱵᱟᱝ', bn: 'বাডির কোনো খবর নেই', or: 'ବଡିଙ୍କ କୌଣସି ଖବର ନାହିଁ', ur: 'بڈی سے کوئی خبر نہیں' },
  bd_buddy_down: { en: 'YOUR BUDDY IS DOWN', hi: 'आपका बडी गिर गया है', sat: 'ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱜᱤᱛᱤᱡ ᱟᱠᱟᱱᱟ', bn: 'আপনার বাডি পড়ে গেছে', or: 'ଆପଣଙ୍କ ବଡି ପଡ଼ିଗଲେ', ur: 'آپ کا بڈی گر گیا ہے' },
  bd_acknowledge: { en: 'I see it — respond', hi: 'मैंने देखा — प्रतिक्रिया दें', sat: 'ᱧᱮᱞ ᱠᱮᱫᱟᱹᱧ — ᱛᱮᱞᱟᱭ', bn: 'আমি দেখেছি — সাড়া দিন', or: 'ମୁଁ ଦେଖିଲି — ପ୍ରତିକ୍ରିୟା', ur: 'میں نے دیکھا — جواب دیں' },
  bd_notice_time: { en: 'Time to notice', hi: 'ध्यान देने का समय', bn: 'লক্ষ্য করার সময়', or: 'ଧ୍ୟାନ ଦେବା ସମୟ', ur: 'دھیان دینے کا وقت' },
  bd_monitoring_note: {
    en: 'Stay alert. You will be asked to check on each other at intervals — and one of you is about to have a problem.',
    hi: 'सतर्क रहें। आपसे समय-समय पर एक-दूसरे की जांच करने को कहा जाएगा — और आप में से एक को दिक्कत होने वाली है।',
    bn: 'সতর্ক থাকুন। মাঝে মাঝে একে অপরকে দেখতে বলা হবে — এবং একজনের সমস্যা হতে চলেছে।',
    or: 'ସତର୍କ ରୁହନ୍ତୁ। ମଧ୍ୟେ ମଧ୍ୟେ ପରସ୍ପରକୁ ଦେଖିବାକୁ କୁହାଯିବ।',
    ur: 'چوکس رہیں۔ وقتاً فوقتاً ایک دوسرے کو دیکھنے کو کہا جائے گا۔',
  },
  bd_your_score: { en: 'Your result', hi: 'आपका परिणाम', sat: 'ᱟᱢᱟᱜ ᱯᱷᱚᱞ', bn: 'আপনার ফলাফল', or: 'ଆପଣଙ୍କ ଫଳାଫଳ', ur: 'آپ کا نتیجہ' },
  bd_buddy_score: { en: 'Your buddy\u2019s result', hi: 'आपके बडी का परिणाम', bn: 'আপনার বাডির ফলাফল', or: 'ଆପଣଙ୍କ ବଡିର ଫଳାଫଳ', ur: 'آپ کے بڈی کا نتیجہ' },
  bd_waiting_score: { en: 'Waiting for your buddy\u2019s result…', hi: 'बडी के परिणाम का इंतज़ार…', bn: 'বাডির ফলাফলের অপেক্ষা…', or: 'ବଡିଙ୍କ ଫଳାଫଳ ଅପେକ୍ଷା…', ur: 'بڈی کے نتیجے کا انتظار…' },
  bd_partial_note: {
    en: 'This drill ended early, so it is recorded as incomplete and does not count toward certification.',
    hi: 'यह ड्रिल जल्दी खत्म हुई, इसलिए अपूर्ण दर्ज है और प्रमाणन में नहीं गिनी जाएगी।',
    bn: 'এই ড্রিল আগেই শেষ হয়েছে, তাই অসম্পূর্ণ হিসেবে রেকর্ড এবং সার্টিফিকেশনে গণনা হবে না।',
    or: 'ଏହି ଡ୍ରିଲ ଶୀଘ୍ର ସମାପ୍ତ ହେଲା, ତେଣୁ ଅସମ୍ପୂର୍ଣ୍ଣ ଭାବେ ରେକର୍ଡ।',
    ur: 'یہ ڈرل جلدی ختم ہوئی، اس لیے نامکمل درج ہے۔',
  },
  bd_end_drill: { en: 'End drill', hi: 'ड्रिल खत्म करें', bn: 'ড্রিল শেষ করুন', or: 'ଡ୍ରିଲ ସମାପ୍ତ କରନ୍ତୁ', ur: 'ڈرل ختم کریں' },
  bd_saved: { en: 'Result saved to your record', hi: 'परिणाम आपके रिकॉर्ड में सहेजा गया', bn: 'ফলাফল আপনার রেকর্ডে সংরক্ষিত', or: 'ଫଳାଫଳ ଆପଣଙ୍କ ରେକର୍ଡରେ ସେଭ ହେଲା', ur: 'نتیجہ آپ کے ریکارڈ میں محفوظ' },

  buddy_step_ppe: {
    en: 'Gas has been detected in the shaft. Which mask do you both put on before entry?',
    hi: 'शाफ्ट में गैस मिली है। प्रवेश से पहले आप दोनों कौन सा मास्क पहनते हैं?',
    sat: 'ᱥᱟᱯᱷᱴ ᱨᱮ ᱜᱮᱥ ᱧᱟᱢ ᱟᱠᱟᱱᱟ ᱾ ᱵᱚᱞᱚ ᱞᱟᱦᱟ ᱚᱠᱟ ᱢᱟᱥᱠ ᱛᱩᱞᱟᱹᱭ ᱠᱟᱱᱟ?',
    bn: 'শ্যাফটে গ্যাস পাওয়া গেছে। প্রবেশের আগে আপনারা কোন মাস্ক পরবেন?',
    or: 'ସାଫ୍ଟରେ ଗ୍ୟାସ ମିଳିଛି। ପ୍ରବେଶ ପୂର୍ବରୁ ଆପଣମାନେ କେଉଁ ମାସ୍କ ପିନ୍ଧିବେ?',
    ur: 'شافٹ میں گیس ملی ہے۔ داخلے سے پہلے آپ دونوں کون سا ماسک پہنیں گے؟',
  },
  buddy_ppe_dust: { en: 'A dust mask — it is right here', hi: 'धूल मास्क — यही पास है', sat: 'ᱫᱷᱩᱲᱤ ᱢᱟᱥᱠ', bn: 'ধুলো মাস্ক — এটাই আছে', or: 'ଧୂଳି ମାସ୍କ — ଏହା ପାଖରେ', ur: 'گرد ماسک — یہی پاس ہے' },
  buddy_ppe_scba: { en: 'Breathing apparatus rated for this gas', hi: 'इस गैस के लिए रेटेड श्वास उपकरण', sat: 'ᱜᱮᱥ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱶᱦᱮᱫ ᱥᱟᱶᱥ ᱡᱤᱱᱤᱥ', bn: 'এই গ্যাসের জন্য রেটেড শ্বাস যন্ত্র', or: 'ଏହି ଗ୍ୟାସ ପାଇଁ ରେଟେଡ ଶ୍ୱାସ ଉପକରଣ', ur: 'اس گیس کے لیے موزوں سانس آلہ' },
  buddy_fb_ppe_wrong: {
    en: 'A dust mask filters particles, not gas. In a confined space with confirmed gas it offers no protection at all — you would be unconscious before you noticed.',
    hi: 'धूल मास्क कण छानता है, गैस नहीं। पुष्ट गैस वाले सीमित स्थान में यह कोई सुरक्षा नहीं देता — आप बेहोश हो जाएंगे, पता भी नहीं चलेगा।',
    bn: 'ধুলো মাস্ক কণা ছাঁকে, গ্যাস নয়। নিশ্চিত গ্যাসযুক্ত আবদ্ধ স্থানে এটি কোনো সুরক্ষা দেয় না।',
    or: 'ଧୂଳି ମାସ୍କ କଣିକା ଛାଣେ, ଗ୍ୟାସ ନୁହେଁ। ନିଶ୍ଚିତ ଗ୍ୟାସ ଥିବା ସୀମିତ ସ୍ଥାନରେ ଏହା କୌଣସି ସୁରକ୍ଷା ଦିଏ ନାହିଁ।',
    ur: 'گرد ماسک ذرات چھانتا ہے، گیس نہیں۔ گیس والی بند جگہ میں یہ کوئی تحفظ نہیں دیتا۔',
  },
  buddy_fb_ppe_right: {
    en: 'Correct. Once gas is confirmed, respiratory protection rated for that gas is mandatory for everyone entering.',
    hi: 'सही। गैस की पुष्टि होने पर, प्रवेश करने वाले सभी के लिए उस गैस के लिए रेटेड श्वसन सुरक्षा अनिवार्य है।',
    bn: 'সঠিক। গ্যাস নিশ্চিত হলে, প্রবেশকারী সবার জন্য সেই গ্যাসের রেটেড শ্বসন সুরক্ষা বাধ্যতামূলক।',
    or: 'ସଠିକ। ଗ୍ୟାସ ନିଶ୍ଚିତ ହେଲେ, ପ୍ରବେଶ କରୁଥିବା ସମସ୍ତଙ୍କ ପାଇଁ ରେଟେଡ ଶ୍ୱସନ ସୁରକ୍ଷା ବାଧ୍ୟତାମୂଳକ।',
    ur: 'درست۔ گیس کی تصدیق کے بعد، داخل ہونے والے سب کے لیے موزوں سانس تحفظ لازمی ہے۔',
  },
  buddy_step_entry: {
    en: 'Your buddy is ready but the stand-by attendant has stepped away. Do you go in?',
    hi: 'आपका बडी तैयार है लेकिन स्टैंड-बाय अटेंडेंट चला गया है। क्या आप अंदर जाते हैं?',
    sat: 'ᱡᱚᱲᱟᱣ ᱛᱮᱭᱟᱨ ᱜᱮᱭᱟ ᱢᱮᱱᱠᱷᱟᱱ ᱵᱟᱦᱨᱮᱭᱟᱜ ᱦᱚᱲ ᱵᱟᱝ ᱾ ᱵᱚᱞᱚᱭ ᱟᱢ?',
    bn: 'আপনার বাডি প্রস্তুত কিন্তু স্ট্যান্ড-বাই অ্যাটেনডেন্ট সরে গেছে। আপনি ঢুকবেন?',
    or: 'ଆପଣଙ୍କ ବଡି ପ୍ରସ୍ତୁତ କିନ୍ତୁ ଷ୍ଟାଣ୍ଡ-ବାଇ ଅଟେଣ୍ଡାଣ୍ଟ ଚାଲିଗଲେ। ଆପଣ ଭିତରକୁ ଯିବେ?',
    ur: 'آپ کا بڈی تیار ہے مگر اسٹینڈ بائی اٹینڈنٹ ہٹ گیا ہے۔ کیا آپ اندر جائیں گے؟',
  },
  buddy_entry_alone: { en: 'Yes — the two of us is enough', hi: 'हाँ — हम दोनों काफ़ी हैं', sat: 'ᱦᱟᱸ — ᱟᱞᱮ ᱵᱟᱨᱭᱟ ᱜᱮ ᱵᱟᱹᱲᱛᱤ', bn: 'হ্যাঁ — আমরা দুজনই যথেষ্ট', or: 'ହଁ — ଆମେ ଦୁଇଜଣ ଯଥେଷ୍ଟ', ur: 'ہاں — ہم دونوں کافی ہیں' },
  buddy_entry_attendant: { en: 'No — wait for the attendant outside', hi: 'नहीं — बाहर अटेंडेंट का इंतज़ार करें', sat: 'ᱵᱟᱝ — ᱵᱟᱦᱨᱮ ᱦᱚᱲ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ', bn: 'না — বাইরে অ্যাটেনডেন্টের অপেক্ষা করুন', or: 'ନା — ବାହାରେ ଅଟେଣ୍ଡାଣ୍ଟ ଅପେକ୍ଷା କରନ୍ତୁ', ur: 'نہیں — باہر اٹینڈنٹ کا انتظار کریں' },
  buddy_fb_entry_wrong: {
    en: 'Two people inside a gas-filled space is two casualties. The whole point of the attendant is that they stay outside, uncontaminated, able to call rescue.',
    hi: 'गैस भरे स्थान में दो लोग अंदर = दो हताहत। अटेंडेंट का पूरा मकसद यही है कि वे बाहर सुरक्षित रहें और बचाव बुला सकें।',
    bn: 'গ্যাসপূর্ণ স্থানে দুজন ভিতরে মানে দুজন আহত। অ্যাটেনডেন্টের কাজ বাইরে থেকে উদ্ধার ডাকা।',
    or: 'ଗ୍ୟାସ ଭରା ସ୍ଥାନରେ ଦୁଇଜଣ ଭିତରେ ମାନେ ଦୁଇଜଣ ଆହତ। ଅଟେଣ୍ଡାଣ୍ଟର କାମ ବାହାରୁ ଉଦ୍ଧାର ଡାକିବା।',
    ur: 'گیس بھری جگہ میں دو لوگ اندر یعنی دو زخمی۔ اٹینڈنٹ کا کام باہر رہ کر ریسکیو بلانا ہے۔',
  },
  buddy_fb_entry_right: {
    en: 'Correct. A stand-by attendant outside the space is a requirement, not a courtesy. Without one, nobody can raise the alarm.',
    hi: 'सही। स्थान के बाहर स्टैंड-बाय अटेंडेंट अनिवार्य है, शिष्टाचार नहीं। उसके बिना कोई अलार्म नहीं बजा सकता।',
    bn: 'সঠিক। স্থানের বাইরে স্ট্যান্ড-বাই অ্যাটেনডেন্ট বাধ্যতামূলক। তাকে ছাড়া কেউ অ্যালার্ম দিতে পারে না।',
    or: 'ସଠିକ। ସ୍ଥାନ ବାହାରେ ଷ୍ଟାଣ୍ଡ-ବାଇ ଅଟେଣ୍ଡାଣ୍ଟ ବାଧ୍ୟତାମୂଳକ।',
    ur: 'درست۔ جگہ کے باہر اسٹینڈ بائی اٹینڈنٹ لازمی ہے۔',
  },
  buddy_step_casualty: {
    en: 'Your head is swimming and your vision is blurring. What do you do with the seconds you have?',
    hi: 'आपका सिर घूम रहा है और नज़र धुंधली हो रही है। बचे सेकंडों में आप क्या करते हैं?',
    sat: 'ᱟᱢᱟᱜ ᱵᱚᱦᱚᱜ ᱜᱩᱨ ᱮᱫᱟᱭ ᱟᱨ ᱧᱮᱞ ᱛᱩᱲ ᱮᱫᱟᱭ ᱾ ᱛᱤᱱᱟᱹᱜ ᱠᱚᱨᱟᱣ?',
    bn: 'আপনার মাথা ঘুরছে এবং দৃষ্টি ঝাপসা। বাকি সেকেন্ডে আপনি কী করবেন?',
    or: 'ଆପଣଙ୍କ ମୁଣ୍ଡ ଘୂରୁଛି ଏବଂ ଦୃଷ୍ଟି ଅସ୍ପଷ୍ଟ। ବଳକା ସେକେଣ୍ଡରେ କଣ କରିବେ?',
    ur: 'آپ کا سر گھوم رہا ہے اور نظر دھندلی ہے۔ بچے سیکنڈوں میں کیا کریں گے؟',
  },
  buddy_cas_continue: { en: 'Push through — it will pass', hi: 'सहते रहें — ठीक हो जाएगा', sat: 'ᱠᱟᱹᱢᱤ ᱛᱮᱭᱟᱨ — ᱴᱷᱤᱠ ᱦᱩᱭᱩᱜᱼᱟ', bn: 'চালিয়ে যান — ঠিক হয়ে যাবে', or: 'ଚାଲୁ ରଖନ୍ତୁ — ଠିକ ହୋଇଯିବ', ur: 'برداشت کریں — ٹھیک ہو جائے گا' },
  buddy_cas_signal: { en: 'Signal your buddy and move to the exit', hi: 'बडी को संकेत दें और निकास की ओर बढ़ें', sat: 'ᱡᱚᱲᱟᱣ ᱠᱚ ᱠᱷᱚᱵᱚᱨ ᱮᱢ ᱟᱨ ᱚᱰᱚᱠ ᱛᱮ ᱪᱟᱞᱟᱜ', bn: 'বাডিকে সংকেত দিয়ে প্রস্থানের দিকে যান', or: 'ବଡିଙ୍କୁ ସଙ୍କେତ ଦେଇ ନିର୍ଗମ ଆଡ଼କୁ ଯାଆନ୍ତୁ', ur: 'بڈی کو اشارہ دیں اور راستے کی طرف بڑھیں' },
  buddy_fb_cas_wrong: {
    en: 'Dizziness in a confined space is oxygen deficiency or gas exposure. Those seconds were your only chance to tell anyone — after that nobody knows you are in trouble.',
    hi: 'सीमित स्थान में चक्कर आना ऑक्सीजन की कमी या गैस संपर्क है। वे सेकंड किसी को बताने का एकमात्र मौका थे — उसके बाद किसी को पता नहीं चलेगा।',
    bn: 'আবদ্ধ স্থানে মাথা ঘোরা মানে অক্সিজেনের অভাব বা গ্যাস। ওই সেকেন্ডগুলোই কাউকে জানানোর একমাত্র সুযোগ ছিল।',
    or: 'ସୀମିତ ସ୍ଥାନରେ ମୁଣ୍ଡ ଘୂରିବା ଅକ୍ସିଜେନ ଅଭାବ କିମ୍ବା ଗ୍ୟାସ। ସେହି ସେକେଣ୍ଡ ହିଁ କାହାକୁ ଜଣାଇବାର ଏକମାତ୍ର ସୁଯୋଗ ଥିଲା।',
    ur: 'بند جگہ میں چکر آنا آکسیجن کی کمی یا گیس ہے۔ وہ سیکنڈ کسی کو بتانے کا واحد موقع تھے۔',
  },
  buddy_fb_cas_right: {
    en: 'Correct. Signalling early is what makes rescue possible. A worker who says nothing is found, not saved.',
    hi: 'सही। जल्दी संकेत देना ही बचाव संभव बनाता है। जो कुछ नहीं कहता, वह मिलता है — बचता नहीं।',
    bn: 'সঠিক। তাড়াতাড়ি সংকেত দিলেই উদ্ধার সম্ভব। যে কিছু বলে না, তাকে পাওয়া যায় — বাঁচানো যায় না।',
    or: 'ସଠିକ। ଶୀଘ୍ର ସଙ୍କେତ ଦେବା ହିଁ ଉଦ୍ଧାର ସମ୍ଭବ କରେ।',
    ur: 'درست۔ جلدی اشارہ دینا ہی ریسکیو ممکن بناتا ہے۔',
  },
  buddy_step_resp1: {
    en: 'Your buddy has collapsed inside. What is your first action?',
    hi: 'आपका बडी अंदर गिर गया है। आपकी पहली कार्रवाई क्या है?',
    sat: 'ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱵᱷᱤᱛᱤᱨ ᱨᱮ ᱜᱤᱛᱤᱡ ᱮᱱᱟ ᱾ ᱢᱟᱲᱟᱝ ᱠᱟᱹᱢᱤ ᱪᱮᱫ?',
    bn: 'আপনার বাডি ভিতরে পড়ে গেছে। আপনার প্রথম কাজ কী?',
    or: 'ଆପଣଙ୍କ ବଡି ଭିତରେ ପଡ଼ିଗଲେ। ଆପଣଙ୍କ ପ୍ରଥମ କାର୍ଯ୍ୟ କଣ?',
    ur: 'آپ کا بڈی اندر گر گیا ہے۔ آپ کا پہلا عمل کیا ہے؟',
  },
  buddy_resp_rush: { en: 'Go in and pull them out', hi: 'अंदर जाकर उन्हें बाहर खींचें', sat: 'ᱵᱷᱤᱛᱤᱨ ᱛᱮ ᱪᱟᱞᱟᱜ ᱟᱨ ᱚᱰᱚᱠ ᱦᱟᱛᱟᱣ', bn: 'ভিতরে গিয়ে তাদের টেনে আনুন', or: 'ଭିତରକୁ ଯାଇ ସେମାନଙ୍କୁ ଟାଣି ଆଣନ୍ତୁ', ur: 'اندر جا کر انہیں باہر کھینچیں' },
  buddy_resp_alarm: { en: 'Stay out, raise the alarm, call rescue', hi: 'बाहर रहें, अलार्म बजाएं, बचाव बुलाएं', sat: 'ᱵᱟᱦᱨᱮ ᱛᱟᱦᱮᱸᱱ, ᱟᱞᱟᱨᱢ ᱨᱩᱭ, ᱩᱫᱷᱟᱹᱨ ᱠᱚ ᱦᱟᱠᱟᱣ', bn: 'বাইরে থাকুন, অ্যালার্ম দিন, উদ্ধার ডাকুন', or: 'ବାହାରେ ରୁହନ୍ତୁ, ଆଲାର୍ମ ବଜାନ୍ତୁ, ଉଦ୍ଧାର ଡାକନ୍ତୁ', ur: 'باہر رہیں، الارم بجائیں، ریسکیو بلائیں' },
  buddy_fb_resp1_wrong: {
    en: 'This is the mistake that turns one casualty into two. Most confined-space deaths are would-be rescuers. The gas that dropped your buddy will drop you in the same seconds.',
    hi: 'यही गलती एक हताहत को दो बना देती है। सीमित स्थान की अधिकतर मौतें बचाने गए लोगों की होती हैं। जिस गैस ने बडी को गिराया, वही आपको भी गिराएगी।',
    bn: 'এই ভুলই একজন আহতকে দুজন করে। আবদ্ধ স্থানের বেশিরভাগ মৃত্যু উদ্ধারকারীদের। যে গ্যাস বাডিকে ফেলেছে, সেটিই আপনাকেও ফেলবে।',
    or: 'ଏହି ଭୁଲ ହିଁ ଜଣେ ଆହତକୁ ଦୁଇଜଣ କରେ। ସୀମିତ ସ୍ଥାନର ଅଧିକାଂଶ ମୃତ୍ୟୁ ଉଦ୍ଧାରକାରୀଙ୍କର।',
    ur: 'یہی غلطی ایک زخمی کو دو بنا دیتی ہے۔ بند جگہ کی زیادہ تر ہلاکتیں بچانے والوں کی ہوتی ہیں۔',
  },
  buddy_fb_resp1_right: {
    en: 'Correct. Raising the alarm from outside is the only action that helps. It is counter-instinctive and it is what saves both of you.',
    hi: 'सही। बाहर से अलार्म बजाना ही एकमात्र मददगार कार्रवाई है। यह सहज प्रवृत्ति के विरुद्ध है और यही दोनों को बचाता है।',
    bn: 'সঠিক। বাইরে থেকে অ্যালার্ম দেওয়াই একমাত্র কার্যকর পদক্ষেপ। এটি সহজাত প্রবৃত্তির বিরুদ্ধে, আর এটাই দুজনকে বাঁচায়।',
    or: 'ସଠିକ। ବାହାରୁ ଆଲାର୍ମ ବଜାଇବା ହିଁ ଏକମାତ୍ର ସହାୟକ କାର୍ଯ୍ୟ।',
    ur: 'درست۔ باہر سے الارم بجانا ہی واحد مددگار عمل ہے۔',
  },
  buddy_step_resp2: {
    en: 'The alarm is raised. Rescue is four minutes away. What now?',
    hi: 'अलार्म बज गया। बचाव दल चार मिनट दूर है। अब क्या?',
    sat: 'ᱟᱞᱟᱨᱢ ᱨᱩᱭ ᱮᱱᱟ ᱾ ᱩᱫᱷᱟᱹᱨ ᱫᱟᱞ ᱯᱩᱱ ᱢᱤᱱᱤᱴ ᱥᱟᱶ ᱦᱮᱡᱚᱜᱼᱟ ᱾ ᱛᱮᱦᱮᱸ ᱪᱮᱫ?',
    bn: 'অ্যালার্ম দেওয়া হয়েছে। উদ্ধার চার মিনিট দূরে। এখন কী?',
    or: 'ଆଲାର୍ମ ବାଜିଲା। ଉଦ୍ଧାର ଚାରି ମିନିଟ ଦୂରରେ। ଏବେ କଣ?',
    ur: 'الارم بج گیا۔ ریسکیو چار منٹ دور ہے۔ اب کیا؟',
  },
  buddy_resp_dustmask: { en: 'Put on a dust mask and go in now', hi: 'धूल मास्क पहनकर अभी अंदर जाएं', sat: 'ᱫᱷᱩᱲᱤ ᱢᱟᱥᱠ ᱛᱩᱞᱟᱹ ᱟᱨ ᱵᱚᱞᱚᱭ', bn: 'ধুলো মাস্ক পরে এখনই ঢুকুন', or: 'ଧୂଳି ମାସ୍କ ପିନ୍ଧି ଏବେ ଭିତରକୁ ଯାଆନ୍ତୁ', ur: 'گرد ماسک پہن کر ابھی اندر جائیں' },
  buddy_resp_wait: { en: 'Hold the entry and guide the rescue team in', hi: 'प्रवेश रोकें और बचाव दल को रास्ता दिखाएं', sat: 'ᱵᱚᱞᱚ ᱡᱟᱭᱜᱟ ᱫᱚᱦᱚᱭ ᱟᱨ ᱩᱫᱷᱟᱹᱨ ᱫᱟᱞ ᱠᱚ ᱦᱚᱨ ᱩᱫᱩᱜ', bn: 'প্রবেশ ধরে রাখুন ও উদ্ধার দলকে পথ দেখান', or: 'ପ୍ରବେଶ ଧରି ରଖନ୍ତୁ ଓ ଉଦ୍ଧାର ଦଳକୁ ପଥ ଦେଖାନ୍ତୁ', ur: 'داخلہ روکیں اور ریسکیو ٹیم کو راستہ دکھائیں' },
  buddy_fb_resp2_wrong: {
    en: 'A dust mask does nothing against gas. Four minutes of waiting feels unbearable, but entering unprotected takes the one person who knows where your buddy is.',
    hi: 'धूल मास्क गैस के सामने बेकार है। चार मिनट रुकना असहनीय लगता है, लेकिन बिना सुरक्षा जाने से वह एक व्यक्ति भी चला जाएगा जिसे पता है बडी कहाँ है।',
    bn: 'ধুলো মাস্ক গ্যাসের বিরুদ্ধে অকেজো। চার মিনিট অপেক্ষা অসহ্য লাগে, কিন্তু অরক্ষিত ঢুকলে বাডি কোথায় জানা একমাত্র ব্যক্তিও হারিয়ে যাবে।',
    or: 'ଧୂଳି ମାସ୍କ ଗ୍ୟାସ ବିରୁଦ୍ଧରେ ଅକାମୀ। ଅସୁରକ୍ଷିତ ପ୍ରବେଶ କରିବା ମାନେ ବଡି କେଉଁଠି ଜାଣିଥିବା ଏକମାତ୍ର ବ୍ୟକ୍ତି ମଧ୍ୟ ହଜିଯିବେ।',
    ur: 'گرد ماسک گیس کے سامنے بیکار ہے۔ غیر محفوظ اندر جانا اس واحد شخص کو بھی ضائع کر دے گا جو جانتا ہے بڈی کہاں ہے۔',
  },
  buddy_fb_resp2_right: {
    en: 'Correct. Holding the entry and briefing the trained team is the highest-value thing you can do. You are the only person who knows exactly where they went down.',
    hi: 'सही। प्रवेश रोकना और प्रशिक्षित दल को जानकारी देना सबसे मूल्यवान काम है। आप ही जानते हैं वे ठीक कहाँ गिरे।',
    bn: 'সঠিক। প্রবেশ ধরে রাখা ও প্রশিক্ষিত দলকে জানানোই সবচেয়ে মূল্যবান কাজ। আপনিই জানেন তারা ঠিক কোথায় পড়েছে।',
    or: 'ସଠିକ। ପ୍ରବେଶ ଧରି ରଖିବା ଓ ପ୍ରଶିକ୍ଷିତ ଦଳକୁ ଜଣାଇବା ସର୍ବାଧିକ ମୂଲ୍ୟବାନ କାର୍ଯ୍ୟ।',
    ur: 'درست۔ داخلہ روکنا اور تربیت یافتہ ٹیم کو بریف کرنا سب سے قیمتی کام ہے۔',
  },
}

/* ================================================================== */
/* Hazard reporting                                                    */
/* ================================================================== */

const HAZARDS = {
  hz_eyebrow: { en: 'Near-miss report', hi: 'निकट-चूक रिपोर्ट', sat: 'ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ', bn: 'নিয়ার-মিস রিপোর্ট', or: 'ନିଅର-ମିସ ରିପୋର୍ଟ', ur: 'قریب المرگ رپورٹ' },
  hz_title: { en: 'Report what you saw', hi: 'जो देखा वह बताएं', sat: 'ᱡᱟᱦᱟᱸ ᱧᱮᱞ ᱠᱮᱫᱟᱢ ᱚᱱᱟ ᱞᱟᱭ ᱢᱮ', bn: 'যা দেখেছেন জানান', or: 'ଯାହା ଦେଖିଲେ ଜଣାନ୍ତୁ', ur: 'جو دیکھا وہ بتائیں' },
  hz_desc: {
    en: 'One photo and a tap. It reaches your safety officer without you having to write anything or find anyone.',
    hi: 'एक फोटो और एक टैप। यह आपके सुरक्षा अधिकारी तक पहुंच जाएगा, कुछ लिखने या किसी को खोजने की ज़रूरत नहीं।',
    sat: 'ᱢᱤᱫ ᱯᱷᱚᱴᱚ ᱟᱨ ᱢᱤᱫ ᱛᱚᱯᱟᱣ ᱾ ᱱᱚᱶᱟ ᱨᱠᱷᱟ ᱟᱯᱷᱤᱥᱚᱨ ᱛᱮ ᱥᱮᱴᱮᱨᱚᱜᱼᱟ ᱾',
    bn: 'একটি ছবি ও একটি ট্যাপ। কিছু লিখতে বা কাউকে খুঁজতে না হয়েই এটি আপনার সেফটি অফিসারের কাছে পৌঁছাবে।',
    or: 'ଏକ ଫଟୋ ଓ ଏକ ଟ୍ୟାପ। କିଛି ଲେଖିବା କିମ୍ବା କାହାକୁ ଖୋଜିବା ବିନା ଏହା ଆପଣଙ୍କ ସୁରକ୍ଷା ଅଧିକାରୀ ପାଖରେ ପହଞ୍ଚିବ।',
    ur: 'ایک تصویر اور ایک ٹیپ۔ کچھ لکھے یا کسی کو ڈھونڈے بغیر یہ آپ کے سیفٹی افسر تک پہنچ جائے گا۔',
  },
  hz_pick_what: { en: 'What did you see?', hi: 'आपने क्या देखा?', sat: 'ᱟᱢ ᱪᱮᱫ ᱧᱮᱞ ᱠᱮᱫᱟᱢ?', bn: 'আপনি কী দেখেছেন?', or: 'ଆପଣ କଣ ଦେଖିଲେ?', ur: 'آپ نے کیا دیکھا؟' },
  hz_how_bad: { en: 'How dangerous is it?', hi: 'यह कितना खतरनाक है?', sat: 'ᱱᱚᱶᱟ ᱛᱤᱱᱟᱹᱜ ᱡᱚᱠᱷᱚᱢ?', bn: 'এটি কতটা বিপজ্জনক?', or: 'ଏହା କେତେ ବିପଜ୍ଜନକ?', ur: 'یہ کتنا خطرناک ہے؟' },
  hz_sev_low: { en: 'Worth noting', hi: 'ध्यान देने योग्य', sat: 'ᱧᱮᱞ ᱞᱟᱹᱠᱛᱤ', bn: 'লক্ষণীয়', or: 'ଧ୍ୟାନଯୋଗ୍ୟ', ur: 'قابل توجہ' },
  hz_sev_medium: { en: 'Needs fixing', hi: 'ठीक करना ज़रूरी', sat: 'ᱴᱷᱤᱠ ᱞᱟᱹᱠᱛᱤ', bn: 'ঠিক করা দরকার', or: 'ଠିକ କରିବା ଆବଶ୍ୟକ', ur: 'ٹھیک کرنا ضروری' },
  hz_sev_high: { en: 'Someone could be hurt today', hi: 'आज कोई घायल हो सकता है', sat: 'ᱛᱮᱦᱮᱸ ᱡᱟᱦᱟᱸ ᱦᱚᱲ ᱜᱷᱟᱭᱚᱞ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ', bn: 'আজই কেউ আহত হতে পারে', or: 'ଆଜି କେହି ଆହତ ହୋଇପାରନ୍ତି', ur: 'آج کوئی زخمی ہو سکتا ہے' },
  hz_add_photo: { en: 'Take a photo', hi: 'फोटो लें', sat: 'ᱯᱷᱚᱴᱚ ᱦᱟᱛᱟᱣ', bn: 'ছবি তুলুন', or: 'ଫଟୋ ନିଅନ୍ତୁ', ur: 'تصویر لیں' },
  hz_retake_photo: { en: 'Take another', hi: 'दूसरी लें', sat: 'ᱮᱴᱟᱜ ᱦᱟᱛᱟᱣ', bn: 'আরেকটি তুলুন', or: 'ଅନ୍ୟ ନିଅନ୍ତୁ', ur: 'دوسری لیں' },
  hz_photo_optional: { en: 'A photo helps but is not required', hi: 'फोटो मददगार है पर ज़रूरी नहीं', bn: 'ছবি সহায়ক তবে বাধ্যতামূলক নয়', or: 'ଫଟୋ ସହାୟକ କିନ୍ତୁ ଆବଶ୍ୟକ ନୁହେଁ', ur: 'تصویر مددگار ہے مگر ضروری نہیں' },
  hz_photo_failed: { en: 'That image could not be read. Try another photo.', hi: 'यह छवि पढ़ी नहीं गई। दूसरी फोटो आज़माएं।', bn: 'ছবিটি পড়া যায়নি। অন্য ছবি চেষ্টা করুন।', or: 'ଛବି ପଢ଼ାଯାଇପାରିଲା ନାହିଁ।', ur: 'یہ تصویر پڑھی نہیں گئی۔' },
  hz_add_voice: { en: 'Say what is wrong', hi: 'बोलकर बताएं क्या गलत है', sat: 'ᱨᱚᱲ ᱠᱟᱛᱮ ᱞᱟᱭ ᱢᱮ', bn: 'বলে জানান কী সমস্যা', or: 'କହି ଜଣାନ୍ତୁ କଣ ଭୁଲ', ur: 'بول کر بتائیں کیا غلط ہے' },
  hz_stop_recording: { en: 'Stop', hi: 'रोकें', sat: 'ᱛᱷᱤᱨ', bn: 'বন্ধ', or: 'ବନ୍ଦ', ur: 'روکیں' },
  hz_voice_saved: { en: 'Voice note added', hi: 'आवाज़ जोड़ी गई', sat: 'ᱨᱚᱲ ᱥᱮᱞᱮᱫ ᱮᱱᱟ', bn: 'ভয়েস নোট যোগ হয়েছে', or: 'ଭଏସ ନୋଟ ଯୋଡ଼ାଗଲା', ur: 'وائس نوٹ شامل ہوا' },
  hz_voice_remove: { en: 'Remove voice note', hi: 'आवाज़ हटाएं', bn: 'ভয়েস নোট সরান', or: 'ଭଏସ ନୋଟ ହଟାନ୍ତୁ', ur: 'وائس نوٹ ہٹائیں' },
  hz_MIC_DENIED: { en: 'Microphone permission was refused.', hi: 'माइक्रोफ़ोन अनुमति नहीं मिली।', bn: 'মাইক্রোফোন অনুমতি দেওয়া হয়নি।', or: 'ମାଇକ୍ରୋଫୋନ ଅନୁମତି ମିଳିଲା ନାହିଁ।', ur: 'مائیکروفون اجازت نہیں ملی۔' },
  hz_MIC_UNSUPPORTED: { en: 'This device cannot record audio.', hi: 'यह डिवाइस ऑडियो रिकॉर्ड नहीं कर सकता।', bn: 'এই ডিভাইস অডিও রেকর্ড করতে পারে না।', or: 'ଏହି ଡିଭାଇସ ଅଡିଓ ରେକର୍ଡ କରିପାରିବ ନାହିଁ।', ur: 'یہ ڈیوائس آڈیو ریکارڈ نہیں کر سکتا۔' },
  hz_RECORD_FAILED: { en: 'The recording failed. Try again.', hi: 'रिकॉर्डिंग विफल। फिर कोशिश करें।', bn: 'রেকর্ডিং ব্যর্থ। আবার চেষ্টা করুন।', or: 'ରେକର୍ଡିଂ ବିଫଳ।', ur: 'ریکارڈنگ ناکام۔' },
  hz_note_optional: { en: 'Add a note (optional)', hi: 'नोट जोड़ें (वैकल्पिक)', bn: 'নোট যোগ করুন (ঐচ্ছিক)', or: 'ନୋଟ ଯୋଡ଼ନ୍ତୁ (ବିକଳ୍ପ)', ur: 'نوٹ شامل کریں (اختیاری)' },
  hz_note_placeholder: { en: 'Where exactly, and what is wrong?', hi: 'ठीक कहाँ, और क्या गलत है?', bn: 'ঠিক কোথায়, এবং কী সমস্যা?', or: 'ଠିକ କେଉଁଠି, ଏବଂ କଣ ଭୁଲ?', ur: 'بالکل کہاں، اور کیا غلط ہے؟' },
  hz_location: { en: 'Location', hi: 'स्थान', sat: 'ᱴᱷᱟᱶ', bn: 'স্থান', or: 'ସ୍ଥାନ', ur: 'مقام' },
  hz_zone_label: { en: 'Zone', hi: 'ज़ोन', bn: 'জোন', or: 'ଜୋନ', ur: 'زون' },
  hz_facing: { en: 'Facing', hi: 'दिशा', sat: 'ᱦᱚᱨ', bn: 'দিক', or: 'ଦିଗ', ur: 'سمت' },
  hz_no_direction: { en: 'Direction not available', hi: 'दिशा उपलब्ध नहीं', bn: 'দিক পাওয়া যায়নি', or: 'ଦିଗ ଉପଲବ୍ଧ ନାହିଁ', ur: 'سمت دستیاب نہیں' },
  hz_location_note: {
    en: 'Direction is recorded instead of GPS, because GPS does not work underground.',
    hi: 'GPS की जगह दिशा दर्ज होती है, क्योंकि GPS भूमिगत काम नहीं करता।',
    bn: 'GPS-এর বদলে দিক রেকর্ড হয়, কারণ GPS ভূগর্ভে কাজ করে না।',
    or: 'GPS ବଦଳରେ ଦିଗ ରେକର୍ଡ ହୁଏ, କାରଣ GPS ଭୂତଳରେ କାମ କରେ ନାହିଁ।',
    ur: 'GPS کی جگہ سمت درج ہوتی ہے، کیونکہ GPS زیر زمین کام نہیں کرتا۔',
  },
  hz_submit: { en: 'Send report', hi: 'रिपोर्ट भेजें', sat: 'ᱠᱷᱚᱵᱚᱨ ᱠᱩᱞ', bn: 'রিপোর্ট পাঠান', or: 'ରିପୋର୍ଟ ପଠାନ୍ତୁ', ur: 'رپورٹ بھیجیں' },
  hz_submitting: { en: 'Sending…', hi: 'भेजा जा रहा है…', bn: 'পাঠানো হচ্ছে…', or: 'ପଠାଯାଉଛି…', ur: 'بھیجا جا رہا ہے…' },
  hz_thanks_title: { en: 'Report filed', hi: 'रिपोर्ट दर्ज हुई', sat: 'ᱠᱷᱚᱵᱚᱨ ᱚᱞ ᱮᱱᱟ', bn: 'রিপোর্ট জমা হয়েছে', or: 'ରିପୋର୍ଟ ଦାଖଲ ହେଲା', ur: 'رپورٹ درج ہو گئی' },
  hz_thanks_body: {
    en: 'Saved on this phone and queued for your safety officer. It will sync by itself when this phone finds a network.',
    hi: 'इस फ़ोन पर सहेजा गया और सुरक्षा अधिकारी के लिए कतार में। नेटवर्क मिलने पर यह अपने आप सिंक हो जाएगा।',
    sat: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱥᱟᱸᱪᱟᱣ ᱮᱱᱟ ᱾ ᱱᱮᱴᱣᱟᱨᱠ ᱧᱟᱢ ᱠᱟᱛᱮ ᱟᱡ ᱛᱮ ᱜᱮ ᱥᱤᱸᱠ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
    bn: 'এই ফোনে সংরক্ষিত ও সেফটি অফিসারের জন্য কিউতে। নেটওয়ার্ক পেলে নিজেই সিঙ্ক হবে।',
    or: 'ଏହି ଫୋନରେ ସେଭ ଓ ସୁରକ୍ଷା ଅଧିକାରୀ ପାଇଁ ଧାଡ଼ିରେ। ନେଟୱର୍କ ମିଳିଲେ ନିଜେ ସିଙ୍କ ହେବ।',
    ur: 'اس فون پر محفوظ اور سیفٹی افسر کے لیے قطار میں۔ نیٹ ورک ملنے پر خود سنک ہو جائے گا۔',
  },
  hz_report_another: { en: 'Report another', hi: 'दूसरी रिपोर्ट करें', sat: 'ᱮᱴᱟᱜ ᱠᱷᱚᱵᱚᱨ', bn: 'আরেকটি রিপোর্ট', or: 'ଅନ୍ୟ ରିପୋର୍ଟ', ur: 'دوسری رپورٹ' },
  hz_storage_full: {
    en: 'This phone is out of storage, so the report is only held for this session. Ask your supervisor to sync soon.',
    hi: 'इस फ़ोन में जगह नहीं है, इसलिए रिपोर्ट सिर्फ़ इस सत्र तक रहेगी। सुपरवाइज़र से जल्द सिंक कराएं।',
    bn: 'এই ফোনে জায়গা নেই, তাই রিপোর্ট শুধু এই সেশনে থাকবে। শীঘ্রই সিঙ্ক করান।',
    or: 'ଏହି ଫୋନରେ ସ୍ଥାନ ନାହିଁ, ତେଣୁ ରିପୋର୍ଟ କେବଳ ଏହି ସେସନରେ ରହିବ।',
    ur: 'اس فون میں جگہ نہیں، اس لیے رپورٹ صرف اس سیشن تک رہے گی۔',
  },
  hz_my_reports: { en: 'Your reports', hi: 'आपकी रिपोर्टें', sat: 'ᱟᱢᱟᱜ ᱠᱷᱚᱵᱚᱨ ᱠᱚ', bn: 'আপনার রিপোর্ট', or: 'ଆପଣଙ୍କ ରିପୋର୍ଟ', ur: 'آپ کی رپورٹیں' },
  hz_none_yet: { en: 'You have not reported anything yet.', hi: 'आपने अभी कुछ रिपोर्ट नहीं किया।', bn: 'আপনি এখনও কিছু রিপোর্ট করেননি।', or: 'ଆପଣ ଏପର୍ଯ୍ୟନ୍ତ କିଛି ରିପୋର୍ଟ କରିନାହାନ୍ତି।', ur: 'آپ نے ابھی کچھ رپورٹ نہیں کیا۔' },
  hz_status_open: { en: 'Open', hi: 'खुला', sat: 'ᱡᱷᱤᱡ', bn: 'খোলা', or: 'ଖୋଲା', ur: 'کھلا' },
  hz_status_acknowledged: { en: 'Seen by safety officer', hi: 'सुरक्षा अधिकारी ने देखा', bn: 'সেফটি অফিসার দেখেছেন', or: 'ସୁରକ୍ଷା ଅଧିକାରୀ ଦେଖିଛନ୍ତି', ur: 'سیفٹی افسر نے دیکھا' },
  hz_status_resolved: { en: 'Fixed', hi: 'ठीक हो गया', sat: 'ᱴᱷᱤᱠ ᱮᱱᱟ', bn: 'ঠিক হয়েছে', or: 'ଠିକ ହେଲା', ur: 'ٹھیک ہو گیا' },
  hz_status_dismissed: { en: 'Closed without action', hi: 'बिना कार्रवाई बंद', bn: 'ব্যবস্থা ছাড়া বন্ধ', or: 'କାର୍ଯ୍ୟ ବିନା ବନ୍ଦ', ur: 'کارروائی کے بغیر بند' },

  hz_cat_blocked_exit: { en: 'Exit is blocked', hi: 'निकास अवरुद्ध है', sat: 'ᱚᱰᱚᱠ ᱦᱚᱨ ᱵᱚᱸᱫᱚ', bn: 'প্রস্থান আটকে আছে', or: 'ନିର୍ଗମ ଅବରୋଧିତ', ur: 'راستہ بند ہے' },
  hz_cat_wiring: { en: 'Exposed wiring', hi: 'खुली तार', sat: 'ᱡᱷᱤᱡ ᱛᱟᱨ', bn: 'খোলা তার', or: 'ଖୋଲା ତାର', ur: 'کھلی تار' },
  hz_cat_guard: { en: 'Machine guard missing', hi: 'मशीन गार्ड गायब', sat: 'ᱢᱮᱥᱤᱱ ᱜᱟᱨᱰ ᱵᱟᱝ', bn: 'মেশিন গার্ড নেই', or: 'ମେସିନ ଗାର୍ଡ ନାହିଁ', ur: 'مشین گارڈ غائب' },
  hz_cat_extinguisher: { en: 'Extinguisher missing or empty', hi: 'अग्निशामक गायब या खाली', sat: 'ᱥᱮᱸᱜᱮᱞ ᱦᱩᱭᱩᱠ ᱵᱟᱝ', bn: 'অগ্নিনির্বাপক নেই বা খালি', or: 'ଅଗ୍ନିଶମକ ନାହିଁ କିମ୍ବା ଖାଲି', ur: 'آگ بجھانے والا غائب یا خالی' },
  hz_cat_gas: { en: 'Gas smell', hi: 'गैस की गंध', sat: 'ᱜᱮᱥ ᱥᱟᱶ', bn: 'গ্যাসের গন্ধ', or: 'ଗ୍ୟାସ ଗନ୍ଧ', ur: 'گیس کی بو' },
  hz_cat_dust: { en: 'Too much dust', hi: 'बहुत धूल', sat: 'ᱟᱭᱢᱟ ᱫᱷᱩᱲᱤ', bn: 'অত্যধিক ধুলো', or: 'ବହୁତ ଧୂଳି', ur: 'بہت گرد' },
  hz_cat_load: { en: 'Unstable stacked load', hi: 'अस्थिर ढेर', sat: 'ᱴᱷᱟᱶ ᱵᱟᱝ ᱛᱟᱦᱮᱸᱱ ᱡᱤᱱᱤᱥ', bn: 'অস্থির স্তূপ', or: 'ଅସ୍ଥିର ଗଦା', ur: 'غیر مستحکم ڈھیر' },
  hz_cat_equipment: { en: 'Damaged equipment', hi: 'क्षतिग्रस्त उपकरण', sat: 'ᱦᱟᱹᱲᱤᱭᱟᱜ ᱡᱤᱱᱤᱥ', bn: 'ক্ষতিগ্রস্ত যন্ত্রপাতি', or: 'କ୍ଷତିଗ୍ରସ୍ତ ଉପକରଣ', ur: 'خراب سامان' },
  hz_cat_ppe: { en: 'Someone without PPE', hi: 'कोई बिना PPE', sat: 'ᱡᱟᱦᱟᱸ ᱦᱚᱲ PPE ᱵᱟᱝ', bn: 'কেউ PPE ছাড়া', or: 'କେହି PPE ବିନା', ur: 'کوئی PPE کے بغیر' },
  hz_cat_loto: { en: 'Work without lockout', hi: 'लॉकआउट बिना काम', bn: 'লকআউট ছাড়া কাজ', or: 'ଲକଆଉଟ ବିନା କାମ', ur: 'لاک آؤٹ کے بغیر کام' },
  hz_cat_other: { en: 'Something else', hi: 'कुछ और', sat: 'ᱮᱴᱟᱜ ᱡᱤᱱᱤᱥ', bn: 'অন্য কিছু', or: 'ଅନ୍ୟ କିଛି', ur: 'کچھ اور' },
}

/* ================================================================== */
/* Assessment, drill runner and refreshers                             */
/* ================================================================== */

const ASSESSMENT = {
  as_readiness: { en: 'Readiness', hi: 'तैयारी', sat: 'ᱛᱮᱭᱟᱨᱤ', bn: 'প্রস্তুতি', or: 'ପ୍ରସ୍ତୁତି', ur: 'تیاری' },
  as_accuracy: { en: 'Correct answers', hi: 'सही उत्तर', sat: 'ᱴᱷᱤᱠ ᱛᱮᱞᱟ', bn: 'সঠিক উত্তর', or: 'ସଠିକ ଉତ୍ତର', ur: 'درست جوابات' },
  as_speed: { en: 'Reaction speed', hi: 'प्रतिक्रिया गति', sat: 'ᱛᱮᱞᱟ ᱞᱚᱜᱚᱱ', bn: 'প্রতিক্রিয়ার গতি', or: 'ପ୍ରତିକ୍ରିୟା ଗତି', ur: 'ردعمل کی رفتار' },
  as_your_time: { en: 'Your time', hi: 'आपका समय', sat: 'ᱟᱢᱟᱜ ᱚᱠᱛᱚ', bn: 'আপনার সময়', or: 'ଆପଣଙ୍କ ସମୟ', ur: 'آپ کا وقت' },
  as_target_time: { en: 'Target', hi: 'लक्ष्य', sat: 'ᱞᱟᱠᱷᱟᱭ', bn: 'লক্ষ্য', or: 'ଲକ୍ଷ୍ୟ', ur: 'ہدف' },
  as_grade_fast: { en: 'Decisive', hi: 'निर्णायक', sat: 'ᱞᱚᱜᱚᱱ', bn: 'দ্রুত', or: 'ଦ୍ରୁତ', ur: 'فیصلہ کن' },
  as_grade_normal: { en: 'Acceptable', hi: 'स्वीकार्य', sat: 'ᱦᱩᱭᱩᱜᱼᱟ', bn: 'গ্রহণযোগ্য', or: 'ଗ୍ରହଣୀୟ', ur: 'قابل قبول' },
  as_grade_slow: { en: 'Hesitated', hi: 'हिचकिचाहट', sat: 'ᱴᱷᱤᱠᱟᱹᱣ ᱠᱮᱫᱟᱢ', bn: 'দ্বিধা', or: 'ଦ୍ୱିଧା', ur: 'ہچکچاہٹ' },
  as_grade_unknown: { en: 'Not timed', hi: 'समय नहीं लिया', bn: 'সময় নেওয়া হয়নি', or: 'ସମୟ ନିଆଯାଇନାହିଁ', ur: 'وقت نہیں لیا' },
  as_hesitation_title: { en: 'You knew it, but you were slow', hi: 'आपको पता था, पर देर हुई', sat: 'ᱟᱢ ᱵᱟᱰᱟᱭ ᱠᱟᱫᱟᱢ, ᱢᱮᱱᱠᱷᱟᱱ ᱫᱮᱨᱤ ᱦᱩᱭ ᱮᱱᱟ', bn: 'আপনি জানতেন, কিন্তু দেরি করেছেন', or: 'ଆପଣ ଜାଣିଥିଲେ, କିନ୍ତୁ ଦେରି କଲେ', ur: 'آپ کو معلوم تھا، مگر دیر ہوئی' },
  as_hesitation_body: {
    en: 'In a real emergency that pause is the gap between walking out and being carried out. This is flagged for a repeat, not because you were wrong.',
    hi: 'असली आपात स्थिति में वह ठहराव खुद चलकर निकलने और उठाकर ले जाने के बीच का अंतर है। इसे दोहराने के लिए चिह्नित किया गया है, गलती के कारण नहीं।',
    sat: 'ᱥᱟᱹᱨᱤ ᱡᱚᱠᱷᱚᱢ ᱨᱮ ᱚᱱᱟ ᱫᱮᱨᱤ ᱡᱤᱭᱚᱸ ᱟᱨ ᱢᱚᱨᱚᱸ ᱛᱟᱞᱟ ᱨᱮᱭᱟᱜ ᱯᱷᱟᱨᱟᱠ ᱠᱟᱱᱟ ᱾',
    bn: 'সত্যিকারের বিপদে সেই দেরিই হেঁটে বেরোনো আর বহন করে নিয়ে যাওয়ার পার্থক্য। ভুল করেননি, তবু পুনরাবৃত্তির জন্য চিহ্নিত।',
    or: 'ପ୍ରକୃତ ବିପଦରେ ସେହି ବିଳମ୍ବ ହିଁ ଚାଲି ବାହାରିବା ଓ ବୋହି ନେବା ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ।',
    ur: 'حقیقی ایمرجنسی میں وہ تاخیر خود چل کر نکلنے اور اٹھا کر لے جانے کا فرق ہے۔',
  },
  as_decide_now: { en: 'Decide now', hi: 'अभी निर्णय लें', sat: 'ᱛᱮᱦᱮᱸ ᱜᱮ ᱴᱷᱤᱠᱟᱹᱣ', bn: 'এখনই সিদ্ধান্ত নিন', or: 'ଏବେ ନିଷ୍ପତ୍ତି ନିଅନ୍ତୁ', ur: 'ابھی فیصلہ کریں' },
  as_time_pressure: { en: 'You are being timed', hi: 'आपका समय गिना जा रहा है', sat: 'ᱟᱢᱟᱜ ᱚᱠᱛᱚ ᱞᱮᱠᱷᱟ ᱠᱟᱱᱟ', bn: 'আপনার সময় গোনা হচ্ছে', or: 'ଆପଣଙ୍କ ସମୟ ଗଣାଯାଉଛି', ur: 'آپ کا وقت گنا جا رہا ہے' },
  as_listen_again: { en: 'Read it aloud again', hi: 'फिर सुनाएं', sat: 'ᱫᱚᱦᱲᱟ ᱟᱸᱡᱚᱢ', bn: 'আবার শোনান', or: 'ପୁଣି ଶୁଣାନ୍ତୁ', ur: 'دوبارہ سنائیں' },
  as_speak_answer: { en: 'Speak your answer', hi: 'बोलकर उत्तर दें', sat: 'ᱨᱚᱲ ᱠᱟᱛᱮ ᱛᱮᱞᱟ', bn: 'বলে উত্তর দিন', or: 'କହି ଉତ୍ତର ଦିଅନ୍ତୁ', ur: 'بول کر جواب دیں' },
  as_listening: { en: 'Listening…', hi: 'सुन रहा है…', sat: 'ᱟᱸᱡᱚᱢ ᱠᱟᱱᱟ…', bn: 'শুনছি…', or: 'ଶୁଣୁଛି…', ur: 'سن رہا ہے…' },
  as_say_one_or_two: { en: 'Say "one" or "two"', hi: '"एक" या "दो" बोलें', sat: '"ᱢᱤᱫ" ᱥᱮ "ᱵᱟᱨ" ᱨᱚᱲ', bn: '"এক" বা "দুই" বলুন', or: '"ଏକ" କିମ୍ବା "ଦୁଇ" କୁହନ୍ତୁ', ur: '"ایک" یا "دو" کہیں' },
  as_NO_MATCH: { en: 'Did not catch that. Say "one" or "two", or tap.', hi: 'समझ नहीं आया। "एक" या "दो" बोलें, या टैप करें।', bn: 'বুঝতে পারিনি। "এক" বা "দুই" বলুন, বা ট্যাপ করুন।', or: 'ବୁଝିପାରିଲି ନାହିଁ। "ଏକ" କିମ୍ବା "ଦୁଇ" କୁହନ୍ତୁ।', ur: 'سمجھ نہیں آیا۔ "ایک" یا "دو" کہیں۔' },
  as_NO_SPEECH: { en: 'Heard nothing. Try again closer to the phone.', hi: 'कुछ सुना नहीं। फ़ोन के पास बोलें।', bn: 'কিছু শোনা যায়নি। ফোনের কাছে বলুন।', or: 'କିଛି ଶୁଣାଗଲା ନାହିଁ। ଫୋନ ପାଖରେ କୁହନ୍ତୁ।', ur: 'کچھ سنائی نہیں دیا۔ فون کے قریب بولیں۔' },
  as_PERMISSION_DENIED: { en: 'Microphone permission was refused, so voice answers are off.', hi: 'माइक्रोफ़ोन अनुमति नहीं मिली, इसलिए आवाज़ से उत्तर बंद है।', bn: 'মাইক্রোফোন অনুমতি নেই, তাই ভয়েস উত্তর বন্ধ।', or: 'ମାଇକ୍ରୋଫୋନ ଅନୁମତି ନାହିଁ, ତେଣୁ ଭଏସ ଉତ୍ତର ବନ୍ଦ।', ur: 'مائیکروفون اجازت نہیں، اس لیے آواز سے جواب بند۔' },
  as_UNSUPPORTED: { en: 'This browser cannot listen for spoken answers.', hi: 'यह ब्राउज़र बोले गए उत्तर नहीं सुन सकता।', bn: 'এই ব্রাউজার কথ্য উত্তর শুনতে পারে না।', or: 'ଏହି ବ୍ରାଉଜର କଥିତ ଉତ୍ତର ଶୁଣିପାରିବ ନାହିଁ।', ur: 'یہ براؤزر بولے گئے جواب نہیں سن سکتا۔' },
  as_NETWORK: { en: 'Speech recognition needs a connection on this device.', hi: 'इस डिवाइस पर वाक् पहचान को कनेक्शन चाहिए।', bn: 'এই ডিভাইসে স্পিচ রিকগনিশনের সংযোগ দরকার।', or: 'ଏହି ଡିଭାଇସରେ ସ୍ପିଚ ରିକଗନିଶନ ପାଇଁ ସଂଯୋଗ ଦରକାର।', ur: 'اس ڈیوائس پر تقریر کی شناخت کے لیے کنکشن درکار۔' },
  as_AUDIO: { en: 'The microphone could not be opened.', hi: 'माइक्रोफ़ोन नहीं खुला।', bn: 'মাইক্রোফোন খোলা যায়নি।', or: 'ମାଇକ୍ରୋଫୋନ ଖୋଲିପାରିଲା ନାହିଁ।', ur: 'مائیکروفون نہیں کھلا۔' },
  as_UNKNOWN: { en: 'Voice input had a problem. Tap instead.', hi: 'आवाज़ में दिक्कत हुई। टैप करें।', bn: 'ভয়েসে সমস্যা হয়েছে। ট্যাপ করুন।', or: 'ଭଏସରେ ସମସ୍ୟା। ଟ୍ୟାପ କରନ୍ତୁ।', ur: 'آواز میں مسئلہ ہوا۔ ٹیپ کریں۔' },

  gauge_low: { en: 'LOW RISK', hi: 'कम जोखिम', sat: 'ᱠᱚᱢ ᱡᱚᱠᱷᱚᱢ', bn: 'কম ঝুঁকি', or: 'କମ ବିପଦ', ur: 'کم خطرہ' },
  gauge_moderate: { en: 'MODERATE RISK', hi: 'मध्यम जोखिम', sat: 'ᱢᱟᱡᱷᱮᱡ ᱡᱚᱠᱷᱚᱢ', bn: 'মধ্যম ঝুঁকি', or: 'ମଧ୍ୟମ ବିପଦ', ur: 'درمیانہ خطرہ' },
  gauge_high: { en: 'HIGH RISK', hi: 'उच्च जोखिम', sat: 'ᱡᱟᱥᱛᱤ ᱡᱚᱠᱷᱚᱢ', bn: 'উচ্চ ঝুঁকি', or: 'ଅଧିକ ବିପଦ', ur: 'زیادہ خطرہ' },

  rf_eyebrow: { en: 'Retention', hi: 'स्मृति', sat: 'ᱫᱚᱦᱚᱭ', bn: 'ধারণ', or: 'ଧାରଣ', ur: 'یادداشت' },
  rf_title: { en: 'Keep it fresh', hi: 'याद बनाए रखें', sat: 'ᱩᱭᱦᱟᱹᱨ ᱫᱚᱦᱚᱭ ᱢᱮ', bn: 'মনে রাখুন', or: 'ମନେ ରଖନ୍ତୁ', ur: 'یاد رکھیں' },
  rf_desc: {
    en: 'Safety training fades within a week. A ninety-second check every few days is what keeps it usable — so your readiness score drops if you skip them, and recovers when you do them.',
    hi: 'सुरक्षा प्रशिक्षण एक हफ़्ते में फीका पड़ जाता है। हर कुछ दिन में नब्बे सेकंड की जांच ही इसे काम लायक रखती है — छोड़ने पर तैयारी स्कोर गिरता है, करने पर सुधरता है।',
    sat: 'ᱨᱠᱷᱟ ᱛᱟᱞᱤᱢ ᱢᱤᱫ ᱦᱟᱛᱟ ᱨᱮ ᱦᱤᱲᱤᱡᱚᱜᱼᱟ ᱾ ᱠᱚᱲᱟ ᱢᱟᱦᱟᱸ ᱛᱟᱞᱟ ᱨᱮ ᱠᱩᱲᱟᱹᱭ ᱠᱟᱛᱮ ᱩᱭᱦᱟᱹᱨ ᱫᱚᱦᱚ ᱦᱚᱪᱚᱜᱼᱟ ᱾',
    bn: 'নিরাপত্তা প্রশিক্ষণ এক সপ্তাহে ফিকে হয়ে যায়। কয়েকদিন পর নব্বই সেকেন্ডের চেকই এটিকে কাজের রাখে।',
    or: 'ସୁରକ୍ଷା ତାଲିମ ଏକ ସପ୍ତାହରେ ଫିକା ପଡ଼େ। କିଛି ଦିନ ପରେ ନବେ ସେକେଣ୍ଡର ଯାଞ୍ଚ ହିଁ ଏହାକୁ କାମ ଯୋଗ୍ୟ ରଖେ।',
    ur: 'حفاظتی تربیت ایک ہفتے میں دھندلا جاتی ہے۔ ہر چند دن نوے سیکنڈ کی جانچ ہی اسے قابل استعمال رکھتی ہے۔',
  },
  rf_none_due: { en: 'Nothing due right now. Well done.', hi: 'अभी कुछ बाकी नहीं। शाबाश।', sat: 'ᱛᱮᱦᱮᱸ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱾ ᱵᱮᱥ ᱾', bn: 'এখন কিছু বাকি নেই। ভালো।', or: 'ଏବେ କିଛି ବାକି ନାହିଁ।', ur: 'ابھی کچھ باقی نہیں۔' },
  rf_due_now: { en: 'Due now', hi: 'अभी बाकी', sat: 'ᱛᱮᱦᱮᱸ ᱞᱟᱹᱠᱛᱤ', bn: 'এখন বাকি', or: 'ଏବେ ବାକି', ur: 'ابھی باقی' },
  rf_overdue_by: { en: 'overdue by', hi: 'देर से', bn: 'দেরি', or: 'ବିଳମ୍ବ', ur: 'تاخیر' },
  rf_days: { en: 'days', hi: 'दिन', sat: 'ᱢᱟᱦᱟᱸ', bn: 'দিন', or: 'ଦିନ', ur: 'دن' },
  rf_next_in: { en: 'Next check in', hi: 'अगली जांच', sat: 'ᱤᱱᱟᱹ ᱛᱟᱭᱚᱢ', bn: 'পরবর্তী চেক', or: 'ପରବର୍ତ୍ତୀ ଯାଞ୍ଚ', ur: 'اگلی جانچ' },
  rf_start: { en: 'Start 90-second check', hi: '90 सेकंड की जांच शुरू करें', sat: '90 ᱥᱮᱠᱮᱸᱰ ᱠᱩᱲᱟᱹᱭ ᱮᱦᱚᱵ', bn: '৯০ সেকেন্ডের চেক শুরু', or: '୯୦ ସେକେଣ୍ଡ ଯାଞ୍ଚ ଆରମ୍ଭ', ur: '90 سیکنڈ کی جانچ شروع' },
  rf_never_trained: { en: 'Not trained yet', hi: 'अभी प्रशिक्षण नहीं', sat: 'ᱛᱟᱞᱤᱢ ᱵᱟᱝ ᱦᱩᱭ ᱮᱱᱟ', bn: 'এখনও প্রশিক্ষণ হয়নি', or: 'ଏପର୍ଯ୍ୟନ୍ତ ତାଲିମ ନାହିଁ', ur: 'ابھی تربیت نہیں' },
  rf_passed: { en: 'Passed — readiness restored', hi: 'पास — तैयारी बहाल', sat: 'ᱯᱟᱥ — ᱛᱮᱭᱟᱨᱤ ᱫᱚᱦᱲᱟ', bn: 'পাস — প্রস্তুতি ফিরেছে', or: 'ପାସ — ପ୍ରସ୍ତୁତି ଫେରିଲା', ur: 'پاس — تیاری بحال' },
  rf_failed: { en: 'Not passed — this comes back in two days', hi: 'पास नहीं — यह दो दिन में फिर आएगा', bn: 'পাস হয়নি — দুই দিনে আবার আসবে', or: 'ପାସ ନାହିଁ — ଦୁଇ ଦିନରେ ପୁଣି ଆସିବ', ur: 'پاس نہیں — دو دن میں دوبارہ آئے گا' },
  rf_enable_reminders: { en: 'Remind me', hi: 'याद दिलाएं', sat: 'ᱩᱭᱦᱟᱹᱨ ᱦᱚᱪᱚᱭ', bn: 'মনে করিয়ে দিন', or: 'ମନେ ପକାଇ ଦିଅନ୍ତୁ', ur: 'یاد دلائیں' },
  rf_reminders_on: { en: 'Reminders on', hi: 'रिमाइंडर चालू', bn: 'রিমাইন্ডার চালু', or: 'ରିମାଇଣ୍ଡର ଚାଲୁ', ur: 'یاد دہانی چالو' },
  rf_reminders_blocked: { en: 'Notifications are blocked in your browser settings.', hi: 'ब्राउज़र सेटिंग्स में सूचनाएं अवरुद्ध हैं।', bn: 'ব্রাউজার সেটিংসে বিজ্ঞপ্তি ব্লক করা।', or: 'ବ୍ରାଉଜର ସେଟିଂସରେ ବିଜ୍ଞପ୍ତି ଅବରୋଧିତ।', ur: 'براؤزر سیٹنگز میں اطلاعات بلاک ہیں۔' },
  rf_reminders_unsupported: { en: 'This browser cannot show reminders.', hi: 'यह ब्राउज़र रिमाइंडर नहीं दिखा सकता।', bn: 'এই ব্রাউজার রিমাইন্ডার দেখাতে পারে না।', or: 'ଏହି ବ୍ରାଉଜର ରିମାଇଣ୍ଡର ଦେଖାଇ ପାରିବ ନାହିଁ।', ur: 'یہ براؤزر یاد دہانی نہیں دکھا سکتا۔' },
  rf_web_limit: {
    en: 'Reminders appear when you open the app. A phone cannot be woken on a schedule from a web page — the installed Android build can.',
    hi: 'रिमाइंडर ऐप खोलने पर दिखते हैं। वेब पेज से फ़ोन को समय पर जगाया नहीं जा सकता — इंस्टॉल किया Android बिल्ड कर सकता है।',
    bn: 'অ্যাপ খুললে রিমাইন্ডার দেখা যায়। ওয়েব পেজ থেকে নির্দিষ্ট সময়ে ফোন জাগানো যায় না।',
    or: 'ଆପ ଖୋଲିଲେ ରିମାଇଣ୍ଡର ଦେଖାଯାଏ। ୱେବ ପେଜରୁ ନିର୍ଦ୍ଦିଷ୍ଟ ସମୟରେ ଫୋନ ଜାଗ୍ରତ କରାଯାଇ ପାରିବ ନାହିଁ।',
    ur: 'ایپ کھولنے پر یاد دہانی دکھتی ہے۔ ویب پیج سے فون کو مقررہ وقت پر جگایا نہیں جا سکتا۔',
  },
}

/* ================================================================== */
/* Certificates, ledger and verification                               */
/* ================================================================== */

const LEDGER = {
  cert_readiness_now: { en: 'Readiness today', hi: 'आज की तैयारी', sat: 'ᱛᱮᱦᱮᱸᱟᱜ ᱛᱮᱭᱟᱨᱤ', bn: 'আজকের প্রস্তুতি', or: 'ଆଜିର ପ୍ରସ୍ତୁତି', ur: 'آج کی تیاری' },
  cert_decay_note: {
    en: 'This is your score as it stands today, not on the day you passed. It falls if you skip refreshers.',
    hi: 'यह आज का स्कोर है, पास होने के दिन का नहीं। रिफ्रेशर छोड़ने पर यह गिरता है।',
    bn: 'এটি আজকের স্কোর, পাসের দিনের নয়। রিফ্রেশার বাদ দিলে কমে যায়।',
    or: 'ଏହା ଆଜିର ସ୍କୋର, ପାସ ଦିନର ନୁହେଁ। ରିଫ୍ରେସର ଛାଡ଼ିଲେ କମେ।',
    ur: 'یہ آج کا اسکور ہے، پاس ہونے کے دن کا نہیں۔',
  },
  cert_sign_in_first: { en: 'Sign in to claim a certificate', hi: 'प्रमाणपत्र के लिए साइन इन करें', bn: 'সার্টিফিকেটের জন্য সাইন ইন করুন', or: 'ପ୍ରମାଣପତ୍ର ପାଇଁ ସାଇନ ଇନ କରନ୍ତୁ', ur: 'سرٹیفکیٹ کے لیے سائن ان کریں' },
  cert_sign_in_why: {
    en: 'A certificate names a specific worker, so it needs a signed-in record rather than an anonymous session.',
    hi: 'प्रमाणपत्र में विशिष्ट श्रमिक का नाम होता है, इसलिए इसे साइन-इन रिकॉर्ड चाहिए, गुमनाम सत्र नहीं।',
    bn: 'সার্টিফিকেটে নির্দিষ্ট কর্মীর নাম থাকে, তাই সাইন-ইন রেকর্ড দরকার।',
    or: 'ପ୍ରମାଣପତ୍ରରେ ନିର୍ଦ୍ଦିଷ୍ଟ କର୍ମୀର ନାମ ଥାଏ, ତେଣୁ ସାଇନ-ଇନ ରେକର୍ଡ ଦରକାର।',
    ur: 'سرٹیفکیٹ میں مخصوص ورکر کا نام ہوتا ہے، اس لیے سائن ان ریکارڈ درکار ہے۔',
  },
  cert_chain_position: { en: 'Ledger position', hi: 'लेजर स्थिति', bn: 'লেজার অবস্থান', or: 'ଲେଜର ସ୍ଥିତି', ur: 'لیجر پوزیشن' },
  cert_record_hash: { en: 'Record hash', hi: 'रिकॉर्ड हैश', bn: 'রেকর্ড হ্যাশ', or: 'ରେକର୍ଡ ହ୍ୟାସ', ur: 'ریکارڈ ہیش' },
  cert_prev_hash: { en: 'Links to', hi: 'जुड़ा है', bn: 'যুক্ত', or: 'ଯୁକ୍ତ', ur: 'جڑا ہے' },
  cert_offline_note: {
    en: 'The QR carries the whole signed record, so an inspector can verify it with no network and no copy of the ledger.',
    hi: 'QR में पूरा हस्ताक्षरित रिकॉर्ड है, इसलिए निरीक्षक बिना नेटवर्क और बिना लेजर की कॉपी के इसे सत्यापित कर सकता है।',
    sat: 'QR ᱨᱮ ᱡᱚᱛᱚ ᱨᱮᱠᱚᱰ ᱢᱮᱱᱟᱜᱼᱟ, ᱚᱱᱟᱛᱮ ᱱᱮᱴᱣᱟᱨᱠ ᱵᱟᱝ ᱛᱟᱦᱮᱸᱠᱷᱟᱱ ᱦᱚᱸ ᱡᱟᱹᱨᱩᱭ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
    bn: 'QR-এ সম্পূর্ণ স্বাক্ষরিত রেকর্ড থাকে, তাই নেটওয়ার্ক বা লেজারের কপি ছাড়াই যাচাই করা যায়।',
    or: 'QR ରେ ସମ୍ପୂର୍ଣ୍ଣ ସ୍ୱାକ୍ଷରିତ ରେକର୍ଡ ଥାଏ, ତେଣୁ ନେଟୱର୍କ ବିନା ଯାଞ୍ଚ କରାଯାଇପାରେ।',
    ur: 'QR میں مکمل دستخط شدہ ریکارڈ ہوتا ہے، اس لیے نیٹ ورک کے بغیر تصدیق ہو سکتی ہے۔',
  },
  cert_weak_crypto: {
    en: 'This device could not use hardware-grade signing, so certificates it issues carry a weaker signature. Verification still detects tampering.',
    hi: 'यह डिवाइस हार्डवेयर-स्तर हस्ताक्षर नहीं कर सका, इसलिए इससे जारी प्रमाणपत्रों का हस्ताक्षर कमज़ोर है। सत्यापन अब भी छेड़छाड़ पकड़ता है।',
    bn: 'এই ডিভাইস হার্ডওয়্যার-স্তরের স্বাক্ষর করতে পারেনি, তাই স্বাক্ষর দুর্বল। যাচাই এখনও কারচুপি ধরে।',
    or: 'ଏହି ଡିଭାଇସ ହାର୍ଡୱେର-ସ୍ତରୀୟ ସ୍ୱାକ୍ଷର କରିପାରିଲା ନାହିଁ, ତେଣୁ ସ୍ୱାକ୍ଷର ଦୁର୍ବଳ।',
    ur: 'یہ ڈیوائس ہارڈ ویئر درجے کے دستخط نہیں کر سکا، اس لیے دستخط کمزور ہے۔',
  },
  cert_issue_again: { en: 'Issue an updated certificate', hi: 'अद्यतन प्रमाणपत्र जारी करें', bn: 'হালনাগাদ সার্টিফিকেট ইস্যু করুন', or: 'ଅଦ୍ୟତନ ପ୍ରମାଣପତ୍ର ଜାରି କରନ୍ତୁ', ur: 'اپ ڈیٹ شدہ سرٹیفکیٹ جاری کریں' },
  cert_existing_note: { en: 'You already hold a certificate. Issuing again records a fresh readiness snapshot.', hi: 'आपके पास प्रमाणपत्र है। दोबारा जारी करने पर नई तैयारी दर्ज होगी।', bn: 'আপনার সার্টিফিকেট আছে। আবার ইস্যু করলে নতুন প্রস্তুতি রেকর্ড হবে।', or: 'ଆପଣଙ୍କ ପାଖରେ ପ୍ରମାଣପତ୍ର ଅଛି।', ur: 'آپ کے پاس سرٹیفکیٹ ہے۔' },

  chain_OK: { en: 'Intact', hi: 'अक्षुण्ण', sat: 'ᱴᱷᱤᱠ', bn: 'অক্ষত', or: 'ଅକ୍ଷତ', ur: 'برقرار' },
  chain_BAD_HASH: { en: 'Record was altered after signing', hi: 'हस्ताक्षर के बाद रिकॉर्ड बदला गया', bn: 'স্বাক্ষরের পর রেকর্ড বদলানো হয়েছে', or: 'ସ୍ୱାକ୍ଷର ପରେ ରେକର୍ଡ ବଦଳାଯାଇଛି', ur: 'دستخط کے بعد ریکارڈ بدلا گیا' },
  chain_BROKEN_LINK: { en: 'Record does not link to the one before it', hi: 'रिकॉर्ड पिछले से नहीं जुड़ता', bn: 'রেকর্ড পূর্বেরটির সাথে যুক্ত নয়', or: 'ରେକର୍ଡ ପୂର୍ବବର୍ତ୍ତୀ ସହ ଯୁକ୍ତ ନାହିଁ', ur: 'ریکارڈ پچھلے سے نہیں جڑتا' },
  chain_BAD_SIGNATURE: { en: 'Signature does not verify', hi: 'हस्ताक्षर सत्यापित नहीं', bn: 'স্বাক্ষর যাচাই হয়নি', or: 'ସ୍ୱାକ୍ଷର ଯାଞ୍ଚ ହେଲା ନାହିଁ', ur: 'دستخط تصدیق نہیں ہوا' },
  chain_UNKNOWN_SIGNER: { en: 'Signed by a device this phone does not know', hi: 'अज्ञात डिवाइस द्वारा हस्ताक्षरित', bn: 'অজানা ডিভাইস দ্বারা স্বাক্ষরিত', or: 'ଅଜ୍ଞାତ ଡିଭାଇସ ଦ୍ୱାରା ସ୍ୱାକ୍ଷରିତ', ur: 'نامعلوم ڈیوائس سے دستخط شدہ' },
  chain_SEQ_GAP: { en: 'A record is missing from the sequence', hi: 'क्रम में एक रिकॉर्ड गायब', bn: 'ক্রমে একটি রেকর্ড অনুপস্থিত', or: 'କ୍ରମରେ ଏକ ରେକର୍ଡ ନାହିଁ', ur: 'ترتیب میں ایک ریکارڈ غائب' },
  chain_FORK: { en: 'Two records claim the same position', hi: 'दो रिकॉर्ड एक ही स्थान का दावा करते हैं', bn: 'দুটি রেকর্ড একই অবস্থান দাবি করে', or: 'ଦୁଇଟି ରେକର୍ଡ ସମାନ ସ୍ଥିତି ଦାବି କରେ', ur: 'دو ریکارڈ ایک ہی پوزیشن کا دعوی کرتے ہیں' },
  chain_DOMAIN_MISMATCH: { en: 'Record covers a different set of domains', hi: 'रिकॉर्ड अलग डोमेन सेट का है', bn: 'রেকর্ড ভিন্ন ডোমেন সেটের', or: 'ରେକର୍ଡ ଭିନ୍ନ ଡୋମେନ ସେଟର', ur: 'ریکارڈ مختلف ڈومین سیٹ کا ہے' },
  chain_UNSUPPORTED_VERSION: { en: 'Record uses a newer format', hi: 'रिकॉर्ड नए फॉर्मेट में है', bn: 'রেকর্ড নতুন ফরম্যাটে', or: 'ରେକର୍ଡ ନୂଆ ଫର୍ମାଟରେ', ur: 'ریکارڈ نئے فارمیٹ میں ہے' },

  vf_scan_or_paste: { en: 'Scan a certificate QR, or paste its code', hi: 'प्रमाणपत्र QR स्कैन करें, या कोड पेस्ट करें', bn: 'সার্টিফিকেট QR স্ক্যান করুন, বা কোড পেস্ট করুন', or: 'ପ୍ରମାଣପତ୍ର QR ସ୍କାନ କରନ୍ତୁ', ur: 'سرٹیفکیٹ QR اسکین کریں، یا کوڈ پیسٹ کریں' },
  vf_paste_placeholder: { en: 'Paste JGK1… here', hi: 'JGK1… यहाँ पेस्ट करें', bn: 'JGK1… এখানে পেস্ট করুন', or: 'JGK1… ଏଠାରେ ପେଷ୍ଟ କରନ୍ତୁ', ur: 'JGK1… یہاں پیسٹ کریں' },
  vf_check_now: { en: 'Verify', hi: 'सत्यापित करें', sat: 'ᱡᱟᱹᱨᱩᱭ ᱢᱮ', bn: 'যাচাই করুন', or: 'ଯାଞ୍ଚ କରନ୍ତୁ', ur: 'تصدیق کریں' },
  vf_unreadable: { en: 'That is not a Jaagruk certificate.', hi: 'यह जागरुक प्रमाणपत्र नहीं है।', bn: 'এটি জাগরুক সার্টিফিকেট নয়।', or: 'ଏହା ଜାଗରୁକ ପ୍ରମାଣପତ୍ର ନୁହେଁ।', ur: 'یہ جاگروک سرٹیفکیٹ نہیں ہے۔' },
  vf_genuine: { en: 'Genuine and unaltered', hi: 'असली और अपरिवर्तित', sat: 'ᱥᱟᱹᱨᱤ ᱟᱨ ᱵᱟᱝ ᱵᱚᱫᱚᱞ', bn: 'আসল ও অপরিবর্তিত', or: 'ପ୍ରକୃତ ଓ ଅପରିବର୍ତ୍ତିତ', ur: 'اصل اور غیر تبدیل شدہ' },
  vf_tampered: { en: 'This certificate has been tampered with', hi: 'इस प्रमाणपत्र से छेड़छाड़ हुई है', sat: 'ᱱᱚᱶᱟ ᱯᱚᱨᱢᱟᱱ ᱨᱮ ᱦᱟᱹᱴᱤᱧ ᱦᱩᱭ ᱟᱠᱟᱱᱟ', bn: 'এই সার্টিফিকেটে কারচুপি হয়েছে', or: 'ଏହି ପ୍ରମାଣପତ୍ରରେ ଛେଡ଼ାଛେଡ଼ି ହୋଇଛି', ur: 'اس سرٹیفکیٹ سے چھیڑ چھاڑ ہوئی ہے' },
  vf_signer_known: { en: 'Signing device is known to this phone', hi: 'हस्ताक्षर करने वाला डिवाइस ज्ञात है', bn: 'স্বাক্ষরকারী ডিভাইস পরিচিত', or: 'ସ୍ୱାକ୍ଷରକାରୀ ଡିଭାଇସ ଜଣା', ur: 'دستخط کرنے والا ڈیوائس معلوم ہے' },
  vf_signer_unknown: {
    en: 'Signature is valid, but this phone has not met the issuing device. Confirm the site before accepting.',
    hi: 'हस्ताक्षर वैध है, पर यह फ़ोन जारीकर्ता डिवाइस को नहीं जानता। स्वीकार करने से पहले साइट की पुष्टि करें।',
    bn: 'স্বাক্ষর বৈধ, তবে এই ফোন ইস্যুকারী ডিভাইস চেনে না। গ্রহণের আগে সাইট নিশ্চিত করুন।',
    or: 'ସ୍ୱାକ୍ଷର ବୈଧ, କିନ୍ତୁ ଏହି ଫୋନ ଜାରିକାରୀ ଡିଭାଇସ ଜାଣେ ନାହିଁ।',
    ur: 'دستخط درست ہے، مگر یہ فون جاری کرنے والے ڈیوائس کو نہیں جانتا۔',
  },
  vf_in_ledger: { en: 'Present in this phone\u2019s ledger and correctly linked', hi: 'इस फ़ोन के लेजर में मौजूद और सही जुड़ा', bn: 'এই ফোনের লেজারে আছে ও সঠিকভাবে যুক্ত', or: 'ଏହି ଫୋନର ଲେଜରରେ ଅଛି ଓ ସଠିକ ଯୁକ୍ତ', ur: 'اس فون کے لیجر میں موجود اور درست جڑا' },
  vf_not_in_ledger: { en: 'Not in this phone\u2019s ledger — verified from the QR alone', hi: 'इस फ़ोन के लेजर में नहीं — केवल QR से सत्यापित', bn: 'এই ফোনের লেজারে নেই — শুধু QR থেকে যাচাই', or: 'ଏହି ଫୋନର ଲେଜରରେ ନାହିଁ — କେବଳ QR ରୁ ଯାଞ୍ଚ', ur: 'اس فون کے لیجر میں نہیں — صرف QR سے تصدیق' },
  vf_offline_ok: { en: 'Verified offline', hi: 'ऑफ़लाइन सत्यापित', sat: 'ᱚᱯᱷᱞᱟᱭᱤᱱ ᱡᱟᱹᱨᱩᱭ', bn: 'অফলাইন যাচাই', or: 'ଅଫଲାଇନ ଯାଞ୍ଚ', ur: 'آف لائن تصدیق شدہ' },
}

/* ================================================================== */
/* Dashboard, admin and settings                                       */
/* ================================================================== */

const CONSOLE = {
  db_readiness_title: { en: 'Your readiness', hi: 'आपकी तैयारी', sat: 'ᱟᱢᱟᱜ ᱛᱮᱭᱟᱨᱤ', bn: 'আপনার প্রস্তুতি', or: 'ଆପଣଙ୍କ ପ୍ରସ୍ତୁତି', ur: 'آپ کی تیاری' },
  db_by_domain: { en: 'By safety domain', hi: 'सुरक्षा क्षेत्र अनुसार', bn: 'নিরাপত্তা ক্ষেত্র অনুযায়ী', or: 'ସୁରକ୍ଷା କ୍ଷେତ୍ର ଅନୁସାରେ', ur: 'حفاظتی شعبے کے مطابق' },
  db_last_passed: { en: 'Last passed', hi: 'अंतिम पास', bn: 'শেষ পাস', or: 'ଶେଷ ପାସ', ur: 'آخری پاس' },
  db_never: { en: 'Never', hi: 'कभी नहीं', sat: 'ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱵᱟᱝ', bn: 'কখনও নয়', or: 'କେବେ ନୁହେଁ', ur: 'کبھی نہیں' },
  db_decayed_from: { en: 'was', hi: 'था', bn: 'ছিল', or: 'ଥିଲା', ur: 'تھا' },
  db_flagged_slow: { en: 'Flagged for slow reaction', hi: 'धीमी प्रतिक्रिया के लिए चिह्नित', bn: 'ধীর প্রতিক্রিয়ার জন্য চিহ্নিত', or: 'ମନ୍ଥର ପ୍ରତିକ୍ରିୟା ପାଇଁ ଚିହ୍ନିତ', ur: 'سست ردعمل کے لیے نشان زد' },
  db_mode_solo: { en: 'Solo', hi: 'अकेले', bn: 'একা', or: 'ଏକୁଟିଆ', ur: 'اکیلا' },
  db_mode_ar: { en: 'AR', hi: 'एआर', bn: 'এআর', or: 'AR', ur: 'اے آر' },
  db_mode_buddy: { en: 'Buddy', hi: 'बडी', bn: 'বাডি', or: 'ବଡି', ur: 'بڈی' },
  db_mode_refresher: { en: 'Refresher', hi: 'रिफ्रेशर', bn: 'রিফ্রেশার', or: 'ରିଫ୍ରେସର', ur: 'ریفریشر' },
  db_pending_sync: { en: 'waiting to sync', hi: 'सिंक बाकी', sat: 'ᱥᱤᱸᱠ ᱵᱟᱠᱤ', bn: 'সিঙ্ক বাকি', or: 'ସିଙ୍କ ବାକି', ur: 'سنک باقی' },
  db_all_local: { en: 'Everything here is stored only on this phone.', hi: 'यहाँ सब कुछ केवल इस फ़ोन पर सहेजा है।', sat: 'ᱱᱚᱰᱮ ᱡᱚᱛᱚ ᱡᱤᱱᱤᱥ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱜᱮ ᱢᱮᱱᱟᱜᱼᱟ ᱾', bn: 'এখানে সবকিছু শুধু এই ফোনে সংরক্ষিত।', or: 'ଏଠାରେ ସବୁ କେବଳ ଏହି ଫୋନରେ ସେଭ।', ur: 'یہاں سب کچھ صرف اس فون پر محفوظ ہے۔' },
  db_storage_temp: {
    en: 'This browser will not let Jaagruk store data permanently, so your progress lasts only for this session.',
    hi: 'यह ब्राउज़र जागरुक को स्थायी रूप से डेटा सहेजने नहीं देता, इसलिए प्रगति सिर्फ़ इस सत्र तक रहेगी।',
    bn: 'এই ব্রাউজার স্থায়ীভাবে ডেটা রাখতে দেয় না, তাই অগ্রগতি শুধু এই সেশনে থাকবে।',
    or: 'ଏହି ବ୍ରାଉଜର ସ୍ଥାୟୀ ଭାବେ ଡାଟା ରଖିବାକୁ ଦିଏ ନାହିଁ।',
    ur: 'یہ براؤزر مستقل ڈیٹا رکھنے نہیں دیتا۔',
  },

  ad_gate_title: { en: 'Supervisor access', hi: 'सुपरवाइज़र पहुंच', bn: 'সুপারভাইজার অ্যাক্সেস', or: 'ସୁପରଭାଇଜର ଆକସେସ', ur: 'سپروائزر رسائی' },
  ad_gate_enter: { en: 'Enter supervisor PIN', hi: 'सुपरवाइज़र पिन लिखें', bn: 'সুপারভাইজার পিন লিখুন', or: 'ସୁପରଭାଇଜର PIN ଲେଖନ୍ତୁ', ur: 'سپروائزر پن لکھیں' },
  ad_gate_set_title: { en: 'Set a supervisor PIN', hi: 'सुपरवाइज़र पिन सेट करें', bn: 'সুপারভাইজার পিন সেট করুন', or: 'ସୁପରଭାଇଜର PIN ସେଟ କରନ୍ତୁ', ur: 'سپروائزر پن سیٹ کریں' },
  ad_gate_set_body: { en: 'No PIN is set yet. Choose one to protect this dashboard on a shared phone.', hi: 'अभी कोई पिन नहीं है। साझा फ़ोन पर इस डैशबोर्ड की सुरक्षा के लिए एक चुनें।', bn: 'এখনও পিন নেই। শেয়ার করা ফোনে এই ড্যাশবোর্ড সুরক্ষিত রাখতে একটি বাছুন।', or: 'ଏପର୍ଯ୍ୟନ୍ତ PIN ନାହିଁ।', ur: 'ابھی کوئی پن نہیں ہے۔' },
  ad_gate_wrong: { en: 'Wrong PIN.', hi: 'गलत पिन।', bn: 'ভুল পিন।', or: 'ଭୁଲ PIN।', ur: 'غلط پن۔' },
  ad_gate_unlock: { en: 'Unlock', hi: 'खोलें', bn: 'আনলক', or: 'ଅନଲକ', ur: 'کھولیں' },
  ad_gate_lock: { en: 'Lock dashboard', hi: 'डैशबोर्ड लॉक करें', bn: 'ড্যাশবোর্ড লক করুন', or: 'ଡ୍ୟାସବୋର୍ଡ ଲକ କରନ୍ତୁ', ur: 'ڈیش بورڈ لاک کریں' },
  ad_auth_warning: {
    en: 'This PIN is a local speed bump, not real authorization. A production deployment needs server-issued roles — see the architecture notes.',
    hi: 'यह पिन स्थानीय अवरोध है, वास्तविक प्राधिकरण नहीं। उत्पादन परिनियोजन के लिए सर्वर-जारी भूमिकाएं चाहिए।',
    bn: 'এই পিন স্থানীয় প্রতিবন্ধক, প্রকৃত অনুমোদন নয়। উৎপাদনে সার্ভার-প্রদত্ত রোল দরকার।',
    or: 'ଏହି PIN ସ୍ଥାନୀୟ ପ୍ରତିବନ୍ଧକ, ପ୍ରକୃତ ଅନୁମୋଦନ ନୁହେଁ।',
    ur: 'یہ پن مقامی رکاوٹ ہے، حقیقی اجازت نہیں۔',
  },
  ad_tab_compliance: { en: 'Compliance', hi: 'अनुपालन', bn: 'কমপ্লায়েন্স', or: 'ଅନୁପାଳନ', ur: 'تعمیل' },
  ad_tab_hesitation: { en: 'Hesitation risk', hi: 'हिचकिचाहट जोखिम', bn: 'দ্বিধা ঝুঁকি', or: 'ଦ୍ୱିଧା ବିପଦ', ur: 'ہچکچاہٹ خطرہ' },
  ad_tab_hazards: { en: 'Hazard board', hi: 'खतरा बोर्ड', bn: 'বিপদ বোর্ড', or: 'ବିପଦ ବୋର୍ଡ', ur: 'خطرہ بورڈ' },
  ad_tab_ledger: { en: 'Ledger', hi: 'लेजर', bn: 'লেজার', or: 'ଲେଜର', ur: 'لیجر' },
  ad_tab_verify: { en: 'Verify a QR', hi: 'QR सत्यापित करें', bn: 'QR যাচাই', or: 'QR ଯାଞ୍ଚ', ur: 'QR تصدیق' },
  ad_hesitation_desc: {
    en: 'These workers answered correctly but slowly. On paper they passed; under pressure they are the ones who freeze. Target them for a repeat drill.',
    hi: 'इन श्रमिकों ने सही पर धीमे उत्तर दिए। कागज़ पर वे पास हैं; दबाव में यही रुक जाते हैं। इन्हें दोबारा ड्रिल कराएं।',
    bn: 'এই কর্মীরা সঠিক কিন্তু ধীরে উত্তর দিয়েছেন। কাগজে পাস; চাপে এরাই থমকে যান।',
    or: 'ଏହି କର୍ମୀମାନେ ସଠିକ କିନ୍ତୁ ମନ୍ଥର ଉତ୍ତର ଦେଇଛନ୍ତି।',
    ur: 'ان ورکرز نے درست مگر سست جواب دیا۔ کاغذ پر پاس؛ دباؤ میں یہی رک جاتے ہیں۔',
  },
  ad_hesitation_none: { en: 'No hesitation flags on record.', hi: 'कोई हिचकिचाहट दर्ज नहीं।', bn: 'কোনো দ্বিধা রেকর্ড নেই।', or: 'କୌଣସି ଦ୍ୱିଧା ରେକର୍ଡ ନାହିଁ।', ur: 'کوئی ہچکچاہٹ درج نہیں۔' },
  ad_worst_pause: { en: 'Longest pause', hi: 'सबसे लंबा ठहराव', bn: 'দীর্ঘতম বিরতি', or: 'ସର୍ବାଧିକ ବିରାମ', ur: 'طویل ترین وقفہ' },
  ad_hazards_none: { en: 'No hazard reports yet.', hi: 'अभी कोई खतरा रिपोर्ट नहीं।', bn: 'এখনও কোনো বিপদ রিপোর্ট নেই।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିପଦ ରିପୋର୍ଟ ନାହିଁ।', ur: 'ابھی کوئی خطرہ رپورٹ نہیں۔' },
  ad_hazard_ack: { en: 'Acknowledge', hi: 'स्वीकार करें', bn: 'স্বীকার করুন', or: 'ସ୍ୱୀକାର କରନ୍ତୁ', ur: 'تسلیم کریں' },
  ad_hazard_resolve: { en: 'Mark fixed', hi: 'ठीक चिह्नित करें', bn: 'ঠিক চিহ্নিত করুন', or: 'ଠିକ ଚିହ୍ନିତ କରନ୍ତୁ', ur: 'ٹھیک نشان زد کریں' },
  ad_hazard_dismiss: { en: 'Dismiss', hi: 'खारिज करें', bn: 'বাতিল করুন', or: 'ଖାରଜ କରନ୍ତୁ', ur: 'مسترد کریں' },
  ad_hazard_reopen: { en: 'Reopen', hi: 'फिर खोलें', bn: 'আবার খুলুন', or: 'ପୁଣି ଖୋଲନ୍ତୁ', ur: 'دوبارہ کھولیں' },
  ad_open_high: { en: 'open high-severity', hi: 'खुले उच्च-गंभीरता', bn: 'খোলা উচ্চ-গুরুত্ব', or: 'ଖୋଲା ଉଚ୍ଚ-ଗମ୍ଭୀରତା', ur: 'کھلے زیادہ شدت' },
  ad_oldest_open: { en: 'oldest open, days', hi: 'सबसे पुराना खुला, दिन', bn: 'প্রাচীনতম খোলা, দিন', or: 'ପୁରାତନ ଖୋଲା, ଦିନ', ur: 'قدیم ترین کھلا، دن' },
  ad_zone_clusters: { en: 'Where reports cluster', hi: 'रिपोर्टें कहाँ जमा हैं', bn: 'রিপোর্ট কোথায় জমেছে', or: 'ରିପୋର୍ଟ କେଉଁଠି ଜମା', ur: 'رپورٹیں کہاں جمع ہیں' },
  ad_ledger_verify: { en: 'Verify the whole ledger', hi: 'पूरा लेजर सत्यापित करें', bn: 'পুরো লেজার যাচাই করুন', or: 'ସମ୍ପୂର୍ଣ୍ଣ ଲେଜର ଯାଞ୍ଚ କରନ୍ତୁ', ur: 'پورا لیجر تصدیق کریں' },
  ad_ledger_intact: { en: 'All records intact', hi: 'सभी रिकॉर्ड अक्षुण्ण', bn: 'সব রেকর্ড অক্ষত', or: 'ସବୁ ରେକର୍ଡ ଅକ୍ଷତ', ur: 'تمام ریکارڈ برقرار' },
  ad_ledger_intact_to: { en: 'Chain intact up to record', hi: 'रिकॉर्ड तक चेन अक्षुण्ण', bn: 'রেকর্ড পর্যন্ত চেইন অক্ষত', or: 'ରେକର୍ଡ ପର୍ଯ୍ୟନ୍ତ ଚେନ ଅକ୍ଷତ', ur: 'ریکارڈ تک چین برقرار' },
  ad_ledger_records: { en: 'records', hi: 'रिकॉर्ड', bn: 'রেকর্ড', or: 'ରେକର୍ଡ', ur: 'ریکارڈ' },
  ad_ledger_empty: { en: 'No certificates have been issued on this device.', hi: 'इस डिवाइस पर कोई प्रमाणपत्र जारी नहीं हुआ।', bn: 'এই ডিভাইসে কোনো সার্টিফিকেট ইস্যু হয়নি।', or: 'ଏହି ଡିଭାଇସରେ କୌଣସି ପ୍ରମାଣପତ୍ର ଜାରି ହୋଇନାହିଁ।', ur: 'اس ڈیوائس پر کوئی سرٹیفکیٹ جاری نہیں ہوا۔' },
  ad_export_dgms: { en: 'Export compliance bundle', hi: 'अनुपालन बंडल निर्यात करें', bn: 'কমপ্লায়েন্স বান্ডল এক্সপোর্ট', or: 'ଅନୁପାଳନ ବଣ୍ଡଲ ଏକ୍ସପୋର୍ଟ', ur: 'تعمیل بنڈل ایکسپورٹ' },
  ad_import_bundle: { en: 'Import a bundle', hi: 'बंडल आयात करें', bn: 'বান্ডল ইমপোর্ট', or: 'ବଣ୍ଡଲ ଇମପୋର୍ଟ', ur: 'بنڈل امپورٹ' },
  ad_import_trust: { en: 'Also trust the signing devices in this bundle', hi: 'इस बंडल के हस्ताक्षर डिवाइस पर भी भरोसा करें', bn: 'এই বান্ডলের স্বাক্ষরকারী ডিভাইসও বিশ্বাস করুন', or: 'ଏହି ବଣ୍ଡଲର ସ୍ୱାକ୍ଷରକାରୀ ଡିଭାଇସ ମଧ୍ୟ ବିଶ୍ୱାସ କରନ୍ତୁ', ur: 'اس بنڈل کے دستخط کرنے والے ڈیوائس پر بھی اعتماد کریں' },
  ad_import_done: { en: 'Import complete', hi: 'आयात पूर्ण', bn: 'ইমপোর্ট সম্পন্ন', or: 'ଇମପୋର୍ଟ ସମାପ୍ତ', ur: 'امپورٹ مکمل' },
  ad_import_failed: { en: 'That file is not a Jaagruk bundle.', hi: 'यह फ़ाइल जागरुक बंडल नहीं है।', bn: 'এই ফাইল জাগরুক বান্ডল নয়।', or: 'ଏହି ଫାଇଲ ଜାଗରୁକ ବଣ୍ଡଲ ନୁହେଁ।', ur: 'یہ فائل جاگروک بنڈل نہیں ہے۔' },
  ad_statutory_note: {
    en: 'Export formatted for Mines Act 1952 and Factories Act 1948 record-keeping. Readiness is reported as of the export date, not the original test date.',
    hi: 'खान अधिनियम 1952 और कारखाना अधिनियम 1948 के अभिलेख हेतु निर्यात। तैयारी निर्यात तिथि की है, मूल परीक्षा तिथि की नहीं।',
    bn: 'খনি আইন ১৯৫২ ও কারখানা আইন ১৯৪৮ অনুযায়ী রেকর্ডের জন্য এক্সপোর্ট।',
    or: 'ଖଣି ଅଧିନିୟମ ୧୯୫୨ ଓ କାରଖାନା ଅଧିନିୟମ ୧୯୪୮ ପାଇଁ ଏକ୍ସପୋର୍ଟ।',
    ur: 'مائنز ایکٹ 1952 اور فیکٹریز ایکٹ 1948 کے ریکارڈ کے لیے ایکسپورٹ۔',
  },
  ad_sync_now: { en: 'Sync now', hi: 'अभी सिंक करें', bn: 'এখনই সিঙ্ক', or: 'ଏବେ ସିଙ୍କ', ur: 'ابھی سنک کریں' },
  ad_sync_pending: { en: 'records waiting', hi: 'रिकॉर्ड बाकी', bn: 'রেকর্ড বাকি', or: 'ରେକର୍ଡ ବାକି', ur: 'ریکارڈ باقی' },
  ad_sync_no_endpoint: { en: 'No upload URL is configured, so records stay on this device.', hi: 'कोई अपलोड URL सेट नहीं है, इसलिए रिकॉर्ड इसी डिवाइस पर रहेंगे।', bn: 'কোনো আপলোড URL সেট নেই, তাই রেকর্ড এই ডিভাইসেই থাকবে।', or: 'କୌଣସି ଅପଲୋଡ URL ସେଟ ନାହିଁ।', ur: 'کوئی اپ لوڈ URL سیٹ نہیں ہے۔' },
  ad_sync_offline: { en: 'This device is offline. Records will go up automatically later.', hi: 'यह डिवाइस ऑफ़लाइन है। रिकॉर्ड बाद में अपने आप जाएंगे।', bn: 'এই ডিভাইস অফলাইন। রেকর্ড পরে নিজেই যাবে।', or: 'ଏହି ଡିଭାଇସ ଅଫଲାଇନ।', ur: 'یہ ڈیوائس آف لائن ہے۔' },
  ad_sync_done: { en: 'Sync complete', hi: 'सिंक पूर्ण', bn: 'সিঙ্ক সম্পন্ন', or: 'ସିଙ୍କ ସମାପ୍ତ', ur: 'سنک مکمل' },
  ad_sync_failed: { en: 'Sync failed. Records are safe and queued.', hi: 'सिंक विफल। रिकॉर्ड सुरक्षित और कतार में हैं।', bn: 'সিঙ্ক ব্যর্থ। রেকর্ড সুরক্ষিত ও কিউতে।', or: 'ସିଙ୍କ ବିଫଳ।', ur: 'سنک ناکام۔ ریکارڈ محفوظ ہیں۔' },
  ad_gossip_title: { en: 'Hand off to a nearby phone', hi: 'पास के फ़ोन को सौंपें', bn: 'কাছের ফোনে হ্যান্ড অফ', or: 'ପାଖ ଫୋନକୁ ହାଣ୍ଡ ଅଫ', ur: 'قریبی فون کو منتقل کریں' },
  ad_gossip_desc: {
    en: 'When the pit has no network, connect to a supervisor phone and pass the records across directly. They upload when they surface.',
    hi: 'जब खदान में नेटवर्क न हो, सुपरवाइज़र फ़ोन से जुड़ें और रिकॉर्ड सीधे भेजें। वे ऊपर आकर अपलोड कर देंगे।',
    bn: 'খনিতে নেটওয়ার্ক না থাকলে সুপারভাইজার ফোনে যুক্ত হয়ে সরাসরি রেকর্ড পাঠান।',
    or: 'ଖଣିରେ ନେଟୱର୍କ ନଥିଲେ ସୁପରଭାଇଜର ଫୋନ ସହ ଯୁକ୍ତ ହୋଇ ସିଧା ରେକର୍ଡ ପଠାନ୍ତୁ।',
    ur: 'کان میں نیٹ ورک نہ ہو تو سپروائزر فون سے جڑ کر ریکارڈ براہ راست بھیجیں۔',
  },

  st_modes_title: { en: 'How you want to use it', hi: 'आप कैसे इस्तेमाल करना चाहते हैं', sat: 'ᱟᱢ ᱪᱮᱫ ᱞᱮᱠᱟ ᱵᱮᱵᱷᱟᱨ ᱥᱟᱱᱟᱢ', bn: 'আপনি কীভাবে ব্যবহার করতে চান', or: 'ଆପଣ କିପରି ବ୍ୟବହାର କରିବାକୁ ଚାହାଁନ୍ତି', ur: 'آپ کیسے استعمال کرنا چاہتے ہیں' },
  st_pictogram_mode: { en: 'Picture mode (no reading)', hi: 'चित्र मोड (पढ़ने की ज़रूरत नहीं)', sat: 'ᱪᱤᱛᱟᱹᱨ ᱢᱳᱰ (ᱯᱟᱲᱦᱟᱣ ᱵᱟᱝ ᱞᱟᱹᱠᱛᱤ)', bn: 'ছবি মোড (পড়ার দরকার নেই)', or: 'ଚିତ୍ର ମୋଡ (ପଢ଼ିବା ଦରକାର ନାହିଁ)', ur: 'تصویری موڈ (پڑھنے کی ضرورت نہیں)' },
  st_pictogram_hint: {
    en: 'Shows standard safety signs with spoken instructions instead of text.',
    hi: 'पाठ के बजाय मानक सुरक्षा चिह्न और बोले गए निर्देश दिखाता है।',
    bn: 'টেক্সটের বদলে মানক নিরাপত্তা চিহ্ন ও কথ্য নির্দেশ দেখায়।',
    or: 'ଟେକ୍ସଟ ବଦଳରେ ମାନକ ସୁରକ୍ଷା ଚିହ୍ନ ଓ କଥିତ ନିର୍ଦ୍ଦେଶ ଦେଖାଏ।',
    ur: 'متن کی جگہ معیاری حفاظتی نشانات اور بولی گئی ہدایات دکھاتا ہے۔',
  },
  st_voice_mode: { en: 'Answer by voice', hi: 'आवाज़ से उत्तर दें', sat: 'ᱨᱚᱲ ᱛᱮ ᱛᱮᱞᱟ', bn: 'ভয়েসে উত্তর দিন', or: 'ଭଏସରେ ଉତ୍ତର ଦିଅନ୍ତୁ', ur: 'آواز سے جواب دیں' },
  st_voice_hint: { en: 'Say "one" or "two" instead of tapping. Works with gloves on.', hi: 'टैप के बजाय "एक" या "दो" बोलें। दस्ताने पहने भी काम करता है।', bn: 'ট্যাপের বদলে "এক" বা "দুই" বলুন। দস্তানা পরেও কাজ করে।', or: 'ଟ୍ୟାପ ବଦଳରେ "ଏକ" କିମ୍ବା "ଦୁଇ" କୁହନ୍ତୁ।', ur: 'ٹیپ کی جگہ "ایک" یا "دو" کہیں۔ دستانوں کے ساتھ بھی کام کرتا ہے۔' },
  st_gesture_mode: { en: 'Point with your hand', hi: 'हाथ से इशारा करें', sat: 'ᱛᱤ ᱛᱮ ᱩᱫᱩᱜ', bn: 'হাত দিয়ে দেখান', or: 'ହାତରେ ଦେଖାନ୍ତୁ', ur: 'ہاتھ سے اشارہ کریں' },
  st_gesture_hint: {
    en: 'Uses the front camera to track your hand, so you can select without touching the screen. Needs a one-time download.',
    hi: 'सामने के कैमरे से हाथ ट्रैक करता है, जिससे स्क्रीन छुए बिना चुन सकते हैं। एक बार डाउनलोड चाहिए।',
    bn: 'সামনের ক্যামেরায় হাত ট্র্যাক করে, তাই স্ক্রিন না ছুঁয়েই বাছতে পারেন। একবার ডাউনলোড দরকার।',
    or: 'ଆଗ କ୍ୟାମେରାରେ ହାତ ଟ୍ରାକ କରେ, ତେଣୁ ସ୍କ୍ରିନ ନ ଛୁଇଁ ବାଛିପାରିବେ।',
    ur: 'سامنے کے کیمرے سے ہاتھ ٹریک کرتا ہے، اسکرین چھوئے بغیر منتخب کر سکتے ہیں۔',
  },
  st_ar_mode: { en: 'Use the camera for drills', hi: 'ड्रिल के लिए कैमरा इस्तेमाल करें', sat: 'ᱛᱟᱞᱤᱢ ᱞᱟᱹᱜᱤᱫ ᱠᱮᱢᱨᱟ ᱵᱮᱵᱷᱟᱨ', bn: 'ড্রিলের জন্য ক্যামেরা ব্যবহার করুন', or: 'ଡ୍ରିଲ ପାଇଁ କ୍ୟାମେରା ବ୍ୟବହାର କରନ୍ତୁ', ur: 'ڈرل کے لیے کیمرہ استعمال کریں' },
  st_ar_hint: { en: 'Overlays hazards on your real surroundings instead of a 3D model.', hi: '3D मॉडल के बजाय आपके असली परिवेश पर खतरे दिखाता है।', bn: '3D মডেলের বদলে আপনার আসল পরিবেশে বিপদ দেখায়।', or: '3D ମଡେଲ ବଦଳରେ ଆପଣଙ୍କ ପ୍ରକୃତ ପରିବେଶରେ ବିପଦ ଦେଖାଏ।', ur: '3D ماڈل کی جگہ آپ کے حقیقی ماحول پر خطرات دکھاتا ہے۔' },
  st_on: { en: 'On', hi: 'चालू', sat: 'ᱡᱷᱤᱡ', bn: 'চালু', or: 'ଚାଲୁ', ur: 'چالو' },
  st_off: { en: 'Off', hi: 'बंद', sat: 'ᱵᱚᱸᱫᱚ', bn: 'বন্ধ', or: 'ବନ୍ଦ', ur: 'بند' },
  st_voice_check: { en: 'Voice availability on this device', hi: 'इस डिवाइस पर आवाज़ उपलब्धता', bn: 'এই ডিভাইসে ভয়েস উপলব্ধতা', or: 'ଏହି ଡିଭାଇସରେ ଭଏସ ଉପଲବ୍ଧତା', ur: 'اس ڈیوائس پر آواز کی دستیابی' },
  st_voice_missing: { en: 'no voice installed', hi: 'कोई आवाज़ इंस्टॉल नहीं', bn: 'কোনো ভয়েস ইনস্টল নেই', or: 'କୌଣସି ଭଏସ ଇନଷ୍ଟଲ ନାହିଁ', ur: 'کوئی آواز انسٹال نہیں' },
  st_voice_substitute: { en: 'read with a Hindi voice', hi: 'हिंदी आवाज़ से पढ़ा जाता है', sat: 'ᱦᱤᱱᱫᱤ ᱨᱚᱲ ᱛᱮ ᱯᱟᱲᱦᱟᱣ ᱦᱩᱭᱩᱜᱼᱟ', bn: 'হিন্দি ভয়েসে পড়া হয়', or: 'ହିନ୍ଦୀ ଭଏସରେ ପଢ଼ାଯାଏ', ur: 'ہندی آواز سے پڑھا جاتا ہے' },
  st_sync_title: { en: 'Central upload (optional)', hi: 'केंद्रीय अपलोड (वैकल्पिक)', bn: 'কেন্দ্রীয় আপলোড (ঐচ্ছিক)', or: 'କେନ୍ଦ୍ରୀୟ ଅପଲୋଡ (ବିକଳ୍ପ)', ur: 'مرکزی اپ لوڈ (اختیاری)' },
  st_sync_hint: {
    en: 'Leave this blank and nothing ever leaves the device. If your organisation runs a collection endpoint, paste its https URL here.',
    hi: 'खाली छोड़ें तो डिवाइस से कुछ बाहर नहीं जाता। यदि आपके संगठन का संग्रह एंडपॉइंट है, उसका https URL यहाँ डालें।',
    bn: 'খালি রাখলে ডিভাইস থেকে কিছুই যায় না। প্রতিষ্ঠানের সংগ্রহ এন্ডপয়েন্ট থাকলে তার https URL দিন।',
    or: 'ଖାଲି ଛାଡ଼ିଲେ ଡିଭାଇସରୁ କିଛି ଯାଏ ନାହିଁ।',
    ur: 'خالی چھوڑیں تو ڈیوائس سے کچھ باہر نہیں جاتا۔',
  },
  st_ENDPOINT_NOT_HTTPS: { en: 'The upload URL must use https.', hi: 'अपलोड URL https होना चाहिए।', bn: 'আপলোড URL https হতে হবে।', or: 'ଅପଲୋଡ URL https ହେବା ଆବଶ୍ୟକ।', ur: 'اپ لوڈ URL https ہونا چاہیے۔' },
  st_ENDPOINT_INVALID: { en: 'That is not a valid URL.', hi: 'यह मान्य URL नहीं है।', bn: 'এটি বৈধ URL নয়।', or: 'ଏହା ବୈଧ URL ନୁହେଁ।', ur: 'یہ درست URL نہیں ہے۔' },
  st_reset_device: { en: 'Erase everything on this device', hi: 'इस डिवाइस से सब मिटाएं', bn: 'এই ডিভাইসের সব মুছুন', or: 'ଏହି ଡିଭାଇସର ସବୁ ଲିଭାନ୍ତୁ', ur: 'اس ڈیوائس سے سب مٹائیں' },
  st_reset_warning: {
    en: 'This deletes every worker record, certificate and hazard report stored here, including the signing key. Export a bundle first.',
    hi: 'यह यहाँ सहेजे सभी श्रमिक रिकॉर्ड, प्रमाणपत्र और खतरा रिपोर्ट मिटा देगा, हस्ताक्षर कुंजी सहित। पहले बंडल निर्यात करें।',
    bn: 'এটি সব কর্মী রেকর্ড, সার্টিফিকেট ও বিপদ রিপোর্ট মুছে দেবে, স্বাক্ষর কী সহ। আগে বান্ডল এক্সপোর্ট করুন।',
    or: 'ଏହା ସବୁ ରେକର୍ଡ, ପ୍ରମାଣପତ୍ର ଓ ରିପୋର୍ଟ ଲିଭାଇଦେବ। ଆଗେ ବଣ୍ଡଲ ଏକ୍ସପୋର୍ଟ କରନ୍ତୁ।',
    ur: 'یہ تمام ریکارڈ، سرٹیفکیٹ اور رپورٹیں مٹا دے گا۔ پہلے بنڈل ایکسپورٹ کریں۔',
  },
  st_reset_confirm: { en: 'Type ERASE to confirm', hi: 'पुष्टि के लिए ERASE लिखें', bn: 'নিশ্চিত করতে ERASE লিখুন', or: 'ନିଶ୍ଚିତ କରିବାକୁ ERASE ଲେଖନ୍ତୁ', ur: 'تصدیق کے لیے ERASE لکھیں' },

  gesture_idle: { en: 'Hand tracking off', hi: 'हाथ ट्रैकिंग बंद', bn: 'হ্যান্ড ট্র্যাকিং বন্ধ', or: 'ହାତ ଟ୍ରାକିଂ ବନ୍ଦ', ur: 'ہینڈ ٹریکنگ بند' },
  gesture_loading: { en: 'Loading hand tracking…', hi: 'हाथ ट्रैकिंग लोड हो रही है…', bn: 'হ্যান্ড ট্র্যাকিং লোড হচ্ছে…', or: 'ହାତ ଟ୍ରାକିଂ ଲୋଡ ହେଉଛି…', ur: 'ہینڈ ٹریکنگ لوڈ ہو رہی ہے…' },
  gesture_running: { en: 'Point to aim, pinch or hold to select', hi: 'इशारा करें, चुनने के लिए चुटकी या स्थिर रखें', sat: 'ᱩᱫᱩᱜ ᱢᱮ, ᱵᱟᱪᱷᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱛᱤᱠᱤᱧ', bn: 'দেখান, বাছতে পিঞ্চ বা ধরে রাখুন', or: 'ଦେଖାନ୍ତୁ, ବାଛିବାକୁ ପିଞ୍ଚ କିମ୍ବା ଧରି ରଖନ୍ତୁ', ur: 'اشارہ کریں، منتخب کرنے کے لیے پنچ یا تھامیں' },
  gesture_degraded: { en: 'This phone is struggling to keep up — tapping will be faster.', hi: 'यह फ़ोन साथ नहीं दे पा रहा — टैप करना तेज़ होगा।', bn: 'এই ফোন সামলাতে পারছে না — ট্যাপ করা দ্রুত হবে।', or: 'ଏହି ଫୋନ ସମ୍ଭାଳି ପାରୁନାହିଁ — ଟ୍ୟାପ ଦ୍ରୁତ ହେବ।', ur: 'یہ فون ساتھ نہیں دے پا رہا — ٹیپ کرنا تیز ہوگا۔' },
  gesture_unsupported: { en: 'This browser cannot run hand tracking.', hi: 'यह ब्राउज़र हाथ ट्रैकिंग नहीं चला सकता।', bn: 'এই ব্রাউজার হ্যান্ড ট্র্যাকিং চালাতে পারে না।', or: 'ଏହି ବ୍ରାଉଜର ହାତ ଟ୍ରାକିଂ ଚଳାଇ ପାରିବ ନାହିଁ।', ur: 'یہ براؤزر ہینڈ ٹریکنگ نہیں چلا سکتا۔' },
  gesture_no_camera: { en: 'No front camera available.', hi: 'सामने का कैमरा उपलब्ध नहीं।', bn: 'সামনের ক্যামেরা নেই।', or: 'ଆଗ କ୍ୟାମେରା ନାହିଁ।', ur: 'سامنے کا کیمرہ دستیاب نہیں۔' },
  gesture_permission_denied: { en: 'Camera permission was refused, so hand tracking is off.', hi: 'कैमरा अनुमति नहीं मिली, इसलिए हाथ ट्रैकिंग बंद है।', bn: 'ক্যামেরা অনুমতি নেই, তাই হ্যান্ড ট্র্যাকিং বন্ধ।', or: 'କ୍ୟାମେରା ଅନୁମତି ନାହିଁ, ତେଣୁ ହାତ ଟ୍ରାକିଂ ବନ୍ଦ।', ur: 'کیمرہ اجازت نہیں ملی، ہینڈ ٹریکنگ بند ہے۔' },
  gesture_model_failed: { en: 'The hand-tracking model could not be downloaded. Connect once, then it works offline.', hi: 'हाथ ट्रैकिंग मॉडल डाउनलोड नहीं हुआ। एक बार कनेक्ट करें, फिर यह ऑफ़लाइन चलेगा।', bn: 'হ্যান্ড ট্র্যাকিং মডেল ডাউনলোড হয়নি। একবার সংযুক্ত হন, তারপর অফলাইনে চলবে।', or: 'ହାତ ଟ୍ରାକିଂ ମଡେଲ ଡାଉନଲୋଡ ହେଲା ନାହିଁ।', ur: 'ہینڈ ٹریکنگ ماڈل ڈاؤن لوڈ نہیں ہوا۔' },
  gesture_error: { en: 'Hand tracking could not start.', hi: 'हाथ ट्रैकिंग शुरू नहीं हो सकी।', bn: 'হ্যান্ড ট্র্যাকিং শুরু হয়নি।', or: 'ହାତ ଟ୍ରାକିଂ ଆରମ୍ଭ ହେଲା ନାହିଁ।', ur: 'ہینڈ ٹریکنگ شروع نہیں ہو سکی۔' },
}

/* ================================================================== */
/* Merge                                                               */
/* ================================================================== */

/* ================================================================== */
/* Landing page — the four layers                                      */
/* ================================================================== */

const HOME = {
  home_layers_title: { en: 'What makes this different', hi: 'यह अलग क्यों है', sat: 'ᱱᱚᱶᱟ ᱪᱮᱫ ᱞᱟᱹᱜᱤᱫ ᱟᱞᱜᱟ', bn: 'এটি কেন আলাদা', or: 'ଏହା କାହିଁକି ଅଲଗା', ur: 'یہ مختلف کیوں ہے' },

  home_l1_title: { en: 'Trained in your own corridor', hi: 'आपके ही गलियारे में प्रशिक्षण', bn: 'আপনার নিজের করিডোরে প্রশিক্ষণ', or: 'ଆପଣଙ୍କ ନିଜ କରିଡରରେ ତାଲିମ', ur: 'آپ کے اپنے راستے میں تربیت' },
  home_l1_body: {
    en: 'A supervisor marks where the exits and extinguishers really are, once. After that every drill overlays hazards in the correct real direction, so you learn the route you would actually run.',
    hi: 'सुपरवाइज़र एक बार चिह्नित करता है कि निकास और अग्निशामक कहाँ हैं। इसके बाद हर ड्रिल खतरों को सही असली दिशा में दिखाती है, ताकि आप वही रास्ता सीखें जिससे आप वास्तव में भागेंगे।',
    bn: 'সুপারভাইজার একবার চিহ্নিত করেন প্রস্থান ও অগ্নিনির্বাপক কোথায়। এরপর প্রতিটি ড্রিল সঠিক আসল দিকে বিপদ দেখায়।',
    or: 'ସୁପରଭାଇଜର ଏକ ଥର ଚିହ୍ନଟ କରନ୍ତି ନିର୍ଗମ ଓ ଅଗ୍ନିଶମକ କେଉଁଠି। ତା ପରେ ପ୍ରତ୍ୟେକ ଡ୍ରିଲ ସଠିକ ଦିଗରେ ବିପଦ ଦେଖାଏ।',
    ur: 'سپروائزر ایک بار نشان لگاتا ہے کہ راستے اور آگ بجھانے والے کہاں ہیں۔ پھر ہر ڈرل خطرات کو درست اصل سمت میں دکھاتی ہے۔',
  },

  home_l2_title: { en: 'Timed like a real emergency', hi: 'असली आपात स्थिति जैसा समय', bn: 'সত্যিকারের বিপদের মতো সময়', or: 'ପ୍ରକୃତ ବିପଦ ପରି ସମୟ', ur: 'حقیقی ایمرجنسی جیسا وقت' },
  home_l2_body: {
    en: 'Knowing the right answer is not the same as producing it in four seconds. Every decision is timed, and a correct-but-slow answer is flagged for a repeat instead of quietly passed.',
    hi: 'सही उत्तर जानना और चार सेकंड में देना एक बात नहीं है। हर निर्णय का समय मापा जाता है, और सही-पर-धीमा उत्तर चुपचाप पास नहीं होता, दोहराने के लिए चिह्नित होता है।',
    bn: 'সঠিক উত্তর জানা আর চার সেকেন্ডে দেওয়া এক নয়। প্রতিটি সিদ্ধান্তের সময় মাপা হয়, আর সঠিক-কিন্তু-ধীর উত্তর পুনরাবৃত্তির জন্য চিহ্নিত হয়।',
    or: 'ସଠିକ ଉତ୍ତର ଜାଣିବା ଏବଂ ଚାରି ସେକେଣ୍ଡରେ ଦେବା ସମାନ ନୁହେଁ। ପ୍ରତ୍ୟେକ ନିଷ୍ପତ୍ତିର ସମୟ ମପାଯାଏ।',
    ur: 'درست جواب جاننا اور چار سیکنڈ میں دینا ایک نہیں۔ ہر فیصلے کا وقت ناپا جاتا ہے۔',
  },

  home_l3_title: { en: 'A certificate that cannot be quietly edited', hi: 'ऐसा प्रमाणपत्र जिसे चुपचाप बदला नहीं जा सकता', bn: 'যে সার্টিফিকেট চুপচাপ বদলানো যায় না', or: 'ଯେଉଁ ପ୍ରମାଣପତ୍ର ଚୁପଚାପ ବଦଳାଯାଇ ପାରିବ ନାହିଁ', ur: 'ایسا سرٹیفکیٹ جو چپکے سے بدلا نہیں جا سکتا' },
  home_l3_body: {
    en: 'Each certificate links to the one before it by cryptographic hash. The QR carries the whole signed record, so an inspector can verify it standing at the pit head with no signal at all.',
    hi: 'हर प्रमाणपत्र क्रिप्टोग्राफिक हैश से पिछले से जुड़ा होता है। QR में पूरा हस्ताक्षरित रिकॉर्ड होता है, इसलिए निरीक्षक बिना किसी सिग्नल के खदान मुहाने पर खड़े होकर इसे जांच सकता है।',
    bn: 'প্রতিটি সার্টিফিকেট ক্রিপ্টোগ্রাফিক হ্যাশ দিয়ে আগেরটির সাথে যুক্ত। QR-এ সম্পূর্ণ স্বাক্ষরিত রেকর্ড থাকে, তাই সিগন্যাল ছাড়াই যাচাই করা যায়।',
    or: 'ପ୍ରତ୍ୟେକ ପ୍ରମାଣପତ୍ର କ୍ରିପ୍ଟୋଗ୍ରାଫିକ ହ୍ୟାସ ଦ୍ୱାରା ପୂର୍ବବର୍ତ୍ତୀ ସହ ଯୁକ୍ତ। ସିଗନାଲ ବିନା ଯାଞ୍ଚ ହୋଇପାରେ।',
    ur: 'ہر سرٹیفکیٹ کرپٹوگرافک ہیش سے پچھلے سے جڑا ہے۔ سگنل کے بغیر تصدیق ہو سکتی ہے۔',
  },

  home_l4_title: { en: 'Every trained worker becomes a sensor', hi: 'हर प्रशिक्षित श्रमिक एक सेंसर बनता है', bn: 'প্রতিটি প্রশিক্ষিত কর্মী একটি সেন্সর হয়ে ওঠে', or: 'ପ୍ରତ୍ୟେକ ପ୍ରଶିକ୍ଷିତ କର୍ମୀ ଏକ ସେନସର ହୁଅନ୍ତି', ur: 'ہر تربیت یافتہ ورکر ایک سینسر بن جاتا ہے' },
  home_l4_body: {
    en: 'Spot a blocked exit an hour after the drill? One photo and a tap puts it on the safety officer\u2019s board. Readiness also decays if you stop refreshing, so a certificate means competence today rather than a date in the past.',
    hi: 'ड्रिल के एक घंटे बाद अवरुद्ध निकास दिखा? एक फोटो और एक टैप उसे सुरक्षा अधिकारी के बोर्ड पर डाल देता है। रिफ्रेशर छोड़ने पर तैयारी घटती है, इसलिए प्रमाणपत्र का मतलब आज की योग्यता है, बीती तारीख नहीं।',
    bn: 'ড্রিলের এক ঘণ্টা পরে আটকে থাকা প্রস্থান দেখলেন? একটি ছবি ও একটি ট্যাপ তা সেফটি অফিসারের বোর্ডে পাঠায়।',
    or: 'ଡ୍ରିଲର ଏକ ଘଣ୍ଟା ପରେ ଅବରୋଧିତ ନିର୍ଗମ ଦେଖିଲେ? ଏକ ଫଟୋ ଓ ଏକ ଟ୍ୟାପ ତାହା ସୁରକ୍ଷା ଅଧିକାରୀଙ୍କ ବୋର୍ଡରେ ପଠାଏ।',
    ur: 'ڈرل کے ایک گھنٹے بعد بند راستہ دیکھا؟ ایک تصویر اور ایک ٹیپ اسے سیفٹی افسر کے بورڈ پر بھیج دیتا ہے۔',
  },

  home_cta_buddy: { en: 'Try the buddy drill', hi: 'बडी ड्रिल आज़माएं', sat: 'ᱡᱚᱲᱟᱣ ᱛᱟᱞᱤᱢ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ', bn: 'বাডি ড্রিল চেষ্টা করুন', or: 'ବଡି ଡ୍ରିଲ ଚେଷ୍ଟା କରନ୍ତୁ', ur: 'بڈی ڈرل آزمائیں' },
  home_offline_badge: { en: 'Works with no signal', hi: 'बिना सिग्नल काम करता है', sat: 'ᱥᱤᱜᱱᱟᱞ ᱵᱟᱝ ᱛᱟᱦᱮᱸᱠᱷᱟᱱ ᱦᱚᱸ ᱠᱟᱹᱢᱤᱭᱟ', bn: 'সিগন্যাল ছাড়াই কাজ করে', or: 'ସିଗନାଲ ବିନା କାମ କରେ', ur: 'سگنل کے بغیر کام کرتا ہے' },
  home_problem_ref: {
    en: 'Built for SIH problem statement 26041 — Government of Jharkhand, Department of Higher & Technical Education.',
    hi: 'SIH समस्या कथन 26041 के लिए बनाया गया — झारखंड सरकार, उच्च एवं तकनीकी शिक्षा विभाग।',
    bn: 'SIH সমস্যা বিবৃতি 26041-এর জন্য নির্মিত — ঝাড়খণ্ড সরকার, উচ্চ ও কারিগরি শিক্ষা বিভাগ।',
    or: 'SIH ସମସ୍ୟା ବିବରଣୀ 26041 ପାଇଁ ନିର୍ମିତ — ଝାଡ଼ଖଣ୍ଡ ସରକାର, ଉଚ୍ଚ ଓ ବୈଷୟିକ ଶିକ୍ଷା ବିଭାଗ।',
    ur: 'SIH مسئلہ بیان 26041 کے لیے بنایا گیا — حکومت جھارکھنڈ، محکمہ اعلیٰ و تکنیکی تعلیم۔',
  },
}

/* ================================================================== */
/* Charts, dashboard widgets and peer sync                             */
/* ================================================================== */

const CHARTS = {
  ch_trend_up: { en: 'improving', hi: 'सुधर रहा है', sat: 'ᱠᱟᱹᱴᱤᱡ ᱠᱟᱱᱟ', bn: 'উন্নতি হচ্ছে', or: 'ଉନ୍ନତି ହେଉଛି', ur: 'بہتر ہو رہا ہے' },
  ch_trend_down: { en: 'declining', hi: 'गिर रहा है', sat: 'ᱠᱚᱢ ᱠᱟᱱᱟ', bn: 'কমছে', or: 'କମୁଛି', ur: 'کم ہو رہا ہے' },
  ch_active_days: { en: 'days trained', hi: 'दिन प्रशिक्षण', sat: 'ᱢᱟᱦᱟᱸ ᱛᱟᱞᱤᱢ', bn: 'দিন প্রশিক্ষণ', or: 'ଦିନ ତାଲିମ', ur: 'دن تربیت' },
  ch_today: { en: 'today', hi: 'आज', sat: 'ᱛᱮᱦᱮᱸ', bn: 'আজ', or: 'ଆଜି', ur: 'آج' },
  ch_falls_below: { en: 'Drops below the pass mark in', hi: 'पास अंक से नीचे गिरेगा', bn: 'পাস চিহ্নের নিচে নামবে', or: 'ପାସ ଚିହ୍ନ ତଳକୁ ଖସିବ', ur: 'پاس نشان سے نیچے آ جائے گا' },
  ch_decay_label: { en: 'Readiness if you do not refresh', hi: 'रिफ्रेश न करने पर तैयारी', bn: 'রিফ্রেশ না করলে প্রস্তুতি', or: 'ରିଫ୍ରେସ ନକଲେ ପ୍ରସ୍ତୁତି', ur: 'ریفریش نہ کرنے پر تیاری' },
  ch_just_now: { en: 'just now', hi: 'अभी', sat: 'ᱱᱤᱛᱚᱜ', bn: 'এইমাত্র', or: 'ଏବେ', ur: 'ابھی' },
  ch_ago: { en: 'ago', hi: 'पहले', sat: 'ᱞᱟᱦᱟ', bn: 'আগে', or: 'ପୂର୍ବେ', ur: 'پہلے' },
  ch_from_now: { en: 'from now', hi: 'बाद', sat: 'ᱛᱟᱭᱚᱢ', bn: 'পরে', or: 'ପରେ', ur: 'بعد' },
  ch_unit_min: { en: 'min', hi: 'मिनट', sat: 'ᱢᱤᱱᱤᱴ', bn: 'মিনিট', or: 'ମିନିଟ', ur: 'منٹ' },
  ch_unit_hour: { en: 'hr', hi: 'घंटे', sat: 'ᱴᱟᱲᱟᱝ', bn: 'ঘণ্টা', or: 'ଘଣ୍ଟା', ur: 'گھنٹے' },
  ch_unit_day: { en: 'days', hi: 'दिन', sat: 'ᱢᱟᱦᱟᱸ', bn: 'দিন', or: 'ଦିନ', ur: 'دن' },
  ch_unit_month: { en: 'months', hi: 'महीने', sat: 'ᱡᱟᱹᱨᱩᱫ', bn: 'মাস', or: 'ମାସ', ur: 'مہینے' },

  db_radar_title: { en: 'Readiness across all five domains', hi: 'सभी पाँच क्षेत्रों में तैयारी', bn: 'পাঁচটি ক্ষেত্রে প্রস্তুতি', or: 'ପାଞ୍ଚ କ୍ଷେତ୍ରରେ ପ୍ରସ୍ତୁତି', ur: 'پانچوں شعبوں میں تیاری' },
  db_radar_hint: {
    en: 'Certification needs all five above the line. A dent in the shape is the one to work on next.',
    hi: 'प्रमाणन के लिए पाँचों को रेखा से ऊपर होना चाहिए। आकृति में जो हिस्सा दबा है, अगला काम वही है।',
    bn: 'সার্টিফিকেশনের জন্য পাঁচটিই রেখার উপরে থাকতে হবে। আকৃতির যে অংশ ভিতরে ঢুকেছে, পরের কাজ সেটাই।',
    or: 'ପ୍ରମାଣନ ପାଇଁ ପାଞ୍ଚୋଟି ରେଖା ଉପରେ ରହିବା ଆବଶ୍ୟକ। ଆକୃତିର ଯେଉଁ ଅଂଶ ଭିତରକୁ ଗଲା, ପରବର୍ତ୍ତୀ କାମ ସେହି।',
    ur: 'سرٹیفیکیشن کے لیے پانچوں کو لائن سے اوپر ہونا چاہیے۔ شکل میں جو حصہ دبا ہے، اگلا کام وہی ہے۔',
  },
  db_weakest: { en: 'Weakest', hi: 'सबसे कमज़ोर', sat: 'ᱡᱟᱥᱛᱤ ᱞᱟᱲᱟᱭ', bn: 'সবচেয়ে দুর্বল', or: 'ସର୍ବାଧିକ ଦୁର୍ବଳ', ur: 'سب سے کمزور' },
  db_consistency: { en: 'Consistency', hi: 'नियमितता', sat: 'ᱞᱟᱦᱟ ᱞᱟᱦᱟ', bn: 'নিয়মিততা', or: 'ନିୟମିତତା', ur: 'تسلسل' },
  db_consistency_hint: {
    en: 'Short sessions every few days beat one long session. The gaps are what the score reacts to.',
    hi: 'हर कुछ दिन में छोटे सत्र एक लंबे सत्र से बेहतर हैं। स्कोर इन अंतरालों पर प्रतिक्रिया देता है।',
    bn: 'কয়েকদিন পর ছোট সেশন একটি দীর্ঘ সেশনের চেয়ে ভালো। স্কোর এই ফাঁকগুলিতেই সাড়া দেয়।',
    or: 'କିଛି ଦିନ ପରେ ଛୋଟ ସେସନ ଏକ ଲମ୍ବା ସେସନଠାରୁ ଭଲ।',
    ur: 'ہر چند دن چھوٹے سیشن ایک لمبے سیشن سے بہتر ہیں۔',
  },
  db_streak: { en: 'Current streak', hi: 'वर्तमान लगातार', sat: 'ᱱᱤᱛᱚᱜᱟᱜ', bn: 'বর্তমান ধারা', or: 'ବର୍ତ୍ତମାନ ଧାରା', ur: 'موجودہ سلسلہ' },
  db_longest_streak: { en: 'Longest', hi: 'सबसे लंबा', sat: 'ᱡᱟᱥᱛᱤ ᱡᱤᱞᱤᱧ', bn: 'দীর্ঘতম', or: 'ସର୍ବାଧିକ ଲମ୍ବା', ur: 'طویل ترین' },
  db_reaction_mix: { en: 'How you react under pressure', hi: 'दबाव में आपकी प्रतिक्रिया', sat: 'ᱡᱚᱨ ᱨᱮ ᱟᱢᱟᱜ ᱛᱮᱞᱟ', bn: 'চাপে আপনার প্রতিক্রিয়া', or: 'ଚାପରେ ଆପଣଙ୍କ ପ୍ରତିକ୍ରିୟା', ur: 'دباؤ میں آپ کا ردعمل' },
  db_reaction_hint: {
    en: 'Every decision you have made, grouped by how fast you made it.',
    hi: 'आपके सभी निर्णय, इस आधार पर समूहित कि आपने कितनी तेज़ी से लिए।',
    bn: 'আপনার সব সিদ্ধান্ত, কত দ্রুত নিয়েছেন তার ভিত্তিতে সাজানো।',
    or: 'ଆପଣଙ୍କ ସବୁ ନିଷ୍ପତ୍ତି, କେତେ ଶୀଘ୍ର ନେଇଛନ୍ତି ସେହି ଅନୁସାରେ।',
    ur: 'آپ کے تمام فیصلے، اس بنیاد پر کہ آپ نے کتنی تیزی سے کیے۔',
  },
  db_decay_title: { en: 'Where this is heading', hi: 'यह किस दिशा में जा रहा है', sat: 'ᱱᱚᱶᱟ ᱚᱠᱟ ᱛᱮ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ', bn: 'এটি কোন দিকে যাচ্ছে', or: 'ଏହା କେଉଁ ଦିଗକୁ ଯାଉଛି', ur: 'یہ کس طرف جا رہا ہے' },
  db_trend: { en: 'Recent trend', hi: 'हाल की प्रवृत्ति', sat: 'ᱱᱮᱛᱟᱨᱟᱜ ᱦᱚᱨ', bn: 'সাম্প্রতিক ধারা', or: 'ସାମ୍ପ୍ରତିକ ଧାରା', ur: 'حالیہ رجحان' },
  db_filter_all: { en: 'All', hi: 'सभी', sat: 'ᱡᱚᱛᱚ', bn: 'সব', or: 'ସବୁ', ur: 'سب' },
  db_recent: { en: 'Recent activity', hi: 'हाल की गतिविधि', sat: 'ᱱᱮᱛᱟᱨᱟᱜ ᱠᱟᱹᱢᱤ', bn: 'সাম্প্রতিক কার্যকলাপ', or: 'ସାମ୍ପ୍ରତିକ କାର୍ଯ୍ୟକଳାପ', ur: 'حالیہ سرگرمی' },
  db_no_data: { en: 'Not enough data yet', hi: 'अभी पर्याप्त डेटा नहीं', sat: 'ᱛᱮᱦᱮᱸ ᱰᱟᱴᱟ ᱵᱟᱝ', bn: 'এখনও যথেষ্ট তথ্য নেই', or: 'ଏପର୍ଯ୍ୟନ୍ତ ଯଥେଷ୍ଟ ତଥ୍ୟ ନାହିଁ', ur: 'ابھی کافی ڈیٹا نہیں' },
  db_live: { en: 'Live', hi: 'लाइव', sat: 'ᱡᱤᱭᱚᱸ', bn: 'লাইভ', or: 'ଲାଇଭ', ur: 'لائیو' },
  db_refresh: { en: 'Refresh', hi: 'ताज़ा करें', sat: 'ᱫᱚᱦᱲᱟ ᱞᱟᱫᱮ', bn: 'রিফ্রেশ', or: 'ରିଫ୍ରେସ', ur: 'ریفریش' },
  db_showing: { en: 'showing', hi: 'दिखा रहा है', bn: 'দেখানো হচ্ছে', or: 'ଦେଖାଉଛି', ur: 'دکھایا جا رہا ہے' },

  ps_offer: { en: 'Send my records', hi: 'मेरे रिकॉर्ड भेजें', sat: 'ᱤᱧᱟᱜ ᱨᱮᱠᱚᱰ ᱠᱩᱞ', bn: 'আমার রেকর্ড পাঠান', or: 'ମୋ ରେକର୍ଡ ପଠାନ୍ତୁ', ur: 'میرے ریکارڈ بھیجیں' },
  ps_collect: { en: 'Collect from a phone', hi: 'फ़ोन से इकट्ठा करें', sat: 'ᱯᱷᱚᱱ ᱠᱷᱚᱱ ᱡᱟᱨᱣᱟ', bn: 'ফোন থেকে সংগ্রহ করুন', or: 'ଫୋନରୁ ସଂଗ୍ରହ କରନ୍ତୁ', ur: 'فون سے جمع کریں' },
  ps_exchanging: { en: 'Exchanging records…', hi: 'रिकॉर्ड का आदान-प्रदान…', sat: 'ᱨᱮᱠᱚᱰ ᱟᱹᱰᱤ ᱠᱟᱱᱟ…', bn: 'রেকর্ড বিনিময় হচ্ছে…', or: 'ରେକର୍ଡ ବିନିମୟ ହେଉଛି…', ur: 'ریکارڈ کا تبادلہ…' },
  ps_received: { en: 'Received', hi: 'प्राप्त', sat: 'ᱧᱟᱢ ᱮᱱᱟ', bn: 'প্রাপ্ত', or: 'ପ୍ରାପ୍ତ', ur: 'موصول' },
  ps_sent: { en: 'Sent', hi: 'भेजा', sat: 'ᱠᱩᱞ ᱮᱱᱟ', bn: 'পাঠানো', or: 'ପଠାଯାଇଛି', ur: 'بھیجا' },
}

export const JAAGRUK_STRINGS = {
  ...SHELL,
  ...IDENTITY,
  ...AR,
  ...BUDDY,
  ...HAZARDS,
  ...ASSESSMENT,
  ...LEDGER,
  ...CONSOLE,
  ...HOME,
  ...CHARTS,
}

/**
 * Real translation coverage for a language across this dictionary.
 *
 * The previous build hardcoded a single language as "partially translated",
 * which was wrong in both directions — it flagged Santali forever and never
 * flagged Bengali, Odia or Urdu even where they were genuinely thin. Measuring
 * it means the in-app notice tells the truth without anyone maintaining a list.
 */
export function coverageFor(lang, dictionaries = [JAAGRUK_STRINGS]) {
  let total = 0
  let translated = 0

  for (const dict of dictionaries) {
    for (const entry of Object.values(dict || {})) {
      if (!entry || typeof entry !== 'object') continue
      total += 1
      const value = entry[lang]
      if (typeof value === 'string' && value.trim().length > 0) translated += 1
    }
  }

  return {
    lang,
    total,
    translated,
    missing: total - translated,
    percent: total === 0 ? 100 : Math.round((translated / total) * 100),
  }
}

/* ================================================================== */
/* Coverage notice                                                     */
/* ================================================================== */

// Shown in the header when a language falls below the coverage threshold. Kept
// separate from the merged dictionary above so it can name the shortfall in the
// user's own language rather than in English.
export const COVERAGE_NOTICE = {
  en: 'Some screens are still in English while this translation is completed.',
  hi: 'इस अनुवाद के पूरा होने तक कुछ स्क्रीन अंग्रेज़ी में रहेंगी।',
  sat: 'ᱱᱚᱶᱟ ᱛᱚᱨᱡᱚᱢᱟ ᱯᱩᱨᱟᱹᱣ ᱦᱟᱵᱤᱡ ᱛᱤᱱᱟᱹᱜ ᱥᱠᱨᱤᱱ ᱤᱝᱜᱞᱤᱥ ᱛᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾',
  bn: 'এই অনুবাদ সম্পূর্ণ হওয়া পর্যন্ত কিছু স্ক্রিন ইংরেজিতে থাকবে।',
  or: 'ଏହି ଅନୁବାଦ ସମ୍ପୂର୍ଣ୍ଣ ହେବା ପର୍ଯ୍ୟନ୍ତ କିଛି ସ୍କ୍ରିନ ଇଂରାଜୀରେ ରହିବ।',
  ur: 'اس ترجمے کے مکمل ہونے تک کچھ اسکرینیں انگریزی میں رہیں گی۔',
}

// Shown on a drill when the scenario content itself has no translation. This is
// a stronger warning than the UI notice above, because safety instructions
// appearing in a language the worker cannot read is a real hazard, not a
// cosmetic gap.
export const CONTENT_NOTICE = {
  en: 'This module\u2019s safety content has not been translated yet and is shown in English.',
  hi: 'इस मॉड्यूल की सुरक्षा सामग्री का अनुवाद नहीं हुआ है और यह अंग्रेज़ी में दिख रही है।',
  sat: 'ᱱᱚᱶᱟ ᱢᱚᱰᱩᱞ ᱨᱮᱭᱟᱜ ᱨᱠᱷᱟ ᱠᱟᱛᱷᱟ ᱵᱟᱝ ᱛᱚᱨᱡᱚᱢᱟ ᱦᱩᱭ ᱟᱠᱟᱱᱟ, ᱤᱝᱜᱞᱤᱥ ᱛᱮ ᱧᱮᱞᱚᱜ ᱠᱟᱱᱟ ᱾',
  bn: 'এই মডিউলের নিরাপত্তা বিষয়বস্তু এখনও অনুবাদ হয়নি এবং ইংরেজিতে দেখানো হচ্ছে।',
  or: 'ଏହି ମଡ୍ୟୁଲର ସୁରକ୍ଷା ବିଷୟବସ୍ତୁ ଏପର୍ଯ୍ୟନ୍ତ ଅନୁବାଦ ହୋଇନାହିଁ ଏବଂ ଇଂରାଜୀରେ ଦେଖାଯାଉଛି।',
  ur: 'اس ماڈیول کا حفاظتی مواد ابھی ترجمہ نہیں ہوا اور انگریزی میں دکھایا جا رہا ہے۔',
}
