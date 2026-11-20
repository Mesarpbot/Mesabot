
let laws=[];
let selected=new Set();
let activeCategory='الكل';

const el=id=>document.getElementById(id);

const categoryNames={
  NAME:'الأسماء',
  AC:'الحساب',
  RP:'Roleplay',
  CHAT:'الدردشة',
  TCHAT:'دردشة التجارة',
  ABUSE:'الإساءة',
  ALERT:'التنبيهات',
  MEDIA:'الوسائط',
  CLAN:'الفصائل',
  MESA:'تعليمات MESA الداخلية'
};

fetch('data.json')
  .then(r=>{
    if(!r.ok)throw Error('data');
    return r.json();
  })
  .then(data=>{
    laws=data.laws||[];
    drawCategories();
    render();
  })
  .catch(()=>{
    el('law-list').innerHTML=
      '<p class="muted">تعذر تحميل القوانين. تأكد من رفع ملف data.json بجانب index.html.</p>';
  });

function categoryOf(l){
  return categoryNames[l.category]||l.category||'أخرى';
}

function drawCategories(){
  let cats=['الكل',...new Set(laws.map(categoryOf))];

  el('categories').innerHTML=cats.map(c=>
    `<button class="category ${c===activeCategory?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  el('categories').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      activeCategory=b.dataset.category;
      drawCategories();
      render();
    };
  });
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function render(){
  let q=el('search').value.trim().toLocaleLowerCase();

  let visible=laws.filter(l=>
    (activeCategory==='الكل'||categoryOf(l)===activeCategory)&&
    (!q||[l.code,l.title,l.description,l.penalty,categoryOf(l)]
      .join(' ').toLocaleLowerCase().includes(q))
  );

  el('law-list').innerHTML=visible.map(l=>
    `<button class="law-item ${selected.has(l.code)?'selected':''}" data-code="${escapeHtml(l.code)}">
      <span>
        <b class="law-code">${escapeHtml(l.code)}</b>
        <span class="law-title">${escapeHtml(l.title)}</span>
        <small class="law-category">${escapeHtml(categoryOf(l))}</small>
      </span>
      <span class="law-plus">${selected.has(l.code)?'✓':'+'}</span>
    </button>`
  ).join('')||'<p class="muted">لا توجد نتائج مطابقة.</p>';

  el('law-list').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>toggle(b.dataset.code);
  });

  renderSelected();
  updateResponse();
}

function toggle(code){
  selected.has(code)?selected.delete(code):selected.add(code);
  render();
}

function renderSelected(){
  let arr=[...selected];

  el('total-count').textContent=`${arr.length} مادة محددة`;

  el('selected-laws').className='chips'+(arr.length?'':' empty');

  el('selected-laws').innerHTML=arr.length
    ?arr.map(code=>
      `<span class="chip">${escapeHtml(code)} <button aria-label="إزالة ${escapeHtml(code)}" data-remove="${escapeHtml(code)}">×</button></span>`
    ).join('')
    :'لم تختر أي مادة بعد.';

  el('selected-laws').querySelectorAll('[data-remove]').forEach(b=>{
    b.onclick=()=>toggle(b.dataset.remove);
  });
}

function updateResponse(){
  let chosen=laws.filter(l=>selected.has(l.code));

  if(!chosen.length){
    el('response').value='';
    return;
  }

  let player=el('player-name').value.trim();
  let admin=el('admin-name').value.trim();
  let notes=el('case-notes').value.trim();

  let out=[
    'السلام عليكم ورحمة الله وبركاته،',
    ''
  ];

  if(player)out.push(`اللاعب: ${player}`,'');

  out.push(
    'بعد مراجعة الحالة والأدلة، تبيّن وجود المخالفات التالية:',
    ''
  );

  chosen.forEach((l,i)=>{
    out.push(
      `${i+1}. ${l.code} — ${l.title}`,
      `نص القانون: ${l.description}`,
      `العقوبة: ${l.penalty}`
    );

    if(l.note)out.push(`ملاحظة: ${l.note}`);

    out.push('');
  });

  if(notes)out.push(`تفاصيل إضافية: ${notes}`,'');

  out.push(
    'يرجى الالتزام بقوانين المدينة وعدم تكرار المخالفة.',
    ''
  );

  if(admin)out.push(`الإداري المسؤول: ${admin}`);

  // لا تتم إضافة تذكير توثيق العقوبة أو رابط قناة MESA Punishments.

  if(chosen.some(l=>l.category==='MESA')){
    out.push(
      '',
      'تنبيه: تتضمن هذه النتيجة تعليمات داخلية خاصة بـ MESA وليست نصاً رسمياً عاماً من OneState.'
    );
  }

  el('response').value=out.join('\n');
}

el('search').addEventListener('input',render);

['player-name','admin-name','case-notes'].forEach(id=>
  el(id).addEventListener('input',updateResponse)
);

el('clear-selection').onclick=()=>{
  selected.clear();
  render();
};

el('copy-response').onclick=async()=>{
  let text=el('response').value;

  if(!text){
    el('copy-status').textContent='اختر مادة واحدة على الأقل أولاً.';
    return;
  }

  try{
    await navigator.clipboard.writeText(text);
    el('copy-status').textContent='تم نسخ الرد بالكامل. الصقه الآن في Discord.';
  }catch(e){
    el('response').focus();
    el('response').select();

    let ok=document.execCommand('copy');

    el('copy-status').textContent=ok
      ?'تم نسخ الرد بالكامل.'
      :'تعذر النسخ التلقائي؛ حدد النص وانسخه يدوياً.';
  }
};
