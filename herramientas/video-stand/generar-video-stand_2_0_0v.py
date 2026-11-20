#!/usr/bin/env python3
# Genera el video para dejar en loop en el stand: captura cada diapositiva de slides_2_0_0v.html con Chrome (headless)
# y las une con ffmpeg (movimiento suave + transiciones). Las diapositivas 1 y 11 llevan de fondo, desenfocado, un tramo del trailer.
# Uso:  python generar-video-stand_2_0_0v.py [salida.mp4]
# Requisitos: Google Chrome y ffmpeg en el PATH (o editar las rutas de abajo). Salida por defecto: docs/Video-Stand-FAFI-1.6_2_0_0v.mp4
import os, subprocess, sys, shutil, tempfile, pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SALIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'docs' / 'Video-Stand-FAFI-1.6_2_0_0v.mp4'
TRAILER = RAIZ / 'docs' / 'Trailer-FAFI-1.6_2_0_0v.mp4'
CHROME = os.environ.get('CHROME') or next((p for p in [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe', shutil.which('google-chrome') or '', shutil.which('chromium') or ''] if p and os.path.exists(p)), None)
FFMPEG = shutil.which('ffmpeg') or 'ffmpeg'
FPS, W, H, FADE = 30, 1920, 1080, 0.6

# (número de diapositiva, duración en segundos, inicio del trailer si lleva video de fondo)
SLIDES = [(1, 9, 8), (2, 8, None), (3, 9, None), (4, 9, None), (5, 7, None), (6, 9, None), (7, 8, None), (8, 10, None), (9, 10, None), (10, 11, None), (11, 10, 96)]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: raise SystemExit('Falló: ' + ' '.join(map(str, cmd[:3])) + '\n' + r.stderr[-1500:])

def main():
    if not CHROME: raise SystemExit('No se encontró Chrome: definí la variable CHROME con la ruta de chrome.exe')
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='fafi_video_'))
    html = (AQUI / 'slides_2_0_0v.html').resolve().as_uri()
    for n, _, _ in SLIDES:
        png = tmp / f's{n}.png'
        run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000',
             f'--window-size={W},{H}', '--virtual-time-budget=4000', f'--screenshot={png}', f'{html}?s={n}'])
        print('captura', n, png.exists())
    idx = 0
    inputs2, filters2 = [], []
    for i, (n, d, ss) in enumerate(SLIDES):
        frames = int(d * FPS)
        if ss is None:
            inputs2 += ['-loop', '1', '-t', str(d + FADE), '-i', str(tmp / f's{n}.png')]
            z = "min(zoom+0.00035,1.06)" if i % 2 == 0 else "if(eq(on,1),1.06,max(zoom-0.00035,1.0))"
            filters2.append(f"[{idx}:v]scale=3840:-1,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames + int(FADE * FPS)}:s={W}x{H}:fps={FPS},format=yuv420p,setsar=1[v{i}]")
            idx += 1
        else:
            inputs2 += ['-ss', str(ss), '-t', str(d + FADE), '-i', str(TRAILER), '-loop', '1', '-t', str(d + FADE), '-i', str(tmp / f's{n}.png')]
            filters2.append(f"[{idx}:v]scale={W}:{H},fps={FPS},gblur=sigma=34,eq=brightness=-0.04:saturation=1.15,format=yuv420p[bg{i}];[{idx + 1}:v]scale={W}:{H},format=rgba[ov{i}];[bg{i}][ov{i}]overlay=format=auto,format=yuv420p,setsar=1[v{i}]")
            idx += 2
    # transiciones: cada clip dura d + FADE, y se solapa FADE con el siguiente
    chain, acc, total = '', '[v0]', SLIDES[0][1]
    for i in range(1, len(SLIDES)):
        out = f'[x{i}]'
        chain += f"{acc}[v{i}]xfade=transition=fade:duration={FADE}:offset={total}{out};"
        acc, total = out, total + SLIDES[i][1]
    filtro = ';'.join(filters2) + ';' + chain.rstrip(';')
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    run([FFMPEG, '-y', *inputs2, '-filter_complex', filtro, '-map', acc, '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(SALIDA)])
    shutil.rmtree(tmp, ignore_errors=True)
    print('Listo:', SALIDA, round(SALIDA.stat().st_size / 1e6, 1), 'MB')

if __name__ == '__main__':
    main()
