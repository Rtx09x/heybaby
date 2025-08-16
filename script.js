// Global variables
let currentAudio = null;
let currentSong = 0;
let playlist = [];
let sleepTimer = null;
let activeSounds = {};
let moodData = JSON.parse(localStorage.getItem('moodData')) || {};
let loveCount = parseInt(localStorage.getItem('loveCount')) || 0;
let config = {};
let currentLyrics = [];
let lyricsInterval = null;

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSection = btn.getAttribute('data-section');
            
            // Remove active class from all buttons and sections
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked button and target section
            btn.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
        });
    });

    // Load configuration and initialize everything
    loadConfig().then(() => {
        initializeMusicPlayer();
        generateDailyMessage();
        updateLoveCounter();
        updateMoodStats();
        loadPlaylistFromConfig();
        loadMemoriesFromConfig();
        updatePersonalizedContent();
        
        // Add couple stickers to body
        const coupleStickers = document.createElement('div');
        coupleStickers.className = 'couple-stickers';
        document.body.appendChild(coupleStickers);
    });
    
    // Add floating hearts occasionally
    setInterval(createFloatingHeart, 8000);
    
    // Add gentle pulse to heart animation
    const heartAnimation = document.querySelector('.heart-animation');
    if (heartAnimation) {
        heartAnimation.addEventListener('click', () => {
            heartAnimation.style.animation = 'none';
            setTimeout(() => {
                heartAnimation.style.animation = 'heartbeat 1s ease-in-out 3';
            }, 10);
        });
    }
});

// Load configuration from JSON
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        // Fallback to default config
        config = {
            loveNotes: ["You're amazing and I love you! 💕"],
            dailyAffirmations: ["Today is going to be wonderful! 🌟"],
            playlist: [],
            memories: [],
            surprises: {}
        };
    }
}

function showRandomNote() {
    const notes = config.loveNotes || ["You're amazing! 💕"];
    const randomIndex = Math.floor(Math.random() * notes.length);
    const note = notes[randomIndex];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div style="padding: 20px;">
                <h3 style="color: #6b46c1; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">A Little Reminder 💝</h3>
                <p style="font-size: 1.2rem; line-height: 1.6; color: #4a5568;">${note}</p>
                <div style="margin-top: 20px; font-size: 2rem;">🤗</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
}

function generateDailyMessage() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('dailyMessageDate');
    
    if (savedDate !== today) {
        const messages = config.dailyAffirmations || ["Today is wonderful! 🌟"];
        const randomIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randomIndex];
        localStorage.setItem('dailyMessage', message);
        localStorage.setItem('dailyMessageDate', today);
    }
    
    const message = localStorage.getItem('dailyMessage') || (config.dailyAffirmations && config.dailyAffirmations[0]) || "You're amazing! 💕";
    document.getElementById('daily-message').textContent = message;
}

function updatePersonalizedContent() {
    // Update title with girlfriend's name
    if (config.personalInfo && config.personalInfo.girlfriendName) {
        const title = document.querySelector('.main-title');
        title.textContent = `Hey ${config.personalInfo.girlfriendName} 💕`;
    }
}

// Music Player Functions
function initializeMusicPlayer() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.querySelector('.progress-bar');
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', previousSong);
    nextBtn.addEventListener('click', nextSong);
    progressBar.addEventListener('click', seekSong);
}

function loadPlaylistFromConfig() {
    playlist = config.playlist || [];
    updatePlaylist();
}

function loadMemoriesFromConfig() {
    const memoriesContainer = document.querySelector('.memory-gallery');
    if (!memoriesContainer || !config.memories) return;
    
    memoriesContainer.innerHTML = '';
    
    config.memories.forEach(memory => {
        const memoryCard = document.createElement('div');
        memoryCard.className = 'memory-card';
        memoryCard.innerHTML = `
            <div class="memory-placeholder">${memory.emoji}</div>
            <h4>${memory.title}</h4>
            <p>${memory.description}</p>
            <small>${memory.date}</small>
        `;
        memoriesContainer.appendChild(memoryCard);
    });
}

