#!/usr/bin/env python3
"""Ajoute une empreinte de contenu aux liens CSS/JS de index.html.

Sans cela, un navigateur qui a déjà visité le site garde l'ancien
css/style.css en cache et affiche la nouvelle page avec les anciens styles.
Le suffixe ?v=<empreinte> change dès que le fichier change, ce qui force le
téléchargement ; tant que le fichier ne bouge pas, le cache reste utilisé.

À relancer avant chaque mise en ligne (le script est idempotent : le
relancer sans avoir modifié le CSS ou le JS ne change rien).

Usage : python3 tools/cache_bust.py
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / 'index.html'

# Fichiers versionnés, tels qu'ils sont référencés dans index.html.
CIBLES = ['css/style.css', 'js/app.js']


def empreinte(chemin):
    return hashlib.sha256(chemin.read_bytes()).hexdigest()[:8]


def main():
    html = HTML.read_text(encoding='utf-8')
    avant = html
    resume = []

    for cible in CIBLES:
        fichier = ROOT / cible
        if not fichier.exists():
            sys.exit(f'introuvable : {cible}')

        v = empreinte(fichier)
        # Attrape le chemin avec ou sans ?v=… déjà présent.
        motif = re.compile(r'(["\'])' + re.escape(cible) + r'(?:\?v=[0-9a-f]+)?\1')
        html, n = motif.subn(lambda m: f'{m.group(1)}{cible}?v={v}{m.group(1)}', html)
        if n == 0:
            sys.exit(f'aucune référence à {cible} dans index.html')
        resume.append(f'{cible}?v={v}')

    if html == avant:
        print('index.html déjà à jour :')
    else:
        HTML.write_text(html, encoding='utf-8')
        print('index.html mis à jour :')
    for ligne in resume:
        print(f'  {ligne}')


if __name__ == '__main__':
    main()
