/**
 * This class contains all the details which are necessary for redrawing
 * RDKit style 2D molecule depiction on a client side as well as some
 * other logic for initial placement of
 * binding partners in the residue-level view.
 *
 * @class Depiction
 * @param {HTMLElement} parent HTMLElement on which depiction to be displayed.
 * @param {any} root SVG element for the depiction.
 * @param {any} data Json annotation of ligand SVG
 **/

class Depiction {
    ccdId: string;
    atoms: Atom[];
    bonds: Bond[];

    resolution: Vector2D;
    private parent: HTMLElement;
    private root: d3.Selection<SVGGElement, unknown, null, undefined>;
    private highlight: d3.Selection<SVGGElement, unknown, null, undefined>;
    public weight: d3.Selection<SVGGElement, unknown, null, undefined>;
    public structure: d3.Selection<SVGGElement, unknown, null, undefined>;

    constructor(parent: HTMLElement, root: any, data: any) {
        this.root = root;
        this.parent = parent;
        this.highlight = this.root.append('g').attr('id', 'highlight');
        this.weight = this.root.append('g').attr('id', 'weight');
        this.structure = this.root.append('g').attr('id', 'structure');

        this.ccdId = data.ccd_id;
        this.resolution = new Vector2D(data.resolution.x, data.resolution.y);

        this.atoms = data.atoms.map(x => new Atom(x));
        this.bonds = new Array<Bond>();

        let bds = new Set<string>();

        data.bonds.forEach(x => {
            let atomA = this.atoms.find(e => e.name == x.bgn);
            let atomB = this.atoms.find(e => e.name == x.end);
            let bond = new Bond(atomA, atomB, x.coords, x.style);

            let bondFlag = [atomA.name, atomB.name].sort().join("_");
            if (!bds.has(bondFlag)) {
                bds.add(bondFlag);
                atomA.connectivity++;
                atomB.connectivity++;
            }

            this.bonds.push(bond);

        });

    }


    /**
     * Returns an initial position of Residue node bound to a list of
     * atom.
     *
     * Present implementation sorts all the partners based on the atom
     * degree and then gets the one with the lowest degree and places
     * the initial residue position along the vector pointing from it.
     *
     * @param {string[]} atomNames array of atom names the bound residue
     * has a contact with.
     * @returns {Vector2D} Returns an initial placement of the residue in contact.
     * @memberof Depiction
     */
    public getInitalNodePosition(atomNames: string[]): Vector2D {
        if (this.atoms.length === 1) {
            return new Vector2D(this.atoms[0].position.x, this.atoms[0].position.y);
        }
        // ideally we want to find an atom which is part just a single bond to get nice initial position.
        // If there is no such atom any will do

        let atoms = this.atoms.filter(x => atomNames.includes(x.name)).sort((x, y) => x.connectivity - y.connectivity);
        let thisAtom = atoms[0];

        let bond = this.bonds.find(x => x.containsAtom(thisAtom));
        let otherAtom = bond.getOtherAtom(thisAtom);

        // to place the residue node a bond apart from the bonding atom
        let x = otherAtom.position.x - (2 * (otherAtom.position.x - thisAtom.position.x))
        let y = otherAtom.position.y - 2 * ((otherAtom.position.y - thisAtom.position.y))

        return new Vector2D(x, y);
    }
    
    /**
     * Draws ligand structure by appending svg:path
     * elements corresponding to bonds and atoms with labels
     * @param {boolean} true if atom names need to be displayed
     * @memberof Depiction
     */

    public draw(atomNames: boolean = false) {
        this.structure.selectAll("*").remove();

        this.appendBondVisuals();

        if (atomNames) this.appendAtomNames();
        else this.appendLabels();
    }