// LRC lyrics parser
function parseLRC(lrcContent) {
    const lines = lrcContent.split('\n');
    const lyrics = [];
    
    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = parseInt(match[3]);
            const time = minutes * 60 + seconds + centiseconds / 100;
            const text = match[4].trim();
            
            lyrics.push({ time, text });
        }
    });
    
    return lyrics.sort((a, b) => a.time - b.time);
}

// Load LRC file
async function loadLyrics(lrcFile) {
    try {
        const response = await fetch(lrcFile);
        const lrcContent = await response.text();
        return parseLRC(lrcContent);
    } catch (error) {
        console.error('Error loading lyrics:', error);
        return [];
    }
}

function addSong() {
    const title = document.getElementById('song-title').value;
    const artist = document.getElementById('song-artist').value;
    const fileInput = document.getElementById('song-file');
    
    if (title && artist) {
        const song = {
            title: title,
            artist: artist,
            file: fileInput.files[0] || null,
            lyrics: "Add your lyrics here... 🎵"
        };
        
        playlist.push(song);
        updatePlaylist();
        
        // Clear form
        document.getElementById('song-title').value = '';
        document.getElementById('song-artist').value = '';
        document.getElementById('song-file').value = '';
    }
}

function updatePlaylist() {
    const songList = document.getElementById('song-list');
    songList.innerHTML = '';
    
    playlist.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        if (index === currentSong) songItem.classList.add('active');
        
        songItem.innerHTML = `
            <div>
                <strong>${song.title}</strong><br>
                <small>${song.artist}</small>
            </div>
            <button onclick="playSong(${index})" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">▶️</button>
        `;
        
        songList.appendChild(songItem);
    });
}

async function playSong(index) {
    currentSong = index;
    const song = playlist[currentSong];
    
    // Update UI
    document.getElementById('current-title').textContent = song.title;
    document.getElementById('current-artist').textContent = song.artist;
    
    // Load and display lyrics
    if (song.lrcFile) {
        currentLyrics = await loadLyrics(song.lrcFile);
        displayLyrics();
    } else {
        document.getElementById('lyrics-content').innerHTML = song.lyrics ? song.lyrics.replace(/\n/g, '<br>') : 'No lyrics available';
    }
    
    // Show dedication if available
    if (song.dedication) {
        const lyricsContent = document.getElementById('lyrics-content');
        lyricsContent.innerHTML = `<div style="background: rgba(255,105,180,0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px; font-style: italic; color: #ff1493;"><strong>💕 ${song.dedication}</strong></div>` + lyricsContent.innerHTML;
    }
    
    // Update playlist display
    updatePlaylist();
    
    // Handle audio
    if (currentAudio) {
        currentAudio.pause();
        if (lyricsInterval) clearInterval(lyricsInterval);
    }
    
    if (song.audioFile) {
        try {
            currentAudio = new Audio(song.audioFile);
            currentAudio.addEventListener('loadedmetadata', updateDuration);
            currentAudio.addEventListener('timeupdate', updateProgress);
            currentAudio.addEventListener('ended', nextSong);
            
            // Start lyrics sync if available
            if (currentLyrics.length > 0) {
                startLyricsSync();
            }
            
            await currentAudio.play();
            document.getElementById('play-pause-btn').textContent = '⏸️';
        } catch (error) {
            console.error('Error playing audio:', error);
            // Fallback to simulation
            document.getElementById('play-pause-btn').textContent = '⏸️';
            simulateProgress();
        }
    } else {
        // Simulate playing for demo songs
        document.getElementById('play-pause-btn').textContent = '⏸️';
        simulateProgress();
    }
}

function displayLyrics() {
    const lyricsContent = document.getElementById('lyrics-content');
    if (currentLyrics.length === 0) {
        lyricsContent.innerHTML = '<p>No lyrics available</p>';
        return;
    }
    
    let lyricsHTML = '';
    currentLyrics.forEach((line, index) => {
        lyricsHTML += `<p class="lyric-line" data-time="${line.time}" data-index="${index}">${line.text}</p>`;
    });
    
    lyricsContent.innerHTML = lyricsHTML;
}

