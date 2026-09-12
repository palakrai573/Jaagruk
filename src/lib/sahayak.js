/*
 * Jaagruk Sahayak — the built-in assistant, answering from the device.
 *
 * WHY THIS IS NOT AN API CALL
 *
 * The assistant used to require the worker to paste an API key into Settings before it
 * would say anything. That is three things wrong at once: it asks a mine worker to
 * obtain a Google Cloud credential, it fails in exactly the conditions this app is built
 * for (no signal underground), and it puts a key in the browser — where it is not a
 * secret, because bundled client-side JavaScript ships to every device and can be read
 * straight out of the built assets.
 *
 * So the answers live here. Every question a worker is likely to ask about the app has a
 * written answer in six languages, retrieved by keyword. Offline, instant, free, and it
 * says the same thing every time — which for a compliance product is a feature rather
 * than a limitation, because "what does the app do with my data" should not be improvised
 * by a language model.
 *
 * WHAT THIS DELIBERATELY IS NOT
 *
 * Not a chatbot pretending to be general-purpose. It answers questions about this app.
 * Asked something outside that, it says so and offers what it does know, rather than
 * generating a confident paragraph about mining law it has no basis for. In a safety
 * product, a plausible wrong answer is worse than an admitted gap.
 *
 * RETRIEVAL
 *
 * Keyword and fuzzy matching over the tag lists below, reusing normaliseTranscript and
 * similarity from speech.js — the same functions that match spoken commands, already
 * tested, already handling Devanagari and Ol Chiki. No embedding model, no index, no
 * download.
 */

import { normaliseTranscript, similarity } from './speech.js'

/*
 * The knowledge base.
 *
 * `tags` are the words a worker might actually use, across languages and including
 * romanised forms — matching is done against these rather than against the question
 * text, because a worker types "certificate kaise" and not the full authored question.
 *
 * Answers are two sentences at most. Someone opening this on a phone mid-shift is not
 * going to read a paragraph, and an answer that is not read is not an answer.
 */
