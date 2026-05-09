// 모듈 패턴을 적용하여 UI와 데이터를 분리합니다.

/**
 * 포트폴리오(스토리) 데이터를 로드하고 관리하는 클래스
 */
class StoryData {
    constructor() {
        this.data = null;
    }

    async loadData() {
        try {
            const response = await fetch('js/data.json');
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error("JSON 데이터를 불러오는 데 실패했습니다. 기본 데이터를 사용합니다.", error);
            // 에러 시 폴백(Fallback) 데이터 제공
            this.data = {
                "pages": [
                    {
                        "id": "hero",
                        "sentences": [
                            { "id": "1", "text": "안녕! 나는 에너제틱한 웹 디자이너야." },
                            { "id": "2", "text": "오렌지처럼 상큼한 디자인을 만들지!" }
                        ]
                    },
                    {
                        "id": "about",
                        "sentences": [
                            { "id": "3", "text": "나의 이야기" },
                            { "id": "4", "text": "재미있는 애니메이션과 밝은 색상으로 멋진 포트폴리오를 만들고 있어." }
                        ]
                    },
                    {
                        "id": "cta",
                        "sentences": [
                            { "id": "5", "text": "함께 이야기할까?" },
                            { "id": "6", "text": "소셜 미디어에서 나를 만나봐!" }
                        ]
                    }
                ]
            };
            return this.data;
        }
    }
}

/**
 * UI 렌더링 및 페이지 전환(애니메이션)을 관리하는 클래스
 */
class UIManager {
    constructor() {
        this.sections = Array.from(document.querySelectorAll('.page-section'));
        this.currentIndex = 0;
    }

    // JSON 데이터를 HTML 요소에 주입 (<span>으로 문장 분리하여 TTS 하이라이트 대비)
    renderContent(pagesData) {
        pagesData.forEach(page => {
            page.sentences.forEach(sentence => {
                const el = document.querySelector(`[data-sentence="${sentence.id}"]`);
                if (el) {
                    el.innerHTML = `<span class="sentence-span" data-id="${sentence.id}">${sentence.text}</span>`;
                }
            });
        });
        // 렌더링 직후 첫 페이지이므로 이전 버튼 숨김 처리 초기화
        this.updateNavButtons();
    }

    // 페이지 넘김 애니메이션 (클래스 토글)
    goToPage(index) {
        if (index < 0 || index >= this.sections.length) return;
        
        this.sections.forEach((sec, i) => {
            sec.classList.remove('active', 'previous');
            if (i < index) {
                sec.classList.add('previous');
            } else if (i === index) {
                sec.classList.add('active');
            }
        });
        this.currentIndex = index;
        
        // 페이지가 바뀔 때마다 버튼 노출 여부 업데이트
        this.updateNavButtons();
    }

    // 현재 페이지 위치에 따라 이전/다음 버튼을 숨기거나 보여줌
    updateNavButtons() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            // 첫 페이지(0)일 때는 이전 버튼 숨김
            prevBtn.style.display = this.currentIndex === 0 ? 'none' : 'inline-block';
        }
        
        if (nextBtn) {
            // 마지막 페이지일 때는 다음 버튼 숨김
            nextBtn.style.display = this.currentIndex === this.sections.length - 1 ? 'none' : 'inline-block';
        }
    }

    nextPage() {
        if (this.currentIndex < this.sections.length - 1) {
            this.goToPage(this.currentIndex + 1);
        }
    }

    prevPage() {
        if (this.currentIndex > 0) {
            this.goToPage(this.currentIndex - 1);
        }
    }

    // 하이라이트 효과 켜기/끄기
    highlightSentence(sentenceId, isHighlight) {
        const span = document.querySelector(`.sentence-span[data-id="${sentenceId}"]`);
        if (span) {
            if (isHighlight) {
                span.classList.add('highlight');
            } else {
                span.classList.remove('highlight');
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.sentence-span').forEach(span => {
            span.classList.remove('highlight');
        });
    }
}

/**
 * 음성 재생(TTS) 관련 로직을 관리하는 클래스
 * 브라우저 기계음을 피하기 위해, 실제 녹음된 음성 파일(audio/문장ID.wav)을 우선 재생합니다.
 */
class TTSManager {
    constructor(uiManager, pagesData) {
        this.uiManager = uiManager;
        this.pagesData = pagesData;
        this.currentAudio = null;
        this.synth = window.speechSynthesis;
        this.isPlaying = false; // 재생 상태 관리
    }

