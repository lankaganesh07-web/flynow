/* ============================================
   SkyVault — app.js  (Firebase-integrated)
   ============================================ */

// ---- CITY DATA ----
const CITIES = {
  'Mumbai':       { code: 'BOM', country: 'IN' },
  'New Delhi':    { code: 'DEL', country: 'IN' },
  'Bengaluru':    { code: 'BLR', country: 'IN' },
  'Chennai':      { code: 'MAA', country: 'IN' },
  'Hyderabad':    { code: 'HYD', country: 'IN' },
  'Kolkata':      { code: 'CCU', country: 'IN' },
  'Ahmedabad':    { code: 'AMD', country: 'IN' },
  'Pune':         { code: 'PNQ', country: 'IN' },
  'Jaipur':       { code: 'JAI', country: 'IN' },
  'Goa':          { code: 'GOI', country: 'IN' },
  'Dubai':        { code: 'DXB', country: 'AE' },
  'Singapore':    { code: 'SIN', country: 'SG' },
  'London':       { code: 'LHR', country: 'GB' },
  'New York':     { code: 'JFK', country: 'US' },
  'Paris':        { code: 'CDG', country: 'FR' },
  'Tokyo':        { code: 'NRT', country: 'JP' },
  'Sydney':       { code: 'SYD', country: 'AU' },
  'Bangkok':      { code: 'BKK', country: 'TH' },
  'Kuala Lumpur': { code: 'KUL', country: 'MY' },
  'Hong Kong':    { code: 'HKG', country: 'HK' }
};

const AIRLINES = [
  { name: 'IndiGo',        color: '#1A1AC8', bg: 'linear-gradient(135deg,#1A1AC8,#4B4BF7)', short: '6E' },
  { name: 'Air India',     color: '#C8001A', bg: 'linear-gradient(135deg,#C8001A,#E85A2A)', short: 'AI' },
  { name: 'Vistara',       color: '#5B1E78', bg: 'linear-gradient(135deg,#5B1E78,#9B3CC0)', short: 'UK' },
  { name: 'SpiceJet',      color: '#E83B14', bg: 'linear-gradient(135deg,#E83B14,#F59E0B)', short: 'SG' },
  { name: 'Emirates',      color: '#C8001A', bg: 'linear-gradient(135deg,#C8001A,#D4AF37)', short: 'EK' },
  { name: 'Singapore Air', color: '#0E4B8A', bg: 'linear-gradient(135deg,#0E4B8A,#C8A06C)', short: 'SQ' },
  { name: 'British Airways',color: '#075AAA', bg: 'linear-gradient(135deg,#075AAA,#C8001A)', short: 'BA' }
];

// Global state
let state = {
  from: '', to: '', depDate: '', pax: 1, tripType: 'oneway',
  flights: [], selectedFlight: null, selectedClass: null,
  classes: [], currentScreen: 'screen-search', grandTotal: 0,
  lastBookingRef: null
};

// =========================================
//   FIREBASE STATUS INDICATOR
// =========================================
window.addEventListener('load', function() {
  const dot   = document.getElementById('fbDot');
  const label = document.getElementById('fbLabel');
  if (window.firebaseReady && window.db) {
    dot.classList.add('fb-dot-live');
    label.textContent = 'Firebase Live';
    loadBookingsCount();
  } else {
    dot.classList.add('fb-dot-error');
    label.textContent = 'Offline';
  }
});

// =========================================
//   FIRESTORE — SAVE BOOKING
// =========================================
async function saveBookingToFirestore(bookingRef) {
  if (!window.db) return;
  const fbStatus = document.getElementById('fbSaveStatus');
  const fbText   = document.getElementById('fbSaveText');

  try {
    const f   = state.selectedFlight;
    const cls = state.selectedClass;
    const addons = getAddonExtras();

    const bookingDoc = {
      bookingRef,
      status: 'confirmed',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      passenger: {
        firstName:  document.getElementById('firstName').value.trim(),
        lastName:   document.getElementById('lastName').value.trim(),
        email:      document.getElementById('emailAddr').value.trim(),
        mobile:     document.getElementById('phoneCode').value + document.getElementById('mobileNo').value.trim(),
        dob:        document.getElementById('dob').value,
        nationality:document.getElementById('nationality').value,
        passport:   document.getElementById('passportNo').value.trim()
      },
      flight: {
        id:       f.id,
        airline:  f.airline.name,
        from:     f.from,
        to:       f.to,
        fromCode: f.fromCode,
        toCode:   f.toCode,
        dep:      f.dep,
        arr:      f.arr,
        duration: f.duration,
        stops:    f.stops,
        depDate:  state.depDate
      },
      cabinClass: {
        type:  cls.type,
        label: cls.label,
        price: cls.price
      },
      passengers: state.pax,
      addons: addons.items.map(function(a){ return a.label; }),
      addonsCost: addons.total,
      taxes: Math.round(cls.price * state.pax * 0.12),
      totalPrice: state.grandTotal
    };

    const docRef = await window.db.collection('bookings').add(bookingDoc);
    console.log('Booking saved with ID:', docRef.id);

    // Update status pill -> saved
    fbStatus.classList.add('fb-saved');
    fbText.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/></svg> Saved to Firebase';

    // Analytics event
    if (window.fbAnalytics) {
      window.fbAnalytics.logEvent('booking_confirmed', {
        booking_ref:   bookingRef,
        airline:       f.airline.name,
        from:          f.from,
        to:            f.to,
        cabin_class:   cls.label,
        total_price:   state.grandTotal
      });
    }
    loadBookingsCount();
  } catch(err) {
    console.error('Firestore save error:', err);
    fbStatus.classList.add('fb-error');
    fbText.textContent = 'Cloud save failed';
  }
}

