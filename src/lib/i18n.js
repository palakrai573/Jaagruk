import { JAAGRUK_STRINGS, coverageFor, COVERAGE_NOTICE, CONTENT_NOTICE } from './i18nJaagruk.js'
import { LS, lsGet, lsSet } from './local.js'

// Supported languages. Santali ('sat') is included because the official
// problem statement specifically names Hindi + Santali localisation.
// NOTE ON SANTALI QUALITY: Santali is a low-resource language for machine
// translation. The strings below are a best-effort starting point (using
// the Ol Chiki script, Santali's official script since 2003), written with
// real but limited confidence — they are NOT verified by a native speaker.
// Before using this in an actual demo or deployment, have a native Santali
// speaker (e.g. via a local ITI, Santali studies department, or community
// organization in Jharkhand) review and correct these strings, especially
// the safety-critical scenario content.
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'sat', label: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
]

export function getLanguage() {
  const stored = lsGet(LS.LANG, 'en')
  return LANGUAGES.some((l) => l.code === stored) ? stored : 'en'
}

export function setLanguage(code) {
  if (!LANGUAGES.some((l) => l.code === code)) return
  lsSet(LS.LANG, code)
}

export function langName(code) {
  return LANGUAGES.find((l) => l.code === code)?.label || 'English'
}