export const SAHAYAK_ENTRIES = Object.freeze([
  {
    id: 'what-is-this',
    tags: [
      'what is this app', 'about', 'jaagruk', 'help', 'what does this do', 'purpose',
      'kya hai', 'yah kya hai', 'app kya', 'madad', 'kaise kaam',
      'ki eta', 'kemon', 'kann', 'kya',
      'क्या', 'ऐप', 'मदद', 'जागरुक',
    ],
    q: {
      en: 'What is this app for?',
      hi: 'यह ऐप किस लिए है?',
      bn: 'এই অ্যাপ কীসের জন্য?',
      or: 'ଏହି ଆପ କାହିଁକି?',
      ur: 'یہ ایپ کس لیے ہے؟',
      sat: 'ᱱᱚᱶᱟ ᱮᱯ ᱚᱠᱟ ᱞᱟᱹᱜᱤᱫ ᱠᱟᱱᱟ?',
    },
    a: {
      en: 'It trains you to react correctly to real hazards at your own worksite — fire, gas, machinery, electrical, dust, roof falls, working at height and haulage. You practise the decision, it times you, and you earn a certificate you can prove offline.',
      hi: 'यह आपको अपने ही कार्यस्थल के असली खतरों — आग, गैस, मशीन, बिजली, धूल, छत गिरना, ऊंचाई पर काम और ढुलाई — में सही प्रतिक्रिया का अभ्यास कराता है। आप निर्णय लेते हैं, समय गिना जाता है, और प्रमाण-पत्र मिलता है जो ऑफ़लाइन भी जांचा जा सकता है।',
      bn: 'এটি আপনাকে নিজের কর্মস্থলের সত্যিকারের বিপদ — আগুন, গ্যাস, যন্ত্র, বিদ্যুৎ, ধুলো, ছাদ ধস, উঁচুতে কাজ ও পরিবহন — এ সঠিক প্রতিক্রিয়ার অভ্যাস করায়। সময় গোনা হয়, এবং অফলাইনে যাচাইযোগ্য সার্টিফিকেট মেলে।',
      or: 'ଏହା ଆପଣଙ୍କୁ ନିଜ କାର୍ଯ୍ୟସ୍ଥଳର ପ୍ରକୃତ ବିପଦ — ନିଆଁ, ଗ୍ୟାସ, ମେସିନ, ବିଦ୍ୟୁତ, ଧୂଳି, ଛାତ ଖସିବା, ଉଚ୍ଚତାରେ କାମ ଓ ପରିବହନ — ରେ ଠିକ ପ୍ରତିକ୍ରିୟା ଅଭ୍ୟାସ କରାଏ। ସମୟ ଗଣାଯାଏ, ଏବଂ ଅଫଲାଇନ ଯାଞ୍ଚଯୋଗ୍ୟ ପ୍ରମାଣପତ୍ର ମିଳେ।',
      ur: 'یہ آپ کو اپنی ہی جگہ کے اصل خطرات — آگ، گیس، مشین، بجلی، دھول، چھت گرنا، بلندی پر کام اور ڈھلائی — میں درست ردعمل کی مشق کراتا ہے۔ وقت گنا جاتا ہے، اور آف لائن جانچنے کے قابل سرٹیفکیٹ ملتا ہے۔',
      sat: 'ᱱᱚᱶᱟ ᱟᱢᱟᱜ ᱠᱟᱹᱢᱤ ᱴᱷᱟᱶ ᱨᱮᱭᱟᱜ ᱥᱟᱹᱨᱤ ᱡᱚᱠᱷᱚᱢ — ᱥᱮᱸᱜᱮᱞ, ᱜᱮᱥ, ᱢᱮᱥᱤᱱ, ᱵᱤᱡᱩᱞᱤ, ᱫᱷᱩᱲᱤ, ᱪᱷᱟᱛ ᱜᱤᱛᱤᱡ, ᱩᱪᱩᱞ ᱨᱮ ᱠᱟᱹᱢᱤ ᱟᱨ ᱚᱲᱚᱠ — ᱨᱮ ᱴᱷᱤᱠ ᱛᱮᱞᱟ ᱨᱮᱭᱟᱜ ᱛᱟᱞᱤᱢ ᱮᱢᱟ ᱾ ᱚᱠᱛᱚ ᱞᱮᱠᱷᱟᱜᱼᱟ, ᱟᱨ ᱚᱯᱷᱞᱟᱭᱤᱱ ᱡᱟᱹᱨᱩᱭ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜ ᱯᱚᱨᱢᱟᱱ ᱧᱟᱢᱚᱜᱼᱟ ᱾',
    },
  },
  {
    id: 'start-drill',
    tags: [
      'how do i start', 'start training', 'begin', 'drill', 'training', 'practise', 'module', 'scenario',
      'kaise shuru', 'shuru karu', 'training kaise', 'abhyas', 'pariddrishya',
      'shuru', 'kivabe shuru', 'arambha',
      'शुरू', 'अभ्यास', 'ड्रिल', 'प्रशिक्षण',
    ],
    q: {
      en: 'How do I start a drill?',
      hi: 'ड्रिल कैसे शुरू करूं?',
      bn: 'ড্রিল কীভাবে শুরু করব?',
      or: 'ଡ୍ରିଲ କିପରି ଆରମ୍ଭ କରିବି?',
      ur: 'ڈرل کیسے شروع کروں؟',
      sat: 'ᱛᱟᱞᱤᱢ ᱪᱮᱫ ᱞᱮᱠᱟ ᱮᱦᱚᱵ?',
    },
    a: {
      en: 'Open Simulator from the menu and pick any of the nine modules. Each one asks you a few timed decisions; answer by tapping a choice or by saying its number out loud.',
      hi: 'मेनू से सिम्युलेटर खोलें और नौ मॉड्यूल में से कोई चुनें। हर मॉड्यूल कुछ समयबद्ध निर्णय पूछता है; विकल्प पर टैप करें या उसका नंबर बोलें।',
      bn: 'মেনু থেকে সিমুলেটর খুলে নয়টি মডিউলের যেকোনোটি বাছুন। প্রতিটি কয়েকটি সময়বদ্ধ সিদ্ধান্ত জিজ্ঞাসা করে; ট্যাপ করুন বা নম্বর বলুন।',
      or: 'ମେନୁରୁ ସିମୁଲେଟର ଖୋଲି ନଅଟି ମଡ୍ୟୁଲ ମଧ୍ୟରୁ ଯେକୌଣସିଟି ବାଛନ୍ତୁ। ପ୍ରତ୍ୟେକଟି କିଛି ସମୟବଦ୍ଧ ନିର୍ଣ୍ଣୟ ପଚାରେ; ଟ୍ୟାପ କରନ୍ତୁ କିମ୍ବା ନମ୍ବର କୁହନ୍ତୁ।',
      ur: 'مینو سے سیمولیٹر کھولیں اور نو ماڈیولز میں سے کوئی چنیں۔ ہر ایک چند وقتی فیصلے پوچھتا ہے؛ ٹیپ کریں یا اس کا نمبر بولیں۔',
      sat: 'ᱢᱮᱱᱩ ᱠᱷᱚᱱ ᱥᱤᱢᱩᱞᱮᱴᱚᱨ ᱡᱷᱤᱡ ᱠᱟᱛᱮ ᱮᱭᱟᱭ ᱢᱚᱰᱭᱩᱞ ᱠᱷᱚᱱ ᱡᱟᱦᱟᱸ ᱢᱤᱫ ᱵᱟᱪᱷᱟᱣ ᱢᱮ ᱾ ᱛᱚᱯᱟᱣ ᱢᱮ ᱥᱮ ᱚᱱᱟ ᱨᱮᱭᱟᱜ ᱱᱚᱢᱵᱚᱨ ᱨᱚᱲ ᱢᱮ ᱾',
    },
  },
  {
    id: 'camera-ar',
    tags: [
      'camera', 'ar', 'augmented', 'no camera', 'camera not working', 'markers', '3d', 'view',
      'kaimra', 'camera nahi', 'kaise dikhta', 'ar kya',
      'kyamera', 'kyamera nahi',
      'कैमरा', 'मार्कर',
    ],
    q: {
      en: 'Why is the camera view not showing?',
      hi: 'कैमरा व्यू क्यों नहीं दिख रहा?',
      bn: 'ক্যামেরা ভিউ কেন দেখাচ্ছে না?',
      or: 'କ୍ୟାମେରା ଭ୍ୟୁ କାହିଁକି ଦେଖାଉନାହିଁ?',
      ur: 'کیمرہ ویو کیوں نہیں دکھ رہا؟',
      sat: 'ᱠᱮᱢᱨᱟ ᱧᱮᱞ ᱪᱮᱫᱟᱜ ᱵᱟᱝ ᱧᱮᱞᱚᱜ ᱠᱟᱱᱟ?',
    },
    a: {
      en: 'The camera view needs a secure https connection and a working compass; without either it falls back to the 3D view and the Home screen names the reason. Both teach the same drill, so nothing is lost.',
      hi: 'कैमरा व्यू के लिए सुरक्षित https कनेक्शन और कंपास चाहिए; न होने पर यह 3D व्यू पर चला जाता है और होम स्क्रीन कारण बताती है। दोनों में एक ही ड्रिल सिखाई जाती है।',
      bn: 'ক্যামেরা ভিউয়ের জন্য নিরাপদ https সংযোগ ও কম্পাস দরকার; না থাকলে 3D ভিউ চলে এবং হোম স্ক্রিন কারণ জানায়। দুটিতেই একই ড্রিল শেখানো হয়।',
      or: 'କ୍ୟାମେରା ଭ୍ୟୁ ପାଇଁ ସୁରକ୍ଷିତ https ସଂଯୋଗ ଓ କମ୍ପାସ ଆବଶ୍ୟକ; ନଥିଲେ 3D ଭ୍ୟୁ ଚାଲେ ଏବଂ ହୋମ ସ୍କ୍ରିନ କାରଣ କହେ। ଦୁଇଟିରେ ସମାନ ଡ୍ରିଲ ଶିଖାଯାଏ।',
      ur: 'کیمرہ ویو کے لیے محفوظ https کنکشن اور کمپاس درکار ہے؛ نہ ہونے پر 3D ویو چلتا ہے اور ہوم اسکرین وجہ بتاتی ہے۔ دونوں میں وہی ڈرل سکھائی جاتی ہے۔',
      sat: 'ᱠᱮᱢᱨᱟ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱨᱠᱷᱟ https ᱡᱚᱲᱟᱣ ᱟᱨ ᱠᱚᱢᱯᱟᱥ ᱞᱟᱹᱠᱛᱤ; ᱵᱟᱝ ᱛᱟᱦᱮᱸᱱ ᱠᱷᱟᱱ 3D ᱧᱮᱞ ᱠᱟᱹᱢᱤᱭᱟ ᱟᱨ ᱦᱚᱢ ᱥᱠᱨᱤᱱ ᱠᱟᱨᱚᱱ ᱞᱟᱭᱟ ᱾ ᱵᱟᱨᱭᱟ ᱨᱮ ᱢᱤᱫ ᱛᱟᱞᱤᱢ ᱜᱮ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
    },
  },
  {
    id: 'score',
    tags: [
      'score', 'marks', 'how is score', 'grading', 'timer', 'time', 'reaction', 'latency', 'slow', 'fast',
      'ank', 'number kaise', 'samay', 'kitna samay', 'der',
      'nombor', 'somoy', 'samaya',
      'अंक', 'स्कोर', 'समय', 'नंबर',
    ],
    q: {
      en: 'How is my score decided?',
      hi: 'मेरा स्कोर कैसे तय होता है?',
      bn: 'আমার স্কোর কীভাবে ঠিক হয়?',
      or: 'ମୋ ସ୍କୋର କିପରି ନିର୍ଣ୍ଣୟ ହୁଏ?',
      ur: 'میرا اسکور کیسے طے ہوتا ہے؟',
      sat: 'ᱤᱧᱟᱜ ᱱᱚᱢᱵᱚᱨ ᱪᱮᱫ ᱞᱮᱠᱟ ᱛᱷᱤᱨ ᱦᱩᱭᱩᱜᱼᱟ?',
    },
    a: {
      en: 'Two things: whether the decision was correct, and how quickly you made it. The clock starts only after the question and all its options have finished being read aloud, so you are never charged for listening.',
      hi: 'दो बातें: निर्णय सही था या नहीं, और आपने कितनी जल्दी लिया। घड़ी तभी शुरू होती है जब सवाल और सभी विकल्प पढ़े जा चुके हों — सुनने का समय नहीं गिना जाता।',
      bn: 'দুটি বিষয়: সিদ্ধান্ত ঠিক ছিল কিনা, আর কত দ্রুত নিয়েছেন। প্রশ্ন ও সব বিকল্প পড়া শেষ হলেই ঘড়ি শুরু হয় — শোনার সময় গোনা হয় না।',
      or: 'ଦୁଇଟି କଥା: ନିର୍ଣ୍ଣୟ ଠିକ ଥିଲା କି ନାହିଁ, ଏବଂ କେତେ ଶୀଘ୍ର ନେଲେ। ପ୍ରଶ୍ନ ଓ ସବୁ ବିକଳ୍ପ ପଢ଼ା ସରିଲେ ହିଁ ଘଡ଼ି ଆରମ୍ଭ ହୁଏ — ଶୁଣିବା ସମୟ ଗଣାଯାଏ ନାହିଁ।',
      ur: 'دو باتیں: فیصلہ درست تھا یا نہیں، اور آپ نے کتنی جلدی کیا۔ سوال اور تمام آپشن پڑھے جانے کے بعد ہی گھڑی شروع ہوتی ہے — سننے کا وقت نہیں گنا جاتا۔',
      sat: 'ᱵᱟᱨᱭᱟ ᱠᱟᱛᱷᱟ: ᱵᱟᱪᱷᱟᱣ ᱴᱷᱤᱠ ᱛᱟᱦᱮᱸᱠᱟᱱ ᱥᱮ ᱵᱟᱝ, ᱟᱨ ᱛᱤᱱᱟᱹᱜ ᱞᱚᱜᱚᱱ ᱛᱮ ᱮᱢ ᱮᱱᱟ ᱾ ᱠᱩᱠᱞᱤ ᱟᱨ ᱡᱚᱛᱚ ᱵᱟᱪᱷᱟᱣ ᱯᱟᱲᱦᱟᱣ ᱛᱟᱭᱚᱢ ᱜᱮ ᱚᱠᱛᱚ ᱮᱦᱚᱵᱚᱜᱼᱟ ᱾',
    },
  },
  {
    id: 'certificate',
    tags: [
      'certificate', 'qr', 'proof', 'pass', 'passed', 'fail', 'verify', 'record',
      'praman', 'pramanpatra', 'kaise milega', 'pass kaise', 'jaanch',
      'sartifiket', 'pramanapatra',
      'प्रमाणपत्र', 'प्रमाण', 'जांच',
    ],
    q: {
      en: 'How do I get and prove a certificate?',
      hi: 'प्रमाण-पत्र कैसे मिलेगा और कैसे दिखाऊं?',
      bn: 'সার্টিফিকেট কীভাবে পাব ও দেখাব?',
      or: 'ପ୍ରମାଣପତ୍ର କିପରି ପାଇବି ଓ ଦେଖାଇବି?',
      ur: 'سرٹیفکیٹ کیسے ملے گا اور کیسے دکھاؤں؟',
      sat: 'ᱯᱚᱨᱢᱟᱱ ᱪᱮᱫ ᱞᱮᱠᱟ ᱧᱟᱢᱚᱜᱼᱟ ᱟᱨ ᱩᱫᱩᱜᱚᱜᱼᱟ?',
    },
    a: {
      en: 'Pass the required modules and the app issues a signed certificate with a QR code. Anyone can scan that QR and check it on the Verify screen with no internet, because the whole record travels inside the code.',
      hi: 'आवश्यक मॉड्यूल पास करें और ऐप एक हस्ताक्षरित प्रमाण-पत्र QR कोड के साथ देता है। कोई भी उस QR को स्कैन कर वेरिफ़ाई स्क्रीन पर बिना इंटरनेट जांच सकता है, क्योंकि पूरा रिकॉर्ड कोड के भीतर होता है।',
      bn: 'প্রয়োজনীয় মডিউল পাস করলে অ্যাপ QR কোড সহ স্বাক্ষরিত সার্টিফিকেট দেয়। যে কেউ সেই QR স্ক্যান করে ইন্টারনেট ছাড়াই যাচাই স্ক্রিনে দেখতে পারে, কারণ পুরো রেকর্ড কোডের ভিতরেই থাকে।',
      or: 'ଆବଶ୍ୟକ ମଡ୍ୟୁଲ ପାସ କଲେ ଆପ QR କୋଡ ସହିତ ସ୍ୱାକ୍ଷରିତ ପ୍ରମାଣପତ୍ର ଦିଏ। ଯେକେହି ସେହି QR ସ୍କାନ କରି ଇଣ୍ଟରନେଟ ବିନା ଯାଞ୍ଚ ସ୍କ୍ରିନରେ ଦେଖିପାରିବେ, କାରଣ ପୂରା ରେକର୍ଡ କୋଡ ଭିତରେ ଥାଏ।',
      ur: 'ضروری ماڈیول پاس کریں اور ایپ QR کوڈ کے ساتھ دستخط شدہ سرٹیفکیٹ دیتی ہے۔ کوئی بھی وہ QR اسکین کر کے انٹرنیٹ کے بغیر ویریفائی اسکرین پر جانچ سکتا ہے، کیونکہ پورا ریکارڈ کوڈ کے اندر ہوتا ہے۔',
      sat: 'ᱞᱟᱹᱠᱛᱤ ᱢᱚᱰᱭᱩᱞ ᱯᱟᱥ ᱠᱷᱟᱱ ᱮᱯ ᱥᱩᱦᱤ ᱠᱟᱱ ᱯᱚᱨᱢᱟᱱ QR ᱠᱚᱰ ᱥᱟᱶ ᱮᱢᱟ ᱾ ᱡᱟᱦᱟᱭ ᱦᱚᱸ ᱚᱱᱟ QR ᱥᱠᱮᱱ ᱠᱟᱛᱮ ᱤᱱᱴᱚᱨᱱᱮᱴ ᱵᱟᱝ ᱠᱟᱛᱮ ᱡᱟᱹᱨᱩᱭ ᱠᱚ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
    },
  },
  {
    id: 'voice',
    tags: [
      'voice', 'speak', 'speaking', 'microphone', 'mic', 'say', 'talk', 'hands free', 'gloves',
      'awaz', 'bolkar', 'bol kar', 'maik', 'bolna', 'dastane',
      'kotha', 'swara', 'awaaz',
      'आवाज', 'बोलकर', 'माइक', 'दस्ताने',
    ],
    q: {
      en: 'Can I answer by speaking?',
      hi: 'क्या मैं बोलकर उत्तर दे सकता हूं?',
      bn: 'আমি বলে উত্তর দিতে পারি?',
      or: 'ମୁଁ କହି ଉତ୍ତର ଦେଇପାରିବି?',
      ur: 'کیا میں بول کر جواب دے سکتا ہوں؟',
      sat: 'ᱤᱧ ᱨᱚᱲ ᱠᱟᱛᱮ ᱛᱮᱞᱟ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱹᱧ?',
    },
    a: {
      en: 'Yes. The microphone stays on during a drill, so just say the option number — no button to press first. Tapping still works at the same time, and you can mute the mic from the drill screen.',
      hi: 'हां। ड्रिल के दौरान माइक चालू रहता है, बस विकल्प का नंबर बोलें — पहले कोई बटन दबाने की जरूरत नहीं। टैप करना भी साथ-साथ चलता है, और माइक ड्रिल स्क्रीन से बंद किया जा सकता है।',
      bn: 'হ্যাঁ। ড্রিল চলাকালীন মাইক চালু থাকে, শুধু বিকল্পের নম্বর বলুন — আগে কোনো বাটন চাপার দরকার নেই। ট্যাপও একইসাথে চলে, এবং মাইক বন্ধ করা যায়।',
      or: 'ହଁ। ଡ୍ରିଲ ସମୟରେ ମାଇକ ଚାଲୁ ରହେ, କେବଳ ବିକଳ୍ପର ନମ୍ବର କୁହନ୍ତୁ — ଆଗରୁ କୌଣସି ବଟନ ଦବାଇବା ଦରକାର ନାହିଁ। ଟ୍ୟାପ ମଧ୍ୟ ଏକସାଙ୍ଗରେ ଚାଲେ।',
      ur: 'ہاں۔ ڈرل کے دوران مائیک چالو رہتا ہے، بس آپشن کا نمبر بولیں — پہلے کوئی بٹن دبانے کی ضرورت نہیں۔ ٹیپ کرنا بھی ساتھ چلتا ہے، اور مائیک بند کیا جا سکتا ہے۔',
      sat: 'ᱦᱚᱭ ᱾ ᱛᱟᱞᱤᱢ ᱚᱠᱛᱚ ᱢᱟᱭᱠ ᱡᱷᱤᱡ ᱛᱟᱦᱮᱸᱱᱟ, ᱠᱷᱟᱹᱞᱤ ᱵᱟᱪᱷᱟᱣ ᱨᱮᱭᱟᱜ ᱱᱚᱢᱵᱚᱨ ᱨᱚᱲ ᱢᱮ — ᱞᱟᱦᱟ ᱡᱟᱦᱟᱸ ᱵᱟᱴᱚᱱ ᱚᱛ ᱵᱟᱝ ᱞᱟᱹᱠᱛᱤ ᱾ ᱛᱚᱯᱟᱣ ᱦᱚᱸ ᱢᱤᱫ ᱛᱮ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
    },
  },
  {
    id: 'offline',
    tags: [
      'offline', 'internet', 'no network', 'network', 'signal', 'data', 'underground', 'without internet',
      'internet nahi', 'bina internet', 'signal nahi', 'net',
      'aphlain', 'অফলাইন',
      'इंटरनेट', 'ऑफलाइन', 'सिग्नल',
    ],
    q: {
      en: 'Does it work without internet?',
      hi: 'क्या यह इंटरनेट के बिना चलता है?',
      bn: 'ইন্টারনেট ছাড়া চলে?',
      or: 'ଇଣ୍ଟରନେଟ ବିନା ଚାଲେ?',
      ur: 'کیا یہ انٹرنیٹ کے بغیر چلتا ہے؟',
      sat: 'ᱤᱱᱴᱚᱨᱱᱮᱴ ᱵᱟᱝ ᱠᱟᱛᱮ ᱠᱟᱹᱢᱤᱭᱟ?',
    },
    a: {
      en: 'Yes — training, scoring, certificates, verification and hazard reports all work with no signal at all, which is the point. Only the photo hazard scan needs a connection, and it says so before you use it.',
      hi: 'हां — प्रशिक्षण, अंकन, प्रमाण-पत्र, जांच और खतरा रिपोर्ट सब बिना सिग्नल चलते हैं, यही इसका उद्देश्य है। केवल फ़ोटो खतरा स्कैन को कनेक्शन चाहिए, और वह पहले ही बता देता है।',
      bn: 'হ্যাঁ — প্রশিক্ষণ, স্কোরিং, সার্টিফিকেট, যাচাই ও বিপদ রিপোর্ট সব সিগন্যাল ছাড়াই চলে, এটাই উদ্দেশ্য। কেবল ফটো বিপদ স্ক্যানের সংযোগ দরকার।',
      or: 'ହଁ — ତାଲିମ, ସ୍କୋରିଂ, ପ୍ରମାଣପତ୍ର, ଯାଞ୍ଚ ଓ ବିପଦ ରିପୋର୍ଟ ସବୁ ସିଗନାଲ ବିନା ଚାଲେ, ଏହା ହିଁ ଉଦ୍ଦେଶ୍ୟ। କେବଳ ଫଟୋ ବିପଦ ସ୍କାନ ପାଇଁ ସଂଯୋଗ ଆବଶ୍ୟକ।',
      ur: 'ہاں — تربیت، اسکورنگ، سرٹیفکیٹ، جانچ اور خطرہ رپورٹ سب سگنل کے بغیر چلتے ہیں، یہی مقصد ہے۔ صرف تصویری خطرہ اسکین کے لیے کنکشن درکار ہے۔',
      sat: 'ᱦᱚᱭ — ᱛᱟᱞᱤᱢ, ᱱᱚᱢᱵᱚᱨ, ᱯᱚᱨᱢᱟᱱ, ᱡᱟᱹᱨᱩᱭ ᱟᱨ ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ ᱡᱚᱛᱚ ᱥᱤᱜᱱᱟᱞ ᱵᱟᱝ ᱠᱟᱛᱮ ᱠᱟᱹᱢᱤᱭᱟ ᱾ ᱠᱷᱟᱹᱞᱤ ᱯᱷᱚᱴᱚ ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ ᱞᱟᱹᱜᱤᱫ ᱡᱚᱲᱟᱣ ᱞᱟᱹᱠᱛᱤ ᱾',
    },
  },
  {
    id: 'privacy',
    tags: [
      'privacy', 'data', 'my data', 'where does data go', 'server', 'cloud', 'safe', 'stored', 'delete',
      'nijta', 'data kahan', 'suraksha', 'kahan jata',
      'gopaniyata', 'tathya',
      'डेटा', 'निजता', 'गोपनीयता',
    ],
    q: {
      en: 'What happens to my data?',
      hi: 'मेरे डेटा का क्या होता है?',
      bn: 'আমার তথ্যের কী হয়?',
      or: 'ମୋ ତଥ୍ୟର କଣ ହୁଏ?',
      ur: 'میرے ڈیٹا کا کیا ہوتا ہے؟',
      sat: 'ᱤᱧᱟᱜ ᱰᱟᱴᱟ ᱨᱮᱭᱟᱜ ᱪᱮᱫ ᱦᱩᱭᱩᱜᱼᱟ?',
    },
    a: {
      en: 'It stays on this phone. Your records, keys and photos are stored on the device and nothing is uploaded unless a supervisor exports a signed bundle on purpose. Clearing the browser data for this app deletes it permanently.',
      hi: 'यह इसी फ़ोन में रहता है। आपके रिकॉर्ड, कुंजियां और तस्वीरें डिवाइस पर संग्रहित होती हैं और कुछ भी अपलोड नहीं होता, जब तक सुपरवाइज़र जान-बूझकर हस्ताक्षरित बंडल निर्यात न करे। ऐप का ब्राउज़र डेटा मिटाने पर यह हमेशा के लिए हट जाता है।',
      bn: 'এটি এই ফোনেই থাকে। আপনার রেকর্ড, কী ও ছবি ডিভাইসে জমা থাকে এবং কিছুই আপলোড হয় না, যদি না সুপারভাইজার ইচ্ছাকৃতভাবে স্বাক্ষরিত বান্ডিল রপ্তানি করেন। ব্রাউজার ডেটা মুছলে এটি স্থায়ীভাবে যায়।',
      or: 'ଏହା ଏହି ଫୋନରେ ରହେ। ଆପଣଙ୍କ ରେକର୍ଡ, ଚାବି ଓ ଫଟୋ ଡିଭାଇସରେ ରଖାଯାଏ ଏବଂ କିଛି ଅପଲୋଡ ହୁଏ ନାହିଁ, ଯଦି ସୁପରଭାଇଜର ଜାଣିଶୁଣି ସ୍ୱାକ୍ଷରିତ ବଣ୍ଡଲ ରପ୍ତାନି ନକରନ୍ତି। ବ୍ରାଉଜର ଡାଟା ସଫା କଲେ ଏହା ସ୍ଥାୟୀ ଭାବେ ଯାଏ।',
      ur: 'یہ اسی فون میں رہتا ہے۔ آپ کے ریکارڈ، چابیاں اور تصاویر ڈیوائس پر محفوظ ہوتی ہیں اور کچھ اپ لوڈ نہیں ہوتا، جب تک سپروائزر جان بوجھ کر دستخط شدہ بنڈل ایکسپورٹ نہ کرے۔ براؤزر ڈیٹا صاف کرنے پر یہ ہمیشہ کے لیے چلا جاتا ہے۔',
      sat: 'ᱱᱚᱶᱟ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾ ᱟᱢᱟᱜ ᱨᱮᱠᱚᱰ, ᱠᱩᱸᱡᱤ ᱟᱨ ᱯᱷᱚᱴᱚ ᱰᱤᱵᱟᱭᱤᱥ ᱨᱮ ᱥᱟᱸᱪᱟᱣᱚᱜᱼᱟ ᱟᱨ ᱡᱟᱦᱟᱸ ᱦᱚᱸ ᱟᱯᱞᱚᱰ ᱵᱟᱝ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
    },
  },
  {
    id: 'buddy',
    tags: [
      'buddy', 'two phones', 'pair', 'partner', 'together', 'rescue', 'casualty', 'qr pair',
      'jodi', 'do phone', 'saathi', 'jodidar', 'sath',
      'sangi', 'bondhu',
      'जोड़ी', 'साथी', 'बडी',
    ],
    q: {
      en: 'What is the buddy drill?',
      hi: 'बडी ड्रिल क्या है?',
      bn: 'বাডি ড্রিল কী?',
      or: 'ବଡି ଡ୍ରିଲ କଣ?',
      ur: 'بڈی ڈرل کیا ہے؟',
      sat: 'ᱡᱚᱲᱟᱣ ᱛᱟᱞᱤᱢ ᱪᱮᱫ ᱠᱟᱱᱟ?',
    },
    a: {
      en: 'A two-person rescue drill: one plays the casualty, the other responds. Pair the phones by scanning a QR code — both must be on the same hotspot or wifi, and no internet is needed.',
      hi: 'दो लोगों का बचाव अभ्यास: एक घायल बनता है, दूसरा प्रतिक्रिया देता है। QR कोड स्कैन कर फ़ोन जोड़ें — दोनों एक ही हॉटस्पॉट या वाईफ़ाई पर हों, इंटरनेट की जरूरत नहीं।',
      bn: 'দুজনের উদ্ধার অভ্যাস: একজন আহত সাজে, অন্যজন সাড়া দেয়। QR কোড স্ক্যান করে ফোন জোড়া লাগান — দুটিই একই হটস্পট বা ওয়াইফাইতে থাকতে হবে, ইন্টারনেট লাগে না।',
      or: 'ଦୁଇଜଣର ଉଦ୍ଧାର ଅଭ୍ୟାସ: ଜଣେ ଆହତ ସାଜେ, ଅନ୍ୟ ପ୍ରତିକ୍ରିୟା ଦିଏ। QR କୋଡ ସ୍କାନ କରି ଫୋନ ଯୋଡ଼ନ୍ତୁ — ଦୁଇଟି ସମାନ ହଟସ୍ପଟ କିମ୍ବା ୱାଇଫାଇରେ ରହିବା ଆବଶ୍ୟକ।',
      ur: 'دو افراد کی بچاؤ مشق: ایک زخمی بنتا ہے، دوسرا ردعمل دیتا ہے۔ QR کوڈ اسکین کر کے فون جوڑیں — دونوں ایک ہی ہاٹ اسپاٹ یا وائی فائی پر ہوں، انٹرنیٹ کی ضرورت نہیں۔',
      sat: 'ᱵᱟᱨ ᱦᱚᱲ ᱨᱮᱭᱟᱜ ᱵᱟᱺᱪᱟᱣ ᱛᱟᱞᱤᱢ: ᱢᱤᱫ ᱦᱚᱲ ᱜᱷᱟᱭᱟᱞ ᱦᱩᱭᱩᱜᱼᱟ, ᱮᱴᱟᱜ ᱛᱮᱞᱟ ᱮᱢᱟ ᱾ QR ᱠᱚᱰ ᱥᱠᱮᱱ ᱠᱟᱛᱮ ᱯᱷᱚᱱ ᱡᱚᱲᱟᱣ ᱢᱮ — ᱵᱟᱨᱭᱟ ᱢᱤᱫ ᱦᱟᱴᱥᱯᱚᱴ ᱨᱮ ᱛᱟᱦᱮᱸᱱ ᱞᱟᱹᱠᱛᱤ ᱾',
    },
  },
  {
    id: 'cannot-read',
    tags: [
      'cannot read', 'read', 'reading', 'pictogram', 'picture', 'icon', 'symbol', 'illiterate', 'language',
      'padh nahi', 'padhna', 'chitra', 'tasveer', 'bhasha', 'sanketh',
      'porte pari na', 'chobi',
      'पढ़', 'चित्र', 'भाषा', 'तस्वीर',
    ],
    q: {
      en: 'What if I cannot read the text?',
      hi: 'अगर मैं पढ़ न सकूं तो?',
      bn: 'যদি আমি পড়তে না পারি?',
      or: 'ଯଦି ମୁଁ ପଢ଼ିପାରେ ନାହିଁ?',
      ur: 'اگر میں پڑھ نہ سکوں تو؟',
      sat: 'ᱡᱩᱫᱤ ᱤᱧ ᱯᱟᱲᱦᱟᱣ ᱵᱟᱝ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱹᱧ?',
    },
    a: {
      en: 'Turn on pictogram mode in Settings: text is replaced by ISO safety symbols and everything is read aloud instead. The app is usable end to end without reading a word, in six languages.',
      hi: 'सेटिंग्स में चित्र मोड चालू करें: पाठ की जगह ISO सुरक्षा चिह्न आते हैं और सब कुछ बोलकर सुनाया जाता है। पूरा ऐप बिना एक शब्द पढ़े, छह भाषाओं में इस्तेमाल हो सकता है।',
      bn: 'সেটিংসে পিক্টোগ্রাম মোড চালু করুন: লেখার বদলে ISO নিরাপত্তা প্রতীক আসে এবং সব পড়ে শোনানো হয়। ছয় ভাষায় একটি শব্দ না পড়েই পুরো অ্যাপ ব্যবহার করা যায়।',
      or: 'ସେଟିଂସରେ ପିକ୍ଟୋଗ୍ରାମ ମୋଡ ଚାଲୁ କରନ୍ତୁ: ଲେଖା ବଦଳରେ ISO ସୁରକ୍ଷା ଚିହ୍ନ ଆସେ ଏବଂ ସବୁ ପଢ଼ି ଶୁଣାଯାଏ। ଛଅ ଭାଷାରେ ଏକ ଶବ୍ଦ ନପଢ଼ି ପୂରା ଆପ ବ୍ୟବହାର କରାଯାଏ।',
      ur: 'ترتیبات میں تصویری موڈ چالو کریں: متن کی جگہ ISO تحفظ کے نشان آتے ہیں اور سب بول کر سنایا جاتا ہے۔ چھ زبانوں میں ایک لفظ پڑھے بغیر پوری ایپ استعمال ہو سکتی ہے۔',
      sat: 'ᱥᱮᱴᱤᱝᱥ ᱨᱮ ᱪᱤᱛᱟᱹᱨ ᱢᱳᱰ ᱡᱷᱤᱡ ᱢᱮ: ᱚᱞ ᱵᱚᱫᱚᱞ ᱛᱮ ISO ᱨᱠᱷᱟ ᱪᱤᱱᱦᱟᱹ ᱦᱮᱡᱚᱜᱼᱟ ᱟᱨ ᱡᱚᱛᱚ ᱨᱚᱲ ᱠᱟᱛᱮ ᱟᱸᱡᱚᱢᱚᱜᱼᱟ ᱾',
    },
  },
])

