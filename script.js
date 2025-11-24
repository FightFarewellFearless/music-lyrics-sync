// DOM Elements
const audioInput = document.getElementById('audioFile');
const lyricsInput = document.getElementById('lyricsInput');
const player = document.getElementById('audioPlayer');
const lyricsContainer = document.getElementById('lyricsDisplay');
const dropArea = document.getElementById('dropArea');
const fileNameDisplay = document.getElementById('fileName');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeDisplay = document.getElementById('currentTime');
const speedControl = document.getElementById('speedControl');
const syncLineBtn = document.getElementById('syncLineBtn');
const insertBreakBtn = document.getElementById('insertBreakBtn'); // MOVED TO FOOTER

// Preview Elements
const previewBtn = document.getElementById('previewBtn');
const previewOverlay = document.getElementById('previewOverlay');
const previewLinesContainer = document.getElementById('previewLines');
const closePreviewBtn = document.getElementById('closePreviewBtn');

// Views
const setupView = document.getElementById('setupView');
const syncView = document.getElementById('syncView');

// State
let lyricLines = []; 
let activeIndex = 0;
let isPreviewMode = false;

// --- Initialization & Event Listeners ---

// File Upload Handling
audioInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.borderColor = '#6c5ce7'; });
dropArea.addEventListener('dragleave', () => { dropArea.style.borderColor = '#444'; });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#444';
    if (e.dataTransfer.files.length) {
        audioInput.files = e.dataTransfer.files;
        handleFileSelect({ target: audioInput });
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        player.src = url;
        fileNameDisplay.textContent = file.name;
    }
}

// Navigation & View Switching
document.getElementById('startBtn').addEventListener('click', () => {
    if (!player.src) return alert("Please upload an audio file first.");
    const rawText = lyricsInput.value.trim();
    if (!rawText) return alert("Please paste some lyrics.");
    
    // Parse lyrics
    lyricLines = rawText.split('\n').map(line => ({
        text: line.trim(),
        time: null
    })).filter(l => l.text !== ""); 

    renderLyrics();
    switchView('sync');
    activeIndex = 0;
    updateActiveLine();
});

// Back Button with Warning
document.getElementById('editBtn').addEventListener('click', () => {
    const hasProgress = lyricLines.some(line => line.time !== null);
    
    if (hasProgress) {
        const confirmLeave = confirm("⚠️ Warning: Going back will discard your current synchronization progress.\n\nAre you sure you want to continue?");
        if (!confirmLeave) return;
    }

    switchView('setup');
    player.pause();
    
    // Reset Data
    lyricLines = [];
    lyricsContainer.innerHTML = '';
});

// NEW: Insert Break Logic (Auto-Syncs Current Time)
insertBreakBtn.addEventListener('click', () => {
    const currentTime = player.currentTime;
    
    const newLine = {
        text: "", // Visual indicator
        time: currentTime // Auto-set timestamp
    };
    
    // Insert at current active position
    lyricLines.splice(activeIndex, 0, newLine);
    
    // Advance index so we are ready for the NEXT line immediately
    activeIndex++;

    renderLyrics();
    updateActiveLine();
});

function switchView(viewName) {
    if (viewName === 'sync') {
        setupView.classList.remove('active');
        setupView.classList.add('hidden');
        syncView.classList.remove('hidden');
        syncView.classList.add('active');
    } else {
        syncView.classList.remove('active');
        syncView.classList.add('hidden');
        setupView.classList.remove('hidden');
        setupView.classList.add('active');
    }
}

// --- Player Controls ---

playPauseBtn.addEventListener('click', togglePlay);
speedControl.addEventListener('change', (e) => player.playbackRate = parseFloat(e.target.value));

player.addEventListener('timeupdate', () => {
    const current = player.currentTime;
    progressBar.value = current;
    currentTimeDisplay.textContent = formatTimeSimple(current);
    
    if (isPreviewMode) {
        updatePreviewHighlight(current);
    }
});

player.addEventListener('loadedmetadata', () => {
    progressBar.max = player.duration;
});

progressBar.addEventListener('input', () => {
    player.currentTime = progressBar.value;
});

