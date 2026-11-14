export function initSimulationPronunciationAudio(root) {
    let current = null;
    let generation = 0;
    let disposed = false;
    const cleanups = [];
    const stop = () => {
        generation++;
        if (!current)
            return;
        const entry = current;
        current = null;
        entry.audio.pause();
        try {
            entry.audio.currentTime = 0;
        }
        catch { /* The source may not have loaded yet. */ }
        entry.button.setAttribute('aria-pressed', 'false');
        entry.label.textContent = 'Nghe phát âm';
    };
    root.querySelectorAll('.candidate-pronunciation-wrap').forEach(wrapper => {
        const audio = wrapper.querySelector('.ipa-inline-audio');
        const button = wrapper.querySelector('.candidate-ipa-audio-btn');
        const label = button?.querySelector('.ipa-audio-button-label');
        const status = wrapper.querySelector('.candidate-ipa-audio-status');
        if (!audio || !button || !label || !status)
            return;
        const entry = { audio, button, label, status };
        const showError = () => {
            if (disposed || current !== entry)
                return;
            stop();
            status.textContent = 'Không thể phát âm thanh. Vui lòng thử lại.';
            status.hidden = false;
        };
        const play = async () => {
            if (disposed)
                return;
            if (current === entry) {
                stop();
                return;
            }
            stop();
            const ticket = ++generation;
            current = entry;
            status.hidden = true;
            button.setAttribute('aria-pressed', 'true');
            label.textContent = 'Dừng phát âm';
            try {
                if (audio.error)
                    audio.load();
                await audio.play();
                // A pending play may settle after navigation or disposal.
                if ((disposed || ticket !== generation) && current !== entry)
                    audio.pause();
            }
            catch {
                if (ticket === generation)
                    showError();
            }
        };
        const ended = () => { if (current === entry)
            stop(); };
        button.addEventListener('click', play);
        audio.addEventListener('ended', ended);
        audio.addEventListener('error', showError);
        cleanups.push(() => {
            button.removeEventListener('click', play);
            audio.removeEventListener('ended', ended);
            audio.removeEventListener('error', showError);
        });
    });
    return {
        stop,
        dispose() {
            if (disposed)
                return;
            stop();
            disposed = true;
            cleanups.forEach(cleanup => cleanup());
        }
    };
}