    /**
     * Highlights atoms and bonds connecting them
     * @param {string[]} atoms array of atom names to higlight
     * @param {string} color color to be used for higlighting
     * @memberof Depiction
     */
    public highlightSubgraph(atoms: Array<string>, color: string = undefined) {
        if (!this.atoms) return;
        this.highlight.selectAll('*').remove();
        if(atoms){
            color = color ? color : "#FFFF00";
            let atomsToHighlight = this.atoms.filter(x => atoms.includes(x.name));

            this.highlight.selectAll()
                .data(atomsToHighlight)
                .enter()
                .append('circle')
                .attr('r', '16.12')
                .attr('cx', x => x.position.x)
                .attr('cy', x => x.position.y)
                .attr('style', `fill:${color};fill-rule:evenodd;stroke:${color};stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1`);

            let bondsToHighlight = this.bonds.filter(x => atoms.includes(x.bgn.name) && atoms.includes(x.end.name))

            this.highlight.selectAll()
                .data(bondsToHighlight)
                .enter()
                .append('path')
                .attr('d', x => `M ${x.bgn.position.x},${x.bgn.position.y} ${x.end.position.x},${x.end.position.y}`)
                .attr('style', `fill:none;fill-rule:evenodd;stroke:${color};stroke-width:22px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1`)
        }
    }

    /**
     * Adds circles around atoms corresponding to the value of 
     * their weights.The size and color of circles around 
     * atom indicates the strength of weight.
     * @param {any} weights objects with atom names and value of weight
     * @memberof Depiction
     */

    public addCircles(weights: any): void {
        this.atoms.forEach(x => {
            /** 
             * This has been changed so we can highlight every Atom
             */
            let valueTo = weights.filter(y => y.atom == x.name).map(z => z.value)[0];
            if (valueTo === undefined) valueTo = 0.00;
            x.value = valueTo;
        });

        const data = this.atoms;

        const scales = this.getScale();
        this.weight.selectAll("*").remove();
        /**
         * Here is the original weight drawing function
         */
        // this.weight.selectAll()
        //     .data(data)
        //     .enter()
        //     .each(function(x: any){
        //         if(x.value >= q1){
        //             d3.select(this)
        //             .append('circle')
        //                 .attr('cx', x.position.x)
        //                 .attr('cy', x.position.y)
        //                 .attr('r', secondScale.radiusScale(x.value))
        //                 .attr('fill', secondScale.colorScale(x.value))
        //                 .attr("fill-opacity", "0.5")
        //             if(x.value >= q3){
        //                 d3.select(this)
        //                 .append('circle')
        //                     .attr('cx', x.position.x)
        //                     .attr('cy', x.position.y)
        //                     .attr('r', thirdScale.radiusScale(x.value))
        //                     .attr('fill', thirdScale.colorScale(x.value))
        //                     .attr("fill-opacity", "0.5")
        //             }
        //         }
        //     });

        /**
         * Here is the original second weight drawing function
         */
        this.weight.selectAll()
            .data(data)
            .enter()
            .append('circle')
                .attr("class", x => `${x.name}_Circles`)
                .attr("cx", x => x.position.x)
                .attr("cy", x => x.position.y)
                /**
                 * set a custom value of radius for values of zero
                 * to be able to highlight them 
                 */
                .attr("r", x => x.value > 0 ? scales.radiusScale(x.value): 15) 
                .attr("fill", x=> x.value > 0 ? scales.colorScale(x.value): '#ffffff')
                /**
                 * Since this is drawn below "structure" fill-opacity
                 * does not change anything actually
                 */
                .attr("fill-opacity", "1")
                /**
                 * This is a fill-opacity function if we want to draw "weight"
                 * on top of "structure"
                 */
                // .attr("fill-opacity", (x:Atom) => {
                //     if (x.value+"" === "0.00") return 0.0;
                //     return "0.8";
                // })
                .on('mouseenter', (x:Atom, i:number, g:any) => {
                    this.atomMouseEnterEventHandler(x, g[i], false);
                })
                .on('mouseleave', (_x:Atom, _i:number, _g:any) => {
                    this.atomMouseLeaveEventHandler(false);
                });     
            
            /**
             * This is code that could be use if we draw "weight"
             * on top of "structure"
             */
            // this.hideStructureLabels();
            // this.weight
            //     .selectAll()
            //     .data(data)
            //     .enter()
            //     .append('g')
            //     .attr('filter', 'labels')
            //     .each(function (x: Atom) {
            //         if (x.labels.length > 0) {
            //             for (var i = 0; i < x.labels.length; i++) {
            //                 d3.select(this)
            //                     .append('path')
            //                     .attr('d', x.labels[i].d)
            //                     .style("background-color", "white")
            //                     .attr('fill', x.labels[i].fill)
            //             }
            //         }
            //     });   
    }