function startLyricsSync() {
    if (lyricsInterval) clearInterval(lyricsInterval);
    
    lyricsInterval = setInterval(() => {
        if (!currentAudio) return;
        
        const currentTime = currentAudio.currentTime;
        const lyricLines = document.querySelectorAll('.lyric-line');
        
        lyricLines.forEach((line, index) => {
            const lineTime = parseFloat(line.dataset.time);
            const nextLineTime = index < lyricLines.length - 1 ? 
                parseFloat(lyricLines[index + 1].dataset.time) : Infinity;
            
            if (currentTime >= lineTime && currentTime < nextLineTime) {
                // Highlight current line
                lyricLines.forEach(l => l.classList.remove('current-lyric'));
                line.classList.add('current-lyric');
                
                // Scroll to current line
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }, 100);
}

function togglePlayPause() {
    const btn = document.getElementById('play-pause-btn');
    
    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play();
            btn.textContent = '⏸️';
        } else {
            currentAudio.pause();
            btn.textContent = '▶️';
        }
    } else if (playlist.length > 0) {
        playSong(currentSong);
    }
}

function previousSong() {
    currentSong = (currentSong - 1 + playlist.length) % playlist.length;
    playSong(currentSong);
}

function nextSong() {
    currentSong = (currentSong + 1) % playlist.length;
    playSong(currentSong);
}

function updateProgress() {
    if (currentAudio) {
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        document.getElementById('progress').style.width = progress + '%';
        document.getElementById('current-time').textContent = formatTime(currentAudio.currentTime);
    }
}

function updateDuration() {
    if (currentAudio) {
        document.getElementById('duration').textContent = formatTime(currentAudio.duration);
    }
}

function seekSong(e) {
    if (currentAudio) {
        const progressBar = e.currentTarget;
        const clickX = e.offsetX;
        const width = progressBar.offsetWidth;
        const duration = currentAudio.duration;
        currentAudio.currentTime = (clickX / width) * duration;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function simulateProgress() {
    // For demo songs without actual files
    let currentTime = 0;
    const duration = 180; // 3 minutes
    document.getElementById('duration').textContent = formatTime(duration);
    
    const interval = setInterval(() => {
        if (document.getElementById('play-pause-btn').textContent === '▶️') {
            clearInterval(interval);
            return;
        }
        
        currentTime += 1;
        const progress = (currentTime / duration) * 100;
        document.getElementById('progress').style.width = progress + '%';
        document.getElementById('current-time').textContent = formatTime(currentTime);
        
        if (currentTime >= duration) {
            clearInterval(interval);
            nextSong();
        }
    }, 1000);
}

// Enhanced Sleep Sounds
function initializeSleepSounds() {
    const soundCards = document.querySelectorAll('.sound-card');
    
    soundCards.forEach(card => {
        const playBtn = card.querySelector('.play-btn');
        const volumeSlider = card.querySelector('.volume-slider');
        const soundType = card.getAttribute('data-sound');
        
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSound(soundType, playBtn, volumeSlider);
        });
        
        volumeSlider.addEventListener('input', (e) => {
            if (activeSounds[soundType]) {
                activeSounds[soundType].volume = e.target.value / 100;
            }
        });
    });
}

function toggleSound(soundType, playBtn, volumeSlider) {
    if (activeSounds[soundType]) {
        // Stop sound
        activeSounds[soundType].pause();
        delete activeSounds[soundType];
        playBtn.textContent = 'Play';
        playBtn.style.background = '#667eea';
    } else {
        // Start sound
        playBtn.textContent = 'Stop';
        playBtn.style.background = '#e53e3e';
        
        // Create audio context for generated sounds
        createNatureSound(soundType, volumeSlider.value / 100);
    }
}

function createNatureSound(type, volume) {
    // This creates synthetic nature sounds using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let oscillator, gainNode, filter;
    
    switch (type) {
        case 'rain':
            // Create rain sound using white noise
            const bufferSize = 2 * audioContext.sampleRate;
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const whiteNoise = audioContext.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;
            
            filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            gainNode = audioContext.createGain();
            gainNode.gain.value = volume * 0.3;
            
            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            whiteNoise.start();
            activeSounds[type] = { stop: () => whiteNoise.stop(), volume: volume };
            break;
            
        case 'ocean':
            // Create ocean waves using low frequency oscillation
            oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = 0.5;
            
            const lfo = audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1;
            
            gainNode = audioContext.createGain();
            gainNode.gain.value = volume * 0.2;
            
            const lfoGain = audioContext.createGain();
            lfoGain.gain.value = 50;
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            lfo.start();
            
            activeSounds[type] = { 
                stop: () => { oscillator.stop(); lfo.stop(); },
                volume: volume
            };
            break;
            
        default:
            // Simple tone for other sounds
            oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = type === 'forest' ? 200 : 100;
            
            gainNode = audioContext.createGain();
            gainNode.gain.value = volume * 0.1;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            
            activeSounds[type] = { stop: () => oscillator.stop(), volume: volume };
    }
}

function startSleepTimer() {
    const duration = parseInt(document.getElementById('timer-duration').value);
    if (duration === 0) return;
    
    if (sleepTimer) clearInterval(sleepTimer);
    
    let timeLeft = duration * 60; // Convert to seconds
    const display = document.getElementById('timer-display');
    
    sleepTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        
        if (timeLeft <= 0) {
            clearInterval(sleepTimer);
            stopAllSounds();
            display.textContent = 'Sleep timer finished! 😴';
        }
        timeLeft--;
    }, 1000);
}

