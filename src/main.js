import { gsap } from 'gsap';
import { stations } from './data.js';
import { SoundManager } from './audio.js';

// --- STATE ---
let currentStation = null;
let currentQuizList = [];
let currentQuizIndex = 0;
// تتبع تقدم اللعبة (المحطات المنجزة)
let completedStations = JSON.parse(localStorage.getItem('jerusalem_completed_v3')) || [];

const defaultQuizzes = {
  3: [{ q: 'من يحتفظ بمفتاح كنيسة القيامة منذ مئات السنين؟', opts: ['عائلة مسيحية', 'حارس المدينة', 'عائلة مسلمة'], ans: 2 }],
  5: [{ q: 'لماذا سمي جبل الزيتون (الطور) بهذا الاسم؟', opts: ['بسبب شكل الجبل', 'لكثرة أشجار الزيتون المزروعة فيه', 'بسبب لون الحجارة'], ans: 1 }]
};
let dynamicQuizzes = JSON.parse(localStorage.getItem('jerusalem_quizzes_v2')) || defaultQuizzes;

// --- INITIALIZATION ---
function init() {
  renderMapPins();

  // المشهد السينمائي لبدء اللعبة
  document.getElementById('btn-start-game').onclick = () => {
    SoundManager.startSeq();

    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('map-screen').classList.add('active');

    const mapWrapper = document.getElementById('map-wrapper');
    gsap.fromTo(mapWrapper,
      { scale: 2.5, opacity: 0, y: 150 },
      { scale: 1, opacity: 1, y: 0, duration: 2.5, ease: "power3.out" }
    );
  };

  // إعادة تعيين التقدم (من شاشة البداية)
  document.getElementById('btn-welcome-reset').onclick = resetGame;

  // فتح لوحة المعلم (من شاشة البداية)
  document.getElementById('btn-welcome-supervisor').onclick = () => {
    document.getElementById('modal-teacher').classList.add('active');
    renderTeacherPanel();
  };

  // زر إعادة اللعب في شاشة الخريطة
  document.getElementById('btn-reset-map').onclick = () => {
    resetGame(false);
  };

  // زر إعادة اللعب في شاشة النهاية
  document.getElementById('btn-replay').onclick = () => {
    resetGame(true);
    document.getElementById('end-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.add('active');
  };
}

function resetGame(silent = false) {
  if (silent || confirm('هل أنت متأكد أنك تريد مسح تقدم الطلاب والبدء من جديد؟')) {
    completedStations = [];
    localStorage.setItem('jerusalem_completed_v3', JSON.stringify([]));
    renderMapPins();
    if (!silent) alert('تم إعادة تعيين اللعبة بنجاح.');
  }
}

function renderMapPins() {
  const container = document.getElementById('map-container');
  // إزالة جميع الدبابيس فقط للحفاظ على SVG
  Array.from(container.querySelectorAll('.map-pin')).forEach(el => el.remove());

  const svg = document.getElementById('treasure-path');
  svg.innerHTML = '';

  let currentActiveFound = false;

  stations.forEach((st, i) => {
    // 1. رسم مسار الكنز (الخط المنقط) نحو المحطة التالية
    if (i < stations.length - 1) {
      const nextSt = stations[i + 1];
      const isPathUnlocked = completedStations.includes(st.id); // المسار يضيء إذا تم إنهاء المحطة الحالية

      svg.innerHTML += `<line class="line-dash" 
        x1="${st.mapX}%" y1="${st.mapY}%" 
        x2="${nextSt.mapX}%" y2="${nextSt.mapY}%" 
        stroke="${isPathUnlocked ? '#EF4444' : 'rgba(0,0,0,0.3)'}" 
        stroke-width="${isPathUnlocked ? 6 : 4}" 
        style="transition: stroke 0.5s;"></line>`;
    }

    // 2. حالة المحطة
    const isCompleted = completedStations.includes(st.id);
    const isUnlocked = i === 0 || completedStations.includes(stations[i - 1].id);

    const pin = document.createElement('div');
    pin.className = `map-pin ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`;
    pin.style.left = `${st.mapX}%`;
    pin.style.top = `${st.mapY}%`;

    // وضع أيقونة القفل إذا كانت مغلقة
    pin.innerHTML = `
      ${!isUnlocked ? '🔒' : (isCompleted ? '✅' : st.icon)}
      <div class="pin-label">${st.name}</div>
      ${isCompleted ? '<div class="completion-star">⭐</div>' : ''}
    `;

    if (isUnlocked) {
      pin.onclick = () => openStation(st);
      if (!isCompleted && !currentActiveFound) {
        // جعل المحطة النشطة تنبض قليلاً
        gsap.to(pin, { scale: 1.1, rotationX: -45, repeat: -1, yoyo: true, duration: 0.8 });
        currentActiveFound = true;
      }
    } else {
      pin.onclick = () => {
        SoundManager.error();
        alert('🔒 عليك إنجاز المحطة السابقة أولاً لفتح هذا المعلم!');
      };
    }

    container.appendChild(pin);
  });

  // التحقق من إنهاء جميع المحطات
  if (completedStations.length === stations.length) {
    document.getElementById('map-title-text').innerText = "🎉 مبروك! أتممتم استكشاف القدس";
  } else {
    document.getElementById('map-title-text').innerText = "🗺️ تتبع مسار الكنز لإكمال الرحلة";
  }
}

// --- NAVIGATION ---
function openStation(st) {
  currentStation = st;
  const mapWrapper = document.getElementById('map-wrapper');

  gsap.to(mapWrapper, {
    scale: 2.5,
    transformOrigin: `${st.mapX}% ${st.mapY}%`,
    duration: 1,
    ease: "power2.inOut",
    onComplete: () => {
      populateStationScreen(st);

      document.getElementById('map-screen').classList.remove('active');
      const stScreen = document.getElementById('station-screen');
      stScreen.classList.add('active');

      const stBoard = document.getElementById('station-board');
      stBoard.classList.remove('bouncy');
      void stBoard.offsetWidth;
      stBoard.classList.add('bouncy');

      gsap.set(mapWrapper, { scale: 1, transformOrigin: "center center" });
    }
  });
}

document.getElementById('btn-back').onclick = () => {
  SoundManager.stopSpeak();

  // تسجيل إنجاز المحطة
  if (currentStation && !completedStations.includes(currentStation.id)) {
    completedStations.push(currentStation.id);
    localStorage.setItem('jerusalem_completed_v3', JSON.stringify(completedStations));

    SoundManager.levelComplete();
    renderMapPins();

    // نهاية اللعبة تماماً؟
    if (completedStations.length === stations.length) {
      setTimeout(() => {
        document.getElementById('end-screen').classList.add('active');
        SoundManager.success();

        // إطلاق الألعاب النارية (Confetti) احتفالاً بالإنهاء!
        if (window.confetti) {
          const duration = 5 * 1000;
          const animationEnd = Date.now() + duration;
          const colors = ['#fbbf24', '#10b981', '#1e3a8a'];

          (function frame() {
            window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
            if (Date.now() < animationEnd) requestAnimationFrame(frame);
          }());
        }
      }, 1000);
    }
  } else {
    SoundManager.click();
  }

  document.getElementById('station-screen').classList.remove('active');
  document.getElementById('map-screen').classList.add('active');
};

function populateStationScreen(st) {
  document.getElementById('st-bg').style.backgroundImage = `url('${st.image}')`;
  document.getElementById('st-img').src = st.image;

  document.getElementById('st-title').innerText = `${st.icon} ${st.name}`;
  document.getElementById('st-desc').innerText = st.desc;

  const tasksContainer = document.getElementById('st-tasks-container');
  tasksContainer.innerHTML = '';

  const createCard = (title, data, teamId) => {
    const card = document.createElement('div');
    card.className = `team-quest ${teamId === 1 ? 'blue' : (teamId === 2 ? 'red' : 'gold')}`;
    let html = `<h4>${title}</h4><p>${data.text}</p>`;

    if (data.hasQuiz) {
      html += `<button class="btn-game btn-gold" style="margin-top:20px; font-size:1.2rem; padding:12px;" onclick="startQuiz(${st.id})">🎯 انقر لبدء التحدي التفاعلي</button>`;
    }
    card.innerHTML = html;
    tasksContainer.appendChild(card);
  };

  if (st.shared) {
    createCard('🤝 الفريق الأول والثاني (مهمة مشتركة)', st.shared, 0);
  } else {
    if (st.t1) createCard('⚔️ الفريق الأول', st.t1, 1);
    if (st.t2) createCard('🛡️ الفريق الثاني', st.t2, 2);
  }
}

document.getElementById('btn-listen').onclick = () => {
  if (currentStation) {
    SoundManager.speak(currentStation.audioText, () => { });
  }
};

// --- QUIZ LOGIC ---
window.startQuiz = (stId) => {
  SoundManager.click();
  currentQuizList = dynamicQuizzes[stId] || [];
  if (currentQuizList.length === 0) {
    alert("لم يقم المعلم ببرمجة أسئلة لهذه المسابقة حتى الآن."); return;
  }
  currentQuizIndex = 0;
  renderQuizQuestion();
};

function renderQuizQuestion() {
  const q = currentQuizList[currentQuizIndex];
  document.getElementById('quiz-progress').innerText = `${currentQuizIndex + 1} / ${currentQuizList.length}`;
  document.getElementById('q-text').innerText = q.q;
  const optsContainer = document.getElementById('q-options');
  optsContainer.innerHTML = '';

  q.opts.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.innerText = opt;
    btn.onclick = () => handleQuizAnswer(idx, q.ans, btn);
    optsContainer.appendChild(btn);
  });

  document.getElementById('q-feedback').classList.add('hidden');
  document.getElementById('btn-close-quiz').classList.add('hidden');

  const nextBtn = document.getElementById('btn-close-quiz');
  if (currentQuizIndex === currentQuizList.length - 1) {
    nextBtn.innerText = "إتمام المهمة بنجاح ✔️";
  } else {
    nextBtn.innerText = "السؤال التالي ⏭️";
  }
  document.getElementById('modal-quiz').classList.add('active');
}

