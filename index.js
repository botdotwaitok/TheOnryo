// TheOnryo — Auto silent audio keep-alive for iOS
// Dead by Daylight Killer: Sadako 🎮

import { eventSource, event_types } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import {
    loadSettings,
    isEnabled,
    setEnabled,
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

function updateStatusUI() {
    const active = isKeepAliveActive();
    const $status = $('#theonryo_status');
    const $stopRow = $('#theonryo_stop_row');

    if (active) {
        $status.text('Active').removeClass('theonryo-inactive').addClass('theonryo-active');
        $stopRow.show();
    } else {
        $status.text('Inactive').removeClass('theonryo-active').addClass('theonryo-inactive');
        $stopRow.hide();
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════════════════════════════════

function onMessageSent() {
    tryAutoStartKeepAlive();
    // Defer UI update slightly to let audio.play() resolve
    setTimeout(updateStatusUI, 100);
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
        updateStatusUI();
        console.log(`${LOG_PREFIX} ${checked ? 'Enabled' : 'Disabled'}`);
    });

    // Stop button handler
    $('#theonryo_stop_btn').on('click', function () {
        stopKeepAlive();
        updateStatusUI();
    });

    // Listen for message sent & swipe events
    eventSource.on(event_types.MESSAGE_SENT, onMessageSent);
    eventSource.on(event_types.MESSAGE_SWIPED, onMessageSent);

    // Initial UI state
    updateStatusUI();

    console.log(`${LOG_PREFIX} Initialized.`);
});
