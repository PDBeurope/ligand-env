/**
 * Singleton instance to provide residue abbreviations to the component
 *
 * @class ResidueProvider
 */
class ResidueProvider {
    private static instance: ResidueProvider;
    private environment: Model.Environment;
    private mapping: Map<string, string>;
    public downloadPromises: Array<Promise<any>>;


    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     * @memberof ResidueProvider
     */
    private constructor(env: Model.Environment) {
        this.environment = env;
        this.mapping = new Map<string, string>(Config.aaAbreviations);
        this.downloadPromises = new Array<Promise<any>>();
    }


    /**
     * The static method that controls the access to the singleton instance.
     *
     * This implementation let you subclass the Singleton class while keeping
     * just one instance of each subclass around.
     *
     * @static
     * @returns {ResidueProvider}
     * @memberof ResidueProvider
     */
    public static getInstance(env: Model.Environment = Model.Environment.Production): ResidueProvider {
        if (!ResidueProvider.instance) {
            ResidueProvider.instance = new ResidueProvider(env);
        }

        return ResidueProvider.instance;
    }


    /**
     * Get single letter abbreviation of the ligand.
     *
     * @param {string} name Name of the chemical compound
     * @returns Single letter abbreviation of the ligand
     * @memberof ResidueProvider
     */
    public getAminoAcidAbbreviation(name: string): string {
        return this.mapping.has(name) ? this.mapping.get(name) : undefined;
    }


    /**
     * Fetch single letter abbreviations from API if they are not present
     *
     * @param {string} n
     * @returns
     * @memberof ResidueProvider
     */
    public downloadAnnotation(r: Model.Residue): void {
        if (this.mapping.has(r.chemCompId) || r.isLigand) return;

        let url = Resources.residueTypeAPI(r.chemCompId, this.environment);
        let res = d3.json(url).then(x => {
            let code = x[r.chemCompId][0].one_letter_code;
            this.mapping.set(r.chemCompId, code);

            return code;
        });

        this.downloadPromises.push(res);
    }
}