function togglePlay() {
    if (player.paused) {
        player.play();
        playPauseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else {
        player.pause();
        playPauseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    }
}

window.skip = function(seconds) {
    player.currentTime += seconds;
}

// --- Sync Logic ---

function renderLyrics() {
    lyricsContainer.innerHTML = '';
    lyricLines.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = `lyric-row ${index === activeIndex ? 'active' : ''}`;
        div.dataset.index = index;
        
        if(line.time !== null) div.classList.add('synced');

        // Added Delete Button (x)
        div.innerHTML = `
            <span class="lyric-text">${line.text}</span>
            <div class="row-right">
                <span class="timestamp" onclick="adjustTimestamp(${index})">
                    ${line.time !== null ? formatTimeLRC(line.time) : '--:--.--'}
                </span>
                <button class="btn-delete" onclick="deleteLine(event, ${index})" title="Delete Line">&times;</button>
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            // Prevent changing active line if clicking timestamp or delete
            if(!e.target.closest('.row-right')) {
                activeIndex = index;
                updateActiveLine();
            }
        });
        lyricsContainer.appendChild(div);
    });
}

// NEW: Delete Line Function
window.deleteLine = function(event, index) {
    event.stopPropagation(); // Stop row click event
    if(confirm('Delete this line?')) {
        lyricLines.splice(index, 1);
        // Adjust active index if necessary
        if (index < activeIndex) activeIndex--;
        renderLyrics();
        updateActiveLine();
    }
}

function syncCurrentLine() {
    if (activeIndex < lyricLines.length) {
        lyricLines[activeIndex].time = player.currentTime;
        updateRowUI(activeIndex);
        if (activeIndex < lyricLines.length - 1) {
            activeIndex++;
            updateActiveLine();
        }
        scrollToActive();
    }
}

function updateRowUI(index) {
    const row = lyricsContainer.children[index];
    if (!row) return;
    const timeSpan = row.querySelector('.timestamp');
    timeSpan.textContent = formatTimeLRC(lyricLines[index].time);
    row.classList.add('synced');
}

function updateActiveLine() {
    Array.from(lyricsContainer.children).forEach(c => c.classList.remove('active'));
    const currentRow = lyricsContainer.children[activeIndex];
    if(currentRow) currentRow.classList.add('active');
    scrollToActive();
}

function scrollToActive() {
    const currentRow = lyricsContainer.children[activeIndex];
    if (currentRow) {
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

window.adjustTimestamp = function(index) {
    if (confirm(`Clear timestamp for: "${lyricLines[index].text}"?`)) {
        lyricLines[index].time = null;
        const row = lyricsContainer.children[index];
        row.querySelector('.timestamp').textContent = '--:--.--';
        row.classList.remove('synced');
    }
};

// --- PREVIEW / KARAOKE LOGIC ---

previewBtn.addEventListener('click', () => {
    const hasSyncedLines = lyricLines.some(l => l.time !== null);
    if (!hasSyncedLines) return alert("You haven't synced any lines yet!");

    document.getElementById('lyricsDisplay').classList.add('hidden');
    previewOverlay.classList.remove('hidden');
    isPreviewMode = true;

    previewLinesContainer.innerHTML = '';
    lyricLines.forEach((line, index) => {
        const p = document.createElement('div');
        p.className = 'p-line';
        p.textContent = line.text === '' ? '● ● ●' : line.text;
        p.id = `preview-line-${index}`;
        previewLinesContainer.appendChild(p);
    });

    if (player.paused) togglePlay();
});

closePreviewBtn.addEventListener('click', () => {
    previewOverlay.classList.add('hidden');
    document.getElementById('lyricsDisplay').classList.remove('hidden');
    isPreviewMode = false;
});

function updatePreviewHighlight(currentTime) {
    let activeIdx = -1;
    for (let i = 0; i < lyricLines.length; i++) {
        if (lyricLines[i].time !== null && lyricLines[i].time <= currentTime) {
            activeIdx = i;
        } else if (lyricLines[i].time !== null && lyricLines[i].time > currentTime) {
            break;
        }
    }
    
    const allLines = document.querySelectorAll('.p-line');
    allLines.forEach(l => l.classList.remove('active'));

    if (activeIdx !== -1) {
        const activeEl = document.getElementById(`preview-line-${activeIdx}`);
        if (activeEl) {
            activeEl.classList.add('active');
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// --- Inputs ---

syncLineBtn.addEventListener('click', syncCurrentLine);

document.addEventListener('keydown', (e) => {
    if (syncView.classList.contains('hidden') || isPreviewMode) return;

    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'Enter': 
        case 'NumpadEnter':
            e.preventDefault();
            syncCurrentLine();
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (activeIndex < lyricLines.length - 1) {
                activeIndex++;
                updateActiveLine();
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (activeIndex > 0) {
                activeIndex--;
                updateActiveLine();
            }
            break;
        case 'ArrowLeft':
            skip(-5);
            break;
        case 'ArrowRight':
            skip(5);
            break;
        case 'Backspace':
             // Optional: undo logic could go here
             break;
    }
});

// --- Export ---

document.getElementById('downloadBtn').addEventListener('click', () => {
    let content = "";
    lyricLines.forEach(line => {
        if (line.time !== null) {
            content += `[${formatTimeLRC(line.time)}]${line.text}\n`;
        }
    });
    
    if (content === "") return alert("No lines have been synced yet!");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (audioInput.files[0]?.name.replace(/\.[^/.]+$/, "") || "lyrics") + ".lrc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// --- Helpers ---

function formatTimeSimple(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeLRC(time) {
    const m = Math.floor(time / 60);
    const s = (time % 60).toFixed(2);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(5, '0')}`;
}

// Help Modal
const modal = document.getElementById('helpModal');
document.getElementById('helpBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeHelp').addEventListener('click', () => modal.classList.add('hidden'));