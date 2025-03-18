let currentQuestionIndex = 0;
let answers = {};
let startTime;
let questionList = [];
let imageSequence = [];
let imageCache = {};

// **참가자 정보 불러오기**
const participantInfo = JSON.parse(localStorage.getItem("participantInfo")) || {};

// **초기화 함수**
document.addEventListener("DOMContentLoaded", function() {
    // JSON 파일에서 이미지 목록 로드
    fetch("images.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                throw new Error("Images data is empty or invalid");
            }
            console.log("Successfully loaded images.json:", data);
            imageSequence = data;
            generateQuestions();
            initializeExperiment();
        })
        .catch(error => {
            console.error("Error loading images.json:", error);
            alert(`Failed to load experiment data: ${error.message}. Please refresh the page and try again.`);
        });
});

// **질문 리스트 생성 함수**
function generateQuestions() {
    if (!imageSequence || imageSequence.length === 0) {
        console.error("Image sequence is empty or undefined");
        return;
    }
    
    // 각 이미지에 대해 3개의 질문 생성
    imageSequence.forEach((img, imgIndex) => {
        // Likert 척도 질문 추가 (실사감)
        questionList.push({
            render: img.render,
            object: img.object,
            num: img.num,
            question: "How realistic does this image look?",
            required: true,
            type: "likert",
            scale: 5,
            labels: ["Not realistic at all", "Extremely realistic"],
            imageIndex: imgIndex
        });
        
        // 텍스트 질문 1 (두드러지는 특징)
        questionList.push({
            render: img.render,
            object: img.object,
            num: img.num,
            question: "What details stand out the most?",
            required: true,
            type: "text",
            imageIndex: imgIndex
        });
        
        // 텍스트 질문 2 (개선점)
        questionList.push({
            render: img.render,
            object: img.object,
            num: img.num,
            question: "What could be improved?",
            required: false,
            type: "text",
            imageIndex: imgIndex
        });
    });
    
    console.log(`Generated ${questionList.length} questions from ${imageSequence.length} images`);
}

// **실험 초기화 함수**
function initializeExperiment() {
    if (questionList.length === 0) {
        console.error("No questions generated");
        return;
    }
    
    updateFrame(); // 첫 번째 이미지 로드
    updateQuestion(); // 첫 번째 질문 로드
    startTime = Date.now(); // 시간 측정 시작
}

// **현재 질문 업데이트 함수** - 이전 답변 복원 로직 추가
function updateQuestion() {
    const questionContainer = document.querySelector(".question-container");
    if (!questionContainer) {
        console.error("Question container not found");
        return;
    }
    
    // 질문 컨테이너 초기화
    questionContainer.innerHTML = "";
    
    if (currentQuestionIndex >= questionList.length) {
        // 모든 질문이 끝났을 때
        showSubmitButton();
        return;
    }
    
    // 현재 질문 데이터
    const questionData = questionList[currentQuestionIndex];
    
    // 질문 요소 생성
    const questionElement = document.createElement("div");
    questionElement.classList.add("question", "active");
    questionElement.setAttribute("data-question", `q${currentQuestionIndex}`);
    questionElement.setAttribute("data-object", questionData.object);
    questionElement.setAttribute("data-render", questionData.render);
    
    // 이미지 정보를 표시하지 않고 질문만 표시
    const neutralIdentifier = `Object ${questionData.imageIndex + 1}`;
    const questionHeader = `
        <label>${neutralIdentifier}: ${questionData.question} 
            ${questionData.required ? "<span style='color:red;'>* Required</span>" : ""}
        </label><br>
    `;
        
    // 질문 유형에 따른 입력 필드 생성
    let inputField = "";
    
    if (questionData.type === "text") {
        // 텍스트 입력 필드
        inputField = `<textarea ${questionData.required ? "required" : ""}></textarea>`;
    } 
    else if (questionData.type === "likert") {
        // Likert 척도
        const scale = questionData.scale || 5;
        const labels = questionData.labels || ["Not at all", "Extremely"];
        
        inputField = `
            <div class="likert-scale">
                <span class="likert-label">${labels[0]}</span>
                <div class="likert-options">
        `;
        
        for (let i = 1; i <= scale; i++) {
            inputField += `
                <label class="likert-option">
                    <input type="radio" name="q${currentQuestionIndex}" value="${i}" ${questionData.required ? "required" : ""}>
                    <span>${i}</span>
                </label>
            `;
        }
        
        inputField += `
                </div>
                <span class="likert-label">${labels[1]}</span>
            </div>
        `;
    }
    
    // 네비게이션 버튼
    const navigationButtons = `
        <div class="navigation-buttons">
            ${currentQuestionIndex > 0 ? '<button onclick="prevQuestion()">Previous</button>' : ''}
            <button onclick="nextQuestion()">Next</button>
        </div>
    `;
    
    // 전체 질문 요소 구성 - 이미지 정보 없이
    questionElement.innerHTML = questionHeader + inputField + navigationButtons;
    questionContainer.appendChild(questionElement);
    
    // 저장된 답변이 있으면 복원
    restoreSavedAnswer();
    
    // 진행률 표시줄 업데이트
    updateProgressBar();
}

