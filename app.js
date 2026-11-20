
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

// تحميل قاعدة القوانين
fetch('data.json')
  .then(response => {
    if (!response.ok) throw new Error('data');
    return response.json();
  })
  .then(data => {
    laws = Array.isArray(data.laws) ? data.laws : [];
    drawCategories();
    render();
  })
  .catch(() => {
    el('law-list').innerHTML =
      '<p class="muted">تعذر تحميل القوانين. تأكد من رفع ملف data.json بجانب index.html.</p>';
  });

// أسماء التصنيفات
function categoryOf(law) {
  return categoryNames[law.category] || law.category || 'أخرى';
}

// حماية النصوص المعروضة في HTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// إنشاء التصنيفات
function drawCategories() {
  const categories = [
    'الكل',
    ...new Set(laws.map(categoryOf))
  ];

  el('categories').innerHTML = categories.map(category =>
    `<button class="category ${category === activeCategory ? 'active' : ''}"
      data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>`
  ).join('');

  el('categories').querySelectorAll('button').forEach(button => {
    button.onclick = () => {
      activeCategory = button.dataset.category;
      drawCategories();
      render();
    };
  });
}

// عرض القوانين
function render() {
  const searchField = el('search');
  const query = searchField.value.trim().toLocaleLowerCase();

  const visible = laws.filter(law => {
    const matchesCategory =
      activeCategory === 'الكل' ||
      categoryOf(law) === activeCategory;

    const searchableText = [
      law.code,
      law.title,
      law.description,
      law.penalty,
      categoryOf(law)
    ].join(' ').toLocaleLowerCase();

    return matchesCategory &&
      (!query || searchableText.includes(query));
  });

  el('law-list').innerHTML = visible.map(law =>
    `<button class="law-item ${selected.has(law.code) ? 'selected' : ''}"
      data-code="${escapeHtml(law.code)}">
      <span>
        <b class="law-code">${escapeHtml(law.code)}</b>
        <span class="law-title">${escapeHtml(law.title)}</span>
        <small class="law-category">${escapeHtml(categoryOf(law))}</small>
      </span>
      <span class="law-plus">
        ${selected.has(law.code) ? '✓' : '+'}
      </span>
    </button>`
  ).join('') || '<p class="muted">لا توجد نتائج مطابقة.</p>';

  el('law-list').querySelectorAll('button').forEach(button => {
    button.onclick = () => toggle(button.dataset.code);
  });

  renderSelected();
  updateResponse();
}

// اختيار وإلغاء اختيار القانون
function toggle(code) {
  if (selected.has(code)) {
    selected.delete(code);
  } else {
    selected.add(code);
  }

  render();
}

// عرض المواد المختارة
function renderSelected() {
  const selectedCodes = [...selected];

  el('total-count').textContent =
    `${selectedCodes.length} مادة محددة`;

  el('selected-laws').className =
    'chips' + (selectedCodes.length ? '' : ' empty');

  el('selected-laws').innerHTML = selectedCodes.length
    ? selectedCodes.map(code =>
        `<span class="chip">
          ${escapeHtml(code)}
          <button aria-label="إزالة ${escapeHtml(code)}"
            data-remove="${escapeHtml(code)}">×</button>
        </span>`
      ).join('')
    : 'لم تختر أي مادة بعد.';

  el('selected-laws').querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => toggle(button.dataset.remove);
  });
}

// قراءة الحقول الاختيارية
function getOptionalValue(id) {
  const field = el(id);
  return field ? field.value.trim() : '';
}

// توليد الرسالة الرسمية
function updateResponse() {
  const chosen = laws.filter(law => selected.has(law.code));

  if (!chosen.length) {
    el('response').value = '';
    return;
  }

  // بيانات اللاعب والملاحظات
  const playerName = getOptionalValue('player-name');
  const additionalNotes = getOptionalValue('case-notes');

  const out = [];

  // المقدمة الرسمية
  out.push(
    'بعد مراجعة شاملة ودقيقة لكافة الأدلة المقدمة، تبيّن وجود مخالفة واضحة ولا يوجد بها مجال للشك تستوجب اتخاذ إجراء إداري بحقك وفقاً للـ',
    RULES_URL,
    'وهي التالية:',
    ''
  );

  // اسم اللاعب - اختياري
  if (playerName) {
    out.push(
      '**اللاعب:**',
      playerName,
      ''
    );
  }

  // عنوان المخالفات
  out.push(
    '**المخالفات المسجلة:**',
    ''
  );

  // عرض كل مخالفة بشكل مستقل
  chosen.forEach(law => {
    out.push(
      `**[ ${law.code} ]**`,
      '```',
      law.description || law.title || 'لا يوجد وصف متاح.',
      `العقوبة : ${law.penalty || 'غير محددة.'}`
    );

    // الملاحظة المرتبطة بالقانون إن وجدت
    if (law.note) {
      out.push(`ملاحظة : ${law.note}`);
    }

    out.push(
      '```',
      ''
    );
  });

  // الملاحظات الإضافية - اختيارية
  if (additionalNotes) {
    out.push(
      '**ملاحظات إضافية:**',
      additionalNotes,
      ''
    );
  }

  // الخاتمة الرسمية
  out.push(
    'نأمل منك مستقبلاً الالتزام بقوانين OneState RP وتجنب ارتكاب أي مخالفات قد تؤدي إلى فرض عقوبات جديدة.',
    'شكرًا لتفهمك، ونتمنى لك تجربة ممتعة.'
  );

  // تنبيه خاص بالتعليمات الداخلية
  if (chosen.some(law => law.category === 'MESA')) {
    out.push(
      '',
      'تنبيه: تتضمن هذه النتيجة تعليمات داخلية خاصة بـ MESA وليست نصاً رسمياً عاماً من OneState.'
    );
  }

  // وضع النتيجة في مربع الرد
  el('response').value = out.join('\n');
}

// البحث
el('search').addEventListener('input', render);

// تحديث الرد عند تعديل الحقول
[
  'player-name',
  'case-notes',
  'admin-name'
].forEach(id => {
  const field = el(id);

  if (field) {
    field.addEventListener('input', updateResponse);
  }
});

// مسح جميع القوانين المختارة
el('clear-selection').onclick = () => {
  selected.clear();
  render();
};

// نسخ الرد بالكامل
el('copy-response').onclick = async () => {
  const responseText = el('response').value;

  if (!responseText) {
    el('copy-status').textContent =
      'اختر مادة واحدة على الأقل أولاً.';
    return;
  }

  try {
    await navigator.clipboard.writeText(responseText);

    el('copy-status').textContent =
      'تم نسخ الرد بالكامل. الصقه الآن في Discord.';

  } catch (error) {
    el('response').focus();
    el('response').select();

    const copied = document.execCommand('copy');

    el('copy-status').textContent = copied
      ? 'تم نسخ الرد بالكامل.'
      : 'تعذر النسخ التلقائي؛ حدد النص وانسخه يدوياً.';
  }
};