    /**
     * Generate scale of values for the radius and color
     * of circles representing the weight of atoms
     * @private
     * @memberof Depiction
     */
    private getScale() {
        /**
         * scales for radius are generated for only non-zero values.
         * keeping zero as the minimum value of domain will generate
         * very small radius which cannot be highlighted, alternatively
         * if the minimum value of range is increased, then maximum value 
         * of the range also need to be increased which will result in very
         * large circles for high values 
        */
        const weights = this.atoms.map(x => x.value).filter(x => x > 0)
        const weightMax = d3.max(weights);
        const weightMin = d3.min(weights);
        const radiusScale = d3.scaleSqrt([weightMin, weightMax], [10,30]);
        const colorScale = d3.scaleLinear(
            [0, 0.01, weightMax],
            ["#f0fcf0","#a0bb9e","#505d50"]
        );
        return {
            "radiusScale": radiusScale,
            "colorScale": colorScale
        }

        
    }

    /**
     * Appends to a given selection the visual representation of 
     * bonds as svg:path elements.
     * representation of the bond visuals.
     * @private
     * @memberof Depiction
     */
    private appendBondVisuals(): void {
        this.structure.selectAll()
            .data(this.bonds)
            .enter()
            .append('path')
            .attr('style', (y: Bond) => y.style)
            .attr('d', (y: Bond) => y.coords);
    }

    /**
     * Append atom name labels to the visualization.
     * @private
     * @memberof Depiction
     */
    private appendAtomNames() {
        this.structure.selectAll()
            .data(this.atoms)
            .enter()
            .append('text')
            .attr('filter', "url(#solid-background)")
            .attr('style', 'font-size:21px;font-style:normal;font-weight:normal;fill-opacity:1;stroke:none;font-family:sans-serif;fill:#000000')
            .attr('x', x => x.position.x)
            .attr('y', x => x.position.y)
            .attr('dominant-baseline', 'central')
            .attr('text-anchor', 'middle')
            .text(x => x.name);
    }

