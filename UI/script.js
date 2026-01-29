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

const loadingMessages = [
    "Processing Complex Question...",
    "Performing Atomic Decomposition...",
    "Solving Atomic Questions...",
    "Synthesizing Results...",
    "Generating Insights..."
];

let loadingIndex = 0;
let loadingInterval = null;

function startLoadingText() {
    const textEl = document.getElementById("loadingText");
    loadingIndex = 0;

    loadingInterval = setInterval(() => {
        textEl.textContent = loadingMessages[loadingIndex];
        loadingIndex = (loadingIndex + 1) % loadingMessages.length;
    }, 2100);
}

function stopLoadingText() {
    const textEl = document.getElementById("loadingText");
    textEl.textContent = "Generating Insights...";
    clearInterval(loadingInterval);
    loadingInterval = null;
}

// Analyze Query
async function analyzeQuery() {
    const query = document.getElementById('query').value.trim();

    if (!query) {
        alert('Please enter a question');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    startLoadingText();

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
        stopLoadingText();
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

    // Synthesis with text highlighting
    let synthesisText = data.synthesis;
    synthesisText = synthesisText.replace(/\*\*(.+?)\*\*/g, '<br><span class="highlight">$1</span>');
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

// Export Results as PDF using jsPDF
function exportResults() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Helper function to add new page if needed
    function checkPageBreak(neededSpace) {
        if (y + neededSpace > pageHeight - 30) {
            doc.addPage();
            y = margin;
            return true;
        }
        return false;
    }

    // Helper function to draw header
    function drawHeader() {
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(margin, 15, pageWidth - margin, 15);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('ALPHA: Atomic Reasoning System', pageWidth / 2, 10, { align: 'center' });
    }

    // Helper function to draw footer
    function drawFooter() {
        const footerY = pageHeight - 15;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.setTextColor(100, 100, 100);
        const date = new Date().toLocaleString();
        doc.text(`© ALPHA | Generated on ${date}`, pageWidth / 2, footerY, { align: 'center' });
    }

    // Draw initial header and footer
    drawHeader();
    drawFooter();

    // Start content below header
    y = 25;

    // Title Section
    doc.setFontSize(18);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Atomic Reasoning Analysis', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Original Question
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('QUESTION:', margin, y);
    y += 8;

    const query = document.getElementById('query').value.trim();
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    const qLines = doc.splitTextToSize(query, contentWidth);
    qLines.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 6;
    });
    y += 8;

    // Atomic Decomposition
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Atomic Questions', margin, y);
    y += 8;

    const atomicQuestions = Array.from(document.querySelectorAll('#atomicQuestions .question-text'));
    atomicQuestions.forEach((el, i) => {
        checkPageBreak(15);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`${i + 1}.`, margin, y);
        
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(el.textContent, contentWidth - 10);
        lines.forEach(line => {
            doc.text(line, margin + 8, y);
            y += 5;
        });
        y += 3;
    });

    y += 5;

    // Atomic Reasoning
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Atomic Reasoning', margin, y);
    y += 8;

    const reasoningItems = Array.from(document.querySelectorAll('#atomicReasoning .atomic-question'));
    reasoningItems.forEach((el, i) => {
        checkPageBreak(25);
        
        // Question
        const question = el.querySelector('.question-text').textContent;
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`${i + 1}.`, margin, y);
        
        const qLines = doc.splitTextToSize(question, contentWidth - 10);
        qLines.forEach(line => {
            doc.text(line, margin + 8, y);
            y += 5.5;
        });
        
        y += 2;
        
        // Answer
        const answer = el.querySelector('.answer-text').textContent;
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        const aLines = doc.splitTextToSize(answer, contentWidth - 10);
        aLines.forEach(line => {
            checkPageBreak(5);
            doc.text(line, margin + 8, y);
            y += 5;
        });
        
        y += 5;
    });

    y += 3;

    // Synthesis
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Synthesis', margin, y);
    y += 8;

    const synthesis = document.getElementById('synthesis').textContent;

    const synthesisParagraphs = synthesis.split('\n').filter(p => p.trim());

    synthesisParagraphs.forEach(paragraph => {
        const headerMatch = paragraph.match(/^(.+?:)\s*(.*)$/);
        
        if (headerMatch) {
            // Has a header
            const header = headerMatch[1];
            const content = headerMatch[2];
            
            checkPageBreak(8);
            
            doc.setFontSize(11);
            doc.setFont('times', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(header, margin, y);
            y += 6;
            
            // Print content
            if (content.trim()) {
                doc.setFontSize(10);
                doc.setFont('times', 'normal');
                doc.setTextColor(0, 0, 0);
                const cLines = doc.splitTextToSize(content.trim(), contentWidth);
                cLines.forEach(line => {
                    checkPageBreak(5);
                    doc.text(line, margin, y);
                    y += 5;
                });
            }
            y += 3;
        } else {
            // Regular paragraph, no header
            doc.setFontSize(10);
            doc.setFont('times', 'normal');
            doc.setTextColor(0, 0, 0);
            const pLines = doc.splitTextToSize(paragraph.trim(), contentWidth);
            pLines.forEach(line => {
                checkPageBreak(5);
                doc.text(line, margin, y);
                y += 5;
            });
            y += 3;
        }
    });

    y += 5;

    // Key Insights
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Key Insights', margin, y);
    y += 8;

    const insights = Array.from(document.querySelectorAll('.insight-item span:last-child'));
    insights.forEach(el => {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('•', margin, y);
        
        const iLines = doc.splitTextToSize(el.textContent, contentWidth - 10);
        iLines.forEach(line => {
            doc.text(line, margin + 8, y);
            y += 5;
        });
        y += 2;
    });

    // Add header and footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) {
            drawHeader();
        }
        drawFooter();
    }

    // Save the PDF
    doc.save(`ars-${Date.now()}.pdf`);
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+Enter or Cmd+Enter to analyze
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (!analyzeBtn.disabled) {
            analyzeQuery();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
    }
    
    // Ctrl+R or Cmd+R to refine (prevent default browser reload)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        const query = document.getElementById('query').value.trim();
        if (query) {
            e.preventDefault();
            openRefineModal();
        }
    }
    
    // Ctrl+M or Cmd+M to start voice input
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        startVoiceInput();
    }
});

// Scroll to Top Functionality
window.addEventListener('scroll', function() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (window.pageYOffset > 300) {
        scrollBtn.classList.add('visible');
    } else {
        scrollBtn.classList.remove('visible');
    }
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}