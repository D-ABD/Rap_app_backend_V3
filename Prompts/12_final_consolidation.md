À partir de tout ce que tu as analysé dans le projet, je veux maintenant un rapport final consolidé, unique, exhaustif, structuré pour prise de décision.

Règles :
- Ne modifie toujours aucun fichier.
- Ne code rien.
- Ne fais aucune correction directe.
- Tu synthétises uniquement ce que tu as réellement vérifié dans le code.

Je veux un document final structuré ainsi :

# RAPPORT FINAL CONSOLIDÉ

## 1. Périmètre d’analyse réel
- couverture réelle
- parties lues
- parties non lues
- confiance globale dans l’audit

## 2. Résumé exécutif
- état général
- maturité globale
- sécurité globale
- maintenabilité globale
- préparation frontend
- préparation production

## 3. Liste consolidée des problèmes
Classe-les par priorité :
### P0 - Bloquants absolus
### P1 - Critiques
### P2 - Importants
### P3 - Améliorations

Pour chaque point :
- identifiant
- gravité
- zone
- fichiers
- problème
- impact
- urgence
- recommandation sans coder

## 4. Décision backend
Réponds clairement :
- prêt pour développement frontend : oui/non/partiellement
- prêt pour production : oui/non/partiellement
- niveau de risque : faible/modéré/élevé/critique

## 5. Ce qui est déjà solide
## 6. Ce qui doit être stabilisé en priorité
## 7. Ordre de traitement recommandé
## 8. Conclusion nette

La conclusion doit être directe, ferme et exploitable.
Je ne veux pas une réponse diplomatique, je veux une réponse d’auditeur principal.
IMPORTANT - MODE AUDIT STRICT
Tu es en mode lecture seule.
Interdiction absolue de :
- modifier un fichier
- suggérer un patch appliqué
- réécrire directement du code
- faire semblant d’avoir vérifié un fichier non lu

Tu dois :
- citer les fichiers concernés
- différencier faits, hypothèses et doutes
- signaler explicitement toute zone non lue
- produire uniquement un rapport d’audit

EXIGENCE DE TRAÇABILITÉ
Chaque anomalie doit contenir :
- fichier exact
- fonction, classe ou bloc concerné
- extrait logique décrit en mots
- raison technique du problème
- impact concret
- niveau de sévérité
- recommandation sans modification