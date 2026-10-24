# Cobalt boshqaruvi: GitHub Pages + Cloudflare Worker + A7600C1

Sayt buyruqni HTTPS orqali Worker'ga jo'natadi. A7600C1 internetdan `/api/next` ni tekshiradi, buyruqni Uno'ga beradi va bajarilgach `/api/ack` bilan tasdiqlaydi. Buyruqlar navbatda saqlanadi; avtomobil modemi mobil internetga ulangan bo'lishi kerak. Bu yo'l SMS ishlatmaydi.

## 1. Cloudflare Worker'ni chiqarish

1. Cloudflare hisobiga kiring va kompyuterda Node.js LTS o'rnatilganini tekshiring.
2. PowerShell'da `cloudflare-bridge` papkasiga o'ting.
3. Wrangler'ni ishga tushiring: `npx wrangler login`.
4. Maxfiy, tasodifiy boshqaruv kaliti yarating (kamida 32 bayt): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Uni xavfsiz joyga yozib oling.
5. `npx wrangler secret put CONTROL_TOKEN` buyrug'ini bering va so'ralganda kalitni kiriting.
6. `npx wrangler deploy` bilan Worker va Durable Object'ni chiqaring. Buyruq oxirida berilgan `https://...workers.dev` manzilini saqlang.

Cloudflare'dagi Durable Object migratsiyasi `wrangler.toml` ichida bor. Worker va Durable Object hisobda yaratilgach, `workers.dev` hosti javob berishi kerak.

## 2. Modem va Arduino

- Uno D2 (RX) <- A7600 TX; Uno D3 (TX) -> A7600 RX uchun kerakli level-shifter; GND umumiy.
- LED'lar: D4 ignition holati, D5 lock holati, D6 unlock impulsi, D7 alarm, D8 trunk impulsi, D9-D11 qo'shimcha sinov.
- Har LED bilan 220-330 ohm rezistor ishlating. A7600'ni Uno 5V'dan quvvatlamang. Breakout platadagi quvvat va UART darajasini uning hujjatidan tekshiring.
- `a7600_cloudflare_control.ino` ichida `WORKER_HOST` qiymatiga `https://` siz Worker hostini, `CONTROL_TOKEN` ga 4-qadamdagi kalitni kiriting. `APN` qiymatini operatoringiz APN'iga almashtiring.
- Arduino IDE'da Uno tanlab sketchni yuklang. Serial Monitor 115200 baud.
- A7600 SIM'ida mobil internet/APN faol bo'lishi kerak. Tarifda internet paketi borligini ham tekshiring.

## 3. Sayt

1. Public saytni oching: `https://sunnatullohmuhammad.github.io/malibu-boshqaruv/`.
2. Yuqori o'ngdagi ulanish indikatorini bosing, Worker manzili va ayni maxfiy kalitni kiriting. Brauzer ularni shu telefondagi `localStorage` ichida saqlaydi.
3. Indikator `AVTOMOBIL ULAN...` bo'lsa, A7600 oxirgi 45 soniyada Worker'ga murojaat qilgan. Buyruq yuborilgach, holat yangilanishini kuting.

## 4. Hozirgi sinov chegarasi

Sketch faqat LED'lar uchun. D4/D5/D7 holat chiqishlari, D6/D8 600 ms impuls. Ularni hozircha avtomobilning starter, qulf yoki bagaj simlariga to'g'ridan-to'g'ri ulamang. Avtomobil relelariga o'tishdan oldin avtomobil sxemasi, relelarning to'g'ri turi, alohida himoya drayveri va sug'urta bilan elektr mutaxassisi tekshirishi kerak. D4'ning `START` signali bu bosqichda faqat LED'ni yoqadi, dvigatelni ishga tushirmaydi.

## Nosozlikni tekshirish

- Worker panelida `CONTROL_TOKEN` secret o'rnatilganini, Deploy muvaffaqiyatini tekshiring.
- Arduino Serial Monitor'da `+HTTPACTION` natijasi 200 bo'lishi, modemda LTE/data va to'g'ri APN bo'lishi kerak.
- Saytda `401` chiqsa: Worker secret, Arduino kaliti va saytga kiritilgan kalit bir xil emas.
- Saytda `ALOQA KUTILMOQDA` bo'lsa: Uno/modem quvvati, SIM interneti, APN, UART TX/RX va GND'ni tekshiring.
- Kalit oshkor bo'lsa, Cloudflare'da `npx wrangler secret put CONTROL_TOKEN` orqali yangisini o'rnating, sketchni qayta yuklang va telefon saytiga yangisini kiriting.