function playAllSelected() {
    // This would play all selected sounds simultaneously
    console.log('Playing all selected sounds...');
}

function stopAllSounds() {
    Object.keys(activeSounds).forEach(soundType => {
        activeSounds[soundType].stop();
        delete activeSounds[soundType];
    });
    
    // Reset all play buttons
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.textContent = 'Play';
        btn.style.background = '#667eea';
    });
}

// Mood Garden Functions
const moodFlowers = {
    happy: '🌻',
    calm: '🌸',
    tired: '🌙',
    anxious: '🌿',
    sad: '💙',
    loved: '🌹'
};

function plantFlower(mood) {
    const garden = document.getElementById('garden');
    const flower = document.createElement('div');
    flower.className = 'flower';
    flower.textContent = moodFlowers[mood];
    flower.style.left = Math.random() * 80 + 10 + '%';
    flower.style.bottom = '30px';
    
    garden.appendChild(flower);
    
    // Save mood data
    const today = new Date().toDateString();
    if (!moodData[today]) moodData[today] = {};
    moodData[today][mood] = (moodData[today][mood] || 0) + 1;
    localStorage.setItem('moodData', JSON.stringify(moodData));
    
    updateMoodStats();
    
    // Add click to remove flower
    flower.addEventListener('click', () => {
        garden.removeChild(flower);
    });
}

function updateMoodStats() {
    const today = new Date().toDateString();
    const todayMoods = moodData[today] || {};
    const summary = document.getElementById('mood-summary');
    
    let statsHTML = '<p>Today\'s garden: ';
    Object.entries(todayMoods).forEach(([mood, count]) => {
        statsHTML += `${moodFlowers[mood]} ${count} `;
    });
    statsHTML += '</p>';
    
    // Weekly summary
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let weeklyMoods = {};
    
    Object.entries(moodData).forEach(([date, moods]) => {
        if (new Date(date) >= weekAgo) {
            Object.entries(moods).forEach(([mood, count]) => {
                weeklyMoods[mood] = (weeklyMoods[mood] || 0) + count;
            });
        }
    });
    
    if (Object.keys(weeklyMoods).length > 0) {
        statsHTML += '<p>This week: ';
        Object.entries(weeklyMoods).forEach(([mood, count]) => {
            statsHTML += `${moodFlowers[mood]} ${count} `;
        });
        statsHTML += '</p>';
    }
    
    summary.innerHTML = statsHTML || '<p>Start planting flowers to see your mood garden grow! 🌱</p>';
}

