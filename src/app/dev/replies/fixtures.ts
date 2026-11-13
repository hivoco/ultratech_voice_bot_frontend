/**
 * Raw `/turn` replies as the backend would send them (same shape as docs/backend-fixes.md item 13), fed
 * through the same parsers the chat uses. "worst" uses the longest values the parsers accept and
 * realistic long content: Devanagari, long URLs and emails, 6 options, 5 questions.
 */
export interface Fixture {
  ask: string;
  text: string;
  suggested_questions?: unknown;
  key_points?: unknown;
  ui?: unknown;
  serious?: unknown;
  condition?: string;
  contact?: unknown;
}

export const DEMO: Fixture[] = [
  {
    ask: "There's a crack in my wall",
    text: "Let's understand it first — many cracks are minor, but some need attention. Just tell me 3 quick things.",
    ui: {
      type: "quiz",
      id: "crack",
      photo_prompt: "Send a photo of the crack — it'll be much clearer",
      questions: [
        { id: "look", question: "What does the crack look like?", options: ["Thin like a hair (hairline)", "Straight and wide — a coin fits in", "Diagonal, from a window or door corner"] },
        { id: "where", question: "Where is it?", options: ["Only on plaster", "Beam or column", "Wall", "Slab / roof"], multiple: true },
        { id: "grow", question: "Is it growing?", options: ["No, same for months", "Yes, getting bigger", "Not sure"] },
      ],
    },
  },
  {
    ask: "How many days of curing?",
    text: "You're asking at just the right time — concrete gets its real strength from curing.",
    ui: {
      type: "facts",
      metrics: [
        { label: "OPC cement", value: "At least 7 days" },
        { label: "PPC / blended", value: "At least 10 days" },
      ],
      sections: [
        {
          title: "How to check on site",
          items: ["Don't let the surface dry — water it 2–3 times a day", "Keep water pooled on the slab, wet gunny bags on columns", "Shield it from strong sun and wind for the first 24 hours"],
        },
      ],
    },
    suggested_questions: ["How do I cure columns?", "Can I use a curing compound?"],
  },
  { ask: "Which cement should I buy?", text: "Which cement are you using right now?", ui: { type: "choice", id: "cement", question: "Pick one", options: ["OPC 53", "PPC", "PSC", "Not sure yet"] } },
  { ask: "Is this crack dangerous?", text: "This needs an expert look.", serious: true, condition: "cracks" },
  {
    ask: "Who do I call?",
    text: "Here's who can help.",
    serious: true,
    contact: { name: "UltraTech Expert", role: "Site engineer · your area", phone: "+91 1800 210 3311", whatsapp: "+91 98765 43210", email: "help@example.com", booking_url: "https://example.com/book", call_slot: "Calls back within 2 hours" },
  },
];

const LONG_URL = "https://www.ultratechcement.com/for-homebuilders/home-building-explained-single/curing-of-concrete-slabs-and-columns";