    /**
     * Append depiction labels to the visualization.
     * @private
     * @memberof Depiction
     */
    private appendLabels() {
        let data = this.atoms
            .filter(x => x.labels.length > 0);

        this.structure.selectAll()
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'structureLabels')
            .attr('filter', 'labels')
            .each(function (x: any) {
                for (var i = 0; i < x.labels.length; i++) {
                    d3.select(this)
                        .append('path')
                        .attr('d', x.labels[i].d)
                        .style("background-color", "white")
                        .attr('fill', x.labels[i].fill)

                }
            });
    }

    // /**
    //  * Remove depiction structure labels
    //  * @private
    //  * @memberof Depiction
    //  */
    // private hideStructureLabels() {
    //     d3.selectAll('.structureLabels').remove();
    // }

    /**
     * Finds the center of an array of atoms
     * @param {string} ids atom ids 
     * @return {Vector2D} coordinates of center
     * @memeberof Depiction
     */
    public getCenter(ids: string[]): Vector2D {
        let coords = new Array<Vector2D>();

        ids.forEach(x => {
            let pos = this.atoms.find(y => y.name === x).position;
            coords.push(pos);
        })

        let x = d3.sum(coords, x => x.x) / coords.length;
        let y = d3.sum(coords, x => x.y) / coords.length;

        return new Vector2D(x, y);
    }

    /**
     *
     *
     * @param {Map<string, number>} map
     * @memberof Depiction
     */
    public sortMap(map: Map<string, number>) {
        let vals = [...map.values()].sort();

        let newMap = new Map<string, number>();
        vals.forEach(x => {
            map.forEach((value, key) => {
                if (x === value) {
                    newMap.set(key, x);
                    return;
                }
            })
        });

        return newMap;
    }

    /**
     * Highlights an atom by transitioning the 
     * radius of circles around atoms and increasing
     * the stroke width changing the colour
     */
    private highlightAtom(element) {
        this.removeHighlights();
        const scales = this.getScale()
        
        const selectedCircle = d3.select(element)
            .classed("selectedCircle", true)
            .style("stroke", "#FBBD1D")
            .style("stroke-width", 5);


        function animateStroke() {
            if (selectedCircle.classed("selectedCircle")) {
                selectedCircle.transition()
                    .duration(500) // 500 milliseconds
                    .style("stroke-width", 10)
                    .attr("r", () => {
                        const d = selectedCircle.datum() as Atom; // Access bound data
                        if(d.value > 0){
                            return scales.radiusScale(d.value)* 1.5; // Increase size
                        }
                        return 30
                        
                    })
                    .transition()
                    .duration(500) // 500 milliseconds
                    .style("stroke-width", 5)
                    .attr("r", () => {
                        const d = selectedCircle.datum() as Atom;
                        if(d.value > 0){
                            return scales.radiusScale(d.value); // Revert to original size
                        }
                        return 15
                    })
                    .on("end", animateStroke) // Loop animation
        }
        }
        animateStroke();
    }

    /**
     * Removes the highlights of the atom on 
     * mouse leaving
     */
    private removeHighlights(){
        const scales = this.getScale();
        const selectedCircle = d3.selectAll(".selectedCircle");        
        selectedCircle.classed("selectedCircle", false)
            .interrupt()
            .attr("r", () => {
                const d = selectedCircle.datum() as Atom;
                if(d.value > 0){
                    return scales.radiusScale(d.value); // Revert to original size
                }
                return 15
            })
            .style("stroke", null);
    }

    // #region event handlers
    /**
     * Mouse enter event handler for circles around atoms
     * depicting their weights
     * @public
     * @param {Atom} atom object
     * @param {boolean} propagation if event should be triggered on external components
     * @memebrof Depiction
     */

    public atomMouseEnterEventHandler(x: Atom, element: any, propagation:boolean){
        this.highlightAtom(element);
        this.fireExternalAtomEvent(x, propagation, Config.LigandShowAtomEvent);
    }

    /**
     * Mouse leave event handler for circles around atoms
     * depicting their weights
     * @public
     * @param {boolean} propagation if event should be triggered on external components
     * @memberof Depiction
     */
    public atomMouseLeaveEventHandler(propagation:boolean){
        this.removeHighlights();
        this.fireExternalNullEvent(propagation, Config.LigandHideAtomEvent);
    }
    // #endregion

    // #region fire events
    /**
     * Dispatches custom event to display atom names and
     * corresponding weights on tooltip on mouse enter
     * @private
     * @param {Atom} atom object
     * @param {string} eventName name of event
     * @memeberof Depiction
     */
    private fireExternalAtomEvent(atom: Atom, propagation:boolean, eventName: string){
        const e = new CustomEvent(eventName, {
            bubbles: true,
            detail: {
                tooltip: atom.toTooltip("%"),
                atomName: atom.name,
                external: propagation
            }
        });
        this.parent.dispatchEvent(e);
    }

    /**
     * Dispatches event to hide tooltip on mouse leave
     * @private
     * @param {boolean} propagation if event should be triggered on external components
     * @param {string} eventName name of event
     * @memeberof Depiction 
     */
    private fireExternalNullEvent(propagation:boolean, eventName: string) {
        const e = new CustomEvent(eventName, {
            bubbles: true,
            detail: {
                external: propagation
            }
        });

        this.parent.dispatchEvent(e);
    }

    // #endregion

}


/**
 * Atom from the depiction
 *
 * @class Atom
 * @param {string} name Unique atom name.
 * @param {any} labels Atom label
 * @param {Vector2D} position Position of the atom in 2D coordinate system.
 */
