/**
 * This class contains all the details which are necessary for redrawing
 * RDKIt style 2D molecule depiction on a client side as well as some
 * other logic which should hopefully help with the initial placement of
 * binding partners in the residue-level view.
 *
 * @author Lukas Pravda <lpravda@ebi.ac.uk>
 * @class Depiction
 * @param {string} ccdId PDB CCD id.
 * @param {Atom[]} atoms List of atoms.
 * @param {Bond[]} bonds Visual representation of bonds.
 * They do not correlate 1:1 with a number of bonds!
 * @param {Vector2D} resolution x,y dimension of the image. Needs to be used
 * for a scene shift, so it is centered.
 */
class Depiction {
    ccdId: string;
    atoms: Atom[];
    bonds: Bond[];

    resolution: Vector2D;

    private root: d3.Selection<SVGGElement, unknown, null, undefined>;
    private structure: d3.Selection<SVGGElement, unknown, null, undefined>;
    private contour: d3.Selection<SVGGElement, unknown, null, undefined>;
    private highlight: d3.Selection<SVGGElement, unknown, null, undefined>;

    constructor(parent: any, data: any) {
        this.root = parent

        this.highlight = this.root.append('g').attr('id', 'highlight');
        this.structure = this.root.append('g').attr('id', 'structure');
        this.contour = this.root.append('g').attr('id', 'contour');

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
     * degree and then gets the one with the lovest degree and places
     * the initial residue position along the vector pointing from it.
     *
     * @param {string[]} atomNames list of atom names the bound residue
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

    public draw(atomNames: boolean = false) {
        this.structure.selectAll("*").remove();

        this.appendBondVisuals();

        if (atomNames) this.appendAtomNames();
        else this.appendLabels();
    }

    public highlightSubgraph(atoms: Array<string>, color: string = undefined) {
        if (!this.atoms || !atoms) return;

        this.highlight.selectAll('*').remove();

        color = color ? color : "#BFBFBF";
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

    public addContour(data: any) {
        this.contour.selectAll('*').remove();

        this.contour.append('div').text(`'contour data goes here: ${data}`);
    }

    /**
     * Appends to a given selection the visual representation of bonds as svg:path elements.
     *
     * representation of the bond visuals.
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
     *
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
     * Append depiction labels to the visualization. Because RDKIt places
     * the labels slightly differently this information needs to be
     * consumed too, because we cannot use just atom position directly.
     * Also there are all sorts of colorful subscripts and superscripts,
     * so it is much easier to use it this way.
     *
     * @memberof Depiction
     */
    private appendLabels() {
        let data = this.atoms
            .filter(x => x.labels.length > 0);

        this.structure.selectAll()
            .data(data)
            .enter()
            .append('g')
            .attr('filter', 'url(#solid-background)')
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
     * @returns
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
    connectivity: number

    constructor(item: any) {
        this.name = item.name;
        this.labels = item.labels;
        this.position = new Vector2D(item.x, item.y);
        this.connectivity = 0;
    }

    /**
     *
     *
     * @param {Atom} other
     * @returns true if the atoms are equal
     * @memberof Atom
     */
    public equals(other: Atom) {
        if (!(other instanceof Atom)) return false;

        return other.name === this.name;
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

    /**
     *Creates an instance of the bond.
     * @param {Atom} a
     * @param {Atom} b
     * @memberof Bond
     */
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
     * @returns True if the atom is a part of the bond, false otherwise.
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