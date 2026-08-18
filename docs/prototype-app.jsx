import { useState } from "react";

// ===== EMBEDDED QUERY BANK (ChatGPT India bank + Gemini GCC batch + harvested Claude snapshots) =====
const BANK = {"India":[{"id":"face-serum-vitamin-c","n":"Face serum / vitamin C","g":"Beauty & Personal Care","q":[["Under ₹700, what vitamin C serum works best for oily acne-prone skin and fading post-acne marks?","category-discovery","en"],["₹700 ke andar dull skin ke liye beginner-friendly option — kaunsa vitamin C serum lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Minimalist vitamin C serum at the best price in India?","branded-routing","en","Minimalist"],["My face looks dull and the dark marks left after pimples are not fading. What should I use?","problem-first","en"]]},{"id":"sunscreen","n":"Sunscreen","g":"Beauty & Personal Care","q":[["I have ₹500 to spend on sunscreen for daily office commute in strong summer sun without white cast; what should I shortlist?","category-discovery","en"],["sweaty skin aur outdoor travel chahiye; ₹500 tak ka sunscreen suggest karo.","category-discovery","hi-en"],["I'm set on Minimalist for sunscreen; which site should I use to get an authentic one for less?","branded-routing","en","Minimalist"],["I tan within minutes outdoors and most creams feel sticky on my face. What can protect me without feeling heavy?","problem-first","en"]]},{"id":"hair-oil","n":"Hair oil (cold-pressed / ayurvedic)","g":"Beauty & Personal Care","q":[["Need cold-pressed hair oil for weekly scalp massage for dry hair and breakage and want to stay below ₹600 — which options are worth it?","category-discovery","en"],["Mera budget ₹600 hai, hair fall aur dry scalp ke liye kaunsa cold-pressed hair oil dekhun?","category-discovery","hi-en"],["For Indulekha cold-pressed hair oil, should I order from the brand site or another trusted seller in India?","branded-routing","en","Indulekha"],["My scalp feels dry and my hair keeps snapping when I comb it. What can I add to my weekly routine?","problem-first","en"]]},{"id":"beard-grooming","n":"Beard grooming","g":"Beauty & Personal Care","q":[["Which beard grooming kit under ₹1000 is good for keeping a short beard neat without making it greasy?","category-discovery","en"],["patchy beard ko tidy rakhna ke liye ₹1000 ke aas-paas koi achha beard grooming kit hai?","category-discovery","hi-en"],["I already want Beardo beard grooming kit — where is the safest place to buy it without overpaying?","branded-routing","en","Beardo"],["My facial hair grows unevenly and gets rough by evening. What can help it look cleaner and softer?","problem-first","en"]]},{"id":"shampoo","n":"Shampoo (sulfate-free)","g":"Beauty & Personal Care","q":[["₹700 budget: suggest sulfate-free shampoo that suits colour-treated hair that gets frizzy after washing.","category-discovery","en"],["₹700 max spend karna hai — frizzy baal aur gentle wash wala sulfate-free shampoo batao.","category-discovery","hi-en"],["What's the best place online to get authentic Plum sulfate-free shampoo in India right now?","branded-routing","en","Plum"],["My hair colour fades quickly and every wash leaves the lengths rough. What should I switch to?","problem-first","en"]]},{"id":"face-wash","n":"Face wash (men)","g":"Beauty & Personal Care","q":[["For oily skin after gym and daily commute, what men's face wash can I get within ₹500?","category-discovery","en"],["India mein ₹500 budget mein gym ke baad oily face; men's face wash mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine NIVEA Men men's face wash deal and tell me where I should actually buy?","branded-routing","en","NIVEA Men"],["My face gets greasy after workouts and by afternoon, but strong cleansers make it feel tight. What should I use?","problem-first","en"]]},{"id":"kajal-eyeliner","n":"Kajal / eyeliner","g":"Beauty & Personal Care","q":[["Looking for kajal around ₹350, mainly for all-day office wear that should not smudge; what would you pick?","category-discovery","en"],["waterline pe long-lasting dark look ke liye kajal chahiye, budget roughly ₹350 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Lakmé kajal. Which Indian store should I buy from?","branded-routing","en","Lakmé"],["My eye makeup keeps spreading under my eyes by lunchtime. What can stay dark without smudging?","problem-first","en"]]},{"id":"lipstick","n":"Lipstick (long-stay)","g":"Beauty & Personal Care","q":[["Can you recommend long-stay lipstick below ₹800 for wedding functions and meals without frequent touch-ups?","category-discovery","en"],["₹800 tak mein long-stay lipstick dekh raha/rahi hoon; focus shaadi function ke liye transfer-proof shade pe hai.","category-discovery","hi-en"],["Where would you route me for a real Maybelline long-stay lipstick: its own site or a marketplace?","branded-routing","en","Maybelline"],["I need lip colour that survives dinner and photos without constant touch-ups. What should I look for?","problem-first","en"]]},{"id":"body-lotion","n":"Body lotion","g":"Beauty & Personal Care","q":[["What's a reliable body lotion for very dry legs in winter without a sticky finish if my limit is ₹600?","category-discovery","en"],["Koi body lotion ₹600 se kam jo dry skin ke liye non-chipchipa option ke kaam aaye?","category-discovery","hi-en"],["I'm buying NIVEA body lotion; who has the best genuine listing and price in India?","branded-routing","en","NIVEA"],["My arms and legs turn ashy after a shower and feel dry again within hours. What can keep them comfortable longer?","problem-first","en"]]},{"id":"perfume-attar","n":"Perfume / attar","g":"Beauty & Personal Care","q":[["Help me choose perfume for daily office wear with noticeable but not overpowering projection; budget is ₹1500 max.","category-discovery","en"],["office ke liye long-lasting fragrance sabse important hai aur budget ₹1500; kaunsa perfume choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Bella Vita perfume in India?","branded-routing","en","Bella Vita"],["I want to smell fresh through a workday, but strong scents give people around me a headache. What kind of option should I try?","problem-first","en"]]},{"id":"oud-products","n":"Oud products","g":"Beauty & Personal Care","q":[["Under ₹2500, what oud fragrance works best for evening occasions with a warm woody profile?","category-discovery","en"],["₹2500 ke andar shaadi ya evening ke liye woody scent — kaunsa oud fragrance lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Ajmal oud fragrance at the best price in India?","branded-routing","en","Ajmal"],["I like deep woody Middle Eastern scents and want something that lasts through an evening event. What should I try?","problem-first","en"]]},{"id":"hair-styling","n":"Hair styling (women)","g":"Beauty & Personal Care","q":[["I have ₹1000 to spend on women's hair styling product for controlling frizz before parties without stiff hair; what should I shortlist?","category-discovery","en"],["humidity mein smooth styling chahiye; ₹1000 tak ka women's hair styling product suggest karo.","category-discovery","hi-en"],["I'm set on BBlunt for women's hair styling product; which site should I use to get an authentic one for less?","branded-routing","en","BBlunt"],["My hair puffs up as soon as I step outside and I hate the crunchy feel of strong hold products. What can help?","problem-first","en"]]},{"id":"skin-brightening-cream","n":"Skin brightening cream","g":"Beauty & Personal Care","q":[["Need brightening cream for uneven tone and dullness on combination skin and want to stay below ₹1000 — which options are worth it?","category-discovery","en"],["Mera budget ₹1000 hai, uneven skin tone ke liye daily option ke liye kaunsa brightening cream dekhun?","category-discovery","hi-en"],["For Olay brightening cream, should I order from the brand site or another trusted seller in India?","branded-routing","en","Olay"],["My complexion looks uneven and tired even when I sleep well. What can I use daily to make it look more even?","problem-first","en"]]},{"id":"face-masks-sheet-masks","n":"Face masks / sheet masks","g":"Beauty & Personal Care","q":[["Which sheet mask under ₹500 is good for quick hydration before an event for dehydrated skin?","category-discovery","en"],["event se pehle instant hydration ke liye ₹500 ke aas-paas koi achha sheet mask hai?","category-discovery","hi-en"],["I already want Nykaa sheet mask — where is the safest place to buy it without overpaying?","branded-routing","en","Nykaa"],["My face looks dehydrated and flat before a function tomorrow. Is there something simple I can use for a quick moisture boost?","problem-first","en"]]},{"id":"nail-care","n":"Nail care","g":"Beauty & Personal Care","q":[["₹800 budget: suggest nail-care kit that suits brittle nails and home manicure maintenance.","category-discovery","en"],["₹800 max spend karna hai — ghar pe weak nails manage karna wala nail-care kit batao.","category-discovery","hi-en"],["What's the best place online to get authentic Nykaa nail-care kit in India right now?","branded-routing","en","Nykaa"],["My nails peel at the edges and break before they grow. What can I use at home to keep them stronger and neater?","problem-first","en"]]},{"id":"men-s-sunglasses","n":"Men's sunglasses","g":"Fashion & Accessories","q":[["For driving in harsh afternoon glare with polarized lenses, what men's sunglasses can I get within ₹2000?","category-discovery","en"],["India mein ₹2000 budget mein driving ke liye polarized shades; men's sunglasses mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Vincent Chase men's sunglasses deal and tell me where I should actually buy?","branded-routing","en","Vincent Chase"],["Afternoon glare while driving strains my eyes and cheap shades distort the road. What should I look for?","problem-first","en"]]},{"id":"women-s-ethnic-wear-kurtis","n":"Women's ethnic wear / kurtis","g":"Fashion & Accessories","q":[["Looking for women's kurti around ₹2500, mainly for office wear that can also work for casual dinners; what would you pick?","category-discovery","en"],["office aur casual dono ke liye kurti ke liye women's kurti chahiye, budget roughly ₹2500 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Libas women's kurti. Which Indian store should I buy from?","branded-routing","en","Libas"],["Mujhe aisa ethnic outfit chahiye jo office mein formal lage aur dinner pe bhi boring na lage. Kya dekhun?","problem-first","en"]]},{"id":"abayas-and-modest-fashion","n":"Abayas & modest fashion","g":"Fashion & Accessories","q":[["Can you recommend abaya below ₹3000 for breathable everyday wear in hot Indian weather?","category-discovery","en"],["₹3000 tak mein abaya dekh raha/rahi hoon; focus daily wear ke liye light modest outfit pe hai.","category-discovery","hi-en"],["Where would you route me for a real Modest Essentials abaya: its own site or a marketplace?","branded-routing","en","Modest Essentials"],["I need a loose full-length outfit for hot weather that is opaque, comfortable and easy to wear every day. Where should I look?","problem-first","en"]]},{"id":"sneakers-casual-shoes","n":"Sneakers / casual shoes","g":"Fashion & Accessories","q":[["What's a reliable casual sneakers for daily walking and office-casual use with soft cushioning if my limit is ₹4000?","category-discovery","en"],["Koi casual sneakers ₹4000 se kam jo roz ke walking aur college use ke kaam aaye?","category-discovery","hi-en"],["I'm buying Puma casual sneakers; who has the best genuine listing and price in India?","branded-routing","en","Puma"],["My feet ache after a full day of walking and I still want shoes that look good with jeans. What should I choose?","problem-first","en"]]},{"id":"men-s-formal-shoes","n":"Men's formal shoes","g":"Fashion & Accessories","q":[["Help me choose men's formal shoes for long office days with a suit and occasional events; budget is ₹3500 max.","category-discovery","en"],["office mein 8 ghante comfortable formal pair sabse important hai aur budget ₹3500; kaunsa men's formal shoes choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Bata men's formal shoes in India?","branded-routing","en","Bata"],["I spend most of the day on my feet in office clothes and my current pair pinches near the toes. What would be more comfortable?","problem-first","en"]]},{"id":"handbags","n":"Handbags","g":"Fashion & Accessories","q":[["Under ₹3000, what handbag works best for daily office use with room for essentials and a small tablet?","category-discovery","en"],["₹3000 ke andar office daily use ke liye roomy bag — kaunsa handbag lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Lavie handbag at the best price in India?","branded-routing","en","Lavie"],["I carry a wallet, charger, bottle and small tablet every day but don't want a bulky tote. What type of bag would suit me?","problem-first","en"]]},{"id":"men-s-watches","n":"Men's watches","g":"Fashion & Accessories","q":[["I have ₹5000 to spend on men's watch for smart-casual office wear with an analogue look; what should I shortlist?","category-discovery","en"],["office aur weekend dono ke liye watch chahiye; ₹5000 tak ka men's watch suggest karo.","category-discovery","hi-en"],["I'm set on Titan for men's watch; which site should I use to get an authentic one for less?","branded-routing","en","Titan"],["I want one accessory that looks polished with shirts but not too dressy with jeans. What should I buy?","problem-first","en"]]},{"id":"athleisure-gym-wear","n":"Athleisure / gym wear","g":"Fashion & Accessories","q":[["Need gym wear for strength training and sweaty cardio sessions and want to stay below ₹2000 — which options are worth it?","category-discovery","en"],["Mera budget ₹2000 hai, workout ke liye sweat-friendly clothes ke liye kaunsa gym wear dekhun?","category-discovery","hi-en"],["For HRX gym wear, should I order from the brand site or another trusted seller in India?","branded-routing","en","HRX"],["My T-shirts get soaked during cardio and cling badly during lifting. What fabric and fit should I look for?","problem-first","en"]]},{"id":"innerwear-men","n":"Innerwear (men)","g":"Fashion & Accessories","q":[["Which men's innerwear under ₹1000 is good for all-day comfort in humid weather without chafing?","category-discovery","en"],["garmi mein comfortable daily wear ke liye ₹1000 ke aas-paas koi achha men's innerwear hai?","category-discovery","hi-en"],["I already want XYXX men's innerwear — where is the safest place to buy it without overpaying?","branded-routing","en","XYXX"],["I get uncomfortable and sweaty during long commutes, especially around the thighs. What can reduce rubbing and stay breathable?","problem-first","en"]]},{"id":"innerwear-women","n":"Innerwear (women)","g":"Fashion & Accessories","q":[["₹1500 budget: suggest women's lingerie that suits comfortable everyday support under office clothes.","category-discovery","en"],["₹1500 max spend karna hai — daily wear ke liye comfortable fit wala women's lingerie batao.","category-discovery","hi-en"],["What's the best place online to get authentic Zivame women's lingerie in India right now?","branded-routing","en","Zivame"],["My current bras dig into my shoulders by evening and show lines under fitted tops. What should I try instead?","problem-first","en"]]},{"id":"sarees","n":"Sarees","g":"Fashion & Accessories","q":[["For a lightweight festive look that is easy for a beginner to drape, what saree can I get within ₹3000?","category-discovery","en"],["India mein ₹3000 budget mein festival ke liye easy drape saree; saree mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Suta saree deal and tell me where I should actually buy?","branded-routing","en","Suta"],["I have to dress traditionally for a family function but I am not confident managing heavy fabric. What would be easy to wear?","problem-first","en"]]},{"id":"hijabs-and-scarves","n":"Hijabs & scarves","g":"Fashion & Accessories","q":[["Looking for hijab around ₹1200, mainly for breathable everyday styling that stays in place; what would you pick?","category-discovery","en"],["daily college wear ke liye light scarf ke liye hijab chahiye, budget roughly ₹1200 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Little Black Hijab hijab. Which Indian store should I buy from?","branded-routing","en","Little Black Hijab"],["I need a head covering that won't slip during a long college day and doesn't feel too warm. What fabric should I choose?","problem-first","en"]]},{"id":"kids-clothing","n":"Kids' clothing","g":"Fashion & Accessories","q":[["Can you recommend kids' clothes below ₹2000 for comfortable birthday outfit for a six-year-old?","category-discovery","en"],["₹2000 tak mein kids' clothes dekh raha/rahi hoon; focus 6 saal ke bacche ka party outfit pe hai.","category-discovery","hi-en"],["Where would you route me for a real Hopscotch kids' clothes: its own site or a marketplace?","branded-routing","en","Hopscotch"],["My child has a birthday party and refuses anything itchy or stiff. What kind of outfit can look festive but stay comfortable?","problem-first","en"]]},{"id":"artificial-jewelry","n":"Artificial jewelry","g":"Fashion & Accessories","q":[["What's a reliable fashion jewellery for wedding guest styling without spending on precious metal if my limit is ₹1000?","category-discovery","en"],["Koi fashion jewellery ₹1000 se kam jo shaadi ke liye budget jewellery ke kaam aaye?","category-discovery","hi-en"],["I'm buying Yellow Chimes fashion jewellery; who has the best genuine listing and price in India?","branded-routing","en","Yellow Chimes"],["I need statement pieces for a wedding next week but don't want to spend on gold or silver. What should I consider?","problem-first","en"]]},{"id":"gold-plated-demi-fine-jewelry","n":"Gold-plated / demi-fine jewelry","g":"Fashion & Accessories","q":[["Help me choose gold-plated jewellery for everyday office pieces that look refined and resist quick tarnish; budget is ₹3000 max.","category-discovery","en"],["daily office ke liye subtle jewellery sabse important hai aur budget ₹3000; kaunsa gold-plated jewellery choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Palmonas gold-plated jewellery in India?","branded-routing","en","Palmonas"],["I want delicate pieces that look premium with workwear but won't lose their finish after a few wears. What should I buy?","problem-first","en"]]},{"id":"protein-powder-whey","n":"Protein powder / whey","g":"Food & Beverage","q":[["Under ₹2500, what whey protein works best for post-workout protein for a beginner doing strength training?","category-discovery","en"],["₹2500 ke andar gym shuru kiya hai protein ka simple option — kaunsa whey protein lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine MuscleBlaze whey protein at the best price in India?","branded-routing","en","MuscleBlaze"],["I recently started lifting and struggle to hit my daily protein target through meals. What is a convenient option?","problem-first","en"]]},{"id":"healthy-snacks-makhana","n":"Healthy snacks / makhana","g":"Food & Beverage","q":[["I have ₹500 to spend on makhana snacks for evening snacking with lower oil and controlled portions; what should I shortlist?","category-discovery","en"],["chai ke saath healthy crunchy snack chahiye; ₹500 tak ka makhana snacks suggest karo.","category-discovery","hi-en"],["I'm set on Farmley for makhana snacks; which site should I use to get an authentic one for less?","branded-routing","en","Farmley"],["I get hungry around 5 pm and end up eating chips every day. What crunchy alternative can I keep at my desk?","problem-first","en"]]},{"id":"coffee","n":"Coffee (specialty / instant)","g":"Food & Beverage","q":[["Need coffee for strong morning brew at home without an espresso machine and want to stay below ₹800 — which options are worth it?","category-discovery","en"],["Mera budget ₹800 hai, ghar pe cafe jaisa coffee taste ke liye kaunsa coffee dekhun?","category-discovery","hi-en"],["For Sleepy Owl coffee, should I order from the brand site or another trusted seller in India?","branded-routing","en","Sleepy Owl"],["I want café-style flavour in the morning but only have a basic kettle and mug. What can I make easily?","problem-first","en"]]},{"id":"green-tea-wellness-tea","n":"Green tea / wellness tea","g":"Food & Beverage","q":[["Which green tea under ₹600 is good for a light unsweetened drink for afternoon office breaks?","category-discovery","en"],["office mein chai kam karne ka option ke liye ₹600 ke aas-paas koi achha green tea hai?","category-discovery","hi-en"],["I already want Organic India green tea — where is the safest place to buy it without overpaying?","branded-routing","en","Organic India"],["I drink too many sugary cups at work and want a lighter hot drink for the afternoon. What should I switch to?","problem-first","en"]]},{"id":"dry-fruits-and-nuts","n":"Dry fruits & nuts","g":"Food & Beverage","q":[["₹1000 budget: suggest dry fruits that suits daily family snacking with almonds, cashews and raisins.","category-discovery","en"],["₹1000 max spend karna hai — ghar ke liye mixed nuts value pack wala dry fruits batao.","category-discovery","hi-en"],["What's the best place online to get authentic Happilo dry fruits in India right now?","branded-routing","en","Happilo"],["Instead of biscuits, I want something shelf-stable the whole family can nibble in small portions. What would work?","problem-first","en"]]},{"id":"dates","n":"Dates","g":"Food & Beverage","q":[["For Ramadan and everyday snacking with soft texture, what dates can I get within ₹800?","category-discovery","en"],["India mein ₹800 budget mein iftar ke liye soft khajoor; dates mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Happilo dates deal and tell me where I should actually buy?","branded-routing","en","Happilo"],["I want naturally sweet bites for iftar that are soft, not overly dry, and easy for elders to eat. What should I look for?","problem-first","en"]]},{"id":"honey","n":"Honey (raw / organic)","g":"Food & Beverage","q":[["Looking for raw honey around ₹700, mainly for morning use in tea and toast with reliable quality; what would you pick?","category-discovery","en"],["chai aur breakfast ke liye asli shahad ke liye raw honey chahiye, budget roughly ₹700 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Dabur raw honey. Which Indian store should I buy from?","branded-routing","en","Dabur"],["Breakfast needs a natural sweetener, but adulteration worries me. How can I choose a trustworthy option?","problem-first","en"]]},{"id":"ghee","n":"Ghee (A2 / organic)","g":"Food & Beverage","q":[["Can you recommend A2 ghee below ₹1500 for daily home cooking in small quantities with strong aroma?","category-discovery","en"],["₹1500 tak mein A2 ghee dekh raha/rahi hoon; focus ghar ke tadke ke liye achha ghee pe hai.","category-discovery","hi-en"],["Where would you route me for a real Two Brothers Organic Farms A2 ghee: its own site or a marketplace?","branded-routing","en","Two Brothers Organic Farms"],["I use a spoonful for dal and rotis and want a rich traditional aroma without buying a huge tin. What should I try?","problem-first","en"]]},{"id":"spices-and-masalas","n":"Spices & masalas","g":"Food & Beverage","q":[["What's a reliable masala for quick weekday Indian cooking with consistent flavour if my limit is ₹500?","category-discovery","en"],["Koi masala ₹500 se kam jo roz ki sabzi ke liye masala combo ke kaam aaye?","category-discovery","hi-en"],["I'm buying Tata Sampann masala; who has the best genuine listing and price in India?","branded-routing","en","Tata Sampann"],["I cook after work and want reliable flavour without measuring five different powders every night. What can simplify this?","problem-first","en"]]},{"id":"breakfast-cereals-muesli","n":"Breakfast cereals / muesli","g":"Food & Beverage","q":[["Help me choose muesli for quick breakfast with milk before an early commute; budget is ₹600 max.","category-discovery","en"],["subah jaldi breakfast ka easy option sabse important hai aur budget ₹600; kaunsa muesli choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Yoga Bar muesli in India?","branded-routing","en","Yoga Bar"],["I leave home early and skip breakfast because cooking takes too long. What can I keep ready for a filling bowl in minutes?","problem-first","en"]]},{"id":"peanut-butter","n":"Peanut butter","g":"Food & Beverage","q":[["Under ₹500, what peanut butter works best for high-protein toast and smoothies without excessive sugar?","category-discovery","en"],["₹500 ke andar gym ke baad toast ke liye peanut butter — kaunsa peanut butter lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Pintola peanut butter at the best price in India?","branded-routing","en","Pintola"],["I want an easy spread for toast that adds protein but isn't loaded with sweetness. What should I check on the label?","problem-first","en"]]},{"id":"millet-products","n":"Millet products","g":"Food & Beverage","q":[["I have ₹600 to spend on millet snack for school tiffin and evening snacking with familiar Indian flavours; what should I shortlist?","category-discovery","en"],["bacche ke tiffin mein millet wala snack chahiye; ₹600 tak ka millet snack suggest karo.","category-discovery","hi-en"],["I'm set on Slurrp Farm for millet snack; which site should I use to get an authentic one for less?","branded-routing","en","Slurrp Farm"],["My child's snack box has too much refined flour, but they reject anything that tastes too 'healthy'. What are some better options?","problem-first","en"]]},{"id":"cold-pressed-oils","n":"Cold-pressed oils","g":"Food & Beverage","q":[["Need cold-pressed cooking oil for everyday Indian cooking with a traditional extraction method and want to stay below ₹1000 — which options are worth it?","category-discovery","en"],["Mera budget ₹1000 hai, ghar ke cooking ke liye cold pressed tel ke liye kaunsa cold-pressed cooking oil dekhun?","category-discovery","hi-en"],["For Anveshan cold-pressed cooking oil, should I order from the brand site or another trusted seller in India?","branded-routing","en","Anveshan"],["For everyday tadka and sautéing, I want to move away from heavily refined cooking fat without making meals impractical. What should I try?","problem-first","en"]]},{"id":"chocolates","n":"Chocolates (artisanal)","g":"Food & Beverage","q":[["Which artisanal chocolate under ₹1200 is good for premium gifting for a birthday without a huge hamper?","category-discovery","en"],["birthday gift ke liye premium chocolate ke liye ₹1200 ke aas-paas koi achha artisanal chocolate hai?","category-discovery","hi-en"],["I already want SMOOR artisanal chocolate — where is the safest place to buy it without overpaying?","branded-routing","en","SMOOR"],["I need a small but impressive edible gift for someone who likes rich desserts. What can I order?","problem-first","en"]]},{"id":"energy-drinks","n":"Energy drinks","g":"Food & Beverage","q":[["₹700 budget: suggest energy drink pack that suits occasional late-night work sessions in a small pack.","category-discovery","en"],["₹700 max spend karna hai — late shift ke liye energy drink pack wala energy drink pack batao.","category-discovery","hi-en"],["What's the best place online to get authentic Red Bull energy drink pack in India right now?","branded-routing","en","Red Bull"],["I sometimes need a quick pick-me-up during late shifts but don't want a large case sitting at home. What pack size makes sense?","problem-first","en"]]},{"id":"multivitamins","n":"Multivitamins","g":"Health & Wellness","q":[["For daily nutrition support for a busy adult with an inconsistent diet, what multivitamin can I get within ₹1000?","category-discovery","en"],["India mein ₹1000 budget mein busy routine mein daily vitamin support; multivitamin mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine HK Vitals multivitamin deal and tell me where I should actually buy?","branded-routing","en","HK Vitals"],["My meals are irregular because of work and I worry I'm missing basic nutrients. What kind of daily support is reasonable?","problem-first","en"]]},{"id":"ayurvedic-supplements","n":"Ayurvedic supplements","g":"Health & Wellness","q":[["Looking for ayurvedic supplement around ₹700, mainly for general wellness from a familiar Indian brand without complex dosing; what would you pick?","category-discovery","en"],["simple ayurvedic wellness option ke liye ayurvedic supplement chahiye, budget roughly ₹700 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Himalaya ayurvedic supplement. Which Indian store should I buy from?","branded-routing","en","Himalaya"],["I prefer traditional Indian wellness products but don't want a complicated routine with many powders and pills. What is easy to start with?","problem-first","en"]]},{"id":"sleep-aids-melatonin","n":"Sleep aids / melatonin","g":"Health & Wellness","q":[["Can you recommend melatonin supplement below ₹1500 for occasional jet lag and trouble falling asleep after travel?","category-discovery","en"],["₹1500 tak mein melatonin supplement dekh raha/rahi hoon; focus travel ke baad sleep cycle set karna pe hai.","category-discovery","hi-en"],["Where would you route me for a real Wellbeing Nutrition melatonin supplement: its own site or a marketplace?","branded-routing","en","Wellbeing Nutrition"],["After late flights my body clock stays off for days and I lie awake even when I'm tired. What can help me reset?","problem-first","en"]]},{"id":"hair-growth-supplements","n":"Hair growth supplements","g":"Health & Wellness","q":[["What's a reliable hair-growth supplement for adult men noticing increased shedding and wanting a convenient daily format if my limit is ₹1200?","category-discovery","en"],["Koi hair-growth supplement ₹1200 se kam jo hair fall ke liye daily supplement ke kaam aaye?","category-discovery","hi-en"],["I'm buying Man Matters hair-growth supplement; who has the best genuine listing and price in India?","branded-routing","en","Man Matters"],["I'm seeing more strands on my pillow and in the shower than before. Is there a convenient daily option worth considering?","problem-first","en"]]},{"id":"omega-3-fish-oil","n":"Omega-3 / fish oil","g":"Health & Wellness","q":[["Help me choose omega-3 capsules for daily fish-oil supplementation with easy-to-swallow capsules; budget is ₹1200 max.","category-discovery","en"],["fish oil capsule ka reliable option sabse important hai aur budget ₹1200; kaunsa omega-3 capsules choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering TrueBasics omega-3 capsules in India?","branded-routing","en","TrueBasics"],["I rarely eat fatty fish and want a simple way to add those nutrients without a strong fishy aftertaste. What should I choose?","problem-first","en"]]},{"id":"apple-cider-vinegar","n":"Apple cider vinegar","g":"Health & Wellness","q":[["Under ₹800, what apple cider vinegar works best for diluting in water as part of a simple morning routine?","category-discovery","en"],["₹800 ke andar morning routine ke liye ACV — kaunsa apple cider vinegar lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Kapiva apple cider vinegar at the best price in India?","branded-routing","en","Kapiva"],["I want a tangy vinegar drink I can dilute at home, but I don't want anything harsh or overly processed. What should I look for?","problem-first","en"]]},{"id":"diabetic-care-foods","n":"Diabetic care foods","g":"Health & Wellness","q":[["I have ₹1000 to spend on diabetic-friendly snack for tea-time snacking with lower sugar for a diabetic household; what should I shortlist?","category-discovery","en"],["sugar control wale ghar ke liye snack chahiye; ₹1000 tak ka diabetic-friendly snack suggest karo.","category-discovery","hi-en"],["I'm set on Diabexy for diabetic-friendly snack; which site should I use to get an authentic one for less?","branded-routing","en","Diabexy"],["Someone at home needs to watch blood sugar but still wants something crunchy with evening tea. What are sensible options?","problem-first","en"]]},{"id":"immunity-boosters","n":"Immunity boosters","g":"Health & Wellness","q":[["Need immunity tonic for seasonal family use during monsoon with familiar ingredients and want to stay below ₹600 — which options are worth it?","category-discovery","en"],["Mera budget ₹600 hai, monsoon mein family wellness ke liye ke liye kaunsa immunity tonic dekhun?","category-discovery","hi-en"],["For Dabur immunity tonic, should I order from the brand site or another trusted seller in India?","branded-routing","en","Dabur"],["Every monsoon someone at home catches a cold and we want a simple traditional product for the family routine. What can we consider?","problem-first","en"]]},{"id":"period-care-menstrual-cups","n":"Period care / menstrual cups","g":"Health & Wellness","q":[["Which menstrual cup under ₹1000 is good for first-time use with clear sizing guidance and a soft material?","category-discovery","en"],["pehli baar cup try karna hai size kaise choose karun ke liye ₹1000 ke aas-paas koi achha menstrual cup hai?","category-discovery","hi-en"],["I already want Sirona menstrual cup — where is the safest place to buy it without overpaying?","branded-routing","en","Sirona"],["Pads feel uncomfortable during long workdays and I want a reusable option, but sizing and insertion make me nervous. What should I start with?","problem-first","en"]]},{"id":"pain-relief","n":"Pain relief (topical)","g":"Health & Wellness","q":[["₹500 budget: suggest pain-relief gel that suits muscle soreness after gym and occasional back strain.","category-discovery","en"],["₹500 max spend karna hai — gym ke baad muscle pain ke liye gel wala pain-relief gel batao.","category-discovery","hi-en"],["What's the best place online to get authentic Volini pain-relief gel in India right now?","branded-routing","en","Volini"],["My shoulders and lower back ache after workouts and long laptop sessions. What can I keep at home for quick local relief?","problem-first","en"]]},{"id":"baby-skincare","n":"Baby skincare","g":"Baby & Kids","q":[["For newborn bath and moisturising routine for sensitive skin, what baby skincare set can I get within ₹800?","category-discovery","en"],["India mein ₹800 budget mein baby ke sensitive skin ke liye gentle routine; baby skincare set mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Mamaearth baby skincare set deal and tell me where I should actually buy?","branded-routing","en","Mamaearth"],["My baby's skin gets dry after baths and I want a very simple routine with gentle products. What should I use?","problem-first","en"]]},{"id":"diapers","n":"Diapers","g":"Baby & Kids","q":[["Looking for diapers around ₹1200, mainly for overnight use for a toddler with fewer leaks; what would you pick?","category-discovery","en"],["raat bhar leak na ho toddler ke liye ke liye diapers chahiye, budget roughly ₹1200 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Pampers diapers. Which Indian store should I buy from?","branded-routing","en","Pampers"],["My toddler wakes up with wet clothes even after a late-night change. What should I try for better overnight protection?","problem-first","en"]]},{"id":"baby-food","n":"Baby food","g":"Baby & Kids","q":[["Can you recommend baby cereal below ₹800 for easy breakfast for an eight-month-old starting solids?","category-discovery","en"],["₹800 tak mein baby cereal dekh raha/rahi hoon; focus 8 month baby ke solids ka easy option pe hai.","category-discovery","hi-en"],["Where would you route me for a real Cerelac baby cereal: its own site or a marketplace?","branded-routing","en","Cerelac"],["My eight-month-old has started solids and I need something quick for busy mornings with an age-appropriate texture. What can I consider?","problem-first","en"]]},{"id":"kids-toys","n":"Kids' toys (educational)","g":"Baby & Kids","q":[["What's a reliable educational toy for screen-free STEM play for an eight-year-old if my limit is ₹2000?","category-discovery","en"],["Koi educational toy ₹2000 se kam jo 8 saal ke bacche ke liye screen-free learning toy ke kaam aaye?","category-discovery","hi-en"],["I'm buying Smartivity educational toy; who has the best genuine listing and price in India?","branded-routing","en","Smartivity"],["My child gets bored with worksheets but loves building things with their hands. What gift can keep them learning without a screen?","problem-first","en"]]},{"id":"school-bags","n":"School bags","g":"Baby & Kids","q":[["Help me choose school bag for daily primary-school use with padded straps and bottle pockets; budget is ₹2000 max.","category-discovery","en"],["class 1 ke bacche ke liye light school bag sabse important hai aur budget ₹2000; kaunsa school bag choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Skybags school bag in India?","branded-routing","en","Skybags"],["My child complains that the bag hurts their shoulders and the water bottle keeps falling out. What features should I prioritise?","problem-first","en"]]},{"id":"baby-carriers","n":"Baby carriers","g":"Baby & Kids","q":[["Under ₹3000, what baby carrier works best for hands-free walks with a six-month-old and good back support?","category-discovery","en"],["₹3000 ke andar 6 month baby ke saath walk ke liye carrier — kaunsa baby carrier lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine R for Rabbit baby carrier at the best price in India?","branded-routing","en","R for Rabbit"],["I want both hands free on short walks, but carrying my baby for long hurts my back. What design would be comfortable for both of us?","problem-first","en"]]},{"id":"kids-nutrition-drinks","n":"Kids' nutrition drinks","g":"Baby & Kids","q":[["I have ₹1000 to spend on kids' nutrition drink for school-age child who is a picky eater and needs an easy milk mix; what should I shortlist?","category-discovery","en"],["picky eater bacche ke milk mein kya add karun chahiye; ₹1000 tak ka kids' nutrition drink suggest karo.","category-discovery","hi-en"],["I'm set on Horlicks for kids' nutrition drink; which site should I use to get an authentic one for less?","branded-routing","en","Horlicks"],["My child is fussy with meals and often leaves breakfast unfinished. Is there an easy drink option I can discuss with the family?","problem-first","en"]]},{"id":"bedsheets-bedding","n":"Bedsheets / bedding","g":"Home & Living","q":[["Need bedsheet set for king-size bed with breathable cotton for hot nights and want to stay below ₹2500 — which options are worth it?","category-discovery","en"],["Mera budget ₹2500 hai, garmi mein cotton bedsheet king size ke liye kaunsa bedsheet set dekhun?","category-discovery","hi-en"],["For Wakefit bedsheet set, should I order from the brand site or another trusted seller in India?","branded-routing","en","Wakefit"],["My bedroom gets warm at night and synthetic fabric feels sweaty. What material would sleep cooler?","problem-first","en"]]},{"id":"cookware","n":"Cookware (non-toxic / cast iron)","g":"Home & Living","q":[["Which cast-iron cookware under ₹4000 is good for daily Indian cooking on gas with a naturally seasoned surface?","category-discovery","en"],["gas stove ke liye cast iron kadai ke liye ₹4000 ke aas-paas koi achha cast-iron cookware hai?","category-discovery","hi-en"],["I already want The Indus Valley cast-iron cookware — where is the safest place to buy it without overpaying?","branded-routing","en","The Indus Valley"],["I want to move away from scratched non-stick pans and need something durable for sabzi and frying. What should I get?","problem-first","en"]]},{"id":"home-fragrance-candles","n":"Home fragrance / candles","g":"Home & Living","q":[["₹1200 budget: suggest scented candle that suits relaxing bedroom fragrance that is not too sweet.","category-discovery","en"],["₹1200 max spend karna hai — bedroom ke liye mild fragrance candle wala scented candle batao.","category-discovery","hi-en"],["What's the best place online to get authentic EKAM scented candle in India right now?","branded-routing","en","EKAM"],["I want my room to smell calm in the evening, but sugary scents make me feel nauseous. What fragrance style should I try?","problem-first","en"]]},{"id":"wall-decor","n":"Wall decor","g":"Home & Living","q":[["For brightening a rental living room without major renovation, what wall decor can I get within ₹3000?","category-discovery","en"],["India mein ₹3000 budget mein rented flat ki wall ko stylish banana; wall decor mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Chumbak wall decor deal and tell me where I should actually buy?","branded-routing","en","Chumbak"],["My living room feels blank but I can't paint or drill much because it's a rental. What can make the wall look finished?","problem-first","en"]]},{"id":"storage-and-organizers","n":"Storage & organizers","g":"Home & Living","q":[["Looking for storage organizer around ₹2000, mainly for small apartment wardrobe and under-bed decluttering; what would you pick?","category-discovery","en"],["chhote flat mein storage ka jugaad ke liye storage organizer chahiye, budget roughly ₹2000 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want IKEA storage organizer. Which Indian store should I buy from?","branded-routing","en","IKEA"],["My cupboards are full but half the space is wasted because small items are piled on top of each other. What can help organise them?","problem-first","en"]]},{"id":"water-bottles-flasks","n":"Water bottles / flasks","g":"Home & Living","q":[["Can you recommend insulated flask below ₹1500 for keeping water cold through an office day and commute?","category-discovery","en"],["₹1500 tak mein insulated flask dekh raha/rahi hoon; focus office mein poore din thanda paani pe hai.","category-discovery","hi-en"],["Where would you route me for a real Milton insulated flask: its own site or a marketplace?","branded-routing","en","Milton"],["My water turns warm by lunchtime during the commute. What bottle can keep it cool for most of the day?","problem-first","en"]]},{"id":"air-purifiers","n":"Air purifiers","g":"Home & Living","q":[["What's a reliable air purifier for bedroom use during Delhi pollution season with low night noise if my limit is ₹15000?","category-discovery","en"],["Koi air purifier ₹15000 se kam jo Delhi pollution mein bedroom purifier ke kaam aaye?","category-discovery","hi-en"],["I'm buying Coway air purifier; who has the best genuine listing and price in India?","branded-routing","en","Coway"],["AQI gets terrible in winter and I need cleaner air in the bedroom without a loud machine running all night. What should I buy?","problem-first","en"]]},{"id":"mattresses","n":"Mattresses","g":"Home & Living","q":[["Help me choose mattress for medium-firm support for a couple with occasional back stiffness; budget is ₹15000 max.","category-discovery","en"],["back pain ke liye medium firm mattress sabse important hai aur budget ₹15000; kaunsa mattress choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Wakefit mattress in India?","branded-routing","en","Wakefit"],["We wake up stiff on our old bed and want something supportive without feeling rock hard. What firmness and type should we consider?","problem-first","en"]]},{"id":"curtains","n":"Curtains","g":"Home & Living","q":[["Under ₹5000, what curtains works best for blocking harsh afternoon sun in a west-facing bedroom?","category-discovery","en"],["₹5000 ke andar afternoon sun rokne ke liye blackout curtains — kaunsa curtains lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine D'Decor curtains at the best price in India?","branded-routing","en","D'Decor"],["My bedroom heats up badly after 2 pm and light still comes through the current fabric. What should I replace it with?","problem-first","en"]]},{"id":"prayer-mats","n":"Prayer mats","g":"Home & Living","q":[["I have ₹1500 to spend on prayer mat for comfortable daily use with soft cushioning and easy storage; what should I shortlist?","category-discovery","en"],["daily namaz ke liye soft mat chahiye; ₹1500 tak ka prayer mat suggest karo.","category-discovery","hi-en"],["I'm set on Modest Essentials for prayer mat; which site should I use to get an authentic one for less?","branded-routing","en","Modest Essentials"],["I need a clean, comfortable surface for daily prayer that folds easily and doesn't feel too thin on hard flooring. Where can I find one?","problem-first","en"]]},{"id":"kitchen-appliances","n":"Kitchen appliances (small)","g":"Home & Living","q":[["Need mixer grinder for daily chutney, masala and smoothie prep in a small kitchen and want to stay below ₹5000 — which options are worth it?","category-discovery","en"],["Mera budget ₹5000 hai, chutney aur masala ke liye mixer ke liye kaunsa mixer grinder dekhun?","category-discovery","hi-en"],["For Prestige mixer grinder, should I order from the brand site or another trusted seller in India?","branded-routing","en","Prestige"],["I make chutneys and spice pastes often, but my current machine overheats and takes too much counter space. What should I replace it with?","problem-first","en"]]},{"id":"plants-gardening-kits","n":"Plants / gardening kits","g":"Home & Living","q":[["Which gardening kit under ₹1500 is good for beginner balcony herb growing with compact tools?","category-discovery","en"],["balcony mein herbs start karne ka kit ke liye ₹1500 ke aas-paas koi achha gardening kit hai?","category-discovery","hi-en"],["I already want Ugaoo gardening kit — where is the safest place to buy it without overpaying?","branded-routing","en","Ugaoo"],["I have a sunny balcony and want to start growing mint and coriander, but I own no tools or pots. What basic setup do I need?","problem-first","en"]]},{"id":"tws-earbuds","n":"TWS earbuds","g":"Electronics & Accessories","q":[["best TWS earbuds under ₹2000 India","category-discovery","en"],["I want to buy boAt Airdopes, where should I get them at the best price","branded-routing","en"]],"s":[{"i":0,"e":"claude","d":"2026-08-18","r":[["Realme","Realme Buds T200 / T310","Most consistently top-ranked across review sites: Hi-Res audio, 32-46dB ANC, strong battery, best all-round value","marketplace","flipkart.com"],["OnePlus","Nord Buds 3r","Best call quality in segment with clear mics and strong bass; trusted brand","marketplace","amazon.in"],["boAt","Nirvana Ion / Airdopes Prime 701 ANC","Best battery (up to 120H) and highest ANC rating (46dB) in the price band; India's biggest audio brand","brand-direct","boat-lifestyle.com"],["CMF by Nothing","CMF Buds 2a","42dB ANC with Dirac-tuned drivers and app EQ support at ₹1,899","marketplace","flipkart.com"],["GoBoult","Boult Mustang Torq / Z40","Gaming-focused low latency and up to 100H playback; aggressive D2C pricing","brand-direct","goboult.co.in"]],"src":["vijaysales.com","mivi.in","desidime.com","91mobiles.com","mymobileindia.com","smartprix.com","ezpicks.in","digit.in","croma.com","gadgetra360.com","goboult.co.in","apesaudio.com","techradar.com","mobile-accessories.in","sellingbazaar.com"]},{"i":1,"e":"claude","d":"2026-08-18","r":[["boAt (official store)","boat-lifestyle.com daily deals","Brand's own site showed the deepest cuts (e.g. Airdopes 181 Pro ₹1,399 vs ₹4,990 MRP) plus freebies like Spotify offers","brand-direct","boat-lifestyle.com"],["Flipkart","boAt Airdopes range from ₹799","Widest selection and dominant in search results; sale events (Big Billion Days, Winter Bonanza) push prices lowest","marketplace","flipkart.com"],["Amazon India","boAt Airdopes range","Competitive during Great Indian Festival with bank-card instant discounts and exchange offers","marketplace","amazon.in"],["Croma","boAt TWS under ₹2000 collection","Online plus offline pickup; curated budget TWS storefront","marketplace","croma.com"],["Myntra","boAt Airdopes deals","Occasional fashion-sale-tied discounts on popular models like Airdopes 170","marketplace","myntra.com"]],"src":["flipkart.com","boat-lifestyle.com","timesbull.com","buyhatke.com"]}]},{"id":"smartwatches","n":"Smartwatches","g":"Electronics & Accessories","q":[["For fitness tracking, notifications and week-long battery for Android, what smartwatch can I get within ₹5000?","category-discovery","en"],["India mein ₹5000 budget mein Android phone ke saath fitness watch; smartwatch mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Noise smartwatch deal and tell me where I should actually buy?","branded-routing","en","Noise"],["I want steps, workouts and notifications on my wrist but I don't want to charge another device every night. What should I choose?","problem-first","en"]]},{"id":"phone-cases","n":"Phone cases","g":"Electronics & Accessories","q":[["Looking for phone case around ₹1000, mainly for drop protection for an iPhone without making it bulky; what would you pick?","category-discovery","en"],["phone girta rehta hai slim protective cover ke liye phone case chahiye, budget roughly ₹1000 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want DailyObjects phone case. Which Indian store should I buy from?","branded-routing","en","DailyObjects"],["I keep dropping my phone but hate thick covers that make it hard to fit in a pocket. What kind of protection should I get?","problem-first","en"]]},{"id":"power-banks","n":"Power banks","g":"Electronics & Accessories","q":[["Can you recommend power bank below ₹2000 for two phone charges during travel with fast charging?","category-discovery","en"],["₹2000 tak mein power bank dekh raha/rahi hoon; focus travel mein phone do baar charge karna pe hai.","category-discovery","hi-en"],["Where would you route me for a real Ambrane power bank: its own site or a marketplace?","branded-routing","en","Ambrane"],["My battery dies on long train journeys and sockets aren't always available. What portable backup should I carry?","problem-first","en"]]},{"id":"mobile-chargers-cables","n":"Mobile chargers / cables","g":"Electronics & Accessories","q":[["What's a reliable fast charger for charging an Android phone and earbuds from one compact adapter if my limit is ₹1500?","category-discovery","en"],["Koi fast charger ₹1500 se kam jo Android aur earbuds ke liye fast charger ke kaam aaye?","category-discovery","hi-en"],["I'm buying Portronics fast charger; who has the best genuine listing and price in India?","branded-routing","en","Portronics"],["I carry separate adapters for my phone and small gadgets and want one compact unit in my bag. What should I buy?","problem-first","en"]]},{"id":"bluetooth-speakers","n":"Bluetooth speakers","g":"Electronics & Accessories","q":[["Help me choose Bluetooth speaker for small house parties with clear sound and splash resistance; budget is ₹5000 max.","category-discovery","en"],["ghar ki party ke liye portable speaker sabse important hai aur budget ₹5000; kaunsa Bluetooth speaker choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering JBL Bluetooth speaker in India?","branded-routing","en","JBL"],["I want music loud enough for a living-room get-together and something I won't panic about near drinks. What should I pick?","problem-first","en"]]},{"id":"laptop-bags-and-sleeves","n":"Laptop bags & sleeves","g":"Electronics & Accessories","q":[["Under ₹2500, what laptop sleeve works best for protecting a 14-inch laptop inside a backpack during commute?","category-discovery","en"],["₹2500 ke andar 14 inch laptop ke liye padded sleeve — kaunsa laptop sleeve lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine DailyObjects laptop sleeve at the best price in India?","branded-routing","en","DailyObjects"],["My laptop goes inside a crowded backpack with chargers and a bottle. What can protect it from scratches and bumps without adding much weight?","problem-first","en"]]},{"id":"gaming-accessories","n":"Gaming accessories","g":"Electronics & Accessories","q":[["I have ₹3000 to spend on gaming accessories for starting a PC gaming setup with a keyboard and mouse; what should I shortlist?","category-discovery","en"],["budget PC gaming setup ke accessories chahiye; ₹3000 tak ka gaming accessories suggest karo.","category-discovery","hi-en"],["I'm set on Cosmic Byte for gaming accessories; which site should I use to get an authentic one for less?","branded-routing","en","Cosmic Byte"],["I'm building my first desk setup and want responsive controls without spending enthusiast-level money. What should I buy first?","problem-first","en"]]},{"id":"smart-home-devices","n":"Smart home devices","g":"Electronics & Accessories","q":[["Need smart home device for automating bedroom lights and a fan from phone or voice and want to stay below ₹5000 — which options are worth it?","category-discovery","en"],["Mera budget ₹5000 hai, bedroom lights ko phone se control karna ke liye kaunsa smart home device dekhun?","category-discovery","hi-en"],["For Wipro smart home device, should I order from the brand site or another trusted seller in India?","branded-routing","en","Wipro"],["I keep forgetting to switch things off before bed and want simple phone or voice control without rewiring the room. What should I start with?","problem-first","en"]]},{"id":"yoga-mats","n":"Yoga mats","g":"Fitness & Sports","q":[["Which yoga mat under ₹1500 is good for home yoga on tile floors with enough grip and cushioning?","category-discovery","en"],["ghar ke tile floor pe yoga mat ke liye ₹1500 ke aas-paas koi achha yoga mat hai?","category-discovery","hi-en"],["I already want Boldfit yoga mat — where is the safest place to buy it without overpaying?","branded-routing","en","Boldfit"],["My hands slip during downward dog and my knees hurt on the floor. What thickness and material should I choose?","problem-first","en"]]},{"id":"home-gym-equipment","n":"Home gym equipment","g":"Fitness & Sports","q":[["₹10000 budget: suggest home gym equipment that suits strength training in a small apartment with adjustable weights.","category-discovery","en"],["₹10000 max spend karna hai — small flat mein strength workout setup wala home gym equipment batao.","category-discovery","hi-en"],["What's the best place online to get authentic Cultsport home gym equipment in India right now?","branded-routing","en","Cultsport"],["I want to stop missing workouts but only have a corner of the bedroom free. What compact setup can cover basic strength exercises?","problem-first","en"]]},{"id":"cricket-gear","n":"Cricket gear","g":"Fitness & Sports","q":[["For weekend leather-ball practice for an adult beginner, what cricket kit can I get within ₹5000?","category-discovery","en"],["India mein ₹5000 budget mein weekend cricket ke liye beginner kit; cricket kit mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine SG cricket kit deal and tell me where I should actually buy?","branded-routing","en","SG"],["I've joined weekend net practice and currently borrow everything. What basic gear should I buy first without going overboard?","problem-first","en"]]},{"id":"cycling-accessories","n":"Cycling accessories","g":"Fitness & Sports","q":[["Looking for cycling accessories around ₹3000, mainly for safer city rides with lights, helmet and basic repair items; what would you pick?","category-discovery","en"],["city cycling ke liye safety accessories ke liye cycling accessories chahiye, budget roughly ₹3000 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Decathlon cycling accessories. Which Indian store should I buy from?","branded-routing","en","Decathlon"],["I have started riding early mornings in traffic and realise I don't have lights or anything for a puncture. What essentials should I carry?","problem-first","en"]]},{"id":"running-gear","n":"Running gear","g":"Fitness & Sports","q":[["Can you recommend running gear below ₹5000 for beginner 5K training in hot weather with comfortable shoes and clothing?","category-discovery","en"],["₹5000 tak mein running gear dekh raha/rahi hoon; focus 5K training start karna hai basic gear pe hai.","category-discovery","hi-en"],["Where would you route me for a real Decathlon running gear: its own site or a marketplace?","branded-routing","en","Decathlon"],["I'm training for my first 5K and my regular sneakers make my feet sore after 3 km. What should I upgrade first?","problem-first","en"]]},{"id":"sports-nutrition","n":"Sports nutrition","g":"Fitness & Sports","q":[["What's a reliable sports nutrition for recovering after strength workouts with convenient protein and electrolytes if my limit is ₹2500?","category-discovery","en"],["Koi sports nutrition ₹2500 se kam jo workout recovery ke liye nutrition ke kaam aaye?","category-discovery","hi-en"],["I'm buying MuscleBlaze sports nutrition; who has the best genuine listing and price in India?","branded-routing","en","MuscleBlaze"],["I train four evenings a week and feel drained afterward, especially on hot days. What simple recovery products are worth considering?","problem-first","en"]]},{"id":"pet-food-dogs","n":"Pet food (dogs)","g":"Pets","q":[["Help me choose dog food for monthly dry food for an adult medium-size dog; budget is ₹2500 max.","category-discovery","en"],["adult dog ke liye monthly food pack sabse important hai aur budget ₹2500; kaunsa dog food choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Pedigree dog food in India?","branded-routing","en","Pedigree"],["My adult dog is active but picky and I need a practical everyday diet that is easy to store. What should I compare?","problem-first","en"]]},{"id":"pet-food-cats","n":"Pet food (cats)","g":"Pets","q":[["Under ₹2500, what cat food works best for daily meals for an indoor adult cat with wet and dry options?","category-discovery","en"],["₹2500 ke andar indoor cat ke liye daily food — kaunsa cat food lena sahi rahega?","category-discovery","hi-en"],["Where can I buy genuine Whiskas cat food at the best price in India?","branded-routing","en","Whiskas"],["My indoor cat gets bored of the same meal and sometimes leaves the bowl untouched. How can I choose a practical mix of textures?","problem-first","en"]]},{"id":"pet-grooming","n":"Pet grooming","g":"Pets","q":[["I have ₹1500 to spend on pet grooming kit for at-home brushing and nail care for a long-haired dog; what should I shortlist?","category-discovery","en"],["long hair dog ki home grooming chahiye; ₹1500 tak ka pet grooming kit suggest karo.","category-discovery","hi-en"],["I'm set on Heads Up For Tails for pet grooming kit; which site should I use to get an authentic one for less?","branded-routing","en","Heads Up For Tails"],["My dog's coat tangles between salon visits and the nails grow quickly. What basic tools should I keep at home?","problem-first","en"]]},{"id":"fragrance-free-sensitive-skincare","n":"Fragrance-free / sensitive skincare","g":"Other high-velocity D2C","q":[["Need sensitive-skin skincare for fragrance-free daily cleansing and moisturising for reactive skin and want to stay below ₹1000 — which options are worth it?","category-discovery","en"],["Mera budget ₹1000 hai, sensitive skin ke liye fragrance-free routine ke liye kaunsa sensitive-skin skincare dekhun?","category-discovery","hi-en"],["For Cetaphil sensitive-skin skincare, should I order from the brand site or another trusted seller in India?","branded-routing","en","Cetaphil"],["My face stings with scented products and turns red easily, even after basic cleansing. What kind of routine should I try?","problem-first","en"]]},{"id":"stationery-and-planners","n":"Stationery & planners","g":"Other high-velocity D2C","q":[["Which planner under ₹1000 is good for weekly work planning with space for tasks and meetings?","category-discovery","en"],["office ka weekly planning notebook ke liye ₹1000 ke aas-paas koi achha planner hai?","category-discovery","hi-en"],["I already want Factor Notes planner — where is the safest place to buy it without overpaying?","branded-routing","en","Factor Notes"],["I keep tasks in random notes and forget follow-ups after meetings. What paper system can help me plan the week in one place?","problem-first","en"]]},{"id":"backpacks","n":"Backpacks","g":"Other high-velocity D2C","q":[["₹3000 budget: suggest backpack that suits daily office commute with a 15-inch laptop and rain protection.","category-discovery","en"],["₹3000 max spend karna hai — office commute aur laptop ke liye backpack wala backpack batao.","category-discovery","hi-en"],["What's the best place online to get authentic Wildcraft backpack in India right now?","branded-routing","en","Wildcraft"],["My current bag has no laptop padding and everything gets damp in sudden rain. What features should I look for in a replacement?","problem-first","en"]]},{"id":"travel-accessories","n":"Travel accessories","g":"Other high-velocity D2C","q":[["For keeping cables, passport and toiletries organised on short trips, what travel organizer can I get within ₹3000?","category-discovery","en"],["India mein ₹3000 budget mein short trip mein packing organize karna; travel organizer mein kya worth it hai?","category-discovery","hi-en"],["Can you point me to a genuine Mokobara travel organizer deal and tell me where I should actually buy?","branded-routing","en","Mokobara"],["My suitcase turns messy after one day and I waste time searching for chargers and toiletries. What organisers are actually useful?","problem-first","en"]]},{"id":"grooming-kits","n":"Grooming kits (gifting)","g":"Other high-velocity D2C","q":[["Looking for grooming gift kit around ₹2000, mainly for birthday gift for a man who likes practical self-care products; what would you pick?","category-discovery","en"],["male friend ke birthday ka grooming gift ke liye grooming gift kit chahiye, budget roughly ₹2000 — options?","category-discovery","hi-en"],["I don't need brand suggestions — I want Bombay Shaving Company grooming gift kit. Which Indian store should I buy from?","branded-routing","en","Bombay Shaving Company"],["I need a useful birthday present for a guy who already owns the usual wallets and perfumes. What self-care gift would feel complete?","problem-first","en"]]},{"id":"festive-gifting-hampers","n":"Festive gifting hampers","g":"Other high-velocity D2C","q":[["Can you recommend festive gift hamper below ₹2500 for Diwali gifting for colleagues with sweets and useful items?","category-discovery","en"],["₹2500 tak mein festive gift hamper dekh raha/rahi hoon; focus colleagues ke liye Diwali hamper pe hai.","category-discovery","hi-en"],["Where would you route me for a real Ferns N Petals festive gift hamper: its own site or a marketplace?","branded-routing","en","Ferns N Petals"],["I need presentable gifts for several colleagues that feel festive but not too personal. What kind of hamper should I send?","problem-first","en"]]},{"id":"car-accessories","n":"Car accessories","g":"Other high-velocity D2C","q":[["What's a reliable car accessories for keeping a family car cleaner and more organised on road trips if my limit is ₹3000?","category-discovery","en"],["Koi car accessories ₹3000 se kam jo family car ko clean aur organized rakhna ke kaam aaye?","category-discovery","hi-en"],["I'm buying AutoFurnish car accessories; who has the best genuine listing and price in India?","branded-routing","en","AutoFurnish"],["Our car gets cluttered with bottles, charging cables and kids' things on long drives. What useful add-ons can tidy it up?","problem-first","en"]]},{"id":"eyewear","n":"Eyewear (prescription / blue-light)","g":"Other high-velocity D2C","q":[["Help me choose blue-light glasses for long laptop workdays with prescription-ready frames; budget is ₹3000 max.","category-discovery","en"],["screen pe 8 ghante kaam ke liye glasses sabse important hai aur budget ₹3000; kaunsa blue-light glasses choose karun?","category-discovery","hi-en"],["Which trusted site is best for ordering Lenskart blue-light glasses in India?","branded-routing","en","Lenskart"],["I spend most of the day on a laptop, my eyes feel strained, and my current frames get uncomfortable after a few hours. What should I look for?","problem-first","en"]]},{"id":"vitamin-c-serum","n":"Vitamin C face serum","g":"Beauty & Personal Care","q":[["best vitamin C serum for oily skin India","category-discovery","en"]],"s":[{"i":0,"e":"claude","d":"2026-08-18","r":[["Minimalist","Vitamin C 10% Face Serum","Most popular Indian serum on ingredient-analysis platforms; clinically proven brightening at ~₹650, fungal-acne safe and lightweight for oily skin","marketplace","amazon.in"],["The Derma Co","10% Vitamin C + 5% Niacinamide Serum","Niacinamide pairing controls sebum while brightening; fungal-acne-safe formulation","marketplace","amazon.in"],["Dot & Key","10% Vitamin C+E & 5% Niacinamide Serum","Repeatedly recommended for oily skin: brightens without adding shine or clogging pores","marketplace","nykaa.com"],["Pilgrim","10% Vitamin C Serum (3-O-ethyl ascorbic acid + 5% niacinamide)","Stable derivative absorbs without greasy residue — formulated specifically for oily/combination skin","brand-direct","discoverpilgrim.com"],["Deconstruct","Vitamin C & Ferulic Acid Serum","10% Vitamin C stabilized with ferulic acid; lightweight water-based texture built for humid Indian climate","brand-direct","thedeconstruct.in"]],"src":["quora.com","discoverpilgrim.com","thedeconstruct.in","smytten.com","ibacosmetics.com","amazon.in","clinikally.com","cittaworld.com","glopetra.com","nourishmantra.in","lightupbeauty.com","skinsort.com","forbes.com"]}]}],"GCC":[{"id":"oud-products","n":"Oud products","g":"","q":[["premium pure oud wood chips for home burning under 300 AED","category-discovery","en"],["عود طبيعي فاخر للمناسبات ريحته تطول","category-discovery","ar"],["where to buy genuine Abdul Samad Al Qurashi pure oud oil online","branded-routing","en","Abdul Samad Al Qurashi"],["how to make my house smell traditional and woody for guests without using synthetic air fresheners","problem-first","en"]]},{"id":"hair-styling-women","n":"Hair styling (women)","g":"","q":[["heat protectant spray for curly hair under 60 AED","category-discovery","en"],["سيروم قبل الاستشوار يحمي الشعر من الحرارة","category-discovery","ar"],["best price for Dyson Airwrap multi styler complete long online","branded-routing","en","Dyson"],["my hair gets incredibly frizzy the moment I step outside in the humidity","problem-first","en"]]},{"id":"skin-brightening-cream","n":"Skin brightening cream","g":"","q":[["night cream for pigmentation and dark spots under 100 AED","category-discovery","en"],["كريم تفتيح البقع الداكنة وتوحيد لون البشرة","category-discovery","ar"],["where to order Eucerin even pigment perfector dual serum","branded-routing","en","Eucerin"],["I have stubborn acne scars on my cheeks that make my complexion look completely uneven","problem-first","en"]]},{"id":"face-masks","n":"Face masks / sheet masks","g":"","q":[["hydrating korean sheet masks pack under 50 AED for glowing skin","category-discovery","en"],["ماسك كوري للوجه يعطي نضارة وترطيب عميق","category-discovery","ar"],["where to buy Dr Jart rubber masks in bulk for cheap","branded-routing","en","Dr. Jart+"],["my face looks exhausted and dull after a long flight and I need a quick fix before an event","problem-first","en"]]},{"id":"nail-care","n":"Nail care","g":"","q":[["strengthening cuticle oil pen under 40 AED for brittle nails","category-discovery","en"],["مقوي اظافر يمنع التكسر ويطولها بسرعة","category-discovery","ar"],["where can I buy Sally Hansen hard as nails treatment locally","branded-routing","en","Sally Hansen"],["my nails keep splitting and peeling off in thin layers after removing my acrylics","problem-first","en"]]},{"id":"mens-sunglasses","n":"Men's sunglasses","g":"","q":[["polarized aviator shades for driving under 200 AED","category-discovery","en"],["نظارات شمسية رجالية بولارايزد للقيادة","category-discovery","ar"],["where to buy authentic Ray-Ban wayfarers online with fast shipping","branded-routing","en","Ray-Ban"],["the intense sun glare on the highway is giving me a headache on my way to work","problem-first","en"]]},{"id":"womens-ethnic-wear","n":"Women's ethnic wear / kurtis","g":"","q":[["cotton printed kurtis for daily office wear under 150 AED","category-discovery","en"],["جلابيات استقبال فخمة للعيد ومريحة","category-discovery","ar"],["best site to buy Biba festive wear suits in UAE","branded-routing","en","Biba"],["I need something modest but breathable to wear to a traditional evening family gathering","problem-first","en"]]},{"id":"abayas-modest-fashion","n":"Abayas & modest fashion","g":"","q":[["everyday black nada silk abaya under 250 AED","category-discovery","en"],["عبايات سوداء سادة للدوام قماش ندى بارد","category-discovery","ar"],["where to order Hanayen abayas online with delivery to my house","branded-routing","en","Hanayen"],["my current modest workwear is too thick and makes me sweat instantly during the summer commute","problem-first","en"]]},{"id":"sneakers-casual-shoes","n":"Sneakers / casual shoes","g":"","q":[["comfortable white walking sneakers for travel under 300 AED","category-discovery","en"],["شوز رياضي مريح للمشي الطويل ما يوجع الرجل","category-discovery","ar"],["where to buy New Balance 530 running shoes locally","branded-routing","en","New Balance"],["my feet and lower back ache terribly after standing during my entire 8 hour shift","problem-first","en"]]},{"id":"mens-formal-shoes","n":"Men's formal shoes","g":"","q":[["genuine leather oxford shoes for office wear under 400 AED","category-discovery","en"],["حذاء رسمي رجالي جلد طبيعي للدوام","category-discovery","ar"],["best place to get Clarks leather brogues on discount","branded-routing","en","Clarks"],["I have a wedding to attend but all my dress shoes give me terrible blisters on my heels","problem-first","en"]]},{"id":"perfume-attar","n":"Perfume / Attar","g":"Beauty & Personal Care","q":[["best long lasting perfume under AED 100 UAE","category-discovery","en"]],"s":[{"i":0,"e":"claude","d":"2026-08-18","r":[["Lattafa","Velvet Oud / Raghba Wood Intense","Named the top answer for long wear and high projection under AED 100; UAE house built for the climate","marketplace","amazon.ae"],["Rasasi","Rasasi Romance","Trusted UAE perfume house; affordable, elegant, recommended for daily wear","marketplace","noon.com"],["Ajmal","Sacrifice","Heritage UAE house; fresh citrus-jasmine build praised as office-friendly and heat-resistant, smells above its price","brand-direct","en-ae.ajmal.com"],["My Perfumes (Arabiyat)","Arabiyat Prestige line","Local D2C house with strong under-AED-100 range tuned for UAE heat; free shipping over AED 100","brand-direct","myperfumes.ae"],["Ahmed Al Maghribi","Oud Classic","Affordable oud with citrus opening and musk-balsam base — signature-scent value under AED 100","brand-direct","ahmedalmaghribi.co.in"]],"src":["asaan.com","myperfumes.ae","craftier.ae","luvindeals.com","ahmedalmaghribi.co.in","vperfumes.com","ajmal.com","aromaticscentslab.com","albait-aldimashqi.com","alhajisperfumes.com","perfumegallery.ae","gulfnews.com"]}]}]};
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,800&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.ss-root { min-height: 100vh; background: #0E1F18; color: #F1F5EC; font-family: 'Archivo', sans-serif; padding: 20px 16px 48px; box-sizing: border-box; }
.ss-wrap { max-width: 680px; margin: 0 auto; }
.ss-mark { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.22em; color: #FFC53D; text-transform: uppercase; }
.ss-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: clamp(28px, 7vw, 42px); line-height: 1.02; margin: 8px 0 6px; }
.ss-sub { color: #9DB4A6; font-size: 14px; line-height: 1.5; margin: 0 0 22px; max-width: 50ch; }
.ss-card { background: #14291F; border: 1px solid #264434; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
.ss-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #7FA18C; display: block; margin: 0 0 6px; }
.ss-hint { font-size: 12px; color: #7FA18C; margin: -4px 0 12px; }
.ss-input { width: 100%; box-sizing: border-box; background: #0E1F18; border: 1px solid #2E5240; border-radius: 8px; color: #F1F5EC; font-size: 16px; padding: 12px; margin-bottom: 12px; outline: none; font-family: 'Archivo', sans-serif; }
.ss-input:focus { border-color: #FFC53D; box-shadow: 0 0 0 2px rgba(255,197,61,0.25); }
.ss-btn { width: 100%; background: #FFC53D; color: #17251F; border: none; border-radius: 10px; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 17px; padding: 14px; cursor: pointer; }
.ss-btn:disabled { opacity: 0.45; cursor: default; }
.ss-btn:focus-visible { outline: 3px solid #F1F5EC; outline-offset: 2px; }
.ss-btn.ghost { background: transparent; color: #FFC53D; border: 1px solid #FFC53D; font-weight: 600; font-size: 14px; padding: 10px; margin-top: 6px; }
.ss-catlist { max-height: 260px; overflow-y: auto; border: 1px solid #264434; border-radius: 8px; }
.ss-catrow { padding: 11px 12px; font-size: 14px; border-bottom: 1px dashed #264434; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; }
.ss-catrow:last-child { border-bottom: none; }
.ss-catrow:hover { background: #1B3628; }
.ss-catrow .g { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #5BD6A0; flex-shrink: 0; }
.ss-qedit { width: 100%; box-sizing: border-box; background: #0E1F18; border: 1px solid #2E5240; border-radius: 8px; color: #F1F5EC; font-family: 'IBM Plex Mono', monospace; font-size: 13px; line-height: 1.45; padding: 10px 12px; margin-bottom: 4px; outline: none; resize: vertical; min-height: 50px; }
.ss-qedit:focus { border-color: #FFC53D; }
.ss-arch { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #7FA18C; border: 1px solid #2E5240; border-radius: 999px; padding: 3px 8px; margin-bottom: 10px; }
.ss-queryline { display: flex; align-items: center; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #C4D6C9; padding: 8px 0; border-bottom: 1px dashed #264434; }
.ss-queryline:last-child { border-bottom: none; }
.ss-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.dot-waiting { background: #3A5A48; } .dot-searching { background: #FFC53D; animation: ss-pulse 1s infinite; }
.dot-done { background: #5BD6A0; } .dot-error { background: #FF6B57; }
@keyframes ss-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
@media (prefers-reduced-motion: reduce) { .dot-searching { animation: none; } }
.ss-verdict { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: clamp(26px, 6vw, 36px); margin: 0 0 4px; }
.v-good { color: #5BD6A0; } .v-bad { color: #FF6B57; } .v-mid { color: #FFC53D; }
.ss-engines { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.ss-enginebox { flex: 1; min-width: 130px; background: #0E1F18; border: 1px solid #264434; border-radius: 10px; padding: 10px 12px; }
.ss-enginebox .nm { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #7FA18C; }
.ss-enginebox .sc { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 26px; }
.ss-enginebox .vs { font-size: 11px; color: #9DB4A6; font-family: 'IBM Plex Mono', monospace; }
.ss-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.ss-tab { flex: 1; min-width: 80px; background: #0E1F18; border: 1px solid #2E5240; color: #C4D6C9; border-radius: 8px; padding: 9px 6px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; text-align: center; }
.ss-tab.active { background: #FFC53D; color: #17251F; border-color: #FFC53D; font-weight: 600; }
.ss-tab .st { display: block; font-size: 9px; margin-top: 2px; opacity: 0.75; text-transform: none; letter-spacing: 0; }
.ss-tab:focus-visible { outline: 2px solid #F1F5EC; outline-offset: 2px; }
.ss-shelf { margin: 16px 0 4px; }
.ss-shelf-q { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #9DB4A6; margin: 0 0 10px; }
.ss-slots { display: flex; gap: 6px; align-items: flex-end; }
.ss-tag { flex: 1; min-width: 0; border-radius: 6px 6px 0 0; padding: 8px 5px 10px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.25; overflow-wrap: break-word; border: 1px solid #2E5240; border-bottom: none; background: #1B3628; color: #C4D6C9; }
.ss-tag .rk { display:block; font-family:'IBM Plex Mono',monospace; font-size:9px; color:#7FA18C; margin-bottom:3px; }
.ss-tag .dest { display:block; font-family:'IBM Plex Mono',monospace; font-size:8px; margin-top:3px; opacity: 0.85; }
.tag-you { background: #FFC53D; color: #17251F; border-color: #FFC53D; transform: translateY(-6px); box-shadow: 0 6px 14px rgba(255,197,61,0.3); }
.tag-you .rk { color: #17251F; }
.tag-amz { background: #3A2320; color: #FFB3A6; border-color: #6B3A32; }
.tag-comp { background: #14324A; color: #A8D4F0; border-color: #2E5A7A; }
.ss-plank { height: 7px; background: linear-gradient(#4A6B54, #2E4A3A); border-radius: 2px; }
.ss-missing { margin-top: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FF6B57; }
.ss-notharvested { border: 1px dashed #2E5240; border-radius: 10px; padding: 14px; font-size: 13px; color: #9DB4A6; margin-top: 10px; line-height: 1.5; }
.ss-sov { display: flex; height: 26px; border-radius: 8px; overflow: hidden; margin: 4px 0 12px; }
.ss-sovrow { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; color: #C4D6C9; }
.ss-sovrow .p { font-family: 'IBM Plex Mono', monospace; }
.ss-h2 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:18px; margin:0 0 12px; }
.ss-sentibadge { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; border: 1px solid currentColor; margin-bottom: 10px; }
.ss-positioning { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 24px; margin: 0 0 8px; }
.ss-sentisum { font-size: 14px; line-height: 1.55; color: #C4D6C9; margin: 0; }
.ss-fanout { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #C4D6C9; padding: 7px 0 7px 16px; border-bottom: 1px dashed #264434; position: relative; }
.ss-fanout:last-child { border-bottom: none; }
.ss-fanout::before { content: '↳'; position: absolute; left: 0; color: #FFC53D; }
.ss-srcrow { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.ss-srcname { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #E4EDE2; width: 44%; overflow-wrap: break-word; }
.ss-srcbar { flex: 1; height: 8px; background: #0E1F18; border-radius: 4px; overflow: hidden; }
.ss-srcbar span { display: block; height: 100%; background: #5BD6A0; border-radius: 4px; }
.ss-srccount { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #7FA18C; width: 28px; text-align: right; }
.ss-export { width: 100%; box-sizing: border-box; height: 220px; background: #0E1F18; border: 1px solid #2E5240; border-radius: 8px; color: #C4D6C9; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 10px; margin-top: 10px; }
.ss-err { color: #FF6B57; font-size: 13px; font-family: 'IBM Plex Mono', monospace; margin-top: 10px; }
`;

// ================= config =================
const MODEL = "claude-sonnet-4-6";
const ENGINES = ["claude", "chatgpt", "gemini", "grok"];
const ENGINE_LABELS = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini", grok: "Grok" };

async function callClaude(body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function extractJSON(data) {
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in reply");
  return JSON.parse(text.slice(start, end + 1));
}

const domainOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
};

async function askShoppingAssistant(query) {
  const prompt = `You are an AI shopping assistant helping a real customer. Their question: "${query}".
Search the web if helpful. Recommend exactly 5 specific options, ranked best first. Name the actual BRAND for each.
For EACH recommendation also state where you would send the customer to BUY it:
- "destination": exactly one of "brand-direct", "marketplace", "aggregator", "none"
- "destination_domain": the specific site, e.g. "levi.in" or "amazon.ae"
Respond with ONLY valid JSON, no markdown fences:
{"recommendations":[{"brand":"","product":"","why":"","destination":"","destination_domain":""}]}`;

  const data = await callClaude({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
  });
  const searches = (data.content || [])
    .filter((b) => b.type === "server_tool_use" && b.name === "web_search")
    .map((b) => b.input?.query).filter(Boolean);
  const citations = [];
  (data.content || []).filter((b) => b.type === "web_search_tool_result").forEach((b) => {
    (Array.isArray(b.content) ? b.content : []).forEach((item) => {
      if (item?.type === "web_search_result" && item.url) {
        const d = domainOf(item.url);
        if (d) citations.push(d);
      }
    });
  });
  const parsed = extractJSON(data);
  return { recs: (parsed.recommendations || []).slice(0, 5), searches, citations };
}

async function analyzeSentiment(brand, mentions) {
  const prompt = `A brand "${brand}" was recommended by AI shopping assistants. How they described it:
${mentions.map((m, i) => `${i + 1}. "${m}"`).join("\n")}
Analyze how AI positions this brand. ONLY valid JSON, no markdown:
{"sentiment":"positive|neutral|negative","positioning":"2-5 word label","summary":"one sentence for the founder"}`;
  const data = await callClaude({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] });
  return extractJSON(data);
}

// ================= scoring helpers =================
const rankPoints = (idx) => Math.max(0, 100 - idx * 20);
const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const matches = (a, b) => {
  const x = normalize(a), y = normalize(b);
  if (!x || !y) return false;
  return y.includes(x) || x.includes(y);
};

const RIVALS = {
  India: ["amazon", "flipkart", "meesho", "myntra", "nykaa"],
  GCC: ["amazon", "noon", "namshi"],
};
const rivalLabel = { India: "Flipkart/Amazon", GCC: "Noon/Amazon" };
const DEST_COLORS = { "brand-direct": "#5BD6A0", marketplace: "#FF6B57", aggregator: "#4A9FD8", none: "#3A5A48" };
const DEST_LABELS = { "brand-direct": "Brand-direct", marketplace: "Marketplace", aggregator: "Aggregator", none: "No link" };
const ARCH_LABELS = { "category-discovery": "discovery", "branded-routing": "routing", "problem-first": "problem-first", replacement: "replacement" };

// expand compact bank rows into full objects
const catQueries = (cat) =>
  (cat.q || []).map((row, i) => ({
    qid: `${cat.id}-${i}`,
    text: row[0],
    archetype: row[1],
    language: row[2],
    leader_brand: row[3] || "",
  }));
const catSnapshots = (cat) =>
  (cat.s || []).map((s) => ({
    idx: s.i,
    engine: s.e,
    collected_on: s.d,
    recs: (s.r || []).map((r) => ({ brand: r[0], product: r[1], why: r[2], destination: r[3], destination_domain: r[4] })),
    sources: s.src || [],
  }));

export default function ShelfShare() {
  const [market, setMarket] = useState("India");
  const [catId, setCatId] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [queries, setQueries] = useState([]);
  const [phase, setPhase] = useState("setup"); // setup | ready | running | done
  const [liveRuns, setLiveRuns] = useState([]);
  const [senti, setSenti] = useState(null);
  const [activeEngine, setActiveEngine] = useState("claude");
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const cats = BANK[market] || [];
  const category = cats.find((c) => c.id === catId) || null;
  const rivalNames = RIVALS[market] || ["amazon"];
  const isRival = (c) => { const n = normalize(c); return rivalNames.some((r) => n.includes(r)); };
  const hasComp = competitor.trim().length > 0;

  const pickCategory = (id) => {
    setCatId(id);
    const c = cats.find((x) => x.id === id);
    setQueries(catQueries(c));
    setPhase("ready");
    setLiveRuns([]);
    setSenti(null);
    setActiveEngine("claude");
  };

  const snapshotsFor = (engine) => {
    if (!category) return [];
    const snaps = catSnapshots(category).filter((s) => s.engine === engine);
    const latest = {};
    snaps.forEach((s) => { if (!latest[s.idx] || s.collected_on > latest[s.idx].collected_on) latest[s.idx] = s; });
    return queries.map((q, i) => {
      const s = latest[i];
      return s
        ? { qid: q.qid, text: q.text, archetype: q.archetype, recs: s.recs, collected_on: s.collected_on, source: "snapshot" }
        : { qid: q.qid, text: q.text, archetype: q.archetype, recs: [], collected_on: null, source: "missing" };
    });
  };

  const startTest = async () => {
    if (!brand.trim() || queries.length === 0) return;
    const initial = queries.map((q) => ({ ...q, status: "waiting", recs: [], searches: [], citations: [] }));
    setLiveRuns(initial);
    setSenti(null);
    setPhase("running");
    const next = [...initial];
    for (let i = 0; i < next.length; i++) {
      next[i] = { ...next[i], status: "searching" };
      setLiveRuns([...next]);
      try {
        const { recs, searches, citations } = await askShoppingAssistant(next[i].text);
        next[i] = { ...next[i], status: "done", recs, searches, citations };
      } catch (e) {
        next[i] = { ...next[i], status: "error", error: e.message };
      }
      setLiveRuns([...next]);
    }
    setPhase("done");

    const mentions = [];
    next.filter((r) => r.status === "done").forEach((r) =>
      r.recs.forEach((rec) => {
        if ((matches(brand, rec.brand) || matches(brand, rec.product)) && rec.why) mentions.push(rec.why);
      })
    );
    ENGINES.filter((e) => e !== "claude").forEach((e) =>
      snapshotsFor(e).forEach((s) =>
        s.recs.forEach((rec) => {
          if ((matches(brand, rec.brand) || matches(brand, rec.product)) && rec.why) mentions.push(rec.why);
        })
      )
    );
    if (mentions.length > 0) {
      setSenti({ status: "loading" });
      try {
        const s = await analyzeSentiment(brand.trim(), mentions.slice(0, 12));
        setSenti({ status: "done", ...s });
      } catch { setSenti(null); }
    }
  };

  const engineData = (engine) => {
    if (engine === "claude") {
      const live = liveRuns.filter((r) => r.status === "done").map((r) => ({ ...r, collected_on: "live", source: "live" }));
      if (live.length > 0) return live;
      return snapshotsFor("claude").filter((s) => s.source === "snapshot");
    }
    return snapshotsFor(engine).filter((s) => s.source === "snapshot");
  };
  const engineHasAny = (e) => engineData(e).length > 0;

  const scoreFor = (rows, matchFn) => {
    if (rows.length === 0) return null;
    const total = rows.reduce((sum, r) => {
      const idx = r.recs.findIndex((rec) => matchFn(rec.brand) || matchFn(rec.product));
      return sum + (idx >= 0 ? rankPoints(idx) : 0);
    }, 0);
    return Math.round(total / rows.length);
  };

  const allRows = ENGINES.flatMap((e) => engineData(e));
  let slotYou = 0, slotComp = 0, slotRival = 0, slotOther = 0, slotTotal = 0;
  const destTally = { "brand-direct": 0, marketplace: 0, aggregator: 0, none: 0 };
  const yourDest = {};
  allRows.forEach((r) =>
    r.recs.forEach((rec) => {
      slotTotal++;
      const isYou = matches(brand, rec.brand) || matches(brand, rec.product);
      if (isYou) slotYou++;
      else if (hasComp && (matches(competitor, rec.brand) || matches(competitor, rec.product))) slotComp++;
      else if (isRival(rec.brand)) slotRival++;
      else slotOther++;
      const dkey = DEST_COLORS[rec.destination] ? rec.destination : "none";
      destTally[dkey]++;
      if (isYou) {
        const dom = rec.destination_domain || DEST_LABELS[dkey];
        yourDest[dom] = (yourDest[dom] || 0) + 1;
      }
    })
  );
  const pct = (n) => (slotTotal ? Math.round((n / slotTotal) * 100) : 0);
  const yourDestList = Object.entries(yourDest).sort((a, b) => b[1] - a[1]);

  const engineScores = ENGINES.map((e) => {
    const rows = engineData(e);
    return { engine: e, rows: rows.length, you: scoreFor(rows, (c) => matches(brand, c)), rival: scoreFor(rows, isRival) };
  });
  const scoredEngines = engineScores.filter((s) => s.you !== null);
  const avgYou = scoredEngines.length ? Math.round(scoredEngines.reduce((a, s) => a + s.you, 0) / scoredEngines.length) : 0;
  const avgRival = scoredEngines.length ? Math.round(scoredEngines.reduce((a, s) => a + s.rival, 0) / scoredEngines.length) : 0;
  const verdict = avgYou === 0 ? "NOT STOCKED" : avgYou >= avgRival ? "ON THE SHELF" : "OUTSHELVED";
  const appearRows = allRows.filter((r) => r.recs.some((rec) => matches(brand, rec.brand) || matches(brand, rec.product))).length;

  const claudeFanout = [...new Set(liveRuns.flatMap((r) => r.searches || []))];
  const citationTally = {};
  liveRuns.forEach((r) => (r.citations || []).forEach((d) => (citationTally[d] = (citationTally[d] || 0) + 1)));
  const topSources = Object.entries(citationTally).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSrc = topSources.length ? topSources[0][1] : 1;
  const sentiColor = senti?.sentiment === "positive" ? "#5BD6A0" : senti?.sentiment === "negative" ? "#FF6B57" : "#FFC53D";

  const buildExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    return JSON.stringify({
      market,
      categories: [{
        id: category.id,
        name: category.n,
        group: category.g,
        queries: queries.map((q) => ({ qid: q.qid, text: q.text, archetype: q.archetype, intent: "commercial", language: q.language, ...(q.leader_brand ? { leader_brand: q.leader_brand } : {}) })),
        snapshots: liveRuns.filter((r) => r.status === "done").map((r) => ({
          qid: r.qid, engine: "claude", surface: "api", collected_on: today,
          recommendations: r.recs.map((rec, j) => ({ rank: j + 1, brand: rec.brand || "", product: rec.product || "", why: rec.why || "", destination: rec.destination || "none", destination_domain: rec.destination_domain || "" })),
          sources_cited: [...new Set(r.citations || [])],
        })),
      }],
      merchant: null,
    }, null, 2);
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(buildExport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setExportOpen(true); }
  };

  const filteredCats = cats.filter((c) => (c.q || []).length > 0 && (c.n + " " + (c.g || "")).toLowerCase().includes(catSearch.toLowerCase()));
  const activeRows = engineData(activeEngine);
  const activeMissing = phase === "done" && activeEngine !== "claude" ? snapshotsFor(activeEngine).filter((s) => s.source === "missing") : [];

  return (
    <div className="ss-root">
      <style>{CSS}</style>
      <div className="ss-wrap">
        <div className="ss-mark">ShelfShare · {market} · 4 engines</div>
        <h1 className="ss-title">Does AI put you on the shelf?</h1>
        <p className="ss-sub">
          Pick your category, enter your brand, and see who Claude, ChatGPT, Gemini and Grok recommend —
          and where they send the buyer to check out.
        </p>

        {phase === "setup" && (
          <div className="ss-card">
            <div className="ss-label">Market</div>
            <div className="ss-tabs" style={{ marginBottom: 14 }}>
              {Object.keys(BANK).map((m) => (
                <button key={m} className={`ss-tab ${market === m ? "active" : ""}`} onClick={() => { setMarket(m); setCatId(""); setCatSearch(""); }}>
                  {m}<span className="st">{BANK[m].length} categories</span>
                </button>
              ))}
            </div>
            <div className="ss-label">What do you sell?</div>
            <input className="ss-input" placeholder="Search categories… e.g. serum, earbuds, abaya" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
            <div className="ss-catlist">
              {filteredCats.slice(0, 30).map((c) => (
                <div className="ss-catrow" key={c.id} onClick={() => pickCategory(c.id)}>
                  <span>{c.n}</span>
                  <span className="g">{(c.s || []).length ? "● data" : ""}</span>
                </div>
              ))}
              {filteredCats.length === 0 && <div className="ss-catrow" style={{ cursor: "default", color: "#7FA18C" }}>No matching category</div>}
            </div>
          </div>
        )}

        {phase === "ready" && category && (
          <div className="ss-card">
            <div className="ss-label">Category · {category.n}</div>
            <input className="ss-input" placeholder="Your brand name" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <input className="ss-input" placeholder="Competitor to track (optional)" value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
            <div className="ss-label">Shopper questions for this category</div>
            <p className="ss-hint">Standardized so your score is comparable with every other brand tested. Edit if needed — the routing question tests the category leader; swap in your own brand to test YOUR checkout routing.</p>
            {queries.map((q, i) => (
              <div key={q.qid}>
                <textarea
                  className="ss-qedit" value={q.text} aria-label={`Query ${i + 1}`}
                  onChange={(e) => { const next = [...queries]; next[i] = { ...next[i], text: e.target.value }; setQueries(next); }}
                />
                <span className="ss-arch">{ARCH_LABELS[q.archetype] || q.archetype} · {q.language}</span>
              </div>
            ))}
            <button className="ss-btn" onClick={startTest} disabled={!brand.trim()}>Run the shelf test</button>
            <button className="ss-btn ghost" onClick={() => setPhase("setup")}>Change category</button>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="ss-card">
            <div className="ss-label">Claude · live run</div>
            {liveRuns.map((r, i) => (
              <div className="ss-queryline" key={i}>
                <span className={`ss-dot dot-${r.status}`} />
                <span style={{ flex: 1 }}>{r.text}</span>
                {r.status === "error" && <span className="ss-err" style={{ margin: 0 }}>failed</span>}
              </div>
            ))}
          </div>
        )}

        {phase === "done" && (
          <>
            <div className="ss-card">
              <div className={`ss-verdict ${verdict === "NOT STOCKED" ? "v-bad" : verdict === "OUTSHELVED" ? "v-mid" : "v-good"}`}>{verdict}</div>
              <div style={{ fontSize: 14, color: "#9DB4A6" }}>
                {brand} appeared in {appearRows} of {allRows.length} AI shopping answers across {scoredEngines.length} engine{scoredEngines.length === 1 ? "" : "s"} with data.
              </div>
              <div className="ss-engines">
                {engineScores.map((s) => (
                  <div className="ss-enginebox" key={s.engine}>
                    <div className="nm">{ENGINE_LABELS[s.engine]}{s.engine === "claude" ? " · live" : ""}</div>
                    {s.you === null ? (
                      <div className="vs" style={{ marginTop: 6 }}>awaiting harvest</div>
                    ) : (
                      <>
                        <div className="sc" style={{ color: "#FFC53D" }}>{s.you}</div>
                        <div className="vs">{rivalLabel[market] || "Amazon"}: {s.rival}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {slotTotal > 0 && (
              <div className="ss-card">
                <div className="ss-h2">The checkout battle</div>
                <div className="ss-sov">
                  {Object.keys(DEST_COLORS).map((k) => (
                    <div key={k} style={{ width: `${(destTally[k] / slotTotal) * 100}%`, background: DEST_COLORS[k] }} />
                  ))}
                </div>
                {Object.keys(DEST_COLORS).map((k) => (
                  <div className="ss-sovrow" key={k}><span>{DEST_LABELS[k]}</span><span className="p">{Math.round((destTally[k] / slotTotal) * 100)}%</span></div>
                ))}
                {yourDestList.length > 0 && (
                  <>
                    <div className="ss-label" style={{ marginTop: 12 }}>When AI recommends {brand}, buyers go to</div>
                    {yourDestList.map(([dom, n]) => (
                      <div className="ss-sovrow" key={dom}><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{dom}</span><span className="p">{n}×</span></div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div className="ss-card">
              <div className="ss-h2">Share of AI Voice</div>
              <div className="ss-sov">
                <div style={{ width: `${pct(slotYou)}%`, background: "#FFC53D" }} />
                {hasComp && <div style={{ width: `${pct(slotComp)}%`, background: "#4A9FD8" }} />}
                <div style={{ width: `${pct(slotRival)}%`, background: "#FF6B57" }} />
                <div style={{ width: `${pct(slotOther)}%`, background: "#3A5A48" }} />
              </div>
              <div className="ss-sovrow"><span>You · {brand}</span><span className="p">{pct(slotYou)}%</span></div>
              {hasComp && <div className="ss-sovrow"><span>{competitor}</span><span className="p">{pct(slotComp)}%</span></div>}
              <div className="ss-sovrow"><span>{rivalLabel[market] || "Amazon"}</span><span className="p">{pct(slotRival)}%</span></div>
              <div className="ss-sovrow"><span>Everyone else</span><span className="p">{pct(slotOther)}%</span></div>
            </div>

            {senti && (
              <div className="ss-card">
                <div className="ss-h2">How AI talks about you</div>
                {senti.status === "loading" ? (
                  <p className="ss-sentisum">Analyzing the language AI used about {brand}…</p>
                ) : (
                  <>
                    <span className="ss-sentibadge" style={{ color: sentiColor }}>{senti.sentiment}</span>
                    <div className="ss-positioning" style={{ color: sentiColor }}>“{senti.positioning}”</div>
                    <p className="ss-sentisum">{senti.summary}</p>
                  </>
                )}
              </div>
            )}

            <div className="ss-card">
              <div className="ss-h2">The shelves</div>
              <div className="ss-tabs">
                {ENGINES.map((e) => (
                  <button key={e} className={`ss-tab ${activeEngine === e ? "active" : ""}`} onClick={() => setActiveEngine(e)}>
                    {ENGINE_LABELS[e]}
                    <span className="st">{e === "claude" ? "live" : engineHasAny(e) ? engineData(e)[0]?.collected_on : "no data yet"}</span>
                  </button>
                ))}
              </div>
              {activeRows.map((r, i) => {
                const youIdx = r.recs.findIndex((rec) => matches(brand, rec.brand) || matches(brand, rec.product));
                const compIdx = hasComp ? r.recs.findIndex((rec) => matches(competitor, rec.brand) || matches(competitor, rec.product)) : -1;
                return (
                  <div className="ss-shelf" key={i}>
                    <p className="ss-shelf-q">
                      <span className="ss-arch" style={{ marginRight: 8, marginBottom: 0 }}>{ARCH_LABELS[r.archetype] || r.archetype}</span>
                      “{r.text}”
                    </p>
                    <div className="ss-slots">
                      {r.recs.map((rec, j) => (
                        <div key={j} className={`ss-tag ${j === youIdx ? "tag-you" : j === compIdx ? "tag-comp" : isRival(rec.brand) ? "tag-amz" : ""}`} title={rec.product}>
                          <span className="rk">#{j + 1}</span>
                          {rec.brand}
                          {rec.destination && rec.destination !== "none" && (
                            <span className="dest" style={{ color: j === youIdx ? "#17251F" : DEST_COLORS[rec.destination] }}>
                              → {rec.destination === "brand-direct" ? "direct" : rec.destination === "marketplace" ? "mktpl" : "aggr"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="ss-plank" />
                    {youIdx === -1 && <div className="ss-missing">✕ {brand} is not on this shelf</div>}
                  </div>
                );
              })}
              {activeMissing.length > 0 && (
                <div className="ss-notharvested">
                  {ENGINE_LABELS[activeEngine]} hasn't been harvested for {activeMissing.length} of these queries yet.
                  Run them in the {ENGINE_LABELS[activeEngine]} app with the Harvest Prompt and add the snapshots to the bank — this tab lights up automatically.
                </div>
              )}
              {activeEngine !== "claude" && activeRows.length === 0 && (
                <div className="ss-notharvested">No {ENGINE_LABELS[activeEngine]} snapshots for this category yet — harvest to unlock this shelf.</div>
              )}
            </div>

            {claudeFanout.length > 0 && (
              <div className="ss-card">
                <div className="ss-h2">What Claude searched · live telemetry</div>
                {claudeFanout.map((s, i) => <div className="ss-fanout" key={i}>{s}</div>)}
              </div>
            )}

            {topSources.length > 0 && (
              <div className="ss-card">
                <div className="ss-h2">Sources Claude trusted</div>
                {topSources.map(([d, n]) => (
                  <div className="ss-srcrow" key={d}>
                    <span className="ss-srcname">{d}</span>
                    <span className="ss-srcbar"><span style={{ width: `${(n / maxSrc) * 100}%` }} /></span>
                    <span className="ss-srccount">{n}×</span>
                  </div>
                ))}
              </div>
            )}

            <div className="ss-card">
              <div className="ss-h2">Save this run</div>
              <p className="ss-hint" style={{ margin: "0 0 10px" }}>Copies today's Claude snapshots in data-kit schema — paste into data/{market.toLowerCase()}.json in the repo.</p>
              <button className="ss-btn ghost" style={{ marginTop: 0 }} onClick={copyExport}>{copied ? "Copied ✓" : "Copy snapshot JSON"}</button>
              <button className="ss-btn ghost" onClick={() => setExportOpen(!exportOpen)}>{exportOpen ? "Hide JSON" : "View JSON"}</button>
              {exportOpen && <textarea className="ss-export" readOnly value={buildExport()} />}
            </div>

            <button className="ss-btn ghost" onClick={() => { setPhase("setup"); setLiveRuns([]); setSenti(null); }}>Test another category</button>
          </>
        )}
      </div>
    </div>
  );
}
