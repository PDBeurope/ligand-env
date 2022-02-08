// #region help
let helpLigands = `
    <table class='pdb-lig-env-help-table'>
        <tr>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #80A0F0; "></div>
            </td>
            <td>hydrophobic</td>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #C048C0;"></div>
            </td>
            <td>negatively charged</td>
        </tr>
        <tr>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #15A4A4;"></div>
            </td>
            <td>aromatic</td>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #15C015;"></div>
            </td>
            <td>polar</td>
            <td>
        </tr>
        <tr>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #F08080;"></div>
            </td>
            <td>cystein</td>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #00BFFF;"></div>
            </td>
            <td>water</td>
        </tr>
        <tr>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #F01505;"></div>
            </td>
            <td>positively charged</td>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: #F2F2F2;"></div>
            </td>
            <td>other</td>
        </tr>
        <tr>
            <td>
                 <div class="pdb-lig-env-help-residue" style="background: #F09048;"></div>
            </td>
            <td>glycine</td>
            <td>
                <div class="pdb-lig-env-help-residue" style="background: white; border: 1.2px solid black;"></div>
            </td>
            <td>bound molecule</td>
        </tr>
        <tr>
        <td></td>
        <td><a href="https://www.ncbi.nlm.nih.gov/glycans/snfg.html" target="blank">glycans (SNFG)</a></td>
        <td></td>
        <td></td>
        </tr>
    </table>
    `
let helpBonds = `
<table class='pdb-lig-env-help-table' style="border-bottom: 0.5px solid black; padding-bottom: 10px;">
<tr>
    <td>
        <hr style="border: 0 none; border-top: 5px dashed #AD4379; background: none; height: 0;" />
    </td>
    <td>aromatic</td>
    <td>
            <hr style="border: 0 none; border-top: 5px dashed #FF5050; background: none; height: 0;" />
    </td>
    <td>clashes</td>
</tr>
<tr>
    <td>
            <hr style="border: 0 none; border-top: 5px solid black; background: none; height: 0;" />
    </td>
    <td>covalent</td>
    <td>
            <hr style="border: 0 none; border-top: 5px dashed #3F26BF; background: none; height: 0;" />
    </td>
    <td>electrostatic</td>

</tr>
<tr>
    <td>
        <hr style="border: 0 none; border-top: 5px solid #008080; background: none; height: 0;" />
    </td>
    <td>metal</td>
    <td></td>
    <td>hydrophobic</td>
</tr>

<tr>
    <td>
        <hr style="border: 0 none; border-top: 5px dashed #9B7653; background: none; height: 0;" />
    </td>
    <td>vdw</td>
</tr>
</table>`
// <table class="pdb-lig-env-help-table" style="margin-top: 5px;">
// <tr>
//     <td>
//         <hr style="border: 0 none; border-top: 5px solid black; background: none; height: 0;" />
//     </td>
//     <td>covalent</td>
//     <td>
//         <hr style="border: 0 none; border-top: 5px dashed black; background: none; height: 0;" />
//     </td>
//     <td>non-covalent</td>
// </tr>
// </table>`

// #endregion help



class UI {
    private parent: HTMLElement;
    private display: Visualization;

    private residueLabel: d3.Selection<d3.BaseType, {}, HTMLElement, any>; //label used to display ligand ids
    private tooltip: d3.Selection<d3.BaseType, {}, HTMLElement, any>; // mouseover tooltips

    private originalWidth: number;
    private originalHeight: number;


    constructor(element: HTMLElement, vis: Visualization) {
        this.parent = element;
        this.display = vis;

        this.originalWidth = this.parent.offsetWidth;
        this.originalHeight = this.parent.offsetHeight;


    }