// **progress bar 업데이트**
function updateProgressBar() {
    const progressBar = document.getElementById("progress-bar");
    if (!progressBar) {
        console.error("Progress bar element not found!");
        return;
    }
    
    // 전체 질문 수에 대한 현재 진행률 계산
    const progress = ((currentQuestionIndex + 1) / questionList.length) * 100;
    progressBar.style.width = progress + "%";
    console.log(`Progress: ${progress.toFixed(1)}% (Question ${currentQuestionIndex + 1}/${questionList.length})`);
}

// **현재 이미지 업데이트**
function updateFrame() {
    if (currentQuestionIndex >= questionList.length) {
        console.error("Cannot update frame: question index out of bounds");
        return;
    }
    
    // 현재 질문의 이미지 정보
    const questionData = questionList[currentQuestionIndex];
    const { render, object, num } = questionData;
    
    // 슬라이더와 이미지 요소
    const frameSlider = document.getElementById("frame-slider");
    const imageFrame = document.getElementById("image-frame");
    
    if (!frameSlider || !imageFrame) {
        console.error("Frame slider or image frame element not found");
        return;
    }
    
    // 슬라이더 값을 기반으로 이미지 경로 생성
    const frame = frameSlider.value;
    const imagePath = `images/${render}/${object}/N${num}M100/r_${frame}.png`;
    
    // 이미지 로드
    imageFrame.src = imagePath;
    
    // 이미지 프리로딩 (옵션)
    preloadAdjacentFrames(render, object, num, parseInt(frame));
    
    console.log(`Loading image: ${imagePath}`);
}

// **이미지 프리로딩 함수**
function preloadAdjacentFrames(render, object, num, currentFrame) {
    const framesToPreload = [1, 5, 10, 15, 20]; // 미리 로드할 프레임
    
    framesToPreload.forEach(offset => {
        const nextFrame = currentFrame + offset;
        if (nextFrame <= 100) { // 최대 100 프레임까지만
            const imagePath = `images/${render}/${object}/N${num}M100/r_${nextFrame}.png`;
            
            if (!imageCache[imagePath]) {
                imageCache[imagePath] = new Image();
                imageCache[imagePath].src = imagePath;
            }
        }
    });
}

// **필수 질문 확인 함수**
function validateRequiredQuestions() {
    if (currentQuestionIndex >= questionList.length) {
        return true; // 이미 모든 질문이 끝났으면 true
    }
    
    const questionData = questionList[currentQuestionIndex];
    
    if (questionData.required) {
        const activeQuestion = document.querySelector(".question.active");
        if (!activeQuestion) {
            console.error("Active question element not found");
            return false;
        }
        
        if (questionData.type === "text") {
            const textarea = activeQuestion.querySelector("textarea");
            if (!textarea || textarea.value.trim() === "") {
                alert("Please answer the required text question before proceeding.");
                return false;
            }
        } 
        else if (questionData.type === "likert") {
            const checked = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            if (!checked) {
                alert("Please select an option for the required question.");
                return false;
            }
        }
    }
    
    return true;
}

// **이전 질문으로 이동** - 이전 답변 복원 기능 추가
function prevQuestion() {
    if (currentQuestionIndex <= 0) return;
    
    // 현재 질문 답변 저장 (뒤로 갔다가 다시 돌아올 때를 위해)
    saveCurrentAnswer();
    
    // 이전 질문으로 이동
    currentQuestionIndex--;
    startTime = Date.now();
    
    // 이전 질문 표시
    updateQuestion();
    
    // 이미지가 변경되었는지 확인하고 업데이트
    const prevImageIndex = questionList[currentQuestionIndex].imageIndex;
    if (currentQuestionIndex > 0 && prevImageIndex !== questionList[currentQuestionIndex - 1].imageIndex) {
        updateFrame();
    }
    
    // 이전에 저장된 답변 복원
    restoreSavedAnswer();
}

