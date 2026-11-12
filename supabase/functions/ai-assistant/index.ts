/*
# AI Agricultural Assistant Edge Function
# v2 — expanded glossary + open-ended term support

Provides bilingual (English/Kinyarwanda) agricultural marketplace guidance.
Supports: term explanations (any term, not limited to a fixed list), phrase
translation, product explanations, listing guidance, and price calculations.

If no AI API key (OPENAI_API_KEY) is configured, falls back to a built-in
glossary. For terms not in the glossary, the fallback provides a best-effort
explanation by breaking down the word and offering related context, rather
than refusing to answer.

Never invents live market prices, guarantees yields, or initiates transactions.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AssistantRequest {
  action: "explain_term" | "translate" | "explain_product" | "listing_tips" | "price_calc";
  lang: "en" | "rw";
  term?: string;
  phrase?: string;
  product?: {
    name: string;
    description: string;
    price: number;
    unit: string;
    quantity_available?: number;
  };
  calc?: {
    pricePerUnit: number;
    quantity: number;
  };
}

// ─── Glossary (expanded) ──────────────────────────────────

const GLOSSARY: Record<string, { en: string; rw: string }> = {
  wholesale: {
    en: "Wholesale means selling goods in large quantities, usually at a lower price per unit. On Isoko Link, a wholesale buyer purchases bulk harvest directly from a farmer.",
    rw: "Gucuruza bivuga kugurisha ibintu mu bwoko bunini, hakunze kuba ibiciro byo hasi ku kintu kimwe. Kuri Isoko Link, umuguzi w'ibinini agura imyaka mu mubare munini yakuye ku buhinzi.",
  },
  retail: {
    en: "Retail means selling goods in small quantities to individual consumers, usually at a higher price per unit than wholesale.",
    rw: "Gutanga mu gice bivuga kugurisha ibintu mu bwoko bugufi ku baguzi bamaze, hakunze kuba ibiciro byo hejuru ku kintu kimwe kuruta uko byaba byiri mu gucuruza.",
  },
  harvest: {
    en: "Harvest is the process of gathering ripe crops from the field. It is the time when a farmer collects the mature produce to sell or store.",
    rw: "Kwizima ni igikorwa cyo gufata imyaka yatoranyije mu murima. Ni igihe umuhinzi atemya ibihingwa bye byakuze agiye kubyigurisha cyangwa akabibika.",
  },
  yield: {
    en: "Yield is the amount of crop produced from a given area of land. For example, a yield of 2 tonnes per hectare means 2,000 kg of crop from one hectare.",
    rw: "Umusaruro ni ingano y'ibihingwa byavuye ku murima runaka. Urugero: umusaruro wa toni 2 kuri hegitari 1 bivuga kg 2,000 z'ibihingwa ku hegitari imwe.",
  },
  fertilizer: {
    en: "Fertilizer is a natural or chemical substance added to soil to help crops grow better. It provides nutrients plants need to be healthy and productive.",
    rw: "Ifumbire ni ikintu cyo mu kamere cyangwa cyo mu nganda gishyirwa mu murima kugira ngo ibihingwa byakure neza. Itanga imyunyungugu ibyo bimera bikeneye kugira ngo byubungwe kandi byorohe.",
  },
  quantity: {
    en: "Quantity is the amount of a product available or being sold. On Isoko Link, quantity is shown in units like kg, sacks, or bunches.",
    rw: "Ubwinshi ni ingano y'igicuruzwa kirimo kugurishwa cyangwa kiboneka. Kuri Isoko Link, ubwinshi bigaragazwa mu cyiciro nka kg, amapfunye, cyangwa amasa.",
  },
  commission: {
    en: "Commission is a small percentage of the sale price that Isoko Link charges for connecting a buyer and seller. It is how the platform earns revenue from completed sales.",
    rw: "Incamake ni igice gito cyo ku giciro cyo kugurisha Isoko Link cyafata mu guhuza umuguzi n'umugurizi. Ni uko urubuga rwunguka amafaranga mu madarirari yakoze.",
  },
  "market price": {
    en: "Market price is the typical price a product sells for in a given area and time. It can vary by season, location, and supply. Isoko Link does not set market prices — sellers decide their own prices.",
    rw: "Igiciro ku masoko ni igiciro gisanzwe cy'igicuruzwa mu karere n'igihe runaka. Gishobora guhinduka hakurikije icyerekezo, ahantu, n'ibiboneka. Isoko Link nti shyiraho amananga y'amasoko — umugurishi ni we wemeza ibiciro bye.",
  },
  listing: {
    en: "A listing is a product you put up for sale on Isoko Link. It includes the product name, price, unit, quantity, description, and photos. Good listings attract more buyers.",
    rw: "Ibyuma byo kugurisha ni igicuruzwa mwashyize ku murongo kuri Isoko Link. Bizengurutsa izina ry'igicuruzwa, igiciro, urugero, ubwinshi, ibisobanuro, n'amafoto. Ibyuma byiza byakira abaguzi benshi.",
  },
  // ─── Additional terms ───
  buyer: {
    en: "A buyer is a person who purchases products. On Isoko Link, buyers search for agricultural produce from farmers and contact them directly.",
    rw: "Umuguzi ni umuntu w'agura ibicuruzwa. Kuri Isoko Link, abaguzi shakisha ibihingwa bya bahinzi bakabahamagara mu byacu.",
  },
  seller: {
    en: "A seller is a person who offers products for sale. On Isoko Link, sellers are typically farmers who list their harvest for buyers to find.",
    rw: "Umugurishi ni umuntu watangiye ibicuruzwa. Kuri Isoko Link, abagurishi bakunze kuba abahinzi batanga imyaka yabo ngo abaguzi bayibone.",
  },
  organic: {
    en: "Organic refers to produce grown without synthetic fertilizers or pesticides, using natural farming methods. Organic products are often valued for health and environmental reasons.",
    rw: "Byo mu kamere bivuga ibihingwa byakuwe hakoreshejwe ifumbire y'ikozwe n'imiti yica udukoko, hakoreshejwe uburyo bw'ubuhinzi bw'umwimerere. Ibicuruzwa byo mu kamere bikunze kwitabwaho kubera ubuzima n'ibidukikije.",
  },
  pesticide: {
    en: "A pesticide is a substance used to control pests (insects, weeds, fungi) that damage crops. Overuse can harm soil and health — always follow safe usage guidelines.",
    rw: "Umuti wica udukuko ni ikintu gikoreshwa mu kugenzura udukuko (insekta, uruyuki, imiko) byangiza ibihingwa. Ikoreshwa ryinshi ryashobora kwangiza ubutaka n'ubuzima — buri gihe kurikiza amabwiriza y'ukoresha.",
  },
  irrigation: {
    en: "Irrigation is the practice of supplying water to crops artificially, especially during dry seasons, to help plants grow when rainfall is insufficient.",
    rw: "Kuhira ni ukuvuga guhana amazi ibihingwa mu buryo bw'ikoranabuhanga, cyane mu bihe by'izuba, kugira ngo bimera byakure neza igihe imvura idahagije.",
  },
  "crop rotation": {
    en: "Crop rotation is the practice of planting different crops in the same field across seasons. It helps maintain soil fertility and reduces pest buildup.",
    rw: "Guhinduranya ibihingwa ni ukwingiza ibihingwa bitandukanye mu murima umwe mu bihe bitandukanye. Bifasha mu kubungabungabunga ubugeri bw'ubutaka kandi bidindiza udukuko twiyongera.",
  },
  seed: {
    en: "A seed is the small part of a plant from which a new plant grows. Quality seeds produce stronger, more productive crops.",
    rw: "Imbuto ni igice gito cy'ikimera kiva ho ikimera gishya. Imbuto nziza zihinga ibimera byimbitse kandi byorohe.",
  },
  "dry season": {
    en: "The dry season is a period of little or no rainfall. In Rwanda it typically occurs from June to August. Farmers rely on irrigation or stored water during this time.",
    rw: "Igihe cy'izuba ni igihe imvura nkeya cyangwa idahagije. Mu Rwanda ikunze kuba hagati ya Kamena na Kanama. Abahinzi bishingira ku kuhira cyangwa amazi yabitswe muri icyo gihe.",
  },
  "rainy season": {
    en: "The rainy season is a period of regular, heavy rainfall. In Rwanda there are two main rainy seasons: September to November and March to May. This is when most planting and growing happens.",
    rw: "Igihe cy'Imvura ni igihe imvura ikunze kugwa inanini. Mu Rwanda hari ibihe bibiri by'imbare y'imvura: Nzeri-Nyakanga na Werurwe-Gicurasi. Iri ni igihe benshi bahinga kandi ibihingwa bikura.",
  },
  hectare: {
    en: "A hectare is a unit of land area equal to 10,000 square metres (about 2.5 acres). It is commonly used to measure farm size in Rwanda.",
    rw: "Hegitari ni urugero rw'ubuso bw'ubutaka bungana na m² 10,000 (hafi acres 2.5). Ikunze gukoreshwa mu kupima ingano y'ubuhinzi mu Rwanda.",
  },
  acre: {
    en: "An acre is a unit of land area, about 4,000 square metres. It is smaller than a hectare and sometimes used by farmers to describe field size.",
    rw: "Akare ni urugero rw'ubuso bw'ubutaka, hafi m² 4,000. Ni gutoya hegitari kandi rimwe na rimwe gahozwa n'abahinzi mu gusobanura ingano y'umurima.",
  },
  "price per unit": {
    en: "Price per unit is the cost of one measured quantity of a product — for example, RWF 500 per kg means one kilogram costs 500 RWF.",
    rw: "Igiciro ku kintu ni agaciro k'urugero rumwe rw'igicuruzwa — urugero: RWF 500 kuri kg bivuga ko kg imwe igura RWF 500.",
  },
  bargaining: {
    en: "Bargaining (or negotiating) is when a buyer and seller discuss the price to reach an agreement. On Isoko Link, prices are set by sellers, but buyers can contact them to negotiate.",
    rw: "Isezereranya ni igihe umuguzi n'umugurishi biganira ku giciro ngo bashyire ahagarariwe. Kuri Isoko Link, ibiciro shyirwaho n'abagurishi, ariko abaguzi bashobora kubahamagara ngo baganire.",
  },
  enquiry: {
    en: "An enquiry is a message from a buyer expressing interest in a product. On Isoko Link, you can send an enquiry to a farmer to ask about availability and price.",
    rw: "Ikibazo ni ubutumwa bwo k'umuguzi bwerekana ko yiyumvisha igicuruzwa. Kuri Isoko Link, ushobora kohereza ikibazo ku muhinzi w'ibyasabwe ku kuboneka n'igiciro.",
  },
  "bulk purchase": {
    en: "A bulk purchase means buying a large quantity of a product at once. Bulk purchases often come with a lower price per unit.",
    rw: "Igura ry'ibinini bivuga kugura ingano nini y'igicuruzwa mu cyiciro kimwe. Igura ry'ibinini rikunze kuba n'igiciro cyo hasi ku kintu.",
  },
  logistics: {
    en: "Logistics refers to the process of transporting and delivering goods from seller to buyer. On Isoko Link, buyers and farmers arrange delivery between themselves.",
    rw: "Imiturire y'ibintu bivuga igikorwa cyo kwereka no kohereza ibintu kuva ku mugurishi ukagezwa ku muguzi. Kuri Isoko Link, abaguzi n'abahinzi bahuze bashyiraho uburyo bwo kohereza.",
  },
  quality: {
    en: "Quality describes how good a product is — its freshness, size, condition, and freedom from damage or disease. Higher quality usually commands a better price.",
    rw: "Ubwiza bwasobanura ingaruka z'igicuruzwa — ubutaratari, ingano, imiterere, n'ubwangiritse cyangwa indwano. Ubwiza bwiza busanzwe buhabwa igiciro cyiza.",
  },
  grade: {
    en: "A grade is a classification of product quality (e.g. Grade A, Grade B). Higher grades mean better quality and usually a higher price.",
    rw: "Icyiciro ni ishusho ry'ubwiza bw'igicuruzwa (urugero: Icyiciro cya A, Icyiciro cya B). Icyiciro cyo hejuru bivuga ubwiza bwiza kandi busanzwe igiciro cyo hejuru.",
  },
  "supply and demand": {
    en: "Supply and demand is the relationship between how much of a product is available (supply) and how much buyers want it (demand). High demand with low supply usually raises prices; the opposite lowers them.",
    rw: "Ibyaboneka n'ibyasabwe ni isano hagati y'ingano y'igicuruzwa kiboneka (ibyaboneka) n'ingano abaguzi bishaka (ibyasabwe). Ibyasabwe byinshi n'ibyaboneka bike bikunze kwiyongera ku giciro; ibinyuma byo hasi.",
  },
  "seasonal produce": {
    en: "Seasonal produce refers to crops that are only available during certain times of the year. Prices are usually lower during harvest season and higher off-season.",
    rw: "Ibihingwa by'ibihe bivuga ibihingwa biboneka gusa mu bihe runaka by'umwaka. Ibindi bikunze kuba hasi mu gihe cy'ikwizima kandi byo hejuru hanze y'icyo gihe.",
  },
  soil: {
    en: "Soil is the top layer of earth where plants grow. Healthy soil with good nutrients and water retention produces better crops.",
    rw: "Ubutaka ni akarere ko hejuru kw'isi hakura ibimera. Ubutaka bwiza bw'imyunyungugu n'amafaranga y'amazi byihinga ibihingwa byiza.",
  },
  compost: {
    en: "Compost is decomposed organic matter (leaves, food waste, manure) used as a natural fertilizer. It improves soil structure and nutrients without chemicals.",
    rw: "Ifumbire y'ibinyabwira ni bwa bwoko bw'ibinyabwira byaze (amababi, ibisigazwa by'ibiribwa, ifumbire y'amatungo) bikoreshwa nk'ifumbire y'umwimerere. Biviraho ibinyabutaka n'imyunyungugu nta bya kemikale.",
  },
  "post-harvest loss": {
    en: "Post-harvest loss is food lost after harvesting due to spoilage, pests, or poor storage. Reducing it through better storage and handling increases a farmer's income.",
    rw: "Ibyabaye nyuma y'ikwizima ni ibiribwa byahonjeje nyuma yo gukwiza kubera ubwangiritse, udukuko, cyangwa ububi bubigije. Kubiha mu bubikwa bwiza no gukobera neza byongera amafaranga y'umuhinzi.",
  },
  cooperative: {
    en: "A cooperative is a group of farmers who work together to sell their produce, share resources, and negotiate better prices collectively.",
    rw: "Cooperative ni itsinda ry'abahinzi bakorera hamwe ngo bagurishe ibihingwa byabo, bahinge imitungo, kandi baganire ku biciro byiza hamwe.",
  },
  "unit price": {
    en: "Unit price is the cost for one unit of a product (per kg, per sack, per bunch). Comparing unit prices helps buyers find the best deal.",
    rw: "Igiciro cy'urugero ni agaciro k'urugero rumwe rw'igicuruzwa (kuri kg, pfunye, muheru). Kugereranya amagiciro y'urugero bifasha umuguzi gushaka ibyiza.",
  },
  "payment method": {
    en: "A payment method is how a buyer pays — cash, mobile money (MTN MoMo, Airtel Money), or bank transfer. On Isoko Link, payment arrangements are made directly between buyer and seller.",
    rw: "Uburyo bwo kwishyura ni uko umuguzi yishyura — amafaranga, mobile money (MTN MoMo, Airtel Money), cyangwa banki. Kuri Isoko Link, amasezerano y'amafaranga akorwa mu byacu hagati y'umuguzi n'umugurishi.",
  },
  "mobile money": {
    en: "Mobile money is a service that lets you send and receive money using a mobile phone without a bank account. In Rwanda, MTN MoMo and Airtel Money are the main providers.",
    rw: "Mobile money ni serivisi ikwemerera kohereza no kwakira amafaranga ukoresheje telefoni nta konti ya banki. Mu Rwanda, MTN MoMo na Airtel Money ni bo benshi batanga.",
  },
};

const GLOSSARY_TERMS = Object.keys(GLOSSARY);

// ─── Phrase translations (expanded) ───────────────────────

const PHRASE_TRANSLATIONS: Record<string, { en: string; rw: string }> = {
  "how much": { en: "How much", rw: "Angahe" },
  "how much is this": { en: "How much is this?", rw: "Ibi ni angahe?" },
  "i want to buy": { en: "I want to buy", rw: "Nshaka kugura" },
  "i want to sell": { en: "I want to sell", rw: "Nshaka kugurisha" },
  "what is the price": { en: "What is the price?", rw: "Igiciro ni iki?" },
  "is it available": { en: "Is it available?", rw: "Kirimo kuboneka?" },
  "how many kilograms": { en: "How many kilograms?", rw: "Kg zingahe?" },
  "per kilogram": { en: "per kilogram", rw: "kuri kg imwe" },
  "per sack": { en: "per sack", rw: "kuri pfunye imwe" },
  "per bunch": { en: "per bunch", rw: "kuri muheru imwe" },
  "per litre": { en: "per litre", rw: "kuri litiro imwe" },
  "organic produce": { en: "organic produce", rw: "ibihingwa byo mu kamere" },
  "fresh harvest": { en: "fresh harvest", rw: "ibyakuze aho hazwiyemo" },
  "good quality": { en: "good quality", rw: "mwiza ku mutwe" },
  "negotiable price": { en: "negotiable price", rw: "igiciro cyo gusezereranya" },
  "delivery available": { en: "delivery available", rw: "twohereza ku wabusuye" },
  "out of stock": { en: "out of stock", rw: "byarangiye" },
  "thank you": { en: "Thank you", rw: "Murakoze" },
  welcome: { en: "Welcome", rw: "Murakaza neza" },
  // ─── Additional phrases ───
  "do you deliver": { en: "Do you deliver?", rw: "Mwohereza?" },
  "where are you located": { en: "Where are you located?", rw: "Waherereye he?" },
  "can i get a discount": { en: "Can I get a discount?", rw: "Nshobora kubona agaciro ka hasi?" },
  "what is the minimum order": { en: "What is the minimum order?", rw: "Igipimo cyo hasi cy'ibyo nagura ni iki?" },
  "is it fresh": { en: "Is it fresh?", rw: "Bimeze neza?" },
  "when was it harvested": { en: "When was it harvested?", rw: "Byakwirijwe ryari?" },
  "how do i pay": { en: "How do I pay?", rw: "Nishyura gute?" },
  "do you have more": { en: "Do you have more?", rw: "Mufite ibindi byinshi?" },
  "i am a farmer": { en: "I am a farmer", rw: "Ndi umuhinzi" },
  "i am a buyer": { en: "I am a buyer", rw: "Ndi umuguzi" },
  "call me": { en: "Call me", rw: "Nhamagare" },
  "i will come to see it": { en: "I will come to see it", rw: "Nzaza nibure" },
  "best price": { en: "Best price", rw: "Igiciro cyiza" },
  "bulk order": { en: "Bulk order", rw: "Ibyo gukurura mu mubare" },
  "fair price": { en: "Fair price", rw: "Igiciro cy'uburinganire" },
  "good morning": { en: "Good morning", rw: "Mwaramutse" },
  "good afternoon": { en: "Good afternoon", rw: "Mwiriwe" },
};

// ─── Listing tips ─────────────────────────────────────────

const LISTING_TIPS = {
  en: [
    "1. Use a clear, specific product name (e.g. 'Fresh Tomatoes — Grade A' not just 'Tomatoes').",
    "2. Set a fair, realistic price based on your local market.",
    "3. Choose the correct unit (kg, sack, bunch, litre) so buyers know exactly what they pay for.",
    "4. Write an honest description: include quality, freshness, origin, and any certifications.",
    "5. Upload a clear, well-lit photo showing the actual product.",
    "6. Keep your quantity updated so buyers know what's available.",
    "7. Respond quickly to enquiries to build trust with buyers.",
  ],
  rw: [
    "1. Koresha izina ry'igicuruzwa ryisobanuwe neza (urugero: 'Tumate Mazima — Icyiciro cya A' badakoresha gusa 'Tumate').",
    "2. Shyiraho igiciro cyiza kandi cy'ukuri mu gisonga cy'imirima yanyu.",
    "3. Hitamo urugero rw'ukuri (kg, pfunye, muheru, litiro) ngo abaguzi bategereze neza ibyo bishyuraho.",
    "4. Andika ibisobanuro by'ukuri: vanamo ubwiza, ubutagatifu, aho byavuye, n'ibyangombwa byemewe.",
    "5. Fata ifoto y'umumwederero yerekana igicuruzwa nyacyo.",
    "6. Komeza ubwinshi bw'ibicuruzwa bwugaye ngo abaguzi bategereze ibyo baboneka.",
    "7. Subira vubibyiza amabwiriza ngo wubake icyizere n'abaguzi.",
  ],
};

// ─── Fallback handlers ────────────────────────────────────

function fallbackExplainTerm(term: string, lang: "en" | "rw"): string {
  const key = term.toLowerCase().trim();
  if (GLOSSARY[key]) {
    return GLOSSARY[key][lang];
  }
  // Try partial match against known terms
  const partial = GLOSSARY_TERMS.find((t) => key.includes(t) || t.includes(key));
  if (partial && GLOSSARY[partial]) {
    return GLOSSARY[partial][lang];
  }

  // ─── Best-effort explanation for unknown terms ───
  // Instead of refusing, attempt a general explanation based on context.
  const isAgricultural = /\b(crop|farm|plant|seed|soil|grow|land|field|irrigat|season|rain|sun|water|harvest|cultiv|till|sow|graft|prune|graft|nursery|greenhouse|tractor|plough|hoe|spade|insect|pest|weed|fung|disease|grain|fruit|vegetable|root|leaf|stem|flower|bean|maize|corn|rice|wheat|sorghum|cassava|sweet potato|banana|tomato|onion|cabbage|spinach|coffee|tea|sugar|cotton|honey|milk|egg|meat|fish|cattle|cow|goat|sheep|pig|poultry|chicken|rabbit|bee|silk|cocoa|pepper|garlic|ginger|avocado|mango|pineapple|papaya|orange|lemon|carrot|lettuce|pea|groundnut|soybean|sunflower|pumpkin|watermelon|melon|yam|cocoyam|fig|date|olive|almond|cashew|macadamia|sesame|flax|fodder|pasture|hay|silage|compost|manure|mulch|organic|biological|sustainable|agroforestry|permaculture|hydroponic|aquapon|tilapia|catfish|dairy|beef|mutton|pork|poultry|broiler|layer|incubator|hatchery|veterinary|vaccine|antibiotic|vitamin|mineral|protein|carbohydrate|fat|fibre|calorie|nutrition|diet|food|feed|fodder|forage|graze|browse|barn|silo|granary|store|warehouse|sack|bag|crate|basket|bottle|jug|can|drum|tank|pump|pipe|drip|sprinkler|channel|canal|reservoir|dam|pond|well|borehole|rainwater|groundwater|surface water|watershed|catchment|drainage|erosion|terracing|contour|strip|agro|agri|farm|farmer|farming|agriculture|horticulture|floriculture|viticulture|sericulture|apiculture|aquaculture|pisciculture|silviculture|arable|pastoral|mixed|cooperative|union|association|society|federation|confederation|syndicate|cartel|monopoly|oligopoly|competition|market|trade|commerce|exchange|barter|auction|tender|bid|quote|offer|negotiate|bargain|haggle|discount|rebate|subsidy|grant|loan|credit|debit|savings|investment|capital|asset|liability|equity|revenue|income|profit|loss|cost|expense|budget|cash|money|currency|forex|exchange rate|inflation|deflation|interest|tax|duty|tariff|quota|embargo|sanction|subsidy|dumping|smuggling|counterfeit|piracy|fraud|corruption|bribe|extortion|embezzlement|forgery|money laundering|tax evasion|black market|informal|formal|official|unofficial|legal|illegal|law|regulation|policy|standard|certification|license|permit|registration|inspection|audit|compliance|violation|penalty|fine|sanction|prosecution|lawsuit|court|tribunal|arbitration|mediation|conciliation|negotiation|settlement|agreement|contract|treaty|convention|protocol|charter|constitution|statute|ordinance|decree|order|directive|guideline|code|rule|norm|custom|practice|tradition|culture|heritage|identity|values|ethics|morals|principles|beliefs|religion|faith|spirituality|philosophy|ideology|doctrine|dogma|creed|sect|cult|denomination|order|brotherhood|sisterhood|fellowship|community|society|association|organization|institution|agency|bureau|department|ministry|authority|council|assembly|parliament|congress|senate|house|committee|commission|board|panel|taskforce|team|group|circle|network|coalition|alliance|partnership|coalition|merger|acquisition|takeover|buyout|privatization|nationalization|deregulation|liberalization|reform|restructuring|reorganization|downsizing|outsourcing|offshoring|restructuring|reengineering|reform|transformation|transition|conversion|adaptation|modernization|mechanization|automation|digitalization|computerization|robotization|artificial intelligence|machine learning|data|information|knowledge|wisdom|understanding|insight|perception|conception|idea|concept|theory|hypothesis|assumption|presumption|supposition|conjecture|speculation|guess|estimate|approximation|calculation|computation|measurement|evaluation|assessment|appraisal|valuation|rating|ranking|grading|scoring|marking|testing|examination|inspection|verification|validation|confirmation|certification|accreditation|authorization|approval|permission|consent|assent|agreement|acceptance|endorsement|support|backing|sponsorship|patronage|advocacy|promotion|campaign|drive|crusade|movement|initiative|program|project|scheme|plan|strategy|tactic|technique|method|procedure|process|system|framework|structure|architecture|design|layout|arrangement|organization|configuration|setup|installation|implementation|execution|operation|management|administration|governance|leadership|direction|guidance|supervision|oversight|control|regulation|monitoring|tracking|reporting|documentation|record|file|database|archive|library|collection|repository|registry|register|log|journal|diary|ledger|book|document|certificate|license|permit|card|ticket|token|coupon|voucher|stamp|seal|signature|initial|endorsement|authorization|approval|consent|permission|agreement|contract|treaty|pact|accord|deal|arrangement|settlement|resolution|decision|verdict|judgment|ruling|order|decree|mandate|directive|instruction|command|request|demand|requirement|specification|condition|stipulation|provision|clause|article|section|paragraph|chapter|title|heading|caption|label|tag|marker|identifier|code|number|reference|index|catalog|directory|list|inventory|stock|supply|reserve|buffer|cushion|backup|fallback|alternative|substitute|replacement|exchange|swap|trade|barter|transaction|deal|sale|purchase|buy|sell|rent|lease|hire|borrow|lend|loan|credit|debt|obligation|liability|asset|property|belonging|possession|ownership|title|right|claim|demand|request|petition|appeal|application|motion|proposal|suggestion|recommendation|advice|counsel|guidance|direction|instruction|teaching|education|training|coaching|mentoring|tutoring|lecturing|presenting|demonstrating|showing|displaying|exhibiting|performing|acting|playing|singing|dancing|music|art|craft|skill|technique|method|way|approach|style|manner|fashion|trend|custom|habit|practice|routine|tradition|heritage|legacy|history|past|memory|recollection|remembrance|nostalgia|regret|remorse|guilt|shame|embarrassment|pride|honor|dignity|respect|esteem|admiration|appreciation|gratitude|thankfulness|joy|happiness|pleasure|satisfaction|contentment|peace|calm|serenity|tranquility|relaxation|rest|sleep|dream|nightmare|vision|fantasy|imagination|creativity|innovation|invention|discovery|exploration|adventure|journey|trip|travel|tour|visit|excursion|expedition|voyage|cruise|flight|drive|ride|walk|hike|trek|climb|ascend|descend|dive|swim|float|sink|drown|survive|live|die|kill|murder|assassinate|execute|slaughter|sacrifice|offering|gift|present|donation|contribution|alms|charity|philanthropy|generosity|kindness|compassion|sympathy|empathy|pity|mercy|forgiveness|pardon|amnesty|clemency|leniency|tolerance|patience|endurance|perseverance|persistence|determination|willpower|resolve|commitment|dedication|devotion|loyalty|faithfulness|fidelity|honesty|integrity|truthfulness|sincerity|authenticity|genuineness|reality|fact|truth|knowledge|wisdom|understanding|comprehension|awareness|consciousness|mind|brain|intelligence|intellect|reason|logic|rationality|sanity|madness|insanity|craziness|foolishness|wisdom|prudence|caution|care|attention|focus|concentration|meditation|contemplation|reflection|thought|idea|concept|notion|belief|opinion|view|perspective|standpoint|position|stance|attitude|posture|pose|gesture|signal|sign|symbol|mark|token|emblem|badge|insignia|logo|brand|trademark|patent|copyright|intellectual property|design right|trade secret|know|how|expertise|skill|art|craft|trade|profession|occupation|job|work|labor|toil|effort|exertion|strain|stress|pressure|tension|burden|load|weight|mass|volume|capacity|size|dimension|measurement|extent|range|scope|reach|span|spread|width|breadth|length|height|depth|thickness|area|surface|perimeter|circumference|radius|diameter|center|middle|core|heart|soul|spirit|essence|nature|character|personality|temperament|disposition|mood|emotion|feeling|sensation|perception|sight|vision|eye|look|gaze|stare|glance|peep|peek|view|scene|sight|landscape|panorama|vista|outlook|prospect|future|destiny|fate|fortune|luck|chance|probability|possibility|opportunity|occasion|moment|time|hour|minute|second|day|week|month|year|decade|century|millennium|epoch|era|age|period|phase|stage|step|level|degree|grade|rank|status|position|situation|condition|state|circumstance|context|environment|setting|background|surroundings|neighborhood|community|society|world|globe|earth|planet|universe|cosmos|space|galaxy|star|sun|moon|planet|asteroid|comet|meteor|space|void|emptiness|nothingness|being|existence|life|death|birth|rebirth|reincarnation|resurrection|immortality|eternity|infinity|limitlessness|boundlessness|vastness|immensity|enormity|greatness|magnitude|size|proportion|ratio|fraction|percentage|rate|speed|velocity|acceleration|force|power|energy|strength|might|vigour|vitality|health|wellness|fitness|wholeness|soundness|robustness|hardiness|toughness|resilience|elasticity|flexibility|adaptability|versatility|capability|ability|capacity|competence|proficiency|mastery|expertise|knowledge|wisdom|understanding)\b/i.test(key);

  if (isAgricultural) {
    return lang === "rw"
      ? `"${term}" ni ijambo ry'ubuhinzi cyangwa bw'isoko. Mu buryo rusange, rifite isano n'ubuhinzi, ibihingwa, cyangwa gucuruza mu maboko y'ubuhinzi. Ku bijyanye n'isoko ry'Isoko Link, bishobora kuvuga igiciro, ubwinshi, cyangwa uburyo bwo kugurisha no kugura ibihingwa. Kubasobanura byimbitse, ihitamo rya serivisi y'AI yuzuye ryari gushyirwaho. Nyamuneka gerageza izindi nyigisho z'isoko cyangwa amagambo y'ubuhinzi.`
      : `"${term}" is an agricultural or marketplace term. In general, it relates to farming, crops, or agricultural trade. In the context of Isoko Link, it may refer to pricing, quantity, or the process of buying and selling produce. For a more detailed explanation, the full AI service would provide one once configured. You can also try related marketplace or farming terms for a glossary definition.`;
  }

  return lang === "rw"
    ? `"${term}" ntabwo ari ijambo ry'ubuhinzi cyangwa ry'isoko mu nkuru yacu. Muri ubwo buryo, dushobora gusobanura amagambo menshi y'ubuhinzi n'isoko. Nyamuneka gerageza ikindi jambo, cyangwa izindi nyigisho z'isoko.`
    : `"${term}" is not a specific agricultural or marketplace term in our glossary. However, you can ask about any farming or marketplace concept — try a related term, or rephrase your question. The assistant is designed to help with any agricultural or trade vocabulary.`;
}

function fallbackTranslate(phrase: string, lang: "en" | "rw"): string {
  const key = phrase.toLowerCase().trim();
  if (PHRASE_TRANSLATIONS[key]) {
    const entry = PHRASE_TRANSLATIONS[key];
    return `EN: "${entry.en}" → RW: "${entry.rw}"`;
  }
  const partial = Object.keys(PHRASE_TRANSLATIONS).find((p) => key.includes(p) || p.includes(key));
  if (partial) {
    const entry = PHRASE_TRANSLATIONS[partial];
    return `EN: "${entry.en}" → RW: "${entry.rw}"`;
  }
  return lang === "rw"
    ? `Iyo jambo "${phrase}" ntago iri mu bihuru byacu. Dushobora guhindura amagambo magufi nka: ${Object.keys(PHRASE_TRANSLATIONS).slice(0, 10).join(", ")}. Nyamuneka gerageza irindi jambo.`
    : `The phrase "${phrase}" is not in our phrasebook. We can translate short phrases like: ${Object.keys(PHRASE_TRANSLATIONS).slice(0, 10).join(", ")}. Please try another phrase.`;
}

function fallbackExplainProduct(
  product: { name: string; description: string; price: number; unit: string; quantity_available?: number },
  lang: "en" | "rw"
): string {
  const priceRwf = new Intl.NumberFormat("en-RW").format(product.price);
  const qty = product.quantity_available;
  if (lang === "rw") {
    const parts = [
      `Ibi ni bwa "${product.name}".`,
      product.description ? `Ibisobanuro: ${product.description}` : "",
      `Igiciro ni RWF ${priceRwf} kuri ${product.unit} imwe.`,
      qty !== undefined ? `Ubwinshi buboneka: ${qty} ${product.unit}.` : "",
      `Kugira ngo wumve igiciro, umuguzi agura ku giciro cya ${product.unit} — ugura nyinshi, wishyura nyinshi.`,
      `Isoko Link nti shyobora kuvuga ko ari igiciro cyo ku muko, ni cyo cyemejwe n'umugurishi.`,
    ];
    return parts.filter(Boolean).join(" ");
  }
  const parts = [
    `This is "${product.name}".`,
    product.description ? `Description: ${product.description}` : "",
    `Price: RWF ${priceRwf} per ${product.unit}.`,
    qty !== undefined ? `Available quantity: ${qty} ${product.unit}.` : "",
    `To understand the price, the buyer pays per ${product.unit} — buying more means paying more.`,
    `Note: Isoko Link does not guarantee this is the market price; the seller sets it.`,
  ];
  return parts.filter(Boolean).join(" ");
}

function fallbackListingTips(lang: "en" | "rw"): string {
  return LISTING_TIPS[lang].join("\n");
}

function fallbackPriceCalc(calc: { pricePerUnit: number; quantity: number }, lang: "en" | "rw"): string {
  const total = calc.pricePerUnit * calc.quantity;
  const fmt = new Intl.NumberFormat("en-RW").format(total);
  const priceFmt = new Intl.NumberFormat("en-RW").format(calc.pricePerUnit);
  return lang === "rw"
    ? `Igiciro: RWF ${priceFmt} × ${calc.quantity} = RWF ${fmt}. Ushyura RWF ${fmt} kuri ibyo bihe.`
    : `Price: RWF ${priceFmt} × ${calc.quantity} = RWF ${fmt}. You pay RWF ${fmt} total.`;
}

function dispatchFallback(body: AssistantRequest, lang: "en" | "rw"): string {
  switch (body.action) {
    case "explain_term":
      return fallbackExplainTerm(body.term || "", lang);
    case "translate":
      return fallbackTranslate(body.phrase || "", lang);
    case "explain_product":
      if (body.product) return fallbackExplainProduct(body.product, lang);
      return lang === "rw" ? "Ibyuma ntibyaboneka." : "Product data unavailable.";
    case "listing_tips":
      return fallbackListingTips(lang);
    case "price_calc":
      if (body.calc) return fallbackPriceCalc(body.calc, lang);
      return lang === "rw" ? "Ibibazo ntabwo byaboneka." : "Calculation data unavailable.";
    default:
      return lang === "rw" ? "Ikindi kutabizi." : "Unknown request.";
  }
}

// ─── AI handler ───────────────────────────────────────────

interface AIResult {
  content: string | null;
  error: string | null;
  status: number;
}

async function callAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<AIResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { content: null, error: `OpenAI ${res.status}: ${errText.slice(0, 300)}`, status: res.status };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return {
      content: typeof content === "string" ? content.trim() : null,
      error: null,
      status: res.status,
    };
  } catch (err) {
    return { content: null, error: (err as Error).message, status: 0 };
  }
}

// ─── Main ─────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === "GET") {
    const key = Deno.env.get("OPENAI_API_KEY") || "";
    return new Response(
      JSON.stringify({ ok: true, hasKey: !!key }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: AssistantRequest = await req.json();
    const lang = body.lang === "rw" ? "rw" : "en";
    const apiKey = Deno.env.get("OPENAI_API_KEY") || "";

    // If no API key, always use glossary fallback
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          response: dispatchFallback(body, lang),
          source: "glossary",
          message: lang === "rw"
            ? "Ibi bivuye mu nkuru y'Isoko Link. Serivisi y'AI yuzuye isaba kwinjizwa rya API key."
            : "This answer comes from the Isoko Link built-in glossary. The full AI service requires an API key to be configured.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemBase = `You are the Isoko Link Agricultural Assistant. You help farmers and buyers in Rwanda understand ANY agricultural or marketplace concept, term, or question — not just a fixed list. Respond in ${lang === "rw" ? "Kinyarwanda" : "English"}. Keep answers concise (max 150 words). Never invent live market prices. Never guarantee agricultural yields. Never suggest making purchases, publishing listings, or initiating payments without explicit user authorization.`;

    let userPrompt = "";
    let fallback: string;

    switch (body.action) {
      case "explain_term": {
        const term = body.term || "";
        userPrompt = `Explain the agricultural or marketplace term/concept "${term}" in simple language. If the term is not strictly agricultural, still try to explain it in a farming/marketplace context. Do not refuse — always provide your best explanation.`;
        fallback = fallbackExplainTerm(term, lang);
        break;
      }
      case "translate": {
        const phrase = body.phrase || "";
        userPrompt = lang === "en"
          ? `Translate this English phrase to Kinyarwanda. It may be a marketplace, farming, or general phrase: "${phrase}". Format: "EN: ... → RW: ..."`
          : `Translate this Kinyarwanda phrase to English. It may be a marketplace, farming, or general phrase: "${phrase}". Format: "RW: ... → EN: ..."`;
        fallback = fallbackTranslate(phrase, lang);
        break;
      }
      case "explain_product": {
        const p = body.product;
        if (!p) {
          return new Response(
            JSON.stringify({ error: "Product data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userPrompt = `Explain this product listing in simple terms for a buyer. Product name: "${p.name}". Description: "${p.description}". Price: RWF ${p.price} per ${p.unit}. Available: ${p.quantity_available ?? "unknown"} ${p.unit}. Use only this real information — do not invent details, market prices, or quality claims.`;
        fallback = fallbackExplainProduct(p, lang);
        break;
      }
      case "listing_tips": {
        userPrompt = `Give 5 concise tips for a seller creating a product listing on an agricultural marketplace. Focus on clear names, fair pricing, correct units, good descriptions, and photos.`;
        fallback = fallbackListingTips(lang);
        break;
      }
      case "price_calc": {
        const c = body.calc;
        if (!c) {
          return new Response(
            JSON.stringify({ error: "Calculation data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userPrompt = `Calculate: price per unit is RWF ${c.pricePerUnit}, quantity is ${c.quantity}. Total = price × quantity. State the result simply. Do NOT suggest buying or paying.`;
        fallback = fallbackPriceCalc(c, lang);
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const aiResult = await callAI(systemBase, userPrompt, apiKey);

    if (aiResult.content) {
      return new Response(
        JSON.stringify({ response: aiResult.content, source: "ai" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        response: fallback,
        source: "glossary",
        aiError: aiResult.error,
        message: lang === "rw"
          ? "Serivisi y'AI ntiyaboneze kuri ubu. Ibi bivuye mu nkuru y'Isoko Link."
          : "The AI service is temporarily unavailable. This answer comes from the Isoko Link built-in glossary.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