function handleQuizAnswer(selectedIdx, correctIdx, btn) {
  const allBtns = document.querySelectorAll('.quiz-opt');
  allBtns.forEach(b => b.style.pointerEvents = 'none');
  const feedback = document.getElementById('q-feedback');
  feedback.classList.remove('hidden');

  if (selectedIdx === correctIdx) {
    btn.classList.add('correct');
    feedback.innerText = "إجابة صحيحة يا بطل! 🌟";
    feedback.style.color = "var(--green)";
    SoundManager.success();
  } else {
    btn.classList.add('wrong');
    allBtns[correctIdx].classList.add('correct');
    feedback.innerText = "إجابة خاطئة! الإجابة الخضراء هي الصحيحة.";
    feedback.style.color = "var(--gold)";
    SoundManager.error();
  }
  document.getElementById('btn-close-quiz').classList.remove('hidden');
}

document.getElementById('btn-close-quiz').onclick = () => {
  SoundManager.click();
  if (currentQuizIndex < currentQuizList.length - 1) {
    currentQuizIndex++;
    const qCard = document.querySelector('.quiz-card');
    qCard.classList.remove('bouncy');
    void qCard.offsetWidth;
    qCard.classList.add('bouncy');
    renderQuizQuestion();
  } else {
    document.getElementById('modal-quiz').classList.remove('active');
  }
};