// =========================================
//   FIRESTORE — LOAD BOOKINGS COUNT
// =========================================
async function loadBookingsCount() {
  if (!window.db) return;
  try {
    const snap = await window.db.collection('bookings').get();
    const badge = document.getElementById('bookingsBadge');
    const count = snap.size;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch(e) { console.warn('Count error', e); }
}

// =========================================
//   MY BOOKINGS MODAL
// =========================================
function openMyBookings() {
  const modal = document.getElementById('myBookingsModal');
  modal.classList.remove('hidden');
  modal.classList.add('modal-visible');
  loadAllBookings();
  if (window.fbAnalytics) window.fbAnalytics.logEvent('view_bookings');
}

function closeMyBookings(event) {
  if (event && event.target !== document.getElementById('myBookingsModal')) return;
  const modal = document.getElementById('myBookingsModal');
  modal.classList.add('modal-closing');
  setTimeout(function() {
    modal.classList.remove('modal-visible', 'modal-closing');
    modal.classList.add('hidden');
  }, 300);
}

async function loadAllBookings() {
  const list = document.getElementById('myBookingsList');
  list.innerHTML = '<div class="modal-loading"><div class="loading-spinner" style="width:32px;height:32px;border-width:2px;"></div><p style="color:rgba(240,244,255,0.5);font-size:14px;margin-top:12px;">Fetching from Firestore...</p></div>';

  if (!window.db) {
    list.innerHTML = '<div class="modal-empty"><span style="font-size:36px;">⚡</span><p>Firebase not connected</p></div>';
    return;
  }
  try {
    const snap = await window.db.collection('bookings').orderBy('createdAt','desc').limit(20).get();
    if (snap.empty) {
      list.innerHTML = '<div class="modal-empty"><span style="font-size:48px;">✈</span><p>No bookings yet</p><p style="font-size:13px;color:rgba(240,244,255,0.4);">Your confirmed bookings will appear here</p></div>';
      return;
    }
    let html = '';
    snap.forEach(function(doc) {
      const b = doc.data();
      const ts = b.createdAt ? b.createdAt.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'N/A';
      html += '<div class="booking-item">' +
        '<div class="bi-top">' +
          '<div class="bi-route">' +
            '<span class="bi-code">' + (b.flight ? b.flight.fromCode : '--') + '</span>' +
            '<span class="bi-arrow">✈</span>' +
            '<span class="bi-code">' + (b.flight ? b.flight.toCode : '--') + '</span>' +
          '</div>' +
          '<span class="bi-class ' + (b.cabinClass ? 'bi-class-'+b.cabinClass.type : '') + '">' + (b.cabinClass ? b.cabinClass.label : '--') + '</span>' +
        '</div>' +
        '<div class="bi-info">' +
          '<span class="bi-name">' + (b.passenger ? b.passenger.firstName + ' ' + b.passenger.lastName : 'Unknown') + '</span>' +
          '<span class="bi-sep">·</span>' +
          '<span class="bi-airline">' + (b.flight ? b.flight.airline : '--') + '</span>' +
          '<span class="bi-sep">·</span>' +
          '<span class="bi-date">' + (b.flight ? b.flight.depDate : '--') + '</span>' +
        '</div>' +
        '<div class="bi-bottom">' +
          '<span class="bi-ref">' + (b.bookingRef || doc.id.substring(0,10)) + '</span>' +
          '<span class="bi-price">' + (b.totalPrice ? fmtPrice(b.totalPrice) : '--') + '</span>' +
        '</div>' +
        '<div class="bi-ts">Booked: ' + ts + '</div>' +
      '</div>';
    });
    list.innerHTML = html;
  } catch(err) {
    console.error('Load bookings error:', err);
    list.innerHTML = '<div class="modal-empty"><span style="font-size:36px;">⚠️</span><p>Error loading bookings</p><p style="font-size:13px;color:rgba(240,244,255,0.4);">' + err.message + '</p></div>';
  }
}

// =========================================
//   PARTICLE ENGINE
// =========================================
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      r: Math.random()*1.8+0.3, vx: (Math.random()-0.5)*0.3, vy: -Math.random()*0.4-0.1,
      alpha: Math.random()*0.5+0.1,
      color: ['#7C3AED','#06B6D4','#F59E0B','#EC4899'][Math.floor(Math.random()*4)]
    });
  }
  function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(function(p) {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha; ctx.fill(); ctx.globalAlpha=1;
      p.x+=p.vx; p.y+=p.vy;
      if(p.y<-5){p.y=canvas.height+5;p.x=Math.random()*canvas.width;}
      if(p.x<-5)p.x=canvas.width+5;
      if(p.x>canvas.width+5)p.x=-5;
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// =========================================
//   CITY INPUT
// =========================================
function updateCode(inputId, codeId) {
  const val = document.getElementById(inputId).value.trim();
  const city = CITIES[val];
  document.getElementById(codeId).textContent = city ? city.code : '--';
}
document.getElementById('fromCity').addEventListener('input', function(){ updateCode('fromCity','fromCode'); });
document.getElementById('toCity').addEventListener('input', function(){ updateCode('toCity','toCode'); });

function setTripType(type) {
  state.tripType = type;
  document.querySelectorAll('.trip-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('tab-'+type).classList.add('active');
  document.getElementById('returnGroup').style.display = type==='round' ? '' : 'none';
}

function swapCities() {
  const btn = document.getElementById('swapBtn');
  btn.style.transform = 'rotate(180deg)';
  setTimeout(function(){ btn.style.transform=''; }, 300);
  const fv = document.getElementById('fromCity').value;
  const tv = document.getElementById('toCity').value;
  document.getElementById('fromCity').value = tv;
  document.getElementById('toCity').value   = fv;
  updateCode('fromCity','fromCode');
  updateCode('toCity','toCode');
}

function fillRoute(from, to) {
  document.getElementById('fromCity').value = from;
  document.getElementById('toCity').value   = to;
  updateCode('fromCity','fromCode');
  updateCode('toCity','toCode');
}

// =========================================
//   FLIGHT GENERATION (mock data)
// =========================================
function generateFlights(from, to) {
  const fromCity = CITIES[from] || { code: from.substring(0,3).toUpperCase() };
  const toCity   = CITIES[to]   || { code: to.substring(0,3).toUpperCase()   };
  const basePrice = Math.floor(Math.random()*5000)+2500;
  const airlines  = shuffleArr([...AIRLINES]).slice(0, 4+Math.floor(Math.random()*3));
  return airlines.map(function(al, i) {
    const depH = 5+Math.floor(Math.random()*16);
    const depM = [0,15,30,45][Math.floor(Math.random()*4)];
    const dur  = 60+Math.floor(Math.random()*240);
    const arrH = Math.floor((depH*60+depM+dur)/60)%24;
    const arrM = (depM+dur)%60;
    const stops = i<2 ? 0 : Math.floor(Math.random()*2);
    const price = basePrice+i*300+Math.floor(Math.random()*800)-400;
    return {
      id: 'FL'+Math.floor(Math.random()*9000+1000),
      airline: al, fromCode: fromCity.code, toCode: toCity.code,
      dep: pad(depH)+':'+pad(depM), arr: pad(arrH)+':'+pad(arrM),
      duration: dur, stops, price: Math.max(1500,price),
      tags: i===0 ? ['Popular'] : stops===0 ? ['Refundable'] : ['Seats Left: '+(3+Math.floor(Math.random()*8))],
      from, to
    };
  });
}

function shuffleArr(a) {
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function pad(n) { return String(n).padStart(2,'0'); }
function fmtDur(min) { return Math.floor(min/60)+'h '+pad(min%60)+'m'; }
function fmtPrice(p) { return 'Rs.' + p.toLocaleString('en-IN'); }

// =========================================
//   SEARCH
// =========================================
function searchFlights() {
  const from = document.getElementById('fromCity').value.trim();
  const to   = document.getElementById('toCity').value.trim();
  const dep  = document.getElementById('depDate').value;
  if (!from||!to) { showToast('Please enter departure and destination cities'); return; }
  if (from===to) { showToast('Origin and destination cannot be the same'); return; }
  if (!dep) { showToast('Please select a departure date'); return; }

  state.from=from; state.to=to; state.depDate=dep;
  state.pax = parseInt(document.getElementById('passengerCount').value);

  // Analytics
  if (window.fbAnalytics) window.fbAnalytics.logEvent('search_flights',{from,to,passengers:state.pax});

  showLoading('Searching flights');
  setTimeout(function() {
    state.flights = generateFlights(from,to);
    hideLoading();
    renderFlights(state.flights);
    showScreen('screen-flights',2);
    document.getElementById('resultsTitle').textContent = from+' to '+to;
    const d = new Date(dep);
    const ds = d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    document.getElementById('resultsSub').textContent = ds+' · '+state.pax+(state.pax>1?' Passengers':' Passenger')+' · '+state.flights.length+' flights found';
  }, 1600);
}

// =========================================
//   RENDER FLIGHTS
// =========================================
function renderFlights(flights) {
  const list = document.getElementById('flightList');
  list.innerHTML = '';
  flights.forEach(function(f, i) {
    const card = document.createElement('div');
    card.className = 'flight-card glass-card flight-card-anim';
    card.style.animationDelay = (i*0.08)+'s';
    const tags = f.tags.map(function(t){
      if(t==='Popular') return '<span class="tag tag-popular">★ Popular</span>';
      if(t==='Refundable') return '<span class="tag tag-refund">✓ Refundable</span>';
      return '<span class="tag tag-seats">'+t+'</span>';
    }).join('');
    const stopBadge = f.stops===0
      ? '<span class="badge-nonstop">Non-stop</span>'
      : '<span class="badge-stop">'+f.stops+' Stop</span>';
    card.innerHTML =
      '<div class="airline-logo" style="background:'+f.airline.bg+';">' +
        '<span style="color:white;font-size:12px;font-weight:800;">'+f.airline.short+'<br><span style="font-size:9px;font-weight:500;opacity:0.8;">'+f.id+'</span></span>' +
      '</div>' +
      '<div class="flight-times">' +
        '<div class="time-block"><div class="time-val">'+f.dep+'</div><div class="time-label">'+f.fromCode+'</div></div>' +
        '<div class="flight-line">' +
          '<div class="fl-top">'+fmtDur(f.duration)+'</div>' +
          '<div class="fl-track"><div class="fl-dot"></div><div class="fl-line"><span class="fl-plane">✈</span></div><div class="fl-dot"></div></div>' +
          '<div class="fl-bottom">'+stopBadge+'</div>' +
        '</div>' +
        '<div class="time-block"><div class="time-val">'+f.arr+'</div><div class="time-label">'+f.toCode+'</div></div>' +
      '</div>' +
      '<div class="flight-tags">'+tags+'</div>' +
      '<div class="flight-price">' +
        '<div class="price-from">from</div>' +
        '<div class="price-val">'+fmtPrice(f.price)+'</div>' +
        '<div class="price-pp">per person</div>' +
        '<button class="btn-select" onclick="selectFlight('+i+')">Select <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>' +
      '</div>';
    card.addEventListener('click', function(e){ if(!e.target.closest('.btn-select')) selectFlight(i); });
    list.appendChild(card);
  });
}

function filterFlights(type, el) {
  document.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  let sorted = [...state.flights];
  if(type==='cheapest') sorted.sort(function(a,b){ return a.price-b.price; });
  if(type==='fastest')  sorted.sort(function(a,b){ return a.duration-b.duration; });
  renderFlights(sorted);
}

// =========================================
//   SELECT FLIGHT
// =========================================
function selectFlight(idx) {
  state.selectedFlight = state.flights[idx];
  buildClasses(state.selectedFlight);
  document.getElementById('classFlightInfo').textContent =
    state.selectedFlight.airline.name+' · '+state.selectedFlight.dep+' – '+state.selectedFlight.arr+' · '+fmtDur(state.selectedFlight.duration);
  if(window.fbAnalytics) window.fbAnalytics.logEvent('select_flight',{airline:state.selectedFlight.airline.name,flight_id:state.selectedFlight.id});
  showScreen('screen-class',3);
}

// =========================================
//   CLASS CARDS
// =========================================
function buildClasses(flight) {
  state.classes = [
    { type:'economy', label:'Economy', badge:'BEST VALUE', icon:'💺', price:flight.price,
      features:['Standard 23kg baggage','Complimentary snacks','Seat selection (fee)','Web check-in'], cssClass:'class-economy' },
    { type:'business', label:'Business', badge:'MOST POPULAR', icon:'🛋️', price:Math.round(flight.price*2.4),
      features:['30kg baggage included','Gourmet 3-course meal','Priority boarding','Extra legroom seat','Lounge access'], cssClass:'class-business' },
    { type:'first', label:'First Class', badge:'LUXURY', icon:'👑', price:Math.round(flight.price*4.8),
      features:['40kg baggage + golf bag','à la carte dining','Private suite with bed','Chauffeur to airport','Dedicated concierge'], cssClass:'class-first' }
  ];
  const grid = document.getElementById('classGrid');
  grid.innerHTML = '';
  state.classes.forEach(function(cls, i) {
    const card = document.createElement('div');
    card.className = 'class-card '+cls.cssClass;
    card.style.animationDelay = (i*0.1)+'s';
    card.innerHTML =
      (cls.type==='business' ? '<div class="business-glow"></div>' : '') +
      '<span class="class-badge">'+cls.badge+'</span>' +
      '<span class="class-icon">'+cls.icon+'</span>' +
      '<div class="class-name">'+cls.label+'</div>' +
      '<div class="class-price">'+fmtPrice(cls.price)+'<span style="font-size:14px;font-weight:400;opacity:0.7;"> /person</span></div>' +
      '<ul class="class-features">'+cls.features.map(function(f){ return '<li class="class-feature">'+f+'</li>'; }).join('')+'</ul>' +
      '<button class="class-select-btn" onclick="selectClass('+i+')">Select '+cls.label+'</button>';
    grid.appendChild(card);
  });
}

function selectClass(idx) {
  state.selectedClass = state.classes[idx];
  if(window.fbAnalytics) window.fbAnalytics.logEvent('select_class',{class:state.selectedClass.label});
  buildSummary();
  showScreen('screen-details',4);
}

// =========================================
//   BOOKING SUMMARY
// =========================================
function buildSummary() {
  const f   = state.selectedFlight;
  const cls = state.selectedClass;
  document.getElementById('summaryFlightCard').innerHTML =
    '<div class="sum-airline">'+f.airline.name+' · '+f.id+'</div>' +
    '<div class="sum-route"><span>'+f.fromCode+'</span><span class="sum-arrow">→</span><span>'+f.toCode+'</span></div>' +
    '<div class="sum-date">'+f.dep+' – '+f.arr+' · '+fmtDur(f.duration)+' · '+(f.stops===0?'Non-stop':(f.stops+' Stop'))+' · '+cls.label+'</div>';
  updateBreakdown();
  ['addon-meal','addon-baggage','addon-insurance','addon-lounge'].forEach(function(id){
    document.getElementById(id).addEventListener('change', updateBreakdown);
  });
}

function getAddonExtras() {
  const map = { 'addon-meal':499,'addon-baggage':899,'addon-insurance':299,'addon-lounge':1499 };
  let total=0, items=[];
  Object.entries(map).forEach(function([id,val]){
    if(document.getElementById(id).checked){
      total+=val;
      items.push({ label: document.getElementById(id).parentElement.querySelector('.addon-title').textContent, val });
    }
  });
  return { total, items };
}

function updateBreakdown() {
  const f=state.selectedFlight, cls=state.selectedClass, pax=state.pax;
  const base   = cls.price*pax;
  const taxes  = Math.round(base*0.12);
  const extras = getAddonExtras();
  const grand  = base+taxes+extras.total;
  let rows =
    '<div class="breakdown-row"><span class="breakdown-label">'+cls.label+' x '+pax+'</span><span class="breakdown-val">'+fmtPrice(base)+'</span></div>' +
    '<div class="breakdown-row"><span class="breakdown-label">Taxes and Fees</span><span class="breakdown-val">'+fmtPrice(taxes)+'</span></div>';
  extras.items.forEach(function(it){
    rows += '<div class="breakdown-row"><span class="breakdown-label">'+it.label+'</span><span class="breakdown-val">+'+fmtPrice(it.val)+'</span></div>';
  });
  rows += '<div class="breakdown-row breakdown-total"><span class="breakdown-label">Total</span><span class="breakdown-val">'+fmtPrice(grand)+'</span></div>';
  document.getElementById('summaryBreakdown').innerHTML = rows;
  state.grandTotal = grand;
}

// =========================================
//   PROCEED TO CONFIRM (+ Firebase save)
// =========================================
function proceedToConfirm() {
  const fields = [
    {id:'firstName'},{id:'lastName'},{id:'dob'},{id:'nationality'},
    {id:'passportNo'},{id:'emailAddr'},{id:'mobileNo'}
  ];
  let valid = true;
  fields.forEach(function(f){
    const el = document.getElementById(f.id);
    el.classList.remove('form-error');
    if(!el.value.trim()){ el.classList.add('form-error'); valid=false; }
  });
  if(!valid){ showToast('Please fill in all required fields'); return; }
  const email = document.getElementById('emailAddr').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    document.getElementById('emailAddr').classList.add('form-error');
    showToast('Please enter a valid email address'); return;
  }

  showLoading('Confirming booking');
  setTimeout(function(){
    hideLoading();
    buildConfirmation();
    showScreen('screen-confirm',5);
  }, 1800);
}

// =========================================
//   BUILD CONFIRMATION + FIREBASE SAVE
// =========================================
function buildConfirmation() {
  const f   = state.selectedFlight;
  const cls = state.selectedClass;
  const ref = 'SKYVLT-'+Math.random().toString(36).substr(2,6).toUpperCase();
  state.lastBookingRef = ref;

  document.getElementById('ticketAirline').textContent  = f.airline.name+' · '+cls.label;
  document.getElementById('ticketRef').textContent       = ref;
  document.getElementById('ticketFrom').textContent      = f.fromCode;
  document.getElementById('ticketFromCity').textContent  = f.from;
  document.getElementById('ticketTo').textContent        = f.toCode;
  document.getElementById('ticketToCity').textContent    = f.to;
  document.getElementById('ticketDuration').textContent  = fmtDur(f.duration);
  document.getElementById('ticketType').textContent      = f.stops===0 ? 'Non-stop' : f.stops+' Stop';

  const firstName = document.getElementById('firstName').value;
  const lastName  = document.getElementById('lastName').value;
  const d = new Date(state.depDate);
  const ds= d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});

  document.getElementById('ticketDetailsGrid').innerHTML =
    '<div class="td-item"><div class="td-label">Passenger</div><div class="td-val">'+firstName+' '+lastName+'</div></div>' +
    '<div class="td-item"><div class="td-label">Date</div><div class="td-val">'+ds+'</div></div>' +
    '<div class="td-item"><div class="td-label">Departure</div><div class="td-val">'+f.dep+'</div></div>' +
    '<div class="td-item"><div class="td-label">Seat Class</div><div class="td-val">'+cls.label+'</div></div>' +
    '<div class="td-item"><div class="td-label">Flight</div><div class="td-val">'+f.id+'</div></div>' +
    '<div class="td-item"><div class="td-label">Total Paid</div><div class="td-val" style="color:#A78BFA">'+fmtPrice(state.grandTotal)+'</div></div>';

  // Reset save status
  const fbStatus = document.getElementById('fbSaveStatus');
  const fbText   = document.getElementById('fbSaveText');
  fbStatus.className = 'fb-save-status fb-saving';
  fbText.textContent = 'Saving to cloud...';

  // Save to Firestore
  saveBookingToFirestore(ref);
}

// =========================================
//   NAVIGATION
// =========================================
function showScreen(screenId, stepNum) {
  const cur = document.getElementById(state.currentScreen);
  cur.classList.add('leaving');
  setTimeout(function(){
    cur.classList.remove('leaving'); cur.classList.add('hidden');
    const next = document.getElementById(screenId);
    next.classList.remove('hidden'); next.classList.add('entering');
    setTimeout(function(){ next.classList.remove('entering'); }, 600);
    state.currentScreen = screenId;
    updateStepBar(stepNum);
    window.scrollTo({ top:0, behavior:'smooth' });
  }, 300);
}

function goBack(screenId, stepNum) { showScreen(screenId, stepNum); }

function updateStepBar(active) {
  for(let i=1;i<=5;i++){
    const el=document.getElementById('si-'+i);
    el.classList.remove('active','done');
    if(i<active) el.classList.add('done');
    else if(i===active) el.classList.add('active');
  }
}

// =========================================
//   BOOK ANOTHER
// =========================================
function bookAnother() {
  ['firstName','lastName','dob','nationality','passportNo','emailAddr','mobileNo'].forEach(function(id){
    document.getElementById(id).value='';
  });
  ['addon-meal','addon-baggage','addon-insurance','addon-lounge'].forEach(function(id){
    document.getElementById(id).checked=false;
  });
  document.getElementById('fromCity').value='';
  document.getElementById('toCity').value='';
  document.getElementById('fromCode').textContent='--';
  document.getElementById('toCode').textContent='--';
  state.selectedFlight=null; state.selectedClass=null; state.lastBookingRef=null;
  showScreen('screen-search',1);
}

// =========================================
//   TOAST
// =========================================
function showToast(msg, type) {
  const existing = document.querySelector('.error-toast');
  if(existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'error-toast' + (type==='success' ? ' toast-success' : '');
  toast.textContent = (type==='success' ? '✓ ' : '⚠ ') + msg;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.remove(); }, 3500);
}