// Love Counter
function incrementLove() {
    loveCount++;
    localStorage.setItem('loveCount', loveCount.toString());
    updateLoveCounter();
    
    // Create heart animation
    createLoveHeart();
}

function updateLoveCounter() {
    document.getElementById('love-count').textContent = loveCount.toLocaleString();
}

function createLoveHeart() {
    const heart = document.createElement('div');
    heart.innerHTML = '💕';
    heart.style.position = 'fixed';
    heart.style.left = '50%';
    heart.style.top = '50%';
    heart.style.fontSize = '2rem';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '1000';
    heart.style.animation = 'loveHeartFloat 2s ease-out forwards';
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        if (heart.parentNode) {
            heart.parentNode.removeChild(heart);
        }
    }, 2000);
}

function generateSurpriseContent(surpriseNumber) {
    const surprise = config.surprises && config.surprises[surpriseNumber];
    if (!surprise) return getDefaultSurprise(surpriseNumber);
    
    switch (surprise.type) {
        case 'letter':
            return `
                <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">${surprise.content.greeting}</h3>
                <div style="text-align: left; font-size: 1.1rem; line-height: 1.8; margin-bottom: 20px;">
                    ${surprise.content.paragraphs.map(p => `<p>${p}</p>`).join('')}
                    <p style="text-align: right; font-style: italic; color: #ff1493;">${surprise.content.closing}</p>
                </div>
            `;
        case 'sleep-guide':
            return `
                <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">${surprise.content.title}</h3>
                <div style="text-align: left; font-size: 1.1rem; line-height: 1.6;">
                    <p><strong>Your Personalized Sleep Routine:</strong></p>
                    <ul style="margin: 15px 0;">
                        ${surprise.content.routine.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <p><em>${surprise.content.note}</em></p>
                </div>
            `;
        case 'bucket-list':
            return `
                <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">${surprise.content.title}</h3>
                <div style="text-align: left; font-size: 1.1rem; line-height: 1.6;">
                    <p><strong>Our Adventure List:</strong></p>
                    <ul style="margin: 15px 0;">
                        ${surprise.content.adventures.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <p><em>${surprise.content.note}</em></p>
                </div>
            `;
        default:
            return getDefaultSurprise(surpriseNumber);
    }
}

function getDefaultSurprise(surpriseNumber) {
    const defaults = {
        4: `
            <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">Capture This Moment</h3>
            <div style="text-align: center;">
                <div style="border: 3px dashed #ff1493; padding: 40px; margin: 20px 0; border-radius: 15px; background: rgba(255,105,180,0.1);">
                    <p style="font-size: 4rem; margin-bottom: 10px;">📷</p>
                    <p>Take a selfie right now!</p>
                    <p style="font-size: 0.9rem; color: #666;">This moment of you discovering this surprise is precious to me</p>
                </div>
                <button onclick="takePhoto()" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(255,105,180,0.4);">Click! 📸</button>
            </div>
        `,
        5: `
            <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">Love Quiz</h3>
            <div id="quiz-game">
                <p><strong>How well do you know how much I love you?</strong></p>
                <div style="margin: 20px 0;">
                    <p>On a scale of 1-10, how much do I love you?</p>
                    <input type="range" id="love-scale" min="1" max="10" value="10" style="width: 100%; margin: 10px 0;">
                    <p>Your answer: <span id="scale-value">10</span></p>
                </div>
                <button onclick="checkAnswer()" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 10px 20px; border-radius: 15px; cursor: pointer;">Submit Answer</button>
                <div id="quiz-result" style="margin-top: 15px;"></div>
            </div>
        `,
        6: `
            <h3 style="color: #ff1493; margin-bottom: 20px; font-family: 'Dancing Script', cursive; font-size: 2rem;">Record Your Voice</h3>
            <div style="text-align: center;">
                <p>Leave me a voice message! I want to hear your beautiful voice.</p>
                <div style="margin: 20px 0;">
                    <button id="record-btn" onclick="toggleRecording()" style="background: linear-gradient(135deg, #e53e3e, #c44569); color: white; border: none; padding: 15px 30px; border-radius: 50%; cursor: pointer; font-size: 1.5rem; margin: 10px; box-shadow: 0 4px 15px rgba(229,62,62,0.4);">🎤</button>
                    <p id="recording-status">Click to start recording</p>
                </div>
                <div id="playback-controls" style="display: none;">
                    <button onclick="playRecording()" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 10px 20px; border-radius: 15px; cursor: pointer; margin: 5px;">Play ▶️</button>
                    <button onclick="downloadRecording()" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 10px 20px; border-radius: 15px; cursor: pointer; margin: 5px;">Download 💾</button>
                </div>
            </div>
        `
    };
    
    return defaults[surpriseNumber] || '<p>Surprise coming soon! 💕</p>';
}

