// AudioWorklet that forwards raw Float32 mic frames to the main thread,
// where they're downsampled to 16kHz PCM16 for the streaming STT socket.
class PCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      // Copy — the engine reuses the underlying buffer between calls
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}
registerProcessor("pcm-capture", PCMCapture);
