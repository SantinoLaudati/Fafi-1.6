#!/usr/bin/env python3
# Genera el fanzine en PDF con Chrome (headless) a partir de fanzine_2_0_0v.html:
#   docs/Fanzine-FAFI-1.6_2_0_0v.pdf            12 páginas A5, para leer en pantalla
#   docs/Fanzine-FAFI-1.6_imprimir_2_0_0v.pdf   6 caras A4 apaisadas, para imprimir a doble faz (borde corto) y engrapar al centro
# Uso: python generar-fanzine_2_0_0v.py
import os, pathlib, shutil, subprocess, sys

AQUI = pathlib.Path(__file__).resolve().parent
DOCS = AQUI.parent.parent / 'docs'
CHROME = os.environ.get('CHROME') or next((p for p in [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe', shutil.which('google-chrome') or '', shutil.which('chromium') or ''] if p and os.path.exists(p)), None)
if not CHROME: sys.exit('No se encontró Chrome: definí la variable CHROME con la ruta de chrome.exe')
html = (AQUI / 'fanzine_2_0_0v.html').resolve().as_uri()
trabajos = [('lectura', 'Fanzine-FAFI-1.6_2_0_0v.pdf', '148mm 210mm'), ('imprimir', 'Fanzine-FAFI-1.6_imprimir_2_0_0v.pdf', '297mm 210mm')]
for modo, nombre, tam in trabajos:
    # el tamaño de página se fija con una hoja de estilo inyectada por la URL (?m=) -> se resuelve en el propio HTML con @page
    salida = DOCS / nombre
    r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=6000', f'--print-to-pdf={salida}', f'{html}?m={modo}'], capture_output=True, text=True)
    print(modo, salida.exists(), round(salida.stat().st_size / 1e6, 2) if salida.exists() else r.stderr[-400:], 'MB')
