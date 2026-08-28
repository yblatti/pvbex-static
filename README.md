# pvbex.ch — Passeport Vacances Bex

Site statique (HTML / CSS / JS uniquement). Aucun backend, aucune base de
données, aucun CDN : polices et images sont vendorisées dans `assets/`.

## Structure

```
index.html              page unique
css/style.css           styles + @font-face (polices locales)
js/app.js               chargement du JSON, filtres, recherche
data/activites.json     ← la liste des activités (à mettre à jour)
assets/fonts/           Fredoka + Nunito (woff2, sous-ensembles latin)
assets/img/header.png   bandeau
assets/img/favicon.svg
assets/ics/              fichiers « ajouter au calendrier » (.ics)
tools/xlsx_to_json.py   régénère data/activites.json depuis input/activites.xlsx
input/                  sources de travail (non publiées)
```

## Mettre à jour la liste des activités

Éditer directement `data/activites.json`, puis recharger la page.

```json
{
  "annee": 2026,
  "activites": [
    {
      "titre": "TrekkMines",
      "jour": "Lundi",
      "categorie": "Nature & Découverte",
      "age": "8 à 16 ans",
      "description": "Pars à l'aventure pour découvrir…"
    }
  ]
}
```

- `titre` et `description` sont les seuls champs obligatoires.
- `jour` : `Lundi` … `Vendredi` — alimente le filtre par jour.
- `categorie` : alimente le filtre thématique et la couleur de la carte.
  Les couleurs connues sont définies dans `js/app.js` (`COULEURS`) ;
  une thématique inconnue reçoit la couleur par défaut.
- `age` : texte libre, les deux nombres qu'il contient servent au filtre
  (« 8 à 16 ans » → de 8 à 16). Peut être vide.

Pour repartir d'un nouvel export Excel (écrase le JSON) :

```sh
python3 tools/xlsx_to_json.py
```

## Prévisualiser en local

Le JSON est chargé avec `fetch()`, il faut donc un serveur (l'ouverture
directe du fichier en `file://` est bloquée par le navigateur) :

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

## Ajouter au calendrier

Deux fichiers `.ics` statiques, liés depuis les encarts d'infos pratiques :

- `assets/ics/passeport-vacances-bex-2026.ics` — la semaine (19 → 23 octobre,
  événement sur la journée entière) ;
- `assets/ics/vente-passeports-2026.ics` — la vente (16 septembre, 14h–17h,
  fuseau Europe/Zurich).

Ils sont écrits à la main : penser à les mettre à jour en même temps que les
dates de `index.html`, et à changer les `UID` (`…-2026@pvbex.ch`) d'une année
à l'autre, sinon les agendas qui ont déjà l'événement le remplaceront.

## Mise en ligne

Copier le contenu du dépôt à la racine du site, à l'exception de `input/`
et `tools/`. Aucune configuration serveur particulière n'est nécessaire, à
un détail près : le serveur doit servir les `.ics` en `text/calendar` (c'est
le cas par défaut de nginx, Apache et des hébergeurs statiques courants).
Sinon les navigateurs afficheront le fichier au lieu de l'ouvrir dans
l'agenda.
