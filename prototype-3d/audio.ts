let context: AudioContext | null = null;
export function playFeedback(kind: 'tap' | 'sale' | 'upgrade') {
  context ??= new AudioContext();
  void context.resume();
  const tones =
    kind === 'tap' ? [330] : kind === 'sale' ? [440, 660] : [392, 494, 587];
  tones.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain();
    const start = context!.currentTime + i * 0.07;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.035, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  });
}
