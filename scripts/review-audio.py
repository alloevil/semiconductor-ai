import argparse
import hashlib
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel
from opencc import OpenCC

parser = argparse.ArgumentParser(description="Review final video audio with local ASR and source alignment")
parser.add_argument("episodes", nargs="+", choices=["01", "02", "03", "04", "05"])
arguments = parser.parse_args()
ffmpeg = subprocess.check_output(["node", "--input-type=module", "-e", "import ffmpeg from 'ffmpeg-static'; console.log(ffmpeg)"], text=True).strip()
model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=3, num_workers=1, download_root="tmp/asr-models")
converter = OpenCC("t2s")


def normalize(value):
    return re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", converter.convert(value))


def edit_distance(first, second):
    previous = list(range(len(second) + 1))
    for first_index, first_character in enumerate(first, 1):
        current = [first_index]
        for second_index, second_character in enumerate(second, 1):
            current.append(min(previous[second_index] + 1, current[-1] + 1, previous[second_index - 1] + (first_character != second_character)))
        previous = current
    return previous[-1]


def decode(source, destination):
    subprocess.run([ffmpeg, "-y", "-v", "error", "-i", str(source), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(destination)], check=True)
    with wave.open(str(destination)) as stream:
        return np.frombuffer(stream.readframes(stream.getnframes()), dtype=np.int16).astype(np.float32) / 32768


for episode in arguments.episodes:
    directory = Path("output") if episode == "01" else Path(f"output/episode-{episode}")
    temporary = Path(f"tmp/audio-review-{episode}")
    temporary.mkdir(parents=True, exist_ok=True)
    destination = directory / "review"
    destination.mkdir(exist_ok=True)
    video = directory / f"episode-{episode}.mp4"
    actual_audio = decode(video, temporary / "decoded.wav")
    reference_audio = decode(directory / f"speech/episode-{episode}.wav", temporary / "reference.wav")
    timeline = json.loads((directory / "timeline.json").read_text())
    results = []
    alignment = []
    for scene in timeline["scenes"]:
        start = round(scene["start"] * 16000)
        end = round((scene["start"] + scene["duration"]) * 16000)
        actual = actual_audio[start:end]
        reference = reference_audio[start:end]
        correlation = float(np.dot(actual, reference) / (np.linalg.norm(actual) * np.linalg.norm(reference)))
        alignment.append({"scene": scene["id"], "zeroLagCorrelation": round(correlation, 6), "pass": correlation > 0.99})
        segments, information = model.transcribe(actual, language="zh", beam_size=5, vad_filter=True)
        recognized = "".join(segment.text for segment in segments)
        expected_text = normalize(scene["narration"])
        recognized_text = normalize(recognized)
        results.append({"scene": scene["id"], "reference": scene["narration"], "recognized": recognized, "characters": len(expected_text), "editDistance": edit_distance(expected_text, recognized_text)})
        print(f"EPISODE {episode} SCENE {scene['id']}: correlation={correlation:.6f}; {recognized}", flush=True)
    report = {"episode": episode, "videoSha256": hashlib.sha256(video.read_bytes()).hexdigest(), "method": "Final MP4 decoded to 16kHz PCM; Whisper base CPU int8, zh, beam5, no text prompt; traditional-to-simplified normalization; not a human listening test", "characters": sum(item["characters"] for item in results), "editDistance": sum(item["editDistance"] for item in results), "results": results}
    (destination / "audio-transcription.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    (destination / "audio-alignment.json").write_text(json.dumps({"pass": all(item["pass"] for item in alignment), "videoSha256": report["videoSha256"], "method": "Correlation at identical sample offsets against normalized source PCM; threshold >0.99 per scene", "results": alignment}, indent=2) + "\n")
    if not all(item["pass"] for item in alignment):
        raise RuntimeError(f"Audio alignment failed for episode {episode}")
    print(f"PASS audio alignment {episode}; ASR edits {report['editDistance']}/{report['characters']} (not TTS error rate)", flush=True)