/*
 * Confidence below which the assistant declines rather than guesses.
 *
 * A wrong answer delivered confidently is worse than "I don't know" in any product, and
 * considerably worse in one about staying alive. Below this, the reply is an honest
 * miss plus the list of things it CAN answer — which is more useful than a near-miss,
 * because it teaches the worker what to ask next.
 */
export const MATCH_THRESHOLD = 0.62

/*
 * How close a single WORD must be to a tag before a typo is forgiven.
 *
 * Much stricter than the overall threshold, and it has to be. A typo is normally one
 * edit; two edits in six characters is not a typo, it is a different word. Without this
 * separation, "what is the DGMS regulation NUMBER for ventilation" matched the Bengali
 * tag "nombor" at 0.67 and confidently answered a question about scoring — a real false
 * positive found by the tests, and exactly the kind of plausible-but-wrong reply this
 * module exists to avoid.
 */
const FUZZY_MIN = 0.8

/*
 * Everything an entry can be matched against: its tags AND its authored question in
 * every language.
 *
 * Including the question text is what makes the suggested-question chips reliable. A chip
 * sends the exact authored wording, so that wording must resolve back to the entry it
 * came from — otherwise tapping a question could display a different answer than the one
 * it promised.
 *
 * A LIMIT WORTH BEING PRECISE ABOUT: this gives every language coverage for the CHIPS,
 * not for freely typed partial phrasings. Tags are authored in English, romanised Hindi
 * and Devanagari, so free text works well in those. A Bengali, Odia, Urdu or Ol Chiki
 * speaker typing their own wording may miss, and falls back to the chips — which are
 * written in their language and are the primary path for them anyway. Extending the tag
 * lists is the fix, and it is additive whenever someone can author them.
 *
 * Built once, since the knowledge base is frozen.
 */
