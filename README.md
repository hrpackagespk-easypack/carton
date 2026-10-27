# Render پر کارٹن کیلکولیٹر

یہ فولڈر آپ کے موجودہ اردو carton calculator کا Render ورژن ہے۔ انٹرفیس Render سے آتا ہے اور حساب `/api/calc` پر سرور میں ہوتا ہے۔ `render.yaml` repository کے اصل فولڈر میں موجود ہے اور اسی فولڈر کو Render پر deploy کرتا ہے۔

## تعیناتی

1. Render کھولیں اور **New → Blueprint** منتخب کریں۔
2. GitHub کی `hrpackagespk-easypack/carton` repository جوڑیں؛ Render اصل فولڈر کا `render.yaml` پڑھے گا۔
3. Singapore region اور free compute plan پہلے سے blueprint میں مقرر ہیں۔ Render کی دکھائی ہوئی `onrender.com` URL کھول کر calculator دیکھیں۔
4. اگر مفت سروس کو بیدار رکھنا ہے تو کسی بیرونی uptime monitor میں `https://آپ-کا-render-ربط/health` درج کریں اور وقفہ 10 منٹ رکھیں۔ صرف Render کا اندرونی health check اس کام کے لیے نہیں ہے۔ مسلسل استعمال میں یہ مفت سروس ماہانہ 750 سرور گھنٹے استعمال کرتی ہے، جو workspace کی دوسری مفت خدمات کے ساتھ مشترک ہوتے ہیں۔

## کلائنٹ کا ڈیٹا

Costings، نرخ، محفوظ شدہ ریکارڈ اور صارف کی ترجیحات اسی براؤزر کے `localStorage` میں رہتی ہیں؛ کوئی ڈیٹابیس نہیں۔ GitHub Pages اور Render کے ربط الگ ویب پتے ہیں، اس لیے GitHub Pages میں پہلے سے محفوظ ریکارڈ Render والے ربط پر خود منتقل نہیں ہوں گے۔ کلائنٹس کو نیا Render ربط دینا ہوگا۔

حساب کے inputs ہر حساب کے وقت Render کو بھیجے جاتے ہیں۔ API پر الگ پاس ورڈ نہیں، اس لیے اسے عوامی calculator سمجھیں؛ اس نسخے میں ان inputs کو ڈیٹابیس یا مستقل فائل میں محفوظ نہیں کیا جاتا۔