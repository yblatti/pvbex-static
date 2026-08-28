#!/usr/bin/env python3
"""Convertit input/activites.xlsx (feuille "Global") en data/activites.json.

Le JSON produit est ensuite la source de vérité du site : on peut l'éditer
à la main sans repasser par l'Excel. Ne relancer ce script que pour repartir
d'un nouvel export Excel (il écrase data/activites.json).

Usage : python3 tools/xlsx_to_json.py
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / 'input' / 'activites.xlsx'
OUT = ROOT / 'data' / 'activites.json'

JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
# Colonnes de la feuille "Global"
COL_JOUR, COL_CAT, COL_TITRE, COL_DESC, COL_AGE = 1, 4, 5, 7, 12


def col_index(ref):
    letters = re.match(r'([A-Z]+)', ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(zf, name):
    strings = []
    for si in ET.fromstring(zf.read('xl/sharedStrings.xml')):
        strings.append(''.join(t.text or '' for t in si.iter(NS + 't')))

    rels = {r.get('Id'): r.get('Target')
            for r in ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))}
    target = None
    for sheet in ET.fromstring(zf.read('xl/workbook.xml')).find(NS + 'sheets'):
        if sheet.get('name') == name:
            target = rels[sheet.get(RNS + 'id')]
    if target is None:
        raise SystemExit(f'Feuille "{name}" introuvable dans {XLSX.name}')

    rows = []
    for row in ET.fromstring(zf.read('xl/' + target.lstrip('/'))).iter(NS + 'row'):
        cells = {}
        for c in row.iter(NS + 'c'):
            kind, v = c.get('t'), c.find(NS + 'v')
            if kind == 'inlineStr':
                value = ''.join(x.text or '' for x in c.iter(NS + 't'))
            elif v is None:
                continue
            elif kind == 's':
                value = strings[int(v.text)]
            else:
                value = v.text
            cells[col_index(c.get('r'))] = value
        rows.append(cells)
    return rows


def clean(text):
    return re.sub(r'\s+', ' ', (text or '').replace(' ', ' ')).strip()


def clean_titre(text):
    return clean(text).rstrip('. ')


def clean_age(text):
    age = clean(text)
    if not age or age.lower() == 'none':
        return ''
    age = re.sub(r'(\d)\s*à\s*(\d)', r'\1 à \2', age)
    if not age.lower().endswith('ans'):
        age += ' ans'
    return age


def main():
    with zipfile.ZipFile(XLSX) as zf:
        rows = read_sheet(zf, 'Global')

    activites, seen = [], set()
    jour_courant = ''
    for cells in rows[1:]:
        get = lambda i: clean(cells.get(i, ''))
        jour, titre, desc = get(COL_JOUR), clean_titre(cells.get(COL_TITRE, '')), get(COL_DESC)

        # Les lignes "En attente de réponse" / "En réserve" en bas de feuille
        # n'ont plus de jour : on s'arrête au dernier jour de la semaine.
        if jour in JOURS:
            jour_courant = jour
        elif jour_courant == JOURS[-1] and not titre:
            break

        if not titre or not desc:
            continue

        key = (titre.lower(), jour_courant, desc.lower())
        if key in seen:      # séances multiples de la même activité
            continue
        seen.add(key)

        activites.append({
            'titre': titre,
            'jour': jour_courant,
            'categorie': get(COL_CAT),
            'age': clean_age(cells.get(COL_AGE, '')),
            'description': desc,
        })

    activites.sort(key=lambda a: (JOURS.index(a['jour']), a['titre'].lower()))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({'annee': 2026, 'activites': activites},
                              ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ignorees = sum(1 for c in rows[1:] if clean_titre(c.get(COL_TITRE, '')) and not clean(c.get(COL_DESC, '')))
    print(f'{len(activites)} activités écrites dans {OUT.relative_to(ROOT)}', file=sys.stderr)
    if ignorees:
        print(f'{ignorees} ligne(s) ignorée(s) : titre sans description', file=sys.stderr)


if __name__ == '__main__':
    main()
