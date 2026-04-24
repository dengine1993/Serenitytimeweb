// Notification sound utility with smart debounce
let audioContext: AudioContext | null = null;
let lastSoundTime = 0;
const DEBOUNCE_MS = 5000; // 5 seconds between sounds

export const playNotificationSound = (force = false) => {
  const now = Date.now();

  // Debounce - no more than once per 5 seconds (unless forced)
  if (!force && now - lastSoundTime < DEBOUNCE_MS) {
    console.log('[Notification] Sound debounced');
    return;
  }

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create a pleasant notification sound (two-tone beep)
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequencies for a pleasant sound
    oscillator1.frequency.value = 800;
    oscillator2.frequency.value = 1000;

    // Set volume
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    // Play
    const time = audioContext.currentTime;
    oscillator1.start(time);
    oscillator2.start(time + 0.1);
    oscillator1.stop(time + 0.2);
    oscillator2.stop(time + 0.3);

    lastSoundTime = now;
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

// For important notifications (friend_request, private_message, mention)
// Ignores debounce
export const playImportantSound = () => {
  playNotificationSound(true);
};

export const triggerVibration = (pattern: number[] = [200, 100, 200]) => {
  // Check if vibration is supported
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Gentle vibration for low-priority notifications
export const triggerGentleVibration = () => {
  triggerVibration([100]);
};