// =========================================
//   LOADING
// =========================================
let loadingEl = null;
function showLoading(msg) {
  loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.innerHTML = '<div class="loading-spinner"></div><div class="loading-text"><span>'+msg+'</span><span class="loading-dots"></span></div>';
  document.body.appendChild(loadingEl);
}
function hideLoading() { if(loadingEl){ loadingEl.remove(); loadingEl=null; } }

// =========================================
//   DEFAULT DATE
// =========================================
(function setDefaults() {
  const d = new Date();
  d.setDate(d.getDate()+1);
  document.getElementById('depDate').value = d.toISOString().split('T')[0];
  document.getElementById('depDate').min   = d.toISOString().split('T')[0];
})();

// =========================================
//   TAB SWITCHING — Hotels & Packages
// =========================================
function switchTab(tab) {
  document.querySelectorAll('.nav-link').forEach(function(l){ l.classList.remove('active'); });
  var navEl = document.getElementById('nav-'+tab);
  if (navEl) navEl.classList.add('active');

  var stepBar = document.getElementById('stepBar');
  if (stepBar) stepBar.style.display = (tab === 'flights') ? '' : 'none';

  document.getElementById('flightsSection').classList.toggle('hidden', tab !== 'flights');
  document.getElementById('section-hotels').classList.toggle('hidden', tab !== 'hotels');
  document.getElementById('section-packages').classList.toggle('hidden', tab !== 'packages');

  if (tab === 'hotels') initHotels();
  if (tab === 'packages') initPackages();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.fbAnalytics) window.fbAnalytics.logEvent('tab_switch', { tab: tab });
}