// --- TEACHER PANEL LOGIC ---
const btnSupervisor = document.getElementById('btn-supervisor');
if (btnSupervisor) {
  btnSupervisor.onclick = () => {
    document.getElementById('modal-teacher').classList.add('active');
    renderTeacherPanel();
  };
}

const closeTeacherBtn = document.getElementById('btn-close-teacher');
if (closeTeacherBtn) {
  closeTeacherBtn.onclick = () => {
    document.getElementById('modal-teacher').classList.remove('active');
  };
}

const teacherStSelect = document.getElementById('teacher-st-select');
if (teacherStSelect) {
  teacherStSelect.onchange = renderTeacherPanel;
}

function renderTeacherPanel() {
  const selectEl = document.getElementById('teacher-st-select');
  if (!selectEl) return;
  const stId = selectEl.value;
  const list = document.getElementById('questions-list');
  list.innerHTML = '';
  const qs = dynamicQuizzes[stId] || [];
  qs.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 't-q-card';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
        <h4 style="color:var(--primary); font-size:1.3rem;">السؤال ${idx + 1}</h4>
        <button class="btn-del" onclick="window.delQuestion(${stId}, ${idx})">حذف 🗑️</button>
      </div>
      <input type="text" class="t-input q-input-txt" value="${q.q}" placeholder="نص السؤال">
      <input type="text" class="t-input q-input-opt0" value="${q.opts[0]}" placeholder="خيار 1">
      <input type="text" class="t-input q-input-opt1" value="${q.opts[1]}" placeholder="خيار 2">
      <input type="text" class="t-input q-input-opt2" value="${q.opts[2]}" placeholder="خيار 3">
      <select class="t-input q-input-ans" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">
        <option value="0" ${q.ans == 0 ? 'selected' : ''}>الإجابة الصحيحة: الخيار 1</option>
        <option value="1" ${q.ans == 1 ? 'selected' : ''}>الإجابة الصحيحة: الخيار 2</option>
        <option value="2" ${q.ans == 2 ? 'selected' : ''}>الإجابة الصحيحة: الخيار 3</option>
      </select>
    `;
    list.appendChild(div);
  });
}

const btnAddQ = document.getElementById('btn-add-q');
if (btnAddQ) {
  btnAddQ.onclick = () => {
    const stId = document.getElementById('teacher-st-select').value;
    if (!dynamicQuizzes[stId]) dynamicQuizzes[stId] = [];
    dynamicQuizzes[stId].push({ q: 'السؤال الإضافي؟', opts: ['الخيار 1', 'الخيار 2', 'الخيار 3'], ans: 0 });
    renderTeacherPanel();
  };
}

window.delQuestion = (stId, idx) => {
  dynamicQuizzes[stId].splice(idx, 1);
  renderTeacherPanel();
};

const btnSaveAll = document.getElementById('btn-save-all');
if (btnSaveAll) {
  btnSaveAll.onclick = () => {
    const stId = document.getElementById('teacher-st-select').value;
    const cards = document.querySelectorAll('.t-q-card');
    const newQs = [];
    cards.forEach(card => {
      newQs.push({
        q: card.querySelector('.q-input-txt').value,
        opts: [
          card.querySelector('.q-input-opt0').value,
          card.querySelector('.q-input-opt1').value,
          card.querySelector('.q-input-opt2').value
        ],
        ans: parseInt(card.querySelector('.q-input-ans').value)
      });
    });
    dynamicQuizzes[stId] = newQs;
    localStorage.setItem('jerusalem_quizzes_v2', JSON.stringify(dynamicQuizzes));

    const saveBtn = document.getElementById('btn-save-all');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "✅ تم الحفظ!";
    saveBtn.style.background = "var(--primary)";
    setTimeout(() => {
      saveBtn.innerText = originalText;
      saveBtn.style.background = "var(--green)";
    }, 2000);
  };
}

init();

// --- VOICE SELECTOR LOGIC ---
function populateVoiceSelect() {
  const voiceSel = document.getElementById('voice-select');
  if (!voiceSel) return;
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('ar'));
  voiceSel.innerHTML = '';
  if (voices.length === 0) {
    voiceSel.innerHTML = '<option>لا توجد أصوات عربية متاحة</option>';
    return;
  }
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang}) ${!v.localService ? '☁️ أونلاين' : '💻 محلي'}`;
    if (v.name === localStorage.getItem('guide_voice')) opt.selected = true;
    voiceSel.appendChild(opt);
  });
}

document.getElementById('btn-supervisor')?.addEventListener('click', () => {
  setTimeout(populateVoiceSelect, 200);
});
document.getElementById('btn-welcome-supervisor')?.addEventListener('click', () => {
  setTimeout(populateVoiceSelect, 200);
});

document.getElementById('voice-select')?.addEventListener('change', (e) => {
  localStorage.setItem('guide_voice', e.target.value);
});

document.getElementById('btn-test-voice')?.addEventListener('click', () => {
  SoundManager.speak('مرحباً بكم يا فرسان زهرة المدائن! أنا مرشدكم في هذه الرحلة المميزة إلى مدينة القدس العريقة.');
});