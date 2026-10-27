"""Narration with Piper, using the same voice as the earlier demo videos (en_US-lessac-medium).
Run with the Python that has piper installed:
    PIPER_VOICE=path/to/en_US-lessac-medium.onnx python demo/tts.py
"""
import json
import os
import wave

from piper import PiperVoice

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("PIPER_VOICE", "en_US-lessac-medium.onnx")

voice = PiperVoice.load(VOICE)
segments = json.load(open(os.path.join(HERE, "narration.json"), encoding="utf-8"))["segments"]
os.makedirs(os.path.join(HERE, "audio"), exist_ok=True)

total = 0.0
for seg in segments:
    path = os.path.join(HERE, "audio", f"{seg['id']}.wav")
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(seg.get("say", seg["text"]), w)
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    total += dur
    print(seg["id"], round(dur, 1), "s")
print("total narration:", round(total, 1), "s")
