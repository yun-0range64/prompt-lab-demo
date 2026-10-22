// 전역 변수 및 설정index = topic;handlePromptSubmission

let apiKey = "";

let username = "";

const chatEndpoint = "https://api.openai.com/v1/chat/completions";

// 로딩 스피너 관리

const toggleLoadingSpinner = (show) => {

  $('.loading-container').css('display', show ? 'flex' : 'none');

};

// GPT 응답 저장용 객체

let gptResponses = {};

// 초기 모달창

$(document).ready(() => {

  $('#input-apikey').css('display', 'flex');

  $('#step-guide1').show();   // 첫 화면만 보이게

   // STEP 1 → STEP 2로 이동

   $('#goToguide2').on('click', () => {

    $('#step-guide1').hide();

  $('#step-guide2').show();

  })

  // STEP 1 → STEP 2로 이동

  $('#goToApiStep').on('click', () => {

    $('#step-guide2').hide();

  $('#step-api').show();

  })

  $('#goToTopicInput').on('click', () => {

  const newApiKey = $('#apikeyInput').val().trim();

  const inputName = $('#usernameInput').val().trim(); // ✅ 이름 입력받기

  if (!inputName) {

    alert("이름을 입력해주세요!");

    return;

  }

  if (!newApiKey) {

    alert("유효한 API Key를 입력하세요.");

    return;

  }

  username = inputName;

  apiKey = newApiKey;

  // ✅ Firestore에 저장

  saveUsernameToDB(username); // 이 함수는 Firebase 모듈 안에서 정의한 거

  // 화면 전환

  $('#step-api').hide();

  $('#step-topic').show();

  $('#saveApikey').text('시작하기 👋');

});

// STEP 2 → 주제 버튼 클릭 시 실행

$('#step-topic button[data-topic]').on('click', function () {

  const topic = $(this).data('topic');

  if (!topic || !username || !apiKey) {

    alert("API Key 또는 이름이 누락되었습니다.");

    return;

  }

  selectedTopic = topic;

// 참여 정보 업데이트

updateParticipantInfo();

  // 이름 + 주제 Firestore에 저장

  saveUsernameToDB(username, selectedTopic);

  // 모달 닫기

  $('#input-apikey').css('display', 'none');

  alert("API Key와 주제가 설정되었습니다!");

});



});

// OpenAI API 호출 함수-------------------------------------------

const callGPT = (prompt, callback) => {

  toggleLoadingSpinner(true);

  $.ajax({

    url: chatEndpoint,

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      'Authorization': `Bearer ${apiKey}`,

    },

    data: JSON.stringify({

      model: "gpt-4o-mini", 

      messages: [{ role: "user", content: prompt }],

    }),

    success: (data) => {

      toggleLoadingSpinner(false);

      if (callback) callback(data.choices[0].message.content);

    },

    error: () => {

      toggleLoadingSpinner(false);

      alert("Error occurred while calling GPT");

    },

  });



};

// 프롬프트 누적 저장용 객체-------------------------------------

let promptHistory = {};

let selectedTopic = "";

// 프롬프트 생성기

// 기존 generateFullPrompt 함수 → 수정본

