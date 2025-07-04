import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM 로드됨");
  
  const chatContainer = document.getElementById("chat-container");
  const messageForm = document.getElementById("message-form");
  const userInput = document.getElementById("user-input");
  
  // highlight.js 초기화
  if (typeof hljs !== 'undefined') {
    console.log("highlight.js 로드됨");
    hljs.configure({
      languages: ['java', 'python', 'javascript', 'php', 'cpp', 'csharp', 'sql', 'xml', 'html']
    });
  }
  
  // 마크다운 라이브러리 설정 (highlight.js 연동)
  if (typeof marked !== 'undefined') {
    console.log("marked 라이브러리 로드됨");
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
      pedantic: false,
      sanitize: false,
      // highlight.js와 연동
      highlight: function (code, lang) {
        if (hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
  } else {
    console.error("마크다운 라이브러리가 로드되지 않았습니다!");
  }

  // Create a message bubble
  function createMessageBubble(content, sender = "user") {
    const wrapper = document.createElement("div");
    wrapper.classList.add("mb-6", "flex", "items-start", "space-x-3");

    // Avatar
    const avatar = document.createElement("div");
    avatar.classList.add(
      "w-10", "h-10", "rounded-full", "flex-shrink-0", "flex",
      "items-center", "justify-center", "font-bold", "text-white"
    );

    if (sender === "assistant") {
      avatar.classList.add("bg-gradient-to-br", "from-green-400", "to-green-600");
      avatar.textContent = "A";
    } else {
      avatar.classList.add("bg-gradient-to-br", "from-blue-500", "to-blue-700");
      avatar.textContent = "U";
    }

    // Bubble
    const bubble = document.createElement("div");
    bubble.classList.add(
      "max-w-full", "md:max-w-2xl", "p-3", "rounded-lg",
      "leading-relaxed", "shadow-sm"
    );

    if (sender === "assistant") {
      bubble.classList.add("bg-gray-200", "text-gray-900", "markdown-content");
      
      try {
        console.log("=== 마크다운 처리 시작 ===");
        console.log("응답 내용 (처음 100자):", content.substring(0, 100));
        
        if (typeof marked === 'undefined') {
          console.error("marked 라이브러리가 로드되지 않음!");
          bubble.style.whiteSpace = "pre-wrap";
          bubble.textContent = content;
        } else {
          // 마크다운 변환 (코드 하이라이팅 포함)
          const renderedHtml = marked.parse(content);
          console.log("변환된 HTML (처음 100자):", renderedHtml.substring(0, 100));
          bubble.innerHTML = renderedHtml;
          
          // 새로 생성된 코드 블록에 추가 하이라이팅 적용 (보험용)
          if (typeof hljs !== 'undefined') {
            const codeBlocks = bubble.querySelectorAll('pre code:not(.hljs)');
            codeBlocks.forEach(block => {
              console.log("추가 하이라이팅 적용");
              hljs.highlightElement(block);
            });
          }
          
          console.log("마크다운 변환 및 하이라이팅 성공!");
        }
      } catch (error) {
        console.error("마크다운 변환 실패:", error);
        bubble.style.whiteSpace = "pre-wrap";
        bubble.textContent = content;
      }
      console.log("=== 마크다운 처리 완료 ===");
    } else {
      bubble.classList.add("bg-blue-600", "text-white");
      bubble.style.whiteSpace = "pre-wrap";
      bubble.classList.add("font-mono");
      bubble.textContent = content;
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    return wrapper;
  }

  // Scroll to bottom
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Fetch assistant response from FastAPI backend
  async function getAssistantResponse(userMessage) {
    console.log("API 요청 시작");
    const url = `${process.env.API_ENDPOINT}/ask`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: userMessage }),
      });

      console.log("API 응답 상태:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("응답 데이터 받음");
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.response;
    } catch (error) {
      console.error("API 요청 중 오류:", error);
      throw error;
    }
  }

  // Handle form submission
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("폼 제출됨");
    
    const message = userInput.value.trim();
    if (!message) {
      console.log("메시지가 비어있음");
      return;
    }

    console.log("전송할 메시지:", message.substring(0, 50) + "...");

    // User message
    chatContainer.appendChild(createMessageBubble(message, "user"));
    userInput.value = "";
    scrollToBottom();

    // Show loading indicator
    const loadingMessage = createMessageBubble("분석 중...", "assistant");
    chatContainer.appendChild(loadingMessage);
    scrollToBottom();

    // Assistant response
    try {
      console.log("응답 요청 중...");
      const response = await getAssistantResponse(message);
      console.log("응답 받음 (처음 50자):", response.substring(0, 50) + "...");
      
      // Remove loading message
      chatContainer.removeChild(loadingMessage);
      
      // Add actual response
      const responseBubble = createMessageBubble(response, "assistant");
      chatContainer.appendChild(responseBubble);
      scrollToBottom();
      
    } catch (error) {
      console.error("응답 가져오기 실패:", error);
      
      // Remove loading message
      if (chatContainer.contains(loadingMessage)) {
        chatContainer.removeChild(loadingMessage);
      }
      
      // Add error message
      chatContainer.appendChild(
        createMessageBubble(
          `오류가 발생했습니다: ${error.message}`,
          "assistant"
        )
      );
      scrollToBottom();
    }
  });

  // Enter로 전송, Shift+Enter로 줄바꿈
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      messageForm.dispatchEvent(new Event("submit"));
    }
  });

  // 초기 메시지 표시
  setTimeout(() => {
    chatContainer.appendChild(
      createMessageBubble(
        "안녕하세요! 시큐어 코딩 챗봇입니다. 분석할 코드를 입력하거나 보안 관련 질문을 해주세요."
      )
    );
    scrollToBottom();
  }, 300);

  // 마크다운 입력 → HTML 변환 → 코드 하이라이팅 적용 함수
  function addCopyButtons() {
    document.querySelectorAll('#output pre').forEach((pre) => {
      // 이미 버튼이 있으면 중복 추가하지 않음
      if (pre.querySelector('.copy-btn')) return;

      const button = document.createElement('button');
      button.textContent = '복사';
      button.className = 'copy-btn';
      button.style.position = 'absolute';
      button.style.top = '8px';
      button.style.right = '8px';
      button.style.zIndex = '10';
      button.style.fontSize = '0.9em';

      // pre를 relative로 만들어야 버튼이 올바른 위치에 표시됨
      pre.style.position = 'relative';

      button.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.innerText).then(() => {
            button.textContent = '복사됨!';
            setTimeout(() => (button.textContent = '복사'), 1000);
          });
        }
      });

      pre.appendChild(button);
    });
  }

  function renderMarkdown(markdownText) {
    const html = marked(markdownText);
    const output = document.getElementById("output");
    output.innerHTML = html;
    document.querySelectorAll("#output pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
    addCopyButtons(); // 복사 버튼 추가
  }

  // textarea에서 마크다운 입력받아 렌더링
  const mdInput = document.getElementById("markdown-input");
  if (mdInput) {
    mdInput.addEventListener("input", (e) => {
      renderMarkdown(e.target.value);
    });
    // 페이지 로드시 초기 렌더링
    renderMarkdown(mdInput.value);
  }
});
