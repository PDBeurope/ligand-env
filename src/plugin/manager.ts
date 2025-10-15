import { select, type Selection } from 'd3-selection';
import { zoom, type ZoomBehavior, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import {
  forceSimulation, forceLink as d3ForceLink, forceManyBody,
  forceCollide, forceCenter, type Simulation
} from 'd3-force';
import { min, max } from 'd3-array';
import { json, text } from 'd3-fetch';
import { Atom, Depiction, Vector2D } from './depiction';
import * as Model from './model';
import { VisualsMapper } from './visualsMapping';
import { UI } from './ui';
import * as Resources from './resources';
import * as Config from './config';
import { ResidueProvider } from './residuefactory';

/**
 * This class contains methods for creating all the visualization
 * components of the LigandEnv
 *
 * @class Visualization
 * @param {HTMLElement} element HTMLElement to display the visualization
 * @param {Config.UIParameters} uiParameters UI parameter configurations
 * @param {string} env environment to fetch data from
 * 
 */
export class Visualization {
    // component related
    private parent: HTMLElement;
    private uiParameters: Config.UIParameters | undefined;
    private renderMessageEl?: HTMLElement;

    // #region svg properties
    private simulation!: Simulation<Model.InteractionNode, Model.Link>;
    private svg: Selection<SVGSVGElement, unknown, any, any>;
    private canvas: Selection<SVGGElement, unknown, HTMLElement, any>;

    private depictionRoot: Selection<SVGGElement, unknown, HTMLElement, any>;
    private nodesRoot!: Selection<SVGGElement, unknown, HTMLElement, any>;
    private linksRoot!: Selection<SVGGElement, unknown, HTMLElement, any>;

    private zoomHandler?: ZoomBehavior<SVGSVGElement, unknown>;

    private nodes: any;
    private links: any;
    // #endregion

    // #region data properties
    private environment: Model.Environment;
    private pdbId!: string;
    private bindingSites!: Model.BindingSite[];
    private presentBindingSite!: Model.BindingSite;
    private depiction?: Depiction;

    private visualsMapper!: VisualsMapper;
    private interactionsData: any;
    private ligandIntxData!: Model.aggregatedInteractionData;
    private selectedResidueHash!: string;
    private nodeDragged!: boolean;

    private rProvider!: ResidueProvider;

    public fullScreen!: boolean;
    // #endregion

    constructor(element: HTMLElement, uiParameters: Config.UIParameters | undefined = undefined, env: string = "production", depictionOnly: Boolean = false) {
        this.parent = element;
        this.environment = this.parseEnvironment(env);
        this.parent.style.cssText += "display: block; height: 100%; width: 100%; position: relative;";
        this.svg = select(this.parent)
                        .append('div')
                        .attr('id', 'pdb-lig-env-root')
                        .append('svg')
                        .style('background-color', 'white')
                        .attr('xmlns', 'http://www.w3.org/2000/svg')
                        .attr('width', '100%')
                        .attr('height', '100%');

        if (uiParameters?.zoom !== false) {
            this.zoomHandler = this.getZoomHandler();
            this.svg.call(this.zoomHandler);
            this.disableScrollControlsIfNeeded(uiParameters);
            this.disableScrollZoomIfNeeded(uiParameters);
        }

        this.addMarkers();
        this.canvas = this.svg.append('g').attr('id', 'vis-root');
        this.depictionRoot = this.canvas.append('g').attr('id', 'depiction');
        select(this.parent).on('resize', () => this.resize());

        //the below properties are only needed if interactivity with the component is needed. 
        if(!depictionOnly){
            this.visualsMapper = new VisualsMapper(this.environment);
            this.rProvider = ResidueProvider.getInstance(this.environment);
            this.bindingSites = new Array<Model.BindingSite>();
            this.fullScreen = false;
            this.nodeDragged = false;
            if (uiParameters === undefined) uiParameters = new Config.UIParameters(false);
            new UI(this.parent, this).register(uiParameters);
            this.linksRoot = this.canvas.append('g').attr('id', 'links');
            this.nodesRoot = this.canvas.append('g').attr('id', 'nodes');
            if (uiParameters.zoom) this.zoomHandler = this.getZoomHandler();

            document.addEventListener(Config.ligandHeatmapMouseoverEvent, e => this.ligHeatmapMouseoverEventHandler(e));
            document.addEventListener(Config.ligandHeatmapMouseoutEvent, e => this.ligHeatmapMouseoutEventHandler(e));
    
            document.addEventListener(Config.molstarClickEvent, e => this.molstarClickEventHandler(e));
            document.addEventListener(Config.molstarMouseoverEvent, e => this.molstarClickEventHandler(e)); 
            document.addEventListener(Config.molstarMouseoutEvent, () => this.molstarMouseoutEventHandler());

        }
        this.uiParameters = uiParameters;
        
        // this.addMarkers();
    }

    // #region event handlers
    private getZoomHandler(): ZoomBehavior<SVGSVGElement, unknown> {
        return zoom<SVGSVGElement, unknown>()
            .scaleExtent([1 / 10, 10])
            .on('zoom', (event) => {
                this.canvas.attr('transform', event.transform)
            });
    }

    private showRenderMessage(show: boolean) {
        if (show) {
            if (!this.renderMessageEl) {
                const msg = document.createElement('div');
                msg.textContent = 'Rendering interactions...';
                msg.style.position = 'absolute';
                msg.style.bottom = '8px';
                msg.style.left = '50%';
                msg.style.transform = 'translateX(-50%)';
                msg.style.fontSize = '16px';
                msg.style.fontFamily = 'sans-serif';
                msg.style.color = '#666';
                msg.style.background = 'rgba(255,255,255,0.8)';
                msg.style.padding = '2px 8px';
                msg.style.borderRadius = '4px';
                msg.style.pointerEvents = 'none';
                msg.style.zIndex = '10';
                this.parent.appendChild(msg);
                this.renderMessageEl = msg;
            }
        } else {
            if (this.renderMessageEl) {
            this.renderMessageEl.remove();
            this.renderMessageEl = undefined;
            }
        }
    }

    private disableScrollControlsIfNeeded(uiParameters?: Config.UIParameters) {
        if (uiParameters?.zoomControls === false) {
            // disable zooming by wheel or touch, but keep dblclick zoom
            this.svg
                .on('.zoom', null); // completely removes all zoom event listeners
        }
    }

    private disableScrollZoomIfNeeded(uiParameters?: Config.UIParameters) {
        if (uiParameters?.disableScrollZoom !== false) {
            // disable zooming by wheel or touch, but keep dblclick zoom
            this.svg
                .on('wheel.zoom', null)
                .on('touchstart.zoom', null);
        }
    }

    /**
     * Handle molstar click event. Makes interaction node highlight
     *
     * @private
     * @param {*} e Data pased by molstar component
     * @memberof Visualization
     */
    private molstarClickEventHandler(e: any) {
        if (this.fullScreen) return;

    let hash = `${e.eventData.auth_asym_id}${e.eventData.auth_seq_id}${e.eventData.ins_code}`;

        this.nodes?.each((node: Model.InteractionNode, index: number, group: any) => {
            this.nodeDim(node, index, group);

            if (node.id === hash) {
                this.selectedResidueHash = hash;
                this.nodeHighlight(node, index, group);
                return;
            }
        });

    }

    private ligHeatmapMouseoverEventHandler(e: any) {
        if (this.depiction === undefined) return;
        if (this.ligandIntxData === undefined) return;
        const atomName = e.detail.name; // CustomEvent
        const atom = this.depiction.atoms.filter(x => x.name === atomName);

        const selection = select(`.${atomName}_Circles`);
        const nodes = selection.nodes();
        const lastElement = nodes[nodes.length - 1];

        if (atom.length > 0) {
            this.depiction.atomMouseEnterEventHandler(atom[0], lastElement, true);
        }
        // else {
        //     this.depiction.atomMouseLeaveEventHandler(false);
        // }
    }

    private ligHeatmapMouseoutEventHandler(_e:any) {
        if (this.depiction === undefined) return;
        this.depiction.atomMouseLeaveEventHandler(true);
    }


    /**
     * Handles mouse leave molstar event. Removes interaction node highlight
     *
     * @private
     * @memberof Visualization
     */
    private molstarMouseoutEventHandler() {
        if (this.fullScreen) return;

        this.nodes?.each((node: Model.InteractionNode, index: number, group: any) => {
            if (node.id == this.selectedResidueHash) {
                this.nodeDim(node, index, group);
                return;
            }
        });
        this.links?.attr('opacity', 1);
        this.nodes?.attr('opacity', 1);
    }

    private linkMouseOverEventHandler(x: Model.Link, i: number, g: any) {
        if (!this.nodeDragged) {
            this.linkHighlight(x, i, g);
            this.fireExternalLinkEvent(x, Config.interactionMouseoverEvent);
        }
    }

    private linkMouseOutEventHandler(x: Model.Link, i: number, g: any) {
        if (!this.nodeDragged) {
            this.linkDim(x, i, g);
            this.fireExternalNullEvent(Config.interactionMouseoutEvent);
        }
    }

    //https://stackoverflow.com/questions/40722344/understanding-d3-with-an-example-mouseover-mouseup-with-multiple-arguments
    private nodeMouseoverEventHandler(x: Model.InteractionNode, i: number, g: any) {
        if (!this.nodeDragged) {
            this.nodeHighlight(x, i, g);
            this.fireExternalNodeEvent(x, Config.interactionMouseoverEvent);
        }
    }

    private nodeMouseoutEventHandler(x: Model.InteractionNode, i: number, g: any) {
        if (!this.nodeDragged) {
            this.nodeDim(x, i, g);

            this.fireExternalNullEvent(Config.interactionMouseoutEvent);
        }

        this.links?.attr('opacity', 1);
        this.nodes?.attr('opacity', 1);
    }

    private dragHandler = drag<Element, Model.InteractionNode>()
        .filter((x: Model.InteractionNode) => !x.static)
        .on('start', (event, x: Model.InteractionNode) => {
            if (!event.active) this.simulation.alphaTarget(0.3).restart();

            x.fx = x.x;
            x.fy = x.y;
        })
        .on('drag', (event, x: Model.InteractionNode) => {
            this.nodeDragged = true;

            x.fx = event.x;
            x.fy = event.y;
        })
        .on('end', (event, x: Model.InteractionNode) => {
            this.nodeDragged = false;

            if (!event.active) this.simulation.alphaTarget(0);
            x.fx = event.x;
            x.fy = event.y;
        });

    // #endregion event handlers

    // #region public methods
    /**
     * Download bound molecule interactions data from PDBe Graph API end point
     * /pdb/bound_molecule_interactions
     *
     * Correct parameters can be obtained using API call:
     * /pdb/bound_molecules
     *
     * @param {string} pdbid
     * @param {string} bmId bound molecule identifier: e.g. bm1, bm2, ...
     * @memberof Visualization
     */
    public initBoundMoleculeInteractions(pdbid: string, bmId: string) {
        this.pdbId = pdbid;
        let url = Resources.boundMoleculeAPI(pdbid, bmId, this.environment);

        json(url)
            .catch(e => this.processError(e, 'No interactions data are available.'))
            .then(async(data: any) => await this.addBoundMoleculeInteractions(data, bmId))
            .then(() => this.centerScene());
    }

    /**
     * Download carbohydrate interactions data from PDBe Graph API end point
     * /pdb/carbohydrate_polymer_interactions
     *
     * Correct parameters can be obtained using API call:
     * /pdb/bound_molecules
     *
     * @param {string} pdbid
     * @param {string} bmId bound molecule identifier: e.g. bm1, bm2, ...
     * @param {string} entityId
     * @memberof Visualization
     */
    public initCarbohydratePolymerInteractions(pdbid: string, bmId: string, entityId: string) {
        this.pdbId = pdbid;
        let url = Resources.carbohydratePolymerAPI(pdbid, bmId, entityId, this.environment);

        json(url)
            .catch(e => this.processError(e, 'No interactions data are available.'))
            .then(async(data: any) => await this.addBoundMoleculeInteractions(data, bmId))
            .then(() => this.centerScene());
    }

    /**
     * Download ligand interactions data from PDBe Graph API end point
     * /pdb/bound_ligand_interactions.
     *
     * Correct parameters can be obtained using API call:
     * /pdb/bound_molecules
     *
     * @param {string} pdbId pdb id
     * @param {number} resId residue number aka: auth_seq_id
     * @param {string} chainId chain id aka: auth_asym_id
     * @memberof Visualization
     */
    public initLigandInteractions(pdbId: string, resId: number, chainId: string, withNames: boolean = false) {
        this.pdbId = pdbId;
        let url = Resources.ligandInteractionsAPI(pdbId, chainId, resId, this.environment);

        json(url)
            .catch(e => this.processError(e, 'No interactions data are available.'))
            .then( async (data: any) => await this.addLigandInteractions(data, withNames))
            .then(() => this.centerScene());
    }

    /**
     * Download ligand structure given the anotation generated by the
     * PDBeChem process.
     *
     * @param {string} ligandId
     * @param {boolean} withNames true for displaying atom names
     * @memberof Visualization
     */
    public async initLigandDisplay(ligandId: string, withNames: boolean = false) {
        const ligandUrl = Resources.ligandAnnotationAPI(ligandId, this.environment);

        return json(ligandUrl)
            .catch(e => this.processError(e, `Component ${ligandId} was not found.`))
            .then((d: any) => this.addDepiction(d, withNames))
            .then(() => this.centerScene());
    }

    
     /**
     * Download aggregated protein-ligand interactions data.
     *
     * @param {string} ligandId
     * @memberof Visualization
     */   
    
    public async initLigandWeights(ligandId: string){
        const weightUrl = Resources.interactionAPI(ligandId, this.environment);
        return json(weightUrl)
            .then((d: any) => this.ligandIntxData = d[ligandId]);
    }


    /**
     * Add depiction to the canvas from external resource.
     *
     * @param {any} depiction Content of annotation.json file generated by
     * the PDBeChem process.
     * @param {boolean} withNames true for displaying atom names
     * @memberof Visualization
     */
    public addDepiction(depiction: any, withNames: boolean) {
        this.depiction = new Depiction(this.parent, this.depictionRoot, depiction);
        this.depiction.draw(withNames);

    }

    /**
     * Adds circles around atoms higlighting the weights of atoms.
     *
     * @param {string[]| string} contactType 
     * @memberof Visualization
     */
    public showWeights(contactType: string[]){
        if ((this.depiction === undefined) || (this.ligandIntxData) === undefined) return;
        const atomPropensity= new Model.LigandIntx(this.ligandIntxData, contactType).getAtomIntxPropensity();

        this.depiction.addCircles(atomPropensity);
        if(this.zoomHandler !== undefined){
            this.zoomHandler(this.svg, zoomIdentity);
            this.disableScrollControlsIfNeeded(this.uiParameters);
            this.disableScrollZoomIfNeeded(this.uiParameters);
        };
    }

    /**
     * Show depiction with/without atom names
     *
     * @param {boolean} withNames Controls atom labels to be displayed
     * @memberof Visualization
     */
    public toggleDepiction(withNames: boolean) {
        if (!this.depiction) return;

        this.depiction.draw(withNames);
    }

    public toggleZoom(active: boolean) {
        this.zoomHandler = active ? this.getZoomHandler() : undefined;
        if (this.zoomHandler) {
            this.zoomHandler(this.svg, zoomIdentity);
            this.disableScrollControlsIfNeeded(this.uiParameters);
            this.disableScrollZoomIfNeeded(this.uiParameters);
        }
    }


    /**
     * Add atom highlight to the ligand structure. The previous highlight
     * is going to be removed.
     *
     * @param {string[]} highlight List of atom names to be highlighted.
     * @param {string} [color=undefined] Color in #HEXHEX format.
     * @memberof Visualization
     */
    public addLigandHighlight(highlight: string[], color: string | undefined = undefined) {
        if (!this.depiction) return;
        this.depiction.highlightSubgraph(highlight, color);
    }
    
    /**
     * Add ligand interactions to the canvas
     *
     * @param {*} data Data content of the API end point
     * /pdb/bound_ligand_interactions
     * @param {boolean} true if atom names to be displayed
     * @memberof Visualization
     */
    public async addLigandInteractions(data: any, withNames: boolean = false) {
        let key = Object.keys(data)[0];
        let body = data[key][0];
        this.interactionsData = data;

        if (this.depiction === undefined || this.depiction.ccdId !== body.ligand.chem_comp_id) {
            await this.initLigandDisplay(body.ligand.chem_comp_id, withNames);
            this.presentBindingSite = new Model.BindingSite().fromLigand(key, body, this.depiction!);
            this.bindingSites.push(this.presentBindingSite);
            await this.setupLigandScene();
        } else {
            this.presentBindingSite = new Model.BindingSite().fromLigand(key, body, this.depiction);
            this.bindingSites.push(this.presentBindingSite);
            await this.setupLigandScene();
        }
        // wait for DOM to apply final node transforms
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }


    /**
     * Add bound molecule interactions to the canvas.
     *
     * @param {any} data Data content of the API end point
     * /pdb/bound_molecule_interactions
     * @param {string} bmId Bound molecule id
     * @memberof Visualization
     */
    public async addBoundMoleculeInteractions(data: any, bmId: string) {
        let key = Object.keys(data)[0];
        this.interactionsData = data;
        this.presentBindingSite = new Model.BindingSite().fromBoundMolecule(key, data[key][0]);

        this.bindingSites.push(this.presentBindingSite);
        this.presentBindingSite.bmId = bmId;
        let ligands = this.presentBindingSite.residues.filter(x => x.isLigand);

        if (ligands.length === 1) await this.initLigandInteractions(this.pdbId, ligands[0].authorResidueNumber, ligands[0].chainId);
        else await this.setupScene();
        // wait for DOM to apply final node transforms
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }


    // #region menu functions
    
    /**
     * Export scene into an SVG components. It relies on the availability
     * of the external CSS for SVG styling. Otherwise it does not work.
     *
     * @memberof Visualization
     */
    public saveSvg() {
        text(Resources.ligEnvCSSAPI(this.environment))
            .then(x => {
                let svgData = `
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="background-color: white;">
                ${this.svg.html()}
                <style>
                /* <![CDATA[ */ \n ${x} \n /* ]]> */
                </style>
                </svg>`;

                let svgBlob = new Blob([svgData], { type: 'image/svg;charset=utf-8' });
                let svgUrl = URL.createObjectURL(svgBlob);
                let downloadLink = document.createElement('a');

                downloadLink.href = svgUrl;
                downloadLink.download = this.getSVGName();

                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            });
    }


    /**
     * Download interactions data in the JSON format.
     *
     * @memberof Visualization
     */
    public downloadInteractionsData(): void {
        let downloadLink = document.createElement('a');
        let dataBlob = new Blob([JSON.stringify(this.interactionsData, null, 4)], { type: 'application/json' });

        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = this.interactionsData === undefined ? 'no_name.json' : `${this.pdbId}_${this.presentBindingSite.bmId}_interactions.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }


    /**
     * Reinitialize the scene (basicaly rerun the simulation to place interaction partners)
     *
     * @memberof Visualization
     */
    public reinitialize() {

        if (this.bindingSites.length > 1 && this.depiction !== undefined) {
            this.presentBindingSite = this.bindingSites[0];
            this.bindingSites.pop();

            this.depictionRoot.selectAll('*').remove();
            this.depiction = undefined;

            this.nullNodesPositions();
            this.setupScene().then(() => this.centerScene());
        }
        else if (this.depiction === undefined) {
            this.nullNodesPositions();
            this.setupScene().then(() => this.centerScene());
        }
        else {
            this.nullNodesPositions();
            this.setupLigandScene().then(() => this.centerScene());
        }

        this.fireExternalNullEvent(Config.interactionHideLabelEvent);
    }



    /**
     * Center scene to the viewbox
     *
     * @memberof Visualization
     */
    public centerScene() {
        if (!this.canvas || !this.canvas.node()) return;
        // Get the bounding box
        if (this.nodes !== undefined) {
            let minX: any = min(this.nodes.data().map((x) => x.x));
            let minY: any = min(this.nodes.data().map((x) => x.y));

            let maxX: any = max(this.nodes.data().map((x) => x.x));
            let maxY: any = max(this.nodes.data().map((x) => x.y));
            this.computeBoundingBox(minX, maxX, minY, maxY);

        } else if (this.depiction !== undefined) {
            let minX: any = min(this.depiction.atoms.map((x: Atom) => x.labels.length==0 ? x.position.x : x.position.x - 50));
            let minY: any = min(this.depiction.atoms.map((x: Atom) => x.labels.length==0 ? x.position.y : x.position.y - 50));

            let maxX: any = max(this.depiction.atoms.map((x: Atom) => x.labels.length==0 ? x.position.x : x.position.x + 50));
            let maxY: any = max(this.depiction.atoms.map((x: Atom) => x.labels.length==0 ? x.position.y : x.position.y + 50));

            this.computeBoundingBox(minX, maxX, minY, maxY);
        }
    }

    private computeBoundingBox(minX: number, maxX: number, minY: number, maxY: number) {
        if (!this.zoomHandler) return;

        // Calculate the dimensions of the molecule
        let molWidth = maxX - minX;
        let molHeight = maxY - minY;

        // Calculate the aspect ratios
        let molAspectRatio = molWidth / molHeight;
        let parentAspectRatio = this.parent.offsetWidth / this.parent.offsetHeight;

        // Calculate scaling factor to fit the molecule within the parent dimensions
        let scale;
        if (molAspectRatio > parentAspectRatio) {
        // Molecule is wider than the parent
        scale = this.parent.offsetWidth / molWidth;
        } else {
        // Molecule is taller than the parent
        scale = this.parent.offsetHeight / molHeight;
        }

        // Apply a margin (optional)
        scale *= 0.85;

        // Calculate new dimensions after scaling
        let newMolWidth = molWidth * scale;
        let newMolHeight = molHeight * scale;

        // Calculate translation to center the molecule
        let xTrans = -minX * scale + (this.parent.offsetWidth - newMolWidth) / 2;
        let yTrans = -minY * scale + (this.parent.offsetHeight - newMolHeight) / 2;

        // Apply the transformation
        this.canvas.attr('transform', `translate(${xTrans}, ${yTrans}) scale(${scale})`);
        let translation = zoomIdentity.translate(xTrans, yTrans).scale(scale);
        try {
            this.zoomHandler?.transform(this.svg, translation);
        } catch (err) {
            console.warn("Zoom not initialized yet:", err);
        }
    }

    // #endregion menu functions

    // #endregion public methods

    private resize() {
        this.svg
            .attr('width', this.parent.offsetWidth)
            .attr('height', this.parent.offsetHeight);

        if (this.depiction === undefined) {
            this.simulation
                .force('center', forceCenter(this.parent.offsetWidth / 2, this.parent.offsetHeight / 2))
                .restart();
        } else this.simulation.restart();

        if (this.zoomHandler !== undefined) this.zoomHandler(this.svg);
    }

    private getSVGName(): string {
        if (this.presentBindingSite !== undefined) return `${this.presentBindingSite.bmId}.svg`;
        if (this.depiction !== undefined) return `${this.depiction.ccdId}.svg`;

        return 'blank.svg';
    }

    private nullNodesPositions() {
        this.presentBindingSite.interactionNodes.forEach((x: Model.InteractionNode) => {
            if (!x.static) {
                x.fx = undefined;
                x.fy = undefined;
            }
        });

    }

    // #region fire events

    private fireExternalLinkEvent(link: Model.Link, eventName: string) {
        let atomsSource: string[] = [];
        let atomsTarget: string[] = [];

        if (link instanceof Model.LigandResidueLink) {
            let tmpSrc = ([] as string[]).concat(...link.interaction.map(x => x.sourceAtoms));
            atomsSource = tmpSrc.filter((v, i, a) => a.indexOf(v) === i);

            let tmpTar = ([] as string[]).concat(...link.interaction.map(x => x.targetAtoms));
            atomsTarget = tmpTar.filter((v, i, a) => a.indexOf(v) === i);
        }

        const e = new CustomEvent(eventName, {
            bubbles: true,
            detail: {
                interacting_nodes: [
                    {
                        pdb_res_id: this.pdbId,
                        auth_asym_id: link.source.residue.chainId,
                        auth_seq_id: link.source.residue.authorResidueNumber,
                        auth_ins_code_id: link.source.residue.authorInsertionCode,
                        atoms: atomsSource
                    },
                    {
                        pdb_res_id: this.pdbId,
                        auth_asym_id: link.target.residue.chainId,
                        auth_seq_id: link.target.residue.authorResidueNumber,
                        auth_ins_code_id: link.target.residue.authorInsertionCode,
                        atoms: atomsTarget
                    }
                ],
                tooltip: link.toTooltip()
            }
        });
        this.parent.dispatchEvent(e);
    }

    private fireExternalNodeEvent(node: Model.InteractionNode, eventName: string) {
        const e = new CustomEvent(eventName, {
            bubbles: true,
            detail: {
                selected_node: {
                    pdb_res_id: this.pdbId,
                    auth_asym_id: node.residue.chainId,
                    auth_seq_id: node.residue.authorResidueNumber,
                    auth_ins_code_id: node.residue.authorInsertionCode
                },
                tooltip: node.toTooltip()
            }
        });

        this.parent.dispatchEvent(e);
    }

    private fireExternalNullEvent(eventName: string) {
        const e = new CustomEvent(eventName, {
            bubbles: true,
            detail: {}
        });

        this.parent.dispatchEvent(e);
    }
        

    // #endregion fire events


    //#region setup scene micromethods
    private wipeOutVisuals() {
        this.nodesRoot.selectAll('*').remove();
        this.linksRoot.selectAll('*').remove();
    }

    private getIndexAndGroup(event: MouseEvent) {
        const target = event.currentTarget as SVGLineElement;
        const group = target.parentNode?.childNodes as unknown as SVGGElement[];
        const index = Array.prototype.indexOf.call(group, target);
        return {index, group};
    }

    private setupLinks() {
        this.links = this.linksRoot
            .selectAll()
            .data(this.presentBindingSite.links)
            .enter().append('g');

        this.links
            .append('line')
            .classed('pdb-lig-env-svg-shadow-bond', (x: Model.Link) => x.getLinkClass() !== 'hydrophobic')
            .on('mouseenter', (event: MouseEvent, d: Model.Link) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.linkMouseOverEventHandler(d, index, group);
            })
            .on('mouseleave', (event: MouseEvent, d: Model.Link) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.linkMouseOutEventHandler(d, index, group);
            });

        this.links
            .append('line')
            .attr('class', (e: Model.Link) => `pdb-lig-env-svg-bond pdb-lig-env-svg-bond-${e.getLinkClass()}`)
            .attr('marker-mid', (e: Model.Link) => e.hasClash() ? 'url(#clash)' : '')
            .on('mouseenter', (event: MouseEvent, d: Model.Link) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.linkMouseOverEventHandler(d, index, group);
            })
            .on('mouseleave', (event: MouseEvent, d: Model.Link) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.linkMouseOutEventHandler(d, index, group);
            });
    }



    private addNodeLabels(selection: any) {
        selection
            .append('text')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central')
            .each(function (this: SVGTextElement, e: Model.InteractionNode) {
                let labels = [e.residue.chemCompId, e.residue.authorResidueNumber];
                for (let i = 0; i < labels.length; i++) {
                    select(this)
                        .append('tspan')
                        .attr('dy', (i * 30) - 10)
                        .attr('x', 0)
                        .text(labels[i]);
                }
            });
    }
    //#endregion

    /**
     * Initialize scene after user selected a part of bound molecule.
     *
     * @private
     * @param {Model.InteractionNode} n Interaction node user clicked to
     * @param {number} i index o the interaction node
     * @param {*} g group of interaction nodes
     * @memberof Visualization
     */
    private selectLigand(n: Model.InteractionNode, i: number, g: any) {
        this.fireExternalNodeEvent(n, Config.interactionClickEvent);

        if (!n.residue.isLigand) return;

        this.nodeDim(n, i, g);
        this.nodeMouseoutEventHandler(n, i, g);
        this.showLigandLabel(n);

        this.initLigandInteractions(this.pdbId, n.residue.authorResidueNumber, n.residue.chainId);
    }

    /**
     * Display error message on the SVG canvas if any of the resources
     * are not available.
     *
     * @private
     * @param {*} e error object
     * @param {string} msg Error message to display
     * @memberof Visualization
     */
    private processError(e: any, msg: string) {
        this.canvas.append('text')
            .classed('pdb-lig-env-svg-node', true)
            .attr('dominant-baseline', 'center')
            .attr('text-anchor', 'middle')
            .attr('x', this.parent.clientWidth / 2)
            .attr('y', this.parent.clientHeight / 2)
            .text(msg)

        throw e;

    }


    /**
     * Setup ligand scene for display of ligand and interactions.
     * This includes: setup of links, nodes, simulation and subscribing to relevant events.
     *
     * Depiction is expected to be downloaded already.
     *
     * @private
     * @memberof Visualization
     */
    private async setupLigandScene() {
        this.wipeOutVisuals();
        this.setupLinks();

        this.presentBindingSite.interactionNodes
            .filter((x: Model.InteractionNode) => !x.residue.isLigand)
            .forEach((x: Model.InteractionNode) => {
                let links = this.presentBindingSite.links
                .filter((y): y is Model.LigandResidueLink => y.containsNode(x) && y.getLinkClass() !== 'hydrophobic');

                links = links.length == 0 ? this.presentBindingSite.links
                .filter((y): y is Model.LigandResidueLink => y.containsNode(x)) : links;
                let atom_names = links
                    .map((y: Model.LigandResidueLink) => y.interaction.flatMap(z => z.sourceAtoms));

                let concated = atom_names.flat();
                let position: Vector2D = this.depiction!.getInitalNodePosition(concated);

                x.x = position.x + Math.random() * 55;
                x.y = position.y + Math.random() * 55;
            });


        // setup nodes; wait for resources to be ready
        this.presentBindingSite.interactionNodes.forEach(x => this.rProvider.downloadAnnotation(x.residue));
        await Promise.all(this.rProvider.downloadPromises);
        await Promise.all([this.visualsMapper.graphicsPromise, this.visualsMapper.mappingPromise]);

        this.nodes = this.nodesRoot.append('g')
            .selectAll()
            .data(this.presentBindingSite.interactionNodes)
            .enter().append('g');


        this.nodes.filter((x: Model.InteractionNode) => !x.residue.isLigand)
            .attr('class', (x: Model.InteractionNode) => `pdb-lig-env-svg-node pdb-lig-env-svg-${x.residue.getResidueType()}-res`)
            .on('mouseenter', (event: MouseEvent, x: Model.InteractionNode) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.nodeMouseoverEventHandler(x, index, group);
            })
            .on('mouseleave', (event: MouseEvent, x: Model.InteractionNode) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.nodeMouseoutEventHandler(x, index, group);
            });

        this.nodes.filter((x: Model.InteractionNode) => !x.residue.isLigand && this.visualsMapper.glycanMapping.has(x.residue.chemCompId))
            .html((e: Model.InteractionNode) => this.visualsMapper.getGlycanImage(e.residue.chemCompId));

        // draw rest
        this.nodes.filter((x: Model.InteractionNode) => !this.visualsMapper.glycanMapping.has(x.residue.chemCompId))
            .append('circle')
            .attr('r', (x: Model.InteractionNode) => x.scale * Config.nodeSize);

        let nodesWithText = this.nodes.filter((x: Model.InteractionNode) => !x.residue.isLigand);
        this.addNodeLabels(nodesWithText);

        let forceLink = d3ForceLink()
            .links(this.links.filter((x: Model.LigandResidueLink) => x.getLinkClass() !== 'hydrophobic'))
            .distance(5);

        let charge = forceManyBody().strength(-80).distanceMin(10).distanceMax(20);
        let collision = forceCollide(50).iterations(10).strength(0.5);

        this.simulation = forceSimulation(this.presentBindingSite.interactionNodes)
            .force('link', forceLink)
            .force('charge', charge) //strength
            .force('collision', collision)
            .on('tick', () => this.simulationStep());

        this.dragHandler(this.nodes);
        if (this.zoomHandler !== undefined) {
            this.zoomHandler(this.svg, zoomIdentity);
            this.disableScrollControlsIfNeeded(this.uiParameters);
            this.disableScrollZoomIfNeeded(this.uiParameters);
        }

        this.showRenderMessage(true);
        return new Promise<void>((resolve) => {
            const checkReady = () => {
                // pre center scene before end of simulation
                if (this.simulation.alpha() < 0.5) this.centerScene();
                const alphaDone = this.simulation.alpha() < 0.05;
                const nodesDrawn = this.nodes?.size?.() > 0;
                const linksDrawn = this.links?.size?.() > 0;
                if (alphaDone && nodesDrawn && linksDrawn)  {
                    this.showRenderMessage(false);
                    resolve();
                } else {
                requestAnimationFrame(checkReady);
                }
            };
            requestAnimationFrame(checkReady);
        });
    }


    /**
     * Setup display of interactions for bound molecule.
     * This includes: setup of links, nodes, simulation and subscribing to relevant events.
     * No depiction is required for this step.
     *
     * @private
     * @memberof Visualization
     */
    private async setupScene() {
        this.wipeOutVisuals();
        this.setupLinks();

        // setup nodes; wait for resources to be ready
        this.presentBindingSite.interactionNodes.forEach(x => this.rProvider.downloadAnnotation(x.residue));
        await Promise.all(this.rProvider.downloadPromises);
        await Promise.all([this.visualsMapper.graphicsPromise, this.visualsMapper.mappingPromise]);

        this.nodes = this.nodesRoot
            .selectAll()
            .data(this.presentBindingSite.interactionNodes)
            .enter().append('g')
            .attr('class', (e: Model.InteractionNode) => `pdb-lig-env-svg-node pdb-lig-env-svg-${e.residue.getResidueType()}-res`)
            .on('click', (event: MouseEvent, x: Model.InteractionNode) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.selectLigand(x, index, group);
            })
            .on('mouseenter', (event: MouseEvent, x: Model.InteractionNode) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.nodeMouseoverEventHandler(x, index, group);
            })
            .on('mouseleave', (event: MouseEvent, x: Model.InteractionNode) => {
                const {index, group} = this.getIndexAndGroup(event);
                this.nodeMouseoutEventHandler(x, index, group);
            });


        this.nodes.filter((n: Model.InteractionNode) =>
            this.visualsMapper.glycanMapping.has(n.residue.chemCompId))
            .html((e: Model.InteractionNode) => this.visualsMapper.getGlycanImage(e.residue.chemCompId));

        this.nodes.filter((e: Model.InteractionNode) => !this.visualsMapper.glycanMapping.has(e.residue.chemCompId))
            .append('circle')
            .attr('r', Config.nodeSize);

        this.addNodeLabels(this.nodes);

        let forceLink = d3ForceLink<Model.InteractionNode, Model.Link>()
            .links(this.presentBindingSite.links)
            .distance((x: Model.Link) =>
                (<Model.InteractionNode>x.source).residue.isLigand
                && (<Model.InteractionNode>x.target).residue.isLigand ? 55 : 150)
            .strength(0.5);

        let charge = forceManyBody().strength(-1000).distanceMin(55).distanceMax(250);
        let collision = forceCollide(45);
        let center = forceCenter(this.parent.offsetWidth / 2, this.parent.offsetHeight / 2);

        this.simulation = forceSimulation(this.presentBindingSite.interactionNodes)
            .force('link', forceLink)
            .force('charge', charge) //strength
            .force('collision', collision)
            .force('center', center)
            .on('tick', () => this.simulationStep());

        this.dragHandler(this.nodes);
        if (this.zoomHandler !== undefined) {
            this.zoomHandler(this.svg, zoomIdentity);
            this.disableScrollControlsIfNeeded(this.uiParameters);
            this.disableScrollZoomIfNeeded(this.uiParameters);
        }

        this.showRenderMessage(true);
        return new Promise<void>((resolve) => {
            const checkReady = () => {
                // pre center scene before end of simulation
                if (this.simulation.alpha() < 0.5) this.centerScene();
                const alphaDone = this.simulation.alpha() < 0.05;
                const nodesDrawn = this.nodes?.size?.() > 0;
                const linksDrawn = this.links?.size?.() > 0;
                if (alphaDone && nodesDrawn && linksDrawn)  {
                    this.showRenderMessage(false);
                    resolve();
                } else {
                requestAnimationFrame(checkReady);
                }
            };
            requestAnimationFrame(checkReady);
        });
    }


    /**
     * This is a tick in a simulation that updates position of nodes and links
     * Depiction does not change its conformation.
     *
     * @private
     * @memberof Visualization
     */
    private simulationStep() {
        this.nodes.attr('transform', (n: Model.InteractionNode) => `translate(${n.x},${n.y}) scale(${n.scale})`);
        this.links.selectAll('line').attr('x1', (x: any) => x.source.x)
            .attr('y1', (x: any) => x.source.y)
            .attr('x2', (x: any) => x.target.x)
            .attr('y2', (x: any) => x.target.y);
    }


    private nodeHighlight(x: Model.InteractionNode, i: number, g: any) {
        x.scale = 1.5;

        if (x.residue.isLigand) select(g[i]).style('cursor', 'pointer');

        select(g[i])
            //.transition()
            .attr('transform', () => `translate(${x.x},${x.y}) scale(${x.scale})`);

        let otherNodes = [x];
        this.links.filter((l: Model.Link) => l.containsNode(x)).each((lnk: Model.Link) => {
            let otherNode = lnk.getOtherNode(x);
            otherNodes.push(otherNode);
        });

        this.nodes
            .filter((node: Model.InteractionNode) => !otherNodes.includes(node))
            .attr('opacity', 0.4);

        this.links
            .filter((l: Model.Link) => !l.containsNode(x))
            //.transition()
            .attr('opacity', 0.4);
    }


    private nodeDim(x: Model.InteractionNode, i: number, g: any) {
        if (!x.static) x.scale = 1.0;

        if (x.residue.isLigand) select(g[i]).style('cursor', 'default');
        select(g[i])
            //.transition()
            .attr('transform', `translate(${x.x},${x.y}) scale(${x.scale})`);
    }


    private linkHighlight(x: Model.Link, i: number, g: any) {
        let parent = select(g[i]).node().parentNode;
        select(parent).classed('pdb-lig-env-svg-bond-highlighted', true);

        this.links
            .filter((l: Model.Link) => l !== x)
            //.transition()
            .attr('opacity', 0.4);

        this.nodes
            .filter((l: Model.InteractionNode) => !(l === x.source || l === x.target))
            //.transition()
            .attr('opacity', 0.4);
    }

    private linkDim(x: Model.Link, i: number, g: any) {
        let parent = select(g[i]).node().parentNode;
        select(parent).classed('pdb-lig-env-svg-bond-highlighted', false);

        this.links
            .filter((l: Model.Link) => l !== x)
            //.transition()
            .attr('opacity', 1);

        this.nodes
            .filter((l: Model.InteractionNode) => !(l === x.source || l === x.target))
            //.transition()
            .attr('opacity', 1);
    }

    private showLigandLabel(x: Model.InteractionNode) {
        const e = new CustomEvent(Config.interactionShowLabelEvent, {
            bubbles: true,
            detail: {
                label: x.toTooltip()
            }
        });

        this.parent.dispatchEvent(e);
    }

    private addMarkers() {
        let defs = this.svg.append('defs')

        defs
            .append('style')
            .text("@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@200&display=swap');");

        // proper background for depiction tspans
        // gracefully copied from: https://stackoverflow.com/questions/15500894/background-color-of-text-in-svg
        let filter = defs.append('filter')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 1)
            .attr('height', 1)
            .attr('id', 'solid-background')

        filter.append('feFlood').attr('flood-color', 'white')
        filter.append('feComposite').attr('in', 'SourceGraphic')

        defs
            .append('marker')
            .attr('id', 'clash')
            .attr("markerWidth", 15)
            .attr("markerHeight", 15)
            .attr("refX", 7)
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr('markerUnits', 'strokeWidth')
            .append('path')
            .attr('d', 'M22.245,4.015c0.313,0.313,0.313,0.826,0,1.139l-6.276,6.27c-0.313,0.312-0.313,0.826,0,1.14l6.273,6.272  c0.313,0.313,0.313,0.826,0,1.14l-2.285,2.277c-0.314,0.312-0.828,0.312-1.142,0l-6.271-6.271c-0.313-0.313-0.828-0.313-1.141,0  l-6.276,6.267c-0.313,0.313-0.828,0.313-1.141,0l-2.282-2.28c-0.313-0.313-0.313-0.826,0-1.14l6.278-6.269  c0.313-0.312,0.313-0.826,0-1.14L1.709,5.147c-0.314-0.313-0.314-0.827,0-1.14l2.284-2.278C4.308,1.417,4.821,1.417,5.135,1.73  L11.405,8c0.314,0.314,0.828,0.314,1.141,0.001l6.276-6.267c0.312-0.312,0.826-0.312,1.141,0L22.245,4.015z')
            .attr('style', 'stroke:#FF5050;stroke-width:3px;');
    }

    private parseEnvironment(env: string): Model.Environment {
        let environment: Model.Environments | undefined = undefined;

        if (env === undefined) {
            environment = Model.Environment.Production
        }
        else {
            env = env.toLowerCase();
            switch (env) {
                case "production":
                case "prod": {
                    environment = Model.Environment.Production;
                    break;
                }
                case "development":
                case "dev":
                    {
                        environment = Model.Environment.Development;
                        break;
                    }
                case "internal":
                case "int": {
                    environment = Model.Environment.Internal;
                    break;
                }
                default: {
                    console.log(`Unknown environment ${env}. Using production instead.`);
                    environment = Model.Environment.Production;
                }
            }
        }
        return environment;

    }
}
