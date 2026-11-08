import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const supabase=createClient("https://xwctsfpqwugygxpsrcfw.supabase.co","sb_publishable_L274hUI6sbyDGFe7u40U-Q_tK28Oh5s");
const screens=[...document.querySelectorAll(".screen")];
const state={customer:null,phone:null,registration:null,pendingSignupEmail:null,lookupToken:null,selected:new Set(),channel:null,role:null};
function go(id){screens.forEach(s=>s.classList.toggle("active",s.id===id));window.scrollTo(0,0)}
function note(id,msg,error=false){const e=document.getElementById(id);if(e){e.textContent=msg||"";e.style.color=error?"#ff9a75":""}}
function fail(id,e){note(id,e?.message||"Não foi possível concluir. Tente novamente.",true)}
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function phoneE164(v){let d=String(v||"").replace(/\D/g,"");if(d.startsWith("55")&&d.length>=12)d=d.slice(2);return [10,11].includes(d.length)?"+55"+d:null}
async function customerForSession(){const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const {data,error}=await supabase.from("customers").select("id,first_name,last_name,phone,email,birth_date").eq("user_id",user.id).maybeSingle();if(error)throw error;return data}
async function logout(screen="home"){if(state.channel){await supabase.removeChannel(state.channel);state.channel=null}await supabase.auth.signOut();state.customer=null;state.role=null;state.lookupToken=null;state.pendingSignupEmail=null;state.selected.clear();go(screen)}
async function loadServices(){const {data,error}=await supabase.from("services").select("id,name,detail,price").eq("active",true).order("name");if(error)throw error;const host=document.getElementById("service-list");host.replaceChildren();state.selected.clear();data.forEach(s=>{const l=document.createElement("label");l.className="service-option";const c=document.createElement("input");c.type="checkbox";c.value=s.id;c.addEventListener("change",()=>{c.checked?state.selected.add(s.id):state.selected.delete(s.id);total(data)});const info=document.createElement("span");const b=document.createElement("b");b.textContent=s.name;const small=document.createElement("small");small.textContent=s.detail||"";info.append(b,small);const price=document.createElement("strong");price.textContent=money(s.price);l.append(c,info,price);host.append(l)});total(data)}
function total(services){document.getElementById("service-total").textContent=money(services.filter(s=>state.selected.has(s.id)).reduce((n,s)=>n+Number(s.price),0))}
async function showServices(customer){if(!customer)throw new Error("Não encontramos seu cadastro vinculado a esta conta. Procure a equipe da La Corte.");state.customer=customer;document.getElementById("customer-greeting").textContent="Olá, "+customer.first_name+"!";await loadServices();go("services")}
async function loadMyQueue(){if(!state.customer)return;const date=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const {data,error}=await supabase.from("lacorte_queue").select("id,queue_number,status,total_amount,created_at").eq("customer_id",state.customer.id).eq("queue_date",date).in("status",["waiting","in_progress"]).order("created_at",{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data)return;document.getElementById("ticket-number").textContent=String(data.queue_number).padStart(2,"0");document.getElementById("ticket-status").textContent=data.status==="in_progress"?"Seu atendimento começou":"Aguardando atendimento";document.getElementById("ticket-total").textContent=money(data.total_amount);const {data:items}=await supabase.from("lacorte_queue_items").select("service_name").eq("queue_id",data.id);document.getElementById("ticket-services").textContent=(items||[]).map(x=>x.service_name).join(" • ");go("my-queue");if(state.channel)await supabase.removeChannel(state.channel);state.channel=supabase.channel("customer-queue-"+data.id).on("postgres_changes",{event:"*",schema:"public",table:"lacorte_queue",filter:"id=eq."+data.id},()=>loadMyQueue().catch(e=>console.error(e))).subscribe()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)});
document.getElementById("register-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const first_name=String(f.get("first_name")||"").trim();
  const last_name=String(f.get("last_name")||"").trim();
  const phone=String(f.get("phone")||"").trim();
  const birth_date=String(f.get("birth_date")||"").trim();
  if(first_name.length<2||last_name.length<2){note("register-note","Informe nome e sobrenome.",true);return}
  if(!phoneE164(phone)){note("register-note","Informe um telefone brasileiro válido com DDD.",true);return}
  if(!birth_date){note("register-note","Informe sua data de nascimento.",true);return}
  const birth=new Date(birth_date+"T00:00:00");
  if(Number.isNaN(birth.getTime())||birth>new Date()){note("register-note","Confira sua data de nascimento.",true);return}
  note("register-note","Salvando seu cadastro...");
  const {data,error}=await supabase.functions.invoke("lacorte-kiosk",{body:{action:"register",first_name,last_name,phone,birth_date}});
  if(error){fail("register-note",error);return}
  if(data?.error){note("register-note",data.error,true);return}
  if(!data?.customer||!data?.lookup_token){note("register-note","Não foi possível concluir o cadastro. Tente novamente.",true);return}
  state.customer=data.customer;
  state.lookupToken=data.lookup_token;
  try{await showServices(data.customer)}catch(err){fail("register-note",err)}
});

