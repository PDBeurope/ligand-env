namespace Model {
    "use strict";

    /**
     * Interaction type
     *
     * @export
     * @enum {number}
     */
    export enum InteractionType {
        AtomAtom,
        AtomPlane,
        PlanePlane,
        GroupPlane,
        GroupGroup
    }


    /**
     * What environment should be used
     *
     * @export
     * @enum {number}
     */
    export enum Environment {
        Production,
        Development,
        Internal
    }

    export interface interactionTypeData {
        atom: string;
        residue: string;
        count: number; 
    }

    export interface aggregatedInteractionData{
        [key: string]: interactionTypeData[]
    }

    export class InteractionTypeUtil {
        public static parse(value: string) {
            if (value === 'atom_atom') return InteractionType.AtomAtom;
            else if (value === 'atom_plane') return InteractionType.AtomPlane;
            else if (value === 'plane_plane') return InteractionType.PlanePlane;
            else if (value === 'group_plane') return InteractionType.GroupPlane;
            else if (value === 'group_group') return InteractionType.GroupGroup;

            throw `Interaction type ${value} does not exist`;
        }
    }

    export class Interaction {
        sourceAtoms: string[];
        targetAtoms: string[];
        interactionType: InteractionType;
        interactionsClases: string[];
        distance: number;

        constructor(srcAtoms: string[], targetAtoms: string[], type: InteractionType, intClasses: string[], d: number) {
            this.sourceAtoms = srcAtoms;
            this.targetAtoms = targetAtoms;
            this.interactionType = type;
            this.interactionsClases = intClasses;
            this.distance = d;
        }
    }

    /**
     * Data model representing a single residue, which is a part of the
     * bound molecule. This residue is unique in the entire binding site.
     * @param {any} data 
     * @param {boolean} isLigand true if the residue is a ligand
     */
    export class Residue {
        id: string
        chainId: string;
        authorResidueNumber: number;
        chemCompId: string;
        authorInsertionCode: string;
        isLigand: boolean;

        constructor(data: any, isLigand: boolean) {
            this.chainId = data.chain_id;
            this.authorResidueNumber = data.author_residue_number;
            this.chemCompId = data.chem_comp_id;
            this.authorInsertionCode = data.author_insertion_code;
            this.id = `${this.chainId}${this.authorResidueNumber}${(this.authorInsertionCode === ' ' ? '' : this.authorInsertionCode)}`;
            this.isLigand = isLigand;
        }

        /**
         * Infer type of the residue, which is then used as a CSS source
         * for proper residue aesthetics.
         */
        public getResidueType(): string {
            if (this.isLigand) {
                return 'ligand';
            }

            if (this.chemCompId === 'HOH') {
                return 'water';
            }

            let code = ResidueProvider.getInstance().getAminoAcidAbbreviation(this.chemCompId);

            for (let [key, value] of Config.aaTypes) {
                if (value.includes(code)) {
                    return key;
                }
            }

            return 'other';
        }

        public equals(other: Residue): boolean {
            if (!(other instanceof Residue)) return false;

            return this.id === other.id;
        }

        public toString(): string {
            return this.id;
        }
    }

    export class InteractionNode implements d3.SimulationNodeDatum {
        id: string;
        residue: Residue;
        scale: number; // how is the node scaled up in comparison to its original size
        static: boolean // whether or not can be dragged and droped

        index?: number;
        x?: number;
        y?: number;
        vx?: number;
        vy?: number;
        fx?: number;
        fy?: number;

        constructor(r: Residue, scale: number, id: string, x: number = undefined, y: number = undefined) {
            this.residue = r;
            this.id = id;
            this.static = Boolean(scale < 1.0);
            this.scale = scale;

            if (x !== undefined) {
                this.fx = x;
                this.x = x;
            }
            if (y !== undefined) {
                this.fy = y;
                this.y = y;
            }
        }

        public equals(other: InteractionNode): boolean {
            if (!(other instanceof InteractionNode)) return false;

            return (this.id === other.id && this.fx == other.fx && this.fy == other.fy);
        }

        public toString(): string {
            let r = this.residue;
            let splitted = r.chainId.split('_');
            let chainStr = splitted[0];
            let symString = "";

            if (splitted.length > 1) { 
                symString = splitted[1] !== "1"? `[${splitted[1]}]` : "";
            }
          
            let str = `${r.chemCompId} | ${chainStr}${symString} | ${r.authorResidueNumber}${r.authorInsertionCode}`;
            
            return str;
        }

        public toTooltip(): string {
            return `<span>${this.toString()}</span>`;
        }
    }

    export abstract class Link {
        public source: InteractionNode;
        public target: InteractionNode;

        constructor(source: InteractionNode, target: InteractionNode) {
            this.source = source;
            this.target = target;
        }


        public containsBothNodes(a: InteractionNode, b: InteractionNode): boolean {
            let condA = this.source.equals(a) && this.target.equals(b);
            let condB = this.source.equals(b) && this.target.equals(a);

            return condA || condB;
        }


        public containsNode(node: InteractionNode) {
            return this.source.equals(node) || this.target.equals(node);
        }


        public containsResidue(n: Residue): boolean {
            return (this.target.residue.equals(n) || this.source.residue.equals(n));
        }

        public getOtherNode(node: InteractionNode) { 
            return this.source.equals(node) ? this.target : this.source;
        }

        abstract getLinkClass(): string;
        abstract hasClash(): boolean;
        abstract toTooltip(): string;
    }

    export class ResidueResidueLink extends Link {
        target: InteractionNode;
        source: InteractionNode
        interactions: Map<InteractionType, Array<string>>;

        constructor(source: InteractionNode, target: InteractionNode, interactions: any) {
            super(source, target);
            this.interactions = new Map<InteractionType, Array<string>>();

            Object.keys(interactions).forEach(x => {
                let intType = InteractionTypeUtil.parse(x);
                this.interactions.set(intType, interactions[x]);
            });
        }

        public hasClash(): boolean {
            this.interactions.forEach(x => {
                if (x.includes('clash')) {
                    return true
                }
            });
            return false;
        }

        public isBoundMoleculeLink(): boolean {
            return this.source.residue.isLigand && this.target.residue.isLigand && this.interactions.get(InteractionType.AtomAtom).includes('covalent');
        }

        public toTooltip(): string {
            let values = new Array<string>();

            for (let value of this.interactions.values()) {
                values = values.concat(value);
            }
            let result = values.reduce((x, y) => `${x}, ${y}`)
            return `<ul>${result}</ul>`
        }

        /**
         * Check all the interactions, which are a part of the contact
         * and determine their class. This is later on used for selection
         * of the correct aesthetics with CSS.
         */
        public getLinkClass(): string {
            if (this.isBoundMoleculeLink()) return 'ligand';

            // JS map preserves order of elements
            for (let [key, value] of Config.interactionsClasses) {
                for (let interactionDetails of this.interactions.values()) {
                    if (interactionDetails.filter(x => -1 !== value.indexOf(x)).length > 0) {
                        return key;
                    }
                }
            }
            return 'other';
        }
    }


    export class LigandResidueLink extends Link {
        interaction: Array<Interaction>;


        constructor(begin: InteractionNode, end: InteractionNode, beginAtoms: string[], endAtoms: string[],
            interactionType: string, interactionDetails: string[], distance: number) {

            super(begin, end);
            this.interaction = new Array<Interaction>();
            this.interaction.push(
                new Interaction(beginAtoms, endAtoms, InteractionTypeUtil.parse(interactionType.replace('-', '_')), interactionDetails, distance)
            );
        }

        public addInteraction(beginAtoms: string[], endAtoms: string[], interactionType: string, interactionDetails: string[], distance: number): void {
            this.interaction.push(
                new Interaction(beginAtoms, endAtoms, InteractionTypeUtil.parse(interactionType.replace('-', '_')), interactionDetails, distance)
            );
        }


        /**
         * Check all the interactions, which are a part of the contact
         * and determine their class. This is later on used for selection
         * of the correct aesthetics with CSS.
         */
        public getLinkClass(): string {
            // JS map preserves order of elements
            let allInteractions = this.interaction.map(x => x.interactionsClases).reduce((x, y) => x.concat(y));

            for (let [key, value] of Config.interactionsClasses) {
                if (allInteractions.filter(x => -1 !== value.indexOf(x)).length > 0) {
                    return key;
                }
            }
            return 'other';
        }

        public hasClash(): boolean {
            this.interaction.forEach(x => {
                x.interactionsClases.forEach(y => {
                    if (y.includes('clash')) {
                        return true
                    }
                });
            });
            return false;

        }

        public toTooltip() {
            let msg = new Set();
            let rProvider = ResidueProvider.getInstance();

            this.interaction.forEach(x => {
                let isMainChain = !this.target.residue.isLigand && x.targetAtoms.every(y => Config.backboneAtoms.includes(y));
                let targetAbbreviation = rProvider.getAminoAcidAbbreviation(this.target.residue.chemCompId);
                let isResidue = Boolean(targetAbbreviation !== 'X');
                let interactionFlag = '';

                if (isMainChain && isResidue) interactionFlag = 'backbone';
                else if (!isMainChain && isResidue) interactionFlag = 'side chain';
                else interactionFlag = 'ligand';

                msg.add(`<li><span>${interactionFlag}</span> interaction (<b>${x.targetAtoms}</b> | ${x.interactionsClases}): ${x.distance}Å</li>`);
            });

            return `<ul>${Array.from(msg.values()).join('\n')}</ul>`;
        }

    }


    /**
     * DataObject representing the entire binding site with the bound
     * molecule and all its interactions.
     */
    export class BindingSite {
        pdbId: string;
        bmId: string;

        residues: Residue[];
        interactionNodes: InteractionNode[];
        links: Link[];

        private tmpResidueSet: ObjectSet<Residue>;
        private tmpNodesSet: ObjectSet<InteractionNode>;

        constructor() {
            this.residues = new Array<Residue>();
            this.interactionNodes = new Array<InteractionNode>();
            this.links = new Array<Link>();
        }


        public fromBoundMolecule(pdbId: string, data: any): BindingSite {
            this.pdbId = pdbId;
            this.bmId = data.bm_id;

            this.tmpResidueSet = new ObjectSet<Residue>();
            this.tmpNodesSet = new ObjectSet<InteractionNode>();

            data.composition.ligands.forEach(x => this.tmpResidueSet.tryAdd(new Residue(x, true)));
            data.interactions.forEach(x => {
                let bgnNode = this.processResidueInteractionPartner(x.begin);
                let endNode = this.processResidueInteractionPartner(x.end);

                let link = new ResidueResidueLink(bgnNode, endNode, x.interactions);
                this.links.push(link);
            });

            let searchableNodes = Array.from(this.tmpNodesSet);
            data.composition.connections.forEach(pair => {
                let bgn = searchableNodes.find(x => x.residue.id === pair[0]);
                let end = searchableNodes.find(x => x.residue.id === pair[1]);

                let result = this.links.find(x => x.containsBothNodes(bgn, end));

                if (result === undefined) {
                    let link = new ResidueResidueLink(bgn, end, { 'atom_atom': ['covalent'] });
                    this.links.push(link);
                }
            });

            this.residues = Array.from(this.tmpResidueSet)
            this.interactionNodes = Array.from(this.tmpNodesSet);

            return this;
        }


        private processResidueInteractionPartner(r: any): InteractionNode {
            let residue = new Residue(r, false);
            residue = this.tmpResidueSet.tryAdd(residue);
            let node = new InteractionNode(residue, 1.0, residue.id);
            node = this.tmpNodesSet.tryAdd(node);

            return node;
        }


        private processLigandInteractionPartner(r: Residue, d: Depiction, atom_names: string[]): InteractionNode {
            let scale = 0.0;
            if (r.isLigand) scale = atom_names.length > 1 ? 0.5 : 0.0
            else scale = 1.0

            let center = d.getCenter(atom_names);
            let id = `${r.id}_${atom_names.sort().reduce((x, y) => x + "_" + y)}`;

            let node = new InteractionNode(r, scale, id, center.x, center.y);
            node = this.tmpNodesSet.tryAdd(node);

            return node;
        }


        public fromLigand(pdbId: string, data: any, ligand: Depiction): BindingSite {
            this.pdbId = pdbId;
            this.bmId = `${data.ligand.chem_comp_id}_${data.ligand.chain_id}_${data.ligand.author_residue_number}`;

            this.tmpResidueSet = new ObjectSet<Residue>();
            this.tmpNodesSet = new ObjectSet<InteractionNode>();
            let tmpLinks = new Array<LigandResidueLink>();

            let ligandResidue = new Residue(data.ligand, true);
            this.tmpResidueSet.tryAdd(ligandResidue);

            ligand.atoms.forEach(x => this.processLigandInteractionPartner(ligandResidue, ligand, [x.name]));

            data.interactions.forEach(x => {
                let bgnNode = this.processLigandInteractionPartner(ligandResidue, ligand, x.ligand_atoms);
                let endNode = this.processResidueInteractionPartner(x.end);

                if (bgnNode.residue.equals(endNode.residue)) {
                    this.tmpNodesSet.delete(endNode);
                    return; // we do not want to show 'self interactions'  
                }

                let tmpLink = tmpLinks.find(x => x.containsBothNodes(bgnNode, endNode));

                if (tmpLink !== undefined) {
                    tmpLink.addInteraction(x.ligand_atoms, x.end.atom_names, x.interaction_type, x.interaction_details, x.distance);
                } else {
                    let link = new LigandResidueLink(bgnNode, endNode, x.ligand_atoms, x.end.atom_names, x.interaction_type, x.interaction_details, x.distance);
                    tmpLinks.push(link);
                }
            });

            this.interactionNodes = Array.from(this.tmpNodesSet);
            this.links = this.filterOutAromaticAtomAtomInteractions(tmpLinks);

            return this;
        }

        /**
         * Filter out Aromatic atom atom interactions provided there is
         * an evidence of the same atom being part of the stacking information
         * 
         * This is for clarity purposes only.
         *
         * @private
         * @param {Array<LigandResidueLink>} src
         * @returns {Array<LigandResidueLink>}
         * @memberof BindingSite
         */
        private filterOutAromaticAtomAtomInteractions(src: Array<LigandResidueLink>): Array<LigandResidueLink> {
            let result = new Array<LigandResidueLink>();
            src.forEach((x: LigandResidueLink) => {
                let isAtomAtom = x.interaction.map(y => y.interactionType).every(z => z === InteractionType.AtomAtom);

                if (x.getLinkClass() === 'aromatic' && isAtomAtom) {
                    let targetAtoms = x.interaction.map(y => y.targetAtoms).reduce((a, b) => a.concat(b));
                    let otherInteractions = new Set(src.filter(y => y.target.equals(x.target)));
                    otherInteractions.delete(x);

                    let otherBoundAtoms = Array.from(otherInteractions)
                        .map(y => y.interaction)
                        .reduce((a, b) => a.concat(b))
                        .map(y => y.targetAtoms)
                        .reduce((a, b) => a.concat(b));

                    if (otherBoundAtoms.includes(targetAtoms[0])) {
                        return;
                    }
                }

                result.push(x);
            });

            return result;
        }
    }

    export class LigandIntx{
        data: aggregatedInteractionData;
        contactTypes: string[];
        filteredData: any;

        constructor(data: any, contactTypes:string[]){
            this.data = data;
            this.contactTypes = contactTypes;
            this.filteredData = this.getFilteredData();

        }

        private getFilteredData(){
            const filteredData = new Array();
            const dataContactTypes = Object.keys(this.data);
            if(this.contactTypes.includes('TOTAL')){
                for (const contactType of dataContactTypes){
                    filteredData.push(...this.data[contactType]);
                }
            }
            else{
                for (const contactType of this.contactTypes){
                    if (dataContactTypes.includes(contactType)){
                        filteredData.push(...this.data[contactType]);
                    }

            }
            }
            return filteredData
        }

        public getAtomIntxPropensity(){
            const atomCount = new Array();
            this.filteredData.reduce(function(acc, currentValue){
                if(!acc[currentValue.atom]){
                    acc[currentValue.atom] = {"atom": currentValue.atom, "count": 0};
                    atomCount.push(acc[currentValue.atom]);
                }
                acc[currentValue.atom].count += currentValue.count;
                return acc
            },{});

            const totalIntx = atomCount.reduce(function(acc, currentValue){
                acc += currentValue.count;
                return acc;
            }, 0)

            const atomPropensity = atomCount.map((x) => 
                ({"atom": x.atom,
                 "value": (x.count/totalIntx)*100
                })
                );

            return atomPropensity
            
        }
    }

    /**
     * Data model representing scale of a circles
     * Stores scale for radius and color
     */
    export class Scale{
        radiusScale: any;
        colorScale: any;

        constructor(radiusScale:any, colorScale:any){
            this.radiusScale = radiusScale;
            this.colorScale = colorScale;
        }
    
    }

    /**
     * Gradient object with three
     * level scales for circles to highlight
     * @param {any} weight
     * @param {string} colorScheme color to be used for generating gradient 
     */
    export class Gradient {
        weight: any;
        colorScheme: string;
    
        constructor(weight: any, colorScheme:string){
            this.weight = weight;
            this.colorScheme = colorScheme;
        }

        /**
         * Generates three level scales for the
         * Gradient object
         */
        public getScales(){

            const color = d3[`scheme${this.colorScheme}`][9];
            const weightMax = Number(d3.max(this.weight));
            const gradient = {firstScale: new Scale(d3.scaleLinear([0, weightMax], [20, 30]),
                d3.scaleLinear([0,weightMax], ["#FFFFFF", color[4]])),
                secondScale: new Scale(d3.scaleLinear([0,weightMax], [10, 20]),
                d3.scaleLinear([0, weightMax], [color[5], color[7]])),
                thirdScale: new Scale(d3.scaleLinear([0, weightMax], [2, 10]),
                d3.scaleLinear([0, weightMax], [color[8], color[9]]))

              };
            
              return gradient

        }

    }

}