// UI string dictionary. Every key must exist in every language — fall back
// to English at lookup time if a translation is ever missing, so the UI
// never shows a raw key.
const STRINGS = {
  nav_home: { en: 'Home', hi: 'होम', bn: 'হোম', or: 'ମୂଳପୃଷ୍ଠା', ur: 'ہوم', sat: 'ᱚᱲᱟᱜ' },
  // These four held English text in the `sat` slot. That is worse than leaving
  // them empty: the coverage audit counts any non-empty string as translated, so
  // they reported Santali coverage that did not exist, and a Santali reader saw
  // Latin script with no notice explaining why. Three are loanwords with no
  // Santali equivalent, so they are written in Ol Chiki as loanwords, which is
  // what a Santali reader expects. `nav_scan` uses ᱡᱚᱠᱷᱚᱢ (hazard), already used
  // elsewhere in the app.
  nav_scan: { en: 'Hazard Scan', hi: 'खतरा स्कैन', bn: 'বিপদ স্ক্যান', or: 'ବିପଦ ସ୍କାନ', ur: 'خطرہ اسکین', sat: 'ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ' },
  nav_train: { en: 'Simulator', hi: 'सिम्युलेटर', bn: 'সিমুলেটর', or: 'ସିମୁଲେଟର', ur: 'سمیولیٹر', sat: 'ᱥᱤᱢᱩᱞᱮᱴᱚᱨ' },
  nav_dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड', bn: 'ড্যাশবোর্ড', or: 'ଡ୍ୟାସବୋର୍ଡ', ur: 'ڈیش بورڈ', sat: 'ᱰᱮᱥᱵᱚᱨᱰ' },
  nav_settings: { en: 'Settings', hi: 'सेटिंग्स', bn: 'সেটিংস', or: 'ସେଟିଂସ', ur: 'ترتیبات', sat: 'ᱥᱮᱴᱤᱝᱥ' },

  home_eyebrow: { en: "Jharkhand · Mining & Manufacturing Safety", hi: 'झारखंड · खनन एवं विनिर्माण सुरक्षा', bn: 'ঝাড়খণ্ড · খনি ও উৎপাদন নিরাপত্তা', or: 'ଝାଡ଼ଖଣ୍ଡ · ଖଣି ଓ ଉତ୍ପାଦନ ସୁରକ୍ଷା', ur: 'جھارکھنڈ · کان کنی اور مینوفیکچرنگ حفاظت' },
  home_title_1: { en: 'Every shift', hi: 'हर शिफ्ट', bn: 'প্রতিটি শিফট', or: 'ପ୍ରତ୍ୟେକ ସିଫ୍ଟ', ur: 'ہر شفٹ' },
  home_title_2: { en: 'should end', hi: 'का अंत होना चाहिए', bn: 'শেষ হওয়া উচিত', or: 'ସମାପ୍ତ ହେବା ଉଚିତ', ur: 'کا اختتام ہونا چاہیے' },
  home_title_3: { en: 'the same way.', hi: 'एक ही तरह से।', bn: 'একইভাবে।', or: 'ସମାନ ଭାବରେ।', ur: 'اسی طرح۔' },
  home_desc: {
    en: 'Jaagruk trains workers to recognize hazards before they become accidents, times how fast they react, and certifies them into a record that cannot be quietly edited — on a phone, with no headset and no signal needed.',
    hi: 'जागरुक श्रमिकों को दुर्घटना होने से पहले खतरे पहचानना सिखाता है, उनकी प्रतिक्रिया की गति मापता है, और उन्हें ऐसे रिकॉर्ड में प्रमाणित करता है जिसे चुपचाप बदला नहीं जा सकता — फोन पर, बिना हेडसेट और बिना सिग्नल।',
    sat: 'ᱡᱟᱜᱨᱩᱠ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱠᱚ ᱡᱚᱠᱷᱚᱢ ᱵᱟᱰᱟᱭ ᱛᱟᱞᱤᱢ ᱮᱢᱟᱭ ᱟᱨ ᱚᱠᱛᱚ ᱞᱮᱠᱷᱟᱭ ᱾ ᱯᱷᱚᱱ ᱨᱮ ᱜᱮ, ᱦᱮᱰᱥᱮᱴ ᱟᱨ ᱥᱤᱜᱱᱟᱞ ᱵᱟᱝ ᱞᱟᱹᱠᱛᱤ ᱾',
    bn: 'জাগরুক শ্রমিকদের দুর্ঘটনা ঘটার আগেই বিপদ চিনতে প্রশিক্ষণ দেয় — ফোনের ক্যামেরা এবং একটি এআই সেফটি ইন্সপেক্টর ব্যবহার করে, কোনো হেডসেট বা ক্লাসরুমের প্রয়োজন নেই।',
    or: 'ଜାଗରୁକ ଶ୍ରମିକମାନଙ୍କୁ ଦୁର୍ଘଟଣା ହେବା ପୂର୍ବରୁ ବିପଦ ଚିହ୍ନଟ କରିବାକୁ ତାଲିମ ଦିଏ — ଫୋନ କ୍ୟାମେରା ଏବଂ ଏକ AI ସୁରକ୍ଷା ନିରୀକ୍ଷକ ବ୍ୟବହାର କରି, କୌଣସି ହେଡସେଟ କିମ୍ବା କ୍ଲାସରୁମ ଦରକାର ନାହିଁ।',
    ur: 'جاگروک ورکرز کو حادثہ ہونے سے پہلے خطرات پہچاننا سکھاتا ہے — فون کیمرہ اور ایک اے آئی سیفٹی انسپکٹر کے ذریعے، کسی ہیڈسیٹ یا کلاس روم کی ضرورت نہیں۔',
  },
  home_cta_scan: { en: 'Scan a Hazard', hi: 'खतरा स्कैन करें', bn: 'বিপদ স্ক্যান করুন', or: 'ବିପଦ ସ୍କାନ କରନ୍ତୁ', ur: 'خطرہ اسکین کریں' },
  home_cta_train: { en: 'Start Simulator', hi: 'सिम्युलेटर शुरू करें', bn: 'সিমুলেটর শুরু করুন', or: 'ସିମୁଲେଟର ଆରମ୍ଭ କରନ୍ତୁ', ur: 'سمیولیٹر شروع کریں' },

  home_stat1_n: { en: 'Preventable', hi: 'रोका जा सकता है', bn: 'প্রতিরোধযোগ্য', or: 'ପ୍ରତିରୋଧ ଯୋଗ୍ୟ', ur: 'قابل روک تھام' },
  home_stat1_l: {
    en: 'Most mining and factory-floor accidents trace back to a hazard someone recognized too late — or never at all.',
    hi: 'अधिकांश खनन और फैक्ट्री दुर्घटनाएं किसी खतरे से जुड़ी होती हैं जिसे किसी ने बहुत देर से पहचाना — या कभी नहीं पहचाना।',
    bn: 'বেশিরভাগ খনি ও কারখানা দুর্ঘটনা এমন এক বিপদের সাথে জড়িত যা কেউ খুব দেরিতে চিনেছে — অথবা কখনো চেনেনি।',
    or: 'ଅଧିକାଂଶ ଖଣି ଏବଂ କାରଖାନା ଦୁର୍ଘଟଣା ଏକ ବିପଦ ସହିତ ଜଡ଼ିତ ଯାହା କେହି ବହୁତ ବିଳମ୍ବରେ ଚିହ୍ନିଥିଲେ — କିମ୍ବା କେବେ ବି ନାହିଁ।',
    ur: 'زیادہ تر کان کنی اور فیکٹری حادثات ایسے خطرے سے جڑے ہوتے ہیں جسے کسی نے بہت دیر سے پہچانا — یا کبھی نہیں۔',
  },
  home_stat2_n: { en: 'Seconds', hi: 'सेकंड', bn: 'সেকেন্ড', or: 'ସେକେଣ୍ଡ', ur: 'سیکنڈ' },
  home_stat2_l: {
    en: "That's how fast a worker needs to spot exposed wiring, an unguarded machine, or a missing gas alarm.",
    hi: 'इतनी ही जल्दी एक श्रमिक को खुली तार, बिना गार्ड वाली मशीन, या गायब गैस अलार्म पहचानना होता है।',
    bn: 'একজন শ্রমিককে খোলা তার, গার্ডবিহীন মেশিন বা অনুপস্থিত গ্যাস অ্যালার্ম এতো দ্রুত চিনতে হয়।',
    or: 'ଏହା ହେଉଛି ଏକ ଶ୍ରମିକ ଖୋଲା ତାର, ଗାର୍ଡ ନଥିବା ମେସିନ, କିମ୍ବା ନଥିବା ଗ୍ୟାସ ଆଲାର୍ମ ଚିହ୍ନଟ କରିବାକୁ କେତେ ଶୀଘ୍ର ଆବଶ୍ୟକ କରେ।',
    ur: 'اتنی ہی جلدی ایک ورکر کو کھلی تار، بغیر گارڈ والی مشین، یا غائب گیس الارم پہچاننا ہوتا ہے۔',
  },
  home_stat3_n: { en: 'Zero cost', hi: 'शून्य लागत', bn: 'শূন্য খরচ', or: 'ଶୂନ୍ୟ ମୂଲ୍ୟ', ur: 'صفر لاگت' },
  home_stat3_l: {
    en: "No AR headset, no simulator lab. A phone camera and an AI inspector cover what the classroom can't.",
    hi: 'कोई एआर हेडसेट नहीं, कोई सिम्युलेटर लैब नहीं। एक फोन कैमरा और एआई इंस्पेक्टर वह करते हैं जो क्लासरूम नहीं कर सकता।',
    bn: 'কোনো এআর হেডসেট নয়, কোনো সিমুলেটর ল্যাব নয়। একটি ফোন ক্যামেরা এবং এআই ইন্সপেক্টর সেটাই করে যা ক্লাসরুম পারে না।',
    or: 'କୌଣସି AR ହେଡସେଟ ନାହିଁ, କୌଣସି ସିମୁଲେଟର ଲ୍ୟାବ ନାହିଁ। ଏକ ଫୋନ କ୍ୟାମେରା ଏବଂ AI ନିରୀକ୍ଷକ ତାହା କରନ୍ତି ଯାହା କ୍ଲାସରୁମ କରିପାରେ ନାହିଁ।',
    ur: 'کوئی اے آر ہیڈسیٹ نہیں، کوئی سمیولیٹر لیب نہیں۔ ایک فون کیمرہ اور اے آئی انسپکٹر وہ کام کرتے ہیں جو کلاس روم نہیں کر سکتا۔',
  },

  home_how: { en: 'How it works', hi: 'यह कैसे काम करता है', bn: 'এটি কীভাবে কাজ করে', or: 'ଏହା କିପରି କାର୍ଯ୍ୟ କରେ', ur: 'یہ کیسے کام کرتا ہے' },
  home_step1_e: { en: 'Step one', hi: 'चरण एक', bn: 'ধাপ এক', or: 'ପ୍ରଥମ ପାହାଚ', ur: 'قدم ایک' },
  home_step1_t: { en: 'Point your camera', hi: 'अपना कैमरा दिखाएं', bn: 'আপনার ক্যামেরা তাক করুন', or: 'ଆପଣଙ୍କ କ୍ୟାମେରା ଦେଖାନ୍ତୁ', ur: 'اپنا کیمرہ دکھائیں' },
  home_step1_b: {
    en: 'Photograph a real work area, or a training photo. Our AI inspector scans it against mining and factory safety standards.',
    hi: 'किसी वास्तविक कार्यक्षेत्र या प्रशिक्षण फोटो को कैद करें। हमारा एआई इंस्पेक्टर इसे खनन और फैक्ट्री सुरक्षा मानकों के विरुद्ध जांचता है।',
    bn: 'একটি বাস্তব কর্মক্ষেত্র বা একটি প্রশিক্ষণ ছবি তুলুন। আমাদের এআই ইন্সপেক্টর এটি খনি ও কারখানার নিরাপত্তা মান অনুযায়ী পরীক্ষা করে।',
    or: 'ଏକ ପ୍ରକୃତ କାର୍ଯ୍ୟସ୍ଥଳ, କିମ୍ବା ଏକ ତାଲିମ ଫଟୋ ଉଠାନ୍ତୁ। ଆମର AI ନିରୀକ୍ଷକ ଏହାକୁ ଖଣି ଏବଂ କାରଖାନା ସୁରକ୍ଷା ମାନ ବିରୁଦ୍ଧରେ ସ୍କାନ କରେ।',
    ur: 'ایک حقیقی کام کی جگہ، یا ایک تربیتی تصویر کھینچیں۔ ہمارا اے آئی انسپکٹر اسے کان کنی اور فیکٹری حفاظتی معیارات کے خلاف جانچتا ہے۔',
  },
  home_step2_e: { en: 'Step two', hi: 'चरण दो', bn: 'ধাপ দুই', or: 'ଦ୍ୱିତୀୟ ପାହାଚ', ur: 'قدم دو' },
  home_step2_t: { en: 'See what it sees', hi: 'देखें कि यह क्या देखता है', bn: 'এটি কী দেখে তা দেখুন', or: 'ଏହା କଣ ଦେଖେ ଦେଖନ୍ତୁ', ur: 'دیکھیں یہ کیا دیکھتا ہے' },
  home_step2_b: {
    en: 'Hazards are marked directly on the image with severity and a plain-language explanation — helmet missing, wiring exposed, guard removed.',
    hi: 'खतरों को सीधे तस्वीर पर गंभीरता और सरल भाषा में स्पष्टीकरण के साथ चिह्नित किया जाता है — हेलमेट गायब, तार खुली, गार्ड हटाया गया।',
    bn: 'বিপদগুলি সরাসরি ছবিতে তীব্রতা ও সহজ ভাষায় ব্যাখ্যা সহ চিহ্নিত করা হয় — হেলমেট নেই, তার খোলা, গার্ড সরানো।',
    or: 'ବିପଦଗୁଡ଼ିକ ସିଧାସଳଖ ଛବିରେ ତୀବ୍ରତା ଏବଂ ସରଳ ଭାଷାରେ ବ୍ୟାଖ୍ୟା ସହିତ ଚିହ୍ନିତ ହୁଏ — ହେଲମେଟ ନାହିଁ, ତାର ଖୋଲା, ଗାର୍ଡ ହଟାଯାଇଛି।',
    ur: 'خطرات کو براہ راست تصویر پر شدت اور آسان زبان میں وضاحت کے ساتھ نشان زد کیا جاتا ہے — ہیلمٹ غائب، تار کھلی، گارڈ ہٹایا گیا۔',
  },
  home_step3_e: { en: 'Step three', hi: 'चरण तीन', bn: 'ধাপ তিন', or: 'ତୃତୀୟ ପାହାଚ', ur: 'قدم تین' },
  home_step3_t: { en: 'Train the reflex', hi: 'प्रतिक्रिया को प्रशिक्षित करें', bn: 'প্রতিক্রিয়া প্রশিক্ষণ দিন', or: 'ପ୍ରତିକ୍ରିୟାକୁ ତାଲିମ ଦିଅନ୍ତୁ', ur: 'ردعمل کی تربیت کریں' },
  home_step3_b: {
    en: 'Run branching shaft and factory-floor scenarios with a voice-guided AI trainer that reacts to your choices in real time.',
    hi: 'एक आवाज-निर्देशित एआई ट्रेनर के साथ शाखायुक्त शाफ्ट और फैक्ट्री-फ्लोर परिदृश्य चलाएं जो आपके विकल्पों पर वास्तविक समय में प्रतिक्रिया देता है।',
    bn: 'একটি ভয়েস-গাইডেড এআই প্রশিক্ষকের সাথে শাখাযুক্ত শ্যাফট ও কারখানা-ফ্লোর পরিস্থিতি চালান, যা আপনার পছন্দে রিয়েল-টাইমে প্রতিক্রিয়া দেয়।',
    or: 'ଏକ ଭଏସ-ଗାଇଡେଡ AI ଟ୍ରେନର ସହିତ ଶାଖା ସୁଡ଼ ଏବଂ କାରଖାନା-ଫ୍ଲୋର ପରିସ୍ଥିତି ଚଲାନ୍ତୁ ଯାହା ଆପଣଙ୍କ ପସନ୍ଦରେ ରିଅଲ-ଟାଇମରେ ପ୍ରତିକ୍ରିୟା ଦିଏ।',
    ur: 'ایک آواز کی رہنمائی والے اے آئی ٹرینر کے ساتھ شاخ دار شافٹ اور فیکٹری فلور کے منظرنامے چلائیں جو آپ کے انتخاب پر حقیقی وقت میں ردعمل ظاہر کرتا ہے۔',
  },

  scan_eyebrow: { en: 'Hazard Scan', hi: 'खतरा स्कैन', bn: 'বিপদ স্ক্যান', or: 'ବିପଦ ସ୍କାନ', ur: 'خطرہ اسکین' },
  scan_title: { en: 'Point. Capture. Inspect.', hi: 'दिखाएं। कैद करें। जांचें।', bn: 'দেখান। ক্যাপচার করুন। পরীক্ষা করুন।', or: 'ଦେଖାନ୍ତୁ। କ୍ୟାପଚର କରନ୍ତୁ। ପରୀକ୍ଷା କରନ୍ତୁ।', ur: 'دکھائیں۔ کیپچر کریں۔ معائنہ کریں۔' },
  scan_desc: {
    en: 'Upload or capture a photo of a work area. The AI inspector marks hazards directly on the image, the way a safety officer would during a floor walk.',
    hi: 'कार्यक्षेत्र की तस्वीर अपलोड करें या कैद करें। एआई इंस्पेक्टर तस्वीर पर सीधे खतरों को चिह्नित करता है, ठीक वैसे जैसे कोई सुरक्षा अधिकारी फ्लोर वॉक के दौरान करता है।',
    bn: 'একটি কর্মক্ষেত্রের ছবি আপলোড বা ক্যাপচার করুন। এআই ইন্সপেক্টর সরাসরি ছবিতে বিপদ চিহ্নিত করে, যেভাবে একজন সেফটি অফিসার ফ্লোর ওয়াকের সময় করেন।',
    or: 'ଏକ କାର୍ଯ୍ୟସ୍ଥଳର ଫଟୋ ଅପଲୋଡ କରନ୍ତୁ କିମ୍ବା ଉଠାନ୍ତୁ। AI ନିରୀକ୍ଷକ ସିଧାସଳଖ ଛବିରେ ବିପଦ ଚିହ୍ନଟ କରେ, ଠିକ ଯେପରି ଜଣେ ସୁରକ୍ଷା ଅଧିକାରୀ ଫ୍ଲୋର ୱାକ ସମୟରେ କରନ୍ତି।',
    ur: 'کام کی جگہ کی تصویر اپ لوڈ یا کیپچر کریں۔ اے آئی انسپکٹر براہ راست تصویر پر خطرات کی نشاندہی کرتا ہے، بالکل اسی طرح جیسے ایک سیفٹی افسر فلور واک کے دوران کرتا ہے۔',
  },
  scan_open: { en: 'Open Camera / Upload Photo', hi: 'कैमरा खोलें / फोटो अपलोड करें', bn: 'ক্যামেরা খুলুন / ছবি আপলোড করুন', or: 'କ୍ୟାମେରା ଖୋଲନ୍ତୁ / ଫଟୋ ଅପଲୋଡ କରନ୍ତୁ', ur: 'کیمرہ کھولیں / تصویر اپ لوڈ کریں' },
  scan_hint: { en: 'Works with any work-area or training photo.', hi: 'किसी भी कार्यक्षेत्र या प्रशिक्षण फोटो के साथ काम करता है।', bn: 'যেকোনো কর্মক্ষেত্র বা প্রশিক্ষণ ছবির সাথে কাজ করে।', or: 'ଯେକୌଣସି କାର୍ଯ୍ୟସ୍ଥଳ କିମ୍ବା ତାଲିମ ଫଟୋ ସହିତ କାର୍ଯ୍ୟ କରେ।', ur: 'کسی بھی کام کی جگہ یا تربیتی تصویر کے ساتھ کام کرتا ہے۔' },
  scan_run: { en: 'Run AI Inspection', hi: 'एआई निरीक्षण चलाएं', bn: 'এআই পরিদর্শন চালান', or: 'AI ନିରୀକ୍ଷଣ ଚଲାନ୍ତୁ', ur: 'اے آئی معائنہ چلائیں' },
  scan_analyzing: { en: 'Analyzing…', hi: 'विश्लेषण हो रहा है…', bn: 'বিশ্লেষণ চলছে…', or: 'ବିଶ୍ଳେଷଣ ହେଉଛି…', ur: 'تجزیہ ہو رہا ہے…' },
  scan_retake: { en: 'Retake', hi: 'फिर से लें', bn: 'পুনরায় তুলুন', or: 'ପୁଣି ନିଅନ୍ତୁ', ur: 'دوبارہ لیں' },
  scan_no_key_title: { en: 'No API key set', hi: 'कोई एपीआई कुंजी सेट नहीं है', bn: 'কোনো এপিআই কী সেট করা নেই', or: 'କୌଣସି API କୀ ସେଟ ହୋଇନାହିଁ', ur: 'کوئی اے پی آئی کی سیٹ نہیں ہے' },
  scan_no_key_body: { en: 'Add a free Gemini or OpenAI key in Settings to run inspections.', hi: 'निरीक्षण चलाने के लिए सेटिंग्स में एक मुफ्त Gemini या OpenAI कुंजी जोड़ें।', bn: 'পরিদর্শন চালাতে সেটিংসে একটি বিনামূল্যে Gemini বা OpenAI কী যোগ করুন।', or: 'ନିରୀକ୍ଷଣ ଚଲାଇବାକୁ ସେଟିଂସରେ ଏକ ମାଗଣା Gemini କିମ୍ବା OpenAI କୀ ଯୋଡ଼ନ୍ତୁ।', ur: 'معائنہ چلانے کے لیے ترتیبات میں ایک مفت Gemini یا OpenAI کی شامل کریں۔' },
  scan_no_hazards: { en: 'No hazards detected.', hi: 'कोई खतरा नहीं मिला।', bn: 'কোনো বিপদ পাওয়া যায়নি।', or: 'କୌଣସି ବିପଦ ମିଳିଲା ନାହିଁ।', ur: 'کوئی خطرہ نہیں ملا۔' },
  scan_another: { en: 'Scan Another Photo', hi: 'दूसरी फोटो स्कैन करें', bn: 'অন্য ছবি স্ক্যান করুন', or: 'ଅନ୍ୟ ଫଟୋ ସ୍କାନ କରନ୍ତୁ', ur: 'دوسری تصویر اسکین کریں' },

  list_eyebrow: { en: 'Simulator', hi: 'सिम्युलेटर', bn: 'সিমুলেটর', or: 'ସିମୁଲେଟର', ur: 'سمیولیٹر' },
  list_title: { en: 'Choose a scenario', hi: 'एक परिदृश्य चुनें', bn: 'একটি পরিস্থিতি বেছে নিন', or: 'ଏକ ପରିସ୍ଥିତି ବାଛନ୍ତୁ', ur: 'ایک منظرنامہ منتخب کریں' },
  list_desc: {
    en: 'Branching, voice-guided scenarios built from real mining and factory-floor situations. Every choice is scored — this is your safety reflex, tested.',
    hi: 'वास्तविक खनन और फैक्ट्री-फ्लोर स्थितियों से बने शाखायुक्त, आवाज-निर्देशित परिदृश्य। हर विकल्प का स्कोर होता है — यह आपकी सुरक्षा प्रतिक्रिया की परीक्षा है।',
    bn: 'বাস্তব খনি ও কারখানা-ফ্লোর পরিস্থিতি থেকে তৈরি শাখাযুক্ত, ভয়েস-গাইডেড পরিস্থিতি। প্রতিটি পছন্দের স্কোর হয় — এটি আপনার নিরাপত্তা প্রতিক্রিয়ার পরীক্ষা।',
    or: 'ପ୍ରକୃତ ଖଣି ଏବଂ କାରଖାନା-ଫ୍ଲୋର ପରିସ୍ଥିତିରୁ ତିଆରି ଶାଖା ଏବଂ ଭଏସ-ଗାଇଡେଡ ପରିସ୍ଥିତି। ପ୍ରତ୍ୟେକ ପସନ୍ଦର ସ୍କୋର ହୁଏ — ଏହା ଆପଣଙ୍କ ସୁରକ୍ଷା ପ୍ରତିକ୍ରିୟାର ପରୀକ୍ଷା।',
    ur: 'حقیقی کان کنی اور فیکٹری فلور کی صورتحال سے بنائے گئے شاخ دار، آواز کی رہنمائی والے منظرنامے۔ ہر انتخاب کا اسکور ہوتا ہے — یہ آپ کے حفاظتی ردعمل کا امتحان ہے۔',
  },
  list_points: { en: 'decision points', hi: 'निर्णय बिंदु', bn: 'সিদ্ধান্ত পয়েন্ট', or: 'ନିଷ୍ପତ୍ତି ପଏଣ୍ଟ', ur: 'فیصلہ پوائنٹس' },

  sc_complete: { en: 'Scenario Complete', hi: 'परिदृश्य पूर्ण', bn: 'পরিস্থিতি সম্পূর্ণ', or: 'ପରିସ୍ଥିତି ସମ୍ପୂର୍ଣ୍ଣ', ur: 'منظرنامہ مکمل' },
  sc_more: { en: 'More Scenarios', hi: 'और परिदृश्य', bn: 'আরও পরিস্থিতি', or: 'ଅଧିକ ପରିସ୍ଥିତି', ur: 'مزید منظرنامے' },
  sc_dashboard: { en: 'View Dashboard', hi: 'डैशबोर्ड देखें', bn: 'ড্যাশবোর্ড দেখুন', or: 'ଡ୍ୟାସବୋର୍ଡ ଦେଖନ୍ତୁ', ur: 'ڈیش بورڈ دیکھیں' },
  sc_safe: { en: 'Safe choice', hi: 'सुरक्षित विकल्प', bn: 'নিরাপদ পছন্দ', or: 'ସୁରକ୍ଷିତ ପସନ୍ଦ', ur: 'محفوظ انتخاب' },
  sc_unsafe: { en: 'Unsafe choice', hi: 'असुरक्षित विकल्प', bn: 'অনিরাপদ পছন্দ', or: 'ଅସୁରକ୍ଷିତ ପସନ୍ଦ', ur: 'غیر محفوظ انتخاب' },
  sc_continue: { en: 'Continue', hi: 'जारी रखें', bn: 'চালিয়ে যান', or: 'ଜାରି ରଖନ୍ତୁ', ur: 'جاری رکھیں' },
  sc_finish: { en: 'Finish Scenario', hi: 'परिदृश्य समाप्त करें', bn: 'পরিস্থিতি শেষ করুন', or: 'ପରିସ୍ଥିତି ସମାପ୍ତ କରନ୍ତୁ', ur: 'منظرنامہ ختم کریں' },
  sc_trainer_thinking: { en: 'AI trainer is thinking…', hi: 'एआई ट्रेनर सोच रहा है…', bn: 'এআই প্রশিক্ষক ভাবছেন…', or: 'AI ଟ୍ରେନର ଚିନ୍ତା କରୁଛନ୍ତି…', ur: 'اے آئی ٹرینر سوچ رہا ہے…' },
  sc_decision: { en: 'Decision', hi: 'निर्णय', bn: 'সিদ্ধান্ত', or: 'ନିଷ୍ପତ୍ତି', ur: 'فیصلہ' },
  sc_of: { en: 'of', hi: 'में से', bn: 'এর মধ্যে', or: 'ମଧ୍ୟରୁ', ur: 'میں سے' },

  dash_eyebrow: { en: 'Progress', hi: 'प्रगति', bn: 'অগ্রগতি', or: 'ପ୍ରଗତି', ur: 'پیش رفت' },
  dash_sessions: { en: 'Sessions', hi: 'सत्र', bn: 'সেশন', or: 'ସେସନ', ur: 'سیشنز' },
  dash_clear: { en: 'Clear log', hi: 'लॉग साफ़ करें', bn: 'লগ মুছুন', or: 'ଲଗ ସଫା କରନ୍ତୁ', ur: 'لاگ صاف کریں' },
  dash_empty: { en: 'No activity yet. Run a hazard scan or scenario to see your record here.', hi: 'अभी तक कोई गतिविधि नहीं। अपना रिकॉर्ड यहां देखने के लिए खतरा स्कैन या परिदृश्य चलाएं।', bn: 'এখনও কোনো কার্যকলাপ নেই। আপনার রেকর্ড দেখতে একটি বিপদ স্ক্যান বা পরিস্থিতি চালান।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କାର୍ଯ୍ୟକଳାପ ନାହିଁ। ଆପଣଙ୍କ ରେକର୍ଡ ଏଠାରେ ଦେଖିବାକୁ ଏକ ବିପଦ ସ୍କାନ କିମ୍ବା ପରିସ୍ଥିତି ଚଲାନ୍ତୁ।', ur: 'ابھی تک کوئی سرگرمی نہیں۔ اپنا ریکارڈ یہاں دیکھنے کے لیے خطرہ اسکین یا منظرنامہ چلائیں۔' },
  dash_hazard_scan: { en: 'Hazard Scan', hi: 'खतरा स्कैन', bn: 'বিপদ স্ক্যান', or: 'ବିପଦ ସ୍କାନ', ur: 'خطرہ اسکین' },
  dash_scenario_training: { en: 'Scenario Training', hi: 'परिदृश्य प्रशिक्षण', bn: 'পরিস্থিতি প্রশিক্ষণ', or: 'ପରିସ୍ଥିତି ତାଲିମ', ur: 'منظرنامہ تربیت' },

  set_eyebrow: { en: 'Settings', hi: 'सेटिंग्स', bn: 'সেটিংস', or: 'ସେଟିଂସ', ur: 'ترتیبات' },
  set_title: { en: 'AI Provider', hi: 'एआई प्रदाता', bn: 'এআই প্রদানকারী', or: 'AI ପ୍ରଦାତା', ur: 'اے آئی فراہم کنندہ' },
  set_provider_label: { en: 'Provider', hi: 'प्रदाता', bn: 'প্রদানকারী', or: 'ପ୍ରଦାତା', ur: 'فراہم کنندہ' },
  set_provider_hint: { en: 'Gemini has the most generous free tier — recommended for a hackathon demo.', hi: 'Gemini का मुफ्त टियर सबसे उदार है — हैकाथॉन डेमो के लिए अनुशंसित।', bn: 'Gemini-এর সবচেয়ে উদার ফ্রি টিয়ার আছে — হ্যাকাথন ডেমোর জন্য প্রস্তাবিত।', or: 'Gemini ର ସବୁଠାରୁ ଉଦାର ମାଗଣା ସ୍ତର ଅଛି — ହ୍ୟାକାଥନ ଡେମୋ ପାଇଁ ସୁପାରିଶ କରାଯାଏ।', ur: 'Gemini کا سب سے فراخدلانہ مفت ٹیئر ہے — ہیکاتھون ڈیمو کے لیے تجویز کردہ۔' },
  set_key_label: { en: 'API Key', hi: 'एपीआई कुंजी', bn: 'এপিআই কী', or: 'API କୀ', ur: 'اے پی آئی کی' },
  set_key_placeholder: { en: 'Paste your API key', hi: 'अपनी एपीआई कुंजी पेस्ट करें', bn: 'আপনার এপিআই কী পেস্ট করুন', or: 'ଆପଣଙ୍କ API କୀ ପେଷ୍ଟ କରନ୍ତୁ', ur: 'اپنی اے پی آئی کی پیسٹ کریں' },
  set_key_hint1: { en: "Stored only in your browser's local storage. Never sent anywhere except directly to", hi: 'केवल आपके ब्राउज़र के लोकल स्टोरेज में सहेजा गया। सीधे इसके अलावा कहीं नहीं भेजा जाता', bn: 'শুধুমাত্র আপনার ব্রাউজারের লোকাল স্টোরেজে সংরক্ষিত। সরাসরি এটি ছাড়া অন্য কোথাও পাঠানো হয় না', or: 'କେବଳ ଆପଣଙ୍କ ବ୍ରାଉଜରର ଲୋକାଲ ଷ୍ଟୋରେଜରେ ସଂରକ୍ଷିତ। ସିଧାସଳଖ ଏହା ବ୍ୟତୀତ ଅନ୍ୟ କେଉଁଠାକୁ ପଠାଯାଏ ନାହିଁ', ur: 'صرف آپ کے براؤزر کے لوکل اسٹوریج میں محفوظ۔ براہ راست اس کے سوا کہیں نہیں بھیجا جاتا' },
  set_save: { en: 'Save Settings', hi: 'सेटिंग्स सहेजें', bn: 'সেটিংস সংরক্ষণ করুন', or: 'ସେଟିଂସ ସେଭ କରନ୍ତୁ', ur: 'ترتیبات محفوظ کریں' },
  set_saved: { en: 'Saved ✓', hi: 'सहेजा गया ✓', bn: 'সংরক্ষিত ✓', or: 'ସେଭ ହୋଇଛି ✓', ur: 'محفوظ ✓' },
  set_getting_key: { en: 'Getting a free key:', hi: 'मुफ्त कुंजी प्राप्त करना:', bn: 'একটি বিনামূল্যে কী পাওয়া:', or: 'ମାଗଣା କୀ ପାଇବା:', ur: 'مفت کی حاصل کرنا:' },
  set_language_label: { en: 'App Language', hi: 'ऐप की भाषा', bn: 'অ্যাপ ভাষা', or: 'ଆପ୍ ଭାଷା', ur: 'ایپ کی زبان' },

  chat_title: { en: 'Jaagruk Assistant', hi: 'जागरुक सहायक', sat: 'ᱡᱟᱜᱨᱩᱠ ᱜᱚᱲᱚ', bn: 'জাগরুক সহায়ক', or: 'ଜାଗରୁକ ସହାୟକ', ur: 'جاگروک اسسٹنٹ' },
  chat_placeholder: { en: 'Ask about this app…', hi: 'इस ऐप के बारे में पूछें…', bn: 'এই অ্যাপ সম্পর্কে জিজ্ঞাসা করুন…', or: 'ଏହି ଆପ ବିଷୟରେ ପଚାରନ୍ତୁ…', ur: 'اس ایپ کے بارے میں پوچھیں…' },
  chat_greeting: {
    en: "Hi! I'm the Jaagruk assistant. Ask me anything about how this app works — AR drills, reaction-time scoring, the buddy drill, certificates, hazard reports, or anything you're unsure about.",
    hi: 'नमस्ते! मैं जागरुक सहायक हूं। यह ऐप कैसे काम करता है — खतरा स्कैनिंग, परिदृश्य, सेटिंग्स, या जो भी आपको समझ न आए, मुझसे कुछ भी पूछें।',
    bn: 'নমস্কার! আমি জাগরুক সহায়ক। এই অ্যাপ কীভাবে কাজ করে — বিপদ স্ক্যানিং, পরিস্থিতি, সেটিংস, বা যা কিছু নিয়ে আপনি নিশ্চিত নন, আমাকে জিজ্ঞাসা করুন।',
    or: 'ନମସ୍କାର! ମୁଁ ଜାଗରୁକ ସହାୟକ। ଏହି ଆପ କିପରି କାର୍ଯ୍ୟ କରେ — ବିପଦ ସ୍କାନିଂ, ପରିସ୍ଥିତି, ସେଟିଂସ, କିମ୍ବା ଆପଣ ନିଶ୍ଚିତ ନଥିବା ଯେକୌଣସି ବିଷୟରେ ମୋତେ ପଚାରନ୍ତୁ।',
    ur: 'السلام علیکم! میں جاگروک اسسٹنٹ ہوں۔ یہ ایپ کیسے کام کرتی ہے — خطرہ اسکیننگ، منظرنامے، ترتیبات، یا جو کچھ بھی آپ کو سمجھ نہ آئے، مجھ سے پوچھیں۔',
  },
  chat_no_key: {
    en: 'Add a free API key in Settings first so I can respond — go to the Settings tab and paste a Gemini key.',
    hi: 'पहले सेटिंग्स में एक मुफ्त एपीआई कुंजी जोड़ें ताकि मैं जवाब दे सकूं — सेटिंग्स टैब पर जाएं और Gemini कुंजी पेस्ट करें।',
    bn: 'আমি উত্তর দিতে পারার জন্য প্রথমে সেটিংসে একটি বিনামূল্যে এপিআই কী যোগ করুন — সেটিংস ট্যাবে যান এবং একটি Gemini কী পেস্ট করুন।',
    or: 'ମୁଁ ଉତ୍ତର ଦେବାକୁ ପ୍ରଥମେ ସେଟିଂସରେ ଏକ ମାଗଣା API କୀ ଯୋଡ଼ନ୍ତୁ — ସେଟିଂସ ଟ୍ୟାବକୁ ଯାଆନ୍ତୁ ଏବଂ ଏକ Gemini କୀ ପେଷ୍ଟ କରନ୍ତୁ।',
    ur: 'مجھے جواب دینے کے قابل بنانے کے لیے پہلے ترتیبات میں ایک مفت اے پی آئی کی شامل کریں — ترتیبات ٹیب پر جائیں اور ایک Gemini کی پیسٹ کریں۔',
  },
  chat_thinking: { en: 'Thinking…', hi: 'सोच रहा हूं…', bn: 'ভাবছি…', or: 'ଚିନ୍ତା କରୁଛି…', ur: 'سوچ رہا ہوں…', sat: 'ᱵᱷᱟᱵᱤᱡ ᱛᱟᱦᱮᱸᱱ…' },
  chat_send: { en: 'Send', hi: 'भेजें', bn: 'পাঠান', or: 'ପଠାନ୍ତୁ', ur: 'بھیجیں', sat: 'ᱠᱩᱞ ᱢᱮ' },

  // --- Certification / QR certificate ---
  nav_cert: { en: 'Certification', hi: 'प्रमाणन', bn: 'সনদায়ন', or: 'ପ୍ରମାଣନ', ur: 'سرٹیفیکیشن', sat: 'ᱥᱚᱨᱴᱤᱯᱤᱠᱮᱴ' },
  nav_admin: { en: 'Admin', hi: 'एडमिन', bn: 'অ্যাডমিন', or: 'ଆଡମିନ', ur: 'ایڈمن', sat: 'ᱮᱰᱢᱤᱱ' },
  cert_eyebrow: { en: 'Certification', hi: 'प्रमाणन', bn: 'সনদায়ন', or: 'ପ୍ରମାଣନ', ur: 'سرٹیفیکیشن' },
  cert_title: { en: 'Your Safety Certificate', hi: 'आपका सुरक्षा प्रमाणपत्र', bn: 'আপনার নিরাপত্তা সনদ', or: 'ଆପଣଙ୍କ ସୁରକ୍ଷା ପ୍ରମାଣପତ୍ର', ur: 'آپ کا حفاظتی سرٹیفکیٹ' },
  cert_desc: {
    en: 'Pass all 5 safety domains to unlock a verifiable QR certificate.',
    hi: 'सत्यापन योग्य क्यूआर प्रमाणपत्र अनलॉक करने के लिए सभी 5 सुरक्षा डोमेन पास करें।',
    bn: 'যাচাইযোগ্য কিউআর সনদ আনলক করতে সবগুলো ৫টি নিরাপত্তা ডোমেইন পাস করুন।',
    or: 'ଯାଞ୍ଚଯୋଗ୍ୟ QR ପ୍ରମାଣପତ୍ର ଅନଲକ କରିବାକୁ ସମସ୍ତ 5 ସୁରକ୍ଷା ଡୋମେନ ପାସ କରନ୍ତୁ।',
    ur: 'قابل تصدیق کیو آر سرٹیفکیٹ کھولنے کے لیے تمام 5 حفاظتی ڈومینز پاس کریں۔',
  },
  cert_domains_passed: { en: 'Domains Passed', hi: 'पास किए गए डोमेन', bn: 'পাস করা ডোমেইন', or: 'ପାସ ହୋଇଥିବା ଡୋମେନ', ur: 'پاس شدہ ڈومینز' },
  cert_pass_threshold: { en: 'Pass threshold:', hi: 'उत्तीर्ण सीमा:', bn: 'পাস সীমা:', or: 'ପାସ ସୀମା:', ur: 'پاسنگ حد:' },
  cert_retry_needed: { en: 'Retry needed', hi: 'दोबारा प्रयास आवश्यक', bn: 'পুনরায় চেষ্টা প্রয়োজন', or: 'ପୁନଃ ପ୍ରୟାସ ଆବଶ୍ୟକ', ur: 'دوبارہ کوشش درکار' },
  cert_not_attempted: { en: 'Not attempted', hi: 'प्रयास नहीं किया गया', bn: 'চেষ্টা করা হয়নি', or: 'ପ୍ରୟାସ କରାଯାଇନାହିଁ', ur: 'کوشش نہیں کی گئی' },
  cert_not_eligible: {
    en: 'Complete and pass every domain to unlock your certificate. Head to the',
    hi: 'अपना प्रमाणपत्र अनलॉक करने के लिए हर डोमेन पूरा करें और पास करें। यहां जाएं:',
    bn: 'আপনার সনদ আনলক করতে প্রতিটি ডোমেইন সম্পূর্ণ ও পাস করুন। যান',
    or: 'ଆପଣଙ୍କ ପ୍ରମାଣପତ୍ର ଅନଲକ କରିବାକୁ ପ୍ରତ୍ୟେକ ଡୋମେନ ସମ୍ପୂର୍ଣ୍ଣ ଏବଂ ପାସ କରନ୍ତୁ। ଯାଆନ୍ତୁ',
    ur: 'اپنا سرٹیفکیٹ کھولنے کے لیے ہر ڈومین مکمل اور پاس کریں۔ جائیں',
  },
  cert_eligible_title: { en: "You're eligible! Generate your certificate", hi: 'आप पात्र हैं! अपना प्रमाणपत्र बनाएं', bn: 'আপনি যোগ্য! আপনার সনদ তৈরি করুন', or: 'ଆପଣ ଯୋଗ୍ୟ! ଆପଣଙ୍କ ପ୍ରମାଣପତ୍ର ତିଆରି କରନ୍ତୁ', ur: 'آپ اہل ہیں! اپنا سرٹیفکیٹ بنائیں' },
  cert_issue_btn: { en: 'Generate Certificate', hi: 'प्रमाणपत्र बनाएं', bn: 'সনদ তৈরি করুন', or: 'ପ୍ରମାଣପତ୍ର ତିଆରି କରନ୍ତୁ', ur: 'سرٹیفکیٹ بنائیں' },
  cert_issued_label: { en: 'Certificate Issued', hi: 'प्रमाणपत्र जारी किया गया', bn: 'সনদ ইস্যু করা হয়েছে', or: 'ପ୍ରମାଣପତ୍ର ଜାରି ହୋଇଛି', ur: 'سرٹیفکیٹ جاری کر دیا گیا' },
  cert_view_verification: { en: 'View Verification Page', hi: 'सत्यापन पृष्ठ देखें', bn: 'যাচাই পৃষ্ঠা দেখুন', or: 'ଯାଞ୍ଚ ପୃଷ୍ଠା ଦେଖନ୍ତୁ', ur: 'تصدیقی صفحہ دیکھیں' },
  cert_print: { en: 'Print / Save PDF', hi: 'प्रिंट / पीडीएफ सहेजें', bn: 'প্রিন্ট / পিডিএফ সংরক্ষণ', or: 'ପ୍ରିଣ୍ଟ / PDF ସେଭ', ur: 'پرنٹ / پی ڈی ایف محفوظ کریں' },

  // --- Verification page ---
  verify_eyebrow: { en: 'Certificate Verification', hi: 'प्रमाणपत्र सत्यापन', bn: 'সনদ যাচাই', or: 'ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ', ur: 'سرٹیفکیٹ کی تصدیق' },
  verify_title: { en: 'Certificate Check', hi: 'प्रमाणपत्र जांच', sat: 'ᱯᱚᱨᱢᱟᱱ ᱡᱟᱹᱨᱩᱭ', bn: 'সনদ যাচাই', or: 'ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ', ur: 'سرٹیفکیٹ چیک' },
  verify_issued: { en: 'Issued', hi: 'जारी किया गया', bn: 'ইস্যু করা হয়েছে', or: 'ଜାରି ହୋଇଛି', ur: 'جاری کیا گیا' },
  verify_invalid: { en: 'Certificate Not Found', hi: 'प्रमाणपत्र नहीं मिला', bn: 'সনদ পাওয়া যায়নি', or: 'ପ୍ରମାଣପତ୍ର ମିଳିଲା ନାହିଁ', ur: 'سرٹیفکیٹ نہیں ملا' },
  verify_invalid_desc: {
    en: 'This certificate ID does not match any issued certificate on this device.',
    hi: 'यह प्रमाणपत्र आईडी इस डिवाइस पर जारी किए गए किसी भी प्रमाणपत्र से मेल नहीं खाती।',
    bn: 'এই সনদ আইডি এই ডিভাইসে ইস্যু করা কোনো সনদের সাথে মেলে না।',
    or: 'ଏହି ପ୍ରମାଣପତ୍ର ID ଏହି ଡିଭାଇସରେ ଜାରି ହୋଇଥିବା କୌଣସି ପ୍ରମାଣପତ୍ର ସହିତ ମେଳ ଖାଉନାହିଁ।',
    ur: 'یہ سرٹیفکیٹ آئی ڈی اس ڈیوائس پر جاری کردہ کسی سرٹیفکیٹ سے مماثل نہیں ہے۔',
  },

  // --- Admin dashboard ---
  admin_eyebrow: { en: 'Admin', hi: 'एडमिन', bn: 'অ্যাডমিন', or: 'ଆଡମିନ', ur: 'ایڈمن' },
  admin_title: { en: 'Compliance Dashboard', hi: 'अनुपालन डैशबोर्ड', bn: 'কমপ্লায়েন্স ড্যাশবোর্ড', or: 'ଅନୁପାଳନ ଡ୍ୟାସବୋର୍ଡ', ur: 'تعمیل ڈیش بورڈ' },
  admin_total_certs: { en: 'Certificates Issued', hi: 'जारी प्रमाणपत्र', bn: 'ইস্যুকৃত সনদ', or: 'ଜାରି ପ୍ରମାଣପତ୍ର', ur: 'جاری سرٹیفکیٹس' },
  admin_domain_breakdown: { en: 'Domain-wise Average', hi: 'डोमेन-वार औसत', bn: 'ডোমেইন-ভিত্তিক গড়', or: 'ଡୋମେନ-ଅନୁଯାୟୀ ହାରାହାରି', ur: 'ڈومین کے حساب سے اوسط' },
  admin_certified_workers: { en: 'Certified Workers', hi: 'प्रमाणित श्रमिक', bn: 'সনদপ্রাপ্ত শ্রমিক', or: 'ପ୍ରମାଣିତ ଶ୍ରମିକ', ur: 'سرٹیفائیڈ ورکرز' },
  admin_search: { en: 'Search by name…', hi: 'नाम से खोजें…', bn: 'নাম দিয়ে খুঁজুন…', or: 'ନାମ ଦ୍ୱାରା ଖୋଜନ୍ତୁ…', ur: 'نام سے تلاش کریں…' },
  admin_export_csv: { en: 'Export CSV', hi: 'सीएसवी निर्यात करें', bn: 'সিএসভি এক্সপোর্ট', or: 'CSV ଏକ୍ସପୋର୍ଟ', ur: 'سی ایس وی ایکسپورٹ' },
  admin_no_certs: { en: 'No certificates issued yet.', hi: 'अभी तक कोई प्रमाणपत्र जारी नहीं किया गया।', bn: 'এখনও কোনো সনদ ইস্যু করা হয়নি।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ରମାଣପତ୍ର ଜାରି ହୋଇନାହିଁ।', ur: 'ابھی تک کوئی سرٹیفکیٹ جاری نہیں کیا گیا۔' },
}