document.getElementById("identify-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const identifier=String(new FormData(e.currentTarget).get("identifier")||"").trim();
  const digits=identifier.replace(/\D/g,"");
  const looksPhone=digits.length>=10;
  if(looksPhone&&!phoneE164(identifier)){note("identify-note","Informe o telefone com DDD.",true);return}
  if(!looksPhone&&identifier.split(/\s+/).filter(Boolean).length<2){note("identify-note","Digite nome e sobrenome completos ou o telefone com DDD.",true);return}
  note("identify-note","Localizando seu cadastro...");
  const {data,error}=await supabase.functions.invoke("lacorte-kiosk",{body:{action:"identify",identifier}});
  if(error){fail("identify-note",error);return}
  if(!data?.customer||!data?.lookup_token){note("identify-note",data?.error||"Cadastro não encontrado. Confira os dados ou procure a equipe.",true);return}
  state.customer=data.customer;
  state.lookupToken=data.lookup_token;
  await showServices(data.customer);
});

document.getElementById("join-queue").addEventListener("click",async()=>{
  if(!state.customer||!state.selected.size){note("service-note","Selecione pelo menos um serviço.",true);return}
  note("service-note","Registrando sua chegada...");
  const serviceIds=[...state.selected];
  if(state.lookupToken){
    const {data,error}=await supabase.functions.invoke("lacorte-kiosk",{body:{action:"queue",lookup_token:state.lookupToken,service_ids:serviceIds}});
    if(error){fail("service-note",error);return}
    if(data?.error){note("service-note",data.error,true);return}
    document.getElementById("ticket-number").textContent=String(data.ticket_number).padStart(2,"0");
    document.getElementById("ticket-status").textContent="Aguardando atendimento";
    document.getElementById("ticket-total").textContent=money(data.total_amount);
    const names=[...document.querySelectorAll("#service-list .service-option input:checked")].map(input=>input.parentElement.querySelector("b")?.textContent||"");
    document.getElementById("ticket-services").textContent=names.join(" • ");
    go("my-queue");
    state.lookupToken=null;
    return;
  }
  const {error}=await supabase.rpc("lacorte_create_queue_entry",{p_customer_id:state.customer.id,p_service_ids:serviceIds});
  if(error){fail("service-note",error);return}
  try{await loadMyQueue()}catch(err){fail("service-note",err)}
});
document.getElementById("customer-logout").addEventListener("click",()=>logout());document.getElementById("queue-logout").addEventListener("click",()=>logout());
async function staffLogin(formId,noteId,adminOnly,panel){const f=new FormData(document.getElementById(formId));note(noteId,"Verificando acesso...");const {error}=await supabase.auth.signInWithPassword({email:String(f.get("email")).trim(),password:String(f.get("password"))});if(error){fail(noteId,error);return}const {data:{user}}=await supabase.auth.getUser();const {data:role,error:roleError}=await supabase.from("lacorte_user_roles").select("role,barber_id").eq("user_id",user.id).maybeSingle();if(roleError||!role||(adminOnly?role.role!=="admin":!["admin","barber"].includes(role.role))){await logout(panel==="admin-panel"?"admin-login":"barber-login");note(noteId,"Esta conta não tem permissão para acessar esta área.",true);return}state.role=role;try{if(panel==="barber-panel")await renderBarberQueue();else await renderAdmin();go(panel)}catch(err){fail(noteId,err)}}
document.getElementById("barber-login-form").addEventListener("submit",e=>{e.preventDefault();staffLogin("barber-login-form","barber-login-note",false,"barber-panel")});
document.getElementById("admin-login-form").addEventListener("submit",e=>{e.preventDefault();staffLogin("admin-login-form","admin-login-note",true,"admin-panel")});
async function renderBarberQueue(){const {data,error}=await supabase.from("lacorte_queue").select("id,queue_number,status,total_amount,customers(first_name,last_name),lacorte_queue_items(service_name)").in("status",["waiting","in_progress"]).order("queue_number");if(error)throw error;const host=document.getElementById("barber-queue");host.replaceChildren();(data||[]).forEach(item=>{const card=document.createElement("article");card.className="queue-card";const h=document.createElement("h3");h.textContent="Senha "+String(item.queue_number).padStart(2,"0");const who=document.createElement("p");who.textContent=item.customers?item.customers.first_name+" "+item.customers.last_name:"Cliente";const services=document.createElement("p");services.textContent=(item.lacorte_queue_items||[]).map(x=>x.service_name).join(" • ");const price=document.createElement("b");price.textContent=money(item.total_amount);const button=document.createElement("button");button.className="primary";button.textContent=item.status==="waiting"?"Iniciar atendimento":"Finalizar atendimento";button.addEventListener("click",async()=>{let result;if(item.status==="waiting")result=await supabase.rpc("lacorte_start_service",{p_queue_id:item.id});else{const method=prompt("Forma de pagamento: pix, dinheiro, credito ou debito");if(!method)return;result=await supabase.rpc("lacorte_finish_service",{p_queue_id:item.id,p_payment_method:method.toLowerCase()})}if(result.error)fail("barber-note",result.error);else renderBarberQueue().catch(e=>fail("barber-note",e))});card.append(h,who,services,price,button);host.append(card)});note("barber-note",data?.length?"Fila atualizada.":"Não há clientes aguardando.");if(state.channel)await supabase.removeChannel(state.channel);state.channel=supabase.channel("barber-queue").on("postgres_changes",{event:"*",schema:"public",table:"lacorte_queue"},()=>renderBarberQueue().catch(e=>fail("barber-note",e))).subscribe()}
async function renderRegistrationRequests(){const host=document.getElementById("admin-registrations");const {data,error}=await supabase.from("lacorte_registration_requests").select("id,first_name,last_name,phone,email,status,created_at").order("created_at",{ascending:false}).limit(100);if(error)throw error;host.replaceChildren();(data||[]).forEach(request=>{const card=document.createElement("article");card.className="queue-card";const title=document.createElement("h3");title.textContent=request.first_name+" "+request.last_name;const phone=document.createElement("p");phone.textContent=request.phone;const email=document.createElement("p");email.textContent=request.email||"Sem e-mail informado";const status=document.createElement("p");status.textContent=request.status==="pending"?"Aguardando análise":request.status==="approved"?"Aprovado":"Recusado";card.append(title,phone,email,status);const wa=document.createElement("a");wa.href="https://wa.me/"+request.phone.replace(/\D/g,"");wa.target="_blank";wa.rel="noopener noreferrer";wa.textContent="Conversar no WhatsApp";wa.style.color="#f47721";card.append(wa);if(request.status==="pending"){const approve=document.createElement("button");approve.className="primary";approve.textContent="Aprovar solicitação";approve.addEventListener("click",()=>reviewRegistration(request.id,"approved"));const reject=document.createElement("button");reject.className="ghost";reject.textContent="Recusar";reject.addEventListener("click",()=>reviewRegistration(request.id,"rejected"));card.append(approve,reject)}host.append(card)});note("registration-note",data?.length?data.filter(x=>x.status==="pending").length+" solicitação(ões) aguardando análise.":"Nenhuma solicitação de cadastro.");}
async function reviewRegistration(id,status){note("registration-note","Processando análise...");const {data,error}=await supabase.functions.invoke("lacorte-review-registration",{body:{request_id:id,action:status}});if(error){fail("registration-note",error);return}await renderRegistrationRequests();if(status==="rejected"){note("registration-note","Solicitação recusada.");return}if(data?.temporary_password){const loginLabel=data.login_type==="phone"?"WhatsApp":"e-mail";const message=["Olá! Seu cadastro na La Corte foi aprovado.","Acesso: "+data.login,"Senha provisória: "+data.temporary_password,"Ao entrar, você deverá criar uma nova senha."].join("\n");const url="https://wa.me/"+String(data.whatsapp).replace(/\D/g,"")+"?text="+encodeURIComponent(message);const host=document.getElementById("registration-note");host.textContent="Cadastro aprovado. Envie o acesso provisório ao cliente pelo WhatsApp ("+loginLabel+"). ";const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Enviar acesso pelo WhatsApp";link.style.color="#f47721";link.style.fontWeight="700";host.append(link)}else{note("registration-note",data?.message||"Cadastro aprovado. O cliente já possui uma conta.")}}
async function renderAdmin(){const specs=[["Clientes","customers"],["Barbeiros","barbers"],["Serviços","services"],["Atendimentos","lacorte_queue"]];const host=document.getElementById("admin-metrics");host.replaceChildren();for(const [label,table] of specs){const {count,error}=await supabase.from(table).select("*",{count:"exact",head:true});if(error)throw error;const card=document.createElement("div");const title=document.createElement("span");title.textContent=label;const value=document.createElement("strong");value.textContent=String(count??0);card.append(title,value);host.append(card)}await renderRegistrationRequests();const [{data:services,error:se},{data:barbers,error:be}]=await Promise.all([supabase.from("services").select("name,price,active").order("name"),supabase.from("barbers").select("name,commission_percent,active").order("name")]);if(se||be)throw se||be;const sh=document.getElementById("admin-services");sh.replaceChildren();(services||[]).forEach(x=>{const d=document.createElement("div");d.textContent=x.name+" — "+money(x.price)+(x.active?"":" (inativo)");sh.append(d)});const bh=document.getElementById("admin-barbers");bh.replaceChildren();(barbers||[]).forEach(x=>{const d=document.createElement("div");d.textContent=x.name+" — comissão "+Number(x.commission_percent)+"%"+(x.active?"":" (inativo)");bh.append(d)});note("admin-note","Dados carregados do banco da La Corte.")}
document.getElementById("barber-logout").addEventListener("click",()=>logout());document.getElementById("admin-logout").addEventListener("click",()=>logout());
supabase.auth.onAuthStateChange((event,session)=>{
  if(!session){state.customer=null;state.role=null;return}
});
