import { html } from "../src/auth.js";

const PAGE = `<!doctype html>
<html lang="ur" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PACKSOL — لاگ اِن</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f4f8;font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq",Tahoma,sans-serif;color:#1d2733}
  .card{width:92%;max-width:380px;background:#fff;border-radius:14px;padding:26px 22px;box-shadow:0 6px 24px rgba(20,40,70,.12)}
  h1{margin:0 0 4px;font-size:22px;text-align:center}
  p.sub{margin:0 0 18px;text-align:center;color:#5b6b7c;font-size:14px}
  label{display:block;margin:12px 0 5px;font-size:14px}
  input{width:100%;padding:12px;border:1px solid #c5cfda;border-radius:9px;font-size:16px;direction:ltr;text-align:left}
  input:focus{outline:2px solid #2f6fdb;border-color:#2f6fdb}
  button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:9px;background:#2f6fdb;color:#fff;font-size:17px;cursor:pointer}
  button:disabled{opacity:.6}
  .msg{margin-top:14px;padding:10px 12px;border-radius:8px;font-size:14px;display:none}
  .msg.err{display:block;background:#fdecec;color:#a12626}
  .msg.warn{display:block;background:#fff4dd;color:#8a5a00}
</style>
</head>
<body>
<div class="card">
  <h1>کارٹن شیٹ کیلکولیٹر</h1>
  <p class="sub">اندر آنے کے لیے لاگ اِن کریں</p>
  <label for="u">یوزر ID</label>
  <input id="u" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
  <label for="p">پاسورڈ</label>
  <input id="p" type="password" autocomplete="current-password">
  <button id="go">لاگ اِن</button>
  <div id="m" class="msg"></div>
</div>
<script>
(function () {
  var m = document.getElementById("m");
  var go = document.getElementById("go");
  function show(text, cls) { m.textContent = text; m.className = "msg " + cls; }
  var e = new URLSearchParams(location.search).get("e");
  if (e === "expired") show("آپ کی استعمال کی مدت ختم ہو گئی ہے۔ مدت بڑھوانے کے لیے رابطہ کریں۔", "warn");
  if (e === "disabled") show("آپ کا اکاؤنٹ بند کر دیا گیا ہے۔ رابطہ کریں۔", "warn");

  function submit() {
    var u = document.getElementById("u").value.trim();
    var p = document.getElementById("p").value;
    if (!u || !p) { show("ID اور پاسورڈ دونوں لکھیں۔", "err"); return; }
    go.disabled = true;
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (x) {
      go.disabled = false;
      if (x.status === 200) { location.href = "/"; return; }
      var code = x.data && x.data.error;
      if (code === "WRONG") show("ID یا پاسورڈ غلط ہے۔", "err");
      else if (code === "TOO_MANY") show("بہت زیادہ غلط کوششیں۔ 15 منٹ بعد دوبارہ کوشش کریں۔", "err");
      else if (code === "expired") show("آپ کی استعمال کی مدت ختم ہو گئی ہے۔ رابطہ کریں۔", "warn");
      else if (code === "disabled") show("آپ کا اکاؤنٹ بند کر دیا گیا ہے۔ رابطہ کریں۔", "warn");
      else show("کچھ خرابی ہوئی۔ دوبارہ کوشش کریں۔", "err");
    }).catch(function () {
      go.disabled = false;
      show("انٹرنیٹ نہیں ہے یا سرور نہیں مل رہا۔", "err");
    });
  }
  go.addEventListener("click", submit);
  document.getElementById("p").addEventListener("keydown", function (ev) { if (ev.key === "Enter") submit(); });
  document.getElementById("u").addEventListener("keydown", function (ev) { if (ev.key === "Enter") document.getElementById("p").focus(); });
})();
</script>
</body>
</html>`;

export async function onRequestGet() {
  return html(PAGE);
}
