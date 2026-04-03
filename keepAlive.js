// keepAlive.js — iOS Silent Keep-Alive
// Plays a looping silent audio clip to prevent iOS Safari from killing
// the background tab/process when the user switches apps or locks screen.
// Adapted from TheGhostFace/modules/phone/keepAlive.js

import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'theonryo';
const LOG_PREFIX = '[TheOnryo]';

const defaultSettings = {
    enabled: true,
};

// ═══════════════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════════════

export function loadSettings() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = {};
    }
    for (const key in defaultSettings) {
        if (!(key in extension_settings[EXT_NAME])) {
            extension_settings[EXT_NAME][key] = defaultSettings[key];
        }
    }
}

export function isEnabled() {
    return extension_settings[EXT_NAME]?.enabled !== false;
}

export function setEnabled(enabled) {
    extension_settings[EXT_NAME].enabled = !!enabled;
    saveSettingsDebounced();
    if (!enabled && _active) {
        stopKeepAlive();
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Minimal silent WAV — ~1 second, 8 kHz, 8-bit mono, all silence
// ═══════════════════════════════════════════════════════════════════════

function _buildSilentWavDataUri() {
    const sampleRate = 8000;
    const duration = 1;
    const numChannels = 1;
    const bitsPerSample = 8;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const fileSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // RIFF header
    _writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    _writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    _writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    _writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM samples — 8-bit unsigned PCM silence = 128
    for (let i = 0; i < dataSize; i++) {
        view.setUint8(headerSize + i, 128);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
}

function _writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════

let _audio = null;
let _active = false;

// ═══════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start the silent audio loop.
 * Safe to call multiple times — will no-op if already running.
 */
export function startKeepAlive() {
    if (_audio) {
        console.log(`${LOG_PREFIX} Already active, skipping.`);
        return;
    }

    try {
        const wavUri = _buildSilentWavDataUri();
        _audio = new Audio(wavUri);
        _audio.loop = true;
        _audio.volume = 0.01; // Non-zero to avoid browser optimization

        const playPromise = _audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise
                .then(() => {
                    console.log(`${LOG_PREFIX} Silent audio playing — keep-alive active.`);
                })
                .catch(() => {
                    // iOS requires user interaction before playing audio.
                    console.warn(`${LOG_PREFIX} Autoplay blocked — waiting for user interaction.`);
                    const resume = () => {
                        if (_audio) {
                            _audio.play()
                                .then(() => console.log(`${LOG_PREFIX} Resumed after user interaction.`))
                                .catch(e => console.warn(`${LOG_PREFIX} Resume failed:`, e));
                        }
                        document.removeEventListener('touchstart', resume);
                        document.removeEventListener('click', resume);
                    };
                    document.addEventListener('touchstart', resume, { once: true });
                    document.addEventListener('click', resume, { once: true });
                });
        }

        _active = true;
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to create audio:`, e);
    }
}

/**
 * Stop the silent audio loop and release resources.
 */
export function stopKeepAlive() {
    if (_audio) {
        _audio.pause();
        _audio.src = '';
        _audio = null;
    }
    _active = false;
    console.log(`${LOG_PREFIX} Keep-alive stopped.`);
}

/**
 * @returns {boolean} Whether the keep-alive audio is currently active.
 */
export function isKeepAliveActive() {
    return _active;
}

/**
 * Start keep-alive only if enabled in settings AND not already active.
 * Called automatically on MESSAGE_SENT.
 */
export function tryAutoStartKeepAlive() {
    if (isEnabled() && !_active) {
        console.log(`${LOG_PREFIX} Auto-starting on message send.`);
        startKeepAlive();
    }
}
