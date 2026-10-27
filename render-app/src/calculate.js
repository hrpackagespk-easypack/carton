const DISPLAY_IDS = [
  "szReel","szMaj","szArea","szNP","szAcross","szTot","szNote",
  "outLen","outReel","outArea","sOrigReel","sOrigMaj","sNP","sAcross","sTot",
  "outOrig","outCost","outBox","outRate","outFinal","dCost","dBox","dRate","dFinal","dBoxSq","dRateSq","brk",
  "pLab","pCost","pBox","pRate","pFinal","dpLab","dpCost","dpBox","dpRate","dpFinal","dpBoxSq","dpRateSq","plNote",
  "qSheets","qTotal","qTbl","qRolls","qNote","tTbl","tNote","tCost","tCostTot","tCostSheet","tCostBox","tCostNote"
];
const CARD_IDS = ["outCost","outBox","outRate","outFinal","pLab","pCost","pBox","pRate","pFinal"];

function calculate(payload) {
  const values = payload.values || {};
  const labelsByRS = payload.labelsByRS || {};
  const mode = payload.mode === "stiff" ? "stiff" : "box";
  const unit = ["mm","cm","in"].includes(payload.unit) ? payload.unit : "mm";
  const sunit = ["mm","cm","in"].includes(payload.sunit) ? payload.sunit : "cm";
  const segs = Math.max(2, Math.min(12, Number(payload.segs) || 2));
  const plies = [3,5,7].includes(Number(payload.plies)) ? Number(payload.plies) : 5;
  const F = { mm: 1, cm: 10, in: 25.4 };
  const MAJOR_ADD = 2, CREASE = 6;
  let stiffNB = 1, LROWS = [], LTOT = null, PLAST = null;
  const elements = Object.create(null);
  function $(id) {
    if (!elements[id]) {
      const value = Object.prototype.hasOwnProperty.call(values, id) ? values[id] : "";
      elements[id] = { value: String(value), textContent: "", innerHTML: "", placeholder: "", hidden: false, parentNode: { hidden: false } };
    }
    return elements[id];
  }
  function r(v, d) { const p = Math.pow(10, d); return Math.round(v * p) / p; }
  function latin(s) {
    return String(s).replace(/[۰-۹]/g, c => c.charCodeAt(0)-0x06F0)
      .replace(/[٠-٩]/g, c => c.charCodeAt(0)-0x0660)
      .replace(/[०-९]/g, c => c.charCodeAt(0)-0x0966).replace(/[٫،]/g, ".");
  }
  function val(id) { const v = parseFloat(latin($(id).value)); return Number.isFinite(v) ? v : NaN; }
  function mny(x) { return r(x, 2).toFixed(2); }
  function esc(x) { return String(x).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function showCard(id, on) { $(id).parentNode.hidden = !on; }
  function amt(id, uid) {
    const raw = String($(id).value).trim(), v = raw === "" ? 0 : val(id);
    return { v, u: uid ? $(uid).value : "p", ok: v >= 0 };
  }
  function amtAdd(a, base) { return a.u === "r" ? a.v : base * a.v / 100; }
  function amtPart(a, add, name) {
    if (!(a.v > 0)) return " (" + name + " نہیں لگایا)";
    return " + " + name + " " + (a.u === "r" ? mny(a.v) + " روپے" : r(a.v, 2) + "% (" + mny(add) + " روپے)");
  }
  function rlFind(key) { const label = labelsByRS[String(key)]; return label ? { label } : null; }
  function rlLabel(item) { return item.label; }
  const UN = { mm:"ملی میٹر", cm:"سینٹی میٹر", in:"انچ" };
  function plantClear() {
    ["pLab", "pCost", "pBox", "pRate", "pFinal"].forEach(function (id) { $(id).textContent = "—"; showCard(id, true); });
    ["dpLab", "dpCost", "dpBox", "dpRate", "dpFinal", "dpBoxSq", "dpRateSq"].forEach(function (id) { $(id).textContent = ""; });
    $("plNote").textContent = "";
  }
  /* پلانٹ: پیپر کاسٹ + لیبر (ریٹ × مربع انچ) = پلانٹ کاسٹ؛ + خرچ = باکس کاسٹ؛ + منافع = ریٹ؛ + GST = آخری ریٹ */
  function plantCalc(paper, areaSq, nb) {
    var rate = val("R1"), pxo = amt("PX", "PXU"), ppo = amt("PP", "PPU"), pgo = amt("PG", null);
    if (!(rate >= 0 && pxo.ok && ppo.ok && pgo.ok)) {
      plantClear();
      $("plNote").textContent = "پلانٹ لیبر ریٹ، خرچ، منافع اور GST کے خانوں میں درست عدد لکھیں۔";
      return;
    }
    var lab = rate * areaSq / nb, pc = paper + lab;
    var pxA = amtAdd(pxo, pc), box = pc + pxA, ppA = amtAdd(ppo, box), rt = box + ppA, pgA = amtAdd(pgo, rt), fin = rt + pgA;
    $("pLab").textContent = r(lab, 2);
    $("pCost").textContent = r(pc, 2);
    $("pBox").textContent = r(box, 2);
    $("pRate").textContent = r(rt, 2);
    $("pFinal").textContent = r(fin, 2);
    $("plNote").textContent = "";
    var m2 = function (x) { return r(x, 2).toFixed(2); };
    $("dpLab").textContent = "لیبر ریٹ " + rate + " × " + r(areaSq, 1) + " مربع انچ" + (nb !== 1 ? " ÷ " + nb + " پیس" : "") + " = " + m2(lab) + (nb !== 1 ? " فی ڈبہ" : "");
    $("dpCost").textContent = "پیپر کاسٹ " + m2(paper) + " + لیبر " + m2(lab) + " = " + m2(pc);
    showCard("pBox", pxo.v > 0); showCard("pRate", ppo.v > 0); showCard("pFinal", pgo.v > 0);
    var bRate = pxo.v > 0 ? "باکس کاسٹ" : "پلانٹ کاسٹ", bFin = ppo.v > 0 ? "ریٹ" : bRate;
    $("dpBox").textContent = "پلانٹ کاسٹ " + m2(pc) + amtPart(pxo, pxA, "خرچ") + " = " + m2(box);
    $("dpRate").textContent = bRate + " " + m2(box) + amtPart(ppo, ppA, "منافع") + " = " + m2(rt);
    var areaBox = areaSq / nb;
    $("dpBoxSq").textContent = "(مربع انچ ریٹ: " + r(box / areaBox, 4).toFixed(4) + ")";
    $("dpRateSq").textContent = "(مربع انچ ریٹ: " + r(rt / areaBox, 4).toFixed(4) + ")";
    $("dpFinal").textContent = bFin + " " + m2(rt) + amtPart(pgo, pgA, "GST") + " = " + m2(fin);
  }

  var LNAMES = { p: "پلین", t: "موٹی نالی", n: "باریک نالی" };
  function fmt(n, d) { return Number(r(n, d === undefined ? 1 : d)).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function prodClear() {
    ["qSheets", "qTotal"].forEach(function (id) { $(id).textContent = "—"; });
    $("qTbl").innerHTML = ""; $("qRolls").innerHTML = ""; $("qNote").textContent = "";
    PLAST = null;
  }
  function trialClear() {
    $("tTbl").innerHTML = ""; $("tNote").textContent = ""; $("tCost").innerHTML = ""; $("tCostNote").textContent = "";
    ["tCostTot", "tCostSheet", "tCostBox"].forEach(function (id) { $(id).textContent = "—"; });
  }
  /* اصل GSM = وزن (گرام) ÷ (شیٹ × ایک شیٹ کا رقبہ m²)۔ نالی والی پرت میں نالی کا اضافہ ہٹا کر پیپر کا GSM بھی لکھتے ہیں */
  function trialCalc(lay, areaSq, nb) {
    var ts = val("TS");
    if (!(ts > 0)) { trialClear(); $("tNote").textContent = "بنی ہوئی شیٹ کی درست تعداد لکھیں۔"; return; }
    var areaM2 = areaSq * 0.00064516, rows = "", tot = 0, bad = false;
    var crow = "", ctot = 0, plan = 0, okc = true;
    lay.forEach(function (l, i) {
      var kg = val("V" + i);
      if (!(kg >= 0)) { bad = true; return; }
      tot += kg;
      var rate = val("P" + i);
      if (rate >= 0) {
        ctot += kg * rate; plan += l.gm / 1000 * rate;
        crow += "<tr" + (l.t !== "p" ? ' class="fl"' : "") + "><td>" + (i + 1) + '</td><td class="n">' + fmt(kg, 1) + '</td><td class="n">' + r(rate, 2) + '</td><td class="n">' + fmt(kg * rate, 2) + "</td></tr>";
      } else okc = false;
      var eff = kg * 1000 / (ts * areaM2), paper = eff / l.m, flute = l.t !== "p";
      rows += "<tr" + (flute ? ' class="fl"' : "") + "><td>" + (i + 1) + '</td><td class="n">' + fmt(kg, 1) + '</td><td class="n">' + r(eff, 1) +
        '</td><td class="n"><b>' + r(paper, 1) + '</b></td><td class="n">' + fmt(l.g, 0) + "</td></tr>";
    });
    if (bad) { trialClear(); $("tNote").textContent = "تمام پرتوں کا وزن درست لکھیں۔"; return; }
    $("tTbl").innerHTML = "<tr><th>پرت</th><th>وزن (کلو)</th><th>GSM (کنزمپشن)</th><th>پیپر GSM</th><th>منصوبہ GSM</th></tr>" + rows +
      '<tr class="tot"><td>کل</td><td class="n">' + fmt(tot, 1) + '</td><td colspan="3"></td></tr>';
    $("tNote").innerHTML = "کل وزن <b>" + fmt(tot, 1) + "</b> کلو، فی شیٹ <b>" + r(tot * 1000 / ts, 1) + "</b> گرام۔ ایک شیٹ کا رقبہ <b>" + r(areaM2, 4) +
      "</b> مربع میٹر۔ نالی والی (پیلی) پرت کا کنزمپشن GSM نالی کے اضافے کی وجہ سے زیادہ آتا ہے۔ اس اضافے کو ہٹا کر پیپر کا اصل GSM الگ لکھا ہے۔";
    if (!okc) {
      $("tCost").innerHTML = ""; ["tCostTot", "tCostSheet", "tCostBox"].forEach(function (id) { $(id).textContent = "—"; });
      $("tCostNote").textContent = "لاگت کے لیے اوپر پیپر والے حصے میں ہر پرت کا ریٹ فی کلو درست لکھیں۔";
      return;
    }
    var per = ctot / ts, perBox = per / (nb > 0 ? nb : 1);
    $("tCost").innerHTML = "<tr><th>پرت</th><th>وزن (کلو)</th><th>ریٹ فی کلو</th><th>لاگت</th></tr>" + crow +
      '<tr class="tot"><td colspan="3">کل</td><td class="n">' + fmt(ctot, 2) + "</td></tr>";
    $("tCostTot").textContent = fmt(ctot, 2);
    $("tCostSheet").textContent = fmt(per, 2);
    $("tCostBox").textContent = fmt(perBox, 2);
    var diff = per - plan;
    $("tCostNote").innerHTML = "لاگت = ہر پرت کا وزن × اوپر پیپر والے حصے میں لکھا اس کا ریٹ۔ منصوبے کے حساب سے فی شیٹ پیپر کاسٹ <b>" + r(plan, 2) +
      "</b> تھی، اصل <b>" + r(per, 2) + "</b> آئی، فرق <b>" + (diff > 0 ? "+" : "") + r(diff, 2) + "</b> فی شیٹ۔";
  }

  /* پروڈکشن: شیٹ = آرڈر ÷ ایک شیٹ کے باکس؛ پرت کا وزن = ایک شیٹ میں اس کا وزن × شیٹ۔
     رول: ہر نالی والی پرت اپنے ساتھ ایک پلین پرت کی جوڑی بناتی ہے اور ایک جوڑی کا ایک رول گنا جاتا ہے؛ رول = شیٹ × میجر ÷ رول کی لمبائی */
  function prodCalc(lay, nb, reel, lenIn) {
    var qty = val("QT"), rlen = val("RL");
    if (!(qty > 0)) { prodClear(); $("qNote").textContent = "آرڈر میں ڈبوں کی درست تعداد لکھیں۔"; return; }
    var sheets = Math.ceil(qty / nb - 1e-9);
    var tot = 0, rows = "", prows = [];
    lay.forEach(function (l, i) {
      var kg = l.gm * sheets / 1000, cls = l.t !== "p" ? ' class="fl"' : "";
      tot += kg;
      rows += "<tr" + cls + "><td>" + (i + 1) + "</td><td>" + LNAMES[l.t] + '</td><td class="pn">' + esc(l.lab) + '</td><td class="n">' + fmt(l.g, 0) + '</td><td class="n">' + fmt(kg, 1) + "</td></tr>";
      prows.push({ n: i + 1, type: LNAMES[l.t], paper: l.lab, g: fmt(l.g, 0), kg: fmt(kg, 1), fl: l.t !== "p" });
    });
    $("qTbl").innerHTML = "<tr><th>پرت</th><th>قسم</th><th>پیپر</th><th>GSM</th><th>وزن (کلو)</th></tr>" + rows +
      '<tr class="tot"><td colspan="4">کل</td><td class="n">' + fmt(tot, 1) + "</td></tr>";

    var used = [], pairs = [];
    lay.forEach(function (l, i) {
      if (l.t === "p") return;
      var mate = -1;
      if (i > 0 && lay[i - 1].t === "p" && !used[i - 1]) mate = i - 1;
      else if (i < lay.length - 1 && lay[i + 1].t === "p" && !used[i + 1]) mate = i + 1;
      if (mate >= 0) used[mate] = true;
      used[i] = true;
      pairs.push(mate < 0 ? [i] : [Math.min(i, mate), Math.max(i, mate)]);
    });
    var left = [];
    lay.forEach(function (l, i) { if (!used[i]) left.push(i + 1); });

    var length = sheets * lenIn, rl = rlen > 0 ? length / rlen : 0, whole = Math.ceil(rl - 1e-9);
    if (!(rlen > 0)) {
      $("qRolls").innerHTML = "<tr><td>رول کی لمبائی لکھیں تو رول کی تعداد نکلے گی۔</td></tr>";
    } else if (!pairs.length) {
      $("qRolls").innerHTML = "<tr><td>کوئی نالی والی پرت نہیں چنی، اس لیے رول کی جوڑی نہیں بنی۔</td></tr>";
    } else {
      var rr = "";
      pairs.forEach(function (pr, j) {
        rr += '<tr class="fl"><td>' + (j + 1) + '</td><td class="n">' + fmt(length, 0) + '</td><td class="n">' + r(rl, 2) + '</td><td class="n"><b>' + whole + "</b></td></tr>";
      });
      $("qRolls").innerHTML = "<tr><th>جوڑی</th><th>لمبائی (انچ)</th><th>حساب</th><th>رول</th></tr>" + rr +
        '<tr class="tot"><td colspan="3">کل رول (' + pairs.length + " × " + whole + ')</td><td class="n">' + (pairs.length * whole) + "</td></tr>" +
        (left.length ? '<tr><td colspan="4"><small>پرت ' + left.join("، ") + " (پلین) رول میں نہیں گنی گئی۔</small></td></tr>" : "");
    }
    PLAST = { qty: qty, sheets: sheets, tot: tot, rlen: rlen, rows: prows, whole: whole, npairs: pairs.length, haveRolls: rlen > 0 && pairs.length > 0, left: left };
    $("qSheets").textContent = fmt(sheets, 0);
    $("qTotal").textContent = fmt(tot, 1);
    $("qNote").innerHTML = "<b>" + fmt(qty, 0) + "</b> ڈبے ÷ <b>" + r(nb, 2) + "</b> باکس فی شیٹ = <b>" + fmt(sheets, 0) +
      "</b> شیٹ۔ شیٹ کا سائز <b>" + r(reel, 2) + " × " + r(lenIn, 2) + "</b> انچ۔ ہر جوڑی کی کل لمبائی = <b>" + fmt(sheets, 0) + " × " + r(lenIn, 2) + "</b> انچ۔";
  }

  /* پیپر کاسٹ: ہر پرت کا وزن = رقبہ (m²) × GSM × (1 + نالی کا اضافہ)، لاگت = وزن × ریٹ فی کلو */
  function paperCost(lenIn, reel, widIn) {
    var x = { t: val("X1"), n: val("X2") };
    var nb = mode === "stiff" ? stiffNB : val("NB");
    var ok = x.t >= 0 && x.n >= 0 && nb > 0;
    var names = { p: "پلین", t: "موٹی نالی", n: "باریک نالی" };
    var aR = lenIn * reel * 0.00064516, aS = lenIn * widIn * 0.00064516;
    var rows = "", tot = 0, totG = 0, totS = 0, lay = [], rowsD = [];
    for (var i = 0; i < plies; i++) {
      var g = val("G" + i), p = val("P" + i), t = $("T" + i).value;
      if (!(g > 0) || !(p >= 0)) { ok = false; break; }
      var m = 1 + (t === "t" ? x.t : t === "n" ? x.n : 0) / 100;
      var gm = aR * g * m, c = gm / 1000 * p;
      var rsx = rlFind($("RS" + i).value), plab = rsx ? rlLabel(rsx) : "GSM " + g;
      lay.push({ t: t, g: g, gm: gm, m: m, lab: plab });
      rowsD.push({ n: i + 1, type: names[t], paper: plab, gm: r(gm, 1), cost: r(c, 2), fl: t !== "p" });
      tot += c; totG += gm; totS += aS * g * m / 1000 * p;
      rows += '<tr' + (t !== "p" ? ' class="fl"' : '') + '><td>' + (i + 1) + '</td><td>' + names[t] + '</td><td class="pn">' + esc(plab) + '</td><td class="n">' + r(gm, 1) + '</td><td class="n">' + r(c, 2) + '</td></tr>';
    }
    if (!ok) {
      ["outCost", "outBox", "outRate", "outFinal"].forEach(function (id) { $(id).textContent = "—"; showCard(id, true); });
      ["dCost", "dBox", "dRate", "dFinal", "dBoxSq", "dRateSq"].forEach(function (id) { $(id).textContent = ""; });
      $("brk").innerHTML = "";
      LROWS = []; LTOT = null;
      plantClear();
      prodClear();
      trialClear();
      return "<br>پیپر کاسٹ کے لیے ہر پرت کا GSM، ریٹ، نالی کا اضافہ اور باکس کی تعداد درست لکھیں۔";
    }
    LROWS = rowsD; LTOT = { gm: r(totG, 1), c: r(tot, 2) };
    var per = tot / nb;
    var m2 = function (x) { return r(x, 2).toFixed(2); };
    $("outCost").textContent = r(per, 2);
    $("dCost").textContent = nb !== 1 ? "پوری شیٹ " + m2(tot) + " ÷ " + nb + " پیس = " + m2(per) + " فی ڈبہ" : "ایک شیٹ سے ایک ڈبہ";
    /* پیپر کاسٹ + خرچ = باکس کاسٹ؛ + منافع = ریٹ؛ + GST = آخری ریٹ */
    plantCalc(per, lenIn * reel, nb);
    prodCalc(lay, nb, reel, lenIn);
    trialCalc(lay, lenIn * reel, nb);
    var exo = amt("EX", "EXU"), pro = amt("PR", "PRU"), gso = amt("GS", null), tail = "";
    if (exo.ok && pro.ok && gso.ok) {
      var exA = amtAdd(exo, per), box = per + exA, prA = amtAdd(pro, box), rate = box + prA, gsA = amtAdd(gso, rate), fin = rate + gsA;
      $("outBox").textContent = r(box, 2);
      $("dBox").textContent = "پیپر کاسٹ " + m2(per) + amtPart(exo, exA, "خرچ") + " = " + m2(box);
      showCard("outBox", exo.v > 0); showCard("outRate", pro.v > 0); showCard("outFinal", gso.v > 0);
      var baseRate = exo.v > 0 ? "باکس کاسٹ" : "پیپر کاسٹ", baseFin = pro.v > 0 ? "ریٹ" : baseRate;
      $("dRate").textContent = baseRate + " " + m2(box) + amtPart(pro, prA, "منافع") + " = " + m2(rate);
      /* فی مربع انچ ریٹ: ایک باکس کے حصے کے رقبے پر (شیٹ کا رقبہ ÷ ایک شیٹ سے باکس) */
      var areaBox = lenIn * reel / nb;
      $("dBoxSq").textContent = "(مربع انچ ریٹ: " + r(box / areaBox, 4).toFixed(4) + ")";
      $("dRateSq").textContent = "(مربع انچ ریٹ: " + r(rate / areaBox, 4).toFixed(4) + ")";
      $("dFinal").textContent = baseFin + " " + m2(rate) + amtPart(gso, gsA, "GST") + " = " + m2(fin);
      $("outRate").textContent = r(rate, 2);
      $("outFinal").textContent = r(fin, 2);
    } else {
      ["outBox", "outRate", "outFinal"].forEach(function (id) { $(id).textContent = "—"; showCard(id, true); });
      ["dBox", "dRate", "dFinal", "dBoxSq", "dRateSq"].forEach(function (id) { $(id).textContent = ""; });
      tail = "<br>خرچ، منافع اور GST کے خانوں میں درست عدد لکھیں۔";
    }
    $("brk").innerHTML = '<tr><th>پرت</th><th>قسم</th><th>پیپر</th><th>وزن شیٹ (g)</th><th>لاگت شیٹ</th></tr>' + rows +
      '<tr class="tot"><td colspan="3">کل</td><td class="n">' + r(totG, 1) + '</td><td class="n">' + r(tot, 2) + '</td></tr>';
    return "<br>پوری شیٹ کی پیپر کاسٹ <b>" + r(tot, 2) + "</b>" + (nb !== 1 ? " ÷ <b>" + nb + "</b> باکس" : "") + tail;
  }

  /* پس منظر کی حدیں (اسٹفنر): اضافہ صفر، میجر کی حد 55، کم سے کم ریل 22، ریل میں زیادہ سے زیادہ 2 پیس، میجر میں زیادہ سے زیادہ 10 پیس */
  var STIFF = { RA: 0, MG: 0, ML: 55, MN: 22, MA: 2, MP: 10 };

  function stiffText(sInfo) {
    return "آخری کے علاوہ سائز <b>" + sInfo.parts.join(" + ") + " = " + r(sInfo.wSum, 2) + " " + UN[sunit] + "</b> یعنی <b>" + r(sInfo.wIn, 2) + " in</b>" + (sInfo.across > 1 ? " × <b>" + sInfo.across + "</b> = <b>" + r(sInfo.wIn * sInfo.across, 2) + " in</b>" : "") + (val("MR") > 0 ? "، ریل آپ کی لکھی <b>" + r(val("MR"), 2) + "</b>" : "") + "<br>آخری سائز <b>" + r(sInfo.lastV, 2) + " " + UN[sunit] + "</b> یعنی <b>" + r(sInfo.lastIn, 2) + " in</b> × <b>" + sInfo.np + "</b> پیس" + (val("MM") > 0 ? "، میجر آپ کا لکھا <b>" + r(val("MM"), 2) + "</b>" : "") + (!(val("MR") > 0) && sInfo.wIn * sInfo.across < sInfo.mn - 1e-9 ? "<br><b>مشین کی حد (ریل میں " + sInfo.ma + " پیس) کی وجہ سے ریل کم سے کم ریل سے چھوٹی رہی۔</b>" : "") + (sInfo.lastIn * sInfo.np > sInfo.cap + 1e-9 ? "<br><b>ایک پیس بھی میجر کی حد (یا آپ کے لکھے میجر) سے بڑا ہے، اسے بڑھا کر دیکھیں۔</b>" : "") + (val("MR") > 0 && sInfo.wIn * sInfo.across + sInfo.ra > val("MR") + 1e-9 ? "<br><b>آپ کی لکھی ہوئی ریل ایک پیس کے لیے بھی چھوٹی ہے۔</b>" : "") + "<br>";
  }

  /* پہلا مرحلہ: ریل اور میجر (اور اسٹفنر میں پیس) */
  function computeSize() {
    var f = F[unit];
    var L = 0, W = 0, H = 0, sInfo = null, bad;
    if (mode === "stiff") {
      /* آخری سائز = میجر؛ اس سے پہلے کے سب سائز جمع = ریل کی بنیاد */
      var sf = F[sunit], okS = true, wParts = [], wSum = 0;
      for (var si = 0; si < segs - 1; si++) { var sv = val("S" + si); if (!(sv > 0)) okS = false; wParts.push(sv); wSum += sv; }
      var lastV = val("S" + (segs - 1)), ra = STIFF.RA, mg = STIFF.MG, ml = STIFF.ML, mn = STIFF.MN, ma = STIFF.MA, mp = STIFF.MP;
      if (!(lastV > 0)) okS = false;
      bad = !okS;
      if (!bad) {
        var wIn = wSum * sf / 25.4, across = 1;
        var mrv = val("MR"), mmv = val("MM");
        if (mrv > 0) {
          /* ریل آپ نے خود لکھی ہو تو چوڑائی میں پیس اسی ریل کے حساب سے */
          across = Math.max(1, Math.min(ma, Math.floor((mrv - ra) / wIn + 1e-9)));
        } else {
          /* ریل کم سے کم (22 انچ) سے چھوٹی ہو تو اسے بڑھا کر (دگنا) پورا کیا جاتا ہے */
          while (wIn * across < mn - 1e-9 && across < ma) across++;
        }
        var lastIn = lastV * sf / 25.4;
        /* میجر آپ نے خود لکھا ہو تو میجر میں پیس اسی میجر کے حساب سے، ورنہ میجر کی حد کے حساب سے */
        var capIn = mmv > 0 ? mmv : ml;
        var np = Math.max(1, Math.min(mp, Math.floor(capIn / lastIn + 1e-9)));
        sInfo = { parts: wParts, wSum: wSum, wIn: wIn, across: across, lastV: lastV, lastIn: lastIn, np: np, ra: ra, mg: mg, ml: ml, mn: mn, ma: ma, mp: mp, cap: capIn, nb: across * np };
        stiffNB = sInfo.nb;
      }
    } else {
      L = val("L") * f; W = val("W") * f; H = val("H") * f;
      bad = ![L, W, H].every(function (x) { return isFinite(x) && x > 0; });
    }
    if (bad) return null;

    /* میجر = (لمبائی + چوڑائی) × 2 + 2 انچ۔ L اور W ملی میٹر میں ہیں، اس لیے پہلے انچ میں بدلتے ہیں */
    var lenIn, widIn;
    if (mode === "stiff") { lenIn = sInfo.lastIn * sInfo.np + sInfo.mg; widIn = sInfo.wIn * sInfo.across; }
    else { lenIn = 2 * (L + W) / 25.4 + MAJOR_ADD; widIn = (H + W + 2 * CREASE) / 25.4; }
    var widAdd = mode === "stiff" ? sInfo.ra : 0;
    /* ریل ہمیشہ اگلے جفت (even) عدد پر جاتی ہے: 16.1 → 18، 17.2 → 18، 18.2 → 20 */
    var reelAuto = Math.ceil(r(widIn + widAdd, 2) / 2 - 1e-9) * 2, lenAuto = lenIn;
    /* اگر آپ نے ریل یا میجر خود لکھا ہو تو وہی استعمال ہوگا (اسٹفنر میں پیس بھی انہی کے حساب سے نکلتے ہیں) */
    var mr = val("MR"), mm = val("MM");
    return { L: L, W: W, H: H, sInfo: sInfo, widIn: widIn, reelAuto: reelAuto, lenAuto: lenAuto, mr: mr, mm: mm,
             reel: mr > 0 ? mr : reelAuto, lenIn: mm > 0 ? mm : lenAuto };
  }

  /* اوپر کا اپلائی: صرف ریل، میجر اور پیس دکھاتا ہے */
  /* اوپر کا اپلائی: ہاتھ سے لکھی ریل اور میجر صاف کر کے پہلے خودکار دکھاتا ہے */

  function showSize() {
    var Z = computeSize();
    $("szStiff").hidden = mode !== "stiff";
    if (!Z) {
      ["szReel", "szMaj", "szArea", "szNP", "szAcross", "szTot"].forEach(function (id) { $(id).textContent = "—"; });
      $("szNote").textContent = mode === "stiff" ? "اسٹفنر کے تمام سائز درست لکھیں۔" : "تینوں ناپ درست لکھیں۔";
      return;
    }
    $("MR").placeholder = "خودکار: " + Z.reelAuto;
    $("MM").placeholder = "خودکار: " + r(Z.lenAuto, 2);
    $("szReel").innerHTML = r(Z.reel, 2) + "<small>in" + (Z.mr > 0 ? " · اپنا" : "") + "</small>";
    $("szMaj").innerHTML = r(Z.lenIn, 2) + "<small>in" + (Z.mm > 0 ? " · اپنا" : "") + "</small>";
    $("szArea").innerHTML = r(Z.lenIn * Z.reel, 1) + "<small>sq in</small>";
    if (Z.sInfo) {
      $("szNP").textContent = Z.sInfo.np;
      $("szAcross").textContent = Z.sInfo.across;
      $("szTot").textContent = Z.sInfo.nb;
    }
    $("szNote").innerHTML = (mode === "stiff" ? stiffText(Z.sInfo) : "") + "اصل ریل سائز <b>" + r(Z.widIn, 2) + " in</b>، ضیاع <b>" + r(Z.reel - Z.widIn, 2) + " in</b>" +
      (Z.reel < Z.widIn - 1e-9 ? "<br><b>ریل اصل چوڑائی سے چھوٹی ہے، شیٹ پوری نہیں نکلے گی۔</b>" : "");
  }


  const Z = computeSize();
  showSize();
  if (!Z) {
    ["outReel","outLen","outArea","outCost","outBox","outRate","outFinal","sOrigReel","sOrigMaj","sNP","sAcross","sTot"].forEach(id => { $(id).textContent = "—"; });
    ["dCost","dBox","dRate","dFinal","dBoxSq","dRateSq"].forEach(id => { $(id).textContent = ""; });
    $("outOrig").innerHTML = "";
    $("brk").innerHTML = "";
    plantClear(); prodClear(); trialClear();
  } else {
    const {sInfo, widIn, reel, lenIn, mr, mm, reelAuto, lenAuto} = Z;
    $("MR").placeholder = "خودکار: " + reelAuto;
    $("MM").placeholder = "خودکار: " + r(lenAuto, 2);
    $("outLen").innerHTML = r(lenIn, 2) + "<small>in" + (mm > 0 ? " · اپنا" : "") + "</small>";
    $("outReel").innerHTML = r(reel, 2) + "<small>in" + (mr > 0 ? " · اپنا" : "") + "</small>";
    $("outArea").innerHTML = r(lenIn * reel, 1) + "<small>sq in</small>";
    $("stiffOut").hidden = mode !== "stiff";
    $("stiffOrig").hidden = mode !== "stiff";
    if (mode === "stiff") {
      $("sOrigReel").innerHTML = r(widIn, 2) + "<small>in</small>";
      $("sOrigMaj").innerHTML = r(sInfo.lastIn * sInfo.np, 2) + "<small>in</small>";
      $("sNP").textContent = sInfo.np;
      $("sAcross").textContent = sInfo.across;
      $("sTot").textContent = sInfo.nb;
    }
    $("outOrig").innerHTML = paperCost(lenIn, reel, widIn);
  }
  const display = {};
  for (const id of DISPLAY_IDS) {
    const e = $(id);
    display[id] = e.innerHTML !== "" ? e.innerHTML : esc(e.textContent);
  }
  const hidden = {};
  for (const id of CARD_IDS) hidden[id] = !!$(id).parentNode.hidden;
  return { ok:!!Z, Z:Z || null, display, hidden, placeholders:{MR:$("MR").placeholder, MM:$("MM").placeholder}, LROWS, LTOT, PLAST };
}


export { calculate };