// =========================================
//   HOTELS DATA & LOGIC
// =========================================
var HOTEL_DATA = [
  { id:1, name:'The Oberoi Grand', city:'Kolkata', stars:5, price:12500, rating:4.9, reviews:3241, emoji:'🏛', category:'luxury', gradient:'linear-gradient(135deg,#1a0533,#2d1259)', amenities:['Pool','Spa','Butler','Fine Dining','Gym'], desc:'Heritage luxury in the heart of the city' },
  { id:2, name:'Taj Lake Palace', city:'Udaipur', stars:5, price:28000, rating:4.95, reviews:1872, emoji:'🏰', category:'luxury', gradient:'linear-gradient(135deg,#0e2d4a,#1a5276)', amenities:['Lake View','Spa','Butler','Pool','Fine Dining'], desc:'Floating palace hotel on Lake Pichola' },
  { id:3, name:'Lemon Tree Premier', city:'Mumbai', stars:4, price:5500, rating:4.3, reviews:5678, emoji:'🍋', category:'midrange', gradient:'linear-gradient(135deg,#1a2a0a,#2d4a0e)', amenities:['Pool','Gym','Restaurant','Bar','Wifi'], desc:'Smart hotel near BKC business district' },
  { id:4, name:'Ibis Styles', city:'New Delhi', stars:3, price:2800, rating:4.1, reviews:8923, emoji:'🏨', category:'budget', gradient:'linear-gradient(135deg,#1a1a0a,#2d2a0e)', amenities:['Wifi','Restaurant','Gym','AC'], desc:'Modern smart rooms near Aerocity' },
  { id:5, name:'Anantara The Palm', city:'Dubai', stars:5, price:35000, rating:4.85, reviews:2109, emoji:'🌴', category:'luxury', gradient:'linear-gradient(135deg,#0a1a2d,#0e3a4a)', amenities:['Private Beach','Overwater Villas','Spa','6 Restaurants','Watersports'], desc:'Overwater villas on the iconic Palm Jumeirah' },
  { id:6, name:'Marina Bay Sands', city:'Singapore', stars:5, price:45000, rating:4.7, reviews:15321, emoji:'🌊', category:'luxury', gradient:'linear-gradient(135deg,#0a2240,#1a3a6a)', amenities:['Infinity Pool','Casino','Skypark','Spa','10 Restaurants'], desc:'The iconic skyline hotel with rooftop infinity pool' },
  { id:7, name:'Radisson Blu', city:'Bengaluru', stars:4, price:6800, rating:4.4, reviews:4512, emoji:'💼', category:'midrange', gradient:'linear-gradient(135deg,#1a0a2d,#2d1259)', amenities:['Pool','Gym','Conference','Spa','Bar'], desc:'Premium business hotel in Outer Ring Road' },
  { id:8, name:'OYO Townhouse', city:'Hyderabad', stars:3, price:1500, rating:3.9, reviews:12456, emoji:'🏠', category:'budget', gradient:'linear-gradient(135deg,#0a1a0a,#1a2d1a)', amenities:['Wifi','AC','TV','Housekeeping'], desc:'Comfortable stay near HITEC City' },
  { id:9, name:'Six Senses Goa', city:'Goa', stars:5, price:52000, rating:4.92, reviews:987, emoji:'🌺', category:'luxury', gradient:'linear-gradient(135deg,#2d0a0a,#4a1a0e)', amenities:['Private Beach','Spa','Yacht','Organic Dining','Snorkeling'], desc:'Private island luxury retreat in North Goa' },
  { id:10, name:'Holiday Inn Express', city:'Chennai', stars:3, price:3200, rating:4.2, reviews:6789, emoji:'🌟', category:'budget', gradient:'linear-gradient(135deg,#0a1a2d,#1a2d3a)', amenities:['Pool','Gym','Wifi','Restaurant','Shuttle'], desc:'Clean and modern near the airport' },
  { id:11, name:'Park Hyatt', city:'Bangkok', stars:5, price:18000, rating:4.75, reviews:3456, emoji:'🌆', category:'luxury', gradient:'linear-gradient(135deg,#0a0a1a,#1a1a3a)', amenities:['Rooftop Pool','Spa','Helipad','Fine Dining','Butler'], desc:'Contemporary luxury above the Bangkok skyline' },
  { id:12, name:'Zostel Jaipur', city:'Jaipur', stars:2, price:900, rating:4.0, reviews:3201, emoji:'🎒', category:'budget', gradient:'linear-gradient(135deg,#2d1a0a,#4a2d0e)', amenities:['Wifi','Common Area','Lockers','Tours'], desc:'Social hostel in the heart of Pink City' }
];

