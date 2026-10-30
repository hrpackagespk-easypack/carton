import { html } from "../src/auth.js";

const PAGE = `<!doctype html>
<html lang="ur" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ایڈمن — یوزر</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f1f4f8;font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq",Tahoma,sans-serif;color:#1d2733;padding:14px}
  .wrap{max-width:760px;margin:0 auto}
  h1{font-size:21px;margin:6px 0 14px}
  .card{background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 3px 14px rgba(20,40,70,.09)}
  label{display:block;margin:10px 0 4px;font-size:14px}
  input{width:100%;padding:11px;border:1px solid #c5cfda;border-radius:8px;font-size:16px;direction:ltr;text-align:left}
  button{padding:9px 13px;border:0;border-radius:8px;background:#2f6fdb;color:#fff;font-size:14px;cursor:pointer;font-family:inherit}
  button.gray{background:#6b7a8a}
  button.red{background:#c0392b}
  button.green{background:#2a8a4a}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}
  .row>div{flex:1;min-width:120px}
  .user{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;border-top:1px solid #e3e8ee;padding:12px 0}
  .user:first-child{border-top:0}
  .name{font-size:17px;direction:ltr;font-weight:bold}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;margin-inline-start:6px}
  .ok{background:#e2f5e8;color:#1c6b36}.bad{background:#fdecec;color:#a12626}.off{background:#e9ecef;color:#555}
  .acts{display:flex;gap:6px;flex-wrap:wrap}
  .msg{margin-top:10px;padding:10px;border-radius:8px;font-size:14px;display:none}
  .msg.err{display:block;background:#fdecec;color:#a12626}
  .msg.good{display:block;background:#e2f5e8;color:#1c6b36;white-space:pre-line;direction:ltr;text-align:left}
  .top{display:flex;justify-content:space-between;align-items:center}
  .hide{display:none}
  .muted{color:#5b6b7c;font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><h1>یوزر مینجمنٹ</h1><button id="out" class="gray hide">باہر نکلیں</button></div>

  <div id="loginBox" class="card hide">
    <label for="ap">ایڈمن پاسورڈ</label>
    <input id="ap" type="password" autocomplete="current-password">
    <div style="margin-top:12px"><button id="aGo">اندر آئیں</button></div>
    <div id="lm" class="msg"></div>
  </div>

  <div id="panel" class="hide">
    <div class="card">
      <b>نیا یوزر بنائیں</b>
      <div class="row">
        <div><label for="nu">یوزر ID</label><input id="nu" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="مثلاً ali"></div>
        <div><label for="np">پاسورڈ</label><input id="np" placeholder="کم از کم 6 حروف"></div>
        <div style="max-width:110px"><label for="nd">دن</label><input id="nd" type="number" min="1" max="366" value="30"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="gen" class="gray">پاسورڈ خود بنائیں</button>
        <button id="mk">یوزر بنائیں</button>
      </div>
      <div id="cm" class="msg"></div>
      <button id="cp" class="green hide" style="margin-top:8px">لنک اور لاگ اِن کاپی کریں</button>
    </div>

    <div class="card">
      <b>موجودہ یوزر</b>
      <div id="list" class="muted" style="margin-top:8px">لوڈ ہو رہا ہے…</div>
    </div>
  </div>
</div>
<script>
(function () {
  function $(id) { return document.getElementById(id); }
  var lastShare = "";

  function api(body) {
    return fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    });
  }
  function note(el, text, cls) { el.textContent = text; el.className = "msg " + cls; }
  function showLogin() { $("loginBox").className = "card"; $("panel").className = "hide"; $("out").className = "gray hide"; }
  function showPanel() { $("loginBox").className = "card hide"; $("panel").className = ""; $("out").className = "gray"; load(); }

  var errText = {
    EXISTS: "یہ ID پہلے سے موجود ہے۔",
    BAD_USERNAME: "ID میں صرف چھوٹے انگریزی حروف، ہندسے اور . _ - ہوں، 3 سے 30 حروف۔",
    BAD_PASSWORD: "پاسورڈ کم از کم 6 حروف کا ہو۔",
    BAD_DAYS: "دن 1 سے 366 کے درمیان ہوں۔",
    TOO_MANY: "بہت زیادہ غلط کوششیں۔ 15 منٹ بعد کوشش کریں۔",
    WRONG: "پاسورڈ غلط ہے۔",
    NOT_CONFIGURED: "سیٹنگ مکمل نہیں (KV یا سیکریٹ نہیں لگے)۔",
    NOT_FOUND: "یوزر نہیں ملا۔",
    BAD_DEVICES: "ڈیوائسز 1 سے 5 کے درمیان ہوں۔"
  };
  function errOf(x) { return errText[x.data && x.data.error] || "کچھ خرابی ہوئی۔"; }

  function fmtDate(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function load() {
    api({ action: "list" }).then(function (x) {
      if (x.status === 401) { showLogin(); return; }
      var box = $("list");
      box.textContent = "";
      var users = (x.data && x.data.users) || [];
      var now = (x.data && x.data.now) || Date.now();
      if (!users.length) { box.textContent = "ابھی کوئی یوزر نہیں۔"; return; }
      users.forEach(function (u) {
        var left = Math.ceil((u.expires - now) / 86400000);
        var row = document.createElement("div"); row.className = "user";
        var info = document.createElement("div");
        var nm = document.createElement("span"); nm.className = "name"; nm.textContent = u.username;
        var bd = document.createElement("span"); bd.className = "badge";
        if (u.disabled) { bd.className += " off"; bd.textContent = "بند"; }
        else if (left <= 0) { bd.className += " bad"; bd.textContent = "مدت ختم"; }
        else { bd.className += " ok"; bd.textContent = left + " دن باقی"; }
        var dt = document.createElement("div"); dt.className = "muted"; dt.style.direction = "ltr"; dt.style.textAlign = "right";
        dt.textContent = "ends " + fmtDate(u.expires);
        var dv = document.createElement("div"); dv.className = "muted"; dv.style.direction = "ltr"; dv.style.textAlign = "right";
        dv.textContent = "devices " + u.devices + "/" + u.maxDevices + (u.lastLogin ? " · last login " + fmtDate(u.lastLogin) : " · never logged in");
        info.appendChild(nm); info.appendChild(bd); info.appendChild(dt); info.appendChild(dv);

        var acts = document.createElement("div"); acts.className = "acts";
        function btn(text, cls, fn) {
          var b = document.createElement("button"); b.textContent = text; if (cls) b.className = cls;
          b.addEventListener("click", fn); acts.appendChild(b);
        }
        btn("+30 دن", "", function () { act({ action: "extend", username: u.username, days: 30 }); });
        btn(u.disabled ? "چالو کریں" : "بند کریں", u.disabled ? "green" : "gray", function () {
          act({ action: "disable", username: u.username, disabled: !u.disabled });
        });
        btn("سب کو نکالیں", "gray", function () {
          if (confirm(u.username + " کی سب ڈیوائسز لاگ آؤٹ کریں؟ (ڈیوائس کی جگہیں خالی ہو جائیں گی)")) act({ action: "kick", username: u.username });
        });
        btn("ڈیوائسز", "gray", function () {
          var n = prompt("اس ID پر کتنی ڈیوائسز ایک وقت میں چلیں؟ (1 سے 5)", String(u.maxDevices));
          if (n) act({ action: "devices", username: u.username, max: Number(n) });
        });
        btn("پاسورڈ بدلیں", "gray", function () {
          var p = prompt("نیا پاسورڈ لکھیں (کم از کم 6 حروف):");
          if (p) act({ action: "reset", username: u.username, password: p }, "پاسورڈ بدل گیا۔ اب یوزر کو نیا پاسورڈ بتا دیں۔");
        });
        btn("حذف", "red", function () {
          if (confirm(u.username + " کو ہمیشہ کے لیے حذف کریں؟")) act({ action: "delete", username: u.username });
        });
        row.appendChild(info); row.appendChild(acts); box.appendChild(row);
      });
    });
  }

  function act(body, okMsg) {
    api(body).then(function (x) {
      if (x.status === 401) { showLogin(); return; }
      if (x.status !== 200) { alert(errOf(x)); return; }
      if (okMsg) alert(okMsg);
      load();
    });
  }

  function randomPass() {
    var chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var a = new Uint32Array(10); crypto.getRandomValues(a);
    var s = ""; for (var i = 0; i < a.length; i++) s += chars[a[i] % chars.length];
    return s;
  }

  $("gen").addEventListener("click", function () { $("np").value = randomPass(); });

  $("mk").addEventListener("click", function () {
    var u = $("nu").value.trim().toLowerCase();
    var p = $("np").value;
    var d = Number($("nd").value);
    api({ action: "create", username: u, password: p, days: d }).then(function (x) {
      if (x.status === 401) { showLogin(); return; }
      if (x.status !== 200) { note($("cm"), errOf(x), "err"); $("cp").className = "green hide"; return; }
      lastShare = "Link: " + location.origin + "\\nID: " + u + "\\nPassword: " + p + "\\nValid: " + d + " days";
      note($("cm"), "یوزر بن گیا۔ پاسورڈ دوبارہ نظر نہیں آئے گا، ابھی کاپی کر لیں:\\n" + lastShare, "good");
      $("cp").className = "green";
      $("nu").value = ""; $("np").value = "";
      load();
    });
  });

  $("cp").addEventListener("click", function () {
    if (navigator.clipboard) navigator.clipboard.writeText(lastShare).then(function () { $("cp").textContent = "کاپی ہو گیا ✓"; });
    else prompt("یہ کاپی کر لیں:", lastShare);
  });

  $("aGo").addEventListener("click", doLogin);
  $("ap").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  function doLogin() {
    api({ action: "login", password: $("ap").value }).then(function (x) {
      if (x.status === 200) { $("ap").value = ""; showPanel(); }
      else note($("lm"), errOf(x), "err");
    });
  }

  $("out").addEventListener("click", function () { api({ action: "logout" }).then(showLogin); });

  api({ action: "list" }).then(function (x) {
    if (x.status === 200) showPanel(); else showLogin();
  }).catch(showLogin);
})();
</script>
</body>
</html>`;

export async function onRequestGet() {
  return html(PAGE);
}
