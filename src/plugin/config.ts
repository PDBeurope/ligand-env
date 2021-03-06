namespace Config {
    export const nodeSize: number = 30;
    export const interactionClickEvent: string = 'PDB.interactions.click';
    export const interactionMouseoverEvent: string = 'PDB.interactions.mouseover';
    export const interactionMouseoutEvent: string = 'PDB.interactions.mouseout'

    export const interactionShowLabelEvent: string = 'PDB.interactions.showLabel';
    export const interactionHideLabelEvent: string = 'PDB.interactions.hideLabel';

    export const molstarClickEvent: string = 'PDB.molstar.click';
    export const molstarMouseoverEvent: string = 'PDB.molstar.mouseover';
    export const molstarMouseoutEvent: string = 'PDB.molstar.mouseout';

    export const aaTypes = new Map<string, Array<string>>([
        ['hydrophobic', new Array<string>('A', 'I', 'L', 'M', 'F', 'W', 'V')],
        ['positive', Array<string>('K', 'R', 'O')],
        ['negative', Array<string>('E', 'D')],
        ['polar', Array<string>('N', 'Q', 'S', 'T')],
        ['cystein', Array<string>('C', 'U')],
        ['glycine', Array<string>('G')],
        ['proline', Array<string>('P')],
        ['aromatic', Array<string>('H', 'Y')]
    ]);

    export const aaAbreviations = new Map<string, string>([
        ['ALA', 'A'],
        ['ARG', 'R'],
        ['ASN', 'N'],
        ['ASP', 'D'],
        ['CYS', 'C'],
        ['GLU', 'E'],
        ['GLN', 'Q'],
        ['GLY', 'G'],
        ['HIS', 'H'],
        ['ILE', 'I'],
        ['LEU', 'L'],
        ['LYS', 'K'],
        ['MET', 'M'],
        ['PHE', 'F'],
        ['PRO', 'P'],
        ['SER', 'S'],
        ['THR', 'T'],
        ['TRP', 'W'],
        ['TYR', 'Y'],
        ['VAL', 'V']
    ]);

    export const backboneAtoms: Array<string> = ['N', 'CA', 'C', 'O'];

    export const interactionsClasses = new Map<string, Array<string>>([
        ["covalent", new Array<string>("covalent")],
        ["electrostatic", new Array<string>("ionic", "hbond", "weak_hbond", "polar", "weak_polar", "xbond", "carbonyl")],
        ['amide', new Array<string>("AMIDEAMIDE", "AMIDERING")],
        ["vdw", new Array<string>("vdw")],
        ["hydrophobic", new Array<string>("hydrophobic")],
        ["aromatic", new Array<string>("aromatic", "FF", "OF", "EE", "FT", "OT", "ET", "FE", "OE", "EF")],
        ["atom-pi", new Array<string>("CARBONPI", "CATIONPI", "DONORPI", "HALOGENPI", "METSULPHURPI")],
        ["metal", new Array<string>("metal_complex")],
        ["clashes", new Array<string>("clash", "vdw_clash")]
    ]);

    export class UIParameters {
        reinitialize: boolean;
        zoom: boolean;
        fullScreen: boolean;
        downloadImage: boolean;
        downloadData: boolean;
        center: boolean;
        help: boolean;
        residueLabel: boolean;
        tooltip: boolean;
        menu: boolean;
        names: boolean;

        constructor() {
            this.reinitialize = true;
            this.zoom = true;
            this.fullScreen = true;
            this.downloadImage = true;
            this.downloadData = true;
            this.center = true;
            this.help = true;
            this.residueLabel = true;
            this.tooltip = true;
            this.menu = true;
            this.names = true;
        }
    }
}