function generateFullPrompt() {

  const currentQuestion = $('h2').text().trim(); // 질문 넘버

  const questionTitle = $('h3').text().trim();       // 질문 제목(h3)

  const questionDesc = $('.text-wrapper p').text().trim(); // 질문 설명(p)

  const userInput = promptHistory[currentQuestion]; // 해당 질문의 입력값

  let prompt = `## 역할 (Role)

당신은 창의적 문제 해결을 전문으로 하는 시니어 디자이너이다. 당신은 디지털뿐만 아니라 제품, 서비스, 공간, 제도 등 다양한 디자인 영역에 대해 사고할 수 있다. 사용자가 입력한 내용을 기반으로 “${selectedTopic}”에 대한 아이디어를 생성해야 한다.

## 목표 (Objective)

아래 추가 정보에 대한 내용을 참고하여, 주제에 대한 새로운 아이디어를 도출하라.

## 추가 정보 (Additional Information)

아래의 질문, 설명 그리고 사용자 입력은 주제와 관련된 추가 정보

- 주제: ${selectedTopic}

- 질문: ${questionTitle}

- 설명: ${questionDesc}

- 사용자 입력 내용: ${userInput}

## 출력 형식 (Output Format)

사용자 입력을 바탕으로 하나의 구체적인 디자인 아이디어를 생성하라.

다음 형식을 반드시 지켜라.

[제목]

아이디어의 핵심을 표현하는 짧은 제목

[키워드]

키워드1, 키워드2, 키워드3

[아이디어 개요]

아이디어가 해결하려는 문제와 핵심 콘셉트를 설명한다.

[주요 기능 및 특징]

아이디어의 구체적인 기능과 사용자 경험을 설명한다.

[기대 효과]

아이디어를 통해 기대할 수 있는 변화와 가치를 설명한다.

작성 규칙:

- 아이디어는 반드시 하나만 제안한다.

- 키워드는 정확히 3개 작성하고 쉼표로 구분한다.

- 각 항목은 충분히 구체적으로 설명한다.

- 제공되지 않은 사용자 조건은 임의로 확정하지 않는다.

- 불필요한 인사말이나 결론은 생략한다.

- 마크다운 기호(#, ** 등)는 사용하지 않되, 최적의 형식으로 제시한다.

`;

  return prompt;

}

function renderIdeaResult(response) {

  const $output = $('#result-output');

  $output.empty();

  const sections = [

    '제목', '키워드', '아이디어 개요',

    '주요 기능 및 특징', '기대 효과'

  ];

  const data = {};

  const pattern = /\[(제목|키워드|아이디어 개요|주요 기능 및 특징|기대 효과)\]/g;

  const parts = response.split(pattern);

  for (let i = 1; i < parts.length; i += 2) {

    data[parts[i]] = (parts[i + 1] || '').trim();

  }

  if (!data['제목']) {

    $output.text(response);

    return;

  }

  $('<h2 class="idea-title"></h2>')

    .text(data['제목'])

    .appendTo($output);

const $chips = $('<div class="idea-chips"></div>');

const keywords = (data['키워드'] || '')

  .split(/[,，#\n]+/)

  .map(tag => tag.trim())

  .filter(Boolean)

  .slice(0, 3);

keywords.forEach(tag => {

  $('<span class="idea-chip"></span>')

    .text('#' + tag)

    .appendTo($chips);

});

$output.append($chips);

  ['아이디어 개요', '주요 기능 및 특징', '기대 효과']

    .forEach((section, index) => {

      if (!data[section]) return;

      const $section = $('<section class="idea-section"></section>');

      $('<h3 class="idea-section-title"></h3>')

        .text(`0${index + 1}. ${section}`)

        .appendTo($section);

      $('<p class="idea-section-body"></p>')

        .text(data[section])

        .appendTo($section);

      $output.append($section);

    });

}

// 프롬프트 입력 및 결과 표시------handlePromptSubmission-----------------------------

const handlePromptSubmission = () => {

  const userInput = $('#prompt-input').val().trim();

  if (!userInput) {

    alert("프롬프트를 입력하세요.");

    return;

  }

  // 질문 번호 기준으로 저장const handlePromptSubmission

  const currentQuestion = $('h2').text().trim();

  // 사용자 입력 저장const alreadyGenerated 

  promptHistory[currentQuestion] = userInput;
$('#prompt-input').prop('readonly', true);

  // 전체 누적 프롬프트 생성

  const fullPrompt = generateFullPrompt();

  // 콘솔 확인용

  console.log("GPT에게 전달되는 전체 프롬프트 ↓↓↓");

  console.log(fullPrompt);

  // 로딩 표시

  $('#result-output').text("...");

  // GPT 호출

  callGPT(fullPrompt, (response) => {

  renderIdeaResult(response);

  gptResponses[currentQuestion] = response;

  // 결과 생성 후 전송 버튼 비활성화updateQuestion(step)

  $('#button-result, #button-result-mobile')

    .prop('disabled', true)

    .css({

      opacity: 0.4,

      cursor: 'not-allowed'

    });

}); // 응답 저장!

};

// 질문 데이터-----------------------------------------

const questionData = [

  {

    h2: 'Q1',

    h3: '생성하고자 하는 아이디어가 <span id="h3-point">필요한 이유</span>는 무엇인가요?',

    desc: '아이디어가 필요한 배경이나 사용자 문제 상황, 해결하고자 하는 니즈(가치)를 설명해주세요.',

    img: './images/undraw1.png',

    example: '청소년들의 스마트폰 과몰입으로 학업 집중력 저하 등의 문제가 발생하고 있다.',

    placeholder: '아이디어가 필요한 이유를 입력해주세요.'

  },

  {

    h2: 'Q2',

    h3: '해당 아이디어가 실현되었을 때 <span id="h3-point">어떤 효과</span>가 있을까요?',

    desc: '결과물이 적용되었을 때 기대할 수 있는 변화나 긍정적인 영향을 작성해주세요.',

    img: './images/undraw2.png',

    example: '스마트폰 사용 시간을 줄여 학업 집중력을 높이고 건강한 생활 습관을 형성할 수 있다.',

    placeholder: '아이디어를 통해 기대하는 효과를 입력해주세요.'

  },

  {

    h2: 'Q3',

    h3: '이 아이디어의 최종 결과물은 <span id="h3-point">어떤 형태</span>로 제공되나요?',

    desc: '제품, 서비스, 시스템 등 결과물이 어떤 모습인지 구체적으로 설명해주세요.',

    img: './images/undraw3.png',

    example: '사용 시간을 관리하고 목표 달성을 도와주는 모바일 애플리케이션 형태로 제공한다.',

    placeholder: '구상하는 아이디어의 형태를 입력해주세요.'

  },

  {

    h2: 'Q4',

    h3: '이 아이디어를 구현하기 위해 필요한 <span id="h3-point">핵심 기술</span>은 무엇인가요?',

    desc: '개발이나 제작 과정에 활용될 기술, 도구, 방법론 등을 작성해주세요.',

    img: './images/undraw4.png',

    example: '사용 패턴 분석을 위한 AI 기술과 스마트폰 사용 시간 추적 기능을 활용한다.',

    placeholder:'아이디어에 활용할 기술을 입력해주세요.'

  },

  {

    h2: 'Q5',

    h3: '실현 과정에서 고려해야 할 <span id="h3-point">제약 조건</span>이 있다면 무엇인가요?',

    desc: '비용, 시간, 인력, 환경적 제약 등 예상되는 제한사항을 작성해주세요.',

    img: './images/undraw5.png',

    example: '개인정보 보호와 사용자별 스마트폰 이용 환경의 차이를 고려해야 한다.',

    placeholder:'아이디어에서 고려해야 할 제약 조건을 입력해주세요.'

  },

  {

    h2: 'Q6',

    h3: '비슷한 <span id="h3-point">사례</span>나 참고할 만한 <span id="h3-point">예시</span>가 있다면 알려주세요.',

    desc: '⚠️ 본 도구는 웹 검색 기능이 포함되어 있지 않아 최신 정보 기반의 응답은 제한될 수 있습니다.',

    img: './images/undraw6.png',

    example: '스크린 타임 관리 앱이나 디지털 디톡스 프로그램을 참고할 수 있다.',

    placeholder: '아이디어 구상에 참고할 예시를 입력해주세요.'

  }

];

//프로그래스 바 -----------------------------------------

let currentStep = 1;

 function updateProgressBar(step) {

  $('.progress-container .step').each(function (index) {

    $(this).removeClass('active completed');

    if (index < step - 1) {

      $(this).addClass('completed');

    } else if (index === step - 1) {

      $(this).addClass('active');

    }

  });

}

function updateQuestion(step) {

  if (step - 1 < questionData.length) {

    const q = questionData[step - 1];

// 다음 질문으로 이동하면 이전 결과 영역 초기화
$('#gpt-output').hide();
$('.rating-container').hide();
$('#result-output').empty();
$('#gpt-placeholder').css('display', 'flex');

    $('h2').text(q.h2);

   
    $('.text-wrapper p').text(q.desc);

    $('#img-step').attr('src', q.img);

    $('#prompt-input').attr('placeholder', q.placeholder);

    $('.example-text').text(q.example);

// 버튼 텍스트 조건부 변경

    if (step === 6) {

      $('#button-next').hide();            

      $('#button-save').show();     

      $('#button-save-mobile').show();  

      $('#button-next-mobile').hide();       

      checkRatingsComplete();

    } else {

      $('#button-next').show();         

  $('#button-save').hide();     

  $('#button-save-mobile').hide();  

  $('#button-next-mobile').show();       

    }

 const questionKey = `Q${step}`;

const alreadyGenerated = !!gptResponses[questionKey];

$('#prompt-input')
  .val(promptHistory[questionKey] || '')
  .prop('readonly', alreadyGenerated);
  
$('#button-result, #button-result-mobile')

  .prop('disabled', alreadyGenerated)

  .css({

    opacity: alreadyGenerated ? 0.4 : 1,

    cursor: alreadyGenerated ? 'not-allowed' : 'pointer'

  });

// 모바일 버튼 처리$('#button-result').on('click', handlePromptSubmission);

if (window.innerWidth <= 768) {

  if (step === 6) {

    $('#button-save-mobile').show();

    $('#button-next-mobile').hide();

  } else {

    $('#button-save-mobile').hide();

    $('#button-next-mobile').show();

  }

}

checkRatingsComplete();

  }

}

// 이전 버튼------------------------------------------------------

$('#button-pre').on('click', function () {

  if (currentStep <= 1) return;

  currentStep--;

  updateProgressBar(currentStep);

  updateQuestion(currentStep);

});

//별점--------------------------------------------------------

let ratingHistory = {

  '예측 가능성': 0,

  '의도일치성': 0,

  '활용가능성': 0,

  '실현 가능성': 0,

  '창의성(혁신+독창)': 0,

  '가치성': 0,

  '명확성': 0,

};

let tempRating = {

  '예측 가능성': 0,

  '의도일치성': 0,

  '활용가능성': 0,

  '실현 가능성': 0,

  '창의성(혁신+독창)': 0,

  '가치성': 0,

  '명확성': 0,

};

let isFinalBlinkingDone = false; // 깜빡임 플래그

// 별점 모두 평가됐는지 확인하는 함수

function checkRatingsComplete() {

  const allRated = Object.values(tempRating).every(score => score > 0);  // ⭐ 여기!

  if (allRated) {

    $('#button-next').prop('disabled', false).css({

      backgroundColor: '#8067E8',

      color: '#fff',

      cursor: 'pointer'

    });

     // 모바일 버튼도 같이

     $('#button-next-mobile').prop('disabled', false).css({

      backgroundColor: '#8067E8',

      color: '#fff',

      cursor: 'pointer'

    });

    // 마지막 단계(Q6)일 때 평가 끝나면 깜빡이게

    if (currentStep === 6 && !isFinalBlinkingDone) {

      $('#button-save').addClass('blinking');

      $('#button-save-mobile').addClass('blinking');

      isFinalBlinkingDone = true;

    }

  } else {

    $('#button-next').prop('disabled', true).css({

      backgroundColor: ' #e7e7e7',

      color: '#A8A8A8',

      cursor: 'not-allowed'

    });

  // 모바일 버튼도 

    $('#button-next-mobile').prop('disabled', true).css({

      backgroundColor: '#e7e7e7',

      color: '#A8A8A8',

      cursor: 'not-allowed'

    });

  }

}

// 초기화 및 별점 클릭 이벤트

$(document).ready(() => {

  $('#button-next').prop('disabled', true).css({

    backgroundColor: '',

    color: '#A8A8A8',

    cursor: 'not-allowed'

  });

  $('.stars').each(function () {

    const $stars = $(this);

    const stars = '★★★★★'.split('');

    $stars.html('');

    stars.forEach((_, i) => {

      $stars.append(`<span data-value="${i + 1}">★</span>`);

    });

    $stars.on('click', 'span', function () {

      const rating = $(this).data('value');

      const $all = $(this).parent().find('span');

      const category = $(this).closest('.rating-category').data('category');

      $all.removeClass('active');

      $all.each(function (index) {

        if (index < rating) $(this).addClass('active');

      });

      tempRating[category] = rating;

      console.log(`${category} 별점: ${rating}점`);

      checkRatingsComplete();

    });

  });

});

$('#button-next').on('click', function () {

  if (!Object.values(tempRating).every(score => score > 0)) {

    alert(" 모든 항목을 평가해 주세요!");

    return;

  }

  if ($(this).prop('disabled')) return;

  if (currentStep >= $('.step').length) return;

  const questionKey = `Q${currentStep}`;

  ratingHistory[questionKey] = {};

  const otherOpinion = $('#rating-input').val().trim();

  if (otherOpinion) {

    ratingHistory[questionKey]['기타 의견'] = otherOpinion;

  }

  // 별점은 여기서 최종 저장

  ratingHistory[questionKey]['별점 평가'] = { ...tempRating };

  console.log(`✅ ${questionKey} 최종 평가 기록 ↓↓↓`);

  console.log(ratingHistory[questionKey]);

 // 마지막 단계일 경우 버튼 애니메이션 부여

  if (currentStep === 6) {

    $('#button-save').addClass('blinking');

    $('#button-save-mobile').addClass('blinking');

  }

  currentStep++;

  updateProgressBar(currentStep);

  updateQuestion(currentStep);

  $('#prompt-input').val('');

  $('#result-output').empty();

  $('.rating-container').hide();

  $('#rating-input').val('');

  $('.stars span').removeClass('active');

  Object.keys(tempRating).forEach(key => {

    tempRating[key] = 0;

  });

  $(this).prop('disabled', true).css({

    backgroundColor: '',

    color: '#A8A8A8',

    cursor: 'not-allowed'

  });

  if (window.innerWidth <= 768) {

    $('main').removeClass('mobile-show-result');

  }

});

$('#button-result').on('click', function () {
$('#gpt-placeholder').hide();

  $('#gpt-output').css('display', 'block');

  handlePromptSubmission();

  // rating-container 보이게

  $('.rating-container').show();

});

$('#button-save').on('click', function () {

  const lastQuestionKey = `Q${currentStep}`;

  if (!ratingHistory[lastQuestionKey]) {

    ratingHistory[lastQuestionKey] = {};

    const otherOpinion = $('#rating-input').val().trim();

    if (otherOpinion) ratingHistory[lastQuestionKey]['기타 의견'] = otherOpinion;

    ratingHistory[lastQuestionKey]['별점 평가'] = { ...tempRating };

  }

  if (window.innerWidth <= 768) {

    $('main').removeClass('mobile-show-result');

  }

  window.saveFullResultsToDB(username, selectedTopic, promptHistory, gptResponses, ratingHistory);

  const rows = [

    [`실험 주제: ${selectedTopic}`],

    [], // 공백 줄

    ['질문 번호', '입력 내용', '예측 가능성', '의도일치성', '활용가능성', '실현 가능성', '창의성', '가치성', '명확성', '기타 의견', 'GPT 응답']

  ];

  // 데이터 정리

  for (let i = 1; i <= 6; i++) {

    const qKey = `Q${i}`;

    const 평가 = ratingHistory[qKey]?.['별점 평가'] || {};

    const 의견 = ratingHistory[qKey]?.['기타 의견'] || '';

    const 입력내용 = promptHistory[qKey] || '';

    const 응답 = gptResponses[qKey] || '';

    rows.push([

      qKey,

      입력내용,

      평가['예측 가능성'] || '',

      평가['의도일치성'] || '',

      평가['활용가능성'] || '',

      평가['실현 가능성'] || '',

      평가['창의성(혁신+독창)'] || '',

      평가['가치성'] || '',

      평가['명확성'] || '',

      의견,

      응답,

    ]);

  }

  const now = new Date();

  const timeStamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '');

  const filename = `아이디어_실험_평가_${timeStamp}.xlsx`;

  XLSX.writeFile(workbook, filename, { cellStyles: true }); // 💡 Pro 필요

});

$('#button-save-mobile').on('click', () => {

  $('#button-save').click(); // 데스크탑 버튼 로직 재활용

});

// // 제출하기 버튼 클릭 시, txt 저장 --------------------------------------

// $('#button-save').on('click', function () {

//   let summary = `⭐ 평가 요약 결과\n\n`;updateQuestion(currentStep);

//   for (let i = 1; i <= 7; i++) {

//     const qKey = `Q${i}`;

//     const 평가 = ratingHistory[qKey]?.['별점 평가'] || {};

//     const 의견 = ratingHistory[qKey]?.['기타 의견'] || '';

//     const 입력내용 = promptHistory[qKey] || '[입력 없음]';

//     const 응답 = gptResponses[qKey] || '[GPT 응답 없음]';

//     summary += `📌 ${qKey} ${입력내용}\n`;

//     for (let 항목 in 평가) {

//       summary += `- ${항목}: ${평가[항목]}점\n`;

//     }

//     if (의견) summary += `💬 기타 의견: ${의견}\n`;

//     if (응답) summary += `💡 GPT 응답:\n${응답}\n`;

//     summary += '\n';

//   }

//   // Blob을 생성해서 다운로드

//   const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });

//   const url = URL.createObjectURL(blob);

//   const a = document.createElement('a');

//   a.href = url;

//   const now = new Date();

//   const timeStamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '');

//   a.download = `아이디어_실험_평가_${timeStamp}.txt`;

//   document.body.appendChild(a);

//   a.click();

//   document.body.removeChild(a);

//   URL.revokeObjectURL(url); 

// });

window.addEventListener("beforeunload", function (e) {

  if (Object.keys(promptHistory).length > 0 || Object.values(tempRating).some(score => score > 0)) {

    e.preventDefault(); // 표준git

    e.returnValue = ""; // Chrome을 위한 설정

  }

});

document.getElementById('button-result').addEventListener('click', () => {

  if (window.innerWidth <= 768) {

    document.querySelector('main').classList.add('mobile-show-result');

  }

});

$('#button-pre-mobile').on('click', () => {

  $('#button-pre').click();

});

$('#button-next-mobile').on('click', () => {

  // 모바일에서 다음 단계 클릭 시 프롬프트 다시 보이게!

  if (window.innerWidth <= 768) {

    $('main').removeClass('mobile-show-result');

  }

  $('#button-next').click();

});

$('#button-result-mobile').on('click', () => {

  $('#button-result').click(); // 기존 전송 로직 재활용

});

$(window).on('resize', function () {

  if (window.innerWidth <= 768) {

    $('#button-key').hide();                   // 키 버튼 숨김

    $('#button-result').hide();                // 데스크탑 전송버튼 숨김

    $('#button-result-mobile').show();         // 모바일 전송버튼 표시

  } else {

    $('#button-key').show();                   // 키 버튼 표시

    $('#button-result').show();                // 데스크탑 전송버튼 표시

    $('#button-result-mobile').hide();         // 모바일 전송버튼 숨김

  }

});

$(document).ready(() => {

  $(window).trigger('resize');

});

function setMainHeight() {

  const vh = window.innerHeight * 0.01;

  document.documentElement.style.setProperty('--vh', `${vh}px`);

}

setMainHeight();

window.addEventListener('resize', setMainHeight);

function downloadAsTxt(filename, content) {

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  // 깔끔하게 제거

  document.body.removeChild(link);

  URL.revokeObjectURL(link.href);

}

updateQuestion(currentStep);

// 새로고침 시 경고창place

window.addEventListener("beforeunload", (event) => {

  event.preventDefault();

  event.returnValue = "";

});

//글자 수 표시

const promptInput = document.getElementById("prompt-input");

const charCount = document.getElementById("char-count");

promptInput.addEventListener("input", () => {

  charCount.textContent = `${promptInput.value.length} / 500`;

});

updateProgressBar(currentStep);

// 드롭다운 열기 / 닫기

$('.participant-btn').on('click', function (e) {

  e.stopPropagation();

  $('.participant-menu').toggleClass('open');

});

// 바깥 클릭 시 닫기

$(document).on('click', function (e) {

  if (!$(e.target).closest('.participant-menu').length) {

    $('.participant-menu').removeClass('open');

  }

});

// ESC 키로 닫기

$(document).on('keydown', function (e) {

  if (e.key === 'Escape') {

    $('.participant-menu').removeClass('open');

  }

});

// 기존 입력값 표시updateQuestion(step$('h3').html(q.h3);

function updateParticipantInfo() {

  $('#participant-name').text(username || '-');

  $('#participant-topic').text(selectedTopic || '-');

}