// TheOnryo — Auto silent audio keep-alive for iOS
// Dead by Daylight Killer: Sadako 🎮

import { eventSource, event_types } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import {
    loadSettings,
    isEnabled,
    setEnabled,
    startKeepAlive,
    stopKeepAlive,
    isKeepAliveActive,
    tryAutoStartKeepAlive,
} from './keepAlive.js';

const EXT_NAME = 'theonryo';
const EXT_FOLDER = 'third-party/TheOnryo';
const LOG_PREFIX = '[TheOnryo]';

// ═══════════════════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════════════════

function updateToggleUI() {
    const active = isKeepAliveActive();
    const $icon = $('#theonryo_toggle_icon');
    const $label = $('#theonryo_toggle_label');

    if (active) {
        $icon.removeClass('ph-play-circle').addClass('ph-pause-circle');
        $label.text('Pause');
    } else {
        $icon.removeClass('ph-pause-circle').addClass('ph-play-circle');
        $label.text('Play');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════════════════════════════════

function onMessageSent() {
    tryAutoStartKeepAlive();
    // Defer UI update slightly to let audio.play() resolve
    setTimeout(updateToggleUI, 100);
}

// ═══════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════

jQuery(async () => {
    // Load settings
    loadSettings();

    // Render settings panel
    const html = await renderExtensionTemplateAsync(EXT_FOLDER, 'settings');
    $('#extensions_settings').append(html);

    // Init checkbox state
    $('#theonryo_enabled').prop('checked', isEnabled());

    // Toggle handler
    $('#theonryo_enabled').on('change', function () {
        const checked = $(this).prop('checked');
        setEnabled(checked);
        updateToggleUI();
        console.log(`${LOG_PREFIX} ${checked ? 'Enabled' : 'Disabled'}`);
    });

    // Play/Pause toggle handler
    $('#theonryo_toggle_btn').on('click', function () {
        if (isKeepAliveActive()) {
            stopKeepAlive();
        } else {
            startKeepAlive();
        }
        setTimeout(updateToggleUI, 100);
    });

    // Listen for message sent & swipe events
    eventSource.on(event_types.MESSAGE_SENT, onMessageSent);
    eventSource.on(event_types.MESSAGE_SWIPED, onMessageSent);

    // Initial UI state
    updateToggleUI();

    console.log(`${LOG_PREFIX} Initialized.`);
});
