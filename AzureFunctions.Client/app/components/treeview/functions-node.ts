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

export class FunctionsNode extends TreeNode{
    public title = "Functions";
    public dashboardType = DashboardType.collection;
    private _functions : FunctionInfo[]; 

    constructor(sideNav : SideNavComponent, private _siteArmObj : ArmObj<Site>){
        super(sideNav, _siteArmObj.id);
    }

    protected _loadChildren(){
        this.sideNav.cacheService.getArmResource(this._siteArmObj.id)
        .flatMap(site =>{
            return this.sideNav.functionsService.getFunctions2(site);
        })
        .subscribe(fcs => {
            let fcNodes = <FunctionNode[]>[];
            fcs.forEach(fc => fcNodes.push(new FunctionNode(this.sideNav, this._siteArmObj, fc)));

            this.children = fcNodes;

            this._doneLoading();
        });
    }
}