class Atom {
    name: string;
    labels: any;
    position: Vector2D;
    connectivity: number;
    value: number;

    constructor(item: any) {
        this.name = item.name;
        this.labels = item.labels;
        this.position = new Vector2D(item.x, item.y);
        this.connectivity = 0;
        this.value = 0;
    }

    /**
     *
     *
     * @param {Atom} other
     * @returns {boolean} true if the atoms are equal
     * @memberof Atom
     */
    public equals(other: Atom): boolean {
        if (!(other instanceof Atom)) return false;

        return other.name === this.name;
    }

    /**
     * @return {string} name of atom
     * @memberof Atom
     */
    public toTooltip(symbol: string): string {
        return `<span>${this.name}: ${this.value.toFixed(2)}${symbol}</span>`;
    }
}

/**
 * 2D point definition
 *
 * @class Point
 * @param {number} x coordinate
 * @param {number} y coordinate
 */
class Vector2D {
    x: number;
    y: number;


    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns a string representation of the object in a format: [x, y]
     *
     * @returns {string} String representation of the object
     * @memberof Point
     */
    public toString(): string {
        return `[${this.x}, ${this.y}]`;
    }

    /**
     * Checks whether or not two Vector2D objects are equal.
     *
     * @param {Vector2D} other instance of an object to check.
     * @returns {boolean} whether or not the objects are equal.
     * @memberof Point
     */
    public equals(other: Vector2D): boolean {
        if (!(other instanceof Vector2D)) return false;

        return this.x == other.x && this.y == other.y;
    }


    /**
     * Measures a distance between this atom and another atom.
     *
     * @param {Vector2D} other atom to measure a distance to.
     * @returns {number} Returns the distance to another object.
     * @memberof Point
     */
    public distanceTo(other: Vector2D): number {
        return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.x, 2));
    }


    /**
     * Composes vectors to a single one. This is used in infering the
     * original placement of the residue nodes.
     *
     * @static
     * @param {Vector2D[]} points Vectors to be composed.
     * @returns {Vector2D} Result of a vector composition.
     * @memberof Point
     */
    public static composeVectors(points: Vector2D[]): Vector2D {
        let x = d3.sum(points.map(x => x.x));
        let y = d3.sum(points.map(x => x.y));

        return new Vector2D(x, y);
    }
}

/**
 * Represents a bond in a 2D depiction.
 *
 * @class Bond
 * @param {Atom} bgn one side of the bond.
 * @param {Atom} end the other side of the bond.
 * @param {string} coords coordinates of the bonds graphical primitive.
 * @param {string} style Style of the bonds graphical primitive.
 */
class Bond {
    bgn: Atom;
    end: Atom;
    coords: string;
    style: string;

    constructor(a: Atom, b: Atom, coords: string, style: string) {
        this.bgn = a;
        this.end = b;
        this.coords = coords;
        this.style = style.replace("stroke-width:2px", "stroke-width:4px");
    }


    /**
     * Get the other atom for a given bond.
     *
     * @param {Atom} other
     * @returns {Atom} The other atom from the bond.
     * @throws {Error} if the atom is not part of that bond at all.
     * @memberof Bond
     */
    public getOtherAtom(other: Atom): Atom {
        if (!this.bgn.equals(other) && !this.end.equals(other)) throw new Error(`Atom ${other.name} is not a part of the bond.`);

        return this.bgn.equals(other) ? this.end : this.bgn;
    }


    /**
     * Check whether or not a bond contains the atom.
     *
     * @param {Atom} other The other side of the bond
     * @returns {boolean} True if the atom is a part of the bond, false otherwise.
     * @memberof Bond
     */
    public containsAtom(other: Atom) {
        return this.bgn.equals(other) || this.end.equals(other);
    }

    /**
     * Hide bond from the representation.
     *
     * @memberof Bond
     */
    public hide() {
        this.style.replace("stroke-width:4px", "stroke-width:0px");
    }
}