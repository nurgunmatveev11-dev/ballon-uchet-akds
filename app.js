const seed={cylinders:[{id:'B-000124',made:'2023-05-16',inspection:'2028-05-16',volume:'40',status:'Возвращён',history:[['2026-10-02','Возврат','Возвращён от ООО «Север»'],['2026-08-11','Выдача','ООО «Север», накладная №381, серия КГМ-2408']]},{id:'B-000125',made:'2023-05-16',inspection:'2028-05-16',volume:'40',status:'Выдан',history:[['2026-08-11','Выдача','ООО «Север», накладная №381, серия КГМ-2408']]},{id:'B-000126',made:'2022-03-08',inspection:'2027-03-08',volume:'50',status:'На складе',history:[['2026-10-29','Наполнение','Серия КГМ-2410']]},{id:'B-000127',made:'2021-11-25',inspection:'2026-11-25',volume:'40',status:'Освидетельствование',history:[]},{id:'B-000128',made:'2024-02-19',inspection:'2029-02-19',volume:'40',status:'На складе',history:[]}],batches:[{number:'КГМ-2410',produced:'2026-10-29',expiry:'2028-04-29',filler:'Иван Сидоров',cylinders:[],defects:[],note:'Кислород медицинский'}],issues:[{invoice:'381',batch:'КГМ-2408',production:'2026-08-11',permission:'Р-284/26',date:'2026-08-11',org:'ООО «Север»',employee:'Алексей Петров',cylinders:[],cancelled:false}]};
const cloudMode=Boolean(window.BALLOON_CLOUD_CONFIG?.url);
const state=cloudMode?{cylinders:[],batches:[],issues:[],organizations:[]}:JSON.parse(localStorage.getItem('balloon-registry-v1')||JSON.stringify(seed));
function uid(){return'CYL-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}state.cylinders.forEach(c=>c.uid||(c.uid=uid()));const migrateRefs=a=>(a||[]).map(v=>state.cylinders.some(c=>c.uid===v)?v:(state.cylinders.find(c=>c.id===v)?.uid||v));state.batches.forEach(b=>{b.cylinders=migrateRefs(b.cylinders);b.defects=migrateRefs(b.defects)});state.issues.forEach(i=>{i.cylinders=migrateRefs(i.cylinders);i.cancelled??=false});
const nav=[['dashboard','▦','Главная'],['cylinders','◉','Данные о баллонах'],['batches','▣','Создание партии'],['issue','↗','Выдача баллонов'],['return','↙','Возврат баллонов'],['receive','↓','Приём баллонов']];let route='dashboard';const $=s=>document.querySelector(s),view=$('#view'),today=()=>localDay();const save=note=>{if(!cloudMode)localStorage.setItem('balloon-registry-v1',JSON.stringify(state));window.dispatchEvent(new CustomEvent('balloon:save',{detail:{note:note||window.BALLOON_AUDIT_NOTE||'Обновление реестра'}}));window.BALLOON_AUDIT_NOTE=''};const date=d=>{if(!d)return'—';let parsed=new Date(d+'T12:00:00');return Number.isNaN(parsed.getTime())?escapeHTML(d):new Intl.DateTimeFormat('ru-RU').format(parsed)};const cyl=u=>state.cylinders.find(c=>c.uid===u);const usable=()=>state.cylinders.filter(c=>['На складе','Возвращён'].includes(c.status));
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2600)}function status(s){return`<span class="status ${s==='Выдан'?'issued':(['Освидетельствование','Брак'].includes(s)?'service':'')}">${escapeHTML(s)}</span>`}const head=(t,d,a='')=>`<div class="page-head"><div><h1>${t}</h1><p>${d}</p></div>${a}</div>`;
function renderNav(){$('#nav').innerHTML=nav.map(n=>`<button class="nav-item ${route===n[0]?'active':''}" data-route="${n[0]}"><span class="nav-icon">${n[1]}</span>${n[2]}</button>`).join('');$('#breadcrumbs').textContent=nav.find(n=>n[0]===route)?.[2]||'';bindRoutes()}function bindRoutes(){document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>go(b.dataset.route))}function go(r){route=r;renderNav();render();$('.sidebar').classList.remove('open')}
function latest(){return state.cylinders.flatMap(c=>c.history.map(h=>({when:h[0],type:h[1],text:`${escapeHTML(c.id)} · ${escapeHTML(h[2])}`}))).sort((a,b)=>b.when.localeCompare(a.when)).slice(0,5)}function dashboard(){const stock=usable(), issued=state.cylinders.filter(c=>c.status==='Выдан'), control=state.cylinders.filter(c=>['Освидетельствование','Брак'].includes(c.status));view.innerHTML=head(window.BALLOON_DISPLAY_NAME?`Здравствуйте, ${escapeHTML(window.BALLOON_DISPLAY_NAME)}`:'Добро пожаловать','Сводка по движению баллонов на сегодня')+`<div class="kpi-grid"><div class="card kpi"><div class="label">Всего баллонов</div><div class="value">${state.cylinders.length}</div>${volumeBreakdown(state.cylinders)}</div><div class="card kpi"><div class="label">На складе</div><div class="value">${stock.length}</div>${volumeBreakdown(stock)}</div><div class="card kpi"><div class="label">У организаций</div><div class="value">${issued.length}</div>${volumeBreakdown(issued)}</div><div class="card kpi"><div class="label">Контроль / брак</div><div class="value">${control.length}</div>${volumeBreakdown(control)}</div></div><div class="dashboard-grid"><div class="card panel"><div class="panel-head"><h2>Последние операции</h2></div><div class="activity">${latest().map(x=>`<div class="activity-row"><div class="activity-icon">${x.type==='Выдача'?'↗':'▣'}</div><div><strong>${escapeHTML(x.type)}</strong><small>${escapeHTML(x.text)}</small></div><small>${date(x.when)}</small></div>`).join('')}</div></div><div class="card panel"><div class="panel-head"><h2>Быстрые действия</h2></div><div class="activity"><button class="button secondary" data-route="issue">↗ Оформить выдачу</button><button class="button secondary" data-route="return">↙ Принять возврат</button><button class="button secondary" data-route="batches">▣ Создать партию</button></div></div></div>`;bindRoutes()}
function cylinders(){view.innerHTML=head('Данные о баллонах','Заводской номер может повторяться: учёт ведётся по внутреннему ID.',`<button class="button" id="addCylinder">+ Добавить баллон</button>`)+`<div class="toolbar"><input id="search" class="search" placeholder="Поиск по номеру, ID, организации…"></div><div class="card table-wrap"><table class="table"><thead><tr><th>Внутренний ID</th><th>Номер баллона</th><th>Объём</th><th>Статус</th><th>Кому</th><th></th></tr></thead><tbody id="cylinderRows"></tbody></table></div>`;let draw=()=>{let q=$('#search').value.toLowerCase();$('#cylinderRows').innerHTML=state.cylinders.filter(c=>[c.uid,c.id,c.status,cylinderIssues(c.uid)[0]?.org,c.manufacturer].join(' ').toLowerCase().includes(q)).map(c=>`<tr class="clickable" data-cylinder="${escapeHTML(c.uid)}"><td class="mono">${escapeHTML(c.uid)}</td><td class="mono"><strong>${escapeHTML(c.id)}</strong></td><td>${escapeHTML(c.volume)} л</td><td>${status(c.status)}</td><td>${escapeHTML(cylinderIssues(c.uid)[0]?.org || "—")}</td><td>›</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Ничего не найдено</td></tr>';document.querySelectorAll('[data-cylinder]').forEach(e=>e.onclick=()=>cylinderModal(e.dataset.cylinder))};$('#search').oninput=draw;draw();$('#addCylinder').onclick=cylinderForm}
function cylinderModal(u){let c=cyl(u),fill=c.history.filter(h=>h[1]==='Наполнение');open(`<h2>${escapeHTML(c.id)}</h2><p>Внутренний идентификатор: <strong class="mono">${escapeHTML(c.uid)}</strong></p><div class="detail-grid"><div class="detail"><span>Статус</span>${status(c.status)}</div><div class="detail"><span>Объём</span><strong>${escapeHTML(c.volume)} л</strong></div><div class="detail"><span>Производитель</span><strong>${escapeHTML(c.manufacturer||'Не указан')}</strong></div><div class="detail"><span>Держатель</span><strong>${escapeHTML(c.holder||'Не указан')}</strong></div><div class="detail"><span>Произведён</span><strong>${cylinderMonth(c.made)}</strong></div><div class="detail"><span>Освидетельствование</span><strong>${cylinderMonth(c.inspection)}</strong></div></div><h3>Наполнения и серии</h3><div class="timeline">${fill.map(h=>`<div class="timeline-row"><strong>${escapeHTML(h[2])}</strong><small>${date(h[0])}</small></div>`).join('')||'<div class="timeline-row">Данных о наполнении пока нет</div>'}</div><h3>Полная история</h3><div class="timeline">${c.history.map(h=>`<div class="timeline-row"><strong>${escapeHTML(h[1])}</strong><small>${date(h[0])} · ${escapeHTML(h[2])}</small></div>`).join('')||'<div class="timeline-row">Операций ещё не было</div>'}</div><div class="form-actions"><button class="button secondary" data-close>Закрыть</button></div>`)}
function cylinderForm(){open(`<h2>Новый баллон</h2><p>Поля со звёздочкой обязательны. Производитель и держатель — желательны.</p><form id="cylinderForm" class="form-grid"><label class="field">Номер баллона *<input required name="id"></label><label class="field">Объём, л *<input required name="volume" type="number" value="40"></label><label class="field">Дата производства *<input required name="made" type="month" placeholder="ГГГГ-ММ" pattern="[0-9]{4}-(0[1-9]|1[0-2])"></label><label class="field">Дата освидетельствования *<input required name="inspection" type="month" placeholder="ГГГГ-ММ" pattern="[0-9]{4}-(0[1-9]|1[0-2])"></label><label class="field">Производитель<input name="manufacturer"></label><label class="field">Держатель<input name="holder"></label><div class="form-actions full"><button type="button" class="button secondary" data-close>Отмена</button><button class="button">Добавить</button></div></form>`);$('#cylinderForm').onsubmit=e=>{e.preventDefault();let x=Object.fromEntries(new FormData(e.target));x.uid=uid();x.status='На складе';x.history=[[today(),'Приём','Добавлен в реестр']];state.cylinders.push(x);save();close();cylinders();toast(`Баллон добавлен: ${x.uid}`)}}
function batches(){view.innerHTML=head('Создание партий','Партии наполнения и учёт брака.',`<button class="button" id="newBatch">+ Новая партия</button>`)+`<div class="card table-wrap"><table class="table"><thead><tr><th>Серия</th><th>Наполнение</th><th>Срок годности</th><th>Наполнял</th><th>Баллонов / брак</th><th></th></tr></thead><tbody>${state.batches.map((b,i)=>{const complete=allBatchCylindersReturned(batchMovements(b));return `<tr class="${complete ? "batch-returned" : ""}"><td class="mono"><strong>${escapeHTML(b.number)}</strong>${complete ? "<small>Все баллоны возвращены</small>" : ""}</td><td>${date(b.produced)}</td><td>${date(b.expiry)}</td><td>${escapeHTML(b.filler||'—')}</td><td>${b.cylinders.length} / ${b.defects.length}</td><td><button class="button secondary small" data-batch-info="${i}">Информация</button> <button class="button secondary small" data-edit-batch="${i}">Изменить</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Партий пока нет</td></tr>'}</tbody></table></div>`;$('#newBatch').onclick=()=>batchForm();document.querySelectorAll('[data-edit-batch]').forEach(b=>b.onclick=()=>batchForm(+b.dataset.editBatch));view.querySelectorAll('[data-batch-info]').forEach(button=>button.onclick=()=>batchDetail(Number(button.dataset.batchInfo)))}
function batchForm(index) {
  const old = state.batches[index];
  const lockedNumber = old && state.issues.some(issue => issue.cylinders.some(id => seriesForCylinder(issue, id) === old.number));
  const chosen = new Set(old?.cylinders || []);
  const available = state.cylinders.filter(cylinder => chosen.has(cylinder.uid) ||
    ['На складе', 'Возвращён'].includes(cylinder.status));
  open(`<h2>${old?'Изменить партию':'Новая партия'}</h2><p>Выберите баллоны либо внесите номера вручную. При совпадающих номерах используйте внутренний ID.</p><form id="batchForm"><div class="form-grid three"><label class="field">Номер серии *<input required name="number" ${lockedNumber ? "readonly" : ""} value="${escapeHTML(old?.number||'')}"></label><label class="field">Дата наполнения *<input required name="produced" type="date" value="${escapeHTML(old?.produced||today())}"></label><label class="field">Срок годности<input id="batchExpiry" readonly value="${escapeHTML(old?.expiry||plus18(today()))}"></label><label class="field">Кто наполнял *<input required name="filler" value="${escapeHTML(old?.filler||'')}"></label><label class="field">Количество баллонов<input id="batchCount" readonly value="${chosen.size}"></label><label class="field">Дата выдачи разрешения *<input required name="permissionDate" type="date" value="${escapeHTML(old?.permissionDate || '')}"></label><label class="field">Объём баллонов *<select required name="volume"><option value="">Выберите объём</option>${[2,10,40].map(volume=>`<option value="${volume}" ${Number(old?.volume)===volume?'selected':''}>${volume} л</option>`).join('')}</select></label><label class="field">Примечание<input name="note" value="${escapeHTML(old?.note||'')}"></label><label class="field full">Номера вручную<textarea name="manual" placeholder="По одному номеру или ID в строке"></textarea></label><label class="field">Сертификат качества<input name="certificate" type="file" accept=".pdf,.doc,.docx,image/*"><small>Необязательно, но желательно</small></label><label class="field">Разрешение<input name="permit" type="file" accept=".pdf,.doc,.docx,image/*"><small>Необязательно, но желательно</small></label></div><div class="scan-line">Выберите баллоны из наличия</div><div class="chips">${available.map(c=>`<label class="chip"><input type="checkbox" name="cylinder" value="${escapeHTML(c.uid)}" ${chosen.has(c.uid)?'checked':''}> ${escapeHTML(c.id)} · ${escapeHTML(c.volume)} л <small>${escapeHTML(c.uid)}</small></label>`).join('')||'Нет доступных баллонов'}</div><label class="field">Бракованные баллоны (номера или ID)<textarea name="defects">${escapeHTML((old?.defects||[]).map(u=>cyl(u)?.uid).join('\n'))}</textarea></label><div class="form-actions"><button type="button" class="button secondary" data-close>Отмена</button><button type="submit" class="button">${old?'Сохранить изменения':'Создать партию'}</button></div></form>`);
  const form = $('#batchForm');
  form.onchange = () => {
    $('#batchCount').value = form.querySelectorAll('input[name="cylinder"]:checked').length;
  };
  form.elements.produced.oninput = event => {
    $('#batchExpiry').value = plus18(event.target.value);
  };
  form.onsubmit = event => {
    event.preventDefault();
    if (!form.querySelector('[type="submit"]').disabled) saveBatch(form, old, available);
  };
}

async function finishIssue(e,preview){if(e)e.preventDefault();let x=issueData();if(!x)return;if(preview){protocol(x);return}const submitButton=e?.submitter;if(submitButton)submitButton.disabled=true;x.cancelled=false;x.verificationToken=crypto.randomUUID();state.issues.unshift(x);x.cylinders.forEach(u=>{let c=cyl(u);c.status='Выдан';c.history.unshift([x.date,'Выдача',`Выдан ${x.org}, накладная №${x.invoice}, серия ${seriesForCylinder(x,u)}`,x.verificationToken])});save();try{if(cloudMode)await window.BALLOON_CLOUD_SYNC.whenSaved();issuanceForm();toast('Выдача оформлена');protocol(x)}catch(error){toast('Выдача не сохранена: '+error.message)}}
function editIssue(n){let x=state.issues[n];open(`<h2>Изменить выдачу</h2><p>Запись останется в истории. Состав баллонов изменяется только через аннулирование и новую выдачу.</p><form id="editIssue" class="form-grid"><label class="field">Организация<input name="org" required value="${escapeHTML(x.org)}"></label><label class="field">Накладная<input name="invoice" required value="${escapeHTML(x.invoice)}"></label><label class="field">Дата выдачи<input name="date" required type="date" value="${escapeHTML(x.date)}"></label><label class="field">Выдал<input name="employee" required value="${escapeHTML(x.employee)}"></label><div class="form-actions full"><button type="button" class="button secondary" data-close>Отмена</button><button class="button">Сохранить</button></div></form>`);$('#editIssue').onsubmit=e=>{e.preventDefault();Object.assign(x,Object.fromEntries(new FormData(e.target)));save();close();issuanceForm();toast('Выдача исправлена')}}function cancelIssue(n){let x=state.issues[n];x.cylinders.forEach(u=>{let c=cyl(u);if(c&&currentCylinderIssue(c)===x){c.status='На складе';c.history.unshift([today(),'Аннулирование',`Выдача по накладной №${x.invoice} аннулирована`])}});x.cancelled=true;save();issuanceForm();toast('Выдача аннулирована и исключена из остатка')}
function protocol(x){let rows=x.cylinders.map((u,i)=>{let c=cyl(u);return`<tr><td>${i+1}</td><td>${c?.id||u}</td><td>${c?.volume||'—'} л</td></tr>`}).join('');open(`<div id="protocolDocument"><h2>Протокол поставки №${escapeHTML(x.invoice)}</h2><p>${escapeHTML(x.org)} · ${date(x.date)}</p><div class="detail-grid"><div class="detail"><span>Серия</span><strong>${escapeHTML(x.batch)}</strong></div><div class="detail"><span>Производство</span><strong>${date(x.production)}</strong></div><div class="detail"><span>Срок годности</span><strong>${date(x.expiry)}</strong></div><div class="detail"><span>Разрешение</span><strong>${escapeHTML(x.permission)}</strong></div></div><table class="table"><thead><tr><th>№</th><th>Баллон</th><th>Объём</th></tr></thead><tbody>${rows}</tbody></table><p>Выдал: <strong>${escapeHTML(x.employee)}</strong></p></div><div class="form-actions"><button class="button secondary" data-close>Закрыть</button><button class="button secondary" id="wordProtocol">Word</button><button class="button" id="printProtocol">Печать / PDF</button></div>`);$('#printProtocol').onclick=()=>window.print();$('#wordProtocol').onclick=()=>downloadWord(x.invoice)}function downloadWord(n){let h=`<html><meta charset="utf-8"><body>${$('#protocolDocument').innerHTML}</body></html>`,b=new Blob(['\ufeff',h],{type:'application/msword'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`Протокол_${n}.doc`;a.click();URL.revokeObjectURL(a.href)}
function receive(){view.innerHTML=head('Приём баллонов','Добавьте новые или б/у баллоны, ранее не стоявшие на балансе')+`<form id="receiveForm" class="card form-card"><h2>Приём на баланс</h2><div class="form-grid"><label class="field">Номер баллона *<input required name="id"></label><label class="field">Состояние<select name="condition"><option>Новый</option><option>Б/у</option></select></label><label class="field">Объём, л *<input required name="volume" type="number" value="40"></label><label class="field">Дата производства *<input required name="made" type="date"></label><label class="field">Дата освидетельствования *<input required name="inspection" type="date"></label><label class="field">Источник / поставщик<input name="source"></label><label class="field full">Примечание<textarea name="note"></textarea></label></div><div class="form-actions"><button class="button">Принять на баланс</button></div></form>`;$('#receiveForm').onsubmit=e=>{e.preventDefault();let x=Object.fromEntries(new FormData(e.target));x.uid=uid();x.status='На складе';x.history=[[today(),'Приём',`${x.condition}; ${x.source||'источник не указан'}`]];state.cylinders.push(x);save();e.target.reset();toast(`Баллон принят: ${x.uid}`)}}
function open(h){$('#modalContent').innerHTML=`<button type="button" class="modal-close" data-close aria-label="Закрыть окно" title="Закрыть">×</button>${h}`;$('#modal').classList.remove('hidden');document.querySelectorAll('#modal [data-close]').forEach(x=>x.onclick=close)}function close(){$('#modal').classList.add('hidden')}function render(){({dashboard,cylinders,batches,issue:issuanceForm,return:returns,'return-history':returnHistory,receive}[route])()}$('#menuButton').onclick=()=>$('.sidebar').classList.toggle('open');$('#modal').onclick=e=>{if(e.target.id==='modal')close()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').classList.contains('hidden'))close()});renderNav();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');

// Manual serials entered while creating a batch become incomplete registry cards.
function nextDeliveryNumber(){let numbers=state.issues.map(i=>+(String(i.deliveryNumber||'').match(/\d+/)?.[0]||0));return`П-${String((Math.max(0,...numbers)+1)).padStart(5,'0')}`}
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function protocol(x){let rows=x.cylinders.map((u,i)=>{let c=cyl(u);return`<tr><td>${i+1}</td><td>${escapeHTML(c?.id||u)}</td><td>${escapeHTML(c?.volume||'не указан')} л</td><td>${escapeHTML(seriesForCylinder(x,u))}</td></tr>`}).join('');open(`<div id="protocolDocument"><h2>Протокол поставки ${escapeHTML(x.deliveryNumber||'')}</h2><p>${escapeHTML(x.org)} · ${date(x.date)}</p><div class="detail-grid"><div class="detail"><span>Номер поставки</span><strong>${escapeHTML(x.deliveryNumber||'—')}</strong></div><div class="detail"><span>Накладная бухгалтерии</span><strong>№${escapeHTML(x.invoice)}</strong></div><div class="detail"><span>Серия</span><strong>${escapeHTML(x.batch)}</strong></div>${x.seriesDetails?.length>1?"":`<div class="detail"><span>Дата производства</span><strong>${date(x.production)}</strong></div><div class="detail"><span>Дата разрешения</span><strong>${date(x.permission)}</strong></div><div class="detail"><span>Срок годности</span><strong>${date(x.expiry)}</strong></div>`}<div class="detail"><span>Баллонов</span><strong>${x.cylinders.length}</strong></div></div>${issueSeriesDates(x)}<table class="table"><thead><tr><th>№</th><th>Баллон</th><th>Объём</th><th>Серия</th></tr></thead><tbody>${rows}</tbody></table><p>Выдал: <strong>${escapeHTML(x.employee)}</strong> ____________________</p><p>Получил: ____________________ &nbsp; Подпись: ____________________</p></div><div class="form-actions"><button class="button secondary" data-close>Закрыть</button><button class="button secondary" id="wordProtocol">Word</button><button class="button" id="printProtocol">Печать / PDF</button></div>`);$('#printProtocol').onclick=()=>window.print();$('#wordProtocol').onclick=()=>downloadWord(x.deliveryNumber||x.invoice)}

nav.splice(3,0,['batch-data','▤','Данные о партиях']);
function render(){({dashboard,cylinders,batches,'batch-data':batchesData,issue:issuanceForm,return:returns,'return-history':returnHistory,receive}[route])()}
renderNav();

function batchesData(){view.innerHTML=head('Данные о партиях','Реестр загруженных серий, их реквизиты и документы.')+`<div class="card table-wrap"><table class="table"><thead><tr><th>Серия</th><th>Дата наполнения</th><th>Срок годности</th><th>Объём</th><th>Наполнял</th><th>Баллонов</th><th>Документы</th><th></th></tr></thead><tbody>${state.batches.map((b,i)=>`<tr><td class="mono"><strong>${escapeHTML(b.number)}</strong></td><td>${date(b.produced)}</td><td>${date(b.expiry)}</td><td>${escapeHTML(b.volume?b.volume+' л':'—')}</td><td>${escapeHTML(b.filler||'—')}</td><td>${b.cylinders.length}</td><td>${b.certificateName?'Сертификат загружен':'Сертификат не загружен'}<br>${b.permitDocumentName?'Разрешение загружено':'Разрешение не загружено'}</td><td><button class="button secondary small" data-batch-detail="${i}">Подробнее</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Загруженных серий пока нет</td></tr>'}</tbody></table></div>`;document.querySelectorAll('[data-batch-detail]').forEach(b=>b.onclick=()=>batchDetail(+b.dataset.batchDetail))}
function batchDetail(index){let b=state.batches[index],items=b.cylinders.map(u=>cyl(u)).filter(Boolean),defects=(b.defects||[]).map(u=>cyl(u)).filter(Boolean);open(`<h2>Серия ${escapeHTML(b.number)}</h2><p>Детальная информация о наполнении и составе партии.</p><div class="detail-grid"><div class="detail"><span>Дата наполнения</span><strong>${date(b.produced)}</strong></div><div class="detail"><span>Срок годности</span><strong>${date(b.expiry)}</strong></div><div class="detail"><span>Объём серии</span><strong>${escapeHTML(b.volume?b.volume+' л':'Не указан')}</strong></div><div class="detail"><span>Наполнял</span><strong>${escapeHTML(b.filler||'—')}</strong></div><div class="detail"><span>Дата разрешения</span><strong>${date(b.permissionDate)}</strong></div><div class="detail"><span>Баллонов</span><strong>${items.length}</strong></div></div><div class="scan-line">Сертификат качества: ${escapeHTML(b.certificateName||'не загружен')}<br>Разрешение: ${escapeHTML(b.permitDocumentName||'не загружено')}</div><h3>Баллоны в партии</h3><div class="table-wrap"><table class="table"><thead><tr><th>Номер</th><th>Внутренний ID</th><th>Объём</th><th>Статус</th><th>Производство</th><th>Освидетельствование</th></tr></thead><tbody>${items.map(c=>`<tr><td class="mono"><strong>${escapeHTML(c.id)}</strong></td><td class="mono">${escapeHTML(c.uid)}</td><td>${escapeHTML(c.volume||b.volume||'—')} л</td><td>${status(c.status)}</td><td>${cylinderMonth(c.made)}</td><td>${cylinderMonth(c.inspection)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">В серии пока нет баллонов</td></tr>'}</tbody></table></div>${defects.length?`<h3>Бракованные баллоны</h3><p>${defects.map(c=>`${escapeHTML(c.id)} (${escapeHTML(c.volume||b.volume||'—')} л)`).join(', ')}</p>`:''}<div class="form-actions"><button class="button secondary" data-close>Закрыть</button></div>`)}

state.organizations??=[{name:'ООО «Север»',inn:'',contact:''}];
if(!nav.some(n=>n[0]==='organizations'))nav.splice(nav.findIndex(item => item[0] === 'return') + 1, 0, ['return-history','↶','История возврата']);
nav.push(['organizations','▦','Организации']);
function organizations(){view.innerHTML=head('Организации','Справочник покупателей кислорода.',`<button class="button" id="addOrganization">+ Добавить организацию</button>`)+`<div class="card table-wrap"><table class="table"><thead><tr><th>Наименование</th><th>ИНН</th><th>Контакт</th></tr></thead><tbody>${state.organizations.map(o=>`<tr><td><strong>${escapeHTML(o.name)}</strong></td><td>${escapeHTML(o.inn||'—')}</td><td>${escapeHTML(o.contact||'—')}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">Организаций пока нет</td></tr>'}</tbody></table></div>`;$('#addOrganization').onclick=organizationForm}
function organizationForm(){open(`<h2>Новая организация</h2><p>Запись появится в списке при оформлении выдачи.</p><form id="organizationForm" class="form-grid"><label class="field full">Наименование *<input required name="name"></label><label class="field">ИНН<input name="inn"></label><label class="field">Контактное лицо / телефон<input name="contact"></label><div class="form-actions full"><button type="button" class="button secondary" data-close>Отмена</button><button class="button">Добавить</button></div></form>`);$('#organizationForm').onsubmit=e=>{e.preventDefault();let o=Object.fromEntries(new FormData(e.target));if(state.organizations.some(x=>x.name.toLowerCase()===o.name.toLowerCase())){toast('Такая организация уже есть');return}state.organizations.push(o);save();close();organizations();toast('Организация добавлена')}}


function render(){({dashboard,cylinders,batches,'batch-data':batchesData,issue:issuanceForm,return:returns,'return-history':returnHistory,receive,organizations}[route])()}
renderNav();

if(!nav.some(n=>n[0]==='issue-history'))nav.splice(nav.findIndex(n=>n[0]==='issue')+1,0,['issue-history','☷','История выдачи']);
if(!nav.some(n=>n[0]==='audit'))nav.splice(nav.findIndex(n=>n[0]==='issue-history')+1,0,['audit','≡','Журнал изменений']);
function auditPage(){
  view.innerHTML=head('Журнал изменений','Записи сервера: кто и когда сохранил изменение реестра.')+'<div class="card table-wrap"><table class="table"><thead><tr><th>Версия</th><th>Когда</th><th>Сотрудник</th><th>Действие</th><th>Изменение количества</th></tr></thead><tbody id="auditRows"><tr><td colspan="5" class="empty">Загрузка…</td></tr></tbody></table></div>';
  if(!window.BALLOON_AUDIT_API){$('#auditRows').innerHTML='<tr><td colspan="5" class="empty">Журнал доступен в облачной версии</td></tr>';return}
  window.BALLOON_AUDIT_API.list().then(rows=>{
    if(route!=='audit')return;
    $('#auditRows').innerHTML=rows.map(row=>`<tr><td class="mono">${row.version}</td><td>${new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(new Date(row.changed_at))}</td><td>${escapeHTML(row.actor_name)}</td><td>${escapeHTML(row.note)}</td><td>Баллоны: ${row.cylinders_delta>0?'+':''}${row.cylinders_delta}; партии: ${row.batches_delta>0?'+':''}${row.batches_delta}; выдачи: ${row.issues_delta>0?'+':''}${row.issues_delta}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Изменений пока нет</td></tr>';
  }).catch(error=>{if(route==='audit')$('#auditRows').innerHTML=`<tr><td colspan="5" class="empty">${escapeHTML(error.message)}</td></tr>`});
}

function issueHistory(){view.innerHTML=head('История выдачи','Все оформленные выдачи, включая аннулированные записи.')+`<div class="card table-wrap"><table class="table"><thead><tr><th>Номер протокола</th><th>Дата</th><th>Организация</th><th>Накладная</th><th>Серия</th><th>Баллонов</th><th>Статус</th><th></th></tr></thead><tbody>${state.issues.map((i,n)=>`<tr><td class="mono"><strong>${escapeHTML(i.deliveryNumber||'—')}</strong></td><td>${date(i.date)}</td><td>${escapeHTML(i.org)}</td><td>№${escapeHTML(i.invoice)}</td><td>${escapeHTML(i.batch)}</td><td>${i.cylinders.length}</td><td>${status(i.cancelled?'Аннулирован':'Действует')}</td><td><button class="button secondary small" data-history-issue="${n}">Подробнее</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Выдач пока нет</td></tr>'}</tbody></table></div>`;document.querySelectorAll('[data-history-issue]').forEach(b=>b.onclick=()=>issueDetail(+b.dataset.historyIssue))}
function issueDetail(index){let i=state.issues[index],items=i.cylinders.map(u=>cyl(u)).filter(Boolean);open(`<h2>Протокол ${escapeHTML(i.deliveryNumber||'без номера')}</h2><p>${i.cancelled?'Запись аннулирована и не влияет на остаток.':'Действующая выдача.'}</p><div class="detail-grid"><div class="detail"><span>Организация</span><strong>${escapeHTML(i.org)}</strong></div><div class="detail"><span>Дата выдачи</span><strong>${date(i.date)}</strong></div><div class="detail"><span>Накладная</span><strong>№${escapeHTML(i.invoice)}</strong></div><div class="detail"><span>Серия</span><strong>${escapeHTML(i.batch)}</strong></div><div class="detail"><span>Выдал</span><strong>${escapeHTML(i.employee)}</strong></div><div class="detail"><span>Разрешение</span><strong>${escapeHTML(i.permission||'—')}</strong></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Номер баллона</th><th>Внутренний ID</th><th>Объём</th><th>Текущий статус</th></tr></thead><tbody>${items.map(c=>`<tr><td class="mono"><strong>${escapeHTML(c.id)}</strong></td><td class="mono">${escapeHTML(c.uid)}</td><td>${escapeHTML(c.volume||'—')} л</td><td>${status(c.status)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Состав выдачи не найден</td></tr>'}</tbody></table></div><div class="form-actions"><button class="button secondary" data-close>Закрыть</button></div>`)}
function render(){({dashboard,cylinders,batches,'batch-data':batchesData,issue:issuanceForm,'issue-history':issueHistory,audit:auditPage,return:returns,'return-history':returnHistory,receive,organizations}[route])()}
renderNav();

// The dedicated "История выдачи" section is the single source for the issue journal.


const roleLabels={warehouseman:'Кладовщик',akds_head:'Начальник АКДС',skk_head:'Начальник СКК',operator:'Оператор'};
const assignableRoles=['akds_head','skk_head','warehouseman','operator'];
function routesFor(role){const roles={warehouseman:nav.map(n=>n[0]),akds_head:nav.map(n=>n[0]),skk_head:['dashboard','cylinders','batches','batch-data','issue-history','return-history','audit'],operator:nav.map(n=>n[0])};return roles[role]||roles.operator}
function activeRole(){return window.BALLOON_ROLE||'operator'}
function renderNav(){let allowed=routesFor(activeRole());if(!allowed.includes(route))route='dashboard';$('#nav').innerHTML=nav.filter(n=>allowed.includes(n[0])).map(n=>`<button class="nav-item ${route===n[0]?'active':''}" data-route="${n[0]}"><span class="nav-icon">${n[1]}</span>${n[2]}</button>`).join('');$('#breadcrumbs').textContent=nav.find(n=>n[0]===route)?.[2]||'';bindRoutes()}
function go(r){if(!routesFor(activeRole()).includes(r)){toast('У этой роли нет доступа к разделу');return}route=r;renderNav();render();applyRoleControls();$('.sidebar').classList.remove('open')}
function applyRoleControls(){
  if(activeRole()!=='operator')return;
  document.querySelectorAll('#view button').forEach(button=>{
    if(button.hasAttribute('data-batch-detail')||button.hasAttribute('data-batch-info')||button.hasAttribute('data-history-issue')||button.hasAttribute('data-return-record'))return;
    button.disabled=true;
    button.title='Режим оператора: изменение данных недоступно';
  });
  document.querySelectorAll('#view input:not(#search), #view select, #view textarea').forEach(field=>field.disabled=true);
}
window.addEventListener('balloon:profile',e=>{window.BALLOON_ROLE=e.detail.role;window.BALLOON_DISPLAY_NAME=e.detail.full_name;let p=document.querySelector('.profile');if(p){let strong=p.querySelector('strong'),small=p.querySelector('small');if(strong)strong.textContent=e.detail.full_name;if(small)small.textContent=roleLabels[e.detail.role]||e.detail.role}renderNav();render();applyRoleControls()});

let currentProfile=null;
window.addEventListener('balloon:profile',e=>{currentProfile=e.detail});
window.addEventListener('balloon:profile',e=>{const avatar=$('.avatar');if(avatar)avatar.textContent=e.detail.full_name.trim().charAt(0).toUpperCase()||'С'});
const employeeNameObserver=new MutationObserver(()=>document.querySelectorAll('#view [name=employee], #view [data-field=employee]').forEach(input=>{if(input.value==='Алексей Петров')input.value=window.BALLOON_DISPLAY_NAME||''}));
employeeNameObserver.observe(view,{childList:true,subtree:true});
const showOriginalBatchDetail=batchDetail;
batchDetail=function(index){
  showOriginalBatchDetail(index);
  const batch=state.batches[index],area=$('#modalContent .scan-line');
  if(!batch)return;
  appendBatchMovements(batch);
  if(!area)return;
  area.textContent='Документы партии';
  for(const [label,name,path] of [['Сертификат качества',batch.certificateName,batch.certificatePath],['Разрешение',batch.permitDocumentName,batch.permitDocumentPath]]){
    const row=document.createElement('div');row.style.marginTop='8px';
    if(path){const button=document.createElement('button');button.type='button';button.className='button secondary small';button.textContent=`Скачать ${label}: ${name}`;button.onclick=()=>window.BALLOON_DOCUMENTS_API?window.BALLOON_DOCUMENTS_API.download(path,name).catch(error=>toast(error.message)):toast('Документ доступен только в облачной версии');row.append(button)}
    else row.textContent=`${label}: ${name?'название указано, файл не загружен':'файл не загружен'}`;
    area.append(row);
  }
};
document.addEventListener('submit',event=>{
  const form=event.target,labels={cylinderForm:'Добавление баллона',batchForm:'Создание или изменение партии',issueForm:'Выдача баллонов',receiveForm:'Приём баллона',organizationForm:'Добавление организации'};
  if(labels[form?.id])window.BALLOON_AUDIT_NOTE=labels[form.id];
},true);
const showOriginalEditIssue=editIssue;
editIssue=function(index){
  showOriginalEditIssue(index);
  const form=$('#editIssue');
  form.insertAdjacentHTML('beforeend','<label class="field full">Причина исправления *<input name="auditReason" required maxlength="300"></label>');
  const submit=form.onsubmit;
  form.onsubmit=event=>{
    window.BALLOON_AUDIT_NOTE=`Исправление выдачи: ${form.elements.auditReason.value.trim()}`;
    form.elements.auditReason.disabled=true;
    submit(event);
  };
};
const applyOriginalCancellation=cancelIssue;
cancelIssue=function(index){
  open('<h2>Аннулирование выдачи</h2><p>Укажите причину. Запись останется в истории.</p><form id="cancelReasonForm" class="form-grid"><label class="field full">Причина *<textarea name="reason" required maxlength="300"></textarea></label><div class="form-actions full"><button type="button" class="button secondary" data-close>Отмена</button><button class="button danger">Аннулировать</button></div></form>');
  $('#cancelReasonForm').onsubmit=event=>{
    event.preventDefault();
    window.BALLOON_AUDIT_NOTE=`Аннулирование выдачи: ${event.target.elements.reason.value.trim()}`;
    close();applyOriginalCancellation(index);
  };
};
$('#settingsButton').onclick=()=>{
  const name=currentProfile?.full_name||'Локальный пользователь';
  const role=currentProfile?(roleLabels[currentProfile.role]||currentProfile.role):'Демо-режим';
  const sync=$('#syncStatus');
  open(`<h2>Настройки</h2><p>Имя сотрудника и права доступа.</p><form id="settingsNameForm" class="form-grid"><label class="field full">Ваше имя<input name="fullName" required minlength="2" maxlength="100"></label><div class="form-actions full"><button class="button">Сохранить имя</button></div></form><div class="detail-grid" style="margin-top:20px"><div class="detail"><span>Роль</span><strong id="settingsRole"></strong></div></div><p>Роль назначает начальник АКДС. Оператор пока может просматривать данные.</p>${currentProfile?.role==='akds_head'?'<button type="button" class="button secondary" id="chooseRoleButton">Управление сотрудниками</button><div id="roleManager" hidden></div>':''}<div class="scan-line" id="settingsSync"></div><div class="form-actions"><button type="button" class="button secondary" data-close>Закрыть</button>${currentProfile?'<button type="button" class="button danger" id="signOutButton">Выйти из аккаунта</button>':''}</div>`);
  $('#settingsNameForm').elements.fullName.value=name;
  $('#settingsRole').textContent=role;
  $('#settingsSync').textContent=sync?.title||sync?.textContent?.trim()||'Состояние синхронизации неизвестно';
  $('#settingsNameForm').onsubmit=async e=>{
    e.preventDefault();
    const button=e.target.querySelector('button');button.disabled=true;
    try{const fullName=await window.BALLOON_ACCOUNT_API.saveName(e.target.elements.fullName.value);toast(`Имя сохранено: ${fullName}`)}
    catch(error){toast(error.message)}finally{button.disabled=false}
  };
  $('#chooseRoleButton')?.addEventListener('click',showRoleManager);
  $('#signOutButton')?.addEventListener('click',()=>window.dispatchEvent(new Event('balloon:signout')));
};

async function showRoleManager(){
  const area=$('#roleManager');area.hidden=false;area.textContent='Загрузка сотрудников…';
  try{
    const staff=await window.BALLOON_ACCOUNT_API.listStaff();
    if(!$('#roleManager'))return;
    area.replaceChildren();
    const intro=document.createElement('p');intro.textContent='Зарегистрированные сотрудники, подтверждение почты и последний вход. Новые заявки требуют одобрения.';area.append(intro);
    if(!staff.length){const empty=document.createElement('p');empty.textContent='Других аккаунтов пока нет.';area.append(empty)}
    const formatTime=value=>value?new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';
    for(const member of staff){
      const card=document.createElement('div');card.className='staff-card';
      const title=document.createElement('strong');title.textContent=`${member.full_name} · ${member.email}`;
      const info=document.createElement('p');info.textContent=`${member.active?'Активен':'Ожидает одобрения / доступ закрыт'} · Почта: ${member.email_confirmed_at?'подтверждена':'не подтверждена'} · Регистрация: ${formatTime(member.created_at)} · Последний вход в приложение: ${formatTime(member.last_app_login_at)}`;
      const requested=document.createElement('p');requested.textContent=`Запрошена роль: ${roleLabels[member.requested_role]||'—'}`;
      const controls=document.createElement('div');controls.className='staff-actions';
      const role=document.createElement('select');role.setAttribute('aria-label',`Роль: ${member.full_name}`);
      for(const value of assignableRoles){const option=document.createElement('option');option.value=value;option.textContent=roleLabels[value];role.append(option)}
      role.value=member.active?member.role:(member.requested_role||'operator');
      const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='button small';saveButton.textContent=member.active?'Сохранить роль':'Одобрить';
      saveButton.onclick=async()=>{saveButton.disabled=true;try{await window.BALLOON_ACCOUNT_API.assignRole(member.id,role.value);toast('Права сотрудника сохранены');showRoleManager()}catch(error){toast(error.message);saveButton.disabled=false}};
      controls.append(role,saveButton);
      if(member.active){const removeButton=document.createElement('button');removeButton.type='button';removeButton.className='button danger small';removeButton.textContent='Удалить доступ';removeButton.onclick=async()=>{if(!confirm(`Закрыть доступ для ${member.full_name}? История операций сохранится.`))return;removeButton.disabled=true;try{await window.BALLOON_ACCOUNT_API.deactivateStaff(member.id);toast('Доступ сотрудника закрыт');showRoleManager()}catch(error){toast(error.message);removeButton.disabled=false}};controls.append(removeButton)}
      card.append(title,info,requested,controls);area.append(card);
    }
  }catch(error){area.textContent=`Не удалось загрузить сотрудников: ${error.message}`}
}

function verificationURL(token){return `${location.origin}${location.pathname}?verify=${encodeURIComponent(token)}`}
const showOriginalProtocol=protocol;
protocol=function(issue){
  showOriginalProtocol(issue);
  if(!issue.verificationToken)return;
  const documentArea=$('#protocolDocument');
  const line=document.createElement('p');
  line.className='verification-line';
  line.append('Проверка подлинности протокола: ');
  const link=document.createElement('a');
  link.href=verificationURL(issue.verificationToken);
  link.textContent=link.href;
  line.append(link);
  documentArea.append(line);
};
const showOriginalIssueDetail=issueDetail;
issueDetail=function(index){
  showOriginalIssueDetail(index);
  const issue=state.issues[index],actions=$('#modalContent .form-actions');
  if(!issue?.verificationToken||!actions)return;
  const link=document.createElement('a');
  link.href=verificationURL(issue.verificationToken);
  link.target='_blank';
  link.rel='noopener';
  link.className='button secondary';
  link.textContent='Проверить протокол';
  actions.prepend(link);
  if(!issue.cancelled){
    const print=document.createElement('button');
    print.type='button';print.className='button secondary';print.textContent='Открыть протокол';
    print.onclick=()=>protocol(issue);
    actions.prepend(print);
  }
};

const backupInterval=7*24*60*60*1000;
function backupIsDue(){const last=Date.parse(localStorage.getItem('balloon-last-backup')||'');return !Number.isFinite(last)||Date.now()-last>backupInterval}
function mayExportBackup(){return ['warehouseman','akds_head'].includes(currentProfile?.role)}
const showOriginalDashboard=dashboard;
dashboard=function(){
  showOriginalDashboard();
  if(!mayExportBackup()||!backupIsDue())return;
  const notice=document.createElement('div');notice.className='scan-line backup-notice';
  notice.append('Резервная копия на этом устройстве не создавалась или устарела. ');
  const button=document.createElement('button');button.type='button';button.className='button secondary small';button.textContent='Скачать копию';
  button.onclick=()=>$('#settingsButton').click();notice.append(button);view.prepend(notice);
};
const showOriginalSettings=$('#settingsButton').onclick;
$('#settingsButton').onclick=()=>{
  showOriginalSettings();
  if(!mayExportBackup())return;
  const area=document.createElement('div');area.className='scan-line';
  const last=localStorage.getItem('balloon-last-backup');
  const description=document.createElement('p');
  description.textContent=`Резервная копия реестра и документов. Последняя загрузка на этом устройстве: ${last?new Date(last).toLocaleString('ru-RU'):'не выполнялась'}.`;
  const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent='Скачать резервную копию';
  button.onclick=async()=>{
    button.disabled=true;button.textContent='Подготовка копии…';
    try{
      const filename=await window.BALLOON_BACKUP_API.download();
      localStorage.setItem('balloon-last-backup',new Date().toISOString());
      description.textContent=`Копия подготовлена: ${filename}. Сохраните файл вне устройства.`;
      toast('Резервная копия скачана');
    }catch(error){toast(`Копия не создана: ${error.message}`)}
    finally{button.disabled=false;button.textContent='Скачать резервную копию'}
  };
  area.append(description,button);$('#settingsSync').after(area);
};

function volumeBreakdown(items) {
  return `<div class="volume-breakdown">${[40, 10, 2].map(volume =>
    `<span>${volume} л <strong>${items.filter(item => Number(item.volume) === volume).length}</strong></span>`
  ).join('')}</div>`;
}

function cylinderMonth(value) {
  const parts = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(value || '');
  if (!parts) return date(value);
  return `${parts[2]}.${parts[1]}`;
}

function localDay(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function plus18(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-').map(Number);
  const last = new Date(Date.UTC(year, month + 18, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 17, Math.min(day, last))).toISOString().slice(0, 10);
}

function batchTokens(value) {
  return [...new Set(value.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean))];
}

function findBatchCylinder(value, candidates) {
  const exact = candidates.find(cylinder => cylinder.uid === value);
  const matches = exact ? [exact] : candidates.filter(cylinder => String(cylinder.id) === value);
  if (matches.length > 1) throw new Error(`Номер ${value} повторяется. Укажите внутренний ID.`);
  return matches[0];
}

function prepareBatch(form, original, available, fields = new FormData(form)) {
  const batch = Object.fromEntries(fields);
  batch.number = batch.number.trim();
  batch.filler = batch.filler.trim();
  if (!batch.number || !batch.filler) throw new Error('Укажите номер серии и ответственного за наполнение.');
  if (state.batches.some(existing => existing !== original && existing.number.trim() === batch.number)) {
    throw new Error(`Серия ${batch.number} уже существует.`);
  }
  delete batch.cylinder;
  delete batch.manual;
  delete batch.certificate;
  delete batch.permit;
  const chosen = new Set(fields.getAll('cylinder'));
  const created = [];
  for (const token of batchTokens(String(fields.get('manual') || ''))) {
    const cylinder = findBatchCylinder(token, state.cylinders);
    if (cylinder) {
      if (!available.includes(cylinder)) throw new Error(`Баллон ${token} сейчас недоступен для наполнения.`);
      chosen.add(cylinder.uid);
    } else {
      const uid = `CYL-${crypto.randomUUID()}`;
      created.push({ uid, id: token, volume: batch.volume, made: '', inspection: '', manufacturer: '', holder: '',
        status: 'На складе', incomplete: true, history: [[today(), 'Автосоздание', 'Карточка создана при наполнении серии']] });
      chosen.add(uid);
    }
  }
  if (!chosen.size) throw new Error('Укажите хотя бы один баллон.');
  const candidates = [...state.cylinders, ...created];
  const defects = batchTokens(batch.defects).map(token => {
    const cylinder = findBatchCylinder(token, candidates);
    if (!cylinder || !chosen.has(cylinder.uid)) throw new Error(`Сначала включите баллон ${token} в серию, чтобы отметить брак.`);
    if (cylinder.status === 'Выдан') throw new Error(`Баллон ${token} ещё у организации. Сначала оформите возврат.`);
    return cylinder.uid;
  });
  const onRecord = original ? state.issues.flatMap(issue => issue.cylinders.filter(uid =>
    seriesForCylinder(issue, uid) === original.number)) : [];
  if (onRecord.length && batch.number !== original.number) {
    throw new Error('Номер серии уже указан в протоколе выдачи.');
  }
  if (original && onRecord.some(uid => !chosen.has(uid))) {
    throw new Error('В составе серии есть баллоны с протоколами выдачи. Их нельзя исключить из серии.');
  }
  batch.cylinders = [...chosen];
  batch.defects = defects;
  batch.expiry = original && original.produced === batch.produced
    ? original.expiry || plus18(batch.produced) : plus18(batch.produced);
  return { batch, created };
}

async function saveBatch(form, original, available) {
  let prepared;
  const fields = new FormData(form);
  try { prepared = prepareBatch(form, original, available, fields); }
  catch (error) { toast(error.message); return; }
  const { batch, created } = prepared;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  state.cylinders.push(...created);
  for (const id of batch.cylinders) {
    const cylinder = cyl(id);
    cylinder.volume ||= batch.volume;
    const previousFill = original && cylinder.history.find(event =>
      event[1] === 'Наполнение' && event[2].startsWith(`Серия ${original.number};`));
    const label = `Серия ${batch.number}; срок до ${date(batch.expiry)}`;
    if (previousFill) {
      previousFill[0] = batch.produced;
      previousFill[2] = label;
    } else {
      cylinder.history.unshift([batch.produced, 'Наполнение', label]);
    }
    if (batch.defects.includes(id) && cylinder.status !== 'Брак') {
      cylinder.status = 'Брак';
      cylinder.history.unshift([batch.produced, 'Брак', `Забракован в серии ${batch.number}`]);
    }
  }
  const savedBatch = original ? Object.assign(original, batch) : batch;
  if (!original) state.batches.unshift(savedBatch);
  save(original ? 'Изменение партии' : 'Создание партии');
  try {
    if (cloudMode) await window.BALLOON_CLOUD_SYNC.whenSaved();
  } catch (error) {
    if ($('#batchForm') === form) close();
    toast(`Партия не сохранена: ${error.message}`);
    return;
  }
  if ($('#batchForm') === form) close();
  if (route === 'batches') render();
  toast(created.length ? `Партия сохранена. Неполных карточек: ${created.length}` : 'Партия сохранена');
  const documents = [['certificate', 'certificate'], ['permit', 'permitDocument']];
  const failures = [];
  let uploaded = 0;
  for (const [input, property] of documents) {
    const file = fields.get(input);
    if (!file?.name) continue;
    try {
      if (!cloudMode) throw new Error('Для документов нужна облачная версия');
      const path = await window.BALLOON_DOCUMENTS_API.upload(file, input);
      if (!state.batches.includes(savedBatch)) throw new Error('Откройте серию заново');
      savedBatch[property + 'Name'] = file.name;
      savedBatch[property + 'Path'] = path;
      uploaded++;
    } catch (error) { failures.push(`${file.name}: ${error.message}`); }
  }
  if (uploaded) {
    save(`Документы серии ${savedBatch.number}`);
    try { await window.BALLOON_CLOUD_SYNC.whenSaved(); }
    catch (error) { failures.push(error.message); }
  }
  if (failures.length) toast(`Партия сохранена, ошибка с документами: ${failures.join('; ')}`);
  else if (uploaded) toast('Документы партии сохранены');
}

function seriesForCylinder(issue, id) {
  const group = (issue.seriesDetails || issue.extraSeries || []).find(item => item.cylinders?.includes(id));
  return group?.batch || issue.series?.[0] || issue.batch;
}

function issueSeriesDates(issue) {
  if (!issue.seriesDetails?.length || issue.seriesDetails.length === 1) return '';
  return `<table class="table"><thead><tr><th>Серия</th><th>Производство</th>
    <th>Разрешение</th><th>Срок годности</th></tr></thead><tbody>${issue.seriesDetails.map(group =>
    `<tr><td>${escapeHTML(group.batch)}</td><td>${date(group.production)}</td>
    <td>${date(group.permission)}</td><td>${date(group.expiry)}</td></tr>`
  ).join('')}</tbody></table>`;
}

function cylinderIssues(id) {
  return state.issues.filter(issue => !issue.cancelled && issue.cylinders.includes(id));
}

function issueReturnDate(issue, cylinder) {
  if (issue.returnDates?.[cylinder.uid]) return issue.returnDates[cylinder.uid];
  // Old records stored returns in the cylinder timeline in reverse event order.
  let returned;
  for (const [day, action, detail, token] of cylinder.history || []) {
    if (action === 'Возврат') returned = day;
    if (action !== 'Выдача') continue;
    if (token ? token === issue.verificationToken :
      day === issue.date && detail === `Выдан ${issue.org}, накладная №${issue.invoice}, серия ${issue.batch}`) {
      return returned;
    }
    returned = undefined;
  }
}

function currentCylinderIssue(cylinder) {
  if (cylinder.status !== 'Выдан') return undefined;
  const issue = cylinderIssues(cylinder.uid)[0];
  return issue && !issueReturnDate(issue, cylinder) ? issue : undefined;
}

function returnItem(cylinder, issue) {
  return {
    uid: cylinder.uid,
    number: cylinder.id,
    volume: cylinder.volume,
    series: issue ? seriesForCylinder(issue, cylinder.uid) : '',
    organization: issue?.org,
    issuedOn: issue?.date,
    invoice: issue?.invoice,
    protocol: issue?.deliveryNumber
  };
}

function returnItemsTable(items, selectable = false) {
  const rows = items.map(item => `<tr>
    ${selectable ? `<td><input type="checkbox" name="returnCylinder" value="${escapeHTML(item.uid)}" aria-label="Баллон ${escapeHTML(item.number)}"></td>` : ''}
    <td><strong>${escapeHTML(item.number)}</strong><br><small>${escapeHTML(item.uid)}</small></td>
    <td>${item.volume ? escapeHTML(item.volume) + ' л' : '—'}</td>
    <td>${escapeHTML(item.series || '—')}</td><td>${date(item.issuedOn)}</td>
    <td>${escapeHTML(item.organization || '—')}</td>
    <td>${escapeHTML(item.protocol || item.invoice || '—')}</td>
  </tr>`).join('');
  return `<div class="table-wrap"><table class="table return-table"><thead><tr>
    ${selectable ? '<th aria-label="Выбор"></th>' : ''}<th>Баллон</th><th>Объём</th><th>Серия</th>
    <th>Дата выдачи</th><th>Кто брал</th><th>Протокол / накладная</th>
  </tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">Выданных баллонов нет</td></tr>'}</tbody></table></div>`;
}

function returns() {
  const issued = state.cylinders.filter(cylinder => cylinder.status === 'Выдан');
  view.innerHTML = head('Возврат баллонов', 'Укажите номера или отметьте баллоны в списке. Перед приёмом проверьте данные исходной выдачи.') +
    `<form id="returnForm" class="card form-card">
      <label class="field">Номера или внутренние ID вручную<textarea name="manual" placeholder="По одному номеру или ID в строке"></textarea></label>
      <div class="scan-line">Баллоны у организаций</div>
      ${returnItemsTable(issued.map(cylinder => returnItem(cylinder, currentCylinderIssue(cylinder))), true)}
      <div class="form-actions"><button class="button">Проверить возврат</button></div>
    </form>`;
  $('#returnForm').onsubmit = event => {
    event.preventDefault();
    const fields = new FormData(event.target);
    const ids = new Set(fields.getAll('returnCylinder'));
    for (const number of String(fields.get('manual')).split(/[\n,;]+/).map(value => value.trim()).filter(Boolean)) {
      const exact = issued.find(cylinder => cylinder.uid === number);
      const matches = exact ? [exact] : issued.filter(cylinder => String(cylinder.id) === number);
      if (matches.length !== 1) {
        toast(matches.length ? `Номер ${number} повторяется. Укажите внутренний ID.` : `Баллон ${number} не найден среди выданных.`);
        return;
      }
      ids.add(matches[0].uid);
    }
    if (!ids.size) { toast('Укажите или выберите баллоны'); return; }
    confirmReturn([...ids]);
  };
}

function confirmReturn(ids) {
  const cylinders = ids.map(cyl);
  if (cylinders.some(cylinder => cylinder?.status !== 'Выдан')) {
    toast('Статус баллонов изменился. Проверьте список.');
    returns();
    return;
  }
  const issues = cylinders.map(currentCylinderIssue);
  const items = cylinders.map((cylinder, index) => returnItem(cylinder, issues[index]));
  open(`<h2>Подтверждение возврата</h2>
    <p>К приёмке: ${items.length}. Проверьте серию, дату выдачи и организацию для каждого баллона.</p>
    ${items.some(item => !item.issuedOn) ? '<p class="warning">Для некоторых баллонов исходная выдача не найдена. Проверьте их по документам.</p>' : ''}
    ${returnItemsTable(items)}
    <form id="confirmReturnForm">
      <div class="form-grid">
        <label class="field">Кто сдал<input name="contact" maxlength="150" placeholder="ФИО, если известно"></label>
        <label class="field">Откуда привезли<input name="source" maxlength="200" placeholder="Филиал или адрес, если известен"></label>
      </div>
      <div class="form-actions"><button type="button" class="button secondary" data-close>Назад</button><button class="button">Подтвердить возврат</button></div>
    </form>`);
  $('#confirmReturnForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const submit = form.querySelector('button:last-child');
    if (submit.disabled) return;
    if (cylinders.some((cylinder, index) => cyl(cylinder.uid) !== cylinder ||
      cylinder.status !== 'Выдан' || currentCylinderIssue(cylinder) !== issues[index])) {
      close();
      returns();
      toast('Данные выдачи изменились. Выберите баллоны повторно.');
      return;
    }
    submit.disabled = true;
    const fields = new FormData(form);
    const now = new Date();
    const day = localDay(now);
    const record = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      acceptedBy: window.BALLOON_DISPLAY_NAME || '',
      contact: String(fields.get('contact')).trim(),
      source: String(fields.get('source')).trim()
    };
    cylinders.forEach((cylinder, index) => {
      const issue = issues[index];
      const item = items[index];
      if (issue) (issue.returnDates ??= {})[cylinder.uid] = day;
      cylinder.status = 'Возвращён';
      const detail = item.series ? `Возвращён на склад; серия ${item.series}, накладная №${item.invoice || '—'}` : 'Возвращён на склад';
      cylinder.history.unshift([day, 'Возврат', detail, issue?.verificationToken, { ...record, item }]);
    });
    save('Возврат баллонов');
    try {
      if (cloudMode) await window.BALLOON_CLOUD_SYNC.whenSaved();
      if (route === 'return') returns();
      toast('Возврат принят');
      if ($('#confirmReturnForm') === form && !$('#modal').classList.contains('hidden')) {
        showReturnRecord({ ...record, day, items });
      }
    } catch (error) {
      if ($('#confirmReturnForm') === form) close();
      toast(`Возврат не сохранён: ${error.message}`);
    }
  };
}

function recordedReturns() {
  const records = new Map();
  for (const cylinder of state.cylinders) {
    for (const [index, [day, action, detail, issueToken, snapshot]] of (cylinder.history || []).entries()) {
      if (action !== 'Возврат') continue;
      if (snapshot?.id && snapshot.item) {
        const { item, ...metadata } = snapshot;
        if (!records.has(metadata.id)) records.set(metadata.id, { ...metadata, day, items: [] });
        records.get(metadata.id).items.push(item);
        continue;
      }
      const candidates = cylinderIssues(cylinder.uid).filter(issue => issueReturnDate(issue, cylinder) === day &&
        (!issueToken || issue.verificationToken === issueToken));
      const item = returnItem(cylinder, candidates.length === 1 ? candidates[0] : undefined);
      item.series ||= /серия (.*?), накладная/.exec(detail || '')?.[1] || '';
      item.organization ||= /^Возвращён от (.+)$/.exec(detail || '')?.[1] || '';
      records.set(`legacy-${cylinder.uid}-${index}`, { day, items: [item], legacy: true });
    }
  }
  return [...records.values()].sort((a, b) => (b.timestamp || b.day).localeCompare(a.timestamp || a.day));
}

function returnOrganizations(record) {
  return [...new Set(record.items.map(item => item.organization).filter(Boolean))].join(', ') || '—';
}

function returnHistory() {
  const records = recordedReturns();
  view.innerHTML = head('История возврата', 'Журнал принятых возвратов с возможностью открыть документ.') +
    `<div class="card table-wrap"><table class="table"><thead><tr>
      <th>Дата возврата</th><th>Организация</th><th>Кто сдал</th><th>Откуда привезли</th><th>Баллоны</th><th></th>
    </tr></thead><tbody>${records.map((record, index) => `<tr>
      <td>${date(record.day)}</td><td>${escapeHTML(returnOrganizations(record))}</td>
      <td>${escapeHTML(record.contact || '—')}</td><td>${escapeHTML(record.source || '—')}</td>
      <td>${escapeHTML(record.items.slice(0, 5).map(item => item.number).join(', '))}${record.items.length > 5 ? ` и ещё ${record.items.length - 5}` : ''}</td>
      <td><button type="button" class="button secondary small" data-return-record="${index}">Подробнее</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Возвратов пока нет</td></tr>'}</tbody></table></div>`;
  view.querySelectorAll('[data-return-record]').forEach(button => {
    button.onclick = () => showReturnRecord(records[Number(button.dataset.returnRecord)]);
  });
}

function showReturnRecord(record) {
  open(`<section id="returnDocument"><h2>Акт возврата баллонов</h2>
    <p>Дата возврата: ${date(record.day)} · Баллонов: ${record.items.length}</p>
    ${record.legacy ? '<p>Запись восстановлена из истории баллона. Доступны только сведения, которые были сохранены на момент возврата.</p>' : ''}
    <div class="detail-grid">
      <div class="detail"><span>Организация</span><strong>${escapeHTML(returnOrganizations(record))}</strong></div>
      <div class="detail"><span>Кто сдал</span><strong>${escapeHTML(record.contact || '—')}</strong></div>
      <div class="detail"><span>Откуда привезли</span><strong>${escapeHTML(record.source || '—')}</strong></div>
      <div class="detail"><span>Кто принял</span><strong>${escapeHTML(record.acceptedBy || '—')}</strong></div>
    </div>
    ${returnItemsTable(record.items)}
    <p>Сдал ____________________ &nbsp; Принял ____________________</p>
    </section><div class="form-actions"><button type="button" class="button secondary" data-close>Закрыть</button>
    <button type="button" class="button" id="printReturn">Печать / PDF</button></div>`);
  $('#printReturn').onclick = () => window.print();
}

function batchMovements(batch) {
  const ids = [...new Set(batch.cylinders)];
  return ids.map(id => {
    const cylinder = cyl(id);
    const movements = cylinder ? cylinderIssues(id)
      .filter(issue => seriesForCylinder(issue, id) === batch.number)
      .map(issue => ({ issue, returned: issueReturnDate(issue, cylinder) })) : [];
    return { id, cylinder, movements };
  });
}

function allBatchCylindersReturned(rows) {
  return rows.length > 0 && rows.every(({ movements }) => movements[0]?.returned);
}

function batchMovementTable(rows, batch) {
  const body = rows.flatMap(({ id, cylinder, movements }) => {
    const currentIssue = cylinder && currentCylinderIssue(cylinder);
    const current = cylinder ? (currentIssue?.org || (['Возвращён', 'На складе'].includes(cylinder.status) ? 'На складе' : cylinder.status)) : 'Нет в реестре';
    return (movements.length ? movements : [{}]).map(({ issue, returned }) =>
      `<tr><td>${escapeHTML(cylinder?.id || id)}<br><small>${escapeHTML(id)}</small></td>
        <td>${escapeHTML(cylinder?.volume || batch.volume || '—')} л</td>
        <td>${escapeHTML(current)}</td><td>${escapeHTML(issue?.org || '—')}</td>
        <td>${date(issue?.date)}</td><td>${returned ? date(returned) : issue ? 'Не возвращён' : '—'}</td></tr>`);
  }).join('');
  return `<div class="table-wrap"><table class="table batch-movement-table"><thead><tr>
    <th>Баллон</th><th>Объём</th><th>Где сейчас</th><th>Кому выдан</th><th>Дата выдачи</th><th>Дата возврата</th>
    </tr></thead><tbody>${body || '<tr><td colspan="6" class="empty">В серии пока нет баллонов</td></tr>'}</tbody></table></div>`;
}

function appendBatchMovements(batch) {
  const rows = batchMovements(batch);
  const actions = $('#modalContent .form-actions');
  actions.insertAdjacentHTML('beforebegin', `<section id="batchPrint"><h3>Движение баллонов серии ${escapeHTML(batch.number)}</h3>
    ${allBatchCylindersReturned(rows) ? '<p class="batch-return-note">Все баллоны возвращены. Серию можно закрывать.</p>' : ''}
    ${batchMovementTable(rows, batch)}</section>`);
  actions.insertAdjacentHTML('beforeend', '<button type="button" class="button" id="printBatch">Распечатать</button>');
  $('#printBatch').onclick = () => window.print();
}

function issuanceForm() {
  view.innerHTML = head('Выдача баллонов', 'Выберите серии и баллоны для одного протокола выдачи.') +
    `<form id="issueForm" class="card form-card"><h2>Протокол поставки</h2>
      <div class="form-grid three">
        <label class="field">Дата выдачи *<input required name="date" type="date" value="${today()}"></label>
        <label class="field">Номер накладной *<input required name="invoice"></label>
        <label class="field">Номер протокола<input readonly name="deliveryNumber" value="${nextDeliveryNumber()}"></label>
        <label class="field full">Организация из списка<select id="organizationSelect"><option value="">Ввести вручную</option>${state.organizations.map(org => `<option value="${escapeHTML(org.name)}">${escapeHTML(org.name)}</option>`).join('')}</select></label>
        <label class="field full">Организация *<input required name="org" id="organizationInput"></label>
        <label class="field">Выдал сотрудник *<input required name="employee" value="${escapeHTML(window.BALLOON_DISPLAY_NAME || '')}"></label>
      </div>
      <div id="issueSeries"></div>
      <button type="button" class="button secondary" id="addSeries">+ Добавить серию</button>
      <div class="form-actions"><button type="button" class="button secondary" id="previewProtocol">Предпросмотр</button><button class="button">Оформить выдачу</button></div>
    </form>`;
  addIssueSeries();
  $('#addSeries').onclick = addIssueSeries;
  $('#organizationSelect').onchange = event => {
    if (event.target.value) $('#organizationInput').value = event.target.value;
  };
  $('#issueForm').onsubmit = event => finishIssue(event, false);
  $('#previewProtocol').onclick = () => finishIssue(null, true);
}

function addIssueSeries() {
  const container = $('#issueSeries');
  const group = document.createElement('fieldset');
  group.className = 'issue-series';
  group.innerHTML = `<legend>Серия</legend>
    <div class="form-grid three">
      <label class="field">Серия КГМ *<select required data-series-field="batch"><option value="">Выберите серию</option>${state.batches.map(batch =>
        `<option value="${escapeHTML(batch.number)}">${escapeHTML(batch.number)} · ${batch.volume ? escapeHTML(batch.volume) + ' л' : 'объём не указан'}</option>`
      ).join('')}</select></label>
      <label class="field">Дата производства *<input required data-series-field="production" type="date"></label>
      <label class="field">Срок годности<input readonly data-series-field="expiry" type="date"></label>
      <label class="field">Дата разрешения *<input required data-series-field="permission" type="date"></label>
      <label class="field full">Номера вручную<textarea data-series-field="manual" placeholder="По одному номеру или внутреннему ID в строке"></textarea></label>
    </div>
    <button type="button" class="button secondary small" data-confirm-numbers>Подтвердить номера</button>
    <div class="chips" data-series-cylinders>Выберите серию, чтобы увидеть её баллоны.</div>`;
  if (container.children.length) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button secondary small';
    remove.textContent = 'Убрать серию';
    remove.onclick = () => group.remove();
    group.append(remove);
  }
  container.append(group);
  const field = name => group.querySelector(`[data-series-field="${name}"]`);
  const list = group.querySelector('[data-series-cylinders]');
  field('batch').onchange = () => {
    const batch = state.batches.find(item => item.number === field('batch').value);
    field('production').value = batch?.produced || '';
    field('expiry').value = batch?.expiry || plus18(batch?.produced);
    field('permission').value = batch?.permissionDate || '';
    field('manual').value = '';
    list.innerHTML = availableInSeries(batch).map(cylinder =>
      `<label class="chip"><input type="checkbox" value="${escapeHTML(cylinder.uid)}"> ${escapeHTML(cylinder.id)} · ${escapeHTML(cylinder.volume || batch.volume || '—')} л <small>${escapeHTML(cylinder.uid)}</small></label>`
    ).join('') || (batch ? 'В этой серии нет доступных баллонов.' : 'Выберите серию, чтобы увидеть её баллоны.');
  };
  field('production').oninput = () => { field('expiry').value = plus18(field('production').value); };
  group.querySelector('[data-confirm-numbers]').onclick = () => {
    if (!field('manual').value.trim()) return toast('Введите номера баллонов');
    selectManualSeriesCylinders(group, availableInSeries(state.batches.find(item => item.number === field('batch').value)));
  };
}

function availableInSeries(batch) {
  return (batch?.cylinders || []).map(cyl).filter(cylinder =>
    cylinder && ['На складе', 'Возвращён'].includes(cylinder.status) &&
    !batch.defects?.includes(cylinder.uid) &&
    latestCylinderBatch(cylinder.uid) === batch &&
    !cylinderIssues(cylinder.uid).some(issue => seriesForCylinder(issue, cylinder.uid) === batch.number &&
      issueReturnDate(issue, cylinder))
  );
}

function latestCylinderBatch(id) {
  return state.batches.reduce((latest, batch) => {
    if (!batch.cylinders.includes(id)) return latest;
    return !latest || batch.produced > latest.produced ? batch : latest;
  }, undefined);
}

function selectManualSeriesCylinders(group, available) {
  const manual = group.querySelector('[data-series-field="manual"]');
  const ids = new Set();
  for (const value of new Set(manual.value.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean))) {
    const exact = available.find(cylinder => cylinder.uid === value);
    const matches = exact ? [exact] : available.filter(cylinder => cylinder.id === value);
    if (matches.length !== 1) {
      toast(matches.length ? `Номер ${value} повторяется. Введите внутренний ID.` : `Баллон ${value} недоступен в выбранной серии.`);
      return false;
    }
    ids.add(matches[0].uid);
  }
  group.querySelectorAll('input[type="checkbox"]').forEach(box => {
    if (ids.has(box.value)) box.checked = true;
  });
  manual.value = '';
  return true;
}

function issueData() {
  const form = $('#issueForm');
  if (!form.reportValidity()) return null;
  const issue = Object.fromEntries(new FormData(form));
  const seenSeries = new Set();
  const seenCylinders = new Set();
  const seriesDetails = [];
  for (const group of form.querySelectorAll('.issue-series')) {
    const read = name => group.querySelector(`[data-series-field="${name}"]`).value;
    const number = read('batch');
    if (seenSeries.has(number)) { toast(`Серия ${number} выбрана дважды`); return null; }
    seenSeries.add(number);
    const available = availableInSeries(state.batches.find(batch => batch.number === number));
    if (!selectManualSeriesCylinders(group, available)) return null;
    const ids = [...group.querySelectorAll('input[type="checkbox"]:checked')].map(box => box.value);
    if (!ids.length) { toast(`Выберите баллоны серии ${number}`); return null; }
    const expiry = read('expiry');
    if (issue.date < read('production') || issue.date < read('permission')) {
      toast(`Дата выдачи серии ${number} раньше даты производства или разрешения`);
      return null;
    }
    if (expiry && issue.date > expiry) { toast(`Срок годности серии ${number} истёк`); return null; }
    for (const id of ids) {
      if (seenCylinders.has(id) || !available.some(cylinder => cylinder.uid === id)) {
        toast('Баллон выбран дважды или больше недоступен');
        return null;
      }
      seenCylinders.add(id);
    }
    seriesDetails.push({ batch: number, production: read('production'), expiry, permission: read('permission'), cylinders: ids });
  }
  const [{ production, expiry, permission }] = seriesDetails;
  const series = [...seenSeries];
  return { ...issue, production, expiry, permission, series, batch: series.join(', '), cylinders: [...seenCylinders], seriesDetails };
}