export const WORST: Fixture[] = [
  {
    ask: "दीवार में दरार है, खिड़की के कोने से तिरछी जा रही है और पिछले महीने से थोड़ी बढ़ी भी है",
    text: "पहले इसे समझते हैं — ज़्यादातर दरारें मामूली होती हैं, लेकिन कुछ पर ध्यान देना ज़रूरी है। बस 5 छोटी बातें बताइए, फिर मैं आपको सही अगला कदम बताऊँगा।",
    ui: {
      type: "quiz",
      id: "crack_hi",
      photo_prompt: "दरार की photo भेजिए — इससे बात बहुत साफ़ हो जाएगी, और site engineer को भी आसानी होगी",
      questions: [
        { id: "a", question: "दरार कैसी दिखती है? ध्यान से देखकर बताइए कि वह बाल जितनी पतली है, सीधी और चौड़ी है, या खिड़की-दरवाज़े के कोने से तिरछी जा रही है", options: ["बाल जितनी पतली (hairline) — नाखून नहीं फँसता", "सीधी और चौड़ी — उसमें सिक्का फँस जाता है, और अंदर से ईंट दिखती है", "तिरछी, खिड़की या दरवाज़े के कोने से ऊपर की तरफ़ जाती हुई", "Plaster के ऊपर जाल जैसी बहुत सारी छोटी दरारें", "Beam और दीवार के जोड़ पर सीधी लाइन में", "पता नहीं"] },
        { id: "b", question: "कहाँ है?", options: ["Plaster", "Beam / column", "दीवार", "Slab / छत", "Plinth / नींव के पास", "Parapet"], multiple: true },
        { id: "c", question: "बढ़ रही है?", options: ["नहीं", "हाँ"] },
        { id: "d", question: "Supercalifragilisticexpialidociousconstructionword?", options: ["Prefabricatedreinforcedconcretestructuralmember", LONG_URL] },
        { id: "e", question: "पानी आता है?", options: ["हाँ, बारिश में", "नहीं"] },
      ],
    },
  },
  {
    ask: "Curing kitne din?",
    text: "Bilkul sahi samay par pooch rahe hain — concrete ki asli mazbooti curing se hi aati hai.",
    ui: {
      type: "facts",
      metrics: [
        { label: "PPC / PSC / Composite blended cement", value: "कम से कम 10 दिन (गर्मी में 14 दिन)" },
        { label: "OPC", value: "7+" },
        { label: "Gaddhe ka paani (excavation me)", value: "0" },
      ],
      sections: [
        { title: "Site par kaise check karein — har din subah aur shaam, khaas taur par garmi aur tez hawa mein", items: ["Surface ko sookhne mat dijiye — din mein 2–3 baar paani daaliye, aur raat ko bhi gunny bags geele rakhiye", `Poori jaankari: ${LONG_URL}`, "customer.care.homebuilders@ultratech-building-solutions.example.com par likhiye", "Ok"] },
        { title: "", items: ["बिना title वाला section"] },
      ],
    },
    suggested_questions: ["Columns ki curing kaise karein jab unpar gunny bags tikte nahi aur paani turant beh jaata hai?", "Curing compound use kar sakte hain kya?", "Kya?"],
  },
  {
    ask: "Which cement?",
    text: "Which cement are you using right now?",
    ui: { type: "choice", id: "cement", question: "Pick the one written on the bag, or the closest match if the bag is torn", options: ["OPC 53 grade (Ordinary Portland Cement, high early strength)", "PPC", "PSC", "UltraTech Super", "Some local brand the contractor bought", "Not sure"] },
  },
  {
    ask: "Is it dangerous?",
    text: "यह site engineer को दिखाना ज़रूरी है।",
    serious: true,
    condition: "structural_diagonal_crack_near_opening",
  },
  {
    ask: "Who do I call?",
    text: "Here's who can help.",
    serious: true,
    contact: {
      name: "UltraTech Building Solutions – Home Builder Helpdesk (Gurugram & Faridabad Region)",
      role: "Senior site engineer · Structural inspections · Haryana, Delhi NCR and western Uttar Pradesh",
      phone: "+91 1800-210-3311",
      whatsapp: "+91 98765 43210",
      email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
      booking_url: LONG_URL,
      call_slot: "Will call you between 10 AM and 1 PM tomorrow (Saturday), or Monday if it's a holiday",
    },
  },
  {
    ask: "Malformed",
    text: "Malformed data from the backend must not crash anything.",
    key_points: "not a list",
    serious: "yes",
    contact: { phone: "javascript:alert(1)", email: "bad", booking_url: "http://insecure.example" },
    ui: { type: "quiz", questions: [{ question: "only one option", options: ["a"] }, 5, null] },
  },
];

export const EMPTY: Fixture[] = [
  { ask: "Empty facts", text: "Facts with nothing in them fall back to the plain answer.", ui: { type: "facts", metrics: [], sections: [] } },
  { ask: "Empty quiz", text: "A quiz with no valid questions falls back too.", ui: { type: "quiz", questions: [] } },
  { ask: "No contact", text: "Serious, no contact: the card shows only the note.", serious: true },
];

export const ONE: Fixture[] = [
  { ask: "One question quiz", text: "A quiz with one question: no 1 / 1 counter.", ui: { type: "quiz", id: "one", questions: [{ id: "x", question: "Is it growing?", options: ["Yes", "No"] }] } },
  { ask: "One metric", text: "One metric, no checklist.", ui: { type: "facts", metrics: [{ label: "OPC cement", value: "7 days" }] } },
  { ask: "One suggestion", text: "One suggestion.", suggested_questions: ["How do I cure columns?"] },
  { ask: "Phone only", text: "Only a phone number.", serious: true, contact: { phone: "+91 1800 210 3311" } },
];