    /**
     * Registers UI elements on the top of SVG canvas with interactions
     * and ligands
     *
     * @param {Config.UIParameters} p Object with annotation which
     * UI elements should be created.
     * @returns
     * @memberof UI
     */
    public register(p: Config.UIParameters) {
        let toolbar = undefined;
        let dynamicPanel = undefined;

        if (p.menu) {
            toolbar = d3.select(this.parent)
                .append('div')
                .classed('pdb-lig-env-toolbar-container', true)
                .on('mouseover', () => this.displayToolbarPanel(true))
                .on('mouseout', () => this.displayToolbarPanel(false));

            toolbar.append('div')
                .classed('pdb-lig-env-menu-panel', true)
                .append('i')
                .attr('title', 'Menu')
                .attr('class', 'icon icon-common icon-bars');

            dynamicPanel = toolbar.append('div')
                .classed('pdb-lig-env-menu-panel', true)
                .attr('id', 'pdb-lig-env-menu-dynamic-panel')
                .style('display', 'none')
                .style('opacity', 0);

            if (p.help) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-help-btn')
                    .attr('title', 'Help')
                    .attr('class', 'icon icon-common icon-question-circle')
                    .on('click', () => this.showHelp());

                let cont = d3.select(this.parent).append('div').attr('id', 'pdb-lig-env-help-container')
                let navbar = cont.append('div').classed('pdb-lig-env-help-navbar', true);

                navbar.append('a')
                    .classed('active', true)
                    .attr('id', 'pdb-lig-env-help-residues-btn')
                    .text('Ligands and residues')
                    .on('click', () => this.changeHelp(true));

                navbar.append('a')
                    .attr('id', 'pdb-lig-env-help-bonds-btn')
                    .text('Interactions')
                    .on('click', () => this.changeHelp(false));

                cont.append('div').attr('id', 'pdb-lig-env-help-ligands').html(helpLigands);
                cont.append('div').attr('id', 'pdb-lig-env-help-bonds').html(helpBonds);
            }

            if (p.downloadImage) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-screenshot-btn')
                    .attr('title', 'Screenshot')
                    .attr('class', 'icon icon-common icon-camera')
                    .on('click', () => this.saveSVG());
            }

