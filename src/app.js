const screens=[...document.querySelectorAll('.screen')];
function go(id){screens.forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo(0,0)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});
document.getElementById('register-form').addEventListener('submit',e=>{e.preventDefault();document.getElementById('register-note').textContent='Tela demonstrativa: integração de código de confirmação será ligada ao Supabase na próxima etapa.'});
document.getElementById('identify-form').addEventListener('submit',e=>{e.preventDefault();document.getElementById('identify-note').textContent='A busca real será ativada após configurar o banco e as regras de acesso.'});