const PHRASES = SAHAYAK_ENTRIES.map((entry) => ({
  entry,
  phrases: [...entry.tags, ...Object.values(entry.q)]
    .map((p) => normaliseTranscript(p))
    .filter((p) => p && p.length > 1),
}))

/**
 * Find the entry that best answers a typed question.
 *
 * Two signals, weighted differently on purpose. A phrase appearing bodily in the question
 * is strong evidence and is scored by its length, so "ar" occurring inside an unrelated
 * word cannot outrank "certificate" matching properly. Word-level similarity is the
 * weaker signal and only counts when it is very close, because that path exists for
 * mistyping and nothing else.
 *
 * @returns { entry, score } or null when nothing is confident enough
 */
export function findAnswer(question) {
  const q = normaliseTranscript(question)
  if (!q) return null

  const words = q.split(' ').filter((w) => w.length > 2)
  /*
   * Padded, so containment respects word boundaries.
   *
   * A bare `includes` matched the two-letter tag "ar" inside "arm" — and would have
   * matched it inside "March", "car" and "part" — scoring a confident 0.8 for questions
   * about broken arms. Short tags like "ar", "qr" and "3d" are legitimate terms that must
   * match as words and never as fragments. Multi-word phrases still match as a contiguous
   * run, which is what this padding preserves.
   */
  const padded = ` ${q} `
  let best = null

  for (const { entry, phrases } of PHRASES) {
    let score = 0

    for (const phrase of phrases) {
      if (padded.includes(` ${phrase} `)) {
        score = Math.max(score, 0.75 + Math.min(0.25, phrase.length / 40))
        continue
      }

      // Typo tolerance only. Anything less than very close is not evidence.
      for (const word of words) {
        const s = similarity(word, phrase)
        if (s >= FUZZY_MIN && s > score) score = s
      }
    }

    if (!best || score > best.score) best = { entry, score }
  }

  if (!best || best.score < MATCH_THRESHOLD) return null
  return best
}

/** The answer text in the requested language, falling back through Hindi to English. */
export function answerText(entry, lang) {
  if (!entry) return ''
  return entry.a[lang] || entry.a.hi || entry.a.en
}

/** The suggested-question text in the requested language. */
export function questionText(entry, lang) {
  if (!entry) return ''
  return entry.q[lang] || entry.q.hi || entry.q.en
}

/**
 * Questions to offer as tappable chips.
 *
 * The single most useful part of this for the intended user. A worker with gloves on,
 * mid-shift, is not going to compose a sentence into a text box — but they will tap a
 * question that is already written. It also makes the assistant's scope visible instead
 * of leaving someone to guess what it knows.
 */
export function suggestedQuestions(lang, { exclude = [], limit = 4 } = {}) {
  return SAHAYAK_ENTRIES.filter((e) => !exclude.includes(e.id))
    .slice(0, limit)
    .map((e) => ({ id: e.id, text: questionText(e, lang) }))
}

/** Look an entry up by id, for the chips. */
export function entryById(id) {
  return SAHAYAK_ENTRIES.find((e) => e.id === id) || null
}
