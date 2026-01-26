let refinedText = '';

// Waitlist Modal
function openWaitlistModal() {
    document.getElementById('waitlistModal').classList.add('active');
}

function closeWaitlistModal() {
    document.getElementById('waitlistModal').classList.remove('active');
    document.getElementById('waitlistSuccess').style.display = 'none';
}

async function submitWaitlist() {
    const name = document.getElementById('waitlistName').value.trim();
    const mail = document.getElementById('waitlistEmail').value.trim();

    if (!name || !mail) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mail })
        });

        if (response.ok) {
            document.getElementById('waitlistSuccess').style.display = 'block';
            document.getElementById('waitlistName').value = '';
            document.getElementById('waitlistEmail').value = '';
            setTimeout(() => {
                closeWaitlistModal();
            }, 3000);
        }
    } catch (error) {
        alert('Failed to submit. Please try again.');
    }
}

// Refine Modal
async function openRefineModal() {
    const text = document.getElementById('query').value.trim();

    if (!text) {
        alert('Please enter some text first');
        return;
    }

    document.getElementById('originalText').textContent = text;
    document.getElementById('refinedText').textContent = 'Processing...';
    document.getElementById('refineModal').classList.add('active');

    try {
        const response = await fetch('/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Text: text })
        });

        const data = await response.json();

        if (data.status === 'success') {
            refinedText = data.Text;
            document.getElementById('refinedText').textContent = data.Text;
        } else {
            document.getElementById('refinedText').textContent = 'Error refining text';
        }
    } catch (error) {
        document.getElementById('refinedText').textContent = 'Error: ' + error.message;
    }
}

function closeRefineModal() {
    document.getElementById('refineModal').classList.remove('active');
}

function applyRefined() {
    if (refinedText) {
        document.getElementById('query').value = refinedText;
        closeRefineModal();
    }
}

function keepOriginal() {
    closeRefineModal();
}

// Voice Input
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice input is not supported in your browser');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn.innerHTML = '<span class="material-symbols-outlined">stop_circle</span> Listening...';
    voiceBtn.disabled = true;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('query').value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert('Voice input error: ' + event.error);
    };

    recognition.onend = () => {
        voiceBtn.innerHTML = '<span class="material-symbols-outlined">mic</span> Speak';
        voiceBtn.disabled = false;
    };

    recognition.start();
}

// Analyze Query
async function analyzeQuery() {
    const query = document.getElementById('query').value.trim();

    if (!query) {
        alert('Please enter a question');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('analyzeBtn').disabled = true;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.message || 'Analysis failed');
        }

        displayResults(data);

    } catch (error) {
        const errorDiv = document.getElementById('error');
        errorDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('analyzeBtn').disabled = false;
    }
}

function displayResults(data) {
    // Atomic questions
    const questionsDiv = document.getElementById('atomicQuestions');
    questionsDiv.innerHTML = data.atomic_decomposition.map((q, i) => `
                <div class="atomic-question">
                    <div class="question-header">
                        <span class="question-number">${i + 1}</span>
                        <span class="question-text">${q}</span>
                    </div>
                </div>
            `).join('');

    // Atomic reasoning
    const reasoningDiv = document.getElementById('atomicReasoning');
    reasoningDiv.innerHTML = data.atomic_reasoning.map((item, i) => `
                <div class="atomic-question">
                    <div class="question-header">
                        <span class="question-number">${i + 1}</span>
                        <span class="question-text">${item.question}</span>
                    </div>
                    <div class="answer-text">${item.answer.replace(/\*\*(.+?)\*\*/g, '<span class="highlight">$1</span>')}</div>
                </div>
            `).join('');

    // Synthesis with **text** highlighting
    let synthesisText = data.synthesis;
    synthesisText = synthesisText.replace(/\*\*(.+?)\*\*/g, '<span class="highlight">$1</span>');
    document.getElementById('synthesis').innerHTML = synthesisText;

    // Insights
    const insightsDiv = document.getElementById('insights');
    insightsDiv.innerHTML = data.key_insights.map(insight => `
                <li class="insight-item">
                    <span class="material-symbols-outlined">arrow_forward</span>
                    <span>${insight}</span>
                </li>
            `).join('');

    document.getElementById('results').style.display = 'block';
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}