// NOTE: a Santali-only notice key used to live here. It carried a value for one
// language and empty strings for the rest, so every other language rendered the
// raw key name on screen. It is replaced by coverageNotice(lang), which is driven
// by measured coverage and reads correctly in all six languages.

/**
 * Look a key up across both dictionaries, falling back to English and then to
 * the key itself. Returning the key rather than an empty string is deliberate:
 * a missing translation should be visible in development, not silently blank on
 * a worker's screen.
 */
/**
 * Fallback chain per language, tried in order before English.
 *
 * Santali falls back to Hindi first. Going straight to English skipped the more
 * useful option: in Jharkhand a Santali speaker is far more likely to read
 * Devanagari than Latin, since Hindi is the language of schooling and
 * administration in the state. It also costs nothing to render — Devanagari is
 * in the precached font subset, so the fallback never pulls a font over a network
 * the device may not have.
 *
 * Hindi is at 100% coverage, so in practice a Santali screen never reaches
 * English. That is what lets the coverage notice name Hindi honestly.
 */
export const LANGUAGE_FALLBACK = {
  sat: ['hi'],
}
const FALLBACK = LANGUAGE_FALLBACK

/** The language a missing string will actually be shown in. */
export function fallbackLanguage(lang) {
  return (FALLBACK[lang] || [])[0] || 'en'
}

