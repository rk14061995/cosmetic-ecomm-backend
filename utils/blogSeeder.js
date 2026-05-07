require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const connectDB = require('../config/db');

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const posts = [
  {
    title: 'The Ultimate Korean Skincare Routine for Beginners',
    category: 'Skincare',
    tags: ['k-beauty', 'skincare routine', 'beginners', 'korean beauty'],
    excerpt: 'Unlock the secrets of the iconic 10-step Korean skincare routine. We break down every step — from double cleansing to sleeping masks — so you can build the perfect routine for your skin type.',
    content: `<h2>Why Korean Skincare Works</h2>
<p>Korean beauty philosophy is rooted in prevention rather than correction. Instead of treating skin problems after they appear, K-beauty focuses on maintaining a healthy skin barrier through consistent hydration and protection.</p>
<h2>Step 1: Oil Cleanser</h2>
<p>Start with an oil-based cleanser to dissolve sunscreen, makeup, and excess sebum. Massage gently for 60 seconds and rinse. This is the first step of the famous <strong>double cleanse</strong>.</p>
<h2>Step 2: Water-Based Cleanser</h2>
<p>Follow with a water-based foam or gel cleanser to remove any remaining impurities and sweat. This ensures a truly clean base for the rest of your routine.</p>
<h2>Step 3: Exfoliant (2–3x per week)</h2>
<p>Use a gentle chemical exfoliant — AHA for dry skin, BHA for oily or acne-prone skin. Never use a physical scrub more than once a week.</p>
<h2>Step 4: Toner</h2>
<p>Korean toners are hydrating, not astringent. Pat — don't rub — a watery toner into skin to restore pH and prep for absorption.</p>
<h2>Step 5: Essence</h2>
<p>The heart of K-beauty. An essence is a lightweight, deeply hydrating fluid packed with fermented ingredients that boost cell turnover and radiance.</p>
<h2>Step 6: Serums & Ampoules</h2>
<p>Target specific concerns with concentrated actives. Vitamin C for brightening, niacinamide for pores, retinol for anti-ageing.</p>
<h2>Step 7: Sheet Mask (2–3x per week)</h2>
<p>Sheet masks deliver an intense dose of hydration in 15–20 minutes. Pat in the remaining essence after removing — never rinse.</p>
<h2>Step 8: Eye Cream</h2>
<p>The eye area is the first to show ageing. Apply a dedicated eye cream with your ring finger — the weakest finger — to avoid tugging.</p>
<h2>Step 9: Moisturiser</h2>
<p>Seal in all your hard work with a moisturiser suited to your skin type. Gel for oily skin, cream for dry skin.</p>
<h2>Step 10: SPF (Morning Only)</h2>
<p>SPF is non-negotiable. Even on cloudy days, UV radiation causes 80% of visible ageing. Reach for at least SPF 30, ideally SPF 50+.</p>
<p>Start with the essentials — cleanser, toner, moisturiser, SPF — and add steps gradually as your skin adapts.</p>`,
  },
  {
    title: 'Hyaluronic Acid vs Niacinamide: Which Does Your Skin Need?',
    category: 'Skincare',
    tags: ['hyaluronic acid', 'niacinamide', 'ingredients', 'hydration', 'brightening'],
    excerpt: 'Two of the most talked-about skincare ingredients — but which one is right for you? We compare hyaluronic acid and niacinamide across hydration, brightening, pore care and more.',
    content: `<h2>The Power Duo of Modern Skincare</h2>
<p>If you've spent any time on skincare social media, you've seen these two names everywhere. Both are backed by extensive clinical research, both are gentle enough for daily use, and both are suitable for all skin types. But they work in very different ways.</p>
<h2>What is Hyaluronic Acid?</h2>
<p>Hyaluronic acid (HA) is a humectant — it draws moisture from the environment and deeper layers of skin to the surface. A single molecule can hold up to 1,000 times its weight in water, making it one of the most powerful hydrators in skincare.</p>
<p><strong>Best for:</strong> Dry, dehydrated, or sensitive skin. Any skin type that needs a moisture boost.</p>
<h2>What is Niacinamide?</h2>
<p>Niacinamide (Vitamin B3) is a multi-tasking ingredient that strengthens the skin barrier, visibly minimises pores, fades dark spots and hyperpigmentation, regulates sebum, and has anti-inflammatory properties.</p>
<p><strong>Best for:</strong> Oily, acne-prone skin, enlarged pores, uneven skin tone.</p>
<h2>Can You Use Both?</h2>
<p>Absolutely. They work on different skin concerns and layers — HA hydrates while niacinamide regulates and brightens. Layer HA first, then niacinamide, then your moisturiser.</p>
<h2>Which Should You Try First?</h2>
<p>If your skin feels tight, dull or flaky: start with HA. If your skin is oily, prone to breakouts or has visible pores: start with niacinamide. Most people eventually use both.</p>`,
  },
  {
    title: 'Best Sunscreens for Indian Skin Tones — Tested & Ranked',
    category: 'Skincare',
    tags: ['sunscreen', 'SPF', 'indian skin', 'sun protection', 'no white cast'],
    excerpt: 'Finding a sunscreen that doesn\'t leave a white cast on deeper skin tones has been a challenge — until now. We\'ve tested 10 popular sunscreens and ranked them for Indian skin.',
    content: `<h2>Why Sunscreen is Your #1 Anti-Ageing Product</h2>
<p>Dermatologists agree: if you can only use one skincare product, make it SPF. UV radiation is responsible for up to 80% of visible skin ageing — fine lines, dark spots, loss of elasticity — not to mention skin cancer risk.</p>
<h2>The White Cast Problem</h2>
<p>Traditional sunscreens, especially those with zinc oxide or titanium dioxide, can leave a chalky white residue on medium to deep Indian skin tones. This has historically made daily SPF use frustrating for many.</p>
<h2>Chemical vs Mineral vs Hybrid</h2>
<p><strong>Chemical sunscreens</strong> absorb UV rays and convert them to heat. They typically have no white cast but can irritate sensitive skin. <strong>Mineral sunscreens</strong> sit on skin and reflect UV rays — great for sensitive skin but prone to white cast. <strong>Hybrid sunscreens</strong> combine both for broad-spectrum protection with minimal cast.</p>
<h2>Top Picks for Indian Skin</h2>
<p><strong>1. Lightweight Fluid SPF 50+ (Chemical)</strong> — Zero white cast, matte finish, water-resistant for 80 minutes.</p>
<p><strong>2. Tinted Mineral Sunscreen (Hybrid)</strong> — Slight warmth tint neutralises any cast, perfect for wheatish to dusky tones.</p>
<p><strong>3. K-Beauty Tone-Up Sunscreen</strong> — Lavender-tinted formula that neutralises yellow undertones while protecting at SPF 50.</p>
<h2>Application Tips</h2>
<p>Use a nickel-sized amount (¼ teaspoon) for your face alone. Reapply every 2 hours if outdoors. Apply sunscreen as the last step of your morning skincare, before makeup.</p>`,
  },
  {
    title: 'Glass Skin: The Korean Beauty Secret to Luminous Skin',
    category: 'Skincare',
    tags: ['glass skin', 'k-beauty', 'glowing skin', 'radiance', 'hydration'],
    excerpt: 'Glass skin — the poreless, luminous, almost translucent complexion — is the ultimate K-beauty goal. Here\'s exactly how to achieve it with the right products and techniques.',
    content: `<h2>What is Glass Skin?</h2>
<p>The term "glass skin" (유리 피부 in Korean) refers to a complexion so smooth, clear and hydrated that it reflects light like glass. It's not about shine — it's about a deep, glowing translucency that comes from within.</p>
<h2>The Foundation: Barrier Health</h2>
<p>You cannot achieve glass skin without a healthy skin barrier. A compromised barrier causes dehydration, redness and uneven texture. Rebuild it with ceramides, fatty acids, and gentle cleansing.</p>
<h2>The Three Pillars of Glass Skin</h2>
<p><strong>1. Double Cleansing</strong> — Remove all traces of SPF and pollution. Any leftover impurities will sit under layers of moisture and cause congestion.</p>
<p><strong>2. Hydration Layering</strong> — Apply multiple thin layers of hydrating toners, essences and serums rather than one thick product. This technique builds water content deep within the skin.</p>
<p><strong>3. Occlusion</strong> — Seal everything in with a moisturiser that contains occlusives like squalane, shea butter, or dimethicone to prevent transepidermal water loss.</p>
<h2>Key Ingredients to Look For</h2>
<ul>
<li>Hyaluronic acid — deep hydration</li>
<li>Glycerin — draws moisture to skin</li>
<li>Snail mucin — repairs and brightens</li>
<li>Niacinamide — minimises pores and evens tone</li>
<li>Centella asiatica (Cica) — calms redness and strengthens barrier</li>
</ul>
<h2>The Glass Skin Routine</h2>
<p>Morning: oil cleanse → water cleanse → hydrating toner (patted in 3 layers) → essence → Vitamin C serum → moisturiser → SPF 50+. Evening: same through to step 5, then add retinol or AHA followed by sleeping mask.</p>`,
  },
  {
    title: '5-Minute Makeup for the Office: A Complete Guide',
    category: 'Makeup',
    tags: ['office makeup', 'quick makeup', 'no-makeup makeup', 'natural look', 'work'],
    excerpt: 'You don\'t need an hour in front of the mirror to look polished at work. This 5-minute makeup routine gives you a fresh, professional finish every single morning.',
    content: `<h2>The Philosophy: Enhance, Don't Mask</h2>
<p>A great office makeup look should enhance your features and give you a confidence boost — not look like you're going to a party at 9 AM. The goal is effortlessly put-together.</p>
<h2>Minute 1: Skin Prep & Base</h2>
<p>Apply a lightweight tinted moisturiser or BB cream with SPF. This takes care of your moisturiser, SPF and coverage in one step. For extra coverage on problem areas, dab a little concealer with your ring finger and blend edges.</p>
<h2>Minute 2: Eyes</h2>
<p>Curl your lashes (5 seconds per eye), then apply one coat of mascara to upper lashes only. This opens up the eyes without looking overdone. If your eyes need definition, run a light brown pencil along the upper waterline instead of eyeliner.</p>
<h2>Minute 3: Brows</h2>
<p>Well-groomed brows frame your entire face. Use a tinted brow gel or a quick pencil stroke to fill sparse areas. Brush upward and set with clear gel for a polished, natural look.</p>
<h2>Minute 4: Cheeks</h2>
<p>A cream blush or bronzer applied with your fingers is the fastest way to add warmth and life to your face. Smile and tap onto the apples of cheeks, blending upward toward temples.</p>
<h2>Minute 5: Lips</h2>
<p>A tinted lip balm or a swipe of your favourite lipstick gives you a finished look instantly. A rosy nude or MLBB (My Lips But Better) shade works for any office environment. No liner needed.</p>
<h2>The One Trick That Ties It All Together</h2>
<p>A tiny amount of highlighter on the inner corners of eyes, tip of nose and cupid's bow takes 20 seconds and makes you look wide-awake even on Monday morning.</p>`,
  },
  {
    title: 'How to Build a Skincare Routine for Oily & Acne-Prone Skin',
    category: 'Skincare',
    tags: ['oily skin', 'acne', 'skincare routine', 'breakouts', 'BHA'],
    excerpt: 'Oily, breakout-prone skin needs a different approach to skincare. Over-stripping your skin actually makes oiliness worse. Here\'s the correct routine, backed by dermatology.',
    content: `<h2>Why Oily Skin Needs Hydration Too</h2>
<p>This is the most common mistake with oily skin: skipping moisturiser. When skin is dehydrated, it overproduces oil to compensate. Keeping skin hydrated with lightweight, non-comedogenic products actually reduces oil production over time.</p>
<h2>The Golden Rule: Never Over-Strip</h2>
<p>Harsh cleansers, alcohol toners and frequent exfoliation destroy your skin barrier and trigger more sebum production — the exact opposite of what you want. Choose gentle, pH-balanced products.</p>
<h2>Morning Routine for Oily Skin</h2>
<p><strong>Step 1 — Cleanser:</strong> Gel or foaming cleanser with salicylic acid (BHA) or tea tree. Do not use soap.</p>
<p><strong>Step 2 — Toner:</strong> Hydrating, alcohol-free toner. Look for niacinamide, green tea, or witch hazel.</p>
<p><strong>Step 3 — Serum:</strong> Niacinamide 10% serum reduces pore appearance and regulates sebum. Use twice daily.</p>
<p><strong>Step 4 — Moisturiser:</strong> Water-gel or oil-free moisturiser. Never skip this step.</p>
<p><strong>Step 5 — SPF:</strong> Matte-finish sunscreen, SPF 50+.</p>
<h2>Evening Routine for Oily Skin</h2>
<p>Double cleanse to remove sunscreen and pollution. Use BHA exfoliant 3x per week in the evening. Add retinol 2–3x per week for long-term acne control and skin renewal.</p>
<h2>Spot Treatment Tips</h2>
<p>For active breakouts: apply a benzoyl peroxide (2.5%) or salicylic acid spot treatment directly to blemishes after toner. Use tea tree oil as a natural alternative. Never pop — it spreads bacteria and causes post-inflammatory hyperpigmentation.</p>`,
  },
  {
    title: 'The Complete Guide to Retinol: Benefits, Risks & How to Start',
    category: 'Skincare',
    tags: ['retinol', 'vitamin A', 'anti-ageing', 'acne', 'beginners'],
    excerpt: 'Retinol is dermatology\'s gold standard for anti-ageing and acne. But it\'s also the most misunderstood ingredient. Learn how to introduce it correctly and avoid the dreaded "retinol uglies".',
    content: `<h2>What is Retinol?</h2>
<p>Retinol is a derivative of Vitamin A and belongs to the retinoid family. It works by accelerating cell turnover, stimulating collagen production, and unclogging pores. It's clinically proven to reduce fine lines, improve texture, fade dark spots and treat acne.</p>
<h2>Retinol vs Retinoids: What's the Difference?</h2>
<p>Retinoids is the umbrella term. Retinol (OTC) is converted to retinoic acid in skin — it's gentler but slower. Tretinoin (prescription) is pure retinoic acid — faster results but more potential for irritation.</p>
<h2>How to Start: The Low and Slow Method</h2>
<p>Week 1–2: Apply a low concentration (0.025–0.05%) once a week, at night only. Weeks 3–4: Increase to twice a week. Month 2 onward: Gradually build to every other night, then nightly if tolerated.</p>
<h2>The Retinol Uglies: Why It Happens & How to Minimise It</h2>
<p>During the first 2–6 weeks, skin may purge — experiencing dryness, flaking and breakouts as skin cell turnover accelerates. This is normal and temporary. Apply a thick moisturiser after retinol ("sandwich method") to buffer irritation.</p>
<h2>Rules You Must Follow</h2>
<ul>
<li>Always use SPF 50+ the next morning — retinol increases sun sensitivity</li>
<li>Never mix with AHA/BHA on the same night</li>
<li>Do not use during pregnancy</li>
<li>Store in a dark, cool place — retinol degrades in light and heat</li>
</ul>
<h2>When Will You See Results?</h2>
<p>Texture improvement: 4–6 weeks. Pore reduction: 8 weeks. Fine lines and pigmentation: 12+ weeks. Consistency is everything — retinol only works if used regularly.</p>`,
  },
  {
    title: 'Hair Oiling: The Ancient Indian Ritual That Actually Works',
    category: 'Haircare',
    tags: ['hair oiling', 'hair care', 'coconut oil', 'hair growth', 'scalp health'],
    excerpt: 'Hair oiling has been practised in India for thousands of years — and modern trichology is now validating it. Here\'s which oils to use, how often, and the right technique.',
    content: `<h2>The Science Behind Hair Oiling</h2>
<p>Hair oiling works through several mechanisms: oils penetrate the hair shaft to reduce protein loss during washing, they moisturise the scalp to prevent dandruff and itchiness, and the massage stimulates blood circulation to hair follicles — promoting growth.</p>
<h2>The Best Oils for Different Hair Concerns</h2>
<p><strong>Coconut oil</strong> — The most extensively studied. Reduces protein loss, deeply penetrates the hair shaft, prevents hygral fatigue (damage from repeated wetting and drying). Best for thick, coarse or protein-deficient hair.</p>
<p><strong>Argan oil</strong> — Rich in Vitamin E and fatty acids. Adds shine, controls frizz, and protects against heat damage. Ideal for colour-treated or dry, frizzy hair.</p>
<p><strong>Castor oil</strong> — Thick and rich in ricinoleic acid. Promotes hair growth, strengthens roots, reduces breakage. Mix with lighter oil for easier application.</p>
<p><strong>Bhringraj oil</strong> — An Ayurvedic classic. Traditionally used to prevent premature greying and stimulate growth. Often infused in sesame oil.</p>
<h2>How to Oil Correctly</h2>
<p>Warm the oil slightly (test on wrist). Section hair and apply directly to scalp with fingertips. Massage in circular motions for 5–10 minutes to stimulate blood flow. Distribute remaining oil through lengths. Leave for minimum 30 minutes or overnight. Shampoo twice to ensure thorough removal.</p>
<h2>How Often?</h2>
<p>Once a week for most hair types. Those with fine hair may prefer once a fortnight as oils can weigh hair down.</p>`,
  },
  {
    title: '10 Monsoon Skincare Mistakes You\'re Probably Making',
    category: 'Skincare',
    tags: ['monsoon skincare', 'humidity', 'skincare mistakes', 'summer skincare', 'oily skin'],
    excerpt: 'The monsoon season completely changes your skin\'s needs. High humidity, sweat and pollution create unique challenges. Avoid these 10 common mistakes to keep your skin clear all season.',
    content: `<h2>Why Monsoon Changes Your Skin</h2>
<p>High humidity during monsoon means your skin's moisture barrier gets overwhelmed. Sweat mixes with pollution and oil, blocking pores. At the same time, air conditioning indoors can create paradoxical dehydration. Your skincare needs to adapt.</p>
<h2>Mistake 1: Using Your Winter Moisturiser</h2>
<p>Thick creams and heavy moisturisers sit on top of skin in humid conditions and cause congestion. Switch to lightweight water gels or gel-creams that absorb quickly.</p>
<h2>Mistake 2: Skipping SPF Because It's Cloudy</h2>
<p>Clouds block only 20% of UV rays. UV-A (ageing rays) penetrate cloud cover completely. SPF is non-negotiable year-round.</p>
<h2>Mistake 3: Over-Cleansing</h2>
<p>Washing your face more than twice a day strips your natural oils, triggering even more sebum production. Stick to twice daily, with a gentle, non-stripping cleanser.</p>
<h2>Mistake 4: Skipping Toner</h2>
<p>A good toner after cleansing restores skin pH and preps skin for better product absorption. Choose a hydrating, alcohol-free formula.</p>
<h2>Mistake 5: Touching Your Face</h2>
<p>Humidity means sweat and bacteria transfer much faster. Touching your face with unwashed hands during monsoon is a direct cause of breakouts.</p>
<h2>Mistake 6: Not Changing Your Pillowcase</h2>
<p>Change pillowcases every 2–3 days during monsoon. Humidity and sweat make them a breeding ground for bacteria overnight.</p>
<h2>Mistake 7: Ignoring Your Neck and Décolletage</h2>
<p>These areas get sun exposure and sweat just as much as your face. Extend your SPF and moisturiser to your neck daily.</p>`,
  },
  {
    title: 'Vitamin C in Skincare: The Complete Guide to Brightening Your Skin',
    category: 'Skincare',
    tags: ['vitamin C', 'brightening', 'dark spots', 'antioxidant', 'serum'],
    excerpt: 'Vitamin C is the gold-standard brightening ingredient — but it\'s also one of the most unstable. Learn how to choose the right form, use it correctly, and actually see results.',
    content: `<h2>Why Vitamin C Is Worth the Hype</h2>
<p>L-Ascorbic Acid (Vitamin C) does three things brilliantly: it neutralises free radical damage from UV and pollution, it inhibits melanin production to fade dark spots and hyperpigmentation, and it stimulates collagen synthesis to firm and plump skin.</p>
<h2>The Problem With Vitamin C</h2>
<p>Pure Vitamin C (L-Ascorbic Acid) is highly unstable. It oxidises when exposed to air, heat and light — turning yellow-orange and losing efficacy. A product that has changed colour has degraded and will not work.</p>
<h2>The Different Forms of Vitamin C</h2>
<p><strong>L-Ascorbic Acid</strong> — Most potent, fastest acting. Best at pH 3–3.5. Can irritate sensitive skin. Look for 10–20% concentration.</p>
<p><strong>Ascorbyl Glucoside</strong> — Stable, gentle, converts to Vitamin C in skin. Slower results but tolerable for sensitive types.</p>
<p><strong>Sodium Ascorbyl Phosphate</strong> — Water-soluble, stable, gentle. Particularly good for acne-prone skin as it has anti-bacterial properties.</p>
<h2>How to Use Vitamin C</h2>
<p>Apply in the morning after cleansing and toning, before moisturiser and SPF. It works synergistically with SPF — together they provide far greater protection than either alone. Start with every other day to assess tolerance, then build to daily use.</p>
<h2>What NOT to Mix With Vitamin C</h2>
<p>Do not layer Vitamin C with niacinamide on the same step (use them at different times or products). Avoid pairing with AHAs/BHAs at the same time as the low pH can cause irritation.</p>`,
  },
  {
    title: 'The Truth About K-Beauty Sheet Masks: Do They Actually Work?',
    category: 'Skincare',
    tags: ['sheet mask', 'k-beauty', 'hydration', 'ingredients', 'anti-ageing'],
    excerpt: 'Sheet masks are a K-beauty staple, but with thousands of options at every price point, it\'s hard to know if they\'re worth it. We explore the science and give you our honest verdict.',
    content: `<h2>What Actually Happens When You Use a Sheet Mask</h2>
<p>A sheet mask works through occlusion — the physical mask creates a seal against skin that prevents the active ingredients in the essence from evaporating. This forces deeper absorption than a leave-on serum would achieve in the same time period.</p>
<h2>The Key Ingredients That Make a Difference</h2>
<p><strong>Hyaluronic Acid</strong> — Plumps and hydrates. You'll see immediate results within 20 minutes.</p>
<p><strong>Niacinamide</strong> — Reduces pigmentation and strengthens barrier with regular use over weeks.</p>
<p><strong>Galactomyces</strong> — A fermented yeast filtrate used in iconic K-beauty products. Brightens and refines texture.</p>
<p><strong>EGF (Epidermal Growth Factor)</strong> — Found in premium K-beauty masks. Signals cells to regenerate and repair.</p>
<h2>How to Get Maximum Results</h2>
<p>Cleanse thoroughly before masking. Apply on damp skin for better absorption. Leave for 15–20 minutes only — leaving longer causes the mask to start drawing moisture BACK from skin. Pat (never rub) remaining essence into skin. Follow with moisturiser while skin is still slightly tacky.</p>
<h2>How Often Should You Mask?</h2>
<p>2–3 times per week is the sweet spot. Daily masking is safe but not necessarily more effective — the ingredients need time to do their work.</p>
<h2>Our Verdict</h2>
<p>Sheet masks absolutely work for an immediate hydration and glow boost. They're not a replacement for a consistent routine — but as a weekly treatment or pre-event skin prep, they deliver real, visible results.</p>`,
  },
  {
    title: 'Slugging: The K-Beauty Trend That\'ll Transform Dry Skin Overnight',
    category: 'Skincare',
    tags: ['slugging', 'petrolatum', 'overnight', 'dry skin', 'skin barrier'],
    excerpt: '"Slugging" — applying petroleum jelly as the last step of your skincare — has taken TikTok and Reddit by storm. But is it right for your skin? We break down exactly who should (and shouldn\'t) try it.',
    content: `<h2>What Is Slugging?</h2>
<p>Slugging refers to the practice of applying a thin layer of petroleum jelly (Vaseline) or a similar occlusive ointment as the very last step of your nighttime skincare routine. The name comes from the "slug-like" shiny appearance it creates on skin.</p>
<h2>How It Works</h2>
<p>Petroleum jelly is an occlusive — it doesn't add moisture to skin, but it creates an impermeable barrier that prevents transepidermal water loss (TEWL). By trapping all the moisture and active ingredients you've applied underneath, it allows them to absorb fully overnight.</p>
<h2>The Benefits</h2>
<p>Overnight slugging can dramatically reduce flakiness and tightness in dry skin. It speeds barrier repair after overuse of actives (retinol, AHAs). It's fragrance-free, hypoallergenic, and non-comedogenic when used correctly.</p>
<h2>Who Should NOT Slug</h2>
<p>Oily and acne-prone skin types should avoid full-face slugging — while petrolatum itself is non-comedogenic, it can trap sebum and bacteria on the surface of already-congested skin and worsen breakouts. Stick to spot application on dry patches.</p>
<h2>How to Do It Correctly</h2>
<p>Complete your full routine — cleanser, toner, essences, serums, eye cream, moisturiser. Apply a very thin layer of pure petroleum jelly (avoid versions with added fragrance). Use on 2–3 nights per week, not every night. Change pillowcases more frequently.</p>`,
  },
  {
    title: 'How to Choose the Right Foundation for Your Skin Tone',
    category: 'Makeup',
    tags: ['foundation', 'skin tone', 'undertone', 'shade matching', 'coverage'],
    excerpt: 'Finding your perfect foundation shade is half chemistry, half art. Understanding undertones, coverage levels and finishes will help you find the match that makes you look like yourself — just better.',
    content: `<h2>Step 1: Understand Your Undertone</h2>
<p>Your skin tone (light, medium, dark) and undertone (warm, cool, neutral) are different things. Undertone is the underlying hue that shows through — and it determines which foundation shades will look natural on you.</p>
<p><strong>Warm undertones:</strong> Veins appear greenish. Gold jewellery suits you better. You tan easily.</p>
<p><strong>Cool undertones:</strong> Veins appear bluish-purple. Silver jewellery suits you better. You burn before you tan.</p>
<p><strong>Neutral undertones:</strong> Veins appear blue-green. Both gold and silver work. You may have both warm and cool areas on your face.</p>
<h2>Step 2: Choose the Right Coverage</h2>
<p><strong>Sheer/Light:</strong> Evens tone while letting freckles and natural skin show. Best for naturally good skin that just needs a little help.</p>
<p><strong>Medium:</strong> Covers minor redness and spots while still looking like skin. Most versatile option for everyday wear.</p>
<p><strong>Full:</strong> Covers everything — acne, scars, hyperpigmentation. Requires skill to apply naturally.</p>
<h2>Step 3: Choose the Right Finish</h2>
<p><strong>Matte</strong> — Great for oily skin and long wear. Can look flat on dry skin. <strong>Satin/Natural</strong> — Works for all skin types. <strong>Dewy/Luminous</strong> — Gives a glowing, hydrated look. Best for normal to dry skin.</p>
<h2>The Shade-Matching Rule</h2>
<p>Always test foundation on your jawline — not your hand or wrist. Your face and body are often different shades. The correct shade should disappear into your skin in natural light.</p>`,
  },
  {
    title: 'Lip Care 101: How to Get Soft, Smooth Lips Year-Round',
    category: 'Makeup',
    tags: ['lip care', 'chapped lips', 'lip mask', 'hydration', 'exfoliation'],
    excerpt: 'Chapped, dry lips affect everyone — but they\'re completely preventable with the right routine. Here\'s our complete guide to healthy, soft lips through every season.',
    content: `<h2>Why Lips Get Dry</h2>
<p>Unlike the rest of your skin, lips have no sebaceous (oil) glands. They cannot produce their own moisture, making them entirely dependent on external hydration. They also have a very thin stratum corneum (outer layer), making them highly vulnerable to dehydration, UV damage and irritants.</p>
<h2>The 3-Step Lip Care Routine</h2>
<p><strong>Step 1 — Exfoliate:</strong> Use a lip scrub or a soft toothbrush in gentle circular motions once or twice a week. This removes dead skin buildup that prevents lip balm from absorbing. Never aggressively pick dry skin — it damages the new skin underneath.</p>
<p><strong>Step 2 — Treat:</strong> Apply a lip mask or thick lip balm immediately after exfoliating. Look for hyaluronic acid, ceramides, shea butter, or lanolin. K-beauty lip sleeping masks (applied overnight) are particularly effective.</p>
<p><strong>Step 3 — Protect:</strong> Use a tinted lip balm with SPF 30 during the day. UV exposure is a major cause of lip darkening and premature ageing around the mouth.</p>
<h2>Ingredients to Look For (and Avoid)</h2>
<p><strong>Look for:</strong> Lanolin, shea butter, ceramides, glycerin, vitamin E, petrolatum.</p>
<p><strong>Avoid:</strong> Menthol, camphor and phenol in lip balms — they create a cooling sensation that feels refreshing but actually cause dependence and more chapping over time.</p>
<h2>Lifestyle Tips</h2>
<p>Breathe through your nose, not your mouth. Stay hydrated. Avoid licking your lips — saliva evaporates and takes moisture with it. Replace your lip balm if it has been open for more than 12 months.</p>`,
  },
  {
    title: 'Natural Ingredients in Skincare: What\'s Backed by Science',
    category: 'Skincare',
    tags: ['natural skincare', 'ingredients', 'aloe vera', 'turmeric', 'green tea'],
    excerpt: 'Not all "natural" ingredients are effective, and not all effective ingredients are "natural". We sort through the noise and identify which plant-based skincare ingredients are genuinely backed by dermatological research.',
    content: `<h2>Natural ≠ Better (And That\'s Okay)</h2>
<p>The word "natural" in beauty marketing often triggers an assumption of safety and efficacy. In reality, some natural ingredients (like essential oils) are common allergens, while some synthetic ingredients (like niacinamide) are extraordinarily gentle and effective. Science is the arbiter — not origin.</p>
<h2>Evidence-Backed Natural Ingredients</h2>
<p><strong>Aloe Vera</strong> — Clinically proven to soothe irritation, reduce UV-induced inflammation, and provide lightweight hydration. Excellent for sensitive and reactive skin. Look for it in the top 3 ingredients for meaningful concentration.</p>
<p><strong>Green Tea (EGCG)</strong> — Powerful antioxidant that protects against UV-induced DNA damage, reduces redness and has anti-inflammatory properties. Effective in concentrations of 1–3%.</p>
<p><strong>Neem</strong> — Antibacterial and anti-inflammatory. Clinically shown to reduce acne-causing bacteria. Available in face washes and targeted treatments.</p>
<p><strong>Turmeric (Curcumin)</strong> — Anti-inflammatory and antioxidant in studies. However, topical bioavailability is poor — it needs to be in a formulation designed to enhance skin penetration to be effective.</p>
<p><strong>Bakuchiol</strong> — A plant-derived compound that mimics retinol's effects on collagen production and cell renewal, without the irritation. Backed by multiple clinical studies. Suitable for sensitive skin and during pregnancy (unlike retinol).</p>
<p><strong>Rosehip Oil</strong> — Contains trans-retinoic acid (Vitamin A), linoleic and linolenic acids. Clinical studies show improved hyperpigmentation and texture with 12 weeks of use.</p>
<h2>What to Be Cautious About</h2>
<p>Essential oils (lavender, citrus, peppermint) are among the most common causes of contact dermatitis. Lemon juice on skin is a myth that causes chemical burns in sunlight. "Pure" coconut oil on face can cause breakouts in acne-prone individuals.</p>`,
  },
  {
    title: 'Fragrance in Skincare: The Hidden Ingredient Causing Your Skin Problems',
    category: 'Skincare',
    tags: ['fragrance', 'sensitive skin', 'skincare ingredients', 'skin irritation', 'clean beauty'],
    excerpt: 'Fragrance is the #1 cause of allergic contact dermatitis from skincare products — and it hides under dozens of different names. Here\'s how to identify it and why you might want to eliminate it.',
    content: `<h2>Why Fragrance in Skincare Is Controversial</h2>
<p>Fragrance makes skincare products smell appealing and masks the sometimes-unpleasant odour of active ingredients. But it's also one of the most common causes of skin sensitisation, contact dermatitis and long-term barrier damage. If you have reactive, sensitive or acne-prone skin, fragrance may be the culprit you've been overlooking.</p>
<h2>The Hidden Names for Fragrance</h2>
<p>On ingredient labels, fragrance can appear as: "fragrance", "parfum", "linalool", "limonene", "geraniol", "citronellol", "benzyl alcohol", "eugenol", and many more. The EU's Scientific Committee on Consumer Safety lists 26 fragrance allergens that must be individually disclosed at concentrations above 0.001% in leave-on products.</p>
<h2>Who Is Most at Risk</h2>
<p>People with eczema, rosacea, perioral dermatitis, or a history of skin allergies are most likely to react to fragranced skincare. However, sensitisation can develop over time even in those without a previous history — the immune system can be triggered after years of exposure.</p>
<h2>How to Go Fragrance-Free</h2>
<p>Check every product in your routine — cleanser, toner, serum, moisturiser, sunscreen. The closer to the end of an ingredient list a fragrance appears, the lower its concentration — but even trace amounts can trigger sensitisation in reactive individuals.</p>
<h2>Transitioning to Fragrance-Free</h2>
<p>Switch products one at a time to identify which (if any) caused reactions. Allow 4 weeks per product change to accurately assess your skin's response. Look for the labels "fragrance-free" (no fragrance added) rather than "unscented" (which can mean fragrance was used to mask other smells).</p>`,
  },
  {
    title: 'Under-Eye Circles: Causes, Myths and Treatments That Actually Work',
    category: 'Skincare',
    tags: ['dark circles', 'eye cream', 'under-eye', 'pigmentation', 'puffiness'],
    excerpt: 'Dark circles are one of the most common skin concerns — and one of the most misunderstood. Knowing the cause of YOUR dark circles is key to choosing the right treatment.',
    content: `<h2>Not All Dark Circles Are the Same</h2>
<p>This is the most important thing to understand: dark circles have multiple causes, and the wrong treatment for your specific type will do nothing. You need to identify your cause first.</p>
<h2>Type 1: Pigmentation (Brown Dark Circles)</h2>
<p>Caused by excess melanin from sun exposure, genetics (common in South Asian skin tones), or post-inflammatory hyperpigmentation from rubbing eyes. The discolouration appears brown.</p>
<p><strong>Treatment:</strong> SPF under-eye every morning. Vitamin C or kojic acid eye cream. Niacinamide. Retinol eye cream at night. Results take 8–12 weeks.</p>
<h2>Type 2: Vascular (Blue/Purple Dark Circles)</h2>
<p>Caused by thin skin revealing the underlying blood vessels. More common in fair or cool-toned skin. Worsened by fatigue, dehydration and allergies (which cause blood vessel dilation).</p>
<p><strong>Treatment:</strong> Caffeine eye cream reduces vasodilation and puffiness. Retinol thickens skin over time. Staying hydrated and managing allergies helps significantly.</p>
<h2>Type 3: Structural (Hollow Dark Circles)</h2>
<p>Caused by loss of volume in the tear trough area — a shadow is created, not actual pigmentation. This is more a structural issue than a skin one, and worsens with age as fat pads in the face shift.</p>
<p><strong>Treatment:</strong> Eye creams with peptides and hyaluronic acid can help plump the area mildly. For significant hollowing, under-eye fillers are the most effective option.</p>
<h2>Universal Tips That Help All Types</h2>
<p>Sleep 7–9 hours with head slightly elevated. Remove makeup gently — never rub. Stay hydrated. Cold spoons or cucumber on eyes reduces puffiness temporarily. Apply eye cream with your ring finger — minimal pressure.</p>`,
  },
  {
    title: 'Body Care Routine: How to Get Glowing Skin From Neck to Toe',
    category: 'Skincare',
    tags: ['body care', 'body lotion', 'exfoliation', 'body glow', 'dry skin'],
    excerpt: 'We invest time and money in our face routine — but our body deserves the same care. A simple, consistent body care routine can give you noticeably smoother, softer and more radiant skin all over.',
    content: `<h2>Why Body Skin Needs as Much Attention as Your Face</h2>
<p>The skin on your body is subject to the same ageing processes, environmental damage and dehydration as facial skin — but most people only moisturise when skin is noticeably dry. A proactive routine pays dividends in texture, tone and overall skin health.</p>
<h2>Step 1: Exfoliate 2–3x Per Week</h2>
<p>Use a body scrub or dry brush before showering to remove dead skin cells that cause rough texture and prevent moisturiser from absorbing. Focus on elbows, knees, heels and back of arms.</p>
<p><strong>Chemical alternative:</strong> A body lotion containing AHA (glycolic or lactic acid) used nightly is gentler and more consistent than manual scrubbing.</p>
<h2>Step 2: Shower Smart</h2>
<p>Use lukewarm (not hot) water — hot showers strip the skin barrier. Limit showers to 5–10 minutes. Use a gentle, fragrance-free body wash rather than soap, which can be highly alkaline and drying.</p>
<h2>Step 3: Moisturise Within 3 Minutes</h2>
<p>Pat skin dry (don't rub) and apply body lotion or oil within 3 minutes of stepping out of the shower. This is the "3-minute rule" — skin is still slightly damp and products absorb up to 70% more effectively.</p>
<h2>Key Ingredients for Body Skin</h2>
<p><strong>For dry skin:</strong> Shea butter, ceramides, glycerin, hyaluronic acid. <strong>For rough texture:</strong> Lactic acid, urea (for very rough or keratosis pilaris-prone skin). <strong>For dull skin:</strong> Body oil with vitamin E and rosehip.</p>
<h2>Don't Forget SPF on Exposed Areas</h2>
<p>Arms, hands, décolletage and back of neck age fastest due to chronic sun exposure. Extend your facial SPF routine to these areas, or use a dedicated body SPF on sun-exposed days.</p>`,
  },
  {
    title: 'How to Layer Skincare Products: The Correct Order, Explained',
    category: 'Skincare',
    tags: ['skincare routine', 'layering', 'product order', 'beginners', 'absorption'],
    excerpt: 'Applying skincare in the wrong order doesn\'t just reduce efficacy — it can cause irritation and waste expensive products. Here\'s the definitive guide to layering your skincare correctly.',
    content: `<h2>The Golden Rule: Thinnest to Thickest</h2>
<p>The fundamental principle of skincare layering is to apply products in order of their consistency — from the most watery/lightweight to the most rich and occlusive. This ensures each product can absorb into skin rather than sitting on top of a barrier created by a heavier product.</p>
<h2>The Correct Layering Order</h2>
<p><strong>1. Cleanser</strong> — Always the first step. Removes the canvas for everything to follow. Oil cleanser first if wearing SPF or makeup.</p>
<p><strong>2. Toner / Mist</strong> — Applied to damp skin. Restores pH and preps skin for better absorption of subsequent products.</p>
<p><strong>3. Essence</strong> — Lightest active treatment step. Fermented ingredients work best close to skin before other actives.</p>
<p><strong>4. Serums / Ampoules</strong> — Targeted treatments in water-gel texture. Apply from most important to least. Water-based serums before oil-based.</p>
<p><strong>5. Spot Treatments</strong> — Apply directly to problem areas before moisturiser to maximise contact with skin.</p>
<p><strong>6. Eye Cream</strong> — Applied with ring finger. Goes before moisturiser so it can be absorbed before being occluded.</p>
<p><strong>7. Moisturiser</strong> — Seals in everything below and provides essential hydration and barrier support.</p>
<p><strong>8. Face Oil (optional)</strong> — Goes over moisturiser as a final occlusive seal. Cannot penetrate below water-based products.</p>
<p><strong>9. SPF (morning only)</strong> — The final step in the morning, always.</p>
<h2>The Wait Time Question</h2>
<p>You don't need to wait 30 minutes between steps. A 30-second wait for each product to partially absorb is sufficient for most formulations. The exception is prescription-strength actives (tretinoin) which some dermatologists recommend applying to completely dry skin.</p>`,
  },
];

async function seedBlogs() {
  try {
    await connectDB();
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) { console.error('Run main seeder first to create admin user'); process.exit(1); }

    await Blog.deleteMany({});
    console.log('Cleared existing blog posts');

    for (const post of posts) {
      const slug = slugify(post.title) + '-' + Date.now().toString(36).slice(-4);
      await Blog.create({
        ...post,
        slug,
        author: admin._id,
        published: true,
        views: Math.floor(Math.random() * 2000) + 100,
      });
    }

    console.log(`\n✅ Seeded ${posts.length} blog posts successfully!\n`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedBlogs();
