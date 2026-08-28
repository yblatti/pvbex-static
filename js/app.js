/* Passeport Vacances Bex — aperçu des activités.
   Aucune dépendance : la liste vient de data/activites.json. */
(function () {
  'use strict';

  var JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  /* Une couleur par thématique, dérivée de la palette du bandeau. */
  var COULEURS = {
    'Création':            { accent: '#FCB040', fonce: '#8a5605', tint: '#fef2de' },
    'Cuisine':            { accent: '#E4694A', fonce: '#93331c', tint: '#fceae5' },
    'Culture & Jeux':     { accent: '#7E6BB8', fonce: '#4b3b7d', tint: '#eeeaf8' },
    'Nature & Découverte': { accent: '#63B05E', fonce: '#33642f', tint: '#e8f4e7' },
    'Sensations':         { accent: '#2AA8C4', fonce: '#125d6f', tint: '#e2f2f7' },
    'Sport & Mouvement':  { accent: '#44C1BF', fonce: '#14625f', tint: '#e3f5f4' }
  };
  var DEFAUT = { accent: '#44C1BF', fonce: '#185E5D', tint: '#eef7f6' };

  var $ = function (sel) { return document.querySelector(sel); };

  var grille = $('#grille');
  var vide = $('#vide');
  var erreur = $('#erreur');
  var compteur = $('#compteur');
  var reset = $('#reset');
  var recherche = $('#recherche');
  var selectAge = $('#filtre-age');

  var activites = [];
  var filtres = { jour: '', categorie: '', age: '', texte: '' };

  /* Repli des accents en conservant la longueur, pour pouvoir surligner
     la correspondance dans le texte d'origine. */
  function replier(str) {
    return Array.prototype.map.call(str, function (ch) {
      var base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (base.charAt(0) || ch).toLowerCase();
    }).join('');
  }

  function bornesAge(texte) {
    var nombres = (texte || '').match(/\d+/g);
    if (!nombres) return null;
    return { min: +nombres[0], max: +nombres[nombres.length - 1] };
  }

  /* ---------- Rendu ---------- */

  function surligner(texte, requete) {
    var frag = document.createDocumentFragment();
    if (!requete) {
      frag.appendChild(document.createTextNode(texte));
      return frag;
    }
    var plat = replier(texte);
    var pos = 0;
    var trouve = plat.indexOf(requete);
    while (trouve !== -1) {
      frag.appendChild(document.createTextNode(texte.slice(pos, trouve)));
      var mark = document.createElement('mark');
      mark.textContent = texte.slice(trouve, trouve + requete.length);
      frag.appendChild(mark);
      pos = trouve + requete.length;
      trouve = plat.indexOf(requete, pos);
    }
    frag.appendChild(document.createTextNode(texte.slice(pos)));
    return frag;
  }

  function creerCarte(activite, requete) {
    var couleur = COULEURS[activite.categorie] || DEFAUT;

    var li = document.createElement('li');
    li.className = 'carte';
    li.style.setProperty('--accent', couleur.accent);
    li.style.setProperty('--accent-fonce', couleur.fonce);
    li.style.setProperty('--accent-tint', couleur.tint);

    if (activite.categorie) {
      var cat = document.createElement('p');
      cat.className = 'carte__cat';
      cat.textContent = activite.categorie;
      li.appendChild(cat);
    }

    var titre = document.createElement('h3');
    titre.className = 'carte__titre';
    titre.appendChild(surligner(activite.titre, requete));
    li.appendChild(titre);

    var meta = document.createElement('p');
    meta.className = 'carte__meta';
    [activite.jour, activite.age].forEach(function (valeur) {
      if (!valeur) return;
      var span = document.createElement('span');
      span.textContent = valeur;
      meta.appendChild(span);
    });
    if (meta.childNodes.length) li.appendChild(meta);

    var desc = document.createElement('p');
    desc.className = 'carte__desc';
    desc.id = 'desc-' + activite.id;
    desc.appendChild(surligner(activite.description, requete));
    li.appendChild(desc);

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'carte__plus';
    bouton.textContent = 'Lire la suite';
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-controls', desc.id);
    bouton.addEventListener('click', function () {
      var ouverte = li.classList.toggle('est-ouverte');
      bouton.setAttribute('aria-expanded', String(ouverte));
      bouton.textContent = ouverte ? 'Réduire' : 'Lire la suite';
    });
    li.appendChild(bouton);

    /* Le bouton n'a de sens que si le texte est effectivement tronqué. */
    requestAnimationFrame(function () {
      if (desc.scrollHeight <= desc.clientHeight + 1) bouton.hidden = true;
    });

    return li;
  }

  function correspond(activite) {
    if (filtres.jour && activite.jour !== filtres.jour) return false;
    if (filtres.categorie && activite.categorie !== filtres.categorie) return false;
    if (filtres.age && activite.bornes) {
      var age = +filtres.age;
      if (age < activite.bornes.min || age > activite.bornes.max) return false;
    }
    if (filtres.texte && activite.recherche.indexOf(filtres.texte) === -1) return false;
    return true;
  }

  function afficher() {
    var requete = filtres.texte;
    var resultats = activites.filter(correspond);

    var frag = document.createDocumentFragment();
    resultats.forEach(function (activite) {
      frag.appendChild(creerCarte(activite, requete));
    });
    grille.replaceChildren(frag);

    vide.hidden = resultats.length > 0;
    compteur.textContent = resultats.length === 0
      ? 'Aucune activité'
      : resultats.length + (resultats.length > 1 ? ' activités affichées' : ' activité affichée')
        + ' sur ' + activites.length;

    reset.hidden = !(filtres.jour || filtres.categorie || filtres.age || filtres.texte);
  }

  /* ---------- Filtres ---------- */

  function construireChips(conteneur, cle, valeurs, libelleTous) {
    var liste = document.createElement('div');
    liste.className = 'chips__liste';

    [''].concat(valeurs).forEach(function (valeur) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = valeur || libelleTous;
      chip.setAttribute('aria-pressed', String(filtres[cle] === valeur));
      chip.addEventListener('click', function () {
        filtres[cle] = filtres[cle] === valeur ? '' : valeur;
        Array.prototype.forEach.call(liste.children, function (autre, i) {
          var v = i === 0 ? '' : valeurs[i - 1];
          autre.setAttribute('aria-pressed', String(filtres[cle] === v));
        });
        afficher();
      });
      liste.appendChild(chip);
    });

    conteneur.appendChild(liste);
  }

  function construireFiltres() {
    var jours = JOURS.filter(function (jour) {
      return activites.some(function (a) { return a.jour === jour; });
    });
    var categories = [];
    activites.forEach(function (a) {
      if (a.categorie && categories.indexOf(a.categorie) === -1) categories.push(a.categorie);
    });
    categories.sort(function (a, b) { return a.localeCompare(b, 'fr'); });

    construireChips($('#filtre-jour'), 'jour', jours, 'Toute la semaine');
    construireChips($('#filtre-categorie'), 'categorie', categories, 'Toutes');

    var bornes = activites.map(function (a) { return a.bornes; }).filter(Boolean);
    var min = Math.min.apply(null, bornes.map(function (b) { return b.min; }));
    var max = Math.max.apply(null, bornes.map(function (b) { return b.max; }));
    for (var age = min; age <= max; age++) {
      var option = document.createElement('option');
      option.value = String(age);
      option.textContent = age + ' ans';
      selectAge.appendChild(option);
    }
  }

  /* ---------- Démarrage ---------- */

  function preparer(brut) {
    return brut
      .filter(function (a) { return a && a.titre; })
      .map(function (a, i) {
        return {
          id: i,
          titre: String(a.titre),
          jour: a.jour || '',
          categorie: a.categorie || '',
          age: a.age || '',
          description: a.description || '',
          bornes: bornesAge(a.age),
          recherche: replier([a.titre, a.categorie, a.description, a.jour].join(' '))
        };
      });
  }

  function debounce(fn, delai) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, delai);
    };
  }

  recherche.addEventListener('input', debounce(function () {
    filtres.texte = replier(recherche.value.trim());
    afficher();
  }, 120));

  reset.addEventListener('click', function () {
    filtres = { jour: '', categorie: '', age: '', texte: '' };
    recherche.value = '';
    selectAge.value = '';
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.chips__liste').forEach(function (liste) {
      liste.firstElementChild.setAttribute('aria-pressed', 'true');
    });
    afficher();
    recherche.focus();
  });

  selectAge.addEventListener('change', function () {
    filtres.age = selectAge.value;
    afficher();
  });

  fetch('data/activites.json', { cache: 'no-cache' })
    .then(function (reponse) {
      if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
      return reponse.json();
    })
    .then(function (donnees) {
      activites = preparer(donnees.activites || donnees);
      if (!activites.length) throw new Error('liste vide');
      construireFiltres();
      afficher();
    })
    .catch(function (e) {
      erreur.hidden = false;
      erreur.textContent = 'La liste des activités n’a pas pu être chargée. '
        + 'Merci de réessayer plus tard. (' + e.message + ')';
      compteur.textContent = '';
    });
})();