function openSurprise(surpriseNumber) {
    const modal = document.getElementById('surprise-modal');
    const content = document.getElementById('surprise-content');
    
    content.innerHTML = generateSurpriseContent(surpriseNumber);
    modal.style.display = 'block';
    
    // Add sparkle effect to modal
    modal.style.background = 'rgba(255,105,180,0.1)';
    modal.style.backdropFilter = 'blur(10px)';
    
    // Initialize specific surprise functionality
    if (surpriseNumber === 5) {
        setTimeout(initializeQuiz, 100);
    } else if (surpriseNumber === 6) {
        setTimeout(initializeVoiceRecorder, 100);
    }
}

function initializeQuiz() {
    const slider = document.getElementById('love-scale');
    const valueDisplay = document.getElementById('scale-value');
    
    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
    });
}

function checkAnswer() {
    const answer = document.getElementById('love-scale').value;
    const result = document.getElementById('quiz-result');
    
    if (answer == 10) {
        result.innerHTML = '<p style="color: #28a745; font-weight: bold;">Correct! But actually, it\'s infinity + 1 💕</p>';
    } else {
        result.innerHTML = '<p style="color: #6b46c1;">Close, but the answer is always 10... no wait, infinity! 💖</p>';
    }
}

// Voice recording functionality
let mediaRecorder;
let recordedChunks = [];

function initializeVoiceRecorder() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                mediaRecorder.onstop = () => {
                    document.getElementById('playback-controls').style.display = 'block';
                };
            })
            .catch(err => {
                document.getElementById('recording-status').textContent = 'Microphone access denied';
            });
    }
}

function toggleRecording() {
    const btn = document.getElementById('record-btn');
    const status = document.getElementById('recording-status');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        btn.style.background = '#e53e3e';
        status.textContent = 'Recording stopped';
    } else if (mediaRecorder) {
        recordedChunks = [];
        mediaRecorder.start();
        btn.style.background = '#28a745';
        status.textContent = 'Recording... Click to stop';
    }
}

function playRecording() {
    if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
    }
}

function downloadRecording() {
    if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voice-message-for-you.wav';
        a.click();
    }
}

function takePhoto() {
    // This would typically access the camera, but for demo purposes:
    alert('📸 *Click* Perfect! You look beautiful as always! 💕');
}

// Floating hearts
function createFloatingHeart() {
    const heart = document.createElement('div');
    heart.innerHTML = ['💕', '💖', '💗', '💝', '💘'][Math.floor(Math.random() * 5)];
    heart.style.position = 'fixed';
    heart.style.left = Math.random() * window.innerWidth + 'px';
    heart.style.top = window.innerHeight + 'px';
    heart.style.fontSize = '2rem';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '1000';
    heart.style.animation = 'floatUp 6s ease-out forwards';
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        if (heart.parentNode) {
            heart.parentNode.removeChild(heart);
        }
    }, 6000);
}

// Modal close functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('surprise-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Initialize sleep sounds
    initializeSleepSounds();
});

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes loveHeartFloat {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -150px) scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);