var filteredHotels = HOTEL_DATA.slice();
var hotelsInited = false;

function initHotels() {
  if (!hotelsInited) {
    var today = new Date();
    var ci = new Date(today); ci.setDate(today.getDate()+1);
    var co = new Date(today); co.setDate(today.getDate()+4);
    document.getElementById('hotelCheckin').value = ci.toISOString().split('T')[0];
    document.getElementById('hotelCheckout').value = co.toISOString().split('T')[0];
    hotelsInited = true;
  }
  renderHotels(HOTEL_DATA);
}

function renderHotels(hotels) {
  var grid = document.getElementById('hotelGrid');
  if (!hotels.length) {
    grid.innerHTML = '<div class="no-results">No hotels found. Try another city or filter.</div>';
    return;
  }
  grid.innerHTML = '';
  hotels.forEach(function(h) {
    var card = document.createElement('div');
    card.className = 'hotel-card glass-card';
    var stars = '⭐'.repeat(h.stars);
    var amenHtml = h.amenities.slice(0,4).map(function(a){ return '<span class="hotel-amenity">'+a+'</span>'; }).join('');
    card.innerHTML =
      '<div class="hotel-img" style="background:'+h.gradient+'">' +
        '<div class="hotel-emoji">'+h.emoji+'</div>' +
        '<div class="hotel-stars">'+stars+'</div>' +
      '</div>' +
      '<div class="hotel-body">' +
        '<div class="hotel-name">'+h.name+'</div>' +
        '<div class="hotel-location">📍 '+h.city+'</div>' +
        '<div class="hotel-desc">'+h.desc+'</div>' +
        '<div class="hotel-rating"><span class="hotel-rating-score">'+h.rating+'</span><span class="hotel-rating-label">Excellent</span><span class="hotel-rating-reviews">('+h.reviews.toLocaleString()+' reviews)</span></div>' +
        '<div class="hotel-amenities">'+amenHtml+'</div>' +
        '<div class="hotel-footer">' +
          '<div class="hotel-price"><span class="hotel-price-val">'+fmtPrice(h.price)+'</span><span class="hotel-price-night">/night</span></div>' +
          '<button class="btn-select hotel-book-btn" onclick="showToast(\''+h.name+' — Hotel booking coming soon!\')">Book Now ✈</button>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function searchHotels() {
  var city = document.getElementById('hotelCity').value.trim().toLowerCase();
  if (!city) { renderHotels(filteredHotels); return; }
  var results = filteredHotels.filter(function(h){ return h.city.toLowerCase().includes(city) || h.name.toLowerCase().includes(city); });
  renderHotels(results);
}

function filterHotels(cat, el) {
  document.querySelectorAll('.hotel-filter-row .filter-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  filteredHotels = cat === 'all' ? HOTEL_DATA.slice() : HOTEL_DATA.filter(function(h){ return h.category === cat; });
  var city = document.getElementById('hotelCity').value.trim().toLowerCase();
  renderHotels(city ? filteredHotels.filter(function(h){ return h.city.toLowerCase().includes(city); }) : filteredHotels);
}

// =========================================
//   PACKAGES DATA & LOGIC
// =========================================
var PACKAGE_DATA = [
  { id:1, title:'Dubai Extravaganza', destination:'Dubai, UAE', emoji:'🌆', category:'luxury', duration:'7 Nights', hotel:'5-Star Palm Resort', includes:['Return Flights','7 Nights Hotel','Burj Khalifa Visit','Desert Safari','Dhow Cruise'], price:125000, originalPrice:158000, gradient:'linear-gradient(135deg,#7B0019,#B8860B)', badge:'Best Seller' },
  { id:2, title:'Bali Bliss', destination:'Bali, Indonesia', emoji:'🌺', category:'beach', duration:'5 Nights', hotel:'Beachfront Villa', includes:['Return Flights','5 Nights Villa','Rice Terrace Tour','Spa Treatments','Cooking Class'], price:65000, originalPrice:82000, gradient:'linear-gradient(135deg,#0a4a2d,#1a8a4a)', badge:'Hot Deal' },
  { id:3, title:'Singapore City Break', destination:'Singapore', emoji:'🌊', category:'city', duration:'4 Nights', hotel:'Marina Bay Hotel', includes:['Return Flights','4 Nights Hotel','Universal Studios','Gardens by the Bay','City Tour'], price:78000, originalPrice:95000, gradient:'linear-gradient(135deg,#0a2240,#1a3a6a)', badge:'Popular' },
  { id:4, title:'Ladakh Adventure', destination:'Leh, India', emoji:'🏔', category:'adventure', duration:'6 Nights', hotel:'Eco Camp + Guesthouse', includes:['Return Flights','6 Nights Stay','Pangong Lake Visit','Nubra Valley Safari','Bike Rental'], price:42000, originalPrice:54000, gradient:'linear-gradient(135deg,#0a1a2d,#2d4a6a)', badge:'Adventure Pick' },
  { id:5, title:'Bangkok + Phuket Combo', destination:'Thailand', emoji:'🐘', category:'beach', duration:'8 Nights', hotel:'4-Star Hotels', includes:['All Flights','8 Nights Hotel','Elephant Sanctuary','Island Hopping','Street Food Tour'], price:89000, originalPrice:115000, gradient:'linear-gradient(135deg,#2d0a4a,#4a1a8a)', badge:'Combo Value' },
  { id:6, title:'Maldives Escape', destination:'Maldives', emoji:'🏝', category:'beach', duration:'5 Nights', hotel:'Overwater Bungalow', includes:['Return Flights','5 Nights Bungalow','Snorkeling','Sunset Cruise','All Meals Included'], price:195000, originalPrice:240000, gradient:'linear-gradient(135deg,#003d5c,#00b4d8)', badge:'Luxury Escape' },
  { id:7, title:'London + Paris', destination:'Europe', emoji:'🗼', category:'city', duration:'10 Nights', hotel:'4-Star Hotels x2', includes:['Return Int\'l Flights','5N London + 5N Paris','Eurostar Train','Eiffel Tower Tour','Thames Cruise'], price:285000, originalPrice:350000, gradient:'linear-gradient(135deg,#1a0a2d,#3a1a5c)', badge:'Dream Holiday' },
  { id:8, title:'Kerala Backwaters', destination:'Kerala, India', emoji:'🌿', category:'adventure', duration:'4 Nights', hotel:'Houseboat + Resort', includes:['Return Flights','2N Houseboat','2N Resort','Ayurveda Spa','Kathakali Show'], price:32000, originalPrice:42000, gradient:'linear-gradient(135deg,#0a2d0a,#1a4a1a)', badge:'Serene Escape' }
];

var filteredPackages = PACKAGE_DATA.slice();

function initPackages() {
  renderPackages(PACKAGE_DATA);
}

function renderPackages(packages) {
  var grid = document.getElementById('packagesGrid');
  grid.innerHTML = '';
  packages.forEach(function(pkg) {
    var card = document.createElement('div');
    card.className = 'pkg-card';
    var incHtml = pkg.includes.map(function(item){
      return '<li class="pkg-include-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/></svg>'+item+'</li>';
    }).join('');
    var savings = fmtPrice(pkg.originalPrice - pkg.price);
    card.innerHTML =
      '<div class="pkg-hero" style="background:'+pkg.gradient+'">' +
        '<span class="pkg-badge">'+pkg.badge+'</span>' +
        '<div class="pkg-emoji">'+pkg.emoji+'</div>' +
        '<div class="pkg-dest">'+pkg.destination+'</div>' +
        '<div class="pkg-duration">'+pkg.duration+'</div>' +
      '</div>' +
      '<div class="pkg-body">' +
        '<div class="pkg-title">'+pkg.title+'</div>' +
        '<div class="pkg-hotel-line"><span class="pkg-label">Hotel: </span>'+pkg.hotel+'</div>' +
        '<ul class="pkg-includes">'+incHtml+'</ul>' +
        '<div class="pkg-footer">' +
          '<div class="pkg-pricing">' +
            '<div class="pkg-original">'+fmtPrice(pkg.originalPrice)+'</div>' +
            '<div class="pkg-price">'+fmtPrice(pkg.price)+' <span class="pkg-pp">/ person</span></div>' +
            '<div class="pkg-save">Save '+savings+'</div>' +
          '</div>' +
          '<button class="btn-select pkg-btn" onclick="showToast(\'Booking for &quot;'+pkg.title+'&quot; coming soon!\')">View Package ✈</button>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function filterPackages(cat, el) {
  document.querySelectorAll('.pkg-category-row .filter-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  filteredPackages = cat === 'all' ? PACKAGE_DATA.slice() : PACKAGE_DATA.filter(function(p){ return p.category === cat; });
  renderPackages(filteredPackages);
}

// =========================================
//   PAYMENT & AUTH CONTROLLERS
// =========================================
function showPaymentScreen() {
  const fields = [
    {id:'firstName'},{id:'lastName'},{id:'dob'},{id:'nationality'},
    {id:'passportNo'},{id:'emailAddr'},{id:'mobileNo'}
  ];
  let valid = true;
  fields.forEach(function(f){
    const el = document.getElementById(f.id);
    el.classList.remove('form-error');
    if(!el.value.trim()){ el.classList.add('form-error'); valid=false; }
  });
  if(!valid){ showToast('Please fill in all required fields'); return; }
  const email = document.getElementById('emailAddr').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    document.getElementById('emailAddr').classList.add('form-error');
    showToast('Please enter a valid email address'); return;
  }

  // Build Payment Screen summaries
  const f   = state.selectedFlight;
  const cls = state.selectedClass;
  document.getElementById('paymentFlightCard').innerHTML =
    '<div class="sum-airline">'+f.airline.name+' · '+f.id+'</div>' +
    '<div class="sum-route"><span>'+f.fromCode+'</span><span class="sum-arrow">→</span><span>'+f.toCode+'</span></div>' +
    '<div class="sum-date">'+f.dep+' – '+f.arr+' · '+fmtDur(f.duration)+' · '+(f.stops===0?'Non-stop':(f.stops+' Stop'))+' · '+cls.label+'</div>';
  
  const base   = cls.price * state.pax;
  const taxes  = Math.round(base*0.12);
  const extras = getAddonExtras();
  let rows =
    '<div class="breakdown-row"><span class="breakdown-label">'+cls.label+' x '+state.pax+'</span><span class="breakdown-val">'+fmtPrice(base)+'</span></div>' +
    '<div class="breakdown-row"><span class="breakdown-label">Taxes and Fees</span><span class="breakdown-val">'+fmtPrice(taxes)+'</span></div>';
  extras.items.forEach(function(it){
    rows += '<div class="breakdown-row"><span class="breakdown-label">'+it.label+'</span><span class="breakdown-val">+'+fmtPrice(it.val)+'</span></div>';
  });
  rows += '<div class="breakdown-row breakdown-total"><span class="breakdown-label">Total</span><span class="breakdown-val">'+fmtPrice(state.grandTotal)+'</span></div>';
  document.getElementById('paymentBreakdown').innerHTML = rows;

  showScreen('screen-payment', 4);
}

function formatCardNumber(input) {
  let v = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  let matches = v.match(/\d{4,16}/g);
  let match = matches && matches[0] || '';
  let parts = [];
  for (let i=0, len=match.length; i<len; i+=4) { parts.push(match.substring(i, i+4)); }
  if (parts.length > 0) { input.value = parts.join(' '); } else { input.value = v; }
}

function formatExpiry(input) {
  let v = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) { input.value = v.substring(0,2) + '/' + v.substring(2,4); } else { input.value = v; }
}

function processPaymentAndConfirm() {
  const cName = document.getElementById('cardName').value.trim();
  const cNum = document.getElementById('cardNumber').value.trim();
  const cExp = document.getElementById('cardExpiry').value.trim();
  const cCvv = document.getElementById('cardCvv').value.trim();

  if(!cName || !cNum || !cExp || !cCvv) { showToast('Please fill out all card payment details'); return; }
  if(cNum.replace(/\s+/g, '').length < 16) { showToast('Card number must be 16 digits'); return; }
  if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cExp)) { showToast('Expiry date must be in MM/YY format'); return; }
  if(cCvv.length < 3) { showToast('CVV must be 3 digits'); return; }

  showLoading('Processing Payment...');
  setTimeout(function(){
    hideLoading();
    buildConfirmation();
    showScreen('screen-confirm',5);
  }, 2200);
}

// ---- SIGN IN FUNCTIONALITY ----
let isSignUpMode = false;

document.getElementById('btnSignIn').onclick = function() {
  const modal = document.getElementById('signInModal');
  modal.classList.remove('hidden');
  modal.classList.add('modal-visible');
};

function closeSignIn(event) {
  if (event && event.target !== document.getElementById('signInModal')) return;
  const modal = document.getElementById('signInModal');
  modal.classList.add('modal-closing');
  setTimeout(function() {
    modal.classList.remove('modal-visible', 'modal-closing');
    modal.classList.add('hidden');
  }, 300);
}

function switchAuthMode() {
  isSignUpMode = !isSignUpMode;
  document.getElementById('authModalTitle').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
  document.getElementById('btnAuthSubmit').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
  document.getElementById('authSwitchText').textContent = isSignUpMode ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('authSwitchLink').textContent = isSignUpMode ? 'Sign In' : 'Sign Up';
}

async function handleAuthSubmit() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPassword').value.trim();

  if (!email || !pass) { showToast('Please fill in both email and password'); return; }
  if (pass.length < 6) { showToast('Password must be at least 6 characters'); return; }

  if (!window.auth) {
    showToast('Firebase Authentication not loaded'); return;
  }

  showLoading(isSignUpMode ? 'Creating account...' : 'Signing in...');
  try {
    let userCredential;
    if (isSignUpMode) {
      userCredential = await window.auth.createUserWithEmailAndPassword(email, pass);
      showToast('Account created successfully!', 'success');
    } else {
      userCredential = await window.auth.signInWithEmailAndPassword(email, pass);
      showToast('Logged in successfully!', 'success');
    }
    const user = userCredential.user;
    document.getElementById('btnSignIn').textContent = user.email.split('@')[0];
    document.getElementById('btnSignIn').onclick = function() {
      if(confirm('Do you want to log out?')) {
        window.auth.signOut().then(() => {
          document.getElementById('btnSignIn').textContent = 'Sign In';
          document.getElementById('btnSignIn').onclick = () => document.getElementById('btnSignIn').click();
          showToast('Logged out');
        });
      }
    };
    closeSignIn();
  } catch (err) {
    console.error('Authentication Error:', err);
    showToast(err.message);
  } finally {
    hideLoading();
  }
}
