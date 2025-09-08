'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">frontend documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AppComponent.html" data-type="entity-link" >AppComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CaisseComponent.html" data-type="entity-link" >CaisseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CatalogueProduitComponent.html" data-type="entity-link" >CatalogueProduitComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ClientsComponent.html" data-type="entity-link" >ClientsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ConnexionComponent.html" data-type="entity-link" >ConnexionComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/EntreesSortiesComponent.html" data-type="entity-link" >EntreesSortiesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/EspaceVendeursComponent.html" data-type="entity-link" >EspaceVendeursComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FinanceComponent.html" data-type="entity-link" >FinanceComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FournisseursComponent.html" data-type="entity-link" >FournisseursComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GerantComponent.html" data-type="entity-link" >GerantComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MagasinComponent.html" data-type="entity-link" >MagasinComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MagazinComponent.html" data-type="entity-link" >MagazinComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OverviewComponent.html" data-type="entity-link" >OverviewComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ParametresComponent.html" data-type="entity-link" >ParametresComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RapportsComponent.html" data-type="entity-link" >RapportsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RapportsFinanciersComponent.html" data-type="entity-link" >RapportsFinanciersComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RapportsStocksComponent.html" data-type="entity-link" >RapportsStocksComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RapportsVentesComponent.html" data-type="entity-link" >RapportsVentesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RolesPermissionsComponent.html" data-type="entity-link" >RolesPermissionsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/StockInventairesComponent.html" data-type="entity-link" >StockInventairesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/StructureComponent.html" data-type="entity-link" >StructureComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/UserComponent.html" data-type="entity-link" >UserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/VentesComponent.html" data-type="entity-link" >VentesComponent</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AnalyseEcart.html" data-type="entity-link" >AnalyseEcart</a>
                            </li>
                            <li class="link">
                                <a href="classes/ArticlePanier.html" data-type="entity-link" >ArticlePanier</a>
                            </li>
                            <li class="link">
                                <a href="classes/Bon.html" data-type="entity-link" >Bon</a>
                            </li>
                            <li class="link">
                                <a href="classes/Categorie.html" data-type="entity-link" >Categorie</a>
                            </li>
                            <li class="link">
                                <a href="classes/CategorieProduits.html" data-type="entity-link" >CategorieProduits</a>
                            </li>
                            <li class="link">
                                <a href="classes/Client.html" data-type="entity-link" >Client</a>
                            </li>
                            <li class="link">
                                <a href="classes/Depense.html" data-type="entity-link" >Depense</a>
                            </li>
                            <li class="link">
                                <a href="classes/Fournisseur.html" data-type="entity-link" >Fournisseur</a>
                            </li>
                            <li class="link">
                                <a href="classes/Magasin.html" data-type="entity-link" >Magasin</a>
                            </li>
                            <li class="link">
                                <a href="classes/ModePaiement.html" data-type="entity-link" >ModePaiement</a>
                            </li>
                            <li class="link">
                                <a href="classes/MouvementsStock.html" data-type="entity-link" >MouvementsStock</a>
                            </li>
                            <li class="link">
                                <a href="classes/Operation.html" data-type="entity-link" >Operation</a>
                            </li>
                            <li class="link">
                                <a href="classes/Paiement.html" data-type="entity-link" >Paiement</a>
                            </li>
                            <li class="link">
                                <a href="classes/Panier.html" data-type="entity-link" >Panier</a>
                            </li>
                            <li class="link">
                                <a href="classes/Permission.html" data-type="entity-link" >Permission</a>
                            </li>
                            <li class="link">
                                <a href="classes/Produit.html" data-type="entity-link" >Produit</a>
                            </li>
                            <li class="link">
                                <a href="classes/Produits.html" data-type="entity-link" >Produits</a>
                            </li>
                            <li class="link">
                                <a href="classes/Recette.html" data-type="entity-link" >Recette</a>
                            </li>
                            <li class="link">
                                <a href="classes/Reconciliation.html" data-type="entity-link" >Reconciliation</a>
                            </li>
                            <li class="link">
                                <a href="classes/Role.html" data-type="entity-link" >Role</a>
                            </li>
                            <li class="link">
                                <a href="classes/Stock.html" data-type="entity-link" >Stock</a>
                            </li>
                            <li class="link">
                                <a href="classes/Structure.html" data-type="entity-link" >Structure</a>
                            </li>
                            <li class="link">
                                <a href="classes/Transfert.html" data-type="entity-link" >Transfert</a>
                            </li>
                            <li class="link">
                                <a href="classes/User.html" data-type="entity-link" >User</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AdminService.html" data-type="entity-link" >AdminService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ApplicationService.html" data-type="entity-link" >ApplicationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ClientsService.html" data-type="entity-link" >ClientsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FournisseursService.html" data-type="entity-link" >FournisseursService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MaagasinsService.html" data-type="entity-link" >MaagasinsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MouvementsStockService.html" data-type="entity-link" >MouvementsStockService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ParametresService.html" data-type="entity-link" >ParametresService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProduitsService.html" data-type="entity-link" >ProduitsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RapportsFinanciersService.html" data-type="entity-link" >RapportsFinanciersService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ReconciliationService.html" data-type="entity-link" >ReconciliationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RolePermissionsService.html" data-type="entity-link" >RolePermissionsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/StockInventaireService.html" data-type="entity-link" >StockInventaireService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/StructureService.html" data-type="entity-link" >StructureService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UserService.html" data-type="entity-link" >UserService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/VentesService.html" data-type="entity-link" >VentesService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interceptors-links"' :
                            'data-bs-target="#xs-interceptors-links"' }>
                            <span class="icon ion-ios-swap"></span>
                            <span>Interceptors</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="interceptors-links"' : 'id="xs-interceptors-links"' }>
                            <li class="link">
                                <a href="interceptors/AuthInterceptor.html" data-type="entity-link" >AuthInterceptor</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AnalyseCoutsBenefices.html" data-type="entity-link" >AnalyseCoutsBenefices</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompteResultat.html" data-type="entity-link" >CompteResultat</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EtatFinancier.html" data-type="entity-link" >EtatFinancier</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FluxTresorerie.html" data-type="entity-link" >FluxTresorerie</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParametreConfiguration.html" data-type="entity-link" >ParametreConfiguration</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PrevisionsFinancieres.html" data-type="entity-link" >PrevisionsFinancieres</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Role.html" data-type="entity-link" >Role</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RolePermission.html" data-type="entity-link" >RolePermission</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UserRole.html" data-type="entity-link" >UserRole</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Utilisateur.html" data-type="entity-link" >Utilisateur</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});