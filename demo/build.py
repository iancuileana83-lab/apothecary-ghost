"""Assembles the demo video: each narration clip + its slice of the recording (or a still card),
over a blurred backdrop, with burned-in English captions. Also writes an .srt.
Run from the demo folder:  python build.py
"""
import json
import os
import re
import subprocess
import textwrap
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
for d in ("seg", "caps"):
    os.makedirs(d, exist_ok=True)

OUT = "apothecary-ghost-demo.mp4"
SRT = "apothecary-ghost-demo.srt"
FONT = "C\\:/Windows/Fonts/segoeui.ttf"
W, H, BW, BH, BY, PAD = 1920, 1080, 1760, 880, 30, 0.6
CH, WRAP, FS, CY, CH_H = 90, 56, 42, 930, 150
FPS = 30

segs = json.load(open("narration.json", encoding="utf-8"))["segments"]
marks = json.load(open("marks.json", encoding="utf-8"))
STILLS = {"s12": "shots/phone.png", "s13": "shots/endcard.png"}


def wr(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    w, h = r.stdout.strip().split(",")
    return int(w), int(h)


def chunks(text):
    """Caption chunks: whole sentences when short, otherwise split at commas and colons."""
    out = []
    for sent in [x.strip() for x in re.split(r"(?<=[.!?])\s+", text) if x.strip()]:
        cur = ""
        for clause in [c.strip() for c in re.split(r"(?<=[,:;])\s+", sent) if c.strip()]:
            if cur and len(cur) + 1 + len(clause) > CH:
                out.append(cur)
                cur = clause
            else:
                cur = (cur + " " + clause).strip()
        if cur:
            out.append(cur)
    return out


def stamp(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


outs = []
srt = []
clock = 0.0
for s in segs:
    with wave.open(f"audio/{s['id']}.wav") as w:
        dur = w.getnframes() / w.getframerate()
    total = dur + PAD
    is_still = s["id"] in STILLS
    src = STILLS[s["id"]] if is_still else "rec/page.webm"
    sw, sh = probe(src)
    sc = min(BW / sw, BH / sh)
    fw, fh = int(sw * sc) // 2 * 2, int(sh * sc) // 2 * 2
    n = int(round(total * FPS))

    if is_still:
        inp = ["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.2f}", "-i", src]
        z1 = 1.06 if s["id"] == "s12" else 1.04
        fg = (f"[0:v]scale={fw*2}:{fh*2}:flags=lanczos,"
              f"zoompan=z='1+({z1}-1)*on/{n}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.5':d=1:s={fw}x{fh}:fps={FPS},format=yuv420p[fg]")
    else:
        ranges = marks[s["id"]]["ranges"]
        base = ranges[0][0]
        end = ranges[-1][1]
        span = sum(b - a for a, b in ranges)
        factor = total / span
        inp = ["-ss", f"{base:.3f}", "-t", f"{end - base + 0.2:.3f}", "-i", src]
        if len(ranges) == 1:
            a, b = ranges[0]
            fg = (f"[0:v]trim=start={a-base:.3f}:end={b-base:.3f},setpts=PTS-STARTPTS,setpts=PTS*{factor:.4f},"
                  f"fps={FPS},scale={fw}:{fh}:flags=lanczos,format=yuv420p[fg]")
        else:
            k = len(ranges)
            labels = "".join(f"[v{i}]" for i in range(k))
            parts = [f"[0:v]split={k}{labels}"]
            for i, (a, b) in enumerate(ranges):
                parts.append(f"[v{i}]trim=start={a-base:.3f}:end={b-base:.3f},setpts=PTS-STARTPTS[t{i}]")
            parts.append("".join(f"[t{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0,setpts=PTS*{factor:.4f},"
                         f"fps={FPS},scale={fw}:{fh}:flags=lanczos,format=yuv420p[fg]")
            fg = ";".join(parts)

    bg = (f"[fg]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
          f"boxblur=40:5,eq=brightness=-0.32[bg];[bg][b]overlay=(W-w)/2:{BY}[o]")

    # captions: the narration text in short, timed chunks
    parts_txt = chunks(s["text"])
    weights = [len(p) for p in parts_txt]
    t = 0.0
    dts = []
    for i, p in enumerate(parts_txt):
        span_t = dur * weights[i] / sum(weights)
        a, b = t, t + span_t + (PAD if i == len(parts_txt) - 1 else 0)
        t += span_t
        f = f"caps/{s['id']}-{i}.txt"
        wr(f, "\n".join(textwrap.wrap(p, WRAP)))
        dts.append(f"drawtext=fontfile='{FONT}':textfile='{f}':fontsize={FS}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=16:"
                   f"x=(w-text_w)/2:y={CY}+({CH_H}-text_h)/2:line_spacing=6:enable='between(t,{a:.2f},{b:.2f})'")
        srt.append((clock + a, clock + min(b, total), "\n".join(textwrap.wrap(p, 60))))
    wr("caps/foot.txt", "The Apothecary's Ghost · a made-up ghost · History, not medical advice")
    dts.append(f"drawtext=fontfile='{FONT}':textfile='caps/foot.txt':fontsize=26:fontcolor=0xf0e2c4@0.8:x=w-text_w-30:y=h-44")

    fc = f"{fg};{bg};[o]" + ",".join(dts) + "[v]"
    out = f"seg/{s['id']}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inp, "-i", f"audio/{s['id']}.wav", "-filter_complex", fc,
                    "-map", "[v]", "-map", "1:a", "-af", f"apad=pad_dur={PAD}", "-t", f"{total:.2f}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-r", str(FPS), "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "1", out], check=True)
    print(s["id"], round(total, 1), "s", "" if is_still else f"(video x{factor:.2f})")
    outs.append(out)
    clock += total

wr("list.txt", "".join(f"file '{o}'\n" for o in outs))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt",
                "-c", "copy", "-movflags", "+faststart", OUT], check=True)
wr(SRT, "".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{txt}\n\n" for i, (a, b, txt) in enumerate(srt, 1)))
print("done", OUT, round(clock, 1), "s;", SRT)
