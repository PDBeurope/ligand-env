namespace Resources {
    export const productionAPI: string = 'https://www.ebi.ac.uk/pdbe';
    export const devAPI: string = 'https://wwwdev.ebi.ac.uk/pdbe';
    export const intAPI: string = 'https://wwwint.ebi.ac.uk/pdbe';

    export const boundMoleculeURL: string = 'graph-api/pdb/bound_molecule_interactions';
    export const carbohydrateURL: string = 'graph-api/pdb/carbohydrate_polymer_interactions';
    export const boundLigandURL: string = 'graph-api/pdb/bound_ligand_interactions';
    export const compoundSummaryURL: string = 'api/pdb/compound/summary';
    export const componentLibraryURL: string = 'pdb-component-library/data/ligand-env';
    export const staticFilesURL: string = 'static/files/pdbechem_v2';

    export function glycanSymbolsAPI(env: Model.Environment) {
        let url = '';
        switch (env) {
            case Model.Environment.Internal:
            case Model.Environment.Development: {
                url = `${devAPI}/${componentLibraryURL}/pdb-snfg-visuals.xml`;
                break;
            }
            default: {
                url = `${productionAPI}/${componentLibraryURL}/pdb-snfg-visuals.xml`;
                break;
            }
        }

        return url;
    }


    export function hetMappingAPI(env: Model.Environment) {
        let url = '';
        switch (env) {
            case Model.Environment.Internal:
            case Model.Environment.Development: {
                url = `${devAPI}/${componentLibraryURL}/het_mapping.json`;
                break;
            }
            default: {
                url = `${productionAPI}/${componentLibraryURL}/het_mapping.json`;
                break;
            }
        }

        return url;
    }


    export function ligEnvCSSAPI(env: Model.Environment) {
        let url = '';
        switch (env) {
            case Model.Environment.Internal:
            case Model.Environment.Development: {
                url = `${devAPI}/pdb-component-library/css/pdb-ligand-env-svg.css`;
                break;
            }
            default: {
                url = `${productionAPI}/pdb-component-library/css/pdb-ligand-env-svg.css`;
                break;
            }
        }

        return url;
    }


    export function ligandAnnotationAPI(ligandName: string, env: Model.Environment): string {
        let url = '';
        switch (env) {
            case Model.Environment.Production: {
                url = `${productionAPI}/${staticFilesURL}/${ligandName}/annotation`;
                break;
            }
            case Model.Environment.Development:
            case Model.Environment.Internal:
                url = `${devAPI}/${staticFilesURL}/${ligandName}/annotation`;
        }

        return url;
    }


    export function boundMoleculeAPI(pdbId: string, bmId: string, env: Model.Environment): string {
        let url = '';
        switch (env) {
            case Model.Environment.Development: {
                url = `${devAPI}/${boundMoleculeURL}/${pdbId}/${bmId}`;
                break;
            }
            case Model.Environment.Internal: {
                url = `${intAPI}/${boundMoleculeURL}/${pdbId}/${bmId}`;
                break;
            }
            default:
                url = `${productionAPI}/${boundMoleculeURL}/${pdbId}/${bmId}`;
                break;
        }

        return url;
    }


    export function carbohydratePolymerAPI(pdbId: string, bmId: string, entityId: string, env: Model.Environment): string {
        let url = '';
        switch (env) {
            case Model.Environment.Development: {
                url = `${devAPI}/${carbohydrateURL}/${pdbId}/${bmId}/${entityId}`;
                break;
            }
            case Model.Environment.Internal: {
                url = `${intAPI}/${carbohydrateURL}/${pdbId}/${bmId}/${entityId}`;
                break;
            }
            default:
                url = `${productionAPI}/${carbohydrateURL}/${pdbId}/${bmId}/${entityId}`;
                break;

        }

        return url;
    }

    /**
     * Retrieve ligand interactions URL given the environment
     *
     * @export
     * @param {string} pdbId
     * @param {string} chainId
     * @param {number} resId
     * @param {Model.Environment} env
     * @returns
     */
    export function ligandInteractionsAPI(pdbId: string, chainId: string, resId: number, env: Model.Environment) {
        let url = '';
        switch (env) {
            case Model.Environment.Development: {
                url = `${devAPI}/${boundLigandURL}/${pdbId}/${chainId}/${resId}`;
                break;
            }
            case Model.Environment.Internal: {
                url = `${intAPI}/${boundLigandURL}/${pdbId}/${chainId}/${resId}`;
                break;
            }
            default:
                url = `${productionAPI}/${boundLigandURL}/${pdbId}/${chainId}/${resId}`;
                break;

        }
        return url;
    }

    /**
     * Return residue type URL API
     *
     * @export
     * @param {string} chemCompId
     * @param {Model.Environment} env
     * @returns {string}
     */
    export function residueTypeAPI(chemCompId: string, env: Model.Environment): string {
        let url = '';
        switch (env) {
            case Model.Environment.Development: {
                url = `${devAPI}/${compoundSummaryURL}/${chemCompId}`;
                break;
            }
            case Model.Environment.Internal: {
                url = `${intAPI}/${compoundSummaryURL}/${chemCompId}`;
                break;
            }
            default:
                url = `${productionAPI}/${compoundSummaryURL}/${chemCompId}`;
                break;
        }
        return url;
    }
}
