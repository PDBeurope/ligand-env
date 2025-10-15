// Import the LitElement base class and html helper function
import { LitElement } from 'lit-element';
import "../styles/pdb-ligand-env.css";
import { Visualization } from '../plugin/manager';
import { UIParameters } from '../plugin/config';

// Extend the LitElement base class
/**
 * PDB LigandEnv component to display ligand structure in 2D along with its interactions. 
 * This depiction can be enriched with substructure highlight, atom names, binding site 
 * interactions and aggregated protein-ligand interactions
 * @component 
 * @example <caption> Basic usage </caption>
 * <pdb-ligand-env pdb-id="1cbs" pdb-res-id="200" pdb-chain-id="A" environment="development"></pdb-ligand-env>
 */
class pdbLigandEnv extends LitElement {

  //Get properties / attribute values
  static get properties() {
    return {
      pdbId: { type: String, attribute: 'pdb-id' },
      bmId: { type: String, attribute: 'bound-molecule-id' },
      entityId: { type: String, attribute: 'entity-id' },
      resName: { type: String, attribute: 'pdb-res-name' },
      resId: { type: Number, attribute: 'pdb-res-id' },
      contactType: {type: Array, attribute: 'contact-type', noAccessors: true},
      chainId: { type: String, attribute: 'pdb-chain-id' },
      substructureHighlight: { type: Array, attribute: 'substructure' },
      substructureColor: { type: String, attribute: 'color' },
      menuOn: { type: Boolean, attribute: 'menu-on' },
      menuOff: { type: Boolean, attribute: 'menu-off' },
      zoomControlsOn: { type: Boolean, attribute: 'zoom-on' },
      zoomControlsOff: { type: Boolean, attribute: 'zoom-off' },
      scrollZoomOn: { type: Boolean, attribute: 'scroll-zoom-on' },
      namesOn: { type: Boolean, attribute: 'names-on' },
      depictionOnly: {type: Boolean, attribute: 'depiction-only'},
      env: { type: String, attribute: 'environment' },
    };
  }

  // Create custom accessors for contactType
  set contactType(value) {
    let prevCType = this._contactType + "";
    this._contactType = value;
    if (prevCType.length > 0) {
      if(this.display){
        this.display.showWeights(value)
      }
    }
  } 
  get contactType() { return this._contactType; }

  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.renderLigandEnv();
  }

  renderLigandEnv() {
    this.innerHTML = "";

    this.highlightSubstructure = [];
    let uiParams = new UIParameters();
    if (this.zoomControlsOn !== undefined) uiParams.zoomControls = this.zoomControlsOn;
    if (this.zoomControlsOff !== undefined) uiParams.zoomControls = !this.zoomControlsOff;

    uiParams.disableScrollZoom = this.scrollZoomOn !== undefined ? !this.scrollZoomOn : false;
    uiParams.menu = this.pdbId !== undefined;
    if (this.menuOn !== undefined) uiParams.menu = this.menuOn;
    if (this.menuOff !== undefined) uiParams.menu = !this.menuOff;

    let env = this.env === undefined ? "production" : this.env;
    let names = this.namesOn === undefined ? false : this.namesOn;


    if(this.depictionOnly){
      this.display = new Visualization(this, uiParams, env, true)
    }
    else{
      this.display = new Visualization(this, uiParams, env, false);
    }
    
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
    else if (this.resName){
      this.display.initLigandDisplay(this.resName, names).then(() => {
        if (this.contactType){
          if(this.display.ligandIntxData === undefined){
            this.display.initLigandWeights(this.resName).then(() => {
              this.display.showWeights(this.contactType);
            })
          }
          else {
            this.display.showWeights(this.contactType);
          }
        }
      })
    }
  }

  //#region properties
  set depiction(data) {
    if (!data) return;

    this.display.addDepiction(data, false);
    this.display.centerScene();
  }

  set interaction(IntxData) {
    if(!IntxData || !this.display) return;
    this.display.ligandIntxData = IntxData;
  }

  // set atomWeights(contactType) {
  //   if (!contactType || !this.display.ligandIntxData){
  //     return;
  //   }
  //   this.display.showWeights(contactType);
  // }

  set highlightSubstructure(substructure) {
    if (!this.display) {
      return;
    }
    this.substructureHighlight = substructure;
    this.display.addLigandHighlight(this.substructureHighlight);
    
  }

  set highlightColor(data) {
    if (!data || !this.display || !this.substructureHighlight) return;

    this.highlightColor = data;
    this.display.addLigandHighlight(this.substructureHighlight, this.highlightColor);
  }

  set zoom(data) {
    if (!this.display){
      return
    }
    this.display.toggleZoom(data);
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
