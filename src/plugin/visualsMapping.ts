/**
 * Provider of glycan depictions for a given hetcode. Uses two external
 * resources. One configuration XML with the glycan classes and their
 * depictions and a file providing mapping between glycan class and het
 * codes.
 *
 * @class VisualsMapper
 */
class VisualsMapper {

    public glycanImages: Map<string, SVGElement>;
    public glycanMapping: Map<string, string>;
    public graphicsPromise: Promise<void>;
    public mappingPromise: Promise<void>;


    constructor(env: Model.Environment) {
        this.glycanMapping = new Map<string, string>();
        this.glycanImages = new Map<string, SVGElement>();

        let symbolsUrl = Resources.glycanSymbolsAPI(env);
        let mappingUrl = Resources.hetMappingAPI(env);

        this.graphicsPromise = this.parseSymbols(symbolsUrl);
        this.mappingPromise = this.parseGlycanMapping(mappingUrl);
    }

    /**
     * Gets proper glycan in the SVG format based on teh glycan class.
     *
     * @param {string} compId Class id.
     * @returns {SVGElement} glycan representation in the SVG format.
     * @memberof GlycanMapper
     */
    public getGlycanImage(compId: string): SVGElement {
        return this.glycanMapping.has(compId) ? this.glycanImages.get(this.glycanMapping.get(compId)) : new SVGElement();
    }



    /**
     * Parse external file with glycan representation and stores it for
     * further use.
     *
     * @private
     * @param {string} symbolsLink external link to the XML mapping file.
     * @returns {Promise} To check later if it has been processed.
     * @memberof GlycanMapper 
     */
    private async parseSymbols(symbolsLink: string) {
        return d3.xml(symbolsLink).then(x => {
            let parsedImages: any = x.documentElement.getElementsByTagName('glycans')[0].getElementsByTagName('g');
            for (let img of parsedImages) {
                this.glycanImages.set(img.getAttribute('name'), img.outerHTML);
            }
        });
    }


    /**
     * Parses an external JSON configuration file which provides a mapping
     * between glycan id (e.g. GlcA) and het codes.
     */
    private async parseGlycanMapping(mappingLink: string) {
        return d3.json(mappingLink).then((i: Array<{}>) => {
            i.forEach(glycan => glycan['het_codes'].forEach(x => this.glycanMapping.set(x, glycan['name']))
            );
        });
    }
}