    playCurrentPage(pageIndex) {
        this.stop(); 
        const pageData = this.pagesData[pageIndex];
        if (!pageData) return;

        this.isPlaying = true;
        let sentenceIndex = 0;

        const playNextSentence = () => {
            if (!this.isPlaying) return; // 정지된 경우 중단
            if (sentenceIndex >= pageData.sentences.length) {
                this.uiManager.clearHighlights();
                this.isPlaying = false;
                return;
            }

            const sentence = pageData.sentences[sentenceIndex];
            this.uiManager.clearHighlights();
            this.uiManager.highlightSentence(sentence.id, true);

            // 1순위: 로컬 audio/id.wav 파일 시도
            const localAudioPath = `audio/${sentence.id}.wav`;
            this.playAudioSource(localAudioPath, () => {
                sentenceIndex++;
                playNextSentence();
            }, () => {
                // 로컬 파일 실패 시 2순위: 구글 클라우드 온라인 음성 시도
                if (!this.isPlaying) return;
                const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(sentence.text)}`;
                this.playAudioSource(googleUrl, () => {
                    sentenceIndex++;
                    playNextSentence();
                }, () => {
                    // 온라인 음성마저 실패 시 3순위: 브라우저 기본 TTS 폴백
                    if (!this.isPlaying) return;
                    this.fallbackSpeech(sentence.text, () => {
                        sentenceIndex++;
                        playNextSentence();
                    });
                });
            });
        };

        playNextSentence();
    }

    // 오디오 파일(로컬 또는 온라인)을 재생하고 중복 콜백을 방지하는 유틸리티 메서드
    playAudioSource(src, onSuccess, onError) {
        if (!this.isPlaying) return;
        this.currentAudio = new Audio(src);
        
        let handled = false; // 중복 실행 방지 플래그

        this.currentAudio.onended = () => {
            if (handled) return;
            handled = true;
            onSuccess();
        };

        this.currentAudio.onerror = () => {
            if (handled) return;
            handled = true;
            onError();
        };

        this.currentAudio.play().catch(e => {
            if (handled) return;
            handled = true;
            onError();
        });
    }

    // 최후의 수단: 브라우저 기본 TTS
    fallbackSpeech(text, callback) {
        if (!this.isPlaying) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9; 
        utterance.pitch = 0.7; // 피치를 낮춰서 어색함 방지

        const voices = this.synth.getVoices();
        if (voices.length > 0) {
            const koreanVoices = voices.filter(v => v.lang.includes('ko'));
            let bestVoice = koreanVoices.find(v => v.name.includes('SunHi') && v.name.includes('Online'));
            if (!bestVoice) bestVoice = koreanVoices.find(v => v.name.includes('Google'));
            if (bestVoice) utterance.voice = bestVoice;
        }

        let handled = false;
        utterance.onend = () => {
            if (handled) return;
            handled = true;
            callback();
        };
        utterance.onerror = () => {
            if (handled) return;
            handled = true;
            callback();
        };

        this.synth.speak(utterance);
    }

    stop() {
        this.isPlaying = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio.removeAttribute('src'); // 메모리 누수 방지
            this.currentAudio = null;
        }
        this.synth.cancel();
        this.uiManager.clearHighlights();
    }
}

/**
 * 애플리케이션 초기화 및 이벤트 바인딩
 */
document.addEventListener('DOMContentLoaded', async () => {
    const storyData = new StoryData();
    const data = await storyData.loadData();
    
    const uiManager = new UIManager();
    uiManager.renderContent(data.pages);

    const ttsManager = new TTSManager(uiManager, data.pages);

    // 이벤트 리스너 등록: 다음/이전 페이지 버튼
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');

    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            ttsManager.stop();
            uiManager.nextPage();
        });
    }

    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            ttsManager.stop();
            uiManager.prevPage();
        });
    }

    // 이벤트 리스너 등록: TTS 재생/정지 버튼
    const playTtsBtn = document.getElementById('play-tts');
    const stopTtsBtn = document.getElementById('stop-tts');

    if(playTtsBtn) {
        playTtsBtn.addEventListener('click', () => {
            ttsManager.playCurrentPage(uiManager.currentIndex);
        });
    }

    if(stopTtsBtn) {
        stopTtsBtn.addEventListener('click', () => {
            ttsManager.stop();
        });
    }

    // 네비게이션 링크 클릭 시 페이지 이동
    document.querySelectorAll('.nav-links a').forEach((link, idx) => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href').replace('#', '');
            // 페이지 넘김 버튼과 싱크를 맞추기 위해 인덱스로 이동
            e.preventDefault();
            ttsManager.stop();
            uiManager.goToPage(idx);
        });
    });

    // 상담 모달(팝업) 제어 로직
    const consultBtn = document.querySelector('a[aria-label="상담 및 요구사항"]');
    const modal = document.getElementById('consultModal');
    const closeModal = document.querySelector('.close-modal');
    const consultForm = document.getElementById('consultForm');

    if (consultBtn && modal) {
        // 모달 열기
        consultBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
        });

        // X 버튼으로 모달 닫기
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 모달 밖(배경) 클릭 시 모달 닫기
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // 폼 제출 이벤트
        if (consultForm) {
            consultForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // 사용자가 선택한 상품 텍스트 가져오기
                const productSelect = document.getElementById('userProduct');
                const productText = productSelect.options[productSelect.selectedIndex].text;

                // 폼 데이터 수집
                const formData = {
                    date: new Date().toLocaleString('ko-KR'),
                    name: document.getElementById('userName').value,
                    email: document.getElementById('userEmail').value,
                    phone: document.getElementById('userPhone').value,
                    product: productText
                };

                // 로컬 스토리지에 데이터 저장
                let requests = JSON.parse(localStorage.getItem('consultRequests') || '[]');
                requests.push(formData);
                localStorage.setItem('consultRequests', JSON.stringify(requests));

                alert('상담 신청이 성공적으로 접수되었습니다. 곧 연락드리겠습니다!');
                modal.style.display = 'none';
                consultForm.reset();
            });
        }
    }
});