export function t(key, lang) {
  const entry = STRINGS[key] || JAAGRUK_STRINGS[key]
  if (!entry) return key
  const direct = entry[lang]
  if (typeof direct === 'string' && direct.length > 0) return direct
  for (const alt of FALLBACK[lang] || []) {
    const value = entry[alt]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return entry.en || key
}

/** True when the key exists in either dictionary. Used by the coverage audit. */
export function hasKey(key) {
  return !!(STRINGS[key] || JAAGRUK_STRINGS[key])
}

// True when a language still has significant untranslated (English-fallback)
// content, so the UI can show an honest "translation in progress" notice
// instead of silently mixing languages.
/**
 * Measured coverage across BOTH dictionaries.
 *
 * This replaces a hardcoded list that was wrong in both directions: it flagged
 * Santali permanently while never flagging Bengali, Odia or Urdu even on screens
 * where they were genuinely falling back to English. Computing it means the
 * notice is accurate without anyone maintaining a list by hand.
 */
export function translationCoverage(lang) {
  return coverageFor(lang, [STRINGS, JAAGRUK_STRINGS])
}

/** Below this, the UI tells the user some screens will appear in English. */
export const COVERAGE_NOTICE_THRESHOLD = 92

export function isPartiallyTranslated(lang) {
  if (lang === 'en') return false
  return translationCoverage(lang).percent < COVERAGE_NOTICE_THRESHOLD
}

/**
 * Scenario content coverage is tracked separately from UI coverage, because a
 * partly-translated menu is an inconvenience while a partly-translated hazard
 * instruction is a safety problem. Callers use this to warn specifically about
 * drill content appearing in English.
 */
export function scenarioContentIsEnglish(lang, scenarioId, translations) {
  if (lang === 'en') return false
  const available = translations?.[scenarioId]
  if (available?.[lang]) return false
  // The fallback chain has to be consulted, not just the requested language.
  // Without this the warning fired for Santali while the content was in fact
  // rendering in Hindi, so it named the wrong language and cried wolf on a
  // notice whose whole job is to be trusted.
  for (const alt of FALLBACK[lang] || []) {
    if (available?.[alt]) return false
  }
  return true
}

/** Header notice text, in the user's own language. */
export function coverageNotice(lang) {
  return COVERAGE_NOTICE[lang] || COVERAGE_NOTICE.en
}

/** Stronger notice for untranslated drill content. */
export function contentNotice(lang) {
  return CONTENT_NOTICE[lang] || CONTENT_NOTICE.en
}

/**
 * Per-language coverage for the whole app, for the Settings page. Sorted worst
 * first so the gaps are the thing you see.
 */
export function allCoverage() {
  return LANGUAGES.map((l) => ({
    ...l,
    ...translationCoverage(l.code),
  })).sort((a, b) => a.percent - b.percent)
}
