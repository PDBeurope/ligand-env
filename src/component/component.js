// Import the LitElement base class and html helper function
import { LitElement } from 'lit-element';
import "../styles/pdb-ligand-env.css";

// Extend the LitElement base class
class pdbLigandEnv extends LitElement {

  //Get properties / attribute values
  static get properties() {
    return {
      pdbId: { type: String, attribute: 'pdb-id' },
      bmId: { type: String, attribute: 'bound-molecule-id' },
      entityId: { type: String, attribute: 'entity-id' },
      resName: { type: String, attribute: 'pdb-res-name' },
      resId: { type: Number, attribute: 'pdb-res-id' },
      chainId: { type: String, attribute: 'pdb-chain-id' },
      substructureHighlight: { type: Array, attribute: 'substructure' },
      substructureColor: { type: String, attribute: 'color' },
      zoomOn: { type: Boolean, attribute: 'zoom-on' },
      namesOn: { type: Boolean, attribute: 'names-on' },
      env: { type: String, attribute: 'environment' },
    };
  }

  constructor() {
    super();
  }

  async connectedCallback() {
    this.highlightSubstructure = [];
    let uiParams = new Config.UIParameters();
    uiParams.zoom = this.zoomOn;
    uiParams.menu = this.pdbId !== undefined;

    let env = this.env === undefined ? "production" : this.env;
    let names = this.namesOn === undefined ? false : this.namesOn;

    this.display = new Visualization(this, uiParams, env);
    if (this.pdbId) {
      if (this.entityId) {
        this.display.initCarbohydratePolymerInteractions(this.pdbId, this.bmId, this.entityId);
      }
      else if (this.bmId) {
        this.display.initBoundMoleculeInteractions(this.pdbId, this.bmId);
      }
      else {
        this.display.initLigandInteractions(this.pdbId, this.resId, this.chainId);
      }
    }
    else if (this.resName) {
      this.display.initLigandDisplay(this.resName, names).then(() => this.display.centerScene());
    }
  }


  //#region properties
  set depiction(data) {
    if (!data) return;

    this.display.addDepiction(data, false);
    this.display.centerScene();
  }

  set highlightSubstructure(data) {
    if (!data || !this.display) {
      console.log(`Argument needs to be a non empty array of strings.`);
      return;
    }

    this.display.addLigandHighlight(data, this.highlightColor);
    this.substructureHighlight = data;
  }

  set highlightColor(data) {
    if (!data || !this.display) return;

    this.highlightColor = data;
    this.display.addLigandHighlight(this.substructureHighlight, this.highlightColor);
  }

  set contourData(data) {
    if (!data || !this.display || !this.display.depiction !== undefined) return;

    this.display.addContours(data);
  }

  set zoom(data) {
    if (this.display !== undefined) this.display.toggleZoom(data);
  }

  set atomNames(data) {
    this.display.toggleDepiction(data);
  }
  //#endregion properties


  createRenderRoot() {
    /**
     * Render template in light DOM. Note that shadow DOM features like
     * encapsulated CSS are unavailable.
     */
    return this;
  }

}
// Register the new element with the browser.
customElements.define('pdb-ligand-env', pdbLigandEnv);