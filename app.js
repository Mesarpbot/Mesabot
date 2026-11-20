
let laws = [];
let selected = new Set();
let activeCategory = 'الكل';

const el = id => document.getElementById(id);

const categoryNames = {
  NAME: 'الأسماء',
  AC: 'الحساب',
  RP: 'Roleplay',
  CHAT: 'الدردشة',
  TCHAT: 'دردشة التجارة',
  ABUSE: 'الإساءة',
  ALERT: 'التنبيهات',
  MEDIA: 'الوسائط',
  CLAN: 'الفصائل',
  MESA: 'تعليمات MESA الداخلية'
};

const RULES_URL =
  'https://discord.com/channels/1272600775331414159/1272600775570358357';

// تحميل القوانين
fetch('data.json')
  .then(r => {
    if (!r.ok) throw Error('data');
    return r.json();
  })
  .then(data => {
    laws = data.laws || [];
    drawCategories();
    render();
  })
  .catch(() => {
    el('law-list').innerHTML =
      '<p class="muted">تعذر تحميل القوانين. تأكد من رفع ملف data.json بجانب index.html.</p>';
  });

// تحديد اسم التصنيف
function categoryOf(l) {
  return categoryNames[l.category] || l.category || 'أخرى';
}

// إنشاء التصنيفات
function drawCategories() {
  let cats = ['الكل', ...new Set(laws.map(categoryOf))];

  el('categories').innerHTML = cats.map(c =>
    `<button class="category ${c === activeCategory ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  el('categories').querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      activeCategory = b.dataset.category;
      drawCategories();
      render();
    };
  });
}

// حماية النصوص
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// عرض القوانين
function render() {
  let q = el('search').value.trim().toLocaleLowerCase();

  let visible = laws.filter(l =>
    (activeCategory === 'الكل' || categoryOf(l) === activeCategory) &&
    (!q || [
      l.code,
      l.title,
      l.description,
      l.penalty,
      categoryOf(l)
    ].join(' ').toLocaleLowerCase().includes(q))
  );

  el('law-list').innerHTML = visible.map(l =>
    `<button class="law-item ${selected.has(l.code) ? 'selected' : ''}" data-code="${escapeHtml(l.code)}">
      <span>
        <b class="law-code">${escapeHtml(l.code)}</b>
        <span class="law-title">${escapeHtml(l.title)}</span>
        <small class="law-category">${escapeHtml(categoryOf(l))}</small>
      </span>
      <span class="law-plus">${selected.has(l.code) ? '✓' : '+'}</span>
    </button>`
  ).join('') || '<p class="muted">لا توجد نتائج مطابقة.</p>';

  el('law-list').querySelectorAll('button').forEach(b => {
    b.onclick = () => toggle(b.dataset.code);
  });

  renderSelected();
  updateResponse();
}

// اختيار وإلغاء اختيار القانون
function toggle(code) {
  selected.has(code)
    ? selected.delete(code)
    : selected.add(code);

  render();
}

// عرض القوانين المختارة
function renderSelected() {
  let arr = [...selected];

  el('total-count').textContent = `${arr.length} مادة محددة`;

  el('selected-laws').className =
    'chips' + (arr.length ? '' : ' empty');

  el('selected-laws').innerHTML = arr.length
    ? arr.map(code =>
      `<span class="chip">${escapeHtml(code)} <button aria-label="إزالة ${escapeHtml(code)}" data-remove="${escapeHtml(code)}">×</button></span>`
    ).join('')
    : 'لم تختر أي مادة بعد.';

  el('selected-laws').querySelectorAll('[data-remove]').forEach(b => {
    b.onclick = () => toggle(b.dataset.remove);
  });
}

// توليد الرد الرسمي
function updateResponse() {
  let chosen = laws.filter(l => selected.has(l.code));

  if (!chosen.length) {
    el('response').value = '';
    return;
  }

  // قراءة البيانات الاختيارية
  const player = el('player-name')?.value.trim() || '';
  const notes = el('case-notes')?.value.trim() || '';

  let out = [];

  // المقدمة الرسمية
  out.push(
    'بعد مراجعة شاملة ودقيقة لكافة الأدلة المقدمة، تبيّن وجود مخالفة واضحة تستوجب اتخاذ إجراء إداري بحقك وفقاً لقوانين OneState RP:',
    RULES_URL,
    ''
  );

  // اسم اللاعب: يظهر فقط عند إدخاله
  if (player) {
    out.push(
      `**اللاعب:** ${player}`,
      ''
    );
  }

  // المخالفات المختارة
  out.push('**المخالفات المسجلة:**', '');

  chosen.forEach(l => {
    out.push(
      `**[ ${l.code} ]**`,
      '```',
      l.description || l.title || '',
      `العقوبة : ${l.penalty || 'غير محددة'}`,
      '```',
      ''
    );
  });

  // الملاحظات الإضافية: تظهر فقط عند إدخالها
  if (notes) {
    out.push(
      '**ملاحظات إضافية:**',
      notes,
      ''
    );
  }

  // الخاتمة الرسمية
  out.push(
    'نأمل منك مستقبلاً الالتزام بقوانين OneState RP وتجنب ارتكاب أي مخالفات قد تؤدي إلى فرض عقوبات جديدة.',
    'شكرًا لتفهمك، ونتمنى لك تجربة ممتعة.'
  );

  // تنبيه خاص بالقوانين الداخلية
  if (chosen.some(l => l.category === 'MESA')) {
    out.push(
      '',
      'تنبيه: تتضمن هذه النتيجة تعليمات داخلية خاصة بـ MESA وليست نصاً رسمياً عاماً من OneState.'
    );
  }

  el('response').value = out.join('\n');
}

// البحث
el('search').addEventListener('input', render);

// تحديث الرد عند تغيير الحقول
['player-name', 'case-notes'].forEach(id => {
  const field = el(id);

  if (field) {
    field.addEventListener('input', updateResponse);
  }
});

// مسح القوانين المختارة
el('clear-selection').onclick = () => {
  selected.clear();
  render();
};

// نسخ الرد
el('copy-response').onclick = async () => {
  let text = el('response').value;

  if (!text) {
    el('copy-status').textContent =
      'اختر مادة واحدة على الأقل أولاً.';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    el('copy-status').textContent =
      'تم نسخ الرد بالكامل. الصقه الآن في Discord.';

  } catch (e) {
    el('response').focus();
    el('response').select();

    let ok = document.execCommand('copy');

    el('copy-status').textContent = ok
      ? 'تم نسخ الرد بالكامل.'
      : 'تعذر النسخ التلقائي؛ حدد النص وانسخه يدوياً.';
  }
};
