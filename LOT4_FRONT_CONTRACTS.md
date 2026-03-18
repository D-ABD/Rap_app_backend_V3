# LOT4_FRONT_CONTRACTS

Reference de contrat read/write stabilisee pour les ressources front critiques.

## Formations

- lecture liste : `FormationListSerializer`
- lecture detail : `FormationDetailSerializer`
- ecriture create : `FormationCreateSerializer`
- ecriture update : `FormationUpdateSerializer`
- note : le detail reste riche en champs calcules et relations ; l'update n'attend que les champs write.

## Users

- lecture liste/detail/me : `CustomUserSerializer`
- ecriture create : `CustomUserCreateSerializer`
- ecriture update : `CustomUserUpdateSerializer`
- note : les champs enrichis `formation_info`, `centres_info`, `centre`, `avatar_url` restent read-only.

## Documents

- lecture liste/detail : `DocumentSerializer`
- ecriture create : `DocumentCreateSerializer`
- ecriture update : `DocumentUpdateSerializer`
- note : les metadonnees enrichies formation/MIME/taille restent en lecture seule.

## Candidats

- lecture liste : `CandidatListSerializer`
- lecture detail : `CandidatSerializer`
- ecriture create/update : `CandidatCreateUpdateSerializer`
- note : le contrat write est deja distinct ; les champs sensibles restent controles par validation selon role.

## Prospections

- lecture liste : `ProspectionListSerializer`
- lecture detail : `ProspectionDetailSerializer`
- ecriture create/update : `ProspectionWriteSerializer`
- note : la reponse de create/update reste serializee en detail pour le front.

## Appairages

- lecture liste : `AppairageListSerializer`
- lecture detail : `AppairageSerializer`
- ecriture create/update : `AppairageCreateUpdateSerializer`
- note : le contrat write etait deja distinct ; il est garde comme reference explicite.

## Conclusion lot 4

Le principe retenu est uniforme :

- serializers de lecture riches pour le front
- serializers d'ecriture dedies pour limiter les champs attendus
- aucune rupture volontaire sur les payloads de reponse
- documentation et tests alignes sur le comportement reel