            if (p.downloadData) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-download-btn')
                    .attr('title', 'Download interactions')
                    .attr('class', 'icon icon-common icon-download')
                    .on('click', () => this.download());
            }


            if (p.center) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-center-btn')
                    .attr('title', 'Center screen')
                    .attr('class', 'icon icon-common icon-crosshairs')
                    .on('click', () => this.center());
            }

            if (p.fullScreen) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-fullscreen-btn')
                    .attr('title', 'Toggle Expanded')
                    .attr('class', 'icon icon-common icon-fullscreen')
                    .on('click', () => this.fullScreen());
            }

            if (p.reinitialize) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-home-btn')
                    .attr('title', 'Reinitialize')
                    .attr('class', 'icon icon-common icon-sync-alt')
                    .on('click', () => this.reinitialize());
            }

            if (p.names) {
                dynamicPanel.append('i')
                    .attr('id', 'pdb-lig-env-names-btn')
                    .attr('title', 'Show/hide atom names')
                    .attr('class', 'icon icon-common icon-font')
                    .classed('active', false)
                    .on('click', () => this.showNames());
            }
        }

        if (p.tooltip) {
            this.tooltip = d3.select(this.parent).append('div')
                .classed('pdb-lig-env-label', true)
                .attr('id', 'pdb-lig-env-tooltip')
                .style('opacity', 0)
        }

        if (p.residueLabel) {
            this.residueLabel = d3.select(this.parent).append('div')
                .classed('pdb-lig-env-label', true)
                .attr('id', 'pdb-lig-env-residue-label')
                .style('opacity', 0)
        }

        if (this.tooltip !== undefined) {
            this.parent.addEventListener(Config.interactionClickEvent, e => this.nodeMouseEnterEventHandler(e));
            this.parent.addEventListener(Config.interactionMouseoverEvent, e => this.nodeMouseEnterEventHandler(e));
            this.parent.addEventListener(Config.interactionMouseoutEvent, () => this.nodeMouseLeaveEventHandler());
        }

        if (this.residueLabel !== undefined) {
            this.parent.addEventListener(Config.interactionShowLabelEvent, e => this.showLigandLabel(e));
            this.parent.addEventListener(Config.interactionHideLabelEvent, () => this.hideLigandLabel());
        }
    }

    // #region UI methods
    private saveSVG() {
        this.display.saveSvg();
    }

    private reinitialize() {
        this.display.reinitialize()
    }

    private download() {
        this.display.downloadInteractionsData()
    }

    private center() {
        this.display.centerScene()
    }

    private changeHelp(showResidues: boolean) {
        let ligHelpBtn = d3.select(this.parent).select('#pdb-lig-env-help-residues-btn');
        let bondHelpBtn = d3.select(this.parent).select('#pdb-lig-env-help-bonds-btn');
        let bondHelpSection = d3.select(this.parent).select('#pdb-lig-env-help-bonds');
        let ligHelpSection = d3.select(this.parent).select('#pdb-lig-env-help-ligands');

        if (showResidues) {
            bondHelpBtn.classed('active', false);
            ligHelpBtn.classed('active', true);
            bondHelpSection.style('display', 'none');
            ligHelpSection.style('display', 'block');

        } else {
            ligHelpBtn.classed('active', false);
            bondHelpBtn.classed('active', true);
            bondHelpSection.style('display', 'block');
            ligHelpSection.style('display', 'none');
        }
    }

    private showNames() {
        let btn = d3.select(this.parent).select('#pdb-lig-env-names-btn');
        let isActive = btn.classed('active');

        if (isActive) {
            this.display.toggleDepiction(false);
            btn.style('color', '#637ca0');
            btn.classed('active', false);
        } else {
            this.display.toggleDepiction(true);
            btn.style('color', '');
            btn.classed('active', true);
        }
    }

    private showHelp() {
        let el = d3.select(this.parent).select('#pdb-lig-env-help-container');
        let btn = d3.select(this.parent).select('#pdb-lig-env-help-btn');

        if (el.style('display') === 'block') {
            el.style('display', 'none');
            el.style('opacity', 0);
            btn.style('color', '');
        } else {
            el.style('display', 'block');
            el.style('opacity', 1);
            btn.style('color', '#637ca0');
        }
    }

    private displayToolbarPanel(show: boolean) {
        let dynPanel = d3.select(this.parent).select('#pdb-lig-env-menu-dynamic-panel');
        let el = d3.select(this.parent).select('#pdb-lig-env-help-container');

        if (!dynPanel && !el) return;

        if (show || el.style('display') === 'block') {
            dynPanel.style('display', 'block');
            dynPanel.style('opacity', 0.9);
        } else {

            dynPanel.style('display', 'none');
            dynPanel.style('opacity', 0);
        }
    }

    /**
     * Switch component view and full screen.
     *
     * @private
     * @memberof UI
     */
    private fullScreen() {
        let btn = d3.select(this.parent).select('#pdb-lig-env-fullscreen-btn');

        if (btn.attr('class') === 'icon icon-common icon-fullscreen') {
            this.display.fullScreen = true;

            this.parent.parentElement.style.width = '100%'
            this.parent.parentElement.style.height = '100%'
            this.parent.parentElement.style.position = 'fixed';
            this.parent.parentElement.style.top = '0';
            this.parent.parentElement.style.left = '0';
            this.parent.parentElement.style.zIndex = '10000000000000';

            btn.classed('icon-fullscreen', false);
            btn.classed('icon-fullscreen-collapse', true);

            this.display.centerScene();
        } else {
            this.display.fullScreen = true;

            this.parent.parentElement.style.width = `${this.originalWidth}px`;
            this.parent.parentElement.style.height = `${this.originalHeight}px`;
            this.parent.parentElement.style.position = 'relative';
            this.parent.parentElement.style.zIndex = '';

            btn.classed('icon-fullscreen', true);
            btn.classed('icon-fullscreen-collapse', false);

            this.display.centerScene();


        }
    }
    // #endregion UI methods

    // #region event handlers
    private nodeMouseEnterEventHandler(e: any) {

        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);

        this.tooltip.html(e.detail.tooltip);

    }

    private nodeMouseLeaveEventHandler() {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', 0);

    }

    private showLigandLabel(e: any) {
        this.residueLabel.transition()
            .duration(200)
            .style('opacity', .9);

        this.residueLabel.html(e.detail.label);

    }

    private hideLigandLabel() {
        this.residueLabel.transition()
            .duration(200)
            .style('opacity', 0);
    }
    // #endregion event handlers

}