// **다음 질문으로 이동**
function nextQuestion() {
    if (!validateRequiredQuestions()) return;
    
    // 현재 질문 응답 저장
    saveCurrentAnswer();
    
    // 현재 오브젝트 정보 저장
    const currentImageIndex = questionList[currentQuestionIndex].imageIndex;
    
    // 다음 질문으로 이동
    currentQuestionIndex++;
    startTime = Date.now();
    
    // 실험이 끝났는지 확인
    if (currentQuestionIndex >= questionList.length) {
        showSubmitButton();
        return;
    }
    
    // 새로운 질문 표시
    updateQuestion();
    
    // 이미지가 변경되었는지 확인하고 업데이트
    const newImageIndex = questionList[currentQuestionIndex].imageIndex;
    if (newImageIndex !== currentImageIndex) {
        // 프레임 슬라이더 초기화
        const frameSlider = document.getElementById("frame-slider");
        if (frameSlider) {
            frameSlider.value = 0;
        }
        
        // 새 이미지 업데이트
        updateFrame();
    }
}

// **현재 질문 응답 저장**
function saveCurrentAnswer() {
    const timeSpent = Date.now() - startTime;
    const activeQuestion = document.querySelector(".question.active");
    const questionData = questionList[currentQuestionIndex];
    
    if (!activeQuestion) return;
    
    let value = "";
    
    if (questionData.type === "text") {
        const textarea = activeQuestion.querySelector("textarea");
        if (textarea) {
            value = textarea.value;
        }
    } 
    else if (questionData.type === "likert") {
        const checked = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (checked) {
            value = checked.value;
        }
    }
    
    answers[`q${currentQuestionIndex}`] = {
        render: questionData.render,
        object: questionData.object,
        num: questionData.num,
        question: questionData.question,
        value: value,
        timeSpent: timeSpent
    };
}

// **저장된 답변 복원 함수**
function restoreSavedAnswer() {
    const questionKey = `q${currentQuestionIndex}`;
    const savedAnswer = answers[questionKey];
    
    if (!savedAnswer) return; // 저장된 답변이 없으면 리턴
    
    const activeQuestion = document.querySelector(".question.active");
    if (!activeQuestion) return;
    
    const questionData = questionList[currentQuestionIndex];
    
    // 질문 유형에 따라 다르게 처리
    if (questionData.type === "text") {
        const textarea = activeQuestion.querySelector("textarea");
        if (textarea && savedAnswer.value) {
            textarea.value = savedAnswer.value;
        }
    } 
    else if (questionData.type === "likert") {
        const radioButtons = activeQuestion.querySelectorAll(`input[name="q${currentQuestionIndex}"]`);
        if (radioButtons.length > 0 && savedAnswer.value) {
            // 저장된 값과 일치하는 라디오 버튼 찾기
            radioButtons.forEach(radio => {
                if (radio.value === savedAnswer.value) {
                    radio.checked = true;
                }
            });
        }
    }
}

// **제출 버튼 표시**
function showSubmitButton() {
    const experimentContainer = document.querySelector(".experiment-container");
    const submitContainer = document.querySelector(".submit-container");
    
    if (experimentContainer) {
        experimentContainer.style.display = "none";
    }
    
    if (submitContainer) {
        submitContainer.style.display = "block";
    } else {
        // 제출 컨테이너가 없는 경우, 동적으로 생성
        const container = document.createElement("div");
        container.className = "submit-container";
        container.innerHTML = `
            <h2>Experiment Completed</h2>
            <p>Thank you for your participation!</p>
            <button onclick="submitAnswers()">Submit</button>
        `;
        document.body.appendChild(container);
    }
    
    updateProgressBar(); // 100% 진행률 표시
}

// **답변 제출 및 저장**
function submitAnswers() {
    const finalData = {
        participantInfo: participantInfo,
        responses: answers,
        completedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem("surveyAnswers", JSON.stringify(finalData));
        console.log("Answers saved successfully:", finalData);
        alert("Thank you for your participation! Your answers have been saved.");
        window.location.href = "end.html";
    } catch (error) {
        console.error("Error saving answers:", error);
        alert("There was a problem saving your answers. Please try again.");
    }
}
