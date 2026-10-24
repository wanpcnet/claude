"""Síntese offline de toda a trilha e efeitos de Véu de Brasas (obra original do projeto).
Gera WAV temporário e converte para OGG Vorbis com ffmpeg em public/assets/audio/.
Uso: python3 scripts/audio/build_audio.py"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'public', 'assets', 'audio'))
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, d=0.1, s=0.6, r=0.2, total=None):
    total = total or n / SR
    t = np.arange(n) / SR
    e = np.ones(n)
    e = np.where(t < a, t / max(a, 1e-6), e)
    dd = (t >= a) & (t < a + d)
    e = np.where(dd, 1 - (1 - s) * (t - a) / max(d, 1e-6), e)
    e = np.where(t >= a + d, s, e)
    rel = t > total - r
    e = np.where(rel, e * np.clip((total - t) / max(r, 1e-6), 0, 1), e)
    return e


def expdec(n, k):
    return np.exp(-np.arange(n) / SR * k)


def lowpass(x, cutoff):
    """filtro de um polo (cutoff pode ser array)."""
    c = np.broadcast_to(np.asarray(cutoff, np.float64), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def lp_fast(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    # aplicação em blocos via lfilter manual (recursão vetorizada por cumprod não é estável); usa loop simples otimizado
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, cutoff):
    return x - lp_fast(x, cutoff)


def noise(n):
    return rng.uniform(-1, 1, n)


def saw(f, t):
    return 2 * ((f * t) % 1) - 1


def tri(f, t):
    return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def ks(freq, dur, bright=0.5, decay=0.996):
    n = int(SR * dur)
    p = max(2, int(SR / freq))
    buf = noise(p) * 0.5
    buf = lp_fast(buf, 2000 + bright * 6000) if p > 4 else buf
    out = np.zeros(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = decay * 0.5 * (buf[j] + buf[(j + 1) % p])
    return out


def bell(freq, dur, idx=3.0, ratio=3.5):
    t = t_(dur)
    e = expdec(len(t), 3.0)
    mod = np.sin(2 * np.pi * freq * ratio * t) * idx * e
    return np.sin(2 * np.pi * freq * t + mod) * e


def pad(freq, dur, bright=900):
    t = t_(dur)
    s = sum(saw(freq * d, t) for d in (0.996, 1.0, 1.004, 2.002)) / 4
    s = lp_fast(s, bright)
    return s * env(len(t), a=dur * 0.3, d=0.1, s=1.0, r=dur * 0.35)


def kick(dur=0.35):
    t = t_(dur)
    f = 45 + 110 * np.exp(-t * 30)
    ph = np.cumsum(f) / SR
    return np.sin(2 * np.pi * ph) * expdec(len(t), 9) * 1.1


def snare(dur=0.25):
    t = t_(dur)
    n = hp(noise(len(t)), 900) * expdec(len(t), 18)
    tone = np.sin(2 * np.pi * 190 * t) * expdec(len(t), 25) * 0.5
    return (n + tone) * 0.7


def hat(dur=0.06):
    return hp(noise(int(SR * dur)), 6000) * expdec(int(SR * dur), 60) * 0.35


def tom(freq=110, dur=0.4):
    t = t_(dur)
    f = freq * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(len(t), 7)


def mix_into(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[0]:
        return
    n = min(len(sig), buf.shape[0] - i)
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + n, 0] += sig[:n] * gain * l
    buf[i:i + n, 1] += sig[:n] * gain * r


def reverb(buf, mix=0.25):
    out = buf.copy()
    for d, g in ((0.031, 0.5), (0.047, 0.45), (0.071, 0.38), (0.113, 0.3), (0.173, 0.24), (0.241, 0.18), (0.337, 0.12)):
        k = int(d * SR)
        out[k:, 0] += buf[:-k, 1] * g * mix
        out[k:, 1] += buf[:-k, 0] * g * mix
    return out


def loopify(buf, tail):
    """dobra a cauda de reverb no início para o loop ficar contínuo."""
    n = buf.shape[0] - tail
    out = buf[:n].copy()
    out[:tail] += buf[n:]
    return out


def add(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def normalize(x, peak=0.85):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def write(name, data, stereo=False, q=4):
    os.makedirs(OUT, exist_ok=True)
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2 if stereo else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    dst = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', str(q), dst], check=True)
    os.remove(tmp)
    print('audio', name)


# ---------------------------------------------------------------- músicas
# Ré menor dórico / frígio; progressões autorais
def music_menu():
    bpm = 72
    beat = 60 / bpm
    bars = 16
    L = bars * 4 * beat
    tail = int(SR * 2.0)
    buf = np.zeros((int(SR * L) + tail, 2))
    prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (43, [55, 58, 62, 65]), (45, [57, 61, 64])]
    for b in range(bars):
        root, ch = prog[b % 4]
        at = b * 4 * beat
        mix_into(buf, pad(mtof(root - 12), 4 * beat + 0.8, 500), at, 0.22, 0)
        for k, m in enumerate(ch):
            mix_into(buf, pad(mtof(m), 4 * beat + 0.8, 700 + k * 80), at, 0.1, -0.5 + k * 0.33)
        # arpejo de sinos delicado
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[2] + 12]
        for i in range(6 if b % 2 == 0 else 3):
            mix_into(buf, bell(mtof(arp[i]), 2.2, 1.8, 3.01), at + i * beat * 0.66, 0.08, (i % 3 - 1) * 0.6)
        if b % 4 == 3:
            mix_into(buf, ks(mtof(ch[-1] + 12), 2.5, 0.3), at + 3 * beat, 0.15, 0.3)
    buf = reverb(buf, 0.5)
    return normalize(loopify(buf, tail), 0.7)


def music_combat(intense=False):
    bpm = 132 if intense else 118
    beat = 60 / bpm
    bars = 24 if not intense else 20
    L = bars * 4 * beat
    tail = int(SR * 1.5)
    buf = np.zeros((int(SR * L) + tail, 2))
    prog = [(38, [50, 53, 57]), (38, [50, 53, 57]), (34, [46, 50, 53]), (36, [48, 52, 55]),
            (38, [50, 53, 57]), (41, [53, 57, 60]), (34, [46, 50, 53]), (37, [49, 52, 56])]
    if intense:
        prog = [(38, [50, 53, 57]), (39, [51, 55, 58]), (38, [50, 53, 57]), (36, [48, 51, 55]),
                (34, [46, 50, 53]), (39, [51, 55, 58]), (41, [53, 56, 60]), (37, [49, 52, 56])]
    melody = [74, 72, 69, 72, 74, 77, 76, 74, 72, 69, 67, 69, 70, 69, 67, 65]
    for b in range(bars):
        root, ch = prog[b % len(prog)]
        at = b * 4 * beat
        layer = min(3, b // 4) if not intense else 3  # crescendo de camadas
        mix_into(buf, pad(mtof(ch[0]), 4 * beat + 0.3, 600), at, 0.08, -0.4)
        mix_into(buf, pad(mtof(ch[2]), 4 * beat + 0.3, 600), at, 0.07, 0.4)
        # baixo ostinato em colcheias
        for i in range(8):
            m = root + (12 if i in (3, 6) else 0) + (7 if i == 5 else 0)
            t = t_(beat * 0.5)
            s = lp_fast(saw(mtof(m), t), 420 if not intense else 600) * expdec(len(t), 7)
            mix_into(buf, s, at + i * beat * 0.5, 0.32, 0)
        # bateria
        for i in range(4):
            mix_into(buf, kick(), at + i * beat, 0.6 if layer >= 1 or i % 2 == 0 else 0.0)
            if layer >= 1 and i % 2 == 1:
                mix_into(buf, snare(), at + i * beat, 0.4, 0.1)
            if layer >= 2:
                mix_into(buf, hat(), at + i * beat + beat * 0.5, 0.5, 0.35)
                mix_into(buf, hat(0.03), at + i * beat, 0.3, -0.35)
        if intense and b % 2 == 1:
            for k, f in enumerate((140, 120, 100, 80)):
                mix_into(buf, tom(f), at + 3 * beat + k * beat * 0.25, 0.35, -0.5 + k * 0.33)
        # melodia em cordas dedilhadas
        if layer >= 2 or intense:
            for i in range(4):
                m = melody[(b * 4 + i) % len(melody)] + (0 if not intense else -2)
                if (b + i) % 3 != 2:
                    mix_into(buf, ks(mtof(m), beat * 1.6, 0.6), at + i * beat, 0.16, 0.25)
        if b % 4 == 0:
            mix_into(buf, bell(mtof(ch[0] + 24), 3.0, 2.5, 2.0), at, 0.06, -0.3)
    buf = reverb(buf, 0.3)
    return normalize(loopify(buf, tail), 0.75)


def music_sting(victory=True):
    beat = 0.4
    buf = np.zeros((int(SR * 7), 2))
    notes = [62, 66, 69, 74, 78] if victory else [62, 61, 58, 57, 50]
    for i, m in enumerate(notes):
        mix_into(buf, bell(mtof(m), 3.5, 2.0, 2.0 if victory else 1.41), i * beat, 0.25, (i - 2) * 0.3)
        mix_into(buf, pad(mtof(m - 12), 3.5, 700), i * beat, 0.12)
    mix_into(buf, pad(mtof(notes[0] - 24), 6, 400), 0, 0.25)
    return normalize(reverb(buf, 0.5), 0.75)


# ---------------------------------------------------------------- efeitos
def sfx_arrow():
    n = int(SR * 0.18)
    t = np.arange(n) / SR
    twang = np.sin(2 * np.pi * (520 - 900 * t) * t) * expdec(n, 30)
    whoosh = lp_fast(noise(n), 3000) * env(n, 0.01, 0.05, 0.3, 0.1)
    return normalize(twang * 0.5 + whoosh * 0.6, 0.6)


def sfx_fire():
    n = int(SR * 0.5)
    x = lp_fast(noise(n), 1400) * env(n, 0.03, 0.1, 0.5, 0.3)
    crackle = (rng.random(n) > 0.997) * noise(n) * 0.8
    return normalize(x + crackle, 0.6)


def sfx_lance():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    roar = lp_fast(noise(n), 900 + 3000 * np.exp(-t * 4).mean()) * env(n, 0.01, 0.2, 0.4, 0.3)
    tone = saw(110 + 200 * np.exp(-t * 6), t) * expdec(n, 5) * 0.3
    return normalize(roar + lp_fast(tone, 1500), 0.7)


def sfx_thunder():
    n = int(SR * 0.45)
    crack = hp(noise(n), 1500) * expdec(n, 22)
    buzz = np.sign(np.sin(2 * np.pi * 60 * t_(0.45))) * expdec(n, 12) * 0.25
    return normalize(crack + lp_fast(buzz, 2000), 0.65)


def sfx_glass():
    out = np.zeros(int(SR * 0.7))
    for k in range(6):
        f = 1800 + rng.uniform(0, 2600)
        b = bell(f, 0.5, 1.2, 2.76) * 0.3
        at = int(rng.uniform(0, 0.08) * SR)
        out[at:at + len(b)] += b[:len(out) - at]
    out += hp(noise(len(out)), 4000) * expdec(len(out), 30) * 0.4
    return normalize(out, 0.6)


def sfx_wind():
    n = int(SR * 0.55)
    t = np.arange(n) / SR
    x = noise(n)
    c = 400 + 2200 * np.sin(np.pi * t / 0.55)
    y = lowpass(x, c) * np.sin(np.pi * t / 0.55)
    return normalize(y, 0.6)


def sfx_dash():
    n = int(SR * 0.25)
    t = np.arange(n) / SR
    y = lowpass(noise(n), 800 + 5000 * t / 0.25) * env(n, 0.01, 0.05, 0.6, 0.15)
    return normalize(y, 0.55)


def sfx_hurt():
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (300 - 400 * t) * t) * expdec(n, 10)
    y += lp_fast(noise(n), 1200) * expdec(n, 20) * 0.6
    return normalize(y, 0.65)


def sfx_hit():
    n = int(SR * 0.09)
    y = lp_fast(noise(n), 2500) * expdec(n, 45) + np.sin(2 * np.pi * 180 * t_(0.09)) * expdec(n, 40) * 0.6
    return normalize(y, 0.5)


def sfx_death():
    n = int(SR * 0.22)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (220 + 600 * np.exp(-t * 30)) * t) * expdec(n, 18)
    y += hp(noise(n), 2000) * expdec(n, 30) * 0.4
    return normalize(y, 0.5)


def sfx_xp():
    return normalize(add(bell(1568, 0.35, 0.8, 2.0), bell(2093, 0.3, 0.5, 2.0) * 0.5), 0.4)


def sfx_heal():
    out = np.zeros(int(SR * 0.8))
    for i, m in enumerate((72, 76, 79, 84)):
        b = bell(mtof(m), 0.6, 1.0, 2.0) * 0.4
        at = int(i * 0.07 * SR)
        out[at:at + len(b)] += b[:len(out) - at]
    return normalize(out, 0.55)


def sfx_card_open():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    y = lowpass(noise(n), 300 + 4000 * t / 0.6) * env(n, 0.3, 0.1, 0.5, 0.2) * 0.6
    y = add(y, bell(mtof(74), 0.6, 1.5, 3.0) * 0.4)
    return normalize(y, 0.55)


def sfx_card_select():
    return normalize(add(bell(mtof(81), 0.5, 1.2, 2.0), bell(mtof(86), 0.45, 1.0, 2.0) * 0.6), 0.55)


def sfx_rare():
    out = np.zeros(int(SR * 1.0))
    for i, m in enumerate((69, 73, 76, 81)):
        b = bell(mtof(m), 0.8, 2.0, 2.5) * 0.35
        at = int(i * 0.09 * SR)
        out[at:at + len(b)] += b[:len(out) - at]
    return normalize(out, 0.6)


def sfx_legendary():
    out = np.zeros(int(SR * 2.0))
    for i, m in enumerate((62, 69, 74, 78, 81, 86)):
        b = bell(mtof(m), 1.5, 2.5, 2.0) * 0.3
        at = int(i * 0.1 * SR)
        out[at:at + len(b)] += b[:len(out) - at]
    p = pad(mtof(50), 2.0, 1200)
    out += p[:len(out)] * 0.4
    return normalize(out, 0.7)


def sfx_anchor():
    out = np.zeros(int(SR * 2.5))
    t = t_(2.5)
    rise = lowpass(noise(len(t)), 200 + 2500 * (t / 2.5) ** 2) * (t / 2.5) * 0.5
    out += rise
    b = bell(mtof(62), 2.0, 3.0, 1.5)
    at = int(1.2 * SR)
    out[at:] += b[:len(out) - at] * 0.6
    k = kick(0.6)
    out[at:at + len(k)] += k * 0.8
    return normalize(out, 0.7)


def sfx_levelup():
    out = np.zeros(int(SR * 0.9))
    for i, m in enumerate((67, 71, 74, 79)):
        b = bell(mtof(m), 0.5, 1.2, 2.0) * 0.4
        at = int(i * 0.06 * SR)
        out[at:at + len(b)] += b[:len(out) - at]
    return normalize(out, 0.6)


def sfx_pulse():
    n = int(SR * 0.8)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (60 + 90 * np.exp(-t * 10)) * t) * expdec(n, 5)
    fire = lowpass(noise(n), 600 + 2500 * np.exp(-t * 3)) * expdec(n, 4) * 0.7
    return normalize(boom + fire, 0.8)


def sfx_explosion():
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    y = lowpass(noise(n), 300 + 3000 * np.exp(-t * 8)) * expdec(n, 6)
    y += np.sin(2 * np.pi * 55 * t) * expdec(n, 8) * 0.7
    return normalize(y, 0.75)


def sfx_roar():
    n = int(SR * 1.4)
    t = np.arange(n) / SR
    f = 70 + 20 * np.sin(t * 9)
    y = lp_fast(saw(f, t) + saw(f * 1.5, t) * 0.5, 600) * env(n, 0.15, 0.3, 0.8, 0.5)
    y += lowpass(noise(n), 500) * env(n, 0.1, 0.3, 0.6, 0.5) * 0.6
    return normalize(y, 0.8)


def sfx_land():
    n = int(SR * 0.8)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (35 + 80 * np.exp(-t * 15)) * t) * expdec(n, 5)
    y += lowpass(noise(n), 400) * expdec(n, 6) * 0.8
    return normalize(y, 0.85)


def sfx_warn():
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 932 * t)) * env(n, 0.01, 0.1, 0.5, 0.2) * 0.4
    return normalize(y, 0.4)


def sfx_ui_hover():
    return normalize(bell(mtof(88), 0.12, 0.6, 2.0), 0.25)


def sfx_ui_click():
    n = int(SR * 0.08)
    y = np.sin(2 * np.pi * 900 * t_(0.08)) * expdec(n, 50) + hp(noise(n), 3000) * expdec(n, 80) * 0.3
    return normalize(y, 0.35)


def sfx_orb():
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (600 - 300 * t / 0.3) * t) * env(n, 0.02, 0.1, 0.5, 0.15)
    return normalize(y, 0.4)


def sfx_summon():
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * t * (1 + 0.3 * t)) for f in (300, 450, 610)) * env(n, 0.2, 0.2, 0.5, 0.4) / 3
    y += hp(noise(n), 5000) * env(n, 0.2, 0.2, 0.3, 0.4) * 0.3
    return normalize(y, 0.55)


def sfx_armor_break():
    out = sfx_glass() * 0.7
    k = kick(0.4)
    out[:len(k)] += k * 0.6
    return normalize(out, 0.75)


def main():
    write('sfx_arrow', sfx_arrow())
    write('sfx_fire', sfx_fire())
    write('sfx_lance', sfx_lance())
    write('sfx_thunder', sfx_thunder())
    write('sfx_glass', sfx_glass())
    write('sfx_wind', sfx_wind())
    write('sfx_dash', sfx_dash())
    write('sfx_hurt', sfx_hurt())
    write('sfx_hit', sfx_hit())
    write('sfx_death', sfx_death())
    write('sfx_xp', sfx_xp())
    write('sfx_heal', sfx_heal())
    write('sfx_card_open', sfx_card_open())
    write('sfx_card_select', sfx_card_select())
    write('sfx_rare', sfx_rare())
    write('sfx_legendary', sfx_legendary())
    write('sfx_anchor', sfx_anchor())
    write('sfx_levelup', sfx_levelup())
    write('sfx_pulse', sfx_pulse())
    write('sfx_explosion', sfx_explosion())
    write('sfx_roar', sfx_roar())
    write('sfx_land', sfx_land())
    write('sfx_warn', sfx_warn())
    write('sfx_ui_hover', sfx_ui_hover())
    write('sfx_ui_click', sfx_ui_click())
    write('sfx_orb', sfx_orb())
    write('sfx_summon', sfx_summon())
    write('sfx_armor_break', sfx_armor_break())
    write('music_victory', music_sting(True), stereo=True)
    write('music_defeat', music_sting(False), stereo=True)
    write('music_menu', music_menu(), stereo=True, q=3)
    write('music_combat', music_combat(False), stereo=True, q=3)
    write('music_boss', music_combat(True), stereo=True, q=3)


if __name__ == '__main__':
    main()
