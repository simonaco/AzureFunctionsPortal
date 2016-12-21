import { TreeNode } from './tree-node';
import { SideNavComponent } from '../sidenav/sidenav.component';
import { Subject } from 'rxjs/Rx';
import { DashboardType } from './models/dashboard-type';
import { Site } from '../../models/arm/site';
import { ArmObj } from '../../models/arm/arm-obj';
import {FunctionContainer} from '../../models/function-container';
import {BroadcastEvent} from '../../models/broadcast-event';
import {PortalResources} from '../../models/portal-resources';
import {FunctionInfo} from '../../models/function-info';
import {FunctionNode} from './function-node';
import {FunctionApp} from '../../services/function-app';

export class FunctionsNode extends TreeNode{
    public title = "Functions";
    public dashboardType = DashboardType.collection;
    private _functionApp : FunctionApp;
    private _functions : FunctionInfo[]; 

    constructor(sideNav : SideNavComponent, private _siteArmObj : ArmObj<Site>){
        super(sideNav, _siteArmObj.id + "/functions");
    }

    protected _loadChildren(){
        this.sideNav.cacheService.getArmResource(this._siteArmObj.id)
        .flatMap(site =>{

            this._functionApp = new FunctionApp(
                site,
                this.sideNav.http,
                this.sideNav.userService,
                this.sideNav.globalStateService,
                this.sideNav.translateService,
                this.sideNav.broadcastService,
                this.sideNav.armService,
                this.sideNav.cacheService
            );

            this._functionApp.warmupMainSite();
            this._functionApp.getHostSecrets();

            return this.sideNav.functionsService.getFunctions2(site);
        })
        .subscribe(fcs => {
            let fcNodes = <FunctionNode[]>[];
            fcs.forEach(fc => {
                fc.functionApp = this._functionApp;
                fcNodes.push(new FunctionNode(this.sideNav, this._siteArmObj, fc))
            });

            this.children = fcNodes;

            this._doneLoading